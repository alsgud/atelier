// Owner-only actions. Agents can request these but never perform them: the CLI allows them only from an
// interactive terminal (agents' shells aren't), and the dashboard calls these functions directly.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';
import * as decisions from './decisions.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as gitx from './git.mjs';
import { resolveRepo, paths } from './home.mjs';

// Set only inside the dashboard server process while it handles the owner's click. It's in-memory, so
// an agent can't fake it from a shell the way it could an environment variable.
let ownerContext = false;
export function asOwner(fn) {
  ownerContext = true;
  try { return fn(); } finally { ownerContext = false; }
}

export function assertOwner(action) {
  if (ownerContext) return;
  if (process.stdin.isTTY && process.stdout.isTTY && !process.env.ATELIER_TASK && process.env.ATELIER_ROLE !== 'lead') return;
  throw new Error(`"${action}" is the owner's decision. Ask the owner to approve it in the Atelier dashboard (or run it in their own terminal). To ask, use: atelier gate|criteria ... request`);
}

function baseOf(repo) {
  return gitx.git(repo, 'symbolic-ref', '--short', 'HEAD').out || 'main';
}

export function approveGate(alias, phase, quote, { skip = false, merge } = {}) {
  assertOwner(`gate ${phase} ${skip ? 'skip' : 'approve'}`);
  const p = project.load(alias);
  const repo = resolveRepo(alias);
  const base = baseOf(repo);
  if (!skip) {
    if (merge) mergeTaskBranch(repo, base, merge, phase);
    const must = { brief: ['atelier/BRIEF.md'], spec: ['atelier/SPEC.md'], design: ['atelier/DESIGN.md'], contracts: ['atelier/contracts/README.md'] }[phase] || [];
    const missing = must.filter(f => !gitx.git(repo, 'cat-file', '-e', `${base}:${f}`).ok && !gitx.git(repo, 'cat-file', '-e', `origin/${base}:${f}`).ok);
    if (missing.length) throw new Error(`can't approve ${phase}: ${missing.join(', ')} isn't committed yet`);
    p.approvals = (p.approvals || 0) + 1;
  }
  project.setGate(p, phase, skip ? 'skipped' : 'approved', quote);
  events.emit(alias, 'gate', `${phase} ${skip ? 'skipped' : 'approved'} by owner: "${quote}"`);
  return project.nextPhase(project.load(alias));
}

// A phase the owner delegated: the lead's request approves it straight away, on the record.
export function approveGateDelegated(alias, phase, summary) {
  const p = project.load(alias);
  if (project.dials(p).ownerGates.includes(phase)) throw new Error(`${phase} needs the owner's approval`);
  const repo = resolveRepo(alias);
  const base = baseOf(repo);
  const must = { brief: ['atelier/BRIEF.md'], spec: ['atelier/SPEC.md'], design: ['atelier/DESIGN.md'], contracts: ['atelier/contracts/README.md'] }[phase] || [];
  const missing = must.filter(f => !gitx.git(repo, 'cat-file', '-e', `${base}:${f}`).ok && !gitx.git(repo, 'cat-file', '-e', `origin/${base}:${f}`).ok);
  if (missing.length) throw new Error(`can't approve ${phase}: ${missing.join(', ')} isn't committed yet`);
  project.setGate(p, phase, 'approved', `delegated to the lead: ${summary}`);
  events.emit(alias, 'gate', `${phase} approved by the lead (the owner delegated this phase): ${summary.slice(0, 160)}`);
  return project.nextPhase(project.load(alias));
}

function mergeTaskBranch(repo, base, id, phase) {
  const m = cards.load(id).meta;
  const on = gitx.git(repo, 'symbolic-ref', '--short', 'HEAD').out;
  if (on !== base) throw new Error(`can't add ${id} to ${base}: the project folder is switched to "${on}". Switch it back to ${base}, then approve again.`);
  // Rulings, the ledger and the lead's notes are written straight into the project folder; they're Atelier's own
  // records, so they're saved as a commit here instead of blocking the merge.
  const dirty = gitx.git(repo, 'diff', '--name-only', 'HEAD').out.split('\n').map(s => s.trim()).filter(Boolean);
  const records = dirty.filter(f => f.startsWith('atelier/'));
  if (records.length) {
    gitx.must(repo, 'add', '--', ...records);
    gitx.must(repo, 'commit', '--no-verify', '-m', `atelier: save the lead's records before merging ${id}`, '--', ...records);
  }
  const other = dirty.filter(f => !f.startsWith('atelier/'));
  if (other.length) throw new Error(`can't add ${id} to ${base} yet: ${other.length === 1 ? 'a file in the project folder has' : `${other.length} files in the project folder have`} unsaved edits (${other.slice(0, 4).join(', ')}${other.length > 4 ? ', …' : ''}). Commit or undo them, then approve again.`);
  const r = gitx.git(repo, 'merge', '--no-ff', m.branch, '-m', `atelier: merge ${id} (${phase} approved)`);
  if (!r.ok) {
    gitx.git(repo, 'merge', '--abort');
    throw new Error(`can't add ${id} to ${base}: its changes clash with what's there now. Nothing was changed; ask the lead to bring ${id} up to date.`);
  }
}

