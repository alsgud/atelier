// An approval's command is checked before it reaches the owner: it must parse, the scripts it names must exist,
// and API keys they read must be set. Runs in a throwaway folder; nothing is executed.
//   node --test test/preflight.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { preflight } from '../lib/asks.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-preflight-'));
fs.writeFileSync(path.join(dir, 'bad.ps1'), 'param($x)\nif ($x { Write-Output 1 }\n');
fs.writeFileSync(path.join(dir, 'good.ps1'), 'param($x)\nif ($x) { Write-Output 1 }\n');
fs.writeFileSync(path.join(dir, 'needs.py'), 'import os\nk = os.environ["ZZ_FAKE_API_KEY"]\n');
fs.writeFileSync(path.join(dir, 'has.py'), 'import os\nk = os.getenv("ZZ_SET_API_KEY")\n');
fs.writeFileSync(path.join(dir, '.env'), 'ZZ_SET_API_KEY=abc\n');
after(() => fs.rmSync(dir, { recursive: true, force: true }));

const win = process.platform === 'win32';

test('a script that does not exist is caught', () => {
  assert.match(preflight('python missing.py', 'powershell', dir).join('\n'), /missing\.py doesn't exist/);
});

test('a key the script reads but nobody set is caught; one in .env is fine', () => {
  assert.match(preflight('python needs.py', 'powershell', dir).join('\n'), /ZZ_FAKE_API_KEY/);
  assert.deepEqual(preflight('python has.py', 'powershell', dir), []);
});

test('PowerShell that does not parse is caught, in the command or in its script', { skip: !win }, () => {
  assert.match(preflight('Write-Output (1 + ', 'powershell', dir).join('\n'), /the command doesn't parse/);
  assert.match(preflight('powershell -File bad.ps1', 'powershell', dir).join('\n'), /bad\.ps1 doesn't parse/);
  assert.deepEqual(preflight('powershell -File good.ps1 -x 1', 'powershell', dir), []);
});
