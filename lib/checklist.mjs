// The project moves in small rounds: a short checklist of things the owner can see and try, with a target date and
// a price. The owner approves it, the team builds only what's on it, and the owner reviews every line before the
// lead may write another. Atelier enforces this: `atelier add` refuses work that isn't for an open line.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';
import * as events from './events.mjs';
import * as asks from './asks.mjs';
import { writeJson } from './home.mjs';

const MAX_ITEMS = 7, MAX_DAYS = 14;
const OPEN = ['proposed', 'active', 'review'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const file = alias => path.join(project.dir(alias), 'checklist.json');
export const filesDir = (alias, id) => path.join(project.dir(alias), 'checklist', id);

export function rounds(alias) {
  try { return JSON.parse(fs.readFileSync(file(alias), 'utf8')); } catch { return []; }
}
const save = (alias, list) => writeJson(file(alias), list);
export const current = alias => rounds(alias).find(r => OPEN.includes(r.status)) || null;
const findItem = (list, id) => {
  const want = String(id).toUpperCase();
  for (const r of list) { const it = r.items.find(i => i.id === want); if (it) return [r, it]; }
  throw new Error(`no checklist line ${id} (atelier checklist <alias> shows them)`);
};
const nextId = list => `C-${list.flatMap(r => r.items).reduce((n, i) => Math.max(n, Number(i.id.slice(2))), 0) + 1}`;

// The lead proposes the next round. Only one round is ever open.
export function propose(alias, { goal, items = [], by, finish, cost, why = '', research = '', noResearch = '' }) {
  const list = rounds(alias);
  const open = list.find(r => OPEN.includes(r.status));
  if (open) throw new Error(`round ${open.n} is still ${open.status === 'proposed' ? 'waiting for the owner to approve it' : 'open'}. Every line has to be built and reviewed by the owner before you write another checklist (atelier checklist ${alias}).`);
  if (!goal?.trim()) throw new Error('a goal is required: one line on what the owner can do at the end of this round that they can\'t do today');
  const lines = items.map(s => s.trim()).filter(Boolean);
  if (!lines.length) throw new Error('--items "first thing | second thing": what the owner will be able to see or try');
  if (lines.length > MAX_ITEMS) throw new Error(`${lines.length} lines is too many: at most ${MAX_ITEMS}. Keep this round small; the rest goes in a later one.`);
  const long = lines.find(l => l.length > 160);
  if (long) throw new Error(`keep each line under 160 characters: "${long.slice(0, 60)}…"`);
  if (!DAY.test(by || '')) throw new Error('--by YYYY-MM-DD: the day this round will be ready for the owner to review');
  if (!DAY.test(finish || '')) throw new Error('--finish YYYY-MM-DD: your honest estimate of when the whole project is done');
  const days = (Date.parse(by) - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000;
  if (days < 0) throw new Error(`--by ${by} has already passed`);
  if (days > MAX_DAYS) throw new Error(`--by ${by} is ${days} days away; a round takes at most ${MAX_DAYS}. Make it smaller.`);
  if (finish < by) throw new Error('--finish can\'t be before --by');
  if (!(Number(cost) > 0)) throw new Error('--cost <dollars>: what this round will cost, from atelier costs');
  if (!research.trim() && !noResearch.trim()) throw new Error(`what is this plan based on? --research atelier/research/<topic>.md (run a researcher first: ${RESEARCH_HINT}), or --no-research "<why this round doesn't need it>"`);
  const found = research.trim() ? readResearch(research.trim()) : null;
  const first = list.flatMap(r => r.items).reduce((n, i) => Math.max(n, Number(i.id.slice(2))), 0) + 1;
  const r = { n: list.length + 1, goal: goal.trim(), why: why.trim(), by, finish, cost: Math.round(Number(cost) * 100) / 100, ...(found ? { research: found } : { noResearch: noResearch.trim() }), status: 'proposed', at: new Date().toISOString(),
    items: lines.map((text, i) => ({ id: `C-${first + i}`, text, status: 'open' })) };
  list.push(r);
  save(alias, list);
  events.emit(alias, 'checklist', `round ${r.n} proposed: ${r.goal}`);
  return r;
}

// The report a plan rests on, kept with the round so the owner reads it where they decide.
export const RESEARCH_MAX = 15;
export const RESEARCH_HINT = `atelier add <alias> "Research: <question>" --role researcher --budget <at most ${RESEARCH_MAX}> --check "atelier verify research atelier/research/<topic>.md" --goal "<the question and what it decides>"`;
export const RESEARCH_HEADINGS = ['Recommendation', 'The best that exists', 'Options compared', 'What failed', "What's still unknown", 'Sources'];
export function researchProblems(text) {
  const problems = RESEARCH_HEADINGS.filter(h => !new RegExp(`^## ${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(text)).map(h => `the "## ${h}" section is missing`);
  const sources = text.split(/^## Sources\s*$/m)[1] || '';
  const links = new Set((sources.match(/https?:\/\/[^\s)\]>]+/g) || []).map(u => u.replace(/[.,;]+$/, '')));
  if (links.size < 8) problems.push(`Sources has ${links.size} distinct links; it needs at least 8`);
  return problems;
}
function readResearch(rel) {
  const file = path.resolve(rel);
  if (!fs.existsSync(file)) throw new Error(`no research report at ${rel}`);
  const text = fs.readFileSync(file, 'utf8');
  const problems = researchProblems(text);
  if (problems.length) throw new Error(`${rel} isn't a finished report: ${problems.join('; ')}`);
  const part = h => (text.split(new RegExp(`^## ${h}\\s*$`, 'm'))[1] || '').split(/^## /m)[0].trim();
  return { path: rel.split(path.sep).join('/'), recommendation: part('Recommendation').slice(0, 1800), best: part('The best that exists').slice(0, 2400) };
}

// Withdrawn by the lead before the owner has answered, to send a better one.
export function withdraw(alias) {
  const list = rounds(alias);
  const r = list.find(x => x.status === 'proposed');
  if (!r) throw new Error('only a checklist still waiting for the owner can be withdrawn; an approved one gets finished');
  r.status = 'withdrawn';
  save(alias, list);
  events.emit(alias, 'checklist', `round ${r.n} withdrawn by the lead`);
  return r;
}

// The owner approves the round, or sends it back with what to change.
export function decide(alias, n, approve, note = '') {
  const list = rounds(alias);
  const r = list.find(x => x.n === Number(n));
  if (!r || r.status !== 'proposed') throw new Error(`round ${n} isn't waiting for approval`);
  if (!approve && !note.trim()) throw new Error('say what to change, so the lead can rewrite it');
  r.status = approve ? 'active' : 'declined';
  r.decidedAt = new Date().toISOString();
  r.note = note.trim();
  save(alias, list);
  events.emit(alias, approve ? 'checklist-approved' : 'checklist-declined', `round ${r.n} "${r.goal}" ${approve ? `APPROVED: build ${r.items.map(i => i.id).join(', ')} by ${r.by}` : 'NOT APPROVED'}${r.note ? `. Owner's note: ${r.note.slice(0, 300)}` : ''}`);
  return r;
}

// Something the owner asked for mid-round goes on the open checklist, on the record.
export function addLine(alias, text, because) {
  const list = rounds(alias);
  const r = list.find(x => ['active', 'review'].includes(x.status));
  if (!r) throw new Error('no approved round is open to add to');
  if (!text?.trim()) throw new Error('what is the line?');
  if (!because?.trim()) throw new Error('--owner "<their words>": only something the owner asked for joins an open round; anything else waits for the next');
  const it = { id: nextId(list), text: text.trim().slice(0, 160), status: 'open', ownerAsked: because.trim() };
  r.items.push(it);
  r.status = 'active';
  save(alias, list);
  events.emit(alias, 'checklist', `${it.id} added to round ${r.n} at the owner's request: ${it.text}`);
  return it;
}

// The lead says a line is ready: how to try it, plus what shows it working. When every line is ready the owner reviews.
export function ready(alias, id, { how, attach = [], task = '', links = [] }) {
  const list = rounds(alias);
  const [r, it] = findItem(list, id);
  if (r.status !== 'active' && r.status !== 'review') throw new Error(`round ${r.n} is ${r.status}`);
  if (it.status === 'accepted') throw new Error(`${it.id} is already accepted`);
  if (!how?.trim()) throw new Error('--how "...": in plain words, how the owner tries this line themselves');
  const picked = asks.collect({ attach, task });
  if (!picked.length && !links.filter(Boolean).length) throw new Error(`show it working: --attach "shot.png=What this shows" or --task <id> or --link <url>`);
  fs.rmSync(filesDir(alias, it.id), { recursive: true, force: true });
  const { files, captions } = asks.store(picked, filesDir(alias, it.id));
  Object.assign(it, { status: 'ready', how: how.trim(), files, captions, links: links.filter(Boolean), readyAt: new Date().toISOString() });
  const left = r.items.filter(i => !['ready', 'accepted'].includes(i.status));
  if (!left.length) r.status = 'review';
  save(alias, list);
  events.emit(alias, 'checklist', left.length ? `${it.id} ready; ${left.length} line(s) of round ${r.n} still to build` : `round ${r.n} is ready for the owner to review`);
  return { round: r, item: it, left: left.length };
}

// The owner accepts a line or sends it back. The round closes when all are accepted.
export function judge(alias, id, accept, note = '') {
  const list = rounds(alias);
  const [r, it] = findItem(list, id);
  if (r.status !== 'review' || it.status !== 'ready') throw new Error(`${it.id} isn't waiting for your review`);
  if (!accept && !note.trim()) throw new Error('say what\'s wrong, so the team can fix it');
  it.status = accept ? 'accepted' : 'sent-back';
  it.feedback = note.trim();
  it.judgedAt = new Date().toISOString();
  const waiting = r.items.filter(i => i.status === 'ready').length;
  if (!waiting) {
    r.status = r.items.every(i => i.status === 'accepted') ? 'done' : 'active';
    if (r.status === 'done') r.doneAt = it.judgedAt;
  }
  save(alias, list);
  const left = waiting ? ` (${waiting} still to review)` : r.status === 'done' ? `. Round ${r.n} is DONE: propose the next checklist` : `. Fix what was sent back: ${r.items.filter(i => i.status === 'sent-back').map(i => i.id).join(', ')}`;
  events.emit(alias, 'checklist-judged', `${it.id} "${it.text}" ${accept ? 'ACCEPTED' : 'SENT BACK'}${it.feedback ? `: ${it.feedback.slice(0, 300)}` : ''}${left}`);
  return r;
}

// Which lines a new task may serve. Throws unless every one is an open line of the approved round.
export function checkFor(alias, ids) {
  const r = current(alias);
  if (!r || r.status === 'proposed') throw new Error(`${alias} has no approved checklist, so nothing new can start. ${r ? 'Round ' + r.n + ' is waiting for the owner.' : `Propose one: atelier checklist ${alias} propose "<goal>" --items "a | b" --by YYYY-MM-DD --finish YYYY-MM-DD --cost N`}`);
  const open = r.items.filter(i => ['open', 'sent-back'].includes(i.status)).map(i => i.id);
  if (!ids.length) throw new Error(`which checklist line is this for? --for ${open[0] || 'C-n'} (open: ${open.join(', ') || 'none'}). Work that isn't on the checklist waits for the next one; for a small fix that can't wait use --outside "<why>" (at most $${OUTSIDE_MAX}).`);
  const bad = ids.filter(i => !open.includes(i));
  if (bad.length) throw new Error(`${bad.join(', ')} ${bad.length > 1 ? "aren't" : "isn't"} an open line of round ${r.n} (open: ${open.join(', ') || 'none'})`);
}
export const OUTSIDE_MAX = 5;
export const forIds = v => String(v || '').split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

// What the owner has to look at now.
export function forOwner(alias) {
  const r = current(alias);
  if (!r) return { proposed: null, review: [] };
  return { proposed: r.status === 'proposed' ? r : null, review: r.status === 'review' ? r.items.filter(i => i.status === 'ready').map(item => ({ round: r, item })) : [] };
}
