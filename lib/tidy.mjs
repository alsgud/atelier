// Tidying up after tasks, so finished work doesn't pile up on the PC and on GitHub (the Tuesday review, 26 Nov,
// found ~450 merged branches and worktrees, likely over 125 GB, and a visualiser repo past 1 GB of screenshots).
//   pass():        once a task has landed, remove its worktree, its local branch and its GitHub branch. A
//                  cancelled task's tip is kept as the tag archive/<id> first. Other failures are left alone:
//                  they may be extended.
//   keepMediaOut(): proof screenshots and recordings stay out of git. The repo's own exclude list skips them, and
//                  each iteration copies them to the task's run folder, where the owner and the reviewer see them.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { HOME, paths } from './home.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as gitx from './git.mjs';
import * as project from './project.mjs';

const STATE = path.join(HOME, 'tidy.json');
const GRACE = 30 * 60_000; // the lead and the owner may still look at a task's worktree right after it lands
const PER_PASS = 6;        // removing a worktree with its node_modules or venv can take a while

// Network calls get a timeout and no credential prompts, so a pass can't hang.
function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 120_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || r.error?.message || '').trim() };
}
const has = (repo, ref) => git(repo, 'rev-parse', '--verify', '--quiet', ref).ok;
const isAncestor = (repo, a, b) => git(repo, 'merge-base', '--is-ancestor', a, b).ok;
// The sync process runs every 90 seconds and a pass can take longer: one pass at a time.
const LOCK = path.join(HOME, 'tidy.lock');
function lock(retry = true) {
  try { const fd = fs.openSync(LOCK, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); return true; } catch {
    try { if (retry && Date.now() - fs.statSync(LOCK).mtimeMs > 20 * 60_000) { fs.rmSync(LOCK, { force: true }); return lock(false); } } catch { /* gone meanwhile */ }
    return false;
  }
}
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } };
const writeState = s => { const tmp = `${STATE}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(s, null, 1)); fs.renameSync(tmp, STATE); };

// Only tasks finished after tidying was switched on are tidied by the tick: the backlog from before is the owner's
// call (`atelier tidy --all`), since it deletes hundreds of branches on GitHub at once.
export function since() {
  const s = readState();
  if (s.since) return s.since;
  s.since = new Date().toISOString();
  writeState(s);
  return s.since;
}

const cancelled = m => m.status === 'failed' && /^cancelled\b/.test(m.reason || '');

// What tidying a task would do, without doing it. Null when there's nothing to do (yet).
// Tidied tasks are remembered in tidy.json by their card's last change, not on the card: writing the card would
// move its date, and the journal and the board go by that date.
export function plan(m, { now = Date.now(), tidied = readState().tidied || {}, inUse = new Set() } = {}) {
  if (!m.repo || !m.branch || tidied[m.id] === m.updated) return null;
  if (m.status !== 'done' && !cancelled(m)) return null;
  if (now - Date.parse(m.updated || 0) < GRACE) return null;
  // Another unfinished task builds on this branch: it stays until that one is finished too.
  if (inUse.has(`${m.repo}|${m.branch}`)) return { m, steps: [], skip: `an unfinished task builds on ${m.branch}` };
  if (!fs.existsSync(m.repo)) return null;
  const base = m.base || 'main';
  const local = has(m.repo, `refs/heads/${m.branch}`);
  // Projects that keep everything on this PC (branch autonomy, or closed) never have GitHub touched.
  const p = m.project ? project.tryLoad(m.project) : null;
  const offline = p?.autonomy === 'branch' || !!p?.closed;
  const remote = !offline && has(m.repo, `refs/remotes/origin/${m.branch}`);
  const wt = m.worktree && fs.existsSync(m.worktree) ? m.worktree : '';
  if (!local && !remote && !wt) return { m, steps: [] };
  // A landed branch must really be in base (here or on GitHub) before its name goes. A PR squash-merged on GitHub
  // isn't an ancestor, so a merged PR counts too.
  const inBase = ref => isAncestor(m.repo, ref, base) || (has(m.repo, `refs/remotes/origin/${base}`) && isAncestor(m.repo, ref, `origin/${base}`));
  const prMerged = /^PR merged/.test(m.reason || '');
  const steps = [];
  if (wt) {
    const dirty = git(wt, 'status', '--porcelain', '--untracked-files=no').out;
    if (dirty) return { m, steps: [], skip: `its worktree has uncommitted changes (${wt})` };
    steps.push(['worktree', wt]);
  }
  if (cancelled(m)) {
    const tip = local ? `refs/heads/${m.branch}` : remote ? `refs/remotes/origin/${m.branch}` : '';
    if (tip && !has(m.repo, `refs/tags/archive/${m.id}`)) steps.push(['tag', tip]);
    if (local) steps.push(['branch', m.branch]);
    if (remote) steps.push(['remote', m.branch]);
  } else {
    if (local) { if (!inBase(`refs/heads/${m.branch}`) && !prMerged) return { m, steps: [], skip: `${m.branch} isn't in ${base}` }; steps.push(['branch', m.branch]); }
    if (remote) { if (!inBase(`refs/remotes/origin/${m.branch}`) && !prMerged) return { m, steps: [], skip: `origin/${m.branch} isn't in ${base}` }; steps.push(['remote', m.branch]); }
  }
  return { m, steps, offline };
}

