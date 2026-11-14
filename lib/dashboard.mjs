// The owner's dashboard: a small local web server (no dependencies) for the desktop and phone browser.
// Every write goes through owner.asOwner, so only clicks here (or the owner's own terminal) can approve
// gates, criteria, plans and the charter. It also runs the scheduler every minute.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { HOME, PKG, paths, readJson, runDir, resolveRepo, config } from './home.mjs';
import * as project from './project.mjs';
import * as decisions from './decisions.mjs';
import * as owner from './owner.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as limits from './limits.mjs';
import * as metrics from './metrics.mjs';
import * as messages from './messages.mjs';
import * as asks from './asks.mjs';
import * as checklist from './checklist.mjs';
import * as auditor from './auditor.mjs';
import * as usage from './usage.mjs';
import * as budget from './budget.mjs';
import * as screen from './screen.mjs';
import * as newproject from './newproject.mjs';
import * as claudeApp from './claudeapp.mjs';
import * as leadNow from './lead-activity.mjs';
import * as idle from './idle.mjs';
export { leadActivity } from './lead-activity.mjs';
import { killTree, alive, spawnDetached, stopRunner } from './runner.mjs';

const STATIC = path.join(PKG, 'dashboard');
const TOKEN_FILE = path.join(HOME, 'dashboard-token');
const COOKIE = 'atelier_session';

export function token() {
  if (!fs.existsSync(TOKEN_FILE)) fs.writeFileSync(TOKEN_FILE, crypto.randomBytes(18).toString('base64url'));
  return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
}

export function serve({ port = 4747, lan = false, tailscale = true } = {}) {
  const secret = token();
  const sessionSig = crypto.createHmac('sha256', secret).update('session').digest('base64url');
  const handler = async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/login' && req.method === 'POST') return login(req, res, secret, sessionSig);
      if (url.pathname.startsWith('/api/')) {
        if (!authed(req, sessionSig)) return json(res, 401, { error: 'not signed in' });
        if (req.method === 'POST' && req.headers['x-atelier'] !== '1') return json(res, 403, { error: 'missing header' });
        return await api(req, res, url);
      }
      // The owner is opening the dashboard after a while: start rebuilding now, before app.js asks.
      if (url.pathname === '/') {
        if (!authed(req, sessionSig)) return serveSignedOut(res);
        if (!watching()) { reads.askedAt = Date.now(); readAhead(); }
      }
      return serveStatic(res, url.pathname);
    } catch (err) {
      json(res, 500, { error: err.message });
    }
  };
  // Agent-written pages (design mockups) get their own origin on the next port, so their scripts can't
  // use the dashboard's session. Access is by the signed path alone.
  const viewHandler = (req, res) => {
    try { const p = new URL(req.url, 'http://x').pathname; if (p.startsWith('/evidence/')) serveEvidence(res, p); else if (p.startsWith('/ask/')) serveAsk(res, p); else if (p.startsWith('/round/')) serveRound(res, p); else serveView(res, p); } catch { res.writeHead(500); res.end(); }
  };
  const host = lan ? '0.0.0.0' : '127.0.0.1';
  VIEW_PORT = port + 1;
  SERVE_PORT = port;
  http.createServer(viewHandler).listen(VIEW_PORT, host).on('error', () => { VIEW_PORT = null; });
  const server = http.createServer(handler).listen(port, host, () => {
    console.log(`Atelier dashboard: http://localhost:${port}`);
    if (lan) for (const ip of lanAddresses()) console.log(`  on your phone (same Wi-Fi): http://${ip}:${port}`);
    console.log(`  access token: ${secret}   (enter it once per device)`);
  });
  // Away from home the phone comes in over Tailscale: listen on the PC's Tailscale address too (and on
  // nothing else), so only the owner's own devices can reach it. Tailscale may connect after the
  // dashboard starts, so keep checking.
  if (!lan && tailscale) {
    let bound = null;
    const bindTailscale = () => {
      const ip = tailscaleAddress();
      if (!ip || ip === bound) return;
      bound = ip;
      const forget = () => { if (bound === ip) bound = null; };
      if (VIEW_PORT) http.createServer(viewHandler).listen(VIEW_PORT, ip).on('error', forget);
      http.createServer(handler).listen(port, ip, () => console.log(`  on your phone (Tailscale, anywhere): http://${ip}:${port}`)).on('error', forget);
    };
    bindTailscale();
    setInterval(bindTailscale, 30_000).unref?.();
  }
  // The dashboard doubles as the scheduler, so work keeps moving even when no lead session is open.
  // The tick runs in its own process: in here it blocked every request for seconds each minute.
  // ATELIER_NO_TICK=1 opts a test dashboard on a spare port out, so it never starts agents.
  if (process.env.ATELIER_NO_TICK !== '1') setInterval(() => { try { spawnDetached(['tick']); } catch { /* next minute */ } }, 60_000).unref?.();
  // Keep the pages the owner is looking at fresh in the background, so a read never waits.
  readAhead();
  setInterval(readAhead, READ_FRESH_MS * 3).unref?.();
  warmTasks();
  // Keep agents' windows off the owner's screen (see lib/screen.mjs).
  setInterval(() => { try { screen.watch(); } catch { /* next round */ } }, 15_000).unref?.();
  return server;
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1);
  if (req.method === 'GET') {
    const wait = url.searchParams.has('wait');
    if (parts[0] === 'overview') return jsonText(res, await cachedRead('overview', wait));
    // An id that names nothing is a 404, not a failed build (a mistyped or old link).
    const known = parts[0] === 'task' ? /^[\w-]+$/.test(parts[1] || '') && fs.existsSync(cards.cardPath(parts[1])) : /^[\w.-]+$/.test(parts[1] || '') && project.exists(parts[1]);
    if (['project', 'task'].includes(parts[0]) && !known) return json(res, 404, { error: 'not found' });
    if (parts[0] === 'activity' && parts[1] && !known) return json(res, 404, { error: 'not found' });
    if (parts[0] === 'project') return jsonText(res, await cachedRead(`project:${parts[1]}`, wait));
    if (parts[0] === 'task') return jsonText(res, await cachedRead(`task:${parts[1]}`, wait));
    if (parts[0] === 'activity') return jsonText(res, await cachedRead(parts[1] ? `activity:${parts[1]}` : 'activity', wait));
    return json(res, 404, { error: 'unknown' });
  }
  if (req.method === 'POST' && parts[0] === 'action') {
    const body = JSON.parse(await readBody(req) || '{}');
    let result;
    try { result = owner.asOwner(() => act(body)); } finally { reads.gen++; } // the next read shows what the action changed
    return json(res, 200, { ok: true, result: result ?? null });
  }
  json(res, 404, { error: 'unknown' });
}

// ---------- reads ----------

// Building the overview or a project page reads hundreds of files synchronously: a second or more on real
// data. So they're built in a worker thread and the server answers from the last result: a read older than
// READ_FRESH_MS is rebuilt in the background, and one from before the owner's last action is waited for.
// One older than READ_STALE_MS (only after nobody watched for a while) is answered with stale: true, and the
// client asks again for the rebuild. A task page is built there too: its spend can need every run's model rates.
const READ_FRESH_MS = 5_000;
const READ_STALE_MS = 30_000;
// Two workers, each building one page at a time from its own queue: task pages have their own, so a first look at
// a task never waits behind an overview or project build, and a page someone is waiting for (urgent) goes ahead of
// the background rebuilds.
const reads = { next: 1, inflight: new Map(), cache: new Map(), askedAt: 0, gen: 0, lanes: { pages: lane(), tasks: lane() } };
function lane() { return { worker: null, pending: new Map(), queue: [], busy: false }; }
const laneOf = key => reads.lanes[/^(task|warm):/.test(key) ? 'tasks' : 'pages'];

// A first look at a task mostly reads its run logs for spend (tens of MB for a long task). Once at start, the tasks
// worker reads every task's logs into its cache in the background, newest first, one task per message so a page
// someone waits for never queues behind more than one; after that only logs that changed are read again.
function warmTasks() {
  let ids = [];
  try {
    ids = fs.readdirSync(paths.runs, { withFileTypes: true }).filter(d => d.isDirectory())
      .map(d => ({ id: d.name, at: fs.statSync(path.join(paths.runs, d.name)).mtimeMs })).sort((a, b) => b.at - a.at).map(d => d.id);
  } catch { return; }
  for (const id of ids) build(`warm:${id}`).catch(() => {});
}

function readWorker(l) {
  if (l.worker) return l.worker;
  const w = new Worker(new URL(import.meta.url), { workerData: { reads: true } });
  w.on('message', ({ id, text, error }) => {
    const p = l.pending.get(id);
    l.pending.delete(id);
    l.busy = false;
    if (p) error ? p.reject(new Error(error)) : p.resolve(text);
    pump(l);
  });
  const fail = err => {
    if (l.worker !== w) return;
    l.worker = null;
    for (const p of l.pending.values()) p.reject(err);
    l.pending.clear();
    l.queue = [];
    l.busy = false;
  };
  w.on('error', fail);
  w.on('exit', code => fail(new Error(`reads stopped (${code})`)));
  w.unref();
  return (l.worker = w);
}

function pump(l) {
  if (l.busy || !l.queue.length) return;
  l.busy = true;
  readWorker(l).postMessage({ ...l.queue.shift(), viewPort: VIEW_PORT });
}

function build(key, urgent = false) {
  const gen = reads.gen, l = laneOf(key);
  const running = reads.inflight.get(key);
  if (running && running.gen === gen) {
    const i = urgent ? l.queue.findIndex(m => m.id === running.id) : -1;
    if (i > 0) l.queue.unshift(...l.queue.splice(i, 1));
    return running.promise;
  }
  const at = Date.now(), id = reads.next++;
  const promise = new Promise((resolve, reject) => {
    l.pending.set(id, { resolve, reject });
    l.queue[urgent ? 'unshift' : 'push']({ id, key, gen });
    pump(l);
  }).then(text => {
    const c = reads.cache.get(key);
    if (!c || c.at <= at) reads.cache.set(key, { at, gen, text });
    return text;
  }).finally(() => { if (reads.inflight.get(key)?.promise === promise) reads.inflight.delete(key); });
  reads.inflight.set(key, { gen, promise, id });
  return promise;
}

