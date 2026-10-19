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
  const data = readLead(alias);
  data.sessions[sessionId] = { cost: Number((tokens * rate).toFixed(2)), tokens, model };
  fs.writeFileSync(leadFile(alias), JSON.stringify(data, null, 2));
  return data.sessions[sessionId].cost;
}

function readLead(alias) {
  try {
    const d = JSON.parse(fs.readFileSync(leadFile(alias), 'utf8'));
    if (d.day === day()) return d;
  } catch { /* new day or no file */ }
  return { day: day(), sessions: {} };
}

// Everything the project has spent today: task runs that ended today, live runs, and the lead.
export function today(alias) {
  const since = midnight();
  let tasks = 0;
  for (const c of cards.all().filter(c => c.meta.project === alias)) {
    for (const r of usage.runs(c.meta.id)) if (r.ended >= since && r.done) tasks += r.cost;
    if (c.meta.status === 'running') tasks += usage.forTask(c.meta).liveCost || 0;
  }
  const lead = Object.values(readLead(alias).sessions).reduce((n, s) => n + s.cost, 0);
  const limit = limits(alias).day;
  const spent = Number((tasks + lead).toFixed(2));
  return { spent, tasks: Number(tasks.toFixed(2)), lead: Number(lead.toFixed(2)), limit, over: spent >= limit };
}
