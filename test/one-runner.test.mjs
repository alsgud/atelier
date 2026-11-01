// One task, one live runner. Runs the real CLI in a throwaway ATELIER_HOME. ATELIER_CLAUDE points at nothing,
// so no agent ever starts: a runner's slow part here is the card's check command.
//   node --test test/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'atelier.mjs');
const SLOW_CHECK = `"${process.execPath}" -e "setTimeout(()=>{},4000)"`;
let root, home, repo;
const env = () => ({ ...process.env, ATELIER_HOME: home, ATELIER_CLAUDE: path.join(root, 'no-such-claude'), ATELIER_NO_TICK: '1', ATELIER_ROLE: '' });
const cli = (...args) => spawnSync(process.execPath, [CLI, ...args], { env: env(), encoding: 'utf8', windowsHide: true, timeout: 60_000 });
const start = (...args) => spawn(process.execPath, [CLI, ...args], { env: env(), windowsHide: true, stdio: 'ignore' });
const exited = child => new Promise(r => child.on('close', r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const git = (...a) => spawnSync('git', a, { cwd: repo, encoding: 'utf8', windowsHide: true });
// Runners start a tick of their own as they exit; wait for any of those to finish first.
function tickNow() {
  for (let i = 0; i < 100; i++) {
    const r = cli('tick');
    if (!/another tick is running/.test(r.stdout)) return r;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
  throw new Error('tick never got its turn');
}
const waitTickFree = () => { const lock = path.join(home, 'tick.lock'); for (let i = 0; i < 100 && fs.existsSync(lock); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); };

function card(id, fields = {}) {
  const meta = { id, title: id, status: 'queued', repo, base: 'main', autonomy: 'branch', where: 'local', check: SLOW_CHECK, iterations: 1, hours: 1, ...fields };
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n');
  fs.writeFileSync(path.join(home, 'board', `${id}.md`), `---\n${lines}\n---\n\ngoal\n`);
}
const field = (id, key) => fs.readFileSync(path.join(home, 'board', `${id}.md`), 'utf8').match(new RegExp(`^${key}: (.*)$`, 'm'))?.[1]?.trim();
const starts = id => {
  const f = path.join(home, 'events.jsonl');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(l => l.includes(`"id":"${id}"`) && l.includes('"type":"started"')).length : 0;
};
const lockFile = id => { const d = path.join(home, 'runs', id); fs.mkdirSync(d, { recursive: true }); return path.join(d, 'runner.lock'); };
const isAlive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-one-runner-'));
  home = path.join(root, 'home');
  repo = path.join(root, 'repo');
  for (const d of ['board', 'runs', 'worktrees', 'lessons', 'foreman']) fs.mkdirSync(path.join(home, d), { recursive: true });
  fs.mkdirSync(repo);
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
  git('add', '.');
  git('commit', '-qm', 'first');
});

after(() => { try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); } catch { /* a detached tick may still hold a file */ } });

test('two copies started together: exactly one runs', async () => {
  // The worktree exists first, as on a resume: otherwise `git worktree add` fails the extra copies by accident.
  card('dup1');
  await exited(start('run', 'dup1'));
  card('dup1');
  await Promise.all([exited(start('run', 'dup1')), exited(start('run', 'dup1')), exited(start('run', 'dup1'))]);
  assert.equal(starts('dup1'), 2);
});

test('a copy started while one is running exits at once and leaves the card alone', async () => {
  card('dup2');
  const first = start('run', 'dup2');
  while (!starts('dup2')) await sleep(100);
  const r = cli('run', 'dup2');
  assert.equal(r.status, 0);
  assert.equal(starts('dup2'), 1);
  assert.equal(field('dup2', 'pid'), String(first.pid));
  await exited(first);
});

test('the lock is released when the runner ends, so the task can run again', async () => {
  card('again');
  await exited(start('run', 'again'));
  assert.equal(fs.existsSync(lockFile('again')), false);
  card('again');
  await exited(start('run', 'again'));
  assert.equal(starts('again'), 2);
});

test('a lock left by a dead runner does not block the task', async () => {
  card('dead');
  const gone = spawnSync(process.execPath, ['-p', 'process.pid'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
  fs.writeFileSync(lockFile('dead'), gone);
  await exited(start('run', 'dead'));
  assert.equal(starts('dead'), 1);
});

test('a copy that lost its lock stops at the next iteration without touching the card', async () => {
  card('lost', { iterations: 5 });
  const runner = start('run', 'lost');
  while (!starts('lost')) await sleep(100);
  fs.writeFileSync(lockFile('lost'), String(process.pid));
  await exited(runner);
  assert.equal(field('lost', 'status'), 'running');
  assert.equal(fs.readFileSync(lockFile('lost'), 'utf8'), String(process.pid));
});

test('a stopped task stays stopped when its late runner finally starts', async () => {
  card('late', { status: 'paused', reason: 'stopped by the lead' });
  await exited(start('run', 'late'));
  assert.equal(starts('late'), 0);
  assert.equal(field('late', 'status'), 'paused');
});

test('tick: a queued task whose runner is alive is adopted, not started again', () => {
  card('adopt');
  fs.writeFileSync(lockFile('adopt'), String(process.pid));
  tickNow();
  assert.equal(field('adopt', 'status'), 'running');
  assert.equal(field('adopt', 'pid'), String(process.pid));
  assert.equal(starts('adopt'), 0);
  fs.rmSync(lockFile('adopt'));
  card('adopt', { status: 'done' });
});

test('tick: a dead pid on the card with a live runner is corrected, not marked stalled', () => {
  const old = new Date(Date.now() - 10 * 60_000).toISOString();
  card('hop', { status: 'running', pid: 999999, heartbeat: old, updated: old });
  fs.writeFileSync(lockFile('hop'), String(process.pid));
  tickNow();
  assert.equal(field('hop', 'status'), 'running');
  assert.equal(field('hop', 'pid'), String(process.pid));
  fs.rmSync(lockFile('hop'));
  card('hop', { status: 'done' });
});

test('tick: a slow tick keeps its lock past a minute while it is alive', () => {
  const lock = path.join(home, 'tick.lock');
  waitTickFree();
  fs.writeFileSync(lock, String(process.pid));
  const old = new Date(Date.now() - 2 * 60_000);
  fs.utimesSync(lock, old, old);
  assert.match(cli('tick').stdout, /another tick is running/);
  assert.equal(fs.readFileSync(lock, 'utf8'), String(process.pid));
  fs.rmSync(lock);
});

test('tick: a lock left by a dead tick is taken over', () => {
  const lock = path.join(home, 'tick.lock');
  const gone = spawnSync(process.execPath, ['-p', 'process.pid'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
  waitTickFree();
  fs.writeFileSync(lock, gone);
  assert.doesNotMatch(cli('tick').stdout, /another tick is running/);
  assert.equal(fs.existsSync(lock), false);
});

test('stop ends the real runner even when the card only knows a dead pid', async () => {
  const sleeper = spawn(process.execPath, ['-e', 'setTimeout(()=>{},60000)'], { windowsHide: true, stdio: 'ignore' });
  await sleep(300);
  card('halt', { status: 'running', pid: 999999, heartbeat: new Date().toISOString() });
  fs.writeFileSync(lockFile('halt'), String(sleeper.pid));
  const t0 = Date.now();
  cli('stop', 'halt');
  await exited(sleeper);
  assert.ok(Date.now() - t0 < 30_000, 'the runner was ended, not left to finish');
  assert.equal(isAlive(sleeper.pid), false);
  assert.equal(field('halt', 'status'), 'paused');
});