export function approveCharter(alias, quote) {
  assertOwner('charter approve');
  const hash = decisions.approveCharter(alias, resolveRepo(alias), quote);
  events.emit(alias, 'charter', `approved by owner (${hash})`);
  return hash;
}

export function criterion(alias, id, action, note = '') {
  assertOwner(`criteria ${action}`);
  const map = { approve: 'approved', retire: 'retired', accept: 'accepted', reject: 'rejected' };
  if (!map[action]) throw new Error('action must be approve, retire, accept or reject');
  const c = decisions.setStatus(alias, id, map[action], 'owner', note);
  if (action === 'approve' || action === 'accept') { const p = project.load(alias); p.approvals = (p.approvals || 0) + 1; project.save(p); }
  if (action === 'reject') {
    // A rejection is a ruling in the making: the lead must sharpen the criterion and record the ruling before rework.
    const p = project.load(alias);
    p.overrules.push({ at: new Date().toISOString(), text: `${id} rejected: ${note}` });
    project.save(p);
  }
  events.emit(alias, `criterion-${action}`, `${id}${note ? `: ${note}` : ''}`);
  return c;
}

export function approveTask(id) {
  assertOwner('approve task plan');
  const m = cards.load(id).meta;
  if (m.status !== 'planned') throw new Error(`${id} is ${m.status}, not planned`);
  cards.update(id, { status: 'queued', reason: '' });
  if (m.project) { const p = project.load(m.project); p.approvals = (p.approvals || 0) + 1; project.save(p); }
  events.emit(id, 'approved', `plan approved by owner: ${m.title}`);
}

export function setDial(alias, dial, value) {
  assertOwner(`set ${dial}`);
  const p = project.load(alias);
  if (dial === 'ownerGates') {
    const list = (Array.isArray(value) ? value : String(value).split(',')).map(s => s.trim()).filter(Boolean);
    if (list.some(ph => !project.PHASES.includes(ph))) throw new Error(`phases must be among ${project.PHASES.join(', ')}`);
    p.ownerGates = list;
    project.save(p);
    events.emit(alias, 'ownerGates', list.length ? `you approve: ${list.join(', ')}` : 'all phases delegated to the lead');
    return;
  }
  if (dial === 'budgetTask' || dial === 'budgetDay') {
    const n = Number(value);
    if (!(n > 0 && n <= 10000)) throw new Error('budget must be a dollar amount above 0');
    p.budget = { ...project.dials(p).budget, [dial === 'budgetTask' ? 'task' : 'day']: Math.round(n * 100) / 100 };
    project.save(p);
    events.emit(alias, 'budget', `${dial === 'budgetTask' ? 'per-task' : 'daily'} budget set to $${p.budget[dial === 'budgetTask' ? 'task' : 'day']}`);
    return;
  }
  const allowed = { trust: project.TRUST, reporting: ['everything', 'daily', 'exceptions'], autonomy: ['pr', 'merge', 'branch'], summaryStyle: ['plain', 'technical'] };
  if (!allowed[dial]?.includes(value)) throw new Error(`${dial} must be one of ${allowed[dial]?.join(', ')}`);
  if (dial === 'autonomy' && value === 'merge' && !project.hasReviewer(p)) throw new Error('merge mode needs a reviewer on the roster');
  p[dial] = value;
  if (dial === 'trust' || dial === 'reporting') { p.dialChangedAt = new Date().toISOString(); p.approvalsAtDialChange = p.approvals || 0; }
  project.save(p);
  events.emit(alias, dial, value);
}

// Plan-limit headroom for the owner's own use (global, all projects).
export function setPace(fiveHour, sevenDay, spread) {
  assertOwner('set plan limits');
  const f = paths.config;
  const cfg = JSON.parse(fs.readFileSync(f, 'utf8'));
  const n = (v, lo, hi) => { const x = Number(v); if (!(x >= lo && x <= hi)) throw new Error(`limit must be between ${lo} and ${hi}`); return x; };
  cfg.pace = { ...cfg.pace, ...(fiveHour !== undefined ? { fiveHour: n(fiveHour, 10, 100) } : {}), ...(sevenDay !== undefined ? { sevenDay: n(sevenDay, 10, 100) } : {}), ...(spread !== undefined ? { spread: !!spread } : {}) };
  fs.writeFileSync(f, JSON.stringify(cfg, null, 2));
  events.emit('atelier', 'pace', `plan limits: stop at ${cfg.pace.fiveHour}% (5h) and ${cfg.pace.sevenDay}% (week)${cfg.pace.spread ? ', paced evenly' : ''}`);
  return cfg.pace;
}

// Holdout tests: moved out of the repo into atelier's state so no specialist can read them.
export function setHoldout(alias, fromDir, command) {
  const dest = decisions.holdoutDir(alias);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(fromDir, dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'holdout.json'), JSON.stringify({ command }, null, 2));
  fs.rmSync(fromDir, { recursive: true, force: true });
  events.emit(alias, 'holdout', `holdout tests set (${command})`);
}