function removeWorktree(repo, wt) {
  if (git(repo, 'worktree', 'remove', '--force', wt).ok) return true;
  // Long node_modules paths and read-only files can defeat git on Windows: delete the folder, then let git forget it.
  try { fs.rmSync(wt, { recursive: true, force: true, maxRetries: 3 }); } catch { return false; }
  git(repo, 'worktree', 'prune');
  return !fs.existsSync(wt);
}

// Carries out a plan. GitHub deletions are batched per repo by the caller (one push for many branches).
function apply({ m, steps, offline }, remoteDeletes) {
  const done = [];
  for (const [what, arg] of steps) {
    if (what === 'worktree') { if (!removeWorktree(m.repo, arg)) return { done, failed: `couldn't remove ${arg} (a program may have a file open)` }; done.push('worktree'); }
    if (what === 'tag') {
      if (!git(m.repo, 'tag', `archive/${m.id}`, arg).ok) return { done, failed: 'tagging the tip failed' };
      done.push(`tag archive/${m.id}`);
      if (!offline && git(m.repo, 'remote', 'get-url', 'origin').ok) remoteDeletes.tags.set(m.repo, [...(remoteDeletes.tags.get(m.repo) || []), `archive/${m.id}`]);
    }
    if (what === 'branch') { if (!git(m.repo, 'branch', '-D', arg).ok) return { done, failed: `deleting ${arg} failed` }; done.push('branch'); }
    if (what === 'remote') { remoteDeletes.branches.set(m.repo, [...(remoteDeletes.branches.get(m.repo) || []), arg]); done.push('GitHub branch'); }
  }
  return { done };
}

function pushDeletes(remoteDeletes) {
  const problems = [];
  for (const [repo, tags] of remoteDeletes.tags) {
    for (let i = 0; i < tags.length; i += 50) {
      const r = git(repo, 'push', '-q', 'origin', ...tags.slice(i, i + 50).map(t => `refs/tags/${t}:refs/tags/${t}`));
      if (!r.ok) problems.push(`${path.basename(repo)}: pushing archive tags failed: ${r.err.split('\n').pop()}`);
    }
  }
  for (const [repo, branches] of remoteDeletes.branches) {
    for (let i = 0; i < branches.length; i += 50) {
      const r = git(repo, 'push', '-q', 'origin', '--delete', ...branches.slice(i, i + 50));
      if (!r.ok) problems.push(`${path.basename(repo)}: deleting branches on GitHub failed: ${r.err.split('\n').pop()}`);
    }
  }
  return problems;
}

// One tidying pass. all: include tasks finished before tidying was switched on. dryRun: report only.
export function pass({ all = false, dryRun = false, limit = all ? Infinity : PER_PASS, log = () => {} } = {}) {
  const cutoff = since();
  const known = readState().tidied || {};
  const list = cards.all();
  const inUse = new Set(list.filter(c => !['done', 'failed'].includes(c.meta.status) && c.meta.base).map(c => `${c.meta.repo}|${c.meta.base}`));
  const plans = [];
  for (const c of list) {
    const m = c.meta;
    if (!all && String(m.updated || '') < cutoff) continue;
    const p = plan(m, { tidied: known, inUse });
    if (p) plans.push(p);
  }
  const work = plans.filter(p => p.steps.length);
  if (dryRun) return { plans, work, tidied: [] };
  if (!lock()) return { plans, work, tidied: [], busy: true };
  try { return run(plans, work, limit, log); } finally { fs.rmSync(LOCK, { force: true }); }
}

