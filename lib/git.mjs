import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './home.mjs';

export function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

export function must(cwd, ...args) {
  const r = git(cwd, ...args);
  if (!r.ok) throw new Error(`git ${args.join(' ')} failed: ${r.err || r.out}`);
  return r.out;
}

// Each task gets its own worktree on its own branch, so parallel runners never share files.
export function ensureWorktree(meta) {
  const branch = meta.branch || `atelier/${meta.id}`;
  const wt = meta.worktree || path.join(paths.worktrees, meta.id);
  if (fs.existsSync(path.join(wt, '.git'))) return { branch, worktree: wt };
  must(meta.repo, 'rev-parse', '--git-dir');
  const exists = git(meta.repo, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`).ok;
  if (exists) must(meta.repo, 'worktree', 'add', wt, branch);
  else must(meta.repo, 'worktree', 'add', '-b', branch, wt, meta.base || 'main');
  mergeBases(wt, meta.base || 'main');
  return { branch, worktree: wt };
}

// Base lives in two places: the local branch (the lead's committed planning docs) and origin's
// (PRs merged on GitHub, work pushed by merge-mode runners). Bring whichever is missing into the
// task branch, without touching the main checkout. Returns the refs merged, or throws on conflict.
export function mergeBases(wt, base) {
  const merged = [];
  for (const ref of [base, remoteBase(wt, base), checkoutBranch(wt, base)].filter(Boolean)) {
    if (git(wt, 'merge-base', '--is-ancestor', ref, 'HEAD').ok) continue;
    const r = git(wt, 'merge', '--no-edit', ref);
    if (!r.ok) { git(wt, 'merge', '--abort'); throw new Error(`merging ${ref} conflicted`); }
    merged.push(ref);
  }
  return merged;
}

// When a project integrates on its own branch (say v2) while the main checkout stays on main (where the
// lead commits planning docs and the live app runs), tasks also take in that branch, so they see the
// planning docs and keep up with live fixes. Null when the checkout is on the base itself.
export function checkoutBranch(wt, base) {
  const common = git(wt, 'rev-parse', '--path-format=absolute', '--git-common-dir').out;
  if (!common) return null;
  const main = path.dirname(common);
  const branch = git(main, 'symbolic-ref', '--short', 'HEAD').out;
  return branch && branch !== base ? branch : null;
}

export function remoteBase(cwd, base) {
  if (!hasRemote(cwd)) return null;
  git(cwd, 'fetch', '-q', 'origin', base);
  return git(cwd, 'rev-parse', '--verify', '--quiet', `refs/remotes/origin/${base}`).ok ? `origin/${base}` : null;
}

// Commits the task itself made: on HEAD but on neither copy of base.
export function taskCommits(wt, base) {
  const r = git(wt, 'rev-list', '--count', 'HEAD', `^${base}`, ...[remoteBase(wt, base)].filter(Boolean).map(x => `^${x}`));
  return r.ok ? Number(r.out) : 0;
}

export function head(wt) {
  return git(wt, 'rev-parse', 'HEAD').out;
}

// Safety net: whatever the agent left uncommitted becomes a commit, so no iteration's work is lost.
export function commitIfDirty(wt, message) {
  if (!git(wt, 'status', '--porcelain').out) return false;
  must(wt, 'add', '-A');
  // Files can vanish between the status check and staging (a build still writing or cleaning up), so
  // "dirty" may stage nothing. That's not a failure; neither is a commit that finds nothing to do.
  if (git(wt, 'diff', '--cached', '--quiet').ok) return false;
  const r = git(wt, 'commit', '-m', message, '--no-verify');
  if (!r.ok && /nothing to commit|no changes added/i.test(`${r.out}\n${r.err}`)) return false;
  if (!r.ok) throw new Error(`git commit failed: ${r.err || r.out}`);
  return true;
}

export function commitsAhead(wt, base) {
  const r = git(wt, 'rev-list', '--count', `${base}..HEAD`);
  return r.ok ? Number(r.out) : 0;
}

export function hasRemote(wt) {
  return git(wt, 'remote', 'get-url', 'origin').ok;
}
