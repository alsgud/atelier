// A finished task doesn't hold its slot: a review that ends without a verdict isn't counted as "changes", the
// reviewer is told the runner already ran the full suite on that commit, and a task with nothing left but its own
// open request waits off the slot. Runs in a throwaway ATELIER_HOME.
//   node --test test/finished-task.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-finished-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'board'), { recursive: true });
const runner = await import('../lib/runner.mjs');
const cards = await import('../lib/card.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('a review with no verdict line has no verdict, rather than counting as changes', () => {
  assert.equal(runner.verdictOf('All good.\nATELIER_REVIEW: APPROVE'), 'APPROVE');
  assert.equal(runner.verdictOf('ATELIER_REVIEW: changes'), 'CHANGES');
  assert.equal(runner.verdictOf("The suite is still running. I'll write the verdict when it finishes."), '');
  assert.equal(runner.verdictOf(undefined), '');
});

test('the reviewer hears the suite already passed, only for the commit it ran on', () => {
  const head = 'a'.repeat(40);
  assert.match(runner.suiteNote({ cmd: 'pytest -q', head }, head), /passed on this exact commit \(aaaaaaa\).*Don't run it again/s);
  assert.equal(runner.suiteNote({ cmd: 'pytest -q', head }, 'b'.repeat(40)), '');
  assert.equal(runner.suiteNote(null, head), '');
  assert.match(fs.readFileSync(new URL('../prompts/review.md', import.meta.url), 'utf8'), /\{\{suite\}\}[\s\S]*in the foreground/);
});

test('a task knows which of its requests are still open', () => {
  const card = (id, status) => cards.save({ meta: { id, title: id, status, requested_by: 'task1' }, body: '' });
  card('req1', 'requested'); card('req2', 'done'); card('req3', 'failed');
  cards.save({ meta: { id: 'other', title: 'other', status: 'requested', requested_by: 'task2' }, body: '' });
  assert.deepEqual(runner.openRequests('task1'), ['req1']);
});
