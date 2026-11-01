// A plan-limit hold ends as soon as the limit stops holding, not at the time it first worked out.
//   node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('raising the ceiling ends a hold that had hours left', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-pace-'));
  const config = { maxParallel: 1, pace: { fiveHour: 90, sevenDay: 90, spread: false } };
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(config));
  const nowSec = Math.floor(Date.now() / 1000);
  fs.writeFileSync(path.join(home, 'limits.json'), JSON.stringify({ five_hour: { used_percentage: 92, resets_at: nowSec + 4 * 3600 }, seven_day: { used_percentage: 10, resets_at: nowSec + 3 * 86400 }, saved_at: nowSec }));
  const script = path.join(home, 'hold.mjs');
  fs.writeFileSync(script, `import { pace } from ${JSON.stringify(pathToFileURL(path.join(ROOT, 'lib', 'runner.mjs')).href)};
await pace('audit-demo', () => {}, 100);
console.log('resumed');
process.exit(0);`);
  const child = spawn(process.execPath, [script], { env: { ...process.env, ATELIER_HOME: home }, stdio: ['ignore', 'pipe', 'inherit'] });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  const ended = new Promise(r => child.on('close', r));
  try {
    await new Promise(r => setTimeout(r, 2500));
    assert.equal(out, '', 'still holding while the limit holds');
    fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify({ ...config, pace: { ...config.pace, fiveHour: 95 } }));
    const code = await Promise.race([ended, new Promise(r => setTimeout(() => r('timeout'), 15000))]);
    assert.equal(code, 0);
    assert.match(out, /resumed/);
  } finally {
    child.kill();
    fs.rmSync(home, { recursive: true, force: true });
  }
});
