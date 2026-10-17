// The Ralph loop for one task: fresh `claude -p` per iteration, state in files, done = the check passes
// (and, when the project has a reviewer, the reviewer approves).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PKG, paths, config, runDir, repoAlias } from './home.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as gitx from './git.mjs';
import * as limits from './limits.mjs';
import * as project from './project.mjs';
import * as guard from './guard.mjs';
import { hookSettings } from './guard.mjs';

const CLAUDE = process.env.CREW_CLAUDE || 'claude';
const MAX_REVIEW_ROUNDS = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run(id) {
  const cfg = config();
  let card = cards.load(id);
  const meta = card.meta;
  const dir = runDir(id);
  const log = msg => fs.appendFileSync(path.join(dir, 'runner.log'), `${new Date().toISOString()} ${msg}\n`);

  const { branch, worktree } = gitx.ensureWorktree(meta);
  cards.update(id, { status: 'running', reason: '', pid: process.pid, heartbeat: now(), branch, worktree });
  events.emit(id, 'started', meta.title);
  log(`runner ${process.pid} started in ${worktree}`);

  for (const f of ['PROGRESS.md', 'DECISIONS.md', 'QUESTIONS.md']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) fs.writeFileSync(p, `# ${f.replace('.md', '')} — ${id}: ${meta.title}\n`);
  }
  const lessons = path.join(paths.lessons, `${repoAlias(meta.repo)}.md`);
  if (!fs.existsSync(lessons)) fs.writeFileSync(lessons, `# Lessons — ${repoAlias(meta.repo)}\n`);

  // A resumed task may be behind its base (approved docs, merged requests): bring them in.
  let syncNote = '';
  if (Number(meta.iteration || 0) > 0) syncNote = syncWithBase(worktree, meta.base, log);

  const beat = setInterval(() => safe(() => cards.update(id, { heartbeat: now() })), 60_000);
  const startedAt = Date.now();
  const baseElapsed = Number(meta.elapsed_min || 0);
  let lastCheck = readLastCheck(dir);
  let noChange = 0;
  let outcome = null;

  try {
    for (let i = Number(meta.iteration || 0) + 1; ; i++) {
      card = cards.load(id);
      const m = card.meta;
      const elapsed = baseElapsed + (Date.now() - startedAt) / 60_000;
      if (i > Number(m.iterations)) { outcome = ['needs-you', `Used all ${m.iterations} iterations; check still ${m.last_check || 'unrun'}. Extend with: crew extend ${id}`]; break; }
      if (elapsed > Number(m.hours) * 60) { outcome = ['needs-you', `Used the ${m.hours}h budget; check still ${m.last_check || 'unrun'}. Extend with: crew extend ${id}`]; break; }

      const before = gitx.head(worktree);
      log(`iteration ${i} start`);
      const res = await callClaude(id, log, buildPrompt(card, { i, dir, lessons, lastCheck, worktree, branch, syncNote }), {
        cwd: worktree,
        logFile: path.join(dir, `iter-${String(i).padStart(2, '0')}.jsonl`),
        timeoutMs: cfg.iterationTimeoutMin * 60_000,
        args: claudeArgs(m, dir, `#${i}`, cfg),
        env: crewEnv(m, dir, worktree),
      });
      syncNote = '';
      if (res.fatal) { outcome = ['failed', res.fatal]; break; }

      gitx.commitIfDirty(worktree, `crew(${id}): iteration ${i} leftovers`);
      const reverted = enforceOwnership(m, worktree, before, dir, log);
      if (reverted.length) syncNote = `The runner reverted your changes to files your role doesn't own (edits made through the shell are checked too): ${reverted.map(f => `\`${f}\``).join(', ')}. Use a request card for those.`;
      noChange = before === gitx.head(worktree) ? noChange + 1 : 0;

      const status = (res.text.match(/CREW_STATUS:\s*(CONTINUE|DONE|BLOCKED)/i)?.[1] || 'CONTINUE').toUpperCase();
      const check = runCheck(m.check, worktree, cfg.checkTimeoutMin);
      fs.writeFileSync(path.join(dir, 'last-check.txt'), `${check.ok ? 'PASS' : 'FAIL'} (exit ${check.code})\n${check.tail}`);
      lastCheck = { ...check, claimedDone: status === 'DONE' };

      cards.update(id, {
        iteration: i,
        last_check: check.ok ? 'pass' : 'fail',
        elapsed_min: Math.round(baseElapsed + (Date.now() - startedAt) / 60_000),
        heartbeat: now(),
      });
      events.emit(id, 'iteration', `#${i} ${status.toLowerCase()} · check ${check.ok ? 'pass' : 'fail'}${res.cost ? ` · $${res.cost.toFixed(2)} api-equiv` : ''}`);
      log(`iteration ${i} done: agent=${status} check=${check.ok ? 'pass' : 'fail'}`);

      if (status === 'BLOCKED') {
        const waits = cards.all().filter(c => c.meta.requested_by === id && !['done', 'failed'].includes(c.meta.status)).map(c => c.meta.id);
        cards.update(id, { waits_on: waits.join(',') });
        outcome = ['needs-you', waits.length ? `waiting on request ${waits.join(', ')}` : (lastQuestion(dir) || 'Agent is blocked; see QUESTIONS.md')];
        break;
      }
      if (status === 'DONE' && check.ok) {
        if (!needsReview(m)) { outcome = ['done', 'check passes']; break; }
        const round = Number(m.review_rounds || 0) + 1;
        cards.update(id, { reason: `in review (round ${round})` });
        events.emit(id, 'review-started', `round ${round}`);
        const verdict = await review(cards.load(id), { dir, worktree, cfg, round, log });
        if (verdict.fatal) { outcome = ['failed', verdict.fatal]; break; }
        cards.update(id, { review_rounds: round, reason: '' });
        events.emit(id, 'reviewed', `round ${round}: ${verdict.verdict.toLowerCase()}`);
        if (verdict.verdict === 'APPROVE') { outcome = ['done', `check passes, reviewer approved (round ${round})`]; break; }
        if (round >= MAX_REVIEW_ROUNDS) { outcome = ['needs-you', `Reviewer still wants changes after ${round} rounds; see ${path.join(dir, 'REVIEW.md')}`]; break; }
        lastCheck = { ...check, review: true };
        noChange = 0;
        continue;
      }
      if (noChange >= cfg.stallAfterNoChange) { outcome = ['stalled', `${noChange} iterations in a row changed nothing`]; break; }
    }

    if (outcome[0] === 'done') outcome = finish(id, log);
  } catch (err) {
    outcome = ['failed', err.message];
    log(`runner crashed: ${err.stack}`);
  } finally {
    clearInterval(beat);
  }

  const [status, reason] = outcome;
  cards.update(id, { status, reason, pid: '' });
  events.emit(id, status, reason);
  log(`runner exit: ${status} — ${reason}`);
  // Free slot: let the scheduler start whatever is queued next.
  spawnDetached(['tick']);
}

