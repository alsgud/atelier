// The Ralph loop for one task: fresh `claude -p` per iteration, state in files, done = the check passes
// (and, when the project has a reviewer, the reviewer approves).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PKG, paths, config, runDir, repoAlias } from './home.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as gitx from './git.mjs';
import * as tidy from './tidy.mjs';
import * as limits from './limits.mjs';
import * as project from './project.mjs';
import * as guard from './guard.mjs';
import * as decisions from './decisions.mjs';
import * as budget from './budget.mjs';
import * as toolkit from './toolkit.mjs';
import * as projenv from './projenv.mjs';
import * as messages from './messages.mjs';
import { hookSettings } from './guard.mjs';
import * as passcache from './passcache.mjs';

const CLAUDE = process.env.ATELIER_CLAUDE || 'claude';
const MAX_REVIEW_ROUNDS = 2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run(id) {
  const cfg = config();
  let card = cards.load(id);
  const meta = card.meta;
  const dir = runDir(id);
  const log = msg => fs.appendFileSync(path.join(dir, 'runner.log'), `${new Date().toISOString()} ${msg}\n`);

  // One task, one runner: however many copies got started, only the lock's holder goes on. The others leave
  // the card alone (it belongs to the holder) and exit. Nothing here needs the owner to clean up.
  const lock = runnerLock(id);
  if (!takeLock(lock, RUNNER_LOCK_MAX_MS)) return log(`runner ${process.pid} exiting: runner ${readLock(lock) || '?'} has this task`);
  process.on('exit', () => dropLock(lock));
  // Started late (a busy PC can take minutes) and the task was stopped or finished meanwhile.
  if (!['queued', 'running', 'stalled'].includes(meta.status)) return log(`runner ${process.pid} exiting: task is ${meta.status}`);

  const { branch, worktree } = gitx.ensureWorktree(meta);
  try { tidy.ensureExcludes(meta.repo); } catch { /* best effort */ }
  copyProjectData(meta, worktree, log);
  const setupError = setupWorktree(meta, worktree, dir, log);
  if (setupError) {
    cards.update(id, { status: 'paused', reason: `for the lead: the project's setup command failed in a new worktree: ${setupError}`, pid: '' });
    events.emit(id, 'needs-lead', `setup failed: ${setupError}`);
    return;
  }
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

  const beat = setInterval(() => {
    safe(() => cards.update(id, { heartbeat: now() }));
    safe(() => { if (readLock(lock) === process.pid) fs.utimesSync(lock, new Date(), new Date()); });
  }, 60_000);
  const startedAt = Date.now();
  const baseElapsed = Number(meta.elapsed_min || 0);
  let lastCheck = readLastCheck(dir);
  let noChange = 0;
  let outcome = null;
  let lastSuite = null; // { cmd, head } of the last full-suite pass in this run

  try {
    for (let i = Number(meta.iteration || 0) + 1; ; i++) {
      if (readLock(lock) !== process.pid) return log(`runner ${process.pid} exiting: runner ${readLock(lock) || '?'} took over this task`);
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
      cards.update(id, { iter_started: now(), live_tokens: 0, gate: '' });
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
      tidy.keepMediaOut(m, worktree, before, dir, log);
      if (reverted.length) syncNote = `The runner reverted your changes to files your role doesn't own (edits made through the shell are checked too): ${reverted.map(f => `\`${f}\``).join(', ')}. Use a request card for those.`;
      noChange = before === gitx.head(worktree) ? noChange + 1 : 0;

      const status = (res.text.match(/ATELIER_STATUS:\s*(CONTINUE|DONE|BLOCKED)/i)?.[1] || 'CONTINUE').toUpperCase();
      const check = runCheck(m.check, worktree, cfg.checkTimeoutMin, runEnv(m));
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
        const waits = openRequests(id);
        cards.update(id, { waits_on: waits.join(',') });
        const question = lastQuestion(dir);
        if (waits.length) outcome = ['paused', `waiting on request ${waits.join(', ')}`];
        else if (question) outcome = ['needs-you', question];
        else {
          // Blocked without writing a question: the reason is in its final message, and unblocking is the
          // lead's job (merging what it depends on, fixing tooling), not a question for the owner.
          const why = blockerSummary(res.text);
          fs.writeFileSync(path.join(dir, 'BLOCKED.md'), `# Blocked (iteration ${i})\n\n${String(res.text || '').replace(/ATELIER_STATUS:.*$/m, '').trim()}\n`);
          outcome = ['paused', `for the lead: blocked: ${why}`];
        }
        break;
      }
      // Nothing changed and nothing left but what it asked the lead for: wait off the slot, as BLOCKED does, instead
      // of re-verifying the same commit at full cost (14 Nov: rmy4 spent three iterations waiting on a paid run).
      // A DONE goes on through the gates below, so finished work still lands while the request waits.
      if (status === 'CONTINUE' && before === gitx.head(worktree)) {
        const waits = openRequests(id);
        if (waits.length) { cards.update(id, { waits_on: waits.join(',') }); outcome = ['paused', `waiting on request ${waits.join(', ')}`]; break; }
      }
      // Shown working, checked first because it costs nothing: a missing proof used to send the task back only after
      // two 10-minute suites had run, and then they ran again (14 Nov). A build task's "done" must come with proof of a real run, made after its last
      // code change: screenshots, a recording or a log against real data, described in EVIDENCE.md.
      if (status === 'DONE' && check.ok && needsEvidence(m)) {
        const proof = evidenceState(dir, worktree);
        if (!proof.ok) {
          events.emit(id, 'evidence', `no proof of a real run yet: ${proof.why}`);
          lastCheck = { ok: false, code: 'evidence', claimedDone: true, tail: evidenceBrief(dir, m, proof.why) };
          noChange = 0;
          continue;
        }
        events.emit(id, 'evidence', `proof attached: ${proof.files.join(', ').slice(0, 160)}`);
      }
      if (status === 'DONE' && check.ok && m.project) {
        gate(id, 'its acceptance checks');
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
        gate(id, 'the full test suite');
        const suite = passcache.once(suiteCmd, worktree, () => runCheck(suiteCmd, worktree, cfg.checkTimeoutMin, runEnv(m)));
        events.emit(id, 'suite', suite.ok ? 'full suite passes' : 'full suite FAILS');
        lastSuite = suite.ok ? { cmd: suiteCmd, head: gitx.head(worktree) } : null;
        if (!suite.ok) {
          lastCheck = { ok: false, code: suite.code, claimedDone: true, tail: `Your check passes, but the project's full suite (\`${suiteCmd}\`) fails. Your change must not break other work:\n\n${suite.tail}` };
          noChange = 0;
          continue;
        }
      }
      gate(id, '');
      if (status === 'DONE' && check.ok) {
        if (!needsReview(m)) { outcome = ['done', 'check passes'];  break; }
        const round = Number(m.review_rounds || 0) + 1;
        cards.update(id, { reason: `in review (round ${round})` });
        events.emit(id, 'review-started', `round ${round}`);
        const verdict = await review(cards.load(id), { dir, worktree, cfg, round, log, suite: lastSuite });
        if (verdict.fatal) { outcome = ['failed', verdict.fatal]; break; }
        if (!verdict.verdict) { cards.update(id, { reason: '' }); outcome = ['paused', `for the lead: the reviewer ended twice without a verdict (round ${round}); the work itself passed its check. See review-${round}*.jsonl in the run folder, then resume it (atelier extend ${id}) or land it yourself`]; break; }
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
  cards.update(id, { status, reason, pid: '', gate: '' });
  events.emit(id, status, reason);
  // Wake the lead (its watch listens for these) when the decision is its to make.
  if (/^for the lead:/.test(reason)) events.emit(id, 'needs-lead', reason.replace(/^for the lead: /, ''));
  log(`runner exit: ${status} — ${reason}`);
  dropLock(lock);
  // Free slot: let the scheduler start whatever is queued next.
  spawnDetached(['tick']);
}

