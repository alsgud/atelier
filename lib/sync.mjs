// Keeps GitHub up to date, so pushing never depends on an agent remembering to. Every tick:
//   merge autonomy: push the base branch when it is simply ahead of GitHub (the lead's commits, gate
//                   merges, anything that landed locally); never force, never touch a diverged base.
//   merge and pr:   push every unfinished task branch, so work in progress is backed up off this PC.
//   branch:         nothing leaves the machine.
import { spawnSync } from 'node:child_process';
import { resolveRepo } from './home.mjs';
import * as project from './project.mjs';
import * as events from './events.mjs';

function git(cwd, ...args) {
  // No credential prompts (nobody is there to answer) and a hard timeout, so a tick can't hang.
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 90_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || r.error?.message || '').trim() };
}

const count = (cwd, range) => Number(git(cwd, 'rev-list', '--count', range).out || 0);
const has = (cwd, ref) => git(cwd, 'rev-parse', '--verify', '--quiet', ref).ok;

export function syncProject(alias, cards) {
  const p = project.tryLoad(alias);
  const autonomy = p?.autonomy || 'pr';
  if (!p || autonomy === 'branch' || p.closed) return []; // a closed project keeps everything on this PC
  let repo;
  try { repo = resolveRepo(alias); } catch { return []; }
  if (!git(repo, 'remote', 'get-url', 'origin').ok) return [];
  const changes = [];
  const fetched = git(repo, 'fetch', '-q', '--prune', 'origin');
  const state = { at: new Date().toISOString(), ahead: 0, problem: fetched.ok ? '' : `can't reach GitHub: ${fetched.err.split('\n')[0]}` };

  if (fetched.ok && autonomy === 'merge') {
    const base = p.base || git(repo, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').out.replace(/^origin\//, '') || 'main';
    if (has(repo, `refs/remotes/origin/${base}`)) {
      const ahead = count(repo, `origin/${base}..${base}`), behind = count(repo, `${base}..origin/${base}`);
      if (ahead && behind) state.problem = `${base} here and on GitHub have both moved (${ahead} vs ${behind} commits); the lead needs to merge them`;
      else if (ahead) {
        const r = git(repo, 'push', 'origin', `refs/heads/${base}:refs/heads/${base}`);
        if (r.ok) { events.emit(alias, 'pushed', `${ahead} commit(s) on ${base} pushed to GitHub`); changes.push(`${alias}: pushed ${ahead} commit(s) on ${base}`); }
        else state.problem = `push of ${base} failed: ${r.err.split('\n').pop()}`;
      }
      state.ahead = state.problem ? count(repo, `origin/${base}..${base}`) : 0;
    }
  }

  if (fetched.ok) {
    for (const m of cards.map(c => c.meta).filter(m => m.project === alias && m.branch && !['done', 'failed', 'cancelled'].includes(m.status))) {
      if (!has(repo, `refs/heads/${m.branch}`)) continue;
      const remote = `refs/remotes/origin/${m.branch}`;
      if (has(repo, remote) && !count(repo, `${remote}..refs/heads/${m.branch}`)) continue;
      if (has(repo, remote) && count(repo, `refs/heads/${m.branch}..${remote}`)) continue; // moved on GitHub: leave it
      const r = git(repo, 'push', '-u', 'origin', `refs/heads/${m.branch}:refs/heads/${m.branch}`);
      if (r.ok) changes.push(`${alias}: backed up ${m.branch}`);
      else if (!state.problem) state.problem = `backup of ${m.branch} failed: ${r.err.split('\n').pop()}`;
    }
  }

  // Remember the outcome so the dashboard and the lead can see when GitHub is behind.
  const was = p.github?.problem || '';
  if (state.problem && state.problem !== was) events.emit(alias, 'push-failed', state.problem);
  if (was !== state.problem || (p.github?.ahead || 0) !== state.ahead || !p.github) {
    const fresh = project.load(alias);
    fresh.github = state;
    project.save(fresh);
  }
  return changes;
}
