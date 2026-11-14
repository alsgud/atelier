// The lead shows as working from its first thought until its turn ends, with what it's doing in words, read from
// its own Claude session record. Runs in a throwaway ATELIER_HOME.
//   node --test test/lead-activity.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-leadact-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
fs.mkdirSync(process.env.ATELIER_HOME, { recursive: true });
const { leadActivity } = await import('../lib/dashboard.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const ts = s => new Date(Date.now() - s * 1000).toISOString();
const write = (...entries) => { const f = path.join(root, `t${Math.random()}.jsonl`); fs.writeFileSync(f, entries.map(e => JSON.stringify(e)).join('\n') + '\n'); return f; };
const tool = (name, input, s = 5) => ({ type: 'assistant', timestamp: ts(s), message: { content: [{ type: 'tool_use', name, input }] } });

test('mid-turn it is working, and says what it is doing', () => {
  assert.deepEqual(leadActivity(write({ type: 'assistant', timestamp: ts(3), message: { content: [{ type: 'thinking' }] } })).doing, 'Thinking');
  assert.equal(leadActivity(write(tool('Bash', { command: 'atelier ask voice-assistant approval "x" --body y' }))).doing, 'Writing to you');
  assert.equal(leadActivity(write(tool('PowerShell', { command: 'atelier add va "Fix it" --for C-3' }))).doing, 'Planning tasks');
  assert.equal(leadActivity(write(tool('Read', { file_path: 'a.md' }), { type: 'user', timestamp: ts(2), message: { content: [{ type: 'tool_result' }] } })).doing, 'Reading the project');
});

test('once its turn ends it is watching, not working', () => {
  const a = leadActivity(write(tool('Bash', { command: 'atelier watch va --once' }, 9), { type: 'system', subtype: 'stop_hook_summary', timestamp: ts(8) }));
  assert.equal(a.busy, false);
  assert.equal(leadActivity(write(tool('Read', {}, 3600))).busy, false, 'a turn left open for an hour is not work');
});
