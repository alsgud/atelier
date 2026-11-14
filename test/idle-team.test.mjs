// A team never sits with nothing running and nothing in the owner's Inbox without someone being told why.
// Runs in a throwaway ATELIER_HOME; the "lead" is this test's own process.
//   node --test test/idle-team.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-idle-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const ALIAS = 'idletest';
const dir = path.join(process.env.ATELIER_HOME, 'projects', ALIAS);
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'board'), { recursive: true });
fs.writeFileSync(path.join(process.env.ATELIER_HOME, 'projects', `${ALIAS}.json`), JSON.stringify({ alias: ALIAS, roster: [], gates: {} }));
fs.writeFileSync(path.join(dir, 'lead.wanted'), '');
fs.writeFileSync(path.join(dir, 'lead.pid'), String(process.pid));
const idle = await import('../lib/idle.mjs');
const cards = await import('../lib/card.mjs');
const asks = await import('../lib/asks.mjs');
const events = await import('../lib/events.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const card = (id, status, extra = {}) => cards.save({ meta: { id, title: `Task ${id}`, project: ALIAS, status, created: new Date().toISOString(), ...extra }, body: '' });
const back = min => { const f = path.join(dir, 'idle.json'), s = JSON.parse(fs.readFileSync(f, 'utf8')); s.since = new Date(Date.now() - min * 60_000).toISOString(); if (s.nudged) s.nudged = s.since; fs.writeFileSync(f, JSON.stringify(s)); };

test('a paused task with nothing running and nothing for the owner is idle, and says why', () => {
  card('p1', 'paused', { reason: 'for the lead: reached its $18 budget ($18.78 spent); check pass. Extend with: atelier extend p1' });
  const why = idle.reasons(ALIAS);
  assert.match(why.map(w => w.text).join('\n'), /Task p1: paused, reached its \$18 budget/);
});

test('it is not idle while something runs, is being brought in, or waits on the owner', () => {
  card('r1', 'running');
  assert.equal(idle.reasons(ALIAS), null);
  card('r1', 'done');
  card('p1', 'paused', { landing: new Date().toISOString(), landing_pid: process.pid });
  assert.equal(idle.reasons(ALIAS), null, 'the lead is bringing it in');
  card('p1', 'paused', { reason: 'stopped by the lead' });
  const a = asks.ask(ALIAS, { kind: 'question', title: 'Which one', body: 'A body long enough to pass the rule that every item explains itself to the owner in full, standing alone.', todo: 'Pick', options: ['A', 'B'], separate: true });
  assert.equal(idle.reasons(ALIAS), null, 'the owner has something to answer');
  asks.withdraw(ALIAS, a.id);
});

test('the lead is told after a while, then the owner sees it, and the button wakes the lead', () => {
  idle.pass();
  assert.equal(idle.forOwner(ALIAS), null);
  back(idle.NUDGE_MIN + 1);
  idle.pass();
  assert.ok(events.read({ sinceMin: 5 }).some(e => e.id === ALIAS && e.type === 'needs-lead' && /nothing running/.test(e.msg)));
  assert.equal(idle.forOwner(ALIAS), null, 'not yet: the lead has a chance first');
  back(idle.OWNER_MIN + 1);
  assert.ok(idle.forOwner(ALIAS)?.why.length);
  idle.wake(ALIAS);
  assert.equal(idle.forOwner(ALIAS), null, 'waking starts the clock again');
  card('p1', 'done');
  fs.writeFileSync(path.join(dir, 'checklist.json'), '[]');
  idle.pass();
});
