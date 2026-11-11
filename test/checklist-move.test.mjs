// A round line that can't be built yet moves to the next round at the owner's word, so the rest can be reviewed,
// and a round with lines to build but no task on them counts as an idle team. Runs in a throwaway ATELIER_HOME.
//   node --test test/checklist-move.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-move-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const ALIAS = 'movetest';
const dir = path.join(process.env.ATELIER_HOME, 'projects', ALIAS);
fs.mkdirSync(dir, { recursive: true });
const checklist = await import('../lib/checklist.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const shot = path.join(root, 'shot.png');
fs.writeFileSync(shot, 'png');
const ready = id => checklist.ready(ALIAS, id, { how: 'open it', attach: [`${shot}=It working`] });

test('a blocked line moves on, the rest goes to review, and it opens the next round', () => {
  checklist.propose(ALIAS, { goal: 'Try three things', items: ['First thing', 'Second thing', 'Waits on the other team'], by: day(3), finish: day(10), cost: 5, noResearch: 'small' });
  checklist.decide(ALIAS, 1, true);
  ready('C-1'); ready('C-2');
  assert.equal(checklist.current(ALIAS).status, 'active');
  assert.deepEqual(checklist.idleLines(checklist.current(ALIAS), []).map(i => i.id), ['C-3']);
  assert.deepEqual(checklist.idleLines(checklist.current(ALIAS), [{ status: 'running', for: 'C-3' }]), []);
  assert.throws(() => checklist.move(ALIAS, 'C-3', ''), /owner agreed/);

  checklist.move(ALIAS, 'C-3', 'Move drawing to the next round');
  assert.equal(checklist.current(ALIAS).status, 'review');
  assert.equal(checklist.forOwner(ALIAS).review.length, 2);
  checklist.judge(ALIAS, 'C-1', true); checklist.judge(ALIAS, 'C-2', true);
  assert.equal(checklist.rounds(ALIAS)[0].status, 'done');

  const r = checklist.propose(ALIAS, { goal: 'Next', items: ['New thing'], by: day(3), finish: day(10), cost: 5, noResearch: 'small' });
  assert.deepEqual(r.items.map(i => [i.text, i.from]), [['Waits on the other team', 'C-3'], ['New thing', undefined]]);
  assert.equal(checklist.rounds(ALIAS)[0].items[2].carriedTo, r.items[0].id);
});

test('the last line left of a round cannot be moved away', () => {
  checklist.decide(ALIAS, 2, true);
  ready('C-5');
  checklist.move(ALIAS, 'C-4', 'later');
  assert.equal(checklist.current(ALIAS).status, 'review');
  checklist.judge(ALIAS, 'C-5', false, 'not right');
  assert.throws(() => checklist.move(ALIAS, 'C-5', 'later'), /all that's left/);
});
