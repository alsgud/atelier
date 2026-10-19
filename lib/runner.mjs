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
import * as decisions from './decisions.mjs';
import * as budget from './budget.mjs';
import * as messages from './messages.mjs';
import { hookSettings } from './guard.mjs';

const CLAUDE = process.env.ATELIER_CLAUDE || 'claude';
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
      // Running out of room is the lead's call (extend, re-scope or stop), not the owner's.
      const forLead = why => ['paused', `for the lead: ${why}; check ${m.last_check || 'not run yet'}. Extend with: atelier extend ${id} (--iterations N --hours N --budget N)`];
      if (i > Number(m.iterations)) { outcome = forLead(`used all ${m.iterations} iterations`); break; }
      if (elapsed > Number(m.hours) * 60) { outcome = forLead(`used the ${m.hours}h time limit`); break; }
      if (m.project) {
        const spent = budget.taskSpend(m), cap = budget.taskLimit(m);
        if (spent >= cap) { outcome = forLead(`reached its $${cap} budget ($${spent.toFixed(2)} spent)`); break; }
        const d = budget.today(m.project);
        if (d.over) { outcome = ['paused', `daily budget: ${m.project} has spent $${d.spent} of $${d.limit} today. Resumes tomorrow, or when the owner raises the limit`]; break; }
      }

      const before = gitx.head(worktree);
      log(`iteration ${i} start`);
      cards.update(id, { iter_started: now(), live_tokens: 0 });
      const res = await callClaude(id, log, buildPrompt(card, { i, dir, lessons, lastCheck, worktree, branch, syncNote }), {
        cwd: worktree,
        logFile: path.join(dir, `iter-${String(i).padStart(2, '0')}.jsonl`),
        timeoutMs: cfg.iterationTimeoutMin * 60_000,
        args: claudeArgs(m, dir, `#${i}`, cfg),
        env: atelierEnv(m, dir, worktree, i),
        liveId: id,
      });
      syncNote = '';
      if (res.fatal) { outcome = ['failed', res.fatal]; break; }

      gitx.commitIfDirty(worktree, `atelier(${id}): iteration ${i} leftovers`);
      const touched = testsTouched(worktree, before);
      if (touched.length) {
        cards.update(id, { test_touch: touched.slice(0, 8).join(',') });
        events.emit(id, 'test-touch', `changed or deleted existing tests: ${touched.slice(0, 5).join(', ')}`);
      }
      const reverted = enforceOwnership(m, worktree, before, dir, log);
      if (reverted.length) syncNote = `The runner reverted your changes to files your role doesn't own (edits made through the shell are checked too): ${reverted.map(f => `\`${f}\``).join(', ')}. Use a request card for those.`;
      noChange = before === gitx.head(worktree) ? noChange + 1 : 0;

      const status = (res.text.match(/ATELIER_STATUS:\s*(CONTINUE|DONE|BLOCKED)/i)?.[1] || 'CONTINUE').toUpperCase();
      const check = runCheck(m.check, worktree, cfg.checkTimeoutMin);
      fs.writeFileSync(path.join(dir, 'last-check.txt'), `${check.ok ? 'PASS' : 'FAIL'} (exit ${check.code})\n${check.tail}`);
      lastCheck = { ...check, claimedDone: status === 'DONE' };

      cards.update(id, {
        iteration: i,
        last_check: check.ok ? 'pass' : 'fail',
        elapsed_min: Math.round(baseElapsed + (Date.now() - startedAt) / 60_000),
        heartbeat: now(),
      });
      addCost(id, res.cost, res.tokens, (Date.now() - Date.parse(cards.load(id).meta.iter_started || now())) / 60_000);
      events.emit(id, 'iteration', `#${i} ${status.toLowerCase()} · check ${check.ok ? 'pass' : 'fail'}${res.cost ? ` · $${res.cost.toFixed(2)} api-equiv` : ''}`);
      log(`iteration ${i} done: agent=${status} check=${check.ok ? 'pass' : 'fail'}`);

      if (status === 'BLOCKED') {
        const waits = cards.all().filter(c => c.meta.requested_by === id && !['done', 'failed'].includes(c.meta.status)).map(c => c.meta.id);
        cards.update(id, { waits_on: waits.join(',') });
        outcome = ['needs-you', waits.length ? `waiting on request ${waits.join(', ')}` : (lastQuestion(dir) || 'Agent is blocked; see QUESTIONS.md')];
        break;
      }
      if (status === 'DONE' && check.ok && m.project) {
        // The task's acceptance criteria and hidden holdout tests must pass too. Only this flips their status.
        const ids = decisions.criteriaIds(m.criteria);
        const v = decisions.verify(m.project, worktree, ids, { timeoutMin: cfg.checkTimeoutMin });
        for (const r of v.results.filter(r => r.ok !== null)) safe(() => decisions.setStatus(m.project, r.id, r.ok ? 'pass' : 'fail', `task ${id}`));
        const failed = v.results.filter(r => r.ok === false);
        const holdoutFailed = v.holdout && !v.holdout.ok;
        events.emit(id, 'criteria', `${v.results.filter(r => r.ok).length}/${v.results.filter(r => r.ok !== null).length} criteria pass${v.holdout ? `, holdout ${v.holdout.ok ? 'pass' : 'FAIL'}` : ''}`);
        if (failed.length || holdoutFailed) {
          // Holdout output stays hidden: telling the agent what the hidden tests check would defeat them.
          lastCheck = {
            ok: false, code: 'criteria', claimedDone: true,
            tail: [
              ...failed.map(r => `${r.id} FAILED:\n${r.out}`),
              ...(holdoutFailed ? ['Hidden holdout tests failed. Re-read the criteria and the spec: the solution must work for all valid inputs, not just the visible tests.'] : []),
            ].join('\n\n'),
          };
          noChange = 0;
          continue;
        }
      }
      // Tier 2: the project's full suite, so a task can't pass its own check while breaking others' work.
      const suiteCmd = project.tryLoad(m.project)?.suite;
      if (status === 'DONE' && check.ok && suiteCmd) {
        const suite = runCheck(suiteCmd, worktree, cfg.checkTimeoutMin);
        events.emit(id, 'suite', suite.ok ? 'full suite passes' : 'full suite FAILS');
        if (!suite.ok) {
          lastCheck = { ok: false, code: suite.code, claimedDone: true, tail: `Your check passes, but the project's full suite (\`${suiteCmd}\`) fails. Your change must not break other work:\n\n${suite.tail}` };
          noChange = 0;
          continue;
        }
      }
      if (status === 'DONE' && check.ok) {
        if (!needsReview(m)) { outcome = ['done', 'check passes'];  break; }
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

    if (outcome[0] === 'done') {
      // Criteria that need the owner's judgement never auto-pass: queue them for the owner's review.
      const m = cards.load(id).meta;
      if (m.project) {
        const ids = decisions.criteriaIds(m.criteria);
        for (const c of decisions.loadCriteria(m.project).criteria.filter(c => ids.includes(c.id) && c.kind === 'owner')) {
          decisions.setStatus(m.project, c.id, 'awaiting-owner', `task ${id}`);
          events.emit(m.project, 'owner-review', `${c.id} needs your judgement: ${c.statement} (task ${id})`);
        }
      }
      outcome = finish(id, log);
    }
  } catch (err) {
    outcome = ['failed', err.message];
    log(`runner crashed: ${err.stack}`);
  } finally {
    clearInterval(beat);
  }

  const [status, reason] = outcome;
  cards.update(id, { status, reason, pid: '' });
  events.emit(id, status, reason);
  // Wake the lead (its watch listens for these) when the decision is its to make.
  if (/^for the lead:/.test(reason)) events.emit(id, 'needs-lead', reason.replace(/^for the lead: /, ''));
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
    depth: reviewDepth(m, worktree),
    role: m.role || 'builder',
    decisions: path.join(dir, 'DECISIONS.md'),
    progress: path.join(dir, 'PROGRESS.md'),
    reviewFile: path.join(dir, 'REVIEW.md'),
    reviewerRole: project.roleTemplate('reviewer').prompt,
    planning: [
      m.project ? decisions.promptSection(m.project, worktree, decisions.criteriaIds(m.criteria)) : '',
      planningSection(worktree),
      m.test_touch ? `## Flagged: existing tests changed\n\nThis task modified or deleted existing tests: ${m.test_touch}. Check each change is legitimate (the spec changed, or the test was wrong) and not a way to make the check pass.` : '',
    ].filter(Boolean).join('\n\n'),
  };
  const prompt = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  // Reviewer model: the roster entry's, else the project dial (Opus at high effort by default).
  const p = project.tryLoad(m.project);
  const dial = project.dials(p).reviewer;
  const rm = { ...m, role: 'reviewer', model: p?.roster.find(r => r.role === 'reviewer')?.model || dial.model, effort: dial.effort };
  const before = gitx.head(worktree);
  const res = await callClaude(m.id, log, prompt, {
    cwd: worktree,
    logFile: path.join(dir, `review-${round}.jsonl`),
    timeoutMs: cfg.iterationTimeoutMin * 60_000,
    args: claudeArgs(rm, dir, `review ${round}`, cfg),
    env: atelierEnv(rm, dir, worktree),
  });
  if (res.fatal) return { fatal: res.fatal };
  // The reviewer owns nothing: drop uncommitted edits and revert anything it managed to commit.
  gitx.git(worktree, 'checkout', '--', '.');
  enforceOwnership(rm, worktree, before, dir, log);
  addCost(m.id, res.cost, res.tokens);
  const verdict = (res.text.match(/ATELIER_REVIEW:\s*(APPROVE|CHANGES)/i)?.[1] || 'CHANGES').toUpperCase();
  log(`review round ${round}: ${verdict}`);
  return { verdict };
}