// ---------- shown working ----------
// Roles whose work is a running product need proof of a real run before "done" counts. Planning and
// contract tasks are exempt, and the lead can exempt a task with `--evidence none`.
const EVIDENCE_ROLES = new Set(['frontend', 'gameplay', 'builder', 'backend', 'systems', 'designer', 'voice', 'cognition', 'persona', 'ml']);
const EVIDENCE_FILES = /\.(png|jpe?g|webp|gif|mp4|webm|wav|mp3|ogg|flac|m4a|log|txt|json|jsonl|csv|html)$/i;

export function needsEvidence(m) {
  if (m.evidence === 'none' || !m.project || m.role === 'researcher') return false;
  if (m.phase && m.phase !== 'design') return false;
  return EVIDENCE_ROLES.has(m.role || 'builder');
}

export function evidenceState(dir, worktree) {
  const ev = path.join(dir, 'evidence');
  const notes = path.join(ev, 'EVIDENCE.md');
  if (!fs.existsSync(notes) || fs.readFileSync(notes, 'utf8').trim().length < 80) return { ok: false, why: 'evidence/EVIDENCE.md is missing or empty' };
  const files = fs.readdirSync(ev).filter(f => EVIDENCE_FILES.test(f) && f !== 'EVIDENCE.md');
  if (!files.length) return { ok: false, why: 'no screenshots, recording or run log in evidence/' };
  const lastCode = Number(gitx.git(worktree, 'log', '-1', '--format=%ct').out || 0) * 1000;
  const newest = Math.max(...files.map(f => fs.statSync(path.join(ev, f)).mtimeMs), fs.statSync(notes).mtimeMs);
  if (lastCode && newest < lastCode) return { ok: false, why: 'the evidence is older than your last code change' };
  return { ok: true, files };
}

