// PreToolUse hook: an agent may write only where its role owns, and never to frozen planning docs.
import path from 'node:path';
import { paths, resolveRepo } from './home.mjs';
import * as project from './project.mjs';
import * as screen from './screen.mjs';

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

export function check(input, env = process.env) {
  // Shell commands from task agents: nothing may open a window on the owner's screen without a grant.
  if (SHELL_TOOLS.has(input?.tool_name)) {
    const cmd = String(input.tool_input?.command || '');
    if (!env.ATELIER_TASK || !env.ATELIER_PROJECT || /^\s*atelier\s/.test(cmd)) return null;
    const p = project.tryLoad(env.ATELIER_PROJECT);
    // The main checkout is the owner's live copy (real data, the running app): task agents stay in their worktree.
    const main = mainCheckoutVariants(env.ATELIER_PROJECT);
    if (main.some(v => cmd.toLowerCase().includes(v))) {
      return `Blocked: this command reaches into the project's main folder, which is the owner's live copy (their real data and the running app). Work only in your worktree (${env.ATELIER_ROOT}). If you need something from the owner's real data, ask the lead.`;
    }
    // Paid commands (GPU runs, bulk generation) need the lead's approval on this task, with a ceiling.
    const paid = (p?.paidCommands || []).find(x => new RegExp(x.pattern, 'i').test(cmd));
    if (paid && !env.ATELIER_PAID) {
      return `Blocked: "${paid.label}" costs real money outside the Claude plan, and this task isn't approved for paid runs. Plan the run (what it answers, size, expected and maximum cost) and ask the lead: atelier request --to lead "<the plan>". The lead approves with --paid "<what, up to $N>".`;
    }
    // The owner's screen, speakers and microphone: windows and live sessions only with their OK.
    const live = (p?.liveCommands || []).find(x => new RegExp(x.pattern, 'i').test(cmd));
    if (live && !screen.granted(env.ATELIER_PROJECT, env.ATELIER_TASK)) {
      return `Blocked: "${live.label}" would use the owner's speakers, microphone or live accounts. Work from audio files instead: feed recorded or synthesised speech in, and write replies to files. If you truly need a live session, ask once: atelier screen request --why "<what and why>" --minutes <how long>`;
    }
    if (!screen.launchReason(cmd) || screen.granted(env.ATELIER_PROJECT, env.ATELIER_TASK)) return null;
    return screen.blockMessage(env.ATELIER_PROJECT, env.ATELIER_TASK);
  }
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

// The project's main checkout as it may appear in a shell command (Windows, forward-slash and Git Bash forms).
function mainCheckoutVariants(alias) {
  let repo;
  try { repo = path.resolve(resolveRepo(alias)); } catch { return []; }
  const fwd = repo.replace(/\\/g, '/');
  const bash = fwd.replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
  const home = fwd.replace(/^.*?\/Users\/[^/]+/i, '~');
  return [...new Set([repo, fwd, bash, home].filter(v => v.length > 3).map(v => v.toLowerCase()))];
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
      PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell', hooks: [{ type: 'command', command: 'atelier guard' }] }],
    },
  };
}
