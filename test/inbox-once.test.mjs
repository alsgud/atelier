// The owner meets each thing once: a round line reaches them as soon as it's ready (not days later, after they'd
// already tried it in another item), and plans the lead explains in an item are approved with it, not listed again.
// Runs in a throwaway ATELIER_HOME.
//   node --test test/inbox-once.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-once-inbox-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const ALIAS = 'oncetest';
fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'projects', ALIAS), { recursive: true });
fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'board'), { recursive: true });
const checklist = await import('../lib/checklist.mjs');
const asks = await import('../lib/asks.mjs');
const cards = await import('../lib/card.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const shot = path.join(root, 'shot.png');
fs.writeFileSync(shot, 'png');
const BODY = 'A body long enough to pass the rule that every item explains itself to the owner in full, standing alone.';

test('a line is in the Inbox the moment it is ready, and can be judged while the rest is built', () => {
  checklist.propose(ALIAS, { goal: 'Try two things', items: ['Gem stars', 'Drawing from my words'], by: day(3), finish: day(10), cost: 5, noResearch: 'small' });
  checklist.decide(ALIAS, 1, true);
  checklist.ready(ALIAS, 'C-1', { how: 'open it', attach: [`${shot}=It working`] });
  assert.equal(checklist.current(ALIAS).status, 'active');
  assert.deepEqual(checklist.forOwner(ALIAS).review.map(x => x.item.id), ['C-1']);
  checklist.judge(ALIAS, 'C-1', true);
  assert.equal(checklist.current(ALIAS).status, 'active', 'C-2 is still to build');
  assert.deepEqual(checklist.forOwner(ALIAS).review, []);
  checklist.ready(ALIAS, 'C-2', { how: 'say a thing', attach: [`${shot}=It drawing`] });
  assert.equal(checklist.current(ALIAS).status, 'review');
  checklist.judge(ALIAS, 'C-2', false, 'it drew a cat, I said a dog');
  assert.equal(checklist.current(ALIAS).status, 'active');
  checklist.ready(ALIAS, 'C-2', { how: 'say a thing', attach: [`${shot}=It drawing`] });
  checklist.judge(ALIAS, 'C-2', true);
  assert.equal(checklist.rounds(ALIAS)[0].status, 'done');
});

test('an item can carry the lines it is about, and the plans it explains', () => {
  const a = asks.ask(ALIAS, { kind: 'feedback', title: 'Try the gems early', body: BODY, todo: 'Look', links: ['https://example.com'], lines: ['c-1'] });
  assert.deepEqual(a.lines, ['C-1']);
  assert.throws(() => asks.ask(ALIAS, { kind: 'update', title: 'x', body: BODY, lines: ['AC-3'] }), /checklist lines/);

  cards.save({ meta: { id: 'pl01', title: 'Fewer uhs', project: ALIAS, status: 'planned', role: 'voice', created: new Date().toISOString() }, body: 'Objective: fewer uhs.' });
  cards.save({ meta: { id: 'run1', title: 'Already going', project: ALIAS, status: 'running' }, body: '' });
  assert.throws(() => asks.ask(ALIAS, { kind: 'update', title: 'Research back', body: BODY, plans: ['run1'] }), /not planned/);
  assert.throws(() => asks.ask(ALIAS, { kind: 'question', title: 'Research back', body: BODY, todo: 'Pick', plans: ['pl01'] }), /approval/);
  assert.throws(() => asks.ask(ALIAS, { kind: 'update', title: 'Fix ready to approve', body: BODY }), /--plans pl01/);
  assert.ok(asks.ask(ALIAS, { kind: 'update', title: 'Something else', body: BODY, separate: true }));
  const u = asks.ask(ALIAS, { kind: 'update', title: 'What the voice research found', body: BODY, plans: ['pl01'] });
  assert.equal(u.kind, 'approval', 'an update that carries plans becomes their approval');
  assert.deepEqual(u.plans, ['pl01']);
  assert.match(u.todo, /Approve the plan/);
});
