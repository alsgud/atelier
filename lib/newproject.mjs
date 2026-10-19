// Creates a project from scratch: folder, git repo, optional private GitHub repo, registration,
// roster, shipping mode and planning scaffold. Used by the dashboard and `atelier new`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PKG, paths, readJson, writeJson } from './home.mjs';
import * as project from './project.mjs';
import * as gitx from './git.mjs';
import * as events from './events.mjs';

export function create({ name, roster = 'team', ship = 'merge', github = true, folder, description = '' }) {
  const alias = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!alias) throw new Error('give the project a name (letters and numbers)');
  if (project.exists(alias)) throw new Error(`a project called ${alias} already exists`);
  if (!project.ROSTERS[roster]) throw new Error(`unknown team shape "${roster}"`);
  const repo = folder ? path.resolve(folder) : path.join(os.homedir(), 'Documents', alias);
  const steps = [];

  if (!fs.existsSync(repo)) { fs.mkdirSync(repo, { recursive: true }); steps.push(`created ${repo}`); }
  if (!gitx.git(repo, 'rev-parse', '--git-dir').ok) {
    gitx.must(repo, 'init', '-q', '-b', 'main');
    steps.push('started a git repo');
  }
  if (!gitx.git(repo, 'rev-parse', '--verify', '--quiet', 'HEAD').ok) {
    const readme = path.join(repo, 'README.md');
    if (!fs.existsSync(readme)) fs.writeFileSync(readme, `# ${name}\n\n${description || 'Built with Atelier.'}\n`);
    if (!fs.existsSync(path.join(repo, '.gitignore'))) fs.writeFileSync(path.join(repo, '.gitignore'), 'node_modules/\ndist/\n.env\n');
    gitx.must(repo, 'add', '-A');
    gitx.must(repo, 'commit', '-q', '-m', 'Start project');
    steps.push('made the first commit');
  }

  // Register, then set up the team and the planning folder.
  const repos = readJson(paths.repos, {});
  repos[alias] = repo;
  writeJson(paths.repos, repos);
  const p = project.init(alias, { roster, trust: 'strict' });
  const planDir = path.join(repo, 'atelier');
  fs.mkdirSync(path.join(planDir, 'acceptance'), { recursive: true });
  for (const t of ['CHARTER.md', 'BRIEF.md', 'SPEC.md', 'PLAN.md', 'LEDGER.md']) {
    const dest = path.join(planDir, t);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(PKG, 'templates', t), dest);
  }
  steps.push(`set up a ${roster} team at strict gating`);

  if (github && !gitx.hasRemote(repo)) {
    const r = spawnSync('gh', ['repo', 'create', alias, '--private', '--source', repo, '--remote', 'origin', '--push', ...(description ? ['--description', description] : [])], { encoding: 'utf8', windowsHide: true });
    if (r.status === 0) steps.push(`created a private GitHub repo (${alias})`);
    else steps.push(`couldn't create the GitHub repo: ${(r.stderr || '').trim().split('\n').pop()}`);
  }

  // Shipping mode needs a remote (merge pushes to main; pr opens draft PRs).
  const hasRemote = gitx.hasRemote(repo);
  p.autonomy = hasRemote ? ship : 'branch';
  project.save(p);
  steps.push(hasRemote ? (ship === 'merge' ? 'reviewed work will go straight to main' : 'reviewed work will open draft PRs') : 'work stays on local branches (no GitHub repo)');
  events.emit(alias, 'project', `created: ${steps.join('; ')}`);
  return { alias, repo, steps };
}
