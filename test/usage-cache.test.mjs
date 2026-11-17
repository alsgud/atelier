// A run log's spend is read once and remembered on disk, so short-lived commands (hooks, the statusline) don't
// re-read every log; a log that changes is read again. Runs in a throwaway ATELIER_HOME.
//   node --test test/usage-cache.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-usage-'));
process.env.ATELIER_HOME = root;
const dir = path.join(root, 'runs', 'T-1');
fs.mkdirSync(dir, { recursive: true });
const log = path.join(dir, 'iter-01.jsonl');
const usage = { input_tokens: 10, output_tokens: 5 };
const lines = cost => [
  JSON.stringify({ type: 'user', message: { content: 'x'.repeat(100) } }),
  JSON.stringify({ type: 'assistant', message: { id: 'm1', model: 'opus', usage } }),
  JSON.stringify({ type: 'result', usage, total_cost_usd: cost, duration_ms: 60000 }),
].join('\n') + '\n';
fs.writeFileSync(log, lines(0.5));
const u = await import('../lib/usage.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('a run log is read once, remembered on disk, and read again when it changes', () => {
  const [r] = u.runs('T-1');
  assert.equal(r.cost, 0.5);
  assert.equal(r.tokens, 15);
  u.saveCache();
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'run-usage.json'), 'utf8'));
  assert.equal(saved[log].value.cost, 0.5, 'kept on disk for the next process');
  fs.writeFileSync(log, lines(0.75) + '\n');
  assert.equal(u.runs('T-1')[0].cost, 0.75, 'a changed log is read again');
});
