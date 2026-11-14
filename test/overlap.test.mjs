// Two tasks wait for each other only when they could edit the same file: one in the repo that both scopes match,
// or a path one names outright inside the other's. A shared start of the pattern isn't enough (14 Nov: every
// "tests/test_*" scope clashed with every other, so a project ran one task at a time).
//   node --test test/overlap.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-overlap-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
const repo = path.join(root, 'repo');
for (const f of ['src/app/config.py', 'src/app/llm/starter.py', 'src/app/tts/eleven.py', 'tests/test_starter.py', 'tests/test_tts.py']) {
  fs.mkdirSync(path.dirname(path.join(repo, f)), { recursive: true });
  fs.writeFileSync(path.join(repo, f), '');
}
const git = (...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8' });
git('init', '-q', '-b', 'main'); git('add', '.'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'files');
const { overlaps } = await import('../lib/tick.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const task = files => ({ role: 'builder', repo, base: 'main', files });

test('scopes that only share the start of a pattern run side by side', () => {
  assert.equal(overlaps(task('src/app/tts/**,src/app/**/spend*.py,tests/test_*tts*.py'), task('src/app/llm/starter.py,tests/test_starter*.py')), false);
});

test('scopes that meet on a real file, or on a path named outright, wait for each other', () => {
  assert.equal(overlaps(task('src/app/config.py,src/app/tts/**'), task('src/app/*.py')), true);
  assert.equal(overlaps(task('src/app/tts/new_voice.py'), task('src/app/tts/**')), true, 'a new file inside the other scope');
  assert.equal(overlaps(task('tests/test_*.py'), task('tests/test_starter*.py')), true);
});
