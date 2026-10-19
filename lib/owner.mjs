// Owner-only actions. Agents can request these but never perform them: the CLI allows them only from an
// interactive terminal (agents' shells aren't), and the dashboard calls these functions directly.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';
import * as decisions from './decisions.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as gitx from './git.mjs';
import { resolveRepo } from './home.mjs';

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
  if (gitx.git(repo, 'symbolic-ref', '--short', 'HEAD').out !== base) throw new Error(`main checkout isn't on ${base}`);
  if (gitx.git(repo, 'status', '--porcelain', '--untracked-files=no').out) throw new Error('main checkout has uncommitted changes');
  gitx.must(repo, 'merge', '--no-ff', m.branch, '-m', `atelier: merge ${id} (${phase} approved)`);
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
  const allowed = { trust: project.TRUST, reporting: ['everything', 'daily', 'exceptions'], autonomy: ['pr', 'merge', 'branch'], summaryStyle: ['plain', 'technical'] };
  if (!allowed[dial]?.includes(value)) throw new Error(`${dial} must be one of ${allowed[dial]?.join(', ')}`);
  if (dial === 'autonomy' && value === 'merge' && !project.hasReviewer(p)) throw new Error('merge mode needs a reviewer on the roster');
  p[dial] = value;
  if (dial === 'trust' || dial === 'reporting') { p.dialChangedAt = new Date().toISOString(); p.approvalsAtDialChange = p.approvals || 0; }
  project.save(p);
  events.emit(alias, dial, value);
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