function run(plans, work, limit, log) {
  const remoteDeletes = { branches: new Map(), tags: new Map() };
  const tidied = [];
  for (const p of work.slice(0, limit)) {
    const r = apply(p, remoteDeletes);
    if (r.failed) { log(`${p.m.id}: ${r.failed}`); continue; }
    tidied.push(p.m.id);
  }
  const problems = pushDeletes(remoteDeletes);
  for (const x of problems) log(x);
  // Mark the tasks tidied (and the ones with nothing left to do), so later passes skip them without running git.
  const finished = new Set([...tidied, ...plans.filter(p => !p.steps.length && !p.skip).map(p => p.m.id)]);
  if (finished.size) {
    const s = readState();
    s.tidied ||= {};
    for (const p of plans) if (finished.has(p.m.id)) s.tidied[p.m.id] = p.m.updated;
    writeState(s);
  }
  for (const repo of new Set(work.slice(0, limit).map(p => p.m.repo))) git(repo, 'worktree', 'prune');
  if (tidied.length) events.emit('atelier', 'tidied', `cleaned up after ${tidied.length} finished task(s): worktrees and merged branches removed`);
  return { plans, work, tidied, problems };
}

// ---------- proof media ----------
const MEDIA = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'webm', 'mp4', 'mov', 'wav', 'mp3'];
const PROOF_DIRS = ['review', 'proof', 'screenshots', 'shots', 'evidence'];
const MARK = '# atelier: proof screenshots and recordings stay out of git; each task copies them to its run folder';
export const EXCLUDES = [MARK, ...PROOF_DIRS.flatMap(d => MEDIA.map(e => `atelier/**/${d}/**/*.${e}`)), '# atelier: end'];
const PROOF = new RegExp(`^atelier/(?:.+/)?(?:${PROOF_DIRS.join('|')})/.+\\.(?:${MEDIA.join('|')})$`, 'i');
export const isProofMedia = f => PROOF.test(f.replace(/\\/g, '/'));

// The repo's own exclude list (.git/info/exclude: never committed, shared by every worktree of the repo).
export function ensureExcludes(repo) {
  const common = gitx.git(repo, 'rev-parse', '--path-format=absolute', '--git-common-dir').out;
  if (!common) return false;
  const file = path.join(common, 'info', 'exclude');
  let text = ''; try { text = fs.readFileSync(file, 'utf8'); } catch { /* none yet */ }
  if (text.includes(MARK)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${text.replace(/\s*$/, text ? '\n\n' : '')}${EXCLUDES.join('\n')}\n`);
  return true;
}

// After each iteration: copy proof media the exclude list kept out of git into the run folder, and move any that
// was committed anyway (git add -f) out of the task's commits. Returns the files moved out of git.
export function keepMediaOut(m, wt, before, dir, log = () => {}) {
  const dest = f => path.join(dir, 'evidence', 'from-worktree', f);
  const ignored = gitx.git(wt, 'ls-files', '--others', '--ignored', '--exclude-standard', '--', 'atelier').out.split('\n').map(s => s.trim()).filter(isProofMedia);
  for (const f of ignored) {
    const to = dest(f);
    try { if (fs.existsSync(to) && fs.statSync(to).mtimeMs >= fs.statSync(path.join(wt, f)).mtimeMs) continue; } catch { continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(path.join(wt, f), to, { preserveTimestamps: true });
  }
  const base = m.base || 'main';
  const notBase = [base, gitx.remoteBase(wt, base)].filter(Boolean);
  const added = gitx.git(wt, 'log', '--no-merges', '--diff-filter=A', '--format=', '--name-only', `${before}..HEAD`, '--not', ...notBase).out
    .split('\n').map(s => s.trim()).filter(f => f && isProofMedia(f) && fs.existsSync(path.join(wt, f)));
  if (!added.length) return [];
  for (const f of added) { fs.mkdirSync(path.dirname(dest(f)), { recursive: true }); fs.cpSync(path.join(wt, f), dest(f), { preserveTimestamps: true }); }
  gitx.git(wt, 'rm', '-q', '--cached', '--', ...added);
  gitx.git(wt, 'commit', '-q', '--no-verify', '-m', `atelier(${m.id}): keep proof media out of git (copied to the run folder)`);
  log(`moved ${added.length} proof file(s) out of git into ${path.join(dir, 'evidence', 'from-worktree')}`);
  events.emit(m.id, 'media', `${added.length} proof screenshot(s) or recording(s) kept out of git; they're in the run folder`);
  return added;
}