// The runner pushes, never the agent. Autonomy (set per project; the owner chose `merge` for
// test projects and `pr` for client work) decides how far it goes:
//   branch: leave it on the local branch · pr: push the branch and open a draft PR
//   merge:  merge the latest base in, re-run the check, and push straight to base
function finish(id, log) {
  const m = cards.load(id).meta;
  const wt = m.worktree;
  if (gitx.taskCommits(wt, m.base) === 0) return ['failed', 'check passes but the branch has no commits'];
  if (m.autonomy === 'merge') return mergeAndPush(m, log);
  if (m.autonomy !== 'pr') return ['review', `ready on local branch ${m.branch}`];
  if (!gitx.hasRemote(wt)) return ['review', `ready on local branch ${m.branch} (repo has no remote, so no PR)`];

  const push = gitx.git(wt, 'push', '-u', 'origin', m.branch);
  if (!push.ok) return ['review', `ready on ${m.branch}, but push failed: ${push.err.slice(0, 200)}`];
  const existing = spawnSync('gh', ['pr', 'view', m.branch, '--json', 'url', '-q', '.url'], { cwd: wt, encoding: 'utf8', windowsHide: true });
  let url = existing.status === 0 ? existing.stdout.trim() : '';
  if (!url) {
    const dir = runDir(id);
    const body = [
      `Opened by atelier task \`${id}\`${m.role ? ` (${m.role})` : ''}. The done-check \`${m.check}\` passes.`,
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

function mergeAndPush(m, log) {
  const wt = m.worktree;
  if (!gitx.hasRemote(wt)) return ['review', `ready on local branch ${m.branch} (merge mode pushes to origin, and this repo has no remote)`];
  const cfg = config();
  for (let attempt = 1; attempt <= 3; attempt++) {
    let merged;
    try { merged = gitx.mergeBases(wt, m.base); } catch {
      return ['needs-you', `done and reviewed, but it conflicts with the latest ${m.base}; needs a merge fix (branch ${m.branch})`];
    }
    if (merged.length) {
      // Someone else's work landed meanwhile: make sure the combination still passes.
      const check = runCheck(project.tryLoad(m.project)?.suite || m.check, wt, cfg.checkTimeoutMin);
      if (!check.ok) return ['needs-you', `done and reviewed, but the check fails after merging the latest ${m.base}; see ${path.join(runDir(m.id), 'last-check.txt')}`];
    }
    // Fast-forward only: a rejected push means base moved again, so merge and retry.
    const push = gitx.git(wt, 'push', 'origin', `HEAD:refs/heads/${m.base}`);
    if (push.ok) {
      const sha = gitx.head(wt).slice(0, 7);
      log(`merged into ${m.base} and pushed (${sha})`);
      return ['done', `merged into ${m.base} and pushed (${sha})`];
    }
    log(`push to ${m.base} rejected (attempt ${attempt}): ${push.err.slice(0, 160)}`);
  }
  return ['needs-you', `couldn't push to ${m.base} after 3 attempts (branch ${m.branch} is ready)`];
}

// The PreToolUse hook only sees the edit tools. This checks what actually changed in git since
// `before`, by any means, and reverts files the role may not touch.
export function enforceOwnership(m, wt, before, dir, log) {
  const diff = gitx.git(wt, 'diff', '--name-status', '--no-renames', before, 'HEAD');
  if (!diff.ok || !diff.out) return [];
  const env = { ATELIER_ROOT: wt, ATELIER_ROLE: m.role || '', ATELIER_PROJECT: m.project || '', ATELIER_RUN_DIR: dir, ATELIER_FILES: m.files || '' };
  const bad = diff.out.split('\n').map(l => l.split('\t')).filter(([, f]) =>
    f && guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(wt, f) } }, env));
  if (!bad.length) return [];
  for (const [st, f] of bad) {
    if (st === 'A') gitx.git(wt, 'rm', '-q', '--cached', '--', f), fs.rmSync(path.join(wt, f), { force: true });
    else gitx.git(wt, 'checkout', before, '--', f);
  }
  const files = bad.map(([, f]) => f);
  gitx.git(wt, 'add', '-A', '--', ...files);
  gitx.git(wt, 'commit', '-q', '--no-verify', '-m', `atelier(${m.id}): revert edits outside ${m.role || 'task'} ownership`);
  log(`reverted out-of-bounds edits: ${files.join(', ')}`);
  events.emit(m.id, 'ownership', `reverted ${files.length} file(s) outside ${m.role}'s ownership`);
  return files;
}

