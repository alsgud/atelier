// The lead's watch as a background command: it exits (waking the lead) on the first owner decision, nothing that
// lands between two watches is lost, and the lead can't go idle without one. Runs the real CLI in a throwaway
// ATELIER_HOME; no agent ever starts. The alias carries this test's pid so nothing reaches a real project.
//   node --test test/watch-once.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'atelier.mjs');
const ALIAS = `oncetest${process.pid}`;
let root, home, env;
const children = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const event = (type, msg) => fs.appendFileSync(path.join(home, 'events.jsonl'), JSON.stringify({ ts: new Date().toISOString(), id: ALIAS, type, msg }) + '\n');
function once() {
  const child = spawn(process.execPath, [CLI, 'watch', ALIAS, '--once'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  children.push(child);
  child.out = '';
  child.stdout.on('data', d => { child.out += d; });
  child.exited = new Promise(r => child.on('close', r));
  return child;
}
const within = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw new Error(`still waiting after ${ms} ms`); })]);
const stopHook = () => spawnSync(process.execPath, [CLI, 'lead-stop', ALIAS], { env, input: JSON.stringify({ session_id: 's', stop_hook_active: false }), encoding: 'utf8' }).stdout;

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-once-'));
  home = path.join(root, 'home');
  env = { ...process.env, ATELIER_HOME: home, ATELIER_NO_TICK: '1' };
  fs.mkdirSync(path.join(home, 'projects', ALIAS), { recursive: true });
  fs.mkdirSync(path.join(home, 'board'));
  fs.writeFileSync(path.join(home, 'projects', `${ALIAS}.json`), JSON.stringify({ alias: ALIAS, repo: root }));
  fs.writeFileSync(path.join(home, 'events.jsonl'), '');
});
after(() => {
  for (const c of children) if (c.exitCode === null) c.kill();
  try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); } catch { /* a copy may still hold a file */ }
});

test('it waits quietly, then exits with the owner\'s answer', async () => {
  const w = once();
  await sleep(3000);
  event('pushed', 'not news for the lead');
  await sleep(3000);
  assert.equal(w.exitCode, null, 'still waiting');
  event('ask-answered', 'A-1 "Pick one" ANSWERED: B');
  await within(w.exited, 8000);
  assert.match(w.out, /OWNER DECIDED · ask-answered · .* ANSWERED: B/);
  assert.doesNotMatch(w.out, /not news/);
});

test('an answer that lands between two watches reaches the next one at once', async () => {
  event('ask-answered', 'A-2 "Another" APPROVED');
  const w = once();
  await within(w.exited, 4000);
  assert.match(w.out, /A-2 "Another" APPROVED/);
});

test('the lead is sent back to start a watch when none is running, and may stop when one is', async () => {
  assert.match(stopHook(), /watch isn't running/);
  const w = once();
  await sleep(1500);
  assert.doesNotMatch(stopHook(), /watch isn't running/);
  w.kill();
});