function evidenceBrief(dir, m, why) {
  const ev = path.join(dir, 'evidence');
  return `You reported DONE and the check passes, but there's no proof yet that it works for real (${why}).
"Done" means shown working the way the owner will use it, not just tests passing. Before reporting DONE again:
1. Run the real thing end to end on real data: the actual app or CLI against the real core and the real library or files, never mocks or fakes.
   ${m.role === 'designer' ? 'For design: render every screen you changed in the headless browser (playwright) at desktop and phone widths, in its key states.' : 'For anything with a screen: capture it headlessly where you can (playwright for web; a golden or screenshot test for apps). If it truly needs a visible window, ask first: atelier screen request.'}${toolkit.chromePath() ? `\n   In a script of your own, start the browser on the graphics card: ${toolkit.GPU_LAUNCH}. Playwright's default headless shell draws WebGL on the CPU and pins the owner's PC.` : ''}
2. Save the proof in ${ev}: screenshots or a short recording, and/or the log of the real run.
3. Write ${path.join(ev, 'EVIDENCE.md')}: what you ran (exact commands), on what data, what happened, and anything that didn't work. Be honest: a known gap stated plainly is fine; a hidden one isn't.
The reviewer and the owner will look at this.`;
}

// Data the project's code needs that isn't in git (for example a persona file), copied from the owner's
// main checkout into the worktree once, as the owner configured (`atelier project data`). The copy is
// the task's own: nothing the task does reaches the owner's real files.
function copyProjectData(m, worktree, log) {
  const list = m.project ? project.tryLoad(m.project)?.dataCopy : null;
  if (!list?.length || fs.existsSync(path.join(worktree, '.atelier-data-copied'))) return;
  const src = m.repo;
  for (const rel of list) {
    const from = path.join(src, rel), to = path.join(worktree, rel);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true });
  }
  fs.writeFileSync(path.join(worktree, '.atelier-data-copied'), new Date().toISOString());
  log(`copied project data into the worktree: ${list.join(', ')}`);
}