function syncWithBase(wt, base, log) {
  try {
    const merged = gitx.mergeBases(wt, base);
    if (!merged.length) return '';
    log(`merged ${merged.join(', ')} into the branch`);
    return `Since your last iteration, the latest \`${base}\` was merged into your branch (approved planning docs or finished work may have landed). Check \`git log -5\`.`;
  } catch {
    log(`merge of ${base} conflicted; aborted`);
    return `\`${base}\` has moved on and couldn't be merged into your branch automatically (conflict). Carry on; mention it in the progress log so the lead can sort it out.`;
  }
}

// Runs one claude -p call, waiting out plan limits and retrying, so callers only see real outcomes.
export async function callClaude(id, log, prompt, opts) {
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
    return { text, cost: res.result?.total_cost_usd, tokens: res.tokens };
  }
}

export function claudeArgs(m, dir, label, cfg) {
  const args = [
    '-p', '--output-format', 'stream-json', '--verbose',
    '--permission-mode', m.permission || cfg.defaults.permission,
    // Nobody is at the keyboard: anything that would prompt is denied, not left hanging.
    '--permission-prompts', 'none',
    '--append-system-prompt-file', path.join(PKG, 'prompts', 'standing-orders.md'),
    '--settings', JSON.stringify(hookSettings()),
    '--add-dir', dir, paths.lessons,
    '-n', `atelier ${m.id} ${label}${m.role ? ` (${m.role})` : ''}`,
    '--disallowedTools', ...cfg.deny,
  ];
  if (m.model) args.push('--model', String(m.model));
  if (m.effort) args.push('--effort', String(m.effort));
  return args;
}

