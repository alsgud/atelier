// Tidying after tasks: a landed task's worktree, branch and GitHub branch go; a cancelled one is archived as a tag
// first; unmerged or just-finished work is left alone; proof media stays out of git. Runs in a throwaway
// ATELIER_HOME with a local bare repo standing in for GitHub.
//   node --test test/tidy.test.mjs
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-tidy-'));
process.env.ATELIER_HOME = path.join(root, 'home');
process.env.ATELIER_NO_TICK = '1';
fs.mkdirSync(path.join(process.env.ATELIER_HOME, 'board'), { recursive: true });
const tidy = await import('../lib/tidy.mjs');
const cards = await import('../lib/card.mjs');
after(() => fs.rmSync(root, { recursive: true, force: true }));

const git = (cwd, ...a) => { const r = spawnSync('git', a, { cwd, encoding: 'utf8' }); if (r.status) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
const ok = (cwd, ...a) => spawnSync('git', a, { cwd, encoding: 'utf8' }).status === 0;

const origin = path.join(root, 'origin.git');
const repo = path.join(root, 'repo');
git(root, 'init', '-q', '--bare', '-b', 'main', origin);
git(root, 'clone', '-q', origin, repo);
for (const [k, v] of [['user.email', 't@t'], ['user.name', 't'], ['commit.gpgsign', 'false']]) git(repo, 'config', k, v);
fs.writeFileSync(path.join(repo, 'a.txt'), 'a\n');
git(repo, 'add', '-A'); git(repo, 'commit', '-q', '-m', 'start'); git(repo, 'push', '-q', '-u', 'origin', 'main');

const hourAgo = new Date(Date.now() - 3600_000).toISOString();
// cards.save stamps `updated` with now; a finished card here must look an hour old.
function card(meta) {
  fs.writeFileSync(cards.cardPath(meta.id), cards.serialize({ meta: { title: meta.id, repo, base: 'main', branch: `atelier/${meta.id}`, updated: hourAgo, ...meta }, body: '' }));
}
function taskBranch(id, { merge }) {
  const wt = path.join(root, 'wt', id);
  git(repo, 'worktree', 'add', '-q', '-b', `atelier/${id}`, wt, 'main');
  for (const [k, v] of [['user.email', 't@t'], ['user.name', 't']]) git(wt, 'config', k, v);
  fs.writeFileSync(path.join(wt, `${id}.txt`), id);
  git(wt, 'add', '-A'); git(wt, 'commit', '-q', '-m', id);
  git(repo, 'push', '-q', 'origin', `atelier/${id}`);
  if (merge) { git(repo, 'merge', '-q', '--no-edit', `atelier/${id}`); git(repo, 'push', '-q', 'origin', 'main'); }
  git(repo, 'fetch', '-q', 'origin');
  return wt;
}

test('a landed task loses its worktree and branches; unmerged, recent and cancelled ones are handled apart', () => {
  const landed = taskBranch('land1', { merge: true });
  card({ id: 'land1', status: 'done', reason: 'landed on main by the lead', worktree: landed });
  const open = taskBranch('open1', { merge: false });
  card({ id: 'open1', status: 'done', reason: 'merged?', worktree: open });
  const fresh = taskBranch('new1', { merge: true });
  card({ id: 'new1', status: 'done', worktree: fresh, updated: new Date().toISOString() });
  const gone = taskBranch('cxl1', { merge: false });
  const tip = git(repo, 'rev-parse', 'atelier/cxl1');
  card({ id: 'cxl1', status: 'failed', reason: 'cancelled by owner', worktree: gone });
  const broke = taskBranch('fail1', { merge: false });
  card({ id: 'fail1', status: 'failed', reason: 'runner crashed', worktree: broke });

  const dry = tidy.pass({ all: true, dryRun: true });
  assert.deepEqual(dry.work.map(p => p.m.id).sort(), ['cxl1', 'land1']);
  assert.ok(fs.existsSync(landed), 'a dry run changes nothing');

  const r = tidy.pass({ all: true });
  assert.deepEqual(r.tidied.sort(), ['cxl1', 'land1']);
  assert.ok(!fs.existsSync(landed));
  assert.ok(!ok(repo, 'rev-parse', '--verify', '--quiet', 'refs/heads/atelier/land1'));
  assert.equal(git(origin, 'branch', '--list', 'atelier/land1'), '', 'the GitHub branch went too');
  assert.ok(fs.existsSync(open) && ok(repo, 'rev-parse', '--verify', 'refs/heads/atelier/open1'), 'unmerged work stays');
  assert.match(r.plans.find(p => p.m.id === 'open1').skip, /isn't in main/);
  assert.ok(fs.existsSync(fresh), 'a task that only just landed keeps its worktree a while');
  assert.ok(fs.existsSync(broke), 'a failed task may be extended, so it stays');
  assert.equal(git(repo, 'rev-parse', 'archive/cxl1'), tip, 'a cancelled task is kept as a tag');
  assert.equal(git(origin, 'rev-parse', 'archive/cxl1'), tip, '...on GitHub too');
  assert.ok(!fs.existsSync(gone) && !ok(repo, 'rev-parse', '--verify', '--quiet', 'refs/heads/atelier/cxl1'));

  assert.deepEqual(tidy.pass({ all: true }).work, [], 'tidied tasks are remembered');
  assert.equal(cards.load('land1').meta.updated, hourAgo, "the card's date doesn't move");
});

test('the tick only tidies tasks finished after tidying was switched on', () => {
  const wt = taskBranch('old1', { merge: true });
  card({ id: 'old1', status: 'done', worktree: wt, updated: '2026-01-01T00:00:00.000Z' });
  assert.ok(!tidy.pass().work.some(p => p.m.id === 'old1'));
  assert.ok(tidy.pass({ all: true, dryRun: true }).work.some(p => p.m.id === 'old1'));
});

test('a branch another unfinished task builds on stays', () => {
  const wt = taskBranch('basex', { merge: true });
  card({ id: 'basex', status: 'done', worktree: wt });
  card({ id: 'child', status: 'running', base: 'atelier/basex', branch: 'atelier/child' });
  const p = tidy.pass({ all: true, dryRun: true }).plans.find(p => p.m.id === 'basex');
  assert.match(p.skip, /builds on/);
});

test('proof screenshots and recordings stay out of git and reach the run folder', () => {
  assert.ok(tidy.isProofMedia('atelier/design/review/r3/home-390.png'));
  assert.ok(tidy.isProofMedia('atelier/design/proof/r5/clip.mp4'));
  assert.ok(!tidy.isProofMedia('atelier/design/app-static/icon.png'), "the product's own images are fine");
  assert.ok(!tidy.isProofMedia('src/web/review/logo.png'), 'only the planning folder');

  assert.equal(tidy.ensureExcludes(repo), true);
  assert.equal(tidy.ensureExcludes(repo), false, 'added once');
  const wt = taskBranch('media1', { merge: false });
  const before = git(wt, 'rev-parse', 'HEAD');
  fs.mkdirSync(path.join(wt, 'atelier/design/review'), { recursive: true });
  fs.writeFileSync(path.join(wt, 'atelier/design/review/shot.png'), 'png');
  fs.mkdirSync(path.join(wt, 'atelier/design/proof'), { recursive: true });
  fs.writeFileSync(path.join(wt, 'atelier/design/proof/clip.webm'), 'webm');
  fs.writeFileSync(path.join(wt, 'atelier/design/page.html'), '<p>kept</p>');
  git(wt, 'add', '-A');
  assert.doesNotMatch(git(wt, 'diff', '--cached', '--name-only'), /shot\.png/, 'git add -A skips the screenshot');
  git(wt, 'add', '-f', 'atelier/design/proof/clip.webm');
  git(wt, 'commit', '-q', '-m', 'design');

  const dir = path.join(root, 'run-media1');
  const moved = tidy.keepMediaOut({ id: 'media1', base: 'main' }, wt, before, dir);
  assert.deepEqual(moved, ['atelier/design/proof/clip.webm']);
  assert.equal(git(wt, 'ls-files', 'atelier'), 'atelier/design/page.html');
  assert.ok(fs.existsSync(path.join(wt, 'atelier/design/proof/clip.webm')), 'still on disk for pages in the worktree');
  assert.equal(fs.readFileSync(path.join(dir, 'evidence/from-worktree/atelier/design/review/shot.png'), 'utf8'), 'png');
  assert.equal(fs.readFileSync(path.join(dir, 'evidence/from-worktree/atelier/design/proof/clip.webm'), 'utf8'), 'webm');
});