function needsReview(m) {
  if (m.role === 'reviewer') return false;
  return project.hasReviewer(project.tryLoad(m.project));
}

async function review(card, { dir, worktree, cfg, round, log }) {
  const m = card.meta;
  const tpl = fs.readFileSync(path.join(PKG, 'prompts', 'review.md'), 'utf8');
  const vars = {
    id: m.id, title: m.title, goal: card.body, base: m.base, branch: m.branch, check: m.check, round,
    role: m.role || 'builder',
    decisions: path.join(dir, 'DECISIONS.md'),
    progress: path.join(dir, 'PROGRESS.md'),
    reviewFile: path.join(dir, 'REVIEW.md'),
    reviewerRole: project.roleTemplate('reviewer').prompt,
    planning: planningSection(worktree),
  };
  const prompt = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  // The reviewer can run on its own (often stronger) model, set on the roster entry.
  const reviewerModel = project.tryLoad(m.project)?.roster.find(r => r.role === 'reviewer')?.model;
  const rm = { ...m, role: 'reviewer', model: reviewerModel || m.model };
  const before = gitx.head(worktree);
  const res = await callClaude(m.id, log, prompt, {
    cwd: worktree,
    logFile: path.join(dir, `review-${round}.jsonl`),
    timeoutMs: cfg.iterationTimeoutMin * 60_000,
    args: claudeArgs(rm, dir, `review ${round}`, cfg),
    env: crewEnv(rm, dir, worktree),
  });
  if (res.fatal) return { fatal: res.fatal };
  // The reviewer owns nothing: drop uncommitted edits and revert anything it managed to commit.
  gitx.git(worktree, 'checkout', '--', '.');
  enforceOwnership(rm, worktree, before, dir, log);
  const verdict = (res.text.match(/CREW_REVIEW:\s*(APPROVE|CHANGES)/i)?.[1] || 'CHANGES').toUpperCase();
  log(`review round ${round}: ${verdict}`);
  return { verdict };
}