// Windows only reads PATH when a process starts, so a runner launched by a long-running dashboard
// wouldn't see software installed since (a new Rust or Flutter, say). Rebuild it from the registry.
let pathCache = { at: 0, value: '' };
function freshPath() {
  if (process.platform !== 'win32') return process.env.PATH || process.env.Path || '';
  if (Date.now() - pathCache.at < 300_000) return pathCache.value;
  const read = key => {
    const r = spawnSync('reg', ['query', key, '/v', 'Path'], { encoding: 'utf8', windowsHide: true });
    const line = (r.stdout || '').split(/\r?\n/).find(l => /\sREG_(EXPAND_)?SZ\s/.test(l)) || '';
    return line.replace(/^\s*Path\s+REG_(EXPAND_)?SZ\s+/i, '').trim();
  };
  const expand = s => s.replace(/%([^%]+)%/g, (all, v) => process.env[v] ?? all);
  const parts = [read('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'), read('HKCU\\Environment'), process.env.Path || process.env.PATH || '']
    .flatMap(s => expand(s).split(';')).map(s => s.trim()).filter(Boolean);
  const seen = new Set();
  pathCache = { at: Date.now(), value: parts.filter(p => { const k = p.toLowerCase().replace(/\\$/, ''); return seen.has(k) ? false : seen.add(k); }).join(';') };
  return pathCache.value;
}

