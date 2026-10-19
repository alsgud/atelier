// Projects: a registered repo plus its roster, trust level, gates, and overrule log.
import fs from 'node:fs';
import path from 'node:path';
import { HOME, PKG, readJson, writeJson } from './home.mjs';
import * as cards from './card.mjs';

export const PROJECTS = path.join(HOME, 'projects');
export const PHASES = ['brief', 'spec', 'design', 'contracts'];
export const TRUST = ['strict', 'standard', 'loose'];

// Planning docs per gate: frozen once that gate is approved.
export const PHASE_DOCS = {
  brief: ['atelier/BRIEF.md'],
  spec: ['atelier/SPEC.md', 'atelier/acceptance/**'],
  design: ['atelier/DESIGN.md', 'atelier/design/**'],
  contracts: ['atelier/contracts/**'],
};

export const ROSTERS = {
  pair: ['builder', 'reviewer'],
  team: ['designer', 'frontend', 'backend', 'reviewer'],
  game: ['game-designer', 'gameplay', 'systems', 'reviewer'],
};

const LEAD_OWNS = ['atelier/**'];

export function file(alias) {
  return path.join(PROJECTS, `${alias}.json`);
}

export function exists(alias) {
  return fs.existsSync(file(alias));
}

export function load(alias) {
  const p = readJson(file(alias), null);
  if (!p) throw new Error(`"${alias}" isn't a project yet. Run: atelier project init ${alias}`);
  return p;
}

export function tryLoad(alias) {
  return alias ? readJson(file(alias), null) : null;
}

export function save(p) {
  fs.mkdirSync(PROJECTS, { recursive: true });
  writeJson(file(p.alias), p);
  return p;
}

export function init(alias, { roster = 'team', trust = 'strict' } = {}) {
  if (exists(alias)) throw new Error(`project ${alias} already exists`);
  if (!ROSTERS[roster]) throw new Error(`unknown roster "${roster}" (pair, team, game)`);
  if (!TRUST.includes(trust)) throw new Error(`unknown trust "${trust}" (${TRUST.join(', ')})`);
  return save({
    alias,
    roster: ROSTERS[roster].map(role => ({ role, owns: roleTemplate(role).owns })),
    trust,
    gates: Object.fromEntries(PHASES.map(ph => [ph, null])),
    overrules: [],
    created: new Date().toISOString(),
  });
}

export function roleTemplate(role) {
  const f = path.join(PKG, 'roles', `${role}.md`);
  if (!fs.existsSync(f)) throw new Error(`no role template "${role}" (see ${path.join(PKG, 'roles')})`);
  const text = fs.readFileSync(f, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const meta = {};
  for (const line of (m?.[1] || '').split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return {
    role, title: meta.title || role,
    owns: (meta.owns || '').split(',').map(s => s.trim()).filter(Boolean),
    prompt: (m?.[2] || text).trim(),
    file: f,
  };
}

export function roles() {
  return fs.readdirSync(path.join(PKG, 'roles')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''));
}

// Owned globs for a role in a project: the project's roster entry wins over the template default.
export function ownsFor(p, role) {
  if (!role) return ['**'];
  if (role === 'lead') return LEAD_OWNS;
  const entry = p?.roster.find(r => r.role === role);
  if (entry) return entry.owns;
  return roleTemplate(role).owns;
}

export function frozenGlobs(p) {
  if (!p) return [];
  return PHASES.filter(ph => p.gates[ph]?.status === 'approved').flatMap(ph => PHASE_DOCS[ph]);
}

export function hasReviewer(p) {
  return !!p?.roster.some(r => r.role === 'reviewer');
}

// Gates that must be approved (or skipped) before a task may be queued. A planning task
// (`phase` = design or contracts) needs the gates before its phase; a build task needs all
// of them, or only the brief at loose trust.
export function missingGates(p, { phase } = {}) {
  if (!p) return [];
  let need;
  if (phase) {
    if (!PHASES.includes(phase) || PHASES.indexOf(phase) < 2) throw new Error(`--phase must be design or contracts (brief and spec are written by the lead)`);
    need = PHASES.slice(0, PHASES.indexOf(phase));
  } else {
    need = p.trust === 'loose' ? ['brief'] : PHASES;
  }
  return need.filter(ph => !['approved', 'skipped'].includes(p.gates[ph]?.status));
}

export function setGate(p, phase, status, quote) {
  if (!PHASES.includes(phase)) throw new Error(`unknown phase "${phase}" (${PHASES.join(', ')})`);
  p.gates[phase] = status === 'reopen' ? null : { status, quote, at: new Date().toISOString() };
  return save(p);
}

export function tasks(alias) {
  return cards.all().filter(c => c.meta.project === alias);
}

export function nextPhase(p) {
  return PHASES.find(ph => !['approved', 'skipped'].includes(p.gates[ph]?.status)) || 'build';
}
