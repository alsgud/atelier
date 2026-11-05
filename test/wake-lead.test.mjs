// The tick wakes a lead that sits idle while news waits for it. Runs in a throwaway ATELIER_HOME with a stand-in
// lead (a sleeping node process); no agent ever starts.
//   node --test test/wake-lead.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-wake-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const ALIAS = 'waketest';
const dir = path.join(process.env.ATELIER_HOME, 'projects', ALIAS);
const transcript = path.join(root, 'lead.jsonl');
const children = [];
let tick;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const minsAgo = m => new Date(Date.now() - m * 60_000);
const isAlive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const events = () => fs.readFileSync(path.join(process.env.ATELIER_HOME, 'events.jsonl'), 'utf8');

// A fresh stand-in lead, its transcript last written `spokeMin` ago, and one event `eventMin` ago.
function setup({ spokeMin, eventMin, recorded = true }) {
  const lead = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 120000)'], { stdio: 'ignore', windowsHide: true });
  children.push(lead);
  fs.writeFileSync(path.join(dir, 'lead.pid'), String(lead.pid));
  fs.utimesSync(path.join(dir, 'lead.pid'), minsAgo(120), minsAgo(120));
  fs.rmSync(path.join(dir, 'lead-transcript.txt'), { force: true });
  if (recorded) fs.writeFileSync(path.join(dir, 'lead-transcript.txt'), transcript);
  fs.writeFileSync(transcript, '{}\n');
  fs.utimesSync(transcript, minsAgo(spokeMin), minsAgo(spokeMin));
  fs.writeFileSync(path.join(process.env.ATELIER_HOME, 'events.jsonl'), JSON.stringify({ ts: minsAgo(eventMin).toISOString(), id: ALIAS, type: 'checklist-approved', msg: 'round 1' }) + '\n');
  fs.rmSync(path.join(dir, 'lead-restarts.json'), { force: true });
  return lead;
}

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

test('an idle lead with news waiting 10+ minutes is ended, so the supervisor restarts it', async () => {
  const lead = setup({ spokeMin: 30, eventMin: 15 });
  const changes = [];
  tick.wakeIdleLeads(changes);
  for (let i = 0; i < 50 && isAlive(lead.pid); i++) await sleep(100);
  assert.equal(isAlive(lead.pid), false);
  assert.deepEqual(changes, [`${ALIAS}: idle lead woken`]);
  assert.match(events(), /lead had stopped listening/);
});

test('a lead that has spoken since the news is left alone', async () => {
  const lead = setup({ spokeMin: 5, eventMin: 15 });
  tick.wakeIdleLeads();
  await sleep(500);
  assert.equal(isAlive(lead.pid), true);
});

test('news under 10 minutes old is left for the lead to pick up', async () => {
  const lead = setup({ spokeMin: 30, eventMin: 5 });
  tick.wakeIdleLeads();
  await sleep(500);
  assert.equal(isAlive(lead.pid), true);
});

test('a lead with no transcript on record from this session is left alone', async () => {
  const lead = setup({ spokeMin: 30, eventMin: 15, recorded: false });
  tick.wakeIdleLeads();
  await sleep(500);
  assert.equal(isAlive(lead.pid), true);
});