export function atelierEnv(m, dir, root, iteration = '') {
  const PATH = freshPath();
  return {
    ...process.env,
    ...(process.platform === 'win32' ? { Path: PATH, PATH } : {}),
    ATELIER_TASK: m.id || '',
    ATELIER_ROLE: m.role || '',
    ATELIER_PROJECT: m.project || '',
    ATELIER_FILES: m.files || '',
    ATELIER_ITER: String(iteration),
    ATELIER_ROOT: root,
    ATELIER_RUN_DIR: dir || '',
  };
}

// Review depth by risk: small, contained diffs get a light pass; anything touching tests, contracts,
// planning docs, or a lot of code gets a full one. (Patch size and file types predict review effort well.)
export function reviewDepth(m, wt) {
  const stat = gitx.git(wt, 'diff', '--numstat', `${m.base}...HEAD`).out.split('\n').filter(Boolean).map(l => l.split('\t'));
  const lines = stat.reduce((n, [a, d]) => n + (Number(a) || 0) + (Number(d) || 0), 0);
  const files = stat.map(s => s[2] || '');
  const risky = m.test_touch || files.some(f => f.startsWith('atelier/') || /contract|schema|migration|auth|security/i.test(f));
  if (risky || lines > 300 || files.length > 8 || Number(m.review_rounds || 0) > 0) {
    return `**Full review.** ${risky ? 'This change touches tests, contracts, planning docs or sensitive code. ' : ''}${lines} lines across ${files.length} files. Work through the whole rubric.`;
  }
  return `**Light review.** Small, contained change (${lines} lines, ${files.length} files). Verify the objective and criteria, run the check, and scan for gamed tests; go deeper only if something looks off.`;
}

// Existing test files modified or deleted since `before` (new tests are fine). These go to the reviewer
// and the lead: changing a test to make it pass is the classic way agents game a check.
export function testsTouched(wt, before) {
  const diff = gitx.git(wt, 'diff', '--name-status', '--no-renames', before, 'HEAD');
  if (!diff.ok || !diff.out) return [];
  return diff.out.split('\n').map(l => l.split('\t'))
    .filter(([st, f]) => f && (st === 'M' || st === 'D') && decisions.TEST_GLOBS.some(g => guard.matches(f, g)))
    .map(([st, f]) => `${f}${st === 'D' ? ' (deleted)' : ''}`);
}

function planningSection(worktree) {
  const docs = ['atelier/BRIEF.md', 'atelier/SPEC.md', 'atelier/DESIGN.md', 'atelier/contracts']
    .filter(d => fs.existsSync(path.join(worktree, d)));
  if (!docs.length) return 'This repo has no atelier planning docs yet.';
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
    roleSection,
    planning: [
      m.project ? decisions.promptSection(m.project, worktree, decisions.criteriaIds(m.criteria)) : '',
      planningSection(worktree),
    ].filter(Boolean).join('\n\n'),
    syncNote: syncNote ? `## Note\n\n${syncNote}` : '',
    inbox: m.project ? (safe(() => messages.render(messages.inbox(m.project, m))) || '') : '',
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}