// Branch + draft PR: the runner pushes, never the agent.
function finish(id, log) {
  const m = cards.load(id).meta;
  const wt = m.worktree;
  if (gitx.commitsAhead(wt, m.base) === 0) return ['failed', 'check passes but the branch has no commits'];
  if (m.autonomy !== 'pr') return ['review', `ready on local branch ${m.branch}`];
  if (!gitx.hasRemote(wt)) return ['review', `ready on local branch ${m.branch} (repo has no remote, so no PR)`];

  const push = gitx.git(wt, 'push', '-u', 'origin', m.branch);
  if (!push.ok) return ['review', `ready on ${m.branch}, but push failed: ${push.err.slice(0, 200)}`];
  const existing = spawnSync('gh', ['pr', 'view', m.branch, '--json', 'url', '-q', '.url'], { cwd: wt, encoding: 'utf8', windowsHide: true });
  let url = existing.status === 0 ? existing.stdout.trim() : '';
  if (!url) {
    const dir = runDir(id);
    const body = [
      `Opened by crew task \`${id}\`${m.role ? ` (${m.role})` : ''}. The done-check \`${m.check}\` passes.`,
      section('Review', path.join(dir, 'REVIEW.md'), 0),
      section('Progress', path.join(dir, 'PROGRESS.md')),
      section('Decisions made without you', path.join(dir, 'DECISIONS.md')),
      section('Open questions', path.join(dir, 'QUESTIONS.md')),
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    ].join('\n\n');
    const bodyFile = path.join(dir, 'pr-body.md');
    fs.writeFileSync(bodyFile, body);
    const pr = spawnSync('gh', ['pr', 'create', '--draft', '--base', m.base, '--head', m.branch, '--title', m.title, '--body-file', bodyFile], { cwd: wt, encoding: 'utf8', windowsHide: true });
    if (pr.status !== 0) return ['review', `pushed ${m.branch}; PR create failed: ${(pr.stderr || '').slice(0, 200)}`];
    url = pr.stdout.trim().split('\n').pop();
  }
  cards.update(id, { pr: url });
  log(`draft PR ${url}`);
  return ['review', `draft PR ${url}`];
}

// The PreToolUse hook only sees the edit tools. This checks what actually changed in git since
// `before`, by any means, and reverts files the role may not touch.
export function enforceOwnership(m, wt, before, dir, log) {
  const diff = gitx.git(wt, 'diff', '--name-status', '--no-renames', before, 'HEAD');
  if (!diff.ok || !diff.out) return [];
  const env = { CREW_ROOT: wt, CREW_ROLE: m.role || '', CREW_PROJECT: m.project || '', CREW_RUN_DIR: dir };
  const bad = diff.out.split('\n').map(l => l.split('\t')).filter(([, f]) =>
    f && guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(wt, f) } }, env));
  if (!bad.length) return [];
  for (const [st, f] of bad) {
    if (st === 'A') gitx.git(wt, 'rm', '-q', '--cached', '--', f), fs.rmSync(path.join(wt, f), { force: true });
    else gitx.git(wt, 'checkout', before, '--', f);
  }
  const files = bad.map(([, f]) => f);
  gitx.git(wt, 'add', '-A', '--', ...files);
  gitx.git(wt, 'commit', '-q', '--no-verify', '-m', `crew(${m.id}): revert edits outside ${m.role || 'task'} ownership`);
  log(`reverted out-of-bounds edits: ${files.join(', ')}`);
  events.emit(m.id, 'ownership', `reverted ${files.length} file(s) outside ${m.role}'s ownership`);
  return files;
}

function syncWithBase(wt, base, log) {
  if (gitx.git(wt, 'merge-base', '--is-ancestor', base, 'HEAD').ok) return '';
  const r = gitx.git(wt, 'merge', '--no-edit', base);
  if (r.ok) { log(`merged ${base} into the branch`); return `Since your last iteration, \`${base}\` was merged into your branch (approved planning docs or finished requests may have landed). Check \`git log -5\`.`; }
  gitx.git(wt, 'merge', '--abort');
  log(`merge of ${base} conflicted; aborted`);
  return `\`${base}\` has moved on and couldn't be merged into your branch automatically (conflict). Carry on; mention it in the progress log so the lead can sort it out.`;
}

