// A team is never left sitting with nothing running and nothing in the owner's Inbox (owner, 15 Nov: "work is
// paused and I have no idea why at a glance"). Idle means: the lead is on but between turns, no task is running,
// queued or being brought in, nothing waits on the owner, and yet work is unfinished (paused tasks, unanswered
// requests, open checklist lines). After a while the lead is told why, with the list; if the team is still idle
// after that, the owner gets an Inbox item saying why, with a button to wake the lead.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';
import * as asks from './asks.mjs';
import * as checklist from './checklist.mjs';
import * as events from './events.mjs';
import * as leadNow from './lead-activity.mjs';
import { alive } from './runner.mjs';

export const NUDGE_MIN = 10, OWNER_MIN = 30;
const file = alias => path.join(project.dir(alias), 'idle.json');
const read = alias => { try { return JSON.parse(fs.readFileSync(file(alias), 'utf8')); } catch { return null; } };

// A task the lead is bringing in right now (atelier land runs the full tests on the latest build).
export const landing = tasks => tasks.find(t => t.landing && alive(Number(t.landing_pid))) || null;

const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 90 ? `${m} min` : m < 48 * 60 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`; };

// Why the team is idle, in plain words, or null when it isn't.
export function reasons(alias) {
  const p = project.tryLoad(alias);
  if (!p || p.closed) return null;
  const dir = project.dir(alias);
  if (!fs.existsSync(path.join(dir, 'lead.wanted'))) return null;
  const pid = Number((() => { try { return fs.readFileSync(path.join(dir, 'lead.pid'), 'utf8').trim(); } catch { return 0; } })());
  if (!alive(pid)) return null; // a lead that's off is the supervisor's to restart
  const tasks = project.tasks(alias).map(c => c.meta);
  if (tasks.some(t => ['running', 'queued'].includes(t.status)) || landing(tasks)) return null;
  if (leadNow.forProject(alias)?.busy) return null;
  // Waiting on the owner is fine, as long as the owner can see it.
  const round = checklist.forOwner(alias);
  if (asks.forOwner(alias).length || round.proposed || round.review.length) return null;
  if (tasks.some(t => ['planned', 'needs-you'].includes(t.status))) return null;
  if (Object.values(p.gates || {}).some(g => g?.status === 'requested')) return null;

  const why = [];
  for (const t of tasks.filter(t => ['paused', 'stalled'].includes(t.status))) why.push({ id: t.id, text: `${t.title}: ${t.status === 'stalled' ? 'stalled' : 'paused'}, ${String(t.reason || 'no reason given').replace(/^for the lead: /, '').replace(/\. Extend with:.*$/, '')} (${ago(t.updated)} ago)` });
  for (const t of tasks.filter(t => t.status === 'requested')) why.push({ id: t.id, text: `${t.title.replace(/^Request: /, 'A request to the lead: ')} (unanswered for ${ago(t.created || t.updated)})` });
  const r = checklist.current(alias);
  const open = r?.status === 'active' ? r.items.filter(i => ['open', 'sent-back'].includes(i.status)) : [];
  if (open.length) why.push({ id: `round-${r.n}`, text: `${open.length} line${open.length > 1 ? 's' : ''} of round ${r.n} with nobody building ${open.length > 1 ? 'them' : 'it'} (${open.slice(0, 3).map(i => i.id).join(', ')}${open.length > 3 ? ', …' : ''})` });
  if (!r) why.push({ id: 'no-round', text: 'No checklist is open, so nothing can start until the lead proposes the next one' });
  return why.length ? why : null;
}

// Each scheduler pass: start, keep or clear the idle clock, and tell the lead once per idle stretch.
export function pass(changes = []) {
  for (const alias of project.list()) {
    let why = null;
    try { why = reasons(alias); } catch { continue; }
    const s = read(alias);
    if (!why) { if (s) fs.rmSync(file(alias), { force: true }); continue; }
    const now = new Date().toISOString();
    const state = s || { since: now };
    state.why = why;
    if (!state.nudged && Date.now() - Date.parse(state.since) >= NUDGE_MIN * 60_000) {
      state.nudged = now;
      events.emit(alias, 'needs-lead', `your team has had nothing running for ${ago(state.since)} and nothing is waiting on the owner. Act on these now, or tell the owner in the Inbox why the team waits: ${why.map(w => w.text).join('; ')}`);
      changes.push(`${alias}: team idle; told the lead why`);
    }
    fs.writeFileSync(file(alias), JSON.stringify(state));
  }
  return changes;
}

// For the owner's Inbox: the team stayed idle after the lead was told.
export function forOwner(alias) {
  const s = read(alias);
  if (!s?.nudged || Date.now() - Date.parse(s.since) < OWNER_MIN * 60_000) return null;
  return { since: s.since, nudged: s.nudged, why: s.why || [] };
}

// The owner's button: wake the lead with their words. The supervisor restarts a lead that doesn't answer.
export function wake(alias) {
  const s = read(alias);
  events.emit(alias, 'needs-lead', `the owner sees your team idle and wants it moving: act on these now, or ask them in the Inbox what you need: ${(s?.why || []).map(w => w.text).join('; ') || 'nothing is running'}`);
  if (s) { s.since = new Date().toISOString(); s.nudged = s.since; fs.writeFileSync(file(alias), JSON.stringify(s)); }
  return 'woken';
}