// wait: the client already shows an old build and asks for the rebuild, so wait for it (a few seconds at most).
async function cachedRead(key, wait) {
  const returning = !watching();
  reads.askedAt = Date.now();
  const c = reads.cache.get(key);
  if (!c || c.gen !== reads.gen) return build(key, true);
  if (returning) readAhead(); // back after a while: rebuild every page now, queued behind this one
  const age = Date.now() - c.at;
  if (age <= READ_FRESH_MS) return c.text;
  const rebuilt = build(key, wait);
  rebuilt.catch(() => {});
  if (age <= READ_STALE_MS) return c.text;
  if (wait) {
    const text = await Promise.race([rebuilt, new Promise(r => setTimeout(r, 4_000).unref?.())]).catch(() => null);
    if (text) return text;
  }
  // Old build: say so, and the client asks again for the rebuilt one.
  return c.text.startsWith('{') && c.text !== '{}' ? `{"stale":true,${c.text.slice(1)}` : c.text;
}

const watching = () => Date.now() - reads.askedAt < 120_000;

// While the owner has the dashboard open, keep the overview, every project page and Activity (all, and each
// project's tab) built, so switching to
// one never waits. Nothing is rebuilt when nobody has looked for a couple of minutes.
function readAhead() {
  const watch = watching();
  const aliases = project.list();
  for (const key of ['overview', ...aliases.map(a => `project:${a}`), 'activity', ...aliases.map(a => `activity:${a}`)]) {
    const c = reads.cache.get(key);
    if (!c || (watch && Date.now() - c.at > READ_FRESH_MS)) build(key).catch(() => {});
  }
}

if (!isMainThread && workerData?.reads) {
  let seenGen = 0;
  parentPort.on('message', ({ id, key, viewPort, gen }) => {
    VIEW_PORT = viewPort;
    // The owner acted since the last build: its status reads are from before the action, so read again.
    if (gen !== seenGen) { seenGen = gen; statusMemo.clear(); }
    try {
      const text = JSON.stringify(key === 'overview' ? overview() : key.startsWith('project:') ? projectDetail(key.slice(8)) : key.startsWith('task:') ? taskDetail(key.slice(5)) : key.startsWith('warm:') ? usage.runs(key.slice(5)).length : key === 'activity' || key.startsWith('activity:') ? activity(key.slice(9)) : null);
      parentPort.postMessage({ id, text });
    } catch (e) {
      parentPort.postMessage({ id, error: e.message });
    }
  });
}

// The overview and a project page built back to back share one status read.
const statusMemo = new Map();
function statusOf(alias) {
  const m = statusMemo.get(alias);
  if (m && Date.now() - m.at < 2_000) return m.value;
  const value = metrics.status(alias);
  statusMemo.set(alias, { at: Date.now(), value });
  return value;
}

function overview() {
  const aliases = project.list();
  const projects = aliases.map(a => { try { return statusOf(a); } catch (e) { return { alias: a, error: e.message }; } });
  const loose = cards.all().filter(c => !c.meta.project && !['done', 'failed'].includes(c.meta.status)).map(c => c.meta);
  const withTeam = projects.map(p => { if (p.error) return p; const lead = leadState(p.alias); return { ...p, lead, team: team(p, lead) }; });
  // A closed project has nothing to ask the owner (owner's call, 10 Nov): it stays readable, off the Inbox.
  const queue = [...appQueue(), ...projects.filter(p => !p.closed).flatMap(queueFor)];
  const lim = limits.snapshot();
  const decided = decidedToday();
  return {
    projects: withTeam,
    summary: summarize(withTeam, queue, lim, decided),
    atelierToday: usage.today(),
    queue,
    decidedToday: decided,
    looseTasks: loose,
    limits: lim,
    pace: (() => { const pace = config().pace, until = limits.waitUntil() || null; return { ...pace, holdingUntil: until, holdingWhy: until ? holdingWhy(lim, pace) : [] }; })(),
    limitsText: limits.describe(),
    events: events.read({ sinceMin: 60 * 24 * 3 }).slice(-80).reverse(),
    version: version(),
  };
}

const r2 = n => Number((n || 0).toFixed(2));

// The one summary (SPEC R2): every count and money figure any screen shows, computed here once. Screens read
// these; they never add up or recount the lists themselves, so the same figure reads the same everywhere.
function summarize(projects, queue, lim, decided) {
  const per = {};
  for (const p of projects) {
    const q = queue.filter(x => x.project === p.alias);
    const t = p.budget?.today || {}, tot = p.budget?.total || {};
    // Outcomes are the owner-level criteria (the charter's words), team checks the rest; drafts and retired ones don't count.
    const live = (p.criteria || []).filter(c => decisions.isApproved(c));
    const owner = live.filter(c => decisions.levelOf(c) === 'owner'), checks = live.filter(c => decisions.levelOf(c) !== 'owner');
    const met = c => c.status === 'pass' || c.status === 'accepted';
    // A running task held for the plan window counts as paced, not running, so "working" never counts it (owner ruling).
    const paced = new Set((p.team?.agents || []).filter(x => x.state === 'paced').map(x => x.id));
    const tasks = {};
    for (const x of p.tasks || []) { const s = x.status === 'failed' && /cancelled/.test(x.reason || '') ? 'cancelled' : paced.has(x.id) ? 'paced' : x.status; tasks[s] = (tasks[s] || 0) + 1; }
    per[p.alias] = p.error ? { waiting: 0, needsNow: 0, working: 0, paced: 0, onDuty: 0, agentsNeed: 0, spentToday: 0, dayLimit: 0, atLimit: false, spentTotal: 0, lead: false } : {
      waiting: q.length, needsNow: q.filter(x => x.needs).length,
      working: p.team.working, paced: p.team.paced, onDuty: p.team.duty, agentsNeed: p.team.needs,
      spentToday: r2(t.spent), dayLimit: p.budget?.day || 0, atLimit: !!t.over, spentTotal: r2(tot.spent),
      split: { tasks: r2(tot.tasks), lead: r2(tot.lead), audits: r2(tot.audits) },
      outcomes: { met: owner.filter(met).length, of: owner.length }, checks: { passing: checks.filter(met).length, of: checks.length },
      tasks, tasksOpen: (p.tasks || []).filter(x => !['done', 'failed'].includes(x.status)).length,
      findingsOpen: (p.findings || []).filter(f => f.status === 'open').length,
      asksOpen: q.filter(x => x.kind === 'ask').length,
      lead: !!p.lead?.running,
    };
  }
  const all = Object.values(per);
  const add = k => all.reduce((n, x) => n + x[k], 0);
  const w = k => lim?.[k] ? { used: Math.round(lim[k].used_percentage), resetsAt: lim[k].resets_at } : null;
  return {
    waiting: queue.length, needsNow: queue.filter(x => x.needs).length,
    working: add('working'), paced: add('paced'), onDuty: add('onDuty'), agentsNeed: add('agentsNeed'),
    spentToday: r2(add('spentToday')), atLimit: Object.keys(per).filter(a => per[a].atLimit),
    decidedToday: decided.length,
    plan: { fiveHour: w('five_hour'), sevenDay: w('seven_day'), savedAt: lim?.saved_at || null },
    projects: per,
  };
}

// Today's decisions by the owner, newest first, in plain words: the Inbox's "Decided today".
const OWNER_EVENT = [
  [/^gate$/, /^(\S+) (approved|skipped) by owner/, m => `${m[2] === 'approved' ? 'Approved' : 'Skipped'} the ${m[1]}`],
  [/^approved$/, /^plan approved by owner: (.*)/, m => `Approved the plan: ${m[1]}`],
  [/^charter$/, /^approved by owner/, () => 'Approved the charter'],
  // the outcome by its own words, not its code (F-18)
  [/^criterion-(approve|accept|reject|retire)$/, /^(\S+)/, (m, t, a) => `${{ 'criterion-approve': 'Approved', 'criterion-accept': 'Accepted', 'criterion-reject': 'Rejected', 'criterion-retire': 'Retired' }[t]} an outcome: ${criterionText(a, m[1].replace(/:$/, '')) || 'one of your outcomes'}`],
  [/^finding-confirmed$/, /^(.*)/, () => 'Asked the team to fix a finding'],
  [/^finding-dismissed$/, /^(.*)/, () => 'Kept a finding as it is'],
  [/^screen-allowed$/, /^owner/, () => 'Allowed an agent your screen'],
  [/^screen-declined$/, /^owner/, () => 'Said not now to screen use'],
  [/^budget$/, /^daily budget set to (.*)/, m => `Set the daily budget to ${m[1]}`],
];
function decidedToday() {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  return memoOn(`decided:${since.getTime()}`, [paths.events, paths.board], () => decidedSince(since));
}
function decidedSince(since) {
  const tasks = new Map(cards.all().map(c => [c.meta.id, c.meta.project]));
  const out = [];
  for (const e of events.read({ sinceMin: 60 * 24 })) {
    if (Date.parse(e.ts) < since.getTime()) continue;
    for (const [type, msg, words] of OWNER_EVENT) {
      const m = type.test(e.type) && msg.exec(e.msg || '');
      if (m) { const project = tasks.get(e.id) || e.id; out.push({ what: words(m, e.type, project), project, at: e.ts }); break; }
    }
  }
  return out.reverse();
}
function criterionText(alias, id) {
  try { return project.exists(alias) ? decisions.loadCriteria(alias).criteria.find(c => c.id === id)?.statement || '' : ''; } catch { return ''; }
}