// The project's setup command (for example `uv sync --all-extras`), run once in each new worktree with
// the project's keys, before the agent's first iteration. Returns an error line, or '' when ready.
function setupWorktree(m, worktree, dir, log) {
  const cmd = m.project ? project.tryLoad(m.project)?.setup : '';
  const marker = path.join(worktree, '.atelier-setup-done');
  if (!cmd || fs.existsSync(marker)) return '';
  log(`setting up the worktree: ${cmd}`);
  const r = spawnSync(cmd, { cwd: worktree, shell: true, encoding: 'utf8', windowsHide: true, timeout: 30 * 60_000, maxBuffer: 32 * 1024 * 1024, env: atelierEnv(m, dir, worktree) });
  fs.writeFileSync(path.join(dir, 'setup.log'), `$ ${cmd}\n${r.stdout || ''}${r.stderr || ''}`);
  if (r.status !== 0) return `${cmd} exited ${r.status ?? 'on timeout'} (see setup.log in the run folder)`;
  fs.writeFileSync(marker, new Date().toISOString());
  return '';
}

// Requests this task filed that the lead hasn't settled yet.
export const openRequests = id => cards.all().filter(c => c.meta.requested_by === id && !['done', 'failed'].includes(c.meta.status)).map(c => c.meta.id);

function needsReview(m) {
  if (m.role === 'reviewer' || m.role === 'researcher') return false;
  return project.hasReviewer(project.tryLoad(m.project));
}

// What the runner already proved on this exact commit, so the reviewer doesn't spend its time re-running it
// (14 Nov: rmy4's reviewer re-ran a 20-minute suite, ended its session waiting on it, and gave no verdict).
export function suiteNote(suite, head) {
  if (!suite || suite.head !== head) return '';
  return `# Already verified by the runner\n\nThe project's full suite (\`${suite.cmd}\`) passed on this exact commit (${head.slice(0, 7)}) just before this review. Don't run it again: run only the tests that bear on what you're checking.`;
}

// The reviewer's verdict line, or '' when it ended without one (a crash, a timeout, or waiting on a command).
export const verdictOf = text => (String(text || '').match(/ATELIER_REVIEW:\s*(APPROVE|CHANGES)/i)?.[1] || '').toUpperCase();