// Runs one claude -p call, waiting out plan limits and retrying, so callers only see real outcomes.
async function callClaude(id, log, prompt, opts) {
  for (;;) {
    await pace(id, log);
    const res = await runClaude(prompt, opts);
    const text = res.result?.result || '';
    if (res.result?.is_error || (!res.result && res.code !== 0)) {
      const why = text || res.stderr.slice(-500) || `exit ${res.code}`;
      if (/not logged in|\/login/i.test(why)) return { fatal: 'Claude Code CLI is not signed in. Run: claude auth login' };
      if (/limit|rate|usage|overloaded|429|529/i.test(why) || [429, 529].includes(res.result?.api_error_status)) {
        const until = limits.waitUntil() || Date.now() / 1000 + 20 * 60;
        log(`hit a limit (${why.slice(0, 120)}); waiting until ${new Date(until * 1000).toISOString()}`);
        await waitWithStatus(id, until, 'paced: plan limit');
        continue;
      }
      log(`claude errored: ${why.slice(0, 300)}`);
    }
    return { text, cost: res.result?.total_cost_usd };
  }
}

function claudeArgs(m, dir, label, cfg) {
  const args = [
    '-p', '--output-format', 'stream-json', '--verbose',
    '--permission-mode', m.permission || cfg.defaults.permission,
    // Nobody is at the keyboard: anything that would prompt is denied, not left hanging.
    '--permission-prompts', 'none',
    '--append-system-prompt-file', path.join(PKG, 'prompts', 'standing-orders.md'),
    '--settings', JSON.stringify(hookSettings()),
    '--add-dir', dir, paths.lessons,
    '-n', `crew ${m.id} ${label}${m.role ? ` (${m.role})` : ''}`,
    '--disallowedTools', ...cfg.deny,
  ];
  if (m.model) args.push('--model', String(m.model));
  if (m.effort) args.push('--effort', String(m.effort));
  return args;
}

export function crewEnv(m, dir, root) {
  return {
    ...process.env,
    CREW_TASK: m.id || '',
    CREW_ROLE: m.role || '',
    CREW_PROJECT: m.project || '',
    CREW_ROOT: root,
    CREW_RUN_DIR: dir || '',
  };
}

function planningSection(worktree) {
  const docs = ['crew/BRIEF.md', 'crew/SPEC.md', 'crew/DESIGN.md', 'crew/contracts']
    .filter(d => fs.existsSync(path.join(worktree, d)));
  if (!docs.length) return 'This repo has no crew planning docs yet.';
  return `Planning docs in this repo (read the ones relevant to your task; approved ones are frozen):\n${docs.map(d => `- \`${d}\``).join('\n')}`;
}

function buildPrompt(card, { i, dir, lessons, lastCheck, worktree, branch, syncNote }) {
  const m = card.meta;
  const tpl = fs.readFileSync(path.join(PKG, 'prompts', 'iteration.md'), 'utf8');
  let checkText = !lastCheck
    ? 'Not run yet.'
    : `${lastCheck.ok ? 'PASS' : 'FAIL'} (exit ${lastCheck.code})${lastCheck.claimedDone && !lastCheck.ok ? ' — the previous iteration said DONE but the check failed.' : ''}\n\n\`\`\`\n${lastCheck.tail}\n\`\`\``;
  const reviewFile = path.join(dir, 'REVIEW.md');
  if (lastCheck?.review && fs.existsSync(reviewFile)) {
    checkText += `\n\n**The reviewer asked for changes.** Address every "Must fix" item in \`${reviewFile}\` before saying DONE again:\n\n${fs.readFileSync(reviewFile, 'utf8').trim()}`;
  }
  const t = m.role ? project.roleTemplate(m.role) : null;
  const p = project.tryLoad(m.project);
  const roleSection = t
    ? `## Your role: ${t.title}\n\nYou may edit only: ${project.ownsFor(p, m.role).map(g => `\`${g}\``).join(', ') || 'nothing (read-only)'}. Writes elsewhere are blocked; if you need something outside them, file a request (see your standing orders).\n\n${t.prompt}`
    : '';
  const vars = {
    id: m.id, title: m.title, i, max: m.iterations, hours: m.hours, check: m.check,
    goal: card.body, worktree, branch, base: m.base,
    progress: path.join(dir, 'PROGRESS.md'),
    decisions: path.join(dir, 'DECISIONS.md'),
    questions: path.join(dir, 'QUESTIONS.md'),
    lessons, lastCheck: checkText,
    roleSection, planning: planningSection(worktree),
    syncNote: syncNote ? `## Note\n\n${syncNote}` : '',
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