// Why the plan pacing holds new work (Settings › Claude plan words it): a window past its line, or the week ahead of an
// even pace. The same tests as limits.waitUntil(), without the times.
function holdingWhy(s, pace) {
  const now = Date.now() / 1000, why = [];
  if (s?.five_hour?.resets_at > now && s.five_hour.used_percentage >= pace.fiveHour) why.push('fiveHour');
  if (s?.seven_day?.resets_at > now && s.seven_day.used_percentage >= pace.sevenDay) why.push('sevenDay');
  else if (pace.spread && s?.seven_day?.resets_at > now) why.push('spread');
  return why;
}

// Changes whenever the dashboard's own files change, so open pages can reload themselves.
function version() {
  return Math.max(...fs.readdirSync(STATIC).map(f => fs.statSync(path.join(STATIC, f)).mtimeMs)).toString(36);
}

// The newest unanswered question in a task's QUESTIONS.md: its heading and body.
function openQuestion(id) {
  const f = path.join(runDir(id), 'QUESTIONS.md');
  if (!fs.existsSync(f)) return { title: '', body: '' };
  const open = fs.readFileSync(f, 'utf8').split(/^## /m).slice(1).filter(b => !/\bANSWER\b/.test(b));
  const rows = (open.at(-1) || '').split('\n');
  if (rows[0].trim()) return { title: rows[0].trim(), body: rows.slice(1).join('\n').trim() };
  // No written question: show what the agent actually said when it stopped, never a file name.
  const blocked = path.join(runDir(id), 'BLOCKED.md');
  const said = fs.existsSync(blocked) ? fs.readFileSync(blocked, 'utf8').replace(/^# .*\n+/, '') : lastResult(id);
  const para = said.trim().split(/\n\s*\n/);
  return { title: (para[0] || '').replace(/[*_`]/g, '').slice(0, 200), body: para.slice(1).join('\n\n').replace(/ATELIER_STATUS:.*$/m, '').trim() };
}

// The final message of a task's latest iteration.
function lastResult(id) {
  const dir = runDir(id);
  const last = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^iter-\d+\.jsonl$/.test(f)).sort().pop() : null;
  if (!last) return '';
  const line = fs.readFileSync(path.join(dir, last), 'utf8').split('\n').filter(l => l.includes('"type":"result"')).pop();
  try { return JSON.parse(line).result || ''; } catch { return ''; }
}

// The Claude desktop app stuck mid-update (the scheduler checks each minute): the owner can't see or talk to the
// leads until it's ended, so it heads the Inbox with a one-click restart.
function appQueue() {
  const s = claudeApp.stuck();
  if (!s) return [];
  return [{ kind: 'claude-app', priority: 0, needs: true, project: 'Atelier', title: "The Claude app is stuck and won't open",
    detail: '', key: `claude-app:${s.since}`, id: s.since, at: s.since, since: s.since }];
}

// Everything waiting on the owner, most urgent first.
function queueFor(s) {
  if (s.error) return [];
  const q = [];
  // needs: "Needs you now" (priority 0–1, as the old red rule). The fields after `detail` are read-only content
  // so the Inbox shows the thing itself (SPEC R10); the actions stay today's.
  const add = (kind, priority, title, detail, extra = {}) =>
    q.push({ kind, priority, needs: priority <= 1, project: s.alias, title, detail, key: `${kind}:${s.alias}:${extra.id || extra.phase || extra.dial || ''}`, ...extra });
  if (s.github?.problem) add('github', 1, "Work isn't reaching GitHub", `Atelier pushes to GitHub on its own every couple of minutes, and it can't right now: ${s.github.problem}. The lead has been told; if it's about signing in to GitHub, that one is yours.`, { problem: s.github.problem, at: s.github.at });
  if (s.charter?.tampered) add('charter-tampered', 0, 'Your charter changed after you approved it', 'Someone edited `atelier/CHARTER.md` after your approval. Read it in Docs and approve it again if the change is yours.', { approvedAt: s.charter.approvedAt, ...charterChange(s.repo, s.charter.hash) });
  for (const f of s.findings.filter(f => f.status === 'open')) {
    add('finding', f.severity === 'high' ? 0 : f.severity === 'medium' ? 2 : 4, f.headline || f.claim,
      f.impact ? `**If nobody fixes it:** ${f.impact}` : '',
      { impact: f.impact || '', expected: f.expected, observed: f.observed, evidence: f.evidence, id: f.id, severity: f.severity, reversibility: f.reversibility, at: f.at || f.audit });
  }
  const scr = screen.load(s.alias);
  for (const r of scr.requests.filter(r => r.status === 'pending')) {
    const t = s.tasks.find(x => x.id === r.task);
    add('screen', 0, `The ${t?.role || 'agent'} wants to open a window on your screen`, `**Why:** ${r.why}\n\nFor about ${r.minutes} minute${r.minutes === 1 ? '' : 's'}, while working on: ${t?.title || r.task}. Nothing opens until you allow it.`,
      { id: r.id, minutes: r.minutes, at: r.at, why: r.why, role: t?.role || 'agent', taskTitle: t?.title || r.task });
  }
  for (const n of scr.notices.filter(n => !n.seen && Date.now() - Date.parse(n.at) < 24 * 3600_000)) {
    add('screen-notice', n.closed ? 1 : 3, n.closed ? `Atelier closed a window the ${n.role} opened` : `The ${n.role} opened a window, as you allowed`,
      `**${n.app}**${n.title ? ` ("${n.title}")` : ''} appeared on your screen${n.count > 1 ? ` (${n.count} times)` : ''}.${n.closed ? ' It had no permission, so Atelier closed it straight away and told the agent to work without the screen.' : ''}`,
      { id: n.id, at: n.at, role: n.role, app: n.app, windowTitle: n.title || '', count: n.count || 1, closed: !!n.closed });
  }
  if (s.budget?.today?.over) {
    const t = s.budget.today;
    add('budget', 1, `Today's budget is used up (${t.spent} of ${s.budget.day})`, `The team has paused new work until tomorrow. Raise today's limit if you want it to keep going now. The lead itself used ${t.lead} of it.`,
      { dial: 'budgetDay', to: String(Math.ceil(s.budget.day * 1.5)), spent: r2(t.spent), limit: s.budget.day, split: { tasks: todayByTask(s.alias), lead: r2(t.lead), audits: r2(t.audits) } });
  }
  for (const [ph, g] of Object.entries(s.gates)) if (g?.status === 'requested') { const r = reviewFor(s.alias, ph); add('gate', 1, `Approve ${ph}`, g.summary, { phase: ph, at: g.at, review: r && { open: r.open, viewPort: r.viewPort, docName: r.docName, merged: r.merged, files: r.files, images: r.images, imageCount: r.imageCount, doc: ph === 'design' ? '' : r.doc } }); }
  const repoCharter = s.repo && fs.existsSync(path.join(s.repo, 'atelier', 'CHARTER.md')) ? fs.readFileSync(path.join(s.repo, 'atelier', 'CHARTER.md'), 'utf8') : '';
  const charterDrafted = repoCharter.replace(/<!--[\s\S]*?-->/g, '').replace(/^#.*$/gm, '').trim().length > 40;
  // A blank charter with the lead's draft beside it (atelier/CHARTER-draft.md, read only): the owner adopts the draft as
  // written or edits it first (F-2). Approving it saves the draft through charter-save, then charter-approve, as today.
  const draftFile = s.repo && !s.charter && !charterDrafted ? path.join(s.repo, 'atelier', 'CHARTER-draft.md') : '';
  // The draft's own title ("# Charter (lead's draft, …)") becomes the template's "# Charter", so what's saved is the
  // owner's charter, not a note that it's a draft; the rest stays verbatim.
  const draft = draftFile && fs.existsSync(draftFile) ? fs.readFileSync(draftFile, 'utf8').replace(/^\s*# [^\r\n]*/, '# Charter') : '';
  if (!s.charter && charterDrafted) add('charter', 1, 'Approve your charter', 'The lead drafted your charter from your brief. Read it, change anything that isn\'t in your words, then approve it.', { text: repoCharter.replace(/<!--[\s\S]*?-->/g, '').trim() });
  else if (draft.replace(/<!--[\s\S]*?-->/g, '').replace(/^#.*$/gm, '').trim().length > 40) add('charter', 1, 'Approve your charter', 'The lead drafted your charter from your brief. It isn\'t your charter until you approve it: approve it as written, or edit it first.', { text: draft.replace(/<!--[\s\S]*?-->/g, '').trim(), draft });
  for (const c of s.criteria.filter(c => c.status === 'awaiting-owner')) add('owner-criterion', 2, c.statement, 'This one needs your judgement. Try the product, then accept or reject it.', { id: c.id, at: c.history?.at(-1)?.at, proof: proofFor(s, c.id) });
  // Only owner-level outcomes need the owner; several drafts arrive as one batch to approve together.
  const drafts = s.criteria.filter(c => c.status === 'draft' && decisions.levelOf(c) === 'owner');
  if (drafts.length === 1) {
    const c = drafts[0];
    add('criterion', 3, c.statement, `**Serves:** ${c.serves}`, { id: c.id, at: c.history?.at(-1)?.at, statement: c.statement, serves: c.serves || '' });
  } else if (drafts.length > 1) {
    add('criteria', 3, `Approve ${drafts.length} outcomes`, drafts.map(c => `- **${c.id}** ${c.statement}`).join('\n'), { id: drafts.map(c => c.id).join(','), at: drafts.at(-1).history?.at(-1)?.at, statements: drafts.map(c => c.statement) });
  }
  // A plan the lead put inside one of its items is decided there, so it isn't listed a second time on its own.
  const owned = asks.all(s.alias).filter(a => a.plans?.length && a.status !== 'withdrawn' && a.answer?.verdict !== 'approve');
  const inAsk = new Set(owned.flatMap(a => a.plans));
  for (const t of s.tasks.filter(t => t.status === 'planned' && !inAsk.has(t.id))) add('plan', 3, t.title, `**Role:** ${t.role || 'builder'}\n\n**Criteria:** ${t.criteria || '—'}\n\n**Budget:** up to ${t.iterations} iterations`,
    { id: t.id, at: t.updated, role: t.role || 'builder', criteria: t.criteria || '', iterations: t.iterations, budgetLimit: Number(t.budget) || s.budget?.task || null, brief: (() => { try { return cards.load(t.id).body; } catch { return ''; } })() });
  // Specialists' questions go to the lead first; the owner sees one only if it's addressed to them or
  // the lead hasn't answered it within 15 minutes. The question itself is shown, not a file name.
  for (const t of s.tasks.filter(t => t.status === 'needs-you')) {
    const q = openQuestion(t.id);
    const forOwner = /\bowner\b/i.test(q.title + q.body) && !/for the lead/i.test(q.title);
    if (!forOwner && Date.now() - Date.parse(t.updated || 0) < 15 * 60_000) continue;
    add('question', 2, q.title || t.reason || t.title, `${q.body || ''}\n\n*From the ${t.role || 'builder'} working on: ${t.title}*`,
      { id: t.id, at: t.updated, role: t.role || 'builder', taskTitle: t.title, ...questionParts(q.body || '') });
  }
  const round = checklist.forOwner(s.alias);
  if (round.proposed) add('checklist', 1, round.proposed.goal, '', { id: `round-${round.proposed.n}`, at: round.proposed.at, round: roundView(s.alias, round.proposed) });
  for (const { round: r, item } of round.review) add('checklist-item', 1, item.text, '', { id: item.id, at: item.readyAt, item: lineView(s.alias, item), round: roundView(s.alias, r) });
  for (const a of asks.forOwner(s.alias)) add('ask', a.kind === 'update' ? 4 : a.kind === 'approval' ? 1 : 2, a.title, a.body, { id: a.id, at: a.at, ask: askView(s.alias, a) });
  const still = idle.forOwner(s.alias);
  if (still) add('team-idle', 1, `${s.alias}'s team has had nothing running since ${new Date(still.since).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, '', { id: still.since, at: still.since, why: still.why, nudged: still.nudged });
  if (s.suggestion?.ready) add('dial', 5, `Loosen ${s.suggestion.dial} to ${s.suggestion.to}`, `The team has earned it: ${s.suggestion.why}.`, { dial: s.suggestion.dial, to: s.suggestion.to, why: s.suggestion.why, current: s[s.suggestion.dial] ?? '' });
  return q.sort((a, b) => a.priority - b.priority);
}

// A question written the way the standing orders ask (Context / Options: A) … B) … / My default) split into its
// parts, so the Inbox can offer the options as suggested answers. Anything else stays as the plain body.
function questionParts(body) {
  const line = k => (body.match(new RegExp(`^${k}:\\s*(.*)$`, 'mi')) || [])[1]?.trim() || '';
  const opts = line('Options');
  const options = opts ? opts.split(/\s*\b[A-F]\)\s*/).map(s => s.trim().replace(/[;,]$/, '')).filter(Boolean) : [];
  const rest = body.split('\n').filter(l => !/^(Context|Options|My default):/i.test(l.trim())).join('\n').trim();
  return { context: line('Context'), options, suggested: line('My default'), rest };
}

// Today's spend per task in one project, largest first (for the budget item; the totals come from budget.today).
function todayByTask(alias) {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const out = [];
  for (const c of cards.all().filter(c => c.meta.project === alias)) {
    let n = 0;
    for (const r of usage.runs(c.meta.id)) if (r.ended >= since.getTime() && r.done) n += r.cost;
    if (c.meta.status === 'running') n += usage.forTask(c.meta).liveCost || 0;
    if (n >= 0.005) out.push({ id: c.meta.id, title: c.meta.title, spent: r2(n) });
  }
  return out.sort((a, b) => b.spent - a.spent);
}

// The proof behind an outcome waiting on the owner's judgement: the newest task citing it that has evidence.
function proofFor(s, id) {
  const tasks = s.tasks.filter(t => decisions.criteriaIds(t.criteria).includes(id))
    .sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  const ev = tasks.map(t => path.join(runDir(t.id), 'evidence'));
  return memoOn(`proof:${s.alias}:${id}:${VIEW_PORT}:${tasks.map(t => `${t.id}@${t.updated}:${t.title}`).join(',')}`, [...ev, ...ev.map(d => path.join(d, 'EVIDENCE.md'))], () => {
    for (const t of tasks) {
      const e = evidenceFor(t.id);
      if (e && (e.files.length || e.notes)) return { task: t.id, taskTitle: t.title, notes: e.notes.replace(/^#.*\n+/, '').split(/\n\s*\n/)[0].slice(0, 600), viewPort: e.viewPort, files: [...e.files.filter(f => f.image || f.video).slice(0, 4), ...e.files.filter(f => f.audio).slice(0, 3)] };
    }
    return null;
  });
}

// Reads that change only when the files they read do (the overview rebuilds every few seconds while the owner
// looks): kept until one of those files' mtime or size changes (or ttl ms pass). A missing file counts as its own state.
const memo = new Map();
function memoOn(key, files, fn, ttl = Infinity) {
  const sig = files.map(f => { try { const st = fs.statSync(f); return `${st.mtimeMs}:${st.size}`; } catch { return '-'; } }).join('|');
  const m = memo.get(key);
  if (m && m.sig === sig && Date.now() - m.at < ttl) return m.value;
  const value = fn();
  if (memo.size > 200) memo.clear();
  memo.set(key, { sig, value, at: Date.now() });
  return value;
}

// What changed in a charter since the owner approved it: the approved version is the newest commit of the file
// whose bytes still hash to the approval; sections are compared line by line.
// Kept until the charter or the repo's git folder (a commit) changes: git log + git show per approval is slow.
function charterChange(repo, hash) {
  const file = repo && path.join(repo, 'atelier/CHARTER.md');
  if (!file || !hash) return {};
  return memoOn(`charter:${repo}:${hash}`, [file, path.join(repo, '.git')], () => charterDiff(repo, hash));
}
function charterDiff(repo, hash) {
  const f = 'atelier/CHARTER.md', file = path.join(repo, f);
  if (!fs.existsSync(file)) return {};
  const changedAt = fs.statSync(file).mtime.toISOString();
  const shas = (spawnSync('git', ['log', '--format=%H', '-n', '40', '--', f], { cwd: repo, encoding: 'utf8', windowsHide: true }).stdout || '').split('\n').filter(Boolean);
  let old = null;
  for (const sha of shas) {
    const b = gitShow(repo, sha, f);
    if (b && crypto.createHash('sha256').update(b).digest('hex').slice(0, 16) === hash) { old = b.toString('utf8'); break; }
  }
  if (old === null) return { changedAt, changes: null };
  const sections = t => { const m = new Map(); for (const part of t.replace(/<!--[\s\S]*?-->/g, '').split(/^## /m).slice(1)) { const [h, ...rest] = part.split('\n'); m.set(h.trim(), rest.map(l => l.trim()).filter(Boolean)); } return m; };
  const a = sections(old), b = sections(fs.readFileSync(file, 'utf8'));
  const changes = [];
  for (const h of new Set([...a.keys(), ...b.keys()])) {
    const was = a.get(h) || [], now = b.get(h) || [];
    const removed = was.filter(l => !now.includes(l)), added = now.filter(l => !was.includes(l));
    if (removed.length || added.length) changes.push({ section: h, removed: removed.slice(0, 6), added: added.slice(0, 6) });
  }
  return { changedAt, changes: changes.slice(0, 4), sectionsChanged: changes.length };
}

// The Activity screen: the last 3 days of events, each with its project, its task's title and whether it is a problem
// ('needs'), good news ('done') or neither (''). For one project, at least its last 100 events even when they go back
// further than 3 days (the old project tab showed 100); `since` says how far the list reaches.
// The colour comes from the event's kind, and only a check's or decision's own result field is read: never the free
// words of a ruling, a note or a request. Good: done, the owner's approvals, a check that passed. A task closed as
// done because it was cancelled, replaced or a duplicate isn't good news: its own reason (the event's or its card's) says so.
const NOT_DONE = /\b(?:cancelled|superseded|duplicate of|folded into)\b/i;
const closedNotDone = c => !!c && /^(?:done|failed)$/.test(c.status || '') && NOT_DONE.test(c.reason || '');
function eventTone(e, card) {
  const isRequest = !!card?.requested_by;
  const m = e.msg || '';
  switch (e.type) {
    case 'stalled': case 'demoted': case 'push-failed': case 'ownership': return 'needs';
    case 'failed': return /^cancelled by\b/.test(m) ? '' : 'needs';
    case 'suite': return /\bFAILS?\b/.test(m) ? 'needs' : /\bpass/.test(m) ? 'done' : '';
    case 'criteria': {
      if (/holdout FAIL/.test(m)) return 'needs';
      const x = m.match(/^(\d+)\/(\d+) criteria/);
      return x && x[1] === x[2] && (+x[2] > 0 || /holdout pass/.test(m)) ? 'done' : '';
    }
    case 'iteration': return /\bcheck pass\b/.test(m) ? 'done' : '';
    case 'reviewed': return /^round \d+: approve/.test(m) ? 'done' : '';
    case 'ask-answered': return /\bran: FAILED/.test(m) ? 'needs' : /"\s+APPROVED\b/.test(m) ? 'done' : '';
    case 'gate': case 'charter': return /\bapproved by owner\b/.test(m) ? 'done' : '';
    case 'approved': return /^request approved\b/.test(m) ? '' : 'done';
    case 'done': return isRequest || NOT_DONE.test(m) || closedNotDone(card) ? '' : 'done';
    case 'criterion-approve': case 'criterion-accept': case 'finding-fixed': return 'done';
    default: return '';
  }
}
function activity(alias) {
  const meta = new Map(cards.all().map(c => [c.meta.id, c.meta]));
  const projectOf = e => meta.get(e.id)?.project || (project.exists(e.id) ? e.id : '');
  const cutoff = Date.now() - 3 * 24 * 3_600_000;
  let list = events.read().map(e => ({ ...e, project: projectOf(e) }));
  if (alias) { list = list.filter(e => e.project === alias); list = list.filter((e, i) => Date.parse(e.ts) >= cutoff || i >= list.length - 100); }
  else list = list.filter(e => Date.parse(e.ts) >= cutoff);
  const out = list.reverse().map(e => ({ ts: e.ts, id: e.id, type: e.type, msg: e.msg || '', project: e.project, task: meta.get(e.id)?.title || null,
    k: eventTone(e, meta.get(e.id)) }));
  return { project: alias || null, since: out.length ? Math.min(cutoff, Date.parse(out[out.length - 1].ts)) : cutoff, events: out };
}

function projectDetail(alias) {
  const s = statusOf(alias);
  const read = f => fs.existsSync(path.join(s.repo, 'atelier', f)) ? fs.readFileSync(path.join(s.repo, 'atelier', f), 'utf8') : '';
  const lead = leadState(alias);
  return {
    ...s,
    lead,
    team: team(s, lead),
    docs: { charter: read('CHARTER.md'), rulings: read('RULINGS.md'), plan: read('PLAN.md'), ledger: read('LEDGER.md'), brief: read('BRIEF.md'), spec: read('SPEC.md') },
    // The rulings as a list ("## R-n: text" then "_when · where_"), so the page numbers them without parsing markdown.
    rulings: read('RULINGS.md').split(/^## /m).slice(1).map(b => { const [h, ...rest] = b.split('\n'); const m = h.match(/^(R-\d+):\s*(.*)$/); const note = rest.find(l => /^_.*_\s*$/.test(l.trim())); return m && { n: m[1], text: m[2].trim(), note: note ? note.trim().replace(/^_|_$/g, '') : '' }; }).filter(Boolean),
    auditMode: project.tryLoad(alias)?.auditMode === 'auto' ? 'auto' : 'lead',
    reviews: Object.fromEntries(['design', 'contracts'].map(ph => [ph, reviewFor(alias, ph)])),
    messages: messages.all(alias).slice(-100).reverse(),
    checklist: (r => r ? roundView(alias, r) : null)(checklist.current(alias) || checklist.rounds(alias).filter(x => x.status === 'done').at(-1)),
    asks: asks.all(alias).slice(-60).reverse().map(a => askView(alias, a)),
    events: (meta => events.read({ project: alias }).slice(-100).reverse().map(e => ({ ...e, k: eventTone(e, meta.get(e.id)) })))(new Map(cards.all().map(c => [c.meta.id, c.meta]))),
  };
}

// ---------- reviewing a phase's work ----------
let VIEW_PORT = null;
let SERVE_PORT = 4747;
// The work for a phase may still sit on the specialist's branch (not merged yet), so the owner's review
// reads it from whichever ref has the latest version: the newest unmerged task branch for that phase, else
// the project's base branch.
const REVIEW = {
  brief: { doc: 'atelier/BRIEF.md' },
  spec: { doc: 'atelier/SPEC.md' },
  design: { doc: 'atelier/DESIGN.md', entry: ['atelier/design/index.html', 'atelier/design/screens/home.html'] },
  contracts: { doc: 'atelier/contracts/README.md', entry: [] },
};

function phaseRef(alias, phase) {
  const repo = resolveRepo(alias);
  const tasks = cards.all().map(c => c.meta).filter(m => m.project === alias && m.phase === phase && m.branch && m.status !== 'done')
    .sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  for (const t of tasks) if (gitShow(repo, `refs/heads/${t.branch}`, '') !== null) return { repo, ref: `refs/heads/${t.branch}`, task: t.id, merged: false };
  const base = (project.tryLoad(alias)?.base) || 'main';
  return { repo, ref: base, task: null, merged: true };
}

// A file's bytes at a ref, or null. With path '' it only checks the ref exists.
function gitShow(repo, ref, file) {
  const r = spawnSync('git', file ? ['show', `${ref}:${file}`] : ['rev-parse', '--verify', '--quiet', ref], { cwd: repo, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

function viewSig(alias) {
  return crypto.createHmac('sha256', token()).update(`view:${alias}`).digest('base64url').slice(0, 22);
}

// What the owner needs to review a phase: the main document (as text) and, for visual work, a link
// that opens the clickable mockups in a new tab.
// Kept up to a minute, or until the repo's branches change: it runs a dozen git commands. (Not the task board: a
// runner's heartbeat touches it every minute, so the review was rebuilt on nearly every read.)
function reviewFor(alias, phase) {
  if (!REVIEW[phase]) return null;
  const repo = resolveRepo(alias);
  return memoOn(`review:${alias}:${phase}:${VIEW_PORT}`, [path.join(repo, '.git', 'packed-refs'), path.join(repo, '.git', 'refs', 'heads'), path.join(repo, '.git', 'refs', 'heads', 'atelier')], () => reviewRead(alias, phase), 60_000);
}
function reviewRead(alias, phase) {
  const spec = REVIEW[phase];
  const { repo, ref, task, merged } = phaseRef(alias, phase);
  const doc = gitShow(repo, ref, spec.doc);
  const entry = (spec.entry || []).find(f => gitShow(repo, ref, f) !== null);
  const files = (gitShow(repo, ref, '') !== null && spawnSync('git', ['ls-tree', '-r', '--name-only', ref, '--', ...project.PHASE_DOCS[phase].map(g => g.replace(/\/\*\*$/, ''))], { cwd: repo, encoding: 'utf8', windowsHide: true }).stdout || '')
    .split('\n').filter(Boolean);
  const pics = reviewImages(files);
  const view = f => VIEW_PORT ? `/view/${viewSig(alias)}/${encodeURIComponent(alias)}/${phase}/${f.split('/').map(encodeURIComponent).join('/')}` : null;
  return {
    phase, task, merged, docName: path.basename(spec.doc), doc: doc ? doc.toString('utf8') : '',
    viewPort: VIEW_PORT,
    open: entry && VIEW_PORT ? `/view/${viewSig(alias)}/${encodeURIComponent(alias)}/${phase}/${entry}` : null,
    files: files.length,
    images: pics.top.map(f => ({ url: view(f), caption: caption(f), phone: /(^|[-_.])(3[69]0|phone|mobile)([-_.]|$)/i.test(path.basename(f)) })),
    imageCount: pics.count,
  };
}

// The pictures a gate shows first: screenshots of the work itself, not references, critique crops or contact
// sheets. Prefers desktop dark shots of screens; at most three, plus how many there are in all.
function reviewImages(files) {
  const all = files.filter(f => /\.(png|jpe?g|webp)$/i.test(f) && !/(^|\/)(references?|refs|review|before|after|crops?|contact|sheets?|thumbs?)(\/|[-_.])/i.test(f) && !/contact|sheet|crop|thumb|icon|favicon|logo/i.test(path.basename(f)));
  const score = f => (/screens?\d*\//i.test(f) ? 0 : 4) + (/shots?\//i.test(f) ? 0 : 1) + (/1440|desktop/i.test(f) ? 0 : 2) + (/light/i.test(path.basename(f)) ? 1 : 0);
  const ranked = all.map(f => [score(f), f]).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).map(x => x[1]);
  const top = [], seen = new Set();
  for (const f of ranked) { const k = caption(f); if (seen.has(k)) continue; seen.add(k); top.push(f); if (top.length === 3) break; }
  return { top, count: all.length };
}
const caption = f => { const s = path.basename(f).replace(/\.\w+$/, '').replace(/[-_.]+/g, ' ').replace(/\b(1440|1280|1024|768|390|360|dark|light|full|v\d+|shot|png)\b/gi, '').replace(/\s+/g, ' ').trim(); return s ? s[0].toUpperCase() + s.slice(1) : 'Screen'; };

// Serves a phase's files for viewing on the separate view port. The signed path is what grants access, so
// relative links between mockups keep working.
function serveView(res, pathname) {
  const [, , sig, aliasEnc, phase, ...rest] = pathname.split('/');
  const alias = decodeURIComponent(aliasEnc || '');
  const file = rest.map(decodeURIComponent).join('/');
  const ok = alias && project.list().includes(alias) && REVIEW[phase] && sig && sig.length === 22
    && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(viewSig(alias)))
    && file && !file.split('/').some(s => s === '..' || s === '') && project.PHASE_DOCS[phase].some(g => file.startsWith(g.replace(/\*\*$/, '')) || file === g);
  if (!ok) { res.writeHead(404); return res.end('not found'); }
  const { repo, ref } = phaseRef(alias, phase);
  const body = gitShow(repo, ref, file);
  if (body === null) { res.writeHead(404); return res.end('not found'); }
  const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' }[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  res.end(body);
}

// A task's proof (screenshots, recordings, run logs), served on the view port like mockups: agent-made
// files never share the dashboard's origin.
function evidenceFor(id) {
  const dir = path.join(runDir(id), 'evidence');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => !fs.statSync(path.join(dir, f)).isDirectory());
  const notes = files.includes('EVIDENCE.md') ? fs.readFileSync(path.join(dir, 'EVIDENCE.md'), 'utf8') : '';
  const sig = viewSig(`task:${id}`);
  return {
    notes,
    viewPort: VIEW_PORT,
    files: files.filter(f => f !== 'EVIDENCE.md').map(f => ({ name: f, url: VIEW_PORT ? `/evidence/${sig}/${encodeURIComponent(id)}/${encodeURIComponent(f)}` : null, image: /\.(png|jpe?g|webp|gif)$/i.test(f), video: /\.(mp4|webm)$/i.test(f), audio: /\.(wav|mp3|ogg|flac|m4a)$/i.test(f) })),
  };
}

function serveEvidence(res, pathname) {
  const [, , sig, idEnc, fileEnc] = pathname.split('/');
  const id = decodeURIComponent(idEnc || ''), file = decodeURIComponent(fileEnc || '');
  const ok = /^[\w-]+$/.test(id) && file && !/[\\/]|^\.\.?$/.test(file) && sig?.length === 22
    && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(viewSig(`task:${id}`)));
  const f = ok && path.join(runDir(id), 'evidence', file);
  if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.json': 'application/json' }[path.extname(f).toLowerCase()] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  fs.createReadStream(f).pipe(res);
}

// The command in an approval the owner just approved: run on this PC with no window, in the background so the
// dashboard stays responsive; the result goes to the lead (asks.ran) when it finishes, or after 15 minutes.
const RUN_SHELL = { powershell: c => ['powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', c]], cmd: c => ['cmd.exe', ['/d', '/s', '/c', c]], bash: c => ['bash', ['-lc', c]] };
// Something to try (a local address in its links or its output) reaches the owner only once that page answers;
// a dead page goes back to the lead instead (review, 10 Nov: pages that didn't open were the commonest complaint).
// A command that serves the page in the foreground is left running for up to 3 hours once the page answers.
const LOCAL_URLS = /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?[^\s'"<>)]*/gi;
async function answers(url) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: 'manual' }); return r.status < 500; } catch { return false; }
}
async function firstAnswering(urls, ms) {
  for (const end = Date.now() + ms; ;) {
    for (const u of urls) if (await answers(u)) return u;
    if (Date.now() > end) return null;
    await new Promise(r => setTimeout(r, 2000));
  }
}
function runApproved(alias, a) {
  const [exe, argv] = RUN_SHELL[a.run.shell](a.run.command);
  let out = '', done = false, serving = false;
  const local = () => [...new Set([...(a.links || []).filter(l => /^https?:\/\//.test(l)), ...(out.match(LOCAL_URLS) || [])].filter(u => new RegExp(LOCAL_URLS.source, 'i').test(u)))];
  const report = r => { try { asks.ran(alias, a.id, { output: out, ...r }); } catch { /* the message was removed */ } reads.gen++; };
  const finish = async r => {
    if (done) return; done = true; clearTimeout(timer); clearInterval(poll);
    const urls = local();
    if (r.code === 0 && !r.error && urls.length && !(await firstAnswering(urls, 60_000))) r = { code: -1, error: `it finished, but the page to try (${urls[0]}) didn't answer within a minute, so the owner wasn't shown it` };
    report(r);
  };
  let child;
  try { child = spawn(exe, argv, { cwd: a.run.cwd && fs.existsSync(a.run.cwd) ? a.run.cwd : os.homedir(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { return finish({ code: -1, error: `couldn't start ${exe}: ${e.message}` }); }
  const keep = d => { out = (out + d).slice(-20000); };
  child.stdout.on('data', keep); child.stderr.on('data', keep);
  child.on('error', e => finish({ code: -1, error: `couldn't start ${exe}: ${e.message}` }));
  child.on('close', code => { if (serving) return; finish({ code }); });
  // Still running and its page answers: it's a server. Tell the owner it's ready, and stop it after 3 hours.
  const poll = setInterval(async () => {
    if (done || serving) return;
    const urls = local();
    if (urls.length && await firstAnswering(urls, 0)) { serving = true; done = true; clearTimeout(timer); clearInterval(poll); report({ code: 0 }); setTimeout(() => killTree(child.pid), 3 * 3600_000).unref?.(); }
  }, 5000);
  const timer = setTimeout(() => { killTree(child.pid); finish({ code: -1, error: 'still running after 15 minutes with no page answering, so it was stopped' }); }, 15 * 60_000);
}

// A lead's message as the dashboard shows it: its attachments as signed view-port URLs, sorted into kinds.
function askView(alias, a) {
  const sig = viewSig(`ask:${alias}`);
  const files = (a.files || []).map(f => ({ name: f, url: VIEW_PORT ? `/ask/${sig}/${encodeURIComponent(alias)}/${a.id}/${encodeURIComponent(f)}` : null,
    image: /\.(png|jpe?g|webp|gif|svg)$/i.test(f), video: /\.(mp4|webm)$/i.test(f), audio: /\.(wav|mp3|ogg|flac|m4a)$/i.test(f), page: /\.html?$/i.test(f) }));
  const plans = (a.plans || []).map(id => { try { const c = cards.load(id); return { id, title: c.meta.title, role: c.meta.role || 'builder', status: c.meta.status, iterations: c.meta.iterations, budget: Number(c.meta.budget) || null, brief: c.body }; } catch { return { id, title: id, status: 'gone' }; } });
  return { ...a, files, viewPort: VIEW_PORT, ...(plans.length && { plans }) };
}

// What the owner already said about a checklist line in the lead's items (asks sent with --lines), so its review
// shows it and they can accept it in one click instead of answering again.
function saidAbout(alias, lineId) {
  return asks.all(alias).filter(a => a.lines?.includes(lineId)).flatMap(a => a.thread.filter(t => t.from === 'owner' && t.text).map(t => ({ ask: a.id, title: a.title, at: t.at, text: t.text })));
}

// A checklist as the dashboard shows it: each line's proof as signed view-port URLs, what its tasks have cost so far.
function lineView(alias, it) {
  const sig = viewSig(`round:${alias}`);
  return { ...it, files: (it.files || []).map(f => ({ name: f, url: VIEW_PORT ? `/round/${sig}/${encodeURIComponent(alias)}/${it.id}/${encodeURIComponent(f)}` : null,
    image: /\.(png|jpe?g|webp|gif|svg)$/i.test(f), video: /\.(mp4|webm)$/i.test(f), audio: /\.(wav|mp3|ogg|flac|m4a)$/i.test(f), page: /\.html?$/i.test(f) })), viewPort: VIEW_PORT, said: saidAbout(alias, it.id) };
}
function roundView(alias, r) {
  const mine = cards.all().map(c => c.meta).filter(m => m.project === alias);
  const ids = new Set(r.items.map(i => i.id));
  const spent = mine.filter(m => String(m.for || '').split(',').some(x => ids.has(x))).reduce((n, m) => n + Number(m.cost_usd || 0), 0);
  const since = r.decidedAt || r.at;
  const outside = mine.filter(m => m.outside && m.created >= since).map(m => ({ id: m.id, title: m.title, why: m.outside, cost: Number(m.cost_usd || 0) }));
  return { ...r, items: r.items.map(i => lineView(alias, i)), spent: Math.round(spent * 100) / 100, outside };
}

function serveAsk(res, pathname) {
  const [, , sig, aliasEnc, id, fileEnc] = pathname.split('/');
  const alias = decodeURIComponent(aliasEnc || ''), file = decodeURIComponent(fileEnc || '');
  const ok = alias && project.list().includes(alias) && /^A-\d+$/.test(id || '') && file && !/[\\/]|^\.\.?$/.test(file) && sig?.length === 22
    && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(viewSig(`ask:${alias}`)));
  const f = ok && path.join(asks.filesDir(alias, id), file);
  sendAttachment(res, f);
}

function serveRound(res, pathname) {
  const [, , sig, aliasEnc, id, fileEnc] = pathname.split('/');
  const alias = decodeURIComponent(aliasEnc || ''), file = decodeURIComponent(fileEnc || '');
  const ok = alias && project.list().includes(alias) && /^C-\d+$/.test(id || '') && file && !/[\\/]|^\.\.?$/.test(file) && sig?.length === 22
    && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(viewSig(`round:${alias}`)));
  sendAttachment(res, ok && path.join(checklist.filesDir(alias, id), file));
}

function sendAttachment(res, f) {
  if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4', '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.pdf': 'application/pdf' }[path.extname(f).toLowerCase()] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  fs.createReadStream(f).pipe(res);
}

function taskDetail(id) {
  const card = cards.load(id);
  const dir = runDir(id);
  const read = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '';
  const ids = decisions.criteriaIds(card.meta.criteria);
  const criteria = card.meta.project ? decisions.loadCriteria(card.meta.project).criteria.filter(c => ids.includes(c.id)) : [];
  const timeline = events.read().filter(e => e.id === id);
  return { meta: card.meta, body: card.body, progress: read('PROGRESS.md'), decisions: read('DECISIONS.md'), questions: read('QUESTIONS.md'), review: read('REVIEW.md'), lastCheck: read('last-check.txt'), criteria, timeline,
    evidence: evidenceFor(id),
    // The question it is waiting on, split like the Inbox's (title, context, suggested answers), so the task page asks it the same way.
    ask: card.meta.status === 'needs-you' ? (q => ({ title: q.title, ...questionParts(q.body || '') }))(openQuestion(id)) : null,
    live: usage.live(card.meta, timeline), spend: card.meta.project ? { spent: Number(taskSpent(card.meta).toFixed(2)), limit: budget.taskLimit(card.meta) } : null };
}
// Only a running task has a live run to estimate at the machine's model rates (a walk over every run, seconds cold);
// any other task's spend is its finished runs' cost.
const taskSpent = meta => meta.status === 'running' ? budget.taskSpend(meta) : usage.runs(meta.id).filter(r => r.done).reduce((n, r) => n + r.cost, 0);

// The one place that decides who's on the team right now and what each is doing. The sidebar badge,
// the Office, and the project page all read this, so they can't disagree.
const BUSY = new Set(['working', 'reviewing', 'auditing']);
function team(s, lead) {
  const a = s.alias;
  const out = [];
  const now = lead.running ? leadNow.forProject(a) : null;
  // Bringing finished work in (atelier land) runs the full tests for minutes after the lead's turn has ended.
  const landing = idle.landing(s.tasks);
  const leadBusy = lead.running && (!!landing || (now ? now.busy : leadActive(a)));
  out.push({ kind: 'lead', who: 'Lead', state: lead.running ? (leadBusy ? 'working' : 'duty') : 'away', href: landing ? `#/t/${landing.id}` : `#/p/${a}/overview`,
    what: lead.running ? (landing ? `Bringing in “${landing.title}”: full tests on the latest build, started ${new Date(landing.landing).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : leadBusy ? now?.doing || 'Planning and delegating' : 'Watching for your decisions') : 'Off',
    meta: lead.running ? `"${a} lead" in the Claude app` : 'start it from the project page' });
  const active = s.tasks.filter(t => ['running', 'needs-you', 'stalled'].includes(t.status));
  for (const t of active) {
    const reviewing = /in review/.test(t.reason || '');
    // A task the runner holds for the plan window stays running but is not working: no quiet flag, no ETA (owner ruling).
    const paced = t.status === 'running' && /^paced:/.test(t.reason || '');
    const state = t.status === 'needs-you' ? 'needs' : t.status === 'stalled' ? 'stuck' : paced ? 'paced' : reviewing ? 'reviewing' : 'working';
    const n = t.live?.current?.n || t.iteration || 0;
    out.push({ kind: reviewing ? 'reviewer' : 'task', id: t.id, role: t.role || 'builder', who: reviewing ? 'reviewer' : (t.role || 'builder'), state, href: `#/t/${t.id}`,
      what: t.title, reviewingFor: reviewing ? (t.role || 'builder') : null,
      iteration: t.iteration || 0, iterations: t.iterations, eta: paced ? null : t.eta, resumesAt: paced ? resumesAt(t.reason) : null, live: t.live, budget: t.budget, cost: (t.cost || 0) + (t.liveCost || 0), spend: Number(((t.cost || 0) + (t.liveCost || 0)).toFixed(2)), now: t.now,
      prog: n && t.iterations ? [n, Number(t.iterations), 'try'] : null, ...(t.status === 'running' ? nowDoing(t.id) : {}), ...(paced ? { quietMin: 0 } : {}) });
  }
  // A task that finished in the last few minutes: its role's desk says so for a moment (the green window).
  const finished = new Map();
  for (const t of s.tasks) if (t.status === 'done' && !closedNotDone(t) && Date.now() - Date.parse(t.updated || 0) < FINISHED_MS && !finished.has(t.role || 'builder')) finished.set(t.role || 'builder', { id: t.id, title: t.title, at: t.updated });
  if (!active.some(t => /in review/.test(t.reason || '')) && s.roster.some(r => r.role === 'reviewer')) {
    out.push({ kind: 'reviewer', who: 'reviewer', state: 'idle', what: 'Waiting for finished work', meta: `${s.reviewer?.model || 'opus'} · checks every task` });
  }
  const audit = auditProgress(a);
  out.push({ kind: 'auditor', who: 'auditor', state: audit ? 'auditing' : 'idle', href: `#/p/${a}/audits`,
    what: audit ? 'Checking the product against your words' : 'Between audits',
    meta: audit ? `started ${audit.startedMin}m ago · ${audit.stage}` : (s.lastAudit ? `last audit ${Math.round((Date.now() - Date.parse(s.lastAudit.at)) / 60000)}m ago` : 'reports only to you'),
    prog: audit?.checkers ? [audit.finished, audit.checkers, 'checkers'] : null,
    audit });
  const busyRoles = new Set(active.map(t => t.role || 'builder'));
  // An idle role with a paused task, or one held waiting on something, says so at its desk (F-11); it is still not working.
  const held = role => s.tasks.find(t => (t.role || 'builder') === role && (t.status === 'paused' || (t.status === 'queued' && /^waiting\b/i.test(t.reason || ''))));
  for (const r of s.roster.filter(r => r.role !== 'reviewer' && !busyRoles.has(r.role))) {
    const h = held(r.role);
    out.push({ kind: 'role', who: r.role, state: 'idle', what: h ? h.title : 'No task right now', finished: finished.get(r.role) || null,
      held: h ? { id: h.id, status: h.status, reason: h.reason || '' } : null, ...(h ? { href: `#/t/${h.id}` } : {}) });
  }
  return { agents: out, working: out.filter(x => BUSY.has(x.state)).length, paced: out.filter(x => x.state === 'paced').length, needs: out.filter(x => x.state === 'needs').length, duty: out.filter(x => x.state === 'duty').length };
}

const FINISHED_MS = 3 * 60_000;
// When a paced task carries on, as HH:MM: the runner writes "paced: <why>, resumes <local time>".
function resumesAt(reason) {
  const m = String(reason || '').match(/resumes\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?/i);
  if (!m) return null;
  let h = Number(m[1]) % (m[3] ? 12 : 24);
  if (m[3] && /p/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}
// A working agent counts as quiet once its log hasn't moved for this long (the Office's and task page's stuck signal).
const QUIET_MIN = 15;
// What a running agent is doing, in its own plain words, and when it last did anything: the newest thing it said,
// or the description it gave its newest command (never the command itself). Reads only the tail of its log: the
// newest written of the builder's (iter-N) and the reviewer's (review-N), so a task in review shows the reviewer.
function nowDoing(id) {
  const dir = runDir(id);
  let file, size = 0, mtimeMs = 0;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!/^(iter|review)-\d+\.jsonl$/.test(f)) continue;
      const st = fs.statSync(path.join(dir, f));
      if (st.mtimeMs > mtimeMs) ({ size, mtimeMs } = st), file = path.join(dir, f);
    }
  } catch { return {}; }
  if (!file) return {};
  // A screenshot the agent just looked at can be a single line of several hundred KB, so the window grows (to 4 MB)
  // until it reaches something the agent said.
  // With nothing said or described, the newest tool call in plain words from its kind (F-17): "Getting started" is
  // left for an agent that hasn't called a tool yet.
  let step = '', tool = '';
  const fd = fs.openSync(file, 'r');
  try {
    for (let want = 256 * 1024; !step; want *= 4) {
      const len = Math.min(size, want), buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, size - len);
      const lines = buf.toString('utf8').split('\n');
      for (let i = lines.length - 1; i >= 0 && !step; i--) {
        if (!lines[i].includes('"type":"assistant"')) continue;
        let e; try { e = JSON.parse(lines[i]); } catch { continue; }
        for (const b of [...(e.message?.content || [])].reverse()) {
          if (b.type === 'text' && b.text.trim()) { step = sentence(b.text); break; }
          if (b.type === 'tool_use' && b.input?.description) { step = sentence(b.input.description); break; }
          if (b.type === 'tool_use' && !tool) tool = toolWords(b);
        }
      }
      if (len === size || want >= 4 * 1024 * 1024) break;
    }
  } finally { fs.closeSync(fd); }
  const quiet = Math.floor((Date.now() - mtimeMs) / 60000);
  return { step: step || tool, lastAt: new Date(mtimeMs).toISOString(), quietMin: quiet >= QUIET_MIN ? quiet : 0 };
}
// A tool call in plain words from its kind alone: never its file paths or commands.
function toolWords(b) {
  const n = String(b.name || ''), f = String(b.input?.file_path || b.input?.notebook_path || '');
  if (/^mcp__.*(playwright|browser|chrome)/i.test(n) || /browser|screenshot/i.test(n)) return 'Looking at the screen in a browser';
  if (/^(Read|NotebookRead)$/.test(n)) return 'Reading files';
  if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(n)) return /\.(md|txt)$/i.test(f) ? 'Writing notes' : 'Editing code';
  if (/^TodoWrite$/.test(n)) return 'Writing notes';
  if (/^(Grep|Glob|LS|ToolSearch)$/.test(n)) return 'Searching the code';
  if (/^(Bash|PowerShell|BashOutput|Monitor)$/.test(n)) return 'Running a check';
  if (/^(WebSearch|WebFetch)$/.test(n)) return 'Reading on the web';
  if (/^(Task|Agent)$/.test(n)) return 'Handing part of the work to a helper';
  return 'Working';
}
// The first sentence of an agent's message, without markdown, at most about a line.
function sentence(text) {
  const s = String(text).replace(/ATELIER_STATUS:.*$/m, '').replace(/[`*_#>|]/g, '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^.{8,}?[.!?](?=\s|$)/);
  const one = m ? m[0] : s;
  return one.length <= 160 ? one : `${one.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}

// What a running audit is doing: how long it's been going and how many independent checkers have finished.
function auditProgress(alias) {
  if (!auditor.auditRunning(alias)) return null;
  const lock = path.join(project.dir(alias), 'audit.lock');
  const startedMin = Math.max(0, Math.round((Date.now() - fs.statSync(lock).mtimeMs) / 60000));
  const dir = auditor.auditDir(alias);
  const latest = fs.readdirSync(dir).filter(f => /^\d{4}-/.test(f)).sort().pop();
  if (!latest) return { startedMin, stage: 'getting ready' };
  const files = fs.readdirSync(path.join(dir, latest));
  const done = f => { try { return fs.readFileSync(path.join(dir, latest, f), 'utf8').includes('"type":"result"'); } catch { return false; } };
  const checkers = files.filter(f => /^checker-\d+\.jsonl$/.test(f));
  const finished = checkers.filter(done).length;
  // When the checkers are done the auditor still works: it cross-checks what they found, then writes the report.
  // That step says so, and like a task the audit is quiet only when none of its logs has moved for a while.
  let lastMs = 0;
  for (const f of files) try { lastMs = Math.max(lastMs, fs.statSync(path.join(dir, latest, f)).mtimeMs); } catch { /* gone */ }
  const quiet = lastMs ? Math.floor((Date.now() - lastMs) / 60000) : 0;
  const all = checkers.length > 0 && finished === checkers.length;
  // Quiet because the plan limit is holding it, not because anything's wrong: its last sign of life is that hold.
  const held = quiet >= QUIET_MIN && events.read({ sinceMin: 7 * 24 * 60 }).filter(e => e.id === `audit-${alias}` && e.type === 'paced').some(e => Date.parse(e.ts) >= lastMs - 5000);
  if (held) return { startedMin, stage: `${finished} of ${checkers.length} checkers done, waiting for your plan window`, checkers: checkers.length, finished, held: true, lastAt: new Date(lastMs).toISOString(), quietMin: 0 };
  const cross = files.includes('crosscheck.jsonl');
  const stage = !checkers.length ? 'getting ready'
    : cross ? (done('crosscheck.jsonl') ? `all ${checkers.length} checkers done, writing the report` : `all ${checkers.length} checkers done, cross-checking what they found`)
    : all ? `all ${checkers.length} checkers done, summarising what they found` : `${finished} of ${checkers.length} checkers done`;
  return { startedMin, stage, checkers: checkers.length, finished, summarising: all, lastAt: lastMs ? new Date(lastMs).toISOString() : null, quietMin: quiet >= QUIET_MIN ? quiet : 0 };
}

// The lead counts as working when it has done something in the last few minutes; otherwise it's on duty.
function leadActive(alias) {
  const since = Date.now() - 4 * 60_000;
  const mine = new Set(cards.all().filter(c => c.meta.project === alias).map(c => c.meta.id));
  const LEAD = /^(criterion-|ruling|gate-request|gate|overrule|requested|criteria-request|lead|queued|added|extended)/;
  return events.read({ sinceMin: 5 }).some(e => Date.parse(e.ts) > since && (e.id === alias || mine.has(e.id)) && LEAD.test(e.type) && !/by owner/.test(e.msg));
}


function leadState(alias) {
  const pidFile = path.join(project.dir(alias), 'lead.pid');
  const pid = fs.existsSync(pidFile) ? Number(fs.readFileSync(pidFile, 'utf8')) : 0;
  return { running: alive(pid), pid };
}

// ---------- writes (owner context) ----------

function act(b) {
  const need = (...keys) => { for (const k of keys) if (b[k] === undefined || b[k] === '') throw new Error(`missing ${k}`); };
  switch (b.action) {
    case 'gate-approve': need('project', 'phase', 'quote'); { const r = phaseRef(b.project, b.phase); return owner.approveGate(b.project, b.phase, b.quote, { merge: b.merge || (r.merged ? undefined : r.task) }); }
    case 'gate-skip': need('project', 'phase', 'quote'); return owner.approveGate(b.project, b.phase, b.quote, { skip: true });
    case 'charter-save': {
      need('project', 'text');
      const f = path.join(resolveRepo(b.project), 'atelier', 'CHARTER.md');
      fs.writeFileSync(f, b.text.replace(/\r\n/g, '\n'));
      events.emit(b.project, 'charter', 'edited by owner in the dashboard');
      return 'saved';
    }
    case 'charter-approve': need('project', 'quote'); return owner.approveCharter(b.project, b.quote);
    case 'criterion': need('project', 'id', 'verb'); return owner.criterion(b.project, b.id, b.verb, b.note || '');
    case 'criteria-approve-all': need('project', 'ids'); return String(b.ids).split(',').map(id => owner.criterion(b.project, id.trim(), 'approve')).length;
    case 'plan-approve': need('id'); owner.approveTask(b.id); spawnDetached(['tick']); return 'queued';
    case 'answer': {
      need('id', 'text');
      fs.appendFileSync(path.join(runDir(b.id), 'QUESTIONS.md'), `\n### ANSWER from owner (${new Date().toLocaleString()})\n${b.text}\n`);
      const m = cards.load(b.id).meta;
      if (m.status === 'needs-you') cards.update(b.id, { status: 'queued', reason: '', ...( /Used all|budget/.test(m.reason || '') ? { iterations: Number(m.iterations) + 5, hours: Number(m.hours) + 1 } : {}) });
      events.emit(b.id, 'answered', b.text.slice(0, 120));
      spawnDetached(['tick']);
      return 'answered';
    }
    case 'ask-answer': {
      need('project', 'id', 'verdict');
      const a = asks.answer(b.project, b.id, { verdict: b.verdict, text: b.text || '' });
      if (a.run?.state === 'running') runApproved(b.project, a);
      // Approving an item that carries plans approves those plans: one decision, not one per task as well.
      if (b.verdict === 'approve' && a.plans?.length) {
        for (const id of a.plans) { try { if (cards.load(id).meta.status === 'planned') owner.approveTask(id); } catch { /* gone or already started */ } }
        spawnDetached(['tick']);
      }
      return a.run?.state === 'running' ? 'running' : a.status;
    }
    case 'round-decide': need('project', 'n', 'verdict'); return checklist.decide(b.project, b.n, b.verdict === 'approve', b.note || '').status;
    case 'line-judge': need('project', 'id', 'verdict'); return checklist.judge(b.project, b.id, b.verdict === 'accept', b.note || '').status;
    case 'pair-new': return newPairing();
    case 'lead-note': need('project', 'text'); return asks.note(b.project, b.text, { re: b.re || '' }).id;
    case 'finding': need('project', 'id', 'verdict'); return auditor.judge(b.project, b.id, b.verdict, b.note || '');
    case 'ruling': {
      need('project', 'text');
      const id = decisions.addRuling(resolveRepo(b.project), b.text, 'owner, in the dashboard');
      events.emit(b.project, 'ruling', `${id}: ${b.text}`);
      return id;
    }
    case 'screen': need('project', 'id'); return screen.decide(b.project, b.id, b.verdict === 'allow', b.minutes);
    case 'claude-app-fix': return claudeApp.fix();
    case 'lead-wake': need('project'); return idle.wake(b.project);
    case 'screen-seen': need('project', 'id'); return screen.dismissNotice(b.project, b.id);
    case 'pace': return owner.setPace(b.fiveHour, b.sevenDay, b.spread === undefined ? undefined : b.spread === true || b.spread === 'true');
    case 'dial': need('project', 'dial'); if (b.dial !== 'ownerGates') need('value'); return owner.setDial(b.project, b.dial, b.value ?? '');
    case 'project-create': {
      need('name');
      const r = newproject.create({ name: b.name, roster: b.roster, ship: b.ship, github: !!b.github, description: b.description || '' });
      if (b.startLead) startLead(r.alias);
      return r;
    }
    case 'audit': need('project'); spawnDetached(['audit', b.project, 'run']); return 'started';
    case 'lead-start': need('project'); return startLead(b.project);
    // Closing a project: its lead stops, nothing more is pushed, and it leaves the Inbox, sidebar and Office.
    case 'project-close': {
      need('project');
      const p = project.load(b.project);
      if (b.reopen) delete p.closed; else p.closed = new Date().toISOString();
      delete p.github;
      project.save(p);
      if (!b.reopen) {
        fs.writeFileSync(path.join(project.dir(b.project), 'lead.stop'), '1');
        fs.rmSync(path.join(project.dir(b.project), 'lead.wanted'), { force: true });
        const st = leadState(b.project);
        if (st.running) killTree(st.pid);
      }
      events.emit(b.project, 'project', b.reopen ? 'project reopened' : 'project closed by the owner: lead off, nothing pushed, off the Inbox');
      return b.reopen ? 'reopened' : 'closed';
    }
    case 'lead-restart': {
      need('project');
      const st = leadState(b.project);
      if (!st.running) return startLead(b.project);
      fs.writeFileSync(path.join(project.dir(b.project), 'lead.restart'), '1');
      killTree(st.pid);
      return 'restarting fresh';
    }
    case 'lead-stop': {
      need('project');
      fs.writeFileSync(path.join(project.dir(b.project), 'lead.stop'), '1');
      fs.rmSync(path.join(project.dir(b.project), 'lead.wanted'), { force: true });
      const st = leadState(b.project);
      if (st.running) killTree(st.pid);
      return 'stopped';
    }
    case 'task-stop': {
      need('id');
      const m = cards.load(b.id).meta;
      stopRunner(m);
      cards.update(b.id, { status: 'paused', reason: 'stopped by owner', pid: '' });
      events.emit(b.id, 'paused', 'stopped by owner');
      return 'stopped';
    }
    default: throw new Error(`unknown action ${b.action}`);
  }
}

function startLead(alias) {
  // Opens the lead in its own console window (atelier lead re-launches itself in one when it has no terminal).
  const child = spawn(process.execPath, [path.join(PKG, 'bin', 'atelier.mjs'), 'lead', alias], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return 'starting';
}

// ---------- plumbing ----------

function authed(req, sig) {
  const c = Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')));
  const v = c[COOKIE] || '';
  return v.length === sig.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(sig));
}

// Adding a device: a short code the signed-in owner asks for, so nobody types the long token on a phone.
// It works once, for 10 minutes, and is cancelled after 5 wrong tries (anything on the owner's Tailscale can reach sign-in).
let pairing = null;
function newPairing() {
  pairing = { code: String(crypto.randomInt(100000, 1000000)), until: Date.now() + 10 * 60_000, wrong: 0 };
  const ip = tailscaleAddress();
  return { code: pairing.code, until: pairing.until, phoneUrl: ip ? `http://${ip}:${SERVE_PORT}` : '' };
}
function usePairing(given) {
  if (!pairing || !given || Date.now() > pairing.until) return false;
  if (given.trim() === pairing.code) { pairing = null; return true; }
  if (/^\d{6}$/.test(given.trim()) && ++pairing.wrong >= 5) pairing = null;
  return false;
}

async function login(req, res, secret, sig) {
  const body = await readBody(req);
  const given = new URLSearchParams(body).get('token') || (() => { try { return JSON.parse(body).token; } catch { return ''; } })();
  const ok = (given && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) || usePairing(given);
  if (!ok) { res.writeHead(303, { Location: '/?login=failed' }); return res.end(); }
  // Secure only when the browser reached us over https (e.g. through `tailscale serve`), or the cookie would never come back.
  const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.writeHead(303, { 'Set-Cookie': `${COOKIE}=${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${90 * 24 * 3600}${secure}`, Location: '/' });
  res.end();
}

function serveStatic(res, p) {
  const file = path.join(STATIC, p === '/' ? 'index.html' : path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(STATIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

// The same page, marked so app.js shows sign in straight away instead of asking the API and getting a 401.
function serveSignedOut(res) {
  const html = fs.readFileSync(path.join(STATIC, 'index.html'), 'utf8').replace('<body>', '<body data-signed-out>');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(html);
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

// A 200 whose body is already JSON text (built by the reads worker).
function jsonText(res, text) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

// The PC's Tailscale IPv4 (in 100.64.0.0/10), or null when Tailscale isn't installed or connected.
export function tailscaleAddress() {
  const cgnat = a => { const [x, y] = a.split('.').map(Number); return x === 100 && y >= 64 && y < 128; };
  const v4 = Object.entries(os.networkInterfaces()).flatMap(([name, list]) => (list || []).map(i => ({ name, ...i })))
    .filter(i => i.family === 'IPv4' && !i.internal && cgnat(i.address));
  return (v4.find(i => /tailscale/i.test(i.name)) || v4[0])?.address || null;
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
}
