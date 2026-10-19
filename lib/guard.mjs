// PreToolUse hook: an agent may write only where its role owns, and never to frozen planning docs.
import path from 'node:path';
import { paths } from './home.mjs';
import * as project from './project.mjs';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

export function check(input, env = process.env) {
  if (!WRITE_TOOLS.has(input?.tool_name)) return null;
  const target = input.tool_input?.file_path || input.tool_input?.notebook_path;
  if (!target) return null;

  const root = env.ATELIER_ROOT;            // worktree for runners, main checkout for the lead
  if (!root) return null;                // not a atelier session: stay out of the way
  const role = env.ATELIER_ROLE || '';
  const p = project.tryLoad(env.ATELIER_PROJECT);
  const abs = path.resolve(root, target);

  // Atelier's own bookkeeping is always writable.
  for (const ok of [env.ATELIER_RUN_DIR, paths.lessons].filter(Boolean)) {
    if (within(abs, ok)) return null;
  }
  if (!within(abs, root)) {
    return `Blocked: ${target} is outside your working tree (${root}). Work only in your worktree and atelier run folder.`;
  }

  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (project.PROTECTED.some(g => matches(rel, g))) {
    return rel.endsWith('CHARTER.md')
      ? `Blocked: ${rel} is the owner's charter. Only the owner changes it (in the dashboard). If you think it's wrong or unclear, raise it with the owner.`
      : `Blocked: ${rel} changes only through 'atelier ruling add' (lead, after the owner rules), which records who changed what.`;
  }
  // Planning docs are the lead's, except ones a role explicitly owns (the designer's DESIGN.md, backend's contracts).
  if (role !== 'lead' && rel.startsWith('atelier/') && !project.ownsFor(p, role).some(g => g.startsWith('atelier/') && matches(rel, g))) {
    return `Blocked: ${rel} is a planning document owned by the lead. File a request: atelier request --to lead "<what should change and why>"`;
  }
  // A task can be narrowed to specific files so two specialists in the same role never collide.
  const taskFiles = (env.ATELIER_FILES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (taskFiles.length && role !== 'lead' && !taskFiles.some(g => matches(rel, g))) {
    return `Blocked: this task only owns ${taskFiles.join(', ')}; ${rel} is outside it. If the task truly needs it, file a request to the lead.`;
  }
  const frozen = project.frozenGlobs(p).find(g => matches(rel, g));
  if (frozen) {
    return role === 'lead'
      ? `Blocked: ${rel} is frozen because its gate is approved. Reopen the gate with the owner's agreement first: atelier gate ${env.ATELIER_PROJECT} <phase> reopen --quote "<owner's words>"`
      : `Blocked: ${rel} is a frozen planning document (its gate is approved). File a request to the lead instead: atelier request --to lead "<what should change and why>"`;
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
    return `Blocked: ${rel} belongs to ${rival.role} (a more specific owner than your ${owns.join(', ')}). Ask with: atelier request --to ${rival.role} "<what you need>"`;
  }
  if (mine < 0) {
    const who = p?.roster.find(r => r.role !== role && r.owns.some(g => matches(rel, g)))?.role;
    return `Blocked: as ${role || 'this task'} you don't own ${rel} (you own: ${owns.join(', ') || 'nothing — read-only role'}).` +
      (who ? ` It belongs to ${who}; ask with: atelier request --to ${who} "<what you need>"` : ' Ask the lead with: atelier request --to lead "<what you need>"');
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
  // Globs skip dotfiles by default, but an owner of core/** owns core/.gitignore too.
  const undotted = rel.replace(/(^|\/)\.(?=[^./])/g, '$1');
  return [rel, undotted].some(r => path.posix.matchesGlob(r, glob) || path.posix.matchesGlob(r, glob.replace(/\/\*\*$/, '')));
}

function within(abs, dir) {
  const r = path.relative(path.resolve(dir), abs);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
}

// Hook settings handed to every atelier-launched claude session.
export function hookSettings() {
  return {
    hooks: {
      PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: 'atelier guard' }] }],
    },
  };
}
