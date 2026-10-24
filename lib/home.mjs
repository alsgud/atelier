// Where atelier keeps its state, and its config with defaults filled in.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOME = process.env.ATELIER_HOME || path.join(os.homedir(), '.atelier');
export const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const paths = {
  board: path.join(HOME, 'board'),
  runs: path.join(HOME, 'runs'),
  worktrees: path.join(HOME, 'worktrees'),
  lessons: path.join(HOME, 'lessons'),
  foreman: path.join(HOME, 'foreman'),
  config: path.join(HOME, 'config.json'),
  repos: path.join(HOME, 'repos.json'),
  limits: path.join(HOME, 'limits.json'),
  events: path.join(HOME, 'events.jsonl'),
  eventsSeen: path.join(HOME, 'events.seen'),
  tickLock: path.join(HOME, 'tick.lock'),
};

const DEFAULTS = {
  maxParallel: 3,
  // Pause runners when a plan window is this full (percent), resume after it resets.
  // Plan limits are shared with the owner's own Claude use: Atelier stops at these percentages, and with
  // `spread` it also keeps its weekly use on an even pace so it can't spend the week early.
  pace: { fiveHour: 70, sevenDay: 75, spread: true },
  iterationTimeoutMin: 45,
  checkTimeoutMin: 15,
  stallAfterNoChange: 3,
  defaults: { iterations: 10, hours: 3, autonomy: 'pr', where: 'local', base: 'main', permission: 'auto' },
  // Tools no atelier agent may use. The runner pushes and opens PRs itself.
  deny: [
    'Bash(git push *)', 'Bash(git push)', 'PowerShell(git push *)',
    'Bash(gh pr merge *)', 'PowerShell(gh pr merge *)',
    'Bash(git reset --hard *)', 'Bash(git clean *)',
    'Bash(vercel *)', 'Bash(npm publish *)',
  ],
};

export function ensureHome() {
  for (const p of [HOME, paths.board, paths.runs, paths.worktrees, paths.lessons, paths.foreman]) {
    fs.mkdirSync(p, { recursive: true });
  }
  if (!fs.existsSync(paths.config)) writeJson(paths.config, DEFAULTS);
  if (!fs.existsSync(paths.repos)) writeJson(paths.repos, {});
}

export function config() {
  const user = readJson(paths.config, {});
  return {
    ...DEFAULTS, ...user,
    pace: { ...DEFAULTS.pace, ...user.pace },
    defaults: { ...DEFAULTS.defaults, ...user.defaults },
  };
}

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

export function runDir(id) {
  const dir = path.join(paths.runs, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveRepo(nameOrPath) {
  const repos = readJson(paths.repos, {});
  if (repos[nameOrPath]) return repos[nameOrPath];
  const abs = path.resolve(nameOrPath);
  if (fs.existsSync(abs)) return abs;
  throw new Error(`Unknown repo "${nameOrPath}". Add it with: atelier repo add <alias> <path>`);
}

export function repoAlias(repoPath) {
  const repos = readJson(paths.repos, {});
  const hit = Object.entries(repos).find(([, p]) => path.resolve(p) === path.resolve(repoPath));
  return hit ? hit[0] : path.basename(repoPath);
}
