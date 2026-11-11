// A lead's reply after the owner only answered stays out of the Inbox, so an answered item doesn't come back;
// a reply to something the owner wrote, or one sent with --tell, reaches them. Runs in a throwaway ATELIER_HOME.
//   node --test test/quiet-reply.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-reply-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const ALIAS = 'replytest';
fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'projects', ALIAS), { recursive: true });
const asks = await import('../lib/asks.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const BODY = 'A body long enough to pass the rule that every item explains itself to the owner in full, standing alone.';
const inbox = () => asks.forOwner(ALIAS).map(a => a.id);

test('an answer acknowledged by the lead does not come back', () => {
  const a = asks.ask(ALIAS, { kind: 'feedback', title: 'Paste the results here', body: BODY, links: ['https://example.com'], todo: 'Paste them' });
  asks.answer(ALIAS, a.id, { verdict: 'answer', text: "we'll leave this aside." });
  asks.reply(ALIAS, a.id, 'Understood, set aside.');
  assert.ok(!inbox().includes(a.id));
  assert.ok(asks.all(ALIAS).find(x => x.id === a.id).thread.at(-1).quiet);
});

test('--tell, a question back, and words written under a reply all reach the owner', () => {
  const a = asks.ask(ALIAS, { kind: 'approval', title: 'Try her app', body: BODY, todo: 'Approve' });
  asks.answer(ALIAS, a.id, { verdict: 'approve' });
  asks.reply(ALIAS, a.id, 'It is running: try it here.', { tell: true });
  assert.ok(inbox().includes(a.id));
  asks.answer(ALIAS, a.id, { verdict: 'answer', text: 'the attachment refused to connect' });
  asks.reply(ALIAS, a.id, 'Found why; fixing it now.');
  assert.ok(inbox().includes(a.id), 'a reply to what the owner wrote back reaches them');

  const q = asks.ask(ALIAS, { kind: 'question', title: 'Which one', body: BODY, todo: 'Pick', options: ['A', 'B'] });
  asks.answer(ALIAS, q.id, { verdict: 'answer', text: 'A, but why not B?' });
  asks.reply(ALIAS, q.id, 'B costs twice as much.');
  assert.ok(inbox().includes(q.id));

  const n = asks.note(ALIAS, 'How is it going?');
  asks.reply(ALIAS, n.id, 'Two parts done.');
  assert.ok(inbox().includes(n.id));
});