// Tokens per API call, keyed by message id (a streamed message repeats its usage as it grows).
const tokensOf = u => (u?.input_tokens || 0) + (u?.output_tokens || 0) + (u?.cache_read_input_tokens || 0) + (u?.cache_creation_input_tokens || 0);

function runClaude(prompt, { cwd, logFile, timeoutMs, args, env, liveId }) {
  return new Promise(resolve => {
    const child = spawn(CLAUDE, args, { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = fs.createWriteStream(logFile, { flags: 'a' });
    let buf = '', stderr = '', result = null, timedOut = false;
    // Live usage for the dashboard: how many tokens this run has used so far, written every 20 seconds.
    const usage = new Map();
    const liveTokens = () => [...usage.values()].reduce((n, u) => n + tokensOf(u), 0);
    const live = liveId ? setInterval(() => safe(() => cards.update(liveId, { live_tokens: liveTokens() })), 20_000) : null;
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
          if (ev.type === 'assistant' && ev.message?.usage) usage.set(ev.message.id || usage.size, ev.message.usage);
        } catch { /* partial or non-JSON line */ }
      }
    });
    child.stderr.on('data', c => { stderr += c; out.write(c); });
    const timer = setTimeout(() => { timedOut = true; killTree(child.pid); }, timeoutMs);
    child.on('error', err => { stderr += String(err); });
    child.on('close', code => {
      clearTimeout(timer);
      if (live) clearInterval(live);
      out.end();
      // Prefer the run's own final totals; fall back to what the stream showed.
      const tokens = result?.usage ? tokensOf(result.usage) : liveTokens();
      resolve({ code, result, tokens, stderr: timedOut ? `timed out after ${timeoutMs / 60_000} min\n${stderr}` : stderr });
    });
    child.stdin.end(prompt);
  });
}

export function runCheck(command, cwd, timeoutMin) {
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
  safe(() => cards.update(id, { reason: `${reason}, resumes ${new Date(untilSec * 1000).toLocaleTimeString()}` }));
  events.emit(id, 'paced', reason);
  while (Date.now() / 1000 < untilSec) {
    await sleep(60_000);
    safe(() => cards.update(id, { heartbeat: now() }));
  }
  safe(() => cards.update(id, { reason: '' }));
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
  const script = path.join(PKG, 'bin', 'atelier.mjs');
  if (process.platform === 'win32') {
    // Launch through a short-lived hidden helper: once it exits, the runner has no living parent, so
    // stopping whoever started it (a lead session, a shell) with a tree kill can't take the runner down
    // too. Both hops are hidden; `cmd start` used to give each runner its own blank console window.
    const hop = `const { spawn } = require('child_process'); const [exe, ...rest] = JSON.parse(process.argv[1]);
      spawn(exe, rest, { detached: true, windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'] }).unref();`;
    const child = spawn(process.execPath, ['-e', hop, JSON.stringify([process.execPath, script, ...args])], {
      detached: true, windowsHide: true, stdio: ['ignore', out, out],
    });
    child.unref();
    return child.pid;
  }
  const child = spawn(process.execPath, [script, ...args], { detached: true, windowsHide: true, stdio: ['ignore', out, out] });
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

// API-equivalent cost per task, for the owner's metrics (on a subscription it's usage, not a bill).
// Also records tokens and iteration minutes, which feed the dashboard's live spend estimate and ETAs.
function addCost(id, cost, tokens = 0, minutes = 0) {
  safe(() => cards.update(id, m => ({
    cost_usd: (Number(m.cost_usd || 0) + (cost || 0)).toFixed(3),
    tokens_total: Number(m.tokens_total || 0) + (tokens || 0),
    live_tokens: 0,
    ...(minutes ? { iter_minutes: [...String(m.iter_minutes || '').split(',').filter(Boolean), minutes.toFixed(1)].slice(-12).join(',') } : {}),
  })));
}