function runClaude(prompt, { cwd, logFile, timeoutMs, args, env }) {
  return new Promise(resolve => {
    const child = spawn(CLAUDE, args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = fs.createWriteStream(logFile, { flags: 'a' });
    let buf = '', stderr = '', result = null, timedOut = false;
    child.stdout.on('data', chunk => {
      out.write(chunk);
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        try {
          const ev = JSON.parse(line);
          if (ev.type === 'result') {
            result = ev;
            // The turn is over. A shell the agent left running (say, one waiting on stdin) would
            // keep claude alive until the iteration timeout, so give it a short grace period.
            setTimeout(() => { if (child.exitCode === null) killTree(child.pid); }, 30_000).unref();
          }
          if (ev.type === 'rate_limit_event') safe(() => limits.saveFromStream(ev.rate_limit_info));
        } catch { /* partial or non-JSON line */ }
      }
    });
    child.stderr.on('data', c => { stderr += c; out.write(c); });
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, timeoutMs);
    child.on('error', err => { stderr += String(err); });
    child.on('close', code => {
      clearTimeout(timer);
      out.end();
      resolve({ code, result, stderr: timedOut ? `timed out after ${timeoutMs / 60_000} min\n${stderr}` : stderr });
    });
    child.stdin.end(prompt);
  });
}

function runCheck(command, cwd, timeoutMin) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', windowsHide: true, timeout: timeoutMin * 60_000, maxBuffer: 32 * 1024 * 1024 });
  const all = `${r.stdout || ''}${r.stderr || ''}`.trim();
  return { ok: r.status === 0, code: r.status ?? 'timeout', tail: all.split('\n').slice(-60).join('\n') };
}

async function pace(id, log) {
  const until = limits.waitUntil();
  if (!until) return;
  log(`pacing: plan window nearly full, waiting until ${new Date(until * 1000).toISOString()}`);
  await waitWithStatus(id, until, 'paced: plan window nearly full');
}

async function waitWithStatus(id, untilSec, reason) {
  cards.update(id, { reason: `${reason}, resumes ${new Date(untilSec * 1000).toLocaleTimeString()}` });
  events.emit(id, 'paced', reason);
  while (Date.now() / 1000 < untilSec) {
    await sleep(60_000);
    safe(() => cards.update(id, { heartbeat: now() }));
  }
  cards.update(id, { reason: '' });
}

function readLastCheck(dir) {
  const p = path.join(dir, 'last-check.txt');
  if (!fs.existsSync(p)) return null;
  const [first, ...rest] = fs.readFileSync(p, 'utf8').split('\n');
  return { ok: first.startsWith('PASS'), code: first.match(/exit (\S+)\)/)?.[1], tail: rest.join('\n') };
}

function lastQuestion(dir) {
  const text = fs.readFileSync(path.join(dir, 'QUESTIONS.md'), 'utf8');
  const blocks = text.split(/^## /m).slice(1);
  const open = blocks.filter(b => !/\bANSWER\b/.test(b));
  return open.length ? open[open.length - 1].split('\n')[0].trim() : '';
}

function section(title, file, skipLines = 1) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').slice(skipLines).join('\n').trim() : '';
  return `## ${title}\n\n${text || '_none_'}`;
}

export function spawnDetached(args) {
  const out = fs.openSync(path.join(paths.runs, 'detached.log'), 'a');
  const child = spawn(process.execPath, [path.join(PKG, 'bin', 'crew.mjs'), ...args], {
    detached: true, windowsHide: true, stdio: ['ignore', out, out],
  });
  child.unref();
  return child.pid;
}

export function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
  else safe(() => process.kill(-pid, 'SIGTERM'));
}

export function alive(pid) {
  if (!pid) return false;
  try { process.kill(Number(pid), 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

const now = () => new Date().toISOString();
function safe(fn) { try { return fn(); } catch { return undefined; } }