async function review(card, { dir, worktree, cfg, round, log, suite }) {
  const m = card.meta;
  const tpl = fs.readFileSync(path.join(PKG, 'prompts', 'review.md'), 'utf8');
  const vars = {
    id: m.id, title: m.title, goal: card.body, base: m.base, branch: m.branch, check: m.check, round,
    depth: reviewDepth(m, worktree),
    role: m.role || 'builder',
    decisions: path.join(dir, 'DECISIONS.md'),
    progress: path.join(dir, 'PROGRESS.md'),
    evidence: path.join(dir, 'evidence'),
    reviewFile: path.join(dir, 'REVIEW.md'),
    reviewerRole: project.roleTemplate('reviewer').prompt,
    suite: suiteNote(suite, gitx.head(worktree)),
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
  // A review that ends without a verdict line says nothing about the work, so it isn't counted as CHANGES (that
  // used up review rounds and sent finished work to the owner). It gets one more try, told why; then the lead hears.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const before = gitx.head(worktree);
    const again = attempt > 1 ? `\n\n# Your last attempt ended without a verdict\n\nYour previous session ended before its \`ATELIER_REVIEW:\` line, probably while waiting on a command. Don't start anything in the background. Check what you need in the foreground, write ${vars.reviewFile}, and end with the verdict line.` : '';
    const res = await callClaude(m.id, log, prompt + again, {
      cwd: worktree,
      logFile: path.join(dir, `review-${round}${attempt > 1 ? `-${attempt}` : ''}.jsonl`),
      timeoutMs: cfg.iterationTimeoutMin * 60_000,
      args: claudeArgs(rm, dir, `review ${round}`, cfg),
      env: atelierEnv(rm, dir, worktree),
    });
    if (res.fatal) return { fatal: res.fatal };
    // The reviewer owns nothing: drop uncommitted edits and revert anything it managed to commit.
    gitx.git(worktree, 'checkout', '--', '.');
    enforceOwnership(rm, worktree, before, dir, log);
    addCost(m.id, res.cost, res.tokens);
    const verdict = verdictOf(res.text);
    log(`review round ${round}${attempt > 1 ? ` (attempt ${attempt})` : ''}: ${verdict || 'no verdict'}`);
    if (verdict) return { verdict };
  }
  return { verdict: '' };
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
      const cmd = project.tryLoad(m.project)?.suite || m.check;
      const check = passcache.once(cmd, wt, () => runCheck(cmd, wt, cfg.checkTimeoutMin, runEnv(m)));
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
  // Judge only what this task's own commits changed. Files that arrived by merging the base branch (other
  // builders' work, the lead's planning docs) aren't this task's edits, and reverting them wiped real work.
  const base = m.base || 'main';
  const notBase = [base, gitx.remoteBase(wt, base)].filter(Boolean);
  const own = new Set(gitx.git(wt, 'log', '--no-merges', '--format=', '--name-only', `${before}..HEAD`, '--not', ...notBase).out.split('\n').map(s => s.trim()).filter(Boolean));
  const env = { ATELIER_ROOT: wt, ATELIER_ROLE: m.role || '', ATELIER_PROJECT: m.project || '', ATELIER_RUN_DIR: dir, ATELIER_FILES: m.files || '' };
  const bad = diff.out.split('\n').map(l => l.split('\t')).filter(([, f]) =>
    f && own.has(f) && guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(wt, f) } }, env));
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
  args.push(...toolkit.args(toolkit.kitFor(m.role, m.tools), dir));
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
    // The project's own keys and settings (never a .env file in the worktree).
    ...projenv.forRuns(m.project),
    ...runEnv(m),
    ...(process.platform === 'win32' ? { Path: PATH, PATH } : {}),
    ATELIER_TASK: m.id || '',
    ATELIER_ROLE: m.role || '',
    ATELIER_PROJECT: m.project || '',
    ATELIER_FILES: m.files || '',
    ATELIER_ITER: String(iteration),
    ATELIER_ROOT: root,
    ATELIER_RUN_DIR: dir || '',
    // The lead's approval for paid runs on this task (what, up to what cost); empty means none.
    ATELIER_PAID: m.paid || '',
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
  const list = docs.length ? `Planning docs in this repo (read the ones relevant to your task; approved ones are frozen):\n${docs.map(d => `- \`${d}\``).join('\n')}` : 'This repo has no atelier planning docs yet.';
  return [list, tasteSection(worktree)].filter(Boolean).join('\n\n');
}

// The owner's standing taste (atelier/TASTE.md, kept by the lead from the owner's feedback), in full in every
// brief: the same notes kept coming back round after round when they lived only in one task's goal (review, 10 Nov).
function tasteSection(worktree) {
  let text = '';
  try { text = fs.readFileSync(path.join(worktree, 'atelier', 'TASTE.md'), 'utf8').trim(); } catch { return ''; }
  if (!text) return '';
  if (text.length > 8000) text = `${text.slice(0, 8000)}\n\n(cut here: read the rest in atelier/TASTE.md)`;
  return `## The owner's taste: this must hold in everything you make\n\nThe owner said these themselves, often more than once. Work that breaks one is sent back, whatever else it gets right. If your task seems to need breaking one, stop and say so in the progress log instead.\n\n${text}`;
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

// Which long check a finished task is in, for the board and the Office (the check blocks the runner, so its heartbeat
// stops meanwhile and the task otherwise looks stuck).
function gate(id, what) {
  safe(() => cards.update(id, { gate: what, gate_at: what ? new Date().toISOString() : '', heartbeat: new Date().toISOString() }));
}

// Settings a project's task runs and checks always get, set with `atelier project runenv`. For example
// voice-assistant's STT_PRIORITY=normal: its speech code raises its own process above normal priority, which is
// right for the owner's live Tuesday but let a 10-minute test suite starve the owner's desktop (26 Nov).
export const runEnv = m => (m?.project && project.tryLoad(m.project)?.runEnv) || {};

