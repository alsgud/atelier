// The tick restarts a lead whose session stopped on an API error, once Claude can be reached. Runs in a throwaway
// ATELIER_HOME with a stand-in lead (a sleeping node process); no agent ever starts, and reachability is faked.
//   node --test test/errored-lead.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-errlead-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const ALIAS = 'errtest';
const dir = path.join(process.env.ATELIER_HOME, 'projects', ALIAS);
const transcript = path.join(root, 'lead.jsonl');
const children = [];
let tick;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const minsAgo = m => new Date(Date.now() - m * 60_000).toISOString();
const isAlive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const online = () => true, offline = () => false;

// A fresh stand-in lead whose transcript ends with `last` (written `min` minutes ago), then a bookkeeping line.
function setup(last, min) {
  const lead = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore', windowsHide: true });
  children.push(lead);
  fs.writeFileSync(path.join(dir, 'lead.pid'), String(lead.pid));
  const old = new Date(Date.now() - 120 * 60_000);
  fs.utimesSync(path.join(dir, 'lead.pid'), old, old);
  fs.writeFileSync(path.join(dir, 'lead-transcript.txt'), transcript);
  const lines = [{ type: 'user', timestamp: minsAgo(min + 1), message: { content: 'Start your shift.' } }, { ...last, timestamp: minsAgo(min) }, { type: 'system', subtype: 'turn_duration', timestamp: minsAgo(min) }];
  fs.writeFileSync(transcript, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  fs.rmSync(path.join(dir, 'lead-restarts.json'), { force: true });
  fs.rmSync(path.join(dir, 'lead.restart'), { force: true });
  return lead;
}
const apiError = { type: 'assistant', isApiErrorMessage: true, message: { content: [{ type: 'text', text: 'API Error: Can\'t reach the API server (ENOTFOUND)' }] } };
const spoke = { type: 'assistant', message: { content: [{ type: 'text', text: 'Waiting on the watch.' }] } };

before(async () => {
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'board'));
  fs.writeFileSync(path.join(process.env.ATELIER_HOME, 'projects', `${ALIAS}.json`), JSON.stringify({ alias: ALIAS, repo: root }));
  fs.writeFileSync(path.join(dir, 'lead.wanted'), '');
  tick = await import('../lib/tick.mjs');
});

after(() => {
  for (const c of children) try { c.kill(); } catch { /* gone */ }
  try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); } catch { /* a process may still hold a file */ }
});

test('a lead stuck on an API error is restarted in place once Claude is reachable', async () => {
  const lead = setup(apiError, 10);
  const changes = [];
  tick.restartErroredLeads(changes, { reachable: online });
  for (let i = 0; i < 50 && isAlive(lead.pid); i++) await sleep(100);
  assert.equal(isAlive(lead.pid), false);
  assert.ok(fs.existsSync(path.join(dir, 'lead.restart')), 'the restart flag makes its own loop start a fresh session');
  assert.deepEqual(changes, [`${ALIAS}: lead restarted after an API error`]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'lead-restarts.json'), 'utf8')).length, 1);
});

test('while the PC is still offline, it waits', async () => {
  const lead = setup(apiError, 10);
  tick.restartErroredLeads([], { reachable: offline });
  await sleep(500);
  assert.equal(isAlive(lead.pid), true);
});

test('a fresh error is left for Claude Code to retry', async () => {
  const lead = setup(apiError, 1);
  tick.restartErroredLeads([], { reachable: online });
  await sleep(500);
  assert.equal(isAlive(lead.pid), true);
});

test('a lead whose last turn ended normally is left alone', async () => {
  const lead = setup(spoke, 30);
  tick.restartErroredLeads([], { reachable: online });
  await sleep(500);
  assert.equal(isAlive(lead.pid), true);
});
