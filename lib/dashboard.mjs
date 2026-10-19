// The owner's dashboard: a small local web server (no dependencies) for the desktop and phone browser.
// Every write goes through owner.asOwner, so only clicks here (or the owner's own terminal) can approve
// gates, criteria, plans and the charter. It also runs the scheduler every minute.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { HOME, PKG, paths, readJson, runDir, resolveRepo } from './home.mjs';
import * as project from './project.mjs';
import * as decisions from './decisions.mjs';
import * as owner from './owner.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as limits from './limits.mjs';
import * as metrics from './metrics.mjs';
import * as messages from './messages.mjs';
import * as auditor from './auditor.mjs';
import { tick } from './tick.mjs';
import * as usage from './usage.mjs';
import * as newproject from './newproject.mjs';
import { killTree, alive, spawnDetached } from './runner.mjs';

const STATIC = path.join(PKG, 'dashboard');
const TOKEN_FILE = path.join(HOME, 'dashboard-token');
const COOKIE = 'atelier_session';

export function token() {
  if (!fs.existsSync(TOKEN_FILE)) fs.writeFileSync(TOKEN_FILE, crypto.randomBytes(18).toString('base64url'));
  return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
}

export function serve({ port = 4747, lan = false } = {}) {
  const secret = token();
  const sessionSig = crypto.createHmac('sha256', secret).update('session').digest('base64url');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/login' && req.method === 'POST') return login(req, res, secret, sessionSig);
      if (url.pathname.startsWith('/api/')) {
        if (!authed(req, sessionSig)) return json(res, 401, { error: 'not signed in' });
        if (req.method === 'POST' && req.headers['x-atelier'] !== '1') return json(res, 403, { error: 'missing header' });
        return await api(req, res, url);
      }
      return serveStatic(res, url.pathname);
    } catch (err) {
      json(res, 500, { error: err.message });
    }
  });
  const host = lan ? '0.0.0.0' : '127.0.0.1';
  // Agent-written pages (design mockups) get their own origin on the next port, so their scripts can't
  // use the dashboard's session. Access is by the signed path alone.
  VIEW_PORT = port + 1;
  http.createServer((req, res) => {
    try { serveView(res, new URL(req.url, 'http://x').pathname); } catch { res.writeHead(500); res.end(); }
  }).listen(VIEW_PORT, host).on('error', () => { VIEW_PORT = null; });
  server.listen(port, host, () => {
    console.log(`Atelier dashboard: http://localhost:${port}`);
    if (lan) for (const ip of lanAddresses()) console.log(`  on your phone (same Wi-Fi): http://${ip}:${port}`);
    console.log(`  access token: ${secret}   (enter it once per device)`);
  });
  // The dashboard doubles as the scheduler, so work keeps moving even when no lead session is open.
  setInterval(() => { try { tick({ quiet: true }); } catch { /* next minute */ } }, 60_000).unref?.();
  return server;
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1);
  if (req.method === 'GET') {
    if (parts[0] === 'overview') return json(res, 200, overview());
    if (parts[0] === 'project') return json(res, 200, projectDetail(parts[1]));
    if (parts[0] === 'task') return json(res, 200, taskDetail(parts[1]));
    return json(res, 404, { error: 'unknown' });
  }
  if (req.method === 'POST' && parts[0] === 'action') {
    const body = JSON.parse(await readBody(req) || '{}');
    const result = owner.asOwner(() => act(body));
    return json(res, 200, { ok: true, result: result ?? null });
  }
  json(res, 404, { error: 'unknown' });
}

// ---------- reads ----------

function overview() {
  const aliases = project.list();
  const projects = aliases.map(a => { try { return metrics.status(a); } catch (e) { return { alias: a, error: e.message }; } });
  const loose = cards.all().filter(c => !c.meta.project && !['done', 'failed'].includes(c.meta.status)).map(c => c.meta);
  return {
    projects: projects.map(p => { if (p.error) return p; const lead = leadState(p.alias); return { ...p, lead, team: team(p, lead) }; }),
    atelierToday: usage.today(),
    queue: projects.flatMap(queueFor),
    looseTasks: loose,
    limits: limits.snapshot(),
    limitsText: limits.describe(),
    events: events.read({ sinceMin: 60 * 24 * 3 }).slice(-80).reverse(),
    version: version(),
  };
}

