// One place that computes a project's state for both the CLI and the dashboard: dials, gates, criteria,
// audit findings, cost, the owner's overhead, and whether the team has earned a looser dial.
import * as project from './project.mjs';
import * as decisions from './decisions.mjs';
import * as auditor from './auditor.mjs';
import * as cards from './card.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { resolveRepo, paths } from './home.mjs';
import * as events from './events.mjs';
import * as usage from './usage.mjs';

const LOOSER = { trust: { strict: 'standard', standard: 'loose' }, reporting: { everything: 'daily', daily: 'exceptions' } };

export function status(alias) {
  const p = project.load(alias);
  const dials = project.dials(p);
  const tasks = project.tasks(alias).map(c => c.meta);
  const criteria = decisions.loadCriteria(alias).criteria;
  const findings = auditor.loadFindings(alias);
  const hit = auditor.hitRate(alias);
  let repo = '';
  try { repo = resolveRepo(alias); } catch { /* unregistered */ }

  const use = new Map(tasks.map(t => [t.id, usage.forTask(t)]));
  const cost = tasks.reduce((n, t) => n + use.get(t.id).cost, 0);
  const liveCost = tasks.reduce((n, t) => n + use.get(t.id).liveCost, 0);
  const met = criteria.filter(c => c.status === 'pass' || c.status === 'accepted').length;
  const since = Date.parse(p.dialChangedAt || p.created || 0);
  const overrulesSince = p.overrules.filter(o => Date.parse(o.at) > since).length;
  const approvalsSince = (p.approvals || 0) - (p.approvalsAtDialChange || 0);
  const openHigh = findings.filter(f => f.status === 'open' && f.severity === 'high');

  // Earned autonomy: enough approvals since the last dial change, few overrules, no unresolved high drift.
  const suggestion = (() => {
    const next = LOOSER.trust[p.trust] || LOOSER.reporting[dials.reporting];
    if (!next) return null;
    const ok = approvalsSince >= dials.promote.approvals && overrulesSince <= dials.promote.maxOverrules && !openHigh.length;
    const dial = LOOSER.trust[p.trust] ? 'trust' : 'reporting';
    return {
      dial, to: next, ready: ok,
      why: `${approvalsSince}/${dials.promote.approvals} approvals and ${overrulesSince} overrule(s) (max ${dials.promote.maxOverrules}) since the last change${openHigh.length ? `, ${openHigh.length} open high-severity audit finding(s)` : ''}`,
    };
  })();

  return {
    alias, repo,
    phase: project.nextPhase(p),
    trust: p.trust, reporting: dials.reporting, autonomy: p.autonomy || 'pr', suite: p.suite || '',
    ownerGates: dials.ownerGates, summaryStyle: dials.summaryStyle,
    charter: p.charter ? { ...p.charter, tampered: repo ? decisions.charterTampered(alias, repo) : false } : null,
    gates: p.gates, roster: p.roster, reviewer: dials.reviewer,
    tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status, role: t.role, reason: t.reason, iteration: t.iteration, iterations: t.iterations, criteria: t.criteria, cost: use.get(t.id).cost, liveCost: use.get(t.id).liveCost, liveTokens: use.get(t.id).liveTokens, tokens: use.get(t.id).tokens, eta: usage.eta(t, use.get(t.id)), iterStarted: t.iter_started || null, pr: t.pr, updated: t.updated, kind: t.kind, test_touch: t.test_touch, now: t.status === 'running' ? latestNote(t.id) : '' })),
    criteria, findings, hit,
    metrics: {
      cost: Number(cost.toFixed(2)),
      liveCost: Number(liveCost.toFixed(2)),
      costPerCriterion: met ? Number((cost / met).toFixed(2)) : null,
      criteriaMet: met, criteriaTotal: criteria.filter(c => decisions.isApproved(c)).length,
      approvals: p.approvals || 0, overrules: p.overrules.length,
      findingsJudged: hit.judged, findingsConfirmed: hit.confirmed,
    },
    suggestion,
    lastAudit: p.lastAudit || null,
    overrules: p.overrules.slice(-5),
  };
}

export function render(s) {
  const out = [
    `${s.alias} · phase ${s.phase} · trust ${s.trust} · reporting ${s.reporting} · autonomy ${s.autonomy}`,
    `charter: ${s.charter ? `approved ${s.charter.approvedAt.slice(0, 10)}${s.charter.tampered ? ' — CHANGED SINCE APPROVAL' : ''}` : 'not approved yet'} · full suite: ${s.suite || 'not set'} · reviewer: ${s.reviewer.model} (${s.reviewer.effort})`,
    '', 'Gates:',
    ...project.PHASES.map(ph => { const g = s.gates[ph]; return `  ${ph.padEnd(10)} ${g ? `${g.status} ${(g.at || '').slice(0, 10)}${g.quote ? ` — "${g.quote}"` : g.summary ? ` — ${g.summary.slice(0, 80)}` : ''}` : 'open'}`; }),
    '', 'Roster:',
    ...s.roster.map(r => `  ${r.role.padEnd(14)}${r.model ? ` [${r.model}]` : ''} owns ${r.owns.join(', ') || 'nothing (read-only)'}`),
    '',
    `Criteria: ${s.metrics.criteriaMet}/${s.metrics.criteriaTotal} met · ${s.criteria.filter(c => c.status === 'draft').length} draft · ${s.criteria.filter(c => c.status === 'awaiting-owner').length} awaiting your judgement`,
    `Audit: ${s.lastAudit ? `last ${s.lastAudit.at.slice(0, 16).replace('T', ' ')} on ${s.lastAudit.product}` : 'never run'} · ${s.findings.filter(f => f.status === 'open').length} open finding(s) · hit rate ${s.hit.confirmed}/${s.hit.judged}`,
    `Cost: $${s.metrics.cost} API-equivalent${s.metrics.costPerCriterion !== null ? ` · $${s.metrics.costPerCriterion} per criterion met` : ''}`,
    `Your overhead: ${s.metrics.approvals} approvals · ${s.metrics.overrules} overrules · ${s.metrics.findingsJudged} findings judged`,
  ];
  if (s.suggestion) out.push(`Next dial: ${s.suggestion.dial} → ${s.suggestion.to}: ${s.suggestion.ready ? 'ready (your call)' : 'not yet'} — ${s.suggestion.why}`);
  return out.join('\n');
}

// What a running task is doing right now: its newest progress note, or its last event.
function latestNote(id) {
  try {
    const f = path.join(paths.runs, id, 'PROGRESS.md');
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      if (lines.length) return lines.at(-1).replace(/^[-*]\s*/, '').slice(0, 200);
    }
  } catch { /* fall through */ }
  const ev = events.read({ sinceMin: 24 * 60 }).filter(e => e.id === id).at(-1);
  return ev ? `${ev.type}: ${ev.msg}`.slice(0, 200) : 'starting up';
}
