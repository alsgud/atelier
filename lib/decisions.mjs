// The decision layer: the owner's charter, rulings, acceptance criteria and hidden holdout tests.
// These are what every agent obeys and what the auditor checks the product against.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as project from './project.mjs';
import * as passcache from './passcache.mjs';

export const PLAN_DIR = 'atelier';
export const KINDS = ['test', 'property', 'review', 'owner'];
// status: draft (lead proposed) → approved (owner) → pass/fail (verification only) ; owner-kind: awaiting-owner → accepted/rejected
export const STATUSES = ['draft', 'approved', 'pass', 'fail', 'awaiting-owner', 'accepted', 'rejected', 'retired'];

export const paths = (repo) => ({
  charter: path.join(repo, PLAN_DIR, 'CHARTER.md'),
  rulings: path.join(repo, PLAN_DIR, 'RULINGS.md'),
});

// Criteria and their statuses live in atelier's state, not the repo: task branches would otherwise
// conflict every time verification flips a status, and no agent can edit them there.
export function criteriaFile(alias) {
  return path.join(project.dir(alias), 'criteria.json');
}

// Holdout tests live outside the repo so specialists never see them; the runner copies them in only to run them.
export function holdoutDir(alias) {
  return path.join(project.PROJECTS, alias, 'holdout');
}

// ---------- charter ----------

export function charterHash(repo) {
  const f = paths(repo).charter;
  return fs.existsSync(f) ? crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16) : null;
}

// The owner approves the charter; its hash is recorded so any later edit (by any means) is detectable.
export function approveCharter(alias, repo, quote) {
  const p = project.load(alias);
  const hash = charterHash(repo);
  if (!hash) throw new Error(`${PLAN_DIR}/CHARTER.md doesn't exist yet`);
  p.charter = { hash, approvedAt: new Date().toISOString(), quote };
  project.save(p);
  return hash;
}

export function charterTampered(alias, repo) {
  const p = project.tryLoad(alias);
  if (!p?.charter?.hash) return false;
  return charterHash(repo) !== p.charter.hash;
}

// ---------- rulings ----------

