// Spend limits, so the team can run unattended without the owner policing tokens by stopping tasks.
//   task limit: a task pauses when it reaches it, and the lead decides whether to extend it.
//   day limit:  once the project (every task plus the lead) has spent this today, nothing new starts;
//               only the owner raises it. Work resumes on its own the next day.
// Amounts are API-equivalent dollars, the same measure the dashboard shows.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';
import * as cards from './card.mjs';
import * as usage from './usage.mjs';

const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const day = () => new Date(midnight()).toISOString().slice(0, 10);

export function limits(alias) {
  return project.dials(project.tryLoad(alias)).budget;
}

export function taskLimit(meta) {
  return Number(meta.budget) || limits(meta.project).task;
}

export function taskSpend(meta) {
  const u = usage.forTask(meta);
  return u.cost + (u.liveCost || 0);
}

// The lead runs as an interactive session, so its spend is recorded by its Stop hook from the session
// transcript (tokens × the rate this machine's runs are actually charged).
function leadFile(alias) { return path.join(project.dir(alias), 'lead-usage.json'); }

export function recordLead(alias, sessionId, transcript) {
  if (!transcript || !fs.existsSync(transcript)) return 0;
  const msgs = new Map();
  let model = '';
  for (const line of fs.readFileSync(transcript, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type !== 'assistant' || !e.message?.usage) continue;
    if (e.timestamp && Date.parse(e.timestamp) < midnight()) continue;
    msgs.set(e.message.id || msgs.size, e.message.usage);
    model = e.message.model || model;
  }
  const tokens = [...msgs.values()].reduce((n, u) => n + usage.tokensOf(u), 0);
  const rates = usage.modelRates();
  const rate = rates[model] || Math.max(0, ...Object.values(rates));
  const all = readLeadAll(alias);
  const today = all.days[day()] ||= { sessions: {} };
  today.sessions[sessionId] = { cost: Number((tokens * rate).toFixed(2)), tokens, model };
  fs.writeFileSync(leadFile(alias), JSON.stringify(all, null, 2));
  return today.sessions[sessionId].cost;
}

// { days: { 'YYYY-MM-DD': { sessions: { id: { cost, tokens, model } } } } }; older files held one day.
function readLeadAll(alias) {
  try {
    const d = JSON.parse(fs.readFileSync(leadFile(alias), 'utf8'));
    if (d.days) return d;
    if (d.day) return { days: { [d.day]: { sessions: d.sessions || {} } } };
  } catch { /* none yet */ }
  return { days: {} };
}
function readLead(alias) { return readLeadAll(alias).days[day()] || { sessions: {} }; }
const sumSessions = s => Object.values(s?.sessions || {}).reduce((n, x) => n + x.cost, 0);

// Audit runs: each checker and cross-check log ends with a result line carrying its cost.
function auditRuns(alias) {
  const root = path.join(project.dir(alias), 'audits');
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const stamp of fs.readdirSync(root).filter(f => /^\d{4}-/.test(f))) {
    const dir = path.join(root, stamp);
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
      const file = path.join(dir, f);
      const text = fs.readFileSync(file, 'utf8');
      const i = text.lastIndexOf('"type":"result"');
      if (i < 0) continue;
      const m = /"total_cost_usd":([\d.]+)/.exec(text.slice(text.lastIndexOf('\n', i)));
      if (m) out.push({ cost: Number(m[1]), ended: fs.statSync(file).mtimeMs });
    }
  }
  return out;
}

// The one meter: everything the project has spent, ever: every task run (builds and reviews), the lead
// and the auditor.
export function total(alias) {
  let tasks = 0;
  for (const c of cards.all().filter(c => c.meta.project === alias)) {
    for (const r of usage.runs(c.meta.id)) if (r.done) tasks += r.cost;
    if (c.meta.status === 'running') tasks += usage.forTask(c.meta).liveCost || 0;
  }
  const lead = Object.values(readLeadAll(alias).days).reduce((n, d) => n + sumSessions(d), 0);
  const audits = auditRuns(alias).reduce((n, r) => n + r.cost, 0);
  const r2 = n => Number(n.toFixed(2));
  return { spent: r2(tasks + lead + audits), tasks: r2(tasks), lead: r2(lead), audits: r2(audits) };
}

// Everything the project has spent today: task runs that ended today, live runs, and the lead.
export function today(alias) {
  const since = midnight();
  let tasks = 0;
  for (const c of cards.all().filter(c => c.meta.project === alias)) {
    for (const r of usage.runs(c.meta.id)) if (r.ended >= since && r.done) tasks += r.cost;
    if (c.meta.status === 'running') tasks += usage.forTask(c.meta).liveCost || 0;
  }
  const lead = sumSessions(readLead(alias));
  const audits = auditRuns(alias).filter(r => r.ended >= since).reduce((n, r) => n + r.cost, 0);
  const limit = limits(alias).day;
  const spent = Number((tasks + lead + audits).toFixed(2));
  return { spent, tasks: Number(tasks.toFixed(2)), lead: Number(lead.toFixed(2)), audits: Number(audits.toFixed(2)), limit, over: spent >= limit };
}
