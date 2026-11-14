// The Claude app counts as stuck only when its log says it went down for an update and never started again.
//   node --test test/claude-app.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.ATELIER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-app-'));
const { quitWithoutRestart } = await import('../lib/claudeapp.mjs');

const started = '2026-11-15 00:03:27 [info] [updater] MSIX detected: windowsStore=true';
const quit = '2026-11-15 00:30:01 [info] beforeQuitForUpdate handler fired, going down for update';
const alive = '2026-11-15 00:43:20 [info] [process-memory] trigger=interval tree_rss_sum=1579MB';

test('a quit for an update with nothing after it but the old process logging is stuck', () => {
  const at = quitWithoutRestart([started, quit, alive].join('\n'));
  assert.equal(at.getHours(), 0);
  assert.equal(at.getMinutes(), 30);
});

test('a quit followed by a fresh start, or no quit at all, is not', () => {
  assert.equal(quitWithoutRestart([quit, '2026-11-15 01:01:51 [info] [updater] App is installed, enabling initial check'].join('\n')), null);
  assert.equal(quitWithoutRestart([started, alive].join('\n')), null);
});
