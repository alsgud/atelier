// A test command that passed on exactly this code isn't run again; a failure, a code change or uncommitted edits
// run it for real. Runs in a throwaway ATELIER_HOME with a throwaway repo.
//   node --test test/passcache.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-pass-'));
process.env.ATELIER_HOME = path.join(root, 'home');
fs.mkdirSync(process.env.ATELIER_HOME, { recursive: true });
const repo = path.join(root, 'repo');
fs.mkdirSync(repo);
const git = (...a) => spawnSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8' });
git('init', '-q'); fs.writeFileSync(path.join(repo, 'a.txt'), 'one'); git('add', '.'); git('commit', '-qm', 'one');
const passcache = await import('../lib/passcache.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

let runs = 0;
const run = ok => () => { runs++; return { ok, code: ok ? 0 : 1, tail: '' }; };

test('a pass on the same code is remembered; a failure never is', () => {
  passcache.once('pytest -q', repo, run(false));
  passcache.once('pytest -q', repo, run(true));
  const again = passcache.once('pytest -q', repo, run(true));
  assert.equal(runs, 2);
  assert.ok(again.cached && again.ok);
  passcache.once('pytest -q -k other', repo, run(true));
  assert.equal(runs, 3, 'another command runs');
});

test('new code, or uncommitted edits, run it for real', () => {
  fs.writeFileSync(path.join(repo, 'a.txt'), 'two');
  passcache.once('pytest -q', repo, run(true));
  assert.equal(runs, 4, 'uncommitted edit');
  passcache.once('pytest -q', repo, run(true));
  assert.equal(runs, 5, 'still uncommitted, still not cached');
  git('commit', '-qam', 'two');
  passcache.once('pytest -q', repo, run(true));
  passcache.once('pytest -q', repo, run(true));
  assert.equal(runs, 6, 'committed: one real run, then remembered');
});
