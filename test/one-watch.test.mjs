// One watch per project. Runs the real CLI in a throwaway ATELIER_HOME; no agent ever starts. The alias carries
// this test's pid, because the sweep for old copies goes by alias and must never reach a real project's watch.
//   node --test "test/*.test.mjs"
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'atelier.mjs');
const ALIAS = `watchtest${process.pid}`;
let root, home;
const children = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isAlive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const lockFile = () => path.join(home, 'projects', ALIAS, 'watch.lock');
async function until(what, cond, ms = 20_000) {
  const t0 = Date.now();
  while (!cond()) {
    assert.ok(Date.now() - t0 < ms, `timed out waiting for: ${what}`);
    await sleep(100);
  }
}
function track(child) {
  children.push(child);
  child.done = false;
  child.on('close', () => { child.done = true; });
  return child;
}
// stdout is a pipe, as under Monitor. Resolves once the copy has started and holds the lock.
async function watch() {
  const child = track(spawn(process.execPath, [CLI, 'watch', ALIAS], { env: { ...process.env, ATELIER_HOME: home, ATELIER_NO_TICK: '1' }, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }));
  child.out = '';
  child.stdout.on('data', d => { child.out += d; });
  await until('the watch to start', () => /^watching /.test(child.out));
  return child;
}
const event = (type, msg) => fs.appendFileSync(path.join(home, 'events.jsonl'), JSON.stringify({ ts: new Date().toISOString(), id: ALIAS, type, msg }) + '\n');

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-one-watch-'));
  home = path.join(root, 'home');
  fs.mkdirSync(path.join(home, 'projects'), { recursive: true });
  fs.mkdirSync(path.join(home, 'board'));
  fs.writeFileSync(path.join(home, 'projects', `${ALIAS}.json`), JSON.stringify({ alias: ALIAS, repo: root }));
});

after(() => {
  for (const c of children) if (!c.done) c.kill();
  try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); } catch { /* a copy may still hold a file */ }
});

test('re-arming leaves one watch: each new copy ends the one before', async () => {
  const first = await watch();
  const second = await watch();
  await until('the first copy to exit', () => first.done);
  const third = await watch();
  await until('the second copy to exit', () => second.done);
  assert.equal(third.done, false);
  assert.equal(fs.readFileSync(lockFile(), 'utf8'), String(third.pid));
  event('owner-note', 'reaches the live copy');
  await until('the live copy to print the event', () => /reaches the live copy/.test(third.out));
  third.kill();
  await until('the last copy to exit', () => third.done);
});

test('copies started together settle on one', async () => {
  const copies = await Promise.all([watch(), watch(), watch()]);
  await until('all but one to exit', () => copies.filter(c => !c.done).length === 1);
  const [live] = copies.filter(c => !c.done);
  await sleep(4500);
  assert.equal(live.done, false, 'the survivor stays up');
  live.kill();
  await until('the last copy to exit', () => live.done);
});

test('a lock left by a dead copy does not stop a new one', async () => {
  fs.writeFileSync(lockFile(), '999999');
  const w = await watch();
  await sleep(4500);
  assert.equal(w.done, false);
  w.kill();
  await until('the copy to exit', () => w.done);
});

test('a copy whose reader has gone exits at its next line', async () => {
  const w = await watch();
  w.stdout.destroy();
  await sleep(500);
  event('owner-note', 'nobody reads this');
  await until('the copy to exit', () => w.done);
});

test('a copy whose lead has ended exits and clears its lock', async () => {
  const leadPid = path.join(home, 'projects', ALIAS, 'lead.pid');
  fs.writeFileSync(leadPid, '999999');
  const w = await watch();
  await until('the copy to exit', () => w.done);
  fs.rmSync(leadPid);
  assert.equal(fs.existsSync(lockFile()), false);
});

test('a copy from before the lock is ended by the next watch', { skip: process.platform !== 'win32' && 'the sweep is Windows only' }, async () => {
  // Same command line as a real old copy, but it never looks at any lock.
  const dir = path.join(root, 'old');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'atelier.mjs'), 'setTimeout(() => {}, 120000);\n');
  const old = track(spawn(process.execPath, [path.join(dir, 'atelier.mjs'), 'watch', ALIAS], { windowsHide: true, stdio: 'ignore' }));
  // Similar names and a mere mention stay up.
  const other = track(spawn(process.execPath, [path.join(dir, 'atelier.mjs'), 'watch', `${ALIAS}-2`], { windowsHide: true, stdio: 'ignore' }));
  const mention = track(spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)', `atelier.mjs watch ${ALIAS}`], { windowsHide: true, stdio: 'ignore' }));
  await sleep(500);
  const w = await watch();
  await until('the old copy to be ended', () => old.done, 30_000);
  assert.equal(isAlive(w.pid), true);
  assert.equal(other.done, false);
  assert.equal(mention.done, false);
  for (const c of [w, other, mention]) c.kill();
  await until('the rest to exit', () => w.done && other.done && mention.done);
});

test('nothing here left a watch of this alias running', () => {
  if (process.platform !== 'win32') return;
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', `(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'watch ${ALIAS}' } | Measure-Object).Count`], { encoding: 'utf8', windowsHide: true });
  assert.equal(r.stdout.trim(), '0');
});
