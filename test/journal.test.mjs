// Every finished task gets a journal entry built from its card, notes, events and the owner's Inbox answers;
// a card that changes later is written again, and the indexes list each project and all of them together.
// Runs in a throwaway ATELIER_HOME.
//   node --test test/journal.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-journal-'));
process.env.ATELIER_HOME = root;
for (const d of ['board', 'runs/t1/evidence', 'projects/proj']) fs.mkdirSync(path.join(root, d), { recursive: true });
const card = (id, status, reason, updated) => fs.writeFileSync(path.join(root, 'board', `${id}.md`),
  `---\nid: ${id}\ntitle: Task ${id}\nstatus: ${status}\nreason: ${reason}\nproject: proj\nrole: voice\ncost_usd: 1.5\ncreated: 2026-11-18T10:00:00.000Z\nupdated: ${updated}\n---\n\n## Goal\n\nMake ${id} work.\n`);
card('t1', 'done', 'merged into v2 and pushed (abc1234)', '2026-11-18T12:00:00.000Z');
card('t2', 'failed', 'cancelled by lead', '2026-11-19T09:00:00.000Z');
card('t3', 'running', '', '2026-11-19T09:00:00.000Z');
fs.writeFileSync(path.join(root, 'runs/t1/DECISIONS.md'), '# DECISIONS — t1\n- Chose the socket path, because calls use it.\n');
fs.writeFileSync(path.join(root, 'runs/t1/evidence/EVIDENCE.md'), '# Evidence\n\n## What I ran\nThe real app.\n');
fs.writeFileSync(path.join(root, 'events.jsonl'), [
  { ts: '2026-11-18T10:00:00Z', id: 't1', type: 'added', msg: 'Task t1' },
  { ts: '2026-11-18T12:00:00Z', id: 't1', type: 'done', msg: 'landed' },
  { ts: '2026-11-18T12:00:00Z', id: 't10', type: 'added', msg: 'another task' },
].map(e => JSON.stringify(e)).join('\n') + '\n');
fs.writeFileSync(path.join(root, 'projects/proj/asks.json'), JSON.stringify({ asks: [
  { id: 'A-1', title: 'Approve t1', kind: 'approval', status: 'answered', at: '2026-11-18T10:05:00Z', body: 'Plan t1.',
    thread: [{ from: 'owner', at: '2026-11-18T10:06:00Z', verdict: 'approve', text: 'Yes, but keep it calm.' }] },
  { id: 'A-2', title: 'About t10', status: 'open', body: 't10 only', thread: [] },
] }));
const journal = await import('../lib/journal.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('a finished task gets one entry with its brief, timeline, owner answers and notes', () => {
  const wrote = journal.pass();
  assert.deepEqual(wrote.sort(), ['t1', 't2'], 'finished and cancelled tasks, not running ones');
  const e = fs.readFileSync(journal.entryFile('proj', 't1'), 'utf8');
  assert.match(e, /^# t1 · Task t1/);
  assert.match(e, /\*\*landed\*\*: merged into v2 and pushed \(abc1234\)/);
  assert.match(e, /#### Goal\n\nMake t1 work\./, 'the brief, its headings under the entry\'s');
  assert.match(e, /2026-11-18 12:00 · done · landed/);
  assert.doesNotMatch(e, /another task/, 'events of t10 are not t1\'s');
  assert.match(e, /### A-1 · Approve t1/);
  assert.doesNotMatch(e, /A-2/, 'an ask about t10 is not about t1');
  assert.match(e, /Owner, 2026-11-18 10:06, approved:\*\* Yes, but keep it calm\./);
  assert.match(e, /## Decisions\n\n- Chose the socket path/);
  assert.match(e, /## Evidence\n\n#### What I ran/);
  assert.match(fs.readFileSync(journal.entryFile('proj', 't2'), 'utf8'), /\*\*cancelled\*\*/);
});

test('the indexes list each project by month and every project together', () => {
  const idx = fs.readFileSync(path.join(journal.dir('proj'), 'README.md'), 'utf8');
  assert.match(idx, /2 tasks, \$3\.00 in all/);
  assert.match(idx, /## Week of 2026-11-16: 2 tasks, 1 landed, \$3\.00/);
  assert.ok(idx.indexOf('[t2]') < idx.indexOf('[t1]'), 'latest first');
  assert.match(fs.readFileSync(path.join(journal.ROOT, 'journal.md'), 'utf8'), /proj · \[t1\]\(proj\/journal\/tasks\/t1\.md\)/);
});

test('nothing is rewritten until a card changes', () => {
  assert.deepEqual(journal.pass(), []);
  card('t1', 'done', 'merged into v2 and pushed (def5678)', '2026-11-19T12:00:00.000Z');
  assert.deepEqual(journal.pass(), ['t1']);
  assert.match(fs.readFileSync(journal.entryFile('proj', 't1'), 'utf8'), /def5678/);
});