export function runCheck(command, cwd, timeoutMin, extraEnv = {}) {
  const r = spawnSync(command, { cwd, shell: true, encoding: 'utf8', windowsHide: true, timeout: timeoutMin * 60_000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, ...extraEnv } });
  const all = `${r.stdout || ''}${r.stderr || ''}`.trim();
  return { ok: r.status === 0, code: r.status ?? 'timeout', tail: all.split('\n').slice(-60).join('\n') };
}

// Asked again every minute, so raising the ceiling, a window resetting or usage catching up ends the hold right away.
export async function pace(id, log, everyMs = 60_000) {
  let until = limits.waitUntil();
  if (!until) return;
  log(`pacing: plan window nearly full, waiting until ${new Date(until * 1000).toISOString()}`);
  const reason = 'paced: plan window nearly full';
  safe(() => cards.update(id, { reason: `${reason}, resumes ${new Date(until * 1000).toLocaleTimeString()}` }));
  events.emit(id, 'paced', reason);
  while ((until = limits.waitUntil())) {
    await sleep(everyMs);
    safe(() => cards.update(id, { heartbeat: now() }));
  }
  safe(() => cards.update(id, { reason: '' }));
  log('pacing: over, carrying on');
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

// The first sentence or line of a blocked agent's final message, as a one-line reason.
function blockerSummary(text) {
  const t = String(text || '').replace(/ATELIER_STATUS:.*$/m, '').replace(/[*_`#>]/g, '').trim();
  const first = (t.split(/\n\s*\n/)[0] || t).replace(/\s+/g, ' ').trim();
  const sentence = (first.match(/^.*?[.!?](\s|$)/) || [first])[0].trim();
  return (sentence || 'no reason given').slice(0, 220);
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

// ---------- locks ----------
// A lock file holds its owner's pid and counts for as long as that process lives, however slow it is. The age
// limit only covers Windows reusing a dead owner's pid. A runner can block for a long check, so its limit is long.
const RUNNER_LOCK_MAX_MS = 2 * 3600_000;
const runnerLock = id => path.join(runDir(id), 'runner.lock');

function readLock(file) {
  try { return Number(fs.readFileSync(file, 'utf8').trim()) || 0; } catch { return 0; }
}

function lockHolder(file, maxAgeMs) {
  const pid = readLock(file);
  if (!pid || !alive(pid)) return 0;
  try { return Date.now() - fs.statSync(file).mtimeMs < maxAgeMs ? pid : 0; } catch { return 0; }
}

// Atomic: the pid is already in the file when it appears, so nobody ever reads an empty lock.
export function takeLock(file, maxAgeMs) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, String(process.pid));
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { fs.linkSync(tmp, file); return true; } catch { /* taken, or left behind */ }
      if (lockHolder(file, maxAgeMs) || !clearDeadLock(file, maxAgeMs)) return false;
    }
    return false;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// Only one process at a time may clear a dead lock; otherwise a second one could delete the new owner's.
function clearDeadLock(file, maxAgeMs) {
  const guard = `${file}.clearing`;
  try { fs.mkdirSync(guard); } catch {
    safe(() => { if (Date.now() - fs.statSync(guard).mtimeMs > 30_000) fs.rmdirSync(guard); });
    return false;
  }
  try {
    if (lockHolder(file, maxAgeMs)) return false;
    fs.rmSync(file, { force: true });
    return true;
  } catch { return false; } finally {
    safe(() => fs.rmdirSync(guard));
  }
}

export function dropLock(file) {
  safe(() => { if (readLock(file) === process.pid) fs.rmSync(file, { force: true }); });
}

// The live runner of a task, or 0. The card's pid can't answer this: on Windows it starts as the launcher's.
export function runnerPid(id) {
  return lockHolder(runnerLock(id), RUNNER_LOCK_MAX_MS);
}

// Who to stop for a task: its real runner when one holds the lock, else whatever the card knows.
export function stopRunner(m) {
  const pid = runnerPid(m.id) || (alive(m.pid) ? m.pid : 0);
  if (pid) killTree(pid);
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
