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
  const branch = meta.branch || `crew/${meta.id}`;
  const wt = meta.worktree || path.join(paths.worktrees, meta.id);
  if (fs.existsSync(path.join(wt, '.git'))) return { branch, worktree: wt };
  must(meta.repo, 'rev-parse', '--git-dir');
  const exists = git(meta.repo, 'rev-parse', '--verify', '--quiet', `refs/heads/${branch}`).ok;
  if (exists) must(meta.repo, 'worktree', 'add', wt, branch);
  else must(meta.repo, 'worktree', 'add', '-b', branch, wt, meta.base || 'main');
  return { branch, worktree: wt };
}

export function head(wt) {
  return git(wt, 'rev-parse', 'HEAD').out;
}

// Safety net: whatever the agent left uncommitted becomes a commit, so no iteration's work is lost.
export function commitIfDirty(wt, message) {
  if (!git(wt, 'status', '--porcelain').out) return false;
  must(wt, 'add', '-A');
  must(wt, 'commit', '-m', message, '--no-verify');
  return true;
}

export function commitsAhead(wt, base) {
  const r = git(wt, 'rev-list', '--count', `${base}..HEAD`);
  return r.ok ? Number(r.out) : 0;
}

export function hasRemote(wt) {
  return git(wt, 'remote', 'get-url', 'origin').ok;
}
