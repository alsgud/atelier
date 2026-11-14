// Test commands that already passed on exactly this code don't run again. A finished task used to sit through the
// same ~10-minute suite four times (as an acceptance check and as the full suite, then both again after a cheap gate
// sent it back) on code that never changed, while it looked stuck (14 Nov: 40 minutes of checks after 2 minutes of
// work). Keyed by the commit's tree (identical files, in any worktree) and the exact command; only passes are kept.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { HOME } from './home.mjs';

const FILE = path.join(HOME, 'passed.json');
const KEEP_MS = 3 * 86400_000, MAX = 400;

const git = (cwd, ...args) => spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });

// The tree of what's checked out, or null when tracked files have uncommitted changes (then nothing is cached).
export function treeOf(cwd) {
  const t = git(cwd, 'rev-parse', 'HEAD^{tree}');
  if (t.status !== 0) return null;
  const dirty = git(cwd, 'status', '--porcelain', '--untracked-files=no');
  return dirty.status === 0 && !dirty.stdout.trim() ? t.stdout.trim() : null;
}

const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const keyOf = (tree, cmd) => `${tree} ${String(cmd).trim()}`;

export function passedAt(cwd, cmd) {
  const tree = treeOf(cwd);
  if (!tree) return null;
  const at = load()[keyOf(tree, cmd)];
  return at && Date.now() - Date.parse(at) < KEEP_MS ? at : null;
}

export function remember(cwd, cmd) {
  const tree = treeOf(cwd);
  if (!tree) return;
  const all = load();
  all[keyOf(tree, cmd)] = new Date().toISOString();
  const kept = Object.entries(all).filter(([, at]) => Date.now() - Date.parse(at) < KEEP_MS).sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX);
  fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(kept)));
}

// run() returns { ok, code, tail }; a pass on identical code comes back without running anything.
export function once(cmd, cwd, run) {
  const at = passedAt(cwd, cmd);
  if (at) return { ok: true, code: 0, cached: at, tail: `passed already on exactly this code at ${new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}; not run again` };
  const r = run();
  if (r.ok) remember(cwd, cmd);
  return r;
}