// Changes whenever the dashboard's own files change, so open pages can reload themselves.
function version() {
  return Math.max(...fs.readdirSync(STATIC).map(f => fs.statSync(path.join(STATIC, f)).mtimeMs)).toString(36);
}

// Everything waiting on the owner, most urgent first.
function queueFor(s) {
  if (s.error) return [];
  const q = [];
  const add = (kind, priority, title, detail, extra = {}) =>
    q.push({ kind, priority, project: s.alias, title, detail, key: `${kind}:${s.alias}:${extra.id || extra.phase || extra.dial || ''}`, ...extra });
  if (s.github?.problem) add('github', 1, "Work isn't reaching GitHub", `Atelier pushes to GitHub on its own every couple of minutes, and it can't right now: ${s.github.problem}. The lead has been told; if it's about signing in to GitHub, that one is yours.`);
  if (s.charter?.tampered) add('charter-tampered', 0, 'Your charter changed after you approved it', 'Someone edited `atelier/CHARTER.md` after your approval. Read it in Docs and approve it again if the change is yours.');
  for (const f of s.findings.filter(f => f.status === 'open')) {
    add('finding', f.severity === 'high' ? 0 : f.severity === 'medium' ? 2 : 4, f.headline || f.claim,
      f.impact ? `**If nobody fixes it:** ${f.impact}` : '',
      { expected: f.expected, observed: f.observed, evidence: f.evidence, id: f.id, severity: f.severity, reversibility: f.reversibility, at: f.at || f.audit });
  }
  for (const [ph, g] of Object.entries(s.gates)) if (g?.status === 'requested') { const r = reviewFor(s.alias, ph); add('gate', 1, `Approve ${ph}`, g.summary, { phase: ph, at: g.at, review: r && { open: r.open, viewPort: r.viewPort, docName: r.docName, merged: r.merged, files: r.files } }); }
  const repoCharter = s.repo && fs.existsSync(path.join(s.repo, 'atelier', 'CHARTER.md')) ? fs.readFileSync(path.join(s.repo, 'atelier', 'CHARTER.md'), 'utf8') : '';
  const charterDrafted = repoCharter.replace(/<!--[\s\S]*?-->/g, '').replace(/^#.*$/gm, '').trim().length > 40;
  if (!s.charter && charterDrafted) add('charter', 1, 'Approve your charter', 'The lead drafted your charter from your brief. Read it, change anything that isn\'t in your words, then approve it.');
  for (const c of s.criteria.filter(c => c.status === 'awaiting-owner')) add('owner-criterion', 2, c.statement, 'This one needs your judgement. Try the product, then accept or reject it.', { id: c.id, at: c.history?.at(-1)?.at });
  // Only owner-level outcomes need the owner; several drafts arrive as one batch to approve together.
  const drafts = s.criteria.filter(c => c.status === 'draft' && decisions.levelOf(c) === 'owner');
  if (drafts.length === 1) {
    const c = drafts[0];
    add('criterion', 3, c.statement, `**Serves:** ${c.serves}`, { id: c.id, at: c.history?.at(-1)?.at });
  } else if (drafts.length > 1) {
    add('criteria', 3, `Approve ${drafts.length} outcomes`, drafts.map(c => `- **${c.id}** ${c.statement}`).join('\n'), { id: drafts.map(c => c.id).join(','), at: drafts.at(-1).history?.at(-1)?.at });
  }
  for (const t of s.tasks.filter(t => t.status === 'planned')) add('plan', 3, t.title, `**Role:** ${t.role || 'builder'}\n\n**Criteria:** ${t.criteria || '—'}\n\n**Budget:** up to ${t.iterations} iterations`, { id: t.id, at: t.updated });
  for (const t of s.tasks.filter(t => t.status === 'needs-you')) add('question', 2, t.reason || t.title, `From task ${t.id}: ${t.title}`, { id: t.id, at: t.updated });
  if (s.suggestion?.ready) add('dial', 5, `Loosen ${s.suggestion.dial} to ${s.suggestion.to}`, `The team has earned it: ${s.suggestion.why}.`, { dial: s.suggestion.dial, to: s.suggestion.to });
  return q.sort((a, b) => a.priority - b.priority);
}

function projectDetail(alias) {
  const s = metrics.status(alias);
  const read = f => fs.existsSync(path.join(s.repo, 'atelier', f)) ? fs.readFileSync(path.join(s.repo, 'atelier', f), 'utf8') : '';
  const lead = leadState(alias);
  return {
    ...s,
    lead,
    team: team(s, lead),
    docs: { charter: read('CHARTER.md'), rulings: read('RULINGS.md'), plan: read('PLAN.md'), ledger: read('LEDGER.md'), brief: read('BRIEF.md'), spec: read('SPEC.md') },
    reviews: Object.fromEntries(['design', 'contracts'].map(ph => [ph, reviewFor(alias, ph)])),
    messages: messages.all(alias).slice(-100).reverse(),
    events: events.read({ project: alias }).slice(-100).reverse(),
  };
}

// ---------- reviewing a phase's work ----------
let VIEW_PORT = null;
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
function reviewFor(alias, phase) {
  const spec = REVIEW[phase];
  if (!spec) return null;
  const { repo, ref, task, merged } = phaseRef(alias, phase);
  const doc = gitShow(repo, ref, spec.doc);
  const entry = (spec.entry || []).find(f => gitShow(repo, ref, f) !== null);
  const files = (gitShow(repo, ref, '') !== null && spawnSync('git', ['ls-tree', '-r', '--name-only', ref, '--', ...project.PHASE_DOCS[phase].map(g => g.replace(/\/\*\*$/, ''))], { cwd: repo, encoding: 'utf8', windowsHide: true }).stdout || '')
    .split('\n').filter(Boolean);
  return {
    phase, task, merged, docName: path.basename(spec.doc), doc: doc ? doc.toString('utf8') : '',
    viewPort: VIEW_PORT,
    open: entry && VIEW_PORT ? `/view/${viewSig(alias)}/${encodeURIComponent(alias)}/${phase}/${entry}` : null,
    files: files.length,
  };
}

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

function taskDetail(id) {
  const card = cards.load(id);
  const dir = runDir(id);
  const read = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '';
  const ids = decisions.criteriaIds(card.meta.criteria);
  const criteria = card.meta.project ? decisions.loadCriteria(card.meta.project).criteria.filter(c => ids.includes(c.id)) : [];
  const timeline = events.read().filter(e => e.id === id);
  return { meta: card.meta, body: card.body, progress: read('PROGRESS.md'), decisions: read('DECISIONS.md'), questions: read('QUESTIONS.md'), review: read('REVIEW.md'), lastCheck: read('last-check.txt'), criteria, timeline };
}

// The one place that decides who's on the team right now and what each is doing. The sidebar badge,
// the Office, and the project page all read this, so they can't disagree.
const BUSY = new Set(['working', 'reviewing', 'auditing']);
function team(s, lead) {
  const a = s.alias;
  const out = [];
  const leadBusy = lead.running && leadActive(a);
  out.push({ kind: 'lead', who: 'Lead', state: lead.running ? (leadBusy ? 'working' : 'duty') : 'away', href: `#/p/${a}/overview`,
    what: lead.running ? (leadBusy ? 'Planning and delegating' : 'Watching for your decisions') : 'Off',
    meta: lead.running ? `"${a} lead" in the Claude app` : 'start it from the project page' });
  const active = s.tasks.filter(t => ['running', 'needs-you', 'stalled'].includes(t.status));
  for (const t of active) {
    const reviewing = /in review/.test(t.reason || '');
    const state = t.status === 'needs-you' ? 'needs' : t.status === 'stalled' ? 'stuck' : reviewing ? 'reviewing' : 'working';
    out.push({ kind: reviewing ? 'reviewer' : 'task', id: t.id, role: t.role || 'builder', who: reviewing ? 'reviewer' : (t.role || 'builder'), state, href: `#/t/${t.id}`,
      what: t.title, reviewingFor: reviewing ? (t.role || 'builder') : null,
      iteration: t.iteration || 0, iterations: t.iterations, eta: t.eta, spend: Number(((t.cost || 0) + (t.liveCost || 0)).toFixed(2)), now: t.now });
  }
  if (!active.some(t => /in review/.test(t.reason || '')) && s.roster.some(r => r.role === 'reviewer')) {
    out.push({ kind: 'reviewer', who: 'reviewer', state: 'idle', what: 'Waiting for finished work', meta: `${s.reviewer?.model || 'opus'} · checks every task` });
  }
  const audit = auditProgress(a);
  out.push({ kind: 'auditor', who: 'auditor', state: audit ? 'auditing' : 'idle', href: `#/p/${a}/audits`,
    what: audit ? 'Checking the product against your words' : 'Between audits',
    meta: audit ? `started ${audit.startedMin}m ago · ${audit.stage}` : (s.lastAudit ? `last audit ${Math.round((Date.now() - Date.parse(s.lastAudit.at)) / 60000)}m ago` : 'reports only to you'),
    audit });
  const busyRoles = new Set(active.map(t => t.role || 'builder'));
  for (const r of s.roster.filter(r => r.role !== 'reviewer' && !busyRoles.has(r.role))) out.push({ kind: 'role', who: r.role, state: 'idle', what: 'No task right now' });
  return { agents: out, working: out.filter(x => BUSY.has(x.state)).length, needs: out.filter(x => x.state === 'needs').length, duty: out.filter(x => x.state === 'duty').length };
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
  if (files.includes('crosscheck.jsonl')) return { startedMin, stage: 'cross-checking findings', checkers: checkers.length, finished };
  return { startedMin, stage: checkers.length ? `${finished} of ${checkers.length} checkers done` : 'getting ready', checkers: checkers.length, finished };
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
    case 'plan-approve': need('id'); owner.approveTask(b.id); tick({ quiet: true }); return 'queued';
    case 'answer': {
      need('id', 'text');
      fs.appendFileSync(path.join(runDir(b.id), 'QUESTIONS.md'), `\n### ANSWER from owner (${new Date().toLocaleString()})\n${b.text}\n`);
      const m = cards.load(b.id).meta;
      if (m.status === 'needs-you') cards.update(b.id, { status: 'queued', reason: '', ...( /Used all|budget/.test(m.reason || '') ? { iterations: Number(m.iterations) + 5, hours: Number(m.hours) + 1 } : {}) });
      events.emit(b.id, 'answered', b.text.slice(0, 120));
      tick({ quiet: true });
      return 'answered';
    }
    case 'finding': need('project', 'id', 'verdict'); return auditor.judge(b.project, b.id, b.verdict, b.note || '');
    case 'ruling': {
      need('project', 'text');
      const id = decisions.addRuling(resolveRepo(b.project), b.text, 'owner, in the dashboard');
      events.emit(b.project, 'ruling', `${id}: ${b.text}`);
      return id;
    }
    case 'dial': need('project', 'dial'); if (b.dial !== 'ownerGates') need('value'); return owner.setDial(b.project, b.dial, b.value ?? '');
    case 'project-create': {
      need('name');
      const r = newproject.create({ name: b.name, roster: b.roster, ship: b.ship, github: !!b.github, description: b.description || '' });
      if (b.startLead) startLead(r.alias);
      return r;
    }
    case 'audit': need('project'); spawnDetached(['audit', b.project, 'run']); return 'started';
    case 'lead-start': need('project'); return startLead(b.project);
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
      const st = leadState(b.project);
      if (st.running) killTree(st.pid);
      return 'stopped';
    }
    case 'task-stop': {
      need('id');
      const m = cards.load(b.id).meta;
      if (alive(m.pid)) killTree(m.pid);
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

async function login(req, res, secret, sig) {
  const body = await readBody(req);
  const given = new URLSearchParams(body).get('token') || (() => { try { return JSON.parse(body).token; } catch { return ''; } })();
  const ok = given && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) { res.writeHead(303, { Location: '/?login=failed' }); return res.end(); }
  res.writeHead(303, { 'Set-Cookie': `${COOKIE}=${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${90 * 24 * 3600}`, Location: '/' });
  res.end();
}

function serveStatic(res, p) {
  const file = path.join(STATIC, p === '/' ? 'index.html' : path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(STATIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }[path.extname(file)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
}