export function addRuling(repo, text, source = '') {
  const f = paths(repo).rulings;
  const existing = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '# Rulings\n\nThe owner\'s decisions, numbered. Every agent follows them. Where a ruling can be checked mechanically, it also exists as a criterion.\n';
  const n = (existing.match(/^## R-(\d+)/gm) || []).length + 1;
  const entry = `\n## R-${n}: ${text}\n_${new Date().toISOString().slice(0, 10)}${source ? ` · ${source}` : ''}_\n`;
  fs.writeFileSync(f, existing.trimEnd() + '\n' + entry);
  return `R-${n}`;
}

// ---------- criteria ----------

export function loadCriteria(alias) {
  const f = criteriaFile(alias);
  if (!fs.existsSync(f)) return { criteria: [] };
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

export function saveCriteria(alias, data) {
  fs.writeFileSync(criteriaFile(alias), JSON.stringify(data, null, 2) + '\n');
}

export function findCriterion(data, id) {
  const c = data.criteria.find(x => x.id === id);
  if (!c) throw new Error(`no criterion ${id}`);
  return c;
}

// Two levels. Owner outcomes: a handful of plain-language results the owner experiences; the owner
// approves them. Team checks: the technical tests the lead derives from those outcomes and the spec;
// the lead approves them itself, so they never cost the owner attention (the auditor still checks them).
export const LEVELS = ['owner', 'team'];

export function levelOf(c) {
  return c.level || (c.kind === 'owner' ? 'owner' : 'team');
}

export function addCriterion(alias, { statement, kind, verify, serves, level }) {
  if (!KINDS.includes(kind)) throw new Error(`kind must be one of ${KINDS.join(', ')}`);
  if ((kind === 'test' || kind === 'property') && !verify) throw new Error(`${kind} criteria need --verify "<command that exits 0 when met>"`);
  if (!serves) throw new Error('every criterion needs --serves: the charter line, requirement or ruling it exists for');
  const lvl = kind === 'owner' ? 'owner' : (level || 'team');
  if (!LEVELS.includes(lvl)) throw new Error(`--level must be owner or team`);
  const data = loadCriteria(alias);
  const n = data.criteria.reduce((m, c) => Math.max(m, Number(c.id.slice(3))), 0) + 1;
  const status = lvl === 'team' ? 'approved' : 'draft';
  const c = { id: `AC-${n}`, statement, kind, level: lvl, verify: verify || '', serves, status, history: [{ at: now(), status, by: 'lead' }] };
  data.criteria.push(c);
  saveCriteria(alias, data);
  return c;
}

export function setStatus(alias, id, status, by, note = '') {
  if (!STATUSES.includes(status)) throw new Error(`unknown status ${status}`);
  const data = loadCriteria(alias);
  const c = findCriterion(data, id);
  c.status = status;
  c.history = [...(c.history || []), { at: now(), status, by, ...(note && { note }) }];
  saveCriteria(alias, data);
  return c;
}

// Criterion ids as written by people and agents: "AC-1,AC-2", "AC-1 AC-2" and "ac-1, ac-2" all mean the same.
export function criteriaIds(v) {
  return String(v || '').split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
}

export function isApproved(c) {
  return !['draft', 'retired', 'rejected'].includes(c.status);
}

// Runs the mechanical criteria a task cites (plus holdouts) in a worktree. Only this flips status.
export function verify(alias, wt, ids, { timeoutMin = 15 } = {}) {
  const data = loadCriteria(alias);
  const results = [];
  for (const id of ids) {
    const c = data.criteria.find(x => x.id === id);
    if (!c) { results.push({ id, ok: false, out: `${id} is not a criterion of ${alias} (see atelier criteria ${alias} list)` }); continue; }
    if (c.kind === 'review' || c.kind === 'owner') { results.push({ id, ok: null, kind: c.kind }); continue; }
    const r = passcache.once(c.verify, wt, () => {
      const p = spawnSync(c.verify, { cwd: wt, shell: true, encoding: 'utf8', windowsHide: true, timeout: timeoutMin * 60_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...(project.tryLoad(alias)?.runEnv || {}) } });
      return { ok: p.status === 0, tail: `${p.stdout || ''}${p.stderr || ''}`.trim().split('\n').slice(-25).join('\n') };
    });
    results.push({ id, ok: r.ok, out: r.tail });
  }
  const holdout = runHoldouts(alias, wt, timeoutMin);
  return { results, holdout };
}

// Copies holdout tests into the worktree, runs them, removes them again. Specialists never see them.
export function runHoldouts(alias, wt, timeoutMin = 15) {
  const dir = holdoutDir(alias);
  const cfgFile = path.join(dir, 'holdout.json');
  if (!fs.existsSync(cfgFile)) return null;
  const { command } = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  const dest = path.join(wt, '.atelier-holdout');
  fs.cpSync(dir, dest, { recursive: true });
  try {
    const r = spawnSync(command, { cwd: wt, shell: true, encoding: 'utf8', windowsHide: true, timeout: timeoutMin * 60_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...(project.tryLoad(alias)?.runEnv || {}) } });
    return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-25).join('\n') };
  } finally {
    fs.rmSync(dest, { recursive: true, force: true });
  }
}

// Agents see a compact rendering of the decision layer in every prompt.
export function promptSection(alias, wt, citedIds = []) {
  const p = paths(wt);
  const out = [];
  if (fs.existsSync(p.charter)) out.push(`## Owner's charter (the source of truth; only the owner changes it)\n\n${fs.readFileSync(p.charter, 'utf8').trim()}`);
  if (fs.existsSync(p.rulings)) out.push(`## Owner's rulings (precedents every agent follows)\n\n${fs.readFileSync(p.rulings, 'utf8').replace(/^# Rulings[^\n]*\n/, '').trim()}`);
  const data = loadCriteria(alias);
  const cited = data.criteria.filter(c => citedIds.includes(c.id));
  if (cited.length) {
    out.push(`## Acceptance criteria this task must satisfy\n\n${cited.map(c => `- **${c.id}** (${c.kind}): ${c.statement}${c.verify ? `  \n  verified by: \`${c.verify}\`` : ''}  \n  serves: ${c.serves}`).join('\n')}`);
  }
  return out.join('\n\n');
}

export const TEST_GLOBS = ['**/*.test.*', '**/*.spec.*', 'test/**', 'tests/**', '__tests__/**', 'spec/**', `${PLAN_DIR}/acceptance/**`];

function now() { return new Date().toISOString(); }
