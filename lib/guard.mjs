// PreToolUse hook: an agent may write only where its role owns, and never to frozen planning docs.
import path from 'node:path';
import { paths } from './home.mjs';
import * as project from './project.mjs';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

export function check(input, env = process.env) {
  if (!WRITE_TOOLS.has(input?.tool_name)) return null;
  const target = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (!target) return null;

  const root = env.CREW_ROOT;            // worktree for runners, main checkout for the lead
  if (!root) return null;                // not a crew session: stay out of the way
  const role = env.CREW_ROLE || '';
  const p = project.tryLoad(env.CREW_PROJECT);
  const abs = path.resolve(root, target);

  // Crew's own bookkeeping is always writable.
  for (const ok of [env.CREW_RUN_DIR, paths.lessons].filter(Boolean)) {
    if (within(abs, ok)) return null;
  }
  if (!within(abs, root)) {
    return `Blocked: ${target} is outside your working tree (${root}). Work only in your worktree and crew run folder.`;
  }

  const rel = path.relative(root, abs).split(path.sep).join('/');
  const frozen = project.frozenGlobs(p).find(g => matches(rel, g));
  if (frozen) {
    return role === 'lead'
      ? `Blocked: ${rel} is frozen because its gate is approved. Reopen the gate with the owner's agreement first: crew gate ${env.CREW_PROJECT} <phase> reopen --quote "<owner's words>"`
      : `Blocked: ${rel} is a frozen planning document (its gate is approved). File a request to the lead instead: crew request --to lead "<what should change and why>"`;
  }
  const owns = project.ownsFor(p, role);
  // Overlapping globs: the most specific owner wins (backend's src/api/** beats frontend's src/**).
  // The generalist builder is exempt so integration tasks can touch everything.
  const mine = specificity(rel, owns);
  const rival = role === 'builder' || role === 'lead' ? null : p?.roster
    .filter(r => r.role !== role && r.role !== 'builder')
    .map(r => ({ role: r.role, score: specificity(rel, r.owns) }))
    .sort((a, b) => b.score - a.score)[0];
  if (mine >= 0 && rival && rival.score > mine) {
    return `Blocked: ${rel} belongs to ${rival.role} (a more specific owner than your ${owns.join(', ')}). Ask with: crew request --to ${rival.role} "<what you need>"`;
  }
  if (mine < 0) {
    const who = p?.roster.find(r => r.role !== role && r.owns.some(g => matches(rel, g)))?.role;
    return `Blocked: as ${role || 'this task'} you don't own ${rel} (you own: ${owns.join(', ') || 'nothing — read-only role'}).` +
      (who ? ` It belongs to ${who}; ask with: crew request --to ${who} "<what you need>"` : ' Ask the lead with: crew request --to lead "<what you need>"');
  }
  return null;
}

// How specifically a set of globs claims a path: length of the matching glob's literal prefix, or -1.
function specificity(rel, globs) {
  let best = -1;
  for (const g of globs) if (matches(rel, g)) best = Math.max(best, g.split(/[*?[{]/)[0].length);
  return best;
}

export function matches(rel, glob) {
  if (glob === '**') return true;
  return path.posix.matchesGlob(rel, glob) || path.posix.matchesGlob(rel, glob.replace(/\/\*\*$/, ''));
}

function within(abs, dir) {
  const r = path.relative(path.resolve(dir), abs);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
}

// Hook settings handed to every crew-launched claude session.
export function hookSettings() {
  return {
    hooks: {
      PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: 'crew guard' }] }],
    },
  };
}
