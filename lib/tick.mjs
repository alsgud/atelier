// The scheduler: reconcile dead runners, notice merged PRs, start queued work up to the parallel limit.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { paths, config } from './home.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as limits from './limits.mjs';
import * as gitx from './git.mjs';
import * as project from './project.mjs';
import path from 'node:path';
import { alive, spawnDetached, runnerPid, takeLock, dropLock } from './runner.mjs';
import { auditRunning } from './auditor.mjs';
import * as budget from './budget.mjs';
import * as screen from './screen.mjs';

export function tick({ quiet = false } = {}) {
  if (!lock()) return { skipped: 'another tick is running' };
  try {
    const cfg = config();
    const changes = [];
    const list = cards.all();

    for (const c of list) {
      const m = c.meta;
      const holder = m.status === 'running' && !alive(m.pid) ? runnerPid(m.id) : 0;
      if (holder) cards.update(m.id, { pid: holder });
      else if (m.status === 'running' && !alive(m.pid)) {
        const quietMin = (Date.now() - Date.parse(m.heartbeat || m.updated)) / 60_000;
        if (quietMin > 3) {
          cards.update(m.id, { status: 'stalled', reason: `runner died (no heartbeat for ${Math.round(quietMin)}m)`, pid: '' });
          events.emit(m.id, 'stalled', 'runner process is gone');
          changes.push(`${m.id} stalled: runner died`);
          m.status = 'stalled';
        }
      }
      // No PR (local-only repo): the task is done once its branch has been merged into base.
      // (review is only reached with commits ahead of base, so "is an ancestor" means merged)
      if (m.status === 'review' && !m.pr && m.branch && gitx.git(m.repo, 'merge-base', '--is-ancestor', m.branch, m.base).ok) {
        cards.update(m.id, { status: 'done', reason: `merged into ${m.base}` });
        events.emit(m.id, 'done', `merged into ${m.base}`);
        changes.push(`${m.id} done: merged into ${m.base}`);
        m.status = 'done';
      }
      if (m.status === 'review' && m.pr) {
        const r = spawnSync('gh', ['pr', 'view', m.pr, '--json', 'state', '-q', '.state'], { encoding: 'utf8', windowsHide: true });
        const state = (r.stdout || '').trim();
        if (state === 'MERGED' || state === 'CLOSED') {
          const status = state === 'MERGED' ? 'done' : 'failed';
          cards.update(m.id, { status, reason: `PR ${state.toLowerCase()}` });
          events.emit(m.id, status, `PR ${state.toLowerCase()}`);
          changes.push(`${m.id} ${status}: PR ${state.toLowerCase()}`);
          m.status = status;
        }
      }
    }

    // A task blocked on request cards resumes once every request it waits on is done.
    const status = new Map(list.map(c => [c.meta.id, c.meta.status]));
    for (const c of list) {
      const m = c.meta;
      if (!['needs-you', 'paused'].includes(m.status) || !m.waits_on) continue;
      const waits = String(m.waits_on).split(',').filter(Boolean);
      if (waits.every(w => status.get(w) === 'done')) {
        cards.update(m.id, { status: 'queued', reason: '', waits_on: '' });
        events.emit(m.id, 'queued', `requests ${waits.join(', ')} are done`);
        changes.push(`${m.id} requeued: requests ${waits.join(', ')} are done`);
        m.status = 'queued';
      }
    }

    // Audits are a fixed line in a milestone's budget: by default the lead runs one at each milestone's
    // end (`atelier audit <alias> run --bg`), never automatically. Projects set to auditMode 'auto' keep the
    // old behaviour: build phase only, once new work has been merged since the last audit.
    for (const alias of project.list()) {
      if (project.tryLoad(alias)?.auditMode !== 'auto') continue;
      const p = project.tryLoad(alias);
      if (!p || project.nextPhase(p) !== 'build' || auditRunning(alias)) continue;
      const last = Date.parse(p.lastAudit?.at || 0);
      const merged = list.filter(c => c.meta.project === alias && c.meta.status === 'done' && Date.parse(c.meta.updated || 0) > last).length;
      if (merged >= 3 || (merged && Date.now() - last > 24 * 3600_000)) {
        spawnDetached(['audit', alias, 'run']);
        changes.push(`${alias}: audit started (${merged} task(s) merged since the last one)`);
      }
    }

    // GitHub sync runs as its own process (network can be slow; the dashboard calls tick in-process).
    const syncStamp = path.join(paths.runs, 'sync.stamp');
    const lastSync = fs.existsSync(syncStamp) ? fs.statSync(syncStamp).mtimeMs : 0;
    if (Date.now() - lastSync > 90_000) { fs.writeFileSync(syncStamp, String(Date.now())); spawnDetached(['sync']); }

    // Daily budgets: hold a project's queued work once it has spent its day; when there's room again
    // (a new day, or the owner raised it) tasks paused by the day limit go back in the queue.
    const day = new Map();
    const dayOf = a => { if (!day.has(a)) day.set(a, budget.today(a)); return day.get(a); };
    for (const c of list.filter(c => c.meta.project && c.meta.status === 'paused' && /^daily budget/.test(c.meta.reason || ''))) {
      if (dayOf(c.meta.project).over) continue;
      cards.update(c.meta.id, { status: 'queued', reason: '' });
      c.meta.status = 'queued';
      changes.push(`${c.meta.id} requeued: ${c.meta.project} has daily budget again`);
    }
    for (const alias of project.list()) {
      const d = dayOf(alias), p = project.tryLoad(alias);
      if (!p) continue;
      const stamp = d.over ? new Date().toISOString().slice(0, 10) : '';
      // Warn the lead at 50% and 80% of the day, once each per day.
      const pct = d.limit ? d.spent / d.limit : 0;
      const level = pct >= 0.8 ? 80 : pct >= 0.5 ? 50 : 0;
      const today = new Date().toISOString().slice(0, 10);
      if (level && !d.over && (p.budgetWarn || '') < `${today}:${level}`) {
        events.emit(alias, 'budget-warn', `${level}% of today's budget used ($${d.spent} of $${d.limit}); ${level === 80 ? 'only finish what matters today' : 'start only work that matters today'}`);
        p.budgetWarn = `${today}:${level}`; project.save(p);
      }
      if ((p.budgetHit || '') !== stamp) {
        if (stamp) events.emit(alias, 'budget-day', `spent $${d.spent} of today's $${d.limit}: holding new work until tomorrow or until you raise the limit`);
        p.budgetHit = stamp; project.save(p);
      }
    }

    try { screen.watch(); } catch { /* best effort */ }

    // Lead supervisor: a lead the owner started stays up. If its session ends for any other reason (the
    // Claude app closing, a crash), start it fresh from its files, at most 3 times an hour.
    for (const alias of project.list()) {
      const dir = project.dir(alias);
      if (!fs.existsSync(path.join(dir, 'lead.wanted')) || fs.existsSync(path.join(dir, 'lead.stop'))) continue;
      const pid = Number((fs.existsSync(path.join(dir, 'lead.pid')) && fs.readFileSync(path.join(dir, 'lead.pid'), 'utf8').trim()) || 0);
      if (pid && alive(pid)) continue;
      const logFile = path.join(dir, 'lead-restarts.json');
      let log = []; try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch { /* none yet */ }
      log = log.filter(t => Date.now() - Date.parse(t) < 3600_000);
      if (log.length >= 3) { if (log.length === 3) { events.emit(alias, 'lead', 'lead keeps stopping (3 restarts this hour); waiting for the owner'); log.push(new Date().toISOString()); fs.writeFileSync(logFile, JSON.stringify(log)); } continue; }
      log.push(new Date().toISOString());
      fs.writeFileSync(logFile, JSON.stringify(log));
      spawnDetached(['lead', alias]);
      events.emit(alias, 'lead', 'lead session had stopped; started it again fresh from its files');
      changes.push(`${alias}: lead restarted`);
    }
    wakeIdleLeads(changes);
    restartErroredLeads(changes);

    let running = list.filter(c => c.meta.status === 'running').length;
    const pacedUntil = limits.waitUntil();
    const queued = list.filter(c => c.meta.status === 'queued' && (c.meta.where || 'local') === 'local');
    if (pacedUntil && queued.length) {
      changes.push(`holding ${queued.length} queued: plan window nearly full until ${new Date(pacedUntil * 1000).toLocaleTimeString()}`);
    } else {
      // Each project has its own slots (perProject), so one project's long queue never holds up another's;
      // maxParallel is only the machine-wide cap. Projects take turns: one queued task from each in rotation.
      const perProject = cfg.perProject || 2;
      const busy = new Map();
      for (const c of list) if (c.meta.status === 'running') busy.set(c.meta.project || '', (busy.get(c.meta.project || '') || 0) + 1);
      const lanes = new Map();
      for (const c of queued) { const k = c.meta.project || ''; if (!lanes.has(k)) lanes.set(k, []); lanes.get(k).push(c); }
      const turns = [];
      for (let i = 0; turns.length < queued.length; i++) for (const lane of lanes.values()) if (lane[i]) turns.push(lane[i]);
      for (const c of turns) {
        if (running >= cfg.maxParallel) break;
        const k = c.meta.project || '';
        if ((busy.get(k) || 0) >= perProject) continue;
        if (c.meta.project && dayOf(c.meta.project).over) continue;
        // One writer per area: hold a task while another running task could touch the same files.
        const clash = list.find(o => o.meta.status === 'running' && o.meta.project && o.meta.project === c.meta.project && overlaps(o.meta, c.meta));
        if (clash) { changes.push(`${c.meta.id} held: its files overlap running task ${clash.meta.id}`); continue; }
        // This pass's list can be minutes old on a busy PC: go by the card as it is now.
        if (cards.load(c.meta.id).meta.status !== 'queued') continue;
        const holder = runnerPid(c.meta.id);
        const pid = holder || spawnDetached(['run', c.meta.id]);
        // Mark it right away so a second tick can't start it twice.
        cards.update(c.meta.id, { status: 'running', pid, heartbeat: new Date().toISOString(), reason: '' });
        changes.push(holder ? `${c.meta.id} is still running (runner ${holder}); not started again` : `${c.meta.id} started (${c.meta.title})`);
        c.meta.status = 'running'; // so the overlap check above sees it for the rest of this pass
        running++;
        busy.set(k, (busy.get(k) || 0) + 1);
      }
    }
    if (!quiet) for (const line of changes) console.log(line);
    return { changes, running };
  } finally {
    unlock();
  }
}

// Two tasks could collide if their file scopes overlap. Without explicit files, tasks in the same role
// share that role's whole ownership, so they're treated as overlapping.
function overlaps(a, b) {
  const fa = String(a.files || '').split(',').map(s => s.trim()).filter(Boolean);
  const fb = String(b.files || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!fa.length || !fb.length) return (a.role || 'builder') === (b.role || 'builder') || a.role === 'builder' || b.role === 'builder';
  const prefix = g => g.split(/[*?[{]/)[0];
  return fa.some(x => fb.some(y => prefix(x).startsWith(prefix(y)) || prefix(y).startsWith(prefix(x))));
}

// Lead wake-up. A lead hears news only through its watch, and a watch can die while the lead sits idle between
// turns (its Monitor expired, or the shell around it closed). The news then waits forever. So when something the
// lead must act on has waited 10 minutes and the lead's session hasn't written a word since it arrived, end that
// session: the supervisor above starts it fresh on the next tick, and a fresh lead reads its board first.
const NEEDS_LEAD = new Set(['done', 'review', 'needs-you', 'stalled', 'failed', 'requested', 'finding-to-lead', 'needs-lead',
  'gate', 'charter', 'criterion-approve', 'criterion-accept', 'criterion-reject', 'approved', 'answered', 'finding-confirmed',
  'ruling', 'autonomy', 'ask-answered', 'owner-note', 'checklist-approved', 'checklist-declined', 'checklist-judged']);
const WAKE_AFTER = 10 * 60_000;

export function wakeIdleLeads(changes = []) {
  let recent = null;
  for (const alias of project.list()) {
    const dir = project.dir(alias);
    if (!fs.existsSync(path.join(dir, 'lead.wanted')) || fs.existsSync(path.join(dir, 'lead.stop'))) continue;
    const pid = Number((fs.existsSync(path.join(dir, 'lead.pid')) && fs.readFileSync(path.join(dir, 'lead.pid'), 'utf8').trim()) || 0);
    if (!pid || !alive(pid)) continue;
    const spoke = lastWord(alias);
    if (!spoke) continue;
    recent ||= events.read({ sinceMin: 24 * 60 });
    const owner = new Map(cards.all().map(c => [c.meta.id, c.meta.project]));
    const waiting = recent.filter(e => NEEDS_LEAD.has(e.type) && (e.id === alias || owner.get(e.id) === alias)
      && Date.parse(e.ts) > spoke && Date.now() - Date.parse(e.ts) > WAKE_AFTER);
    if (!waiting.length) continue;
    const logFile = path.join(dir, 'lead-restarts.json');
    let log = []; try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch { /* none yet */ }
    if (log.filter(t => Date.now() - Date.parse(t) < 3600_000).length >= 3) continue;
    if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(pid)], { windowsHide: true });
    else try { process.kill(pid); } catch { /* already gone */ }
    const e = waiting[0];
    events.emit(alias, 'lead', `lead had stopped listening (${e.id} ${e.type} waited ${Math.round((Date.now() - Date.parse(e.ts)) / 60000)} min); restarting it fresh`);
    changes.push(`${alias}: idle lead woken`);
  }
}

// A lead whose session stopped on an API error (the PC lost its internet, Claude was down): the process lives on,
// but it does nothing and drops out of the Claude app. Once Claude can be reached again, restart it fresh in place.
// It's left alone for a few minutes first, since Claude Code retries on its own.
const ERROR_SETTLE = 3 * 60_000;
export function restartErroredLeads(changes = [], { reachable = claudeReachable } = {}) {
  let online = null;
  for (const alias of project.list()) {
    const dir = project.dir(alias);
    if (!fs.existsSync(path.join(dir, 'lead.wanted')) || fs.existsSync(path.join(dir, 'lead.stop'))) continue;
    const pid = Number((fs.existsSync(path.join(dir, 'lead.pid')) && fs.readFileSync(path.join(dir, 'lead.pid'), 'utf8').trim()) || 0);
    if (!pid || !alive(pid)) continue;
    const err = lastError(alias);
    if (!err || Date.now() - err.at < ERROR_SETTLE) continue;
    if ((online ??= reachable()) === false) continue;
    const logFile = path.join(dir, 'lead-restarts.json');
    let log = []; try { log = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch { /* none yet */ }
    log = log.filter(t => Date.now() - Date.parse(t) < 3600_000);
    if (log.length >= 3) continue;
    log.push(new Date().toISOString());
    fs.writeFileSync(logFile, JSON.stringify(log));
    // The restart flag makes the lead's own loop (atelier lead) start a fresh session straight away.
    fs.writeFileSync(path.join(dir, 'lead.restart'), '1');
    if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(pid)], { windowsHide: true });
    else try { process.kill(pid); } catch { /* already gone */ }
    events.emit(alias, 'lead', `lead had stopped on an error (${err.text.slice(0, 120)}); restarting it fresh`);
    changes.push(`${alias}: lead restarted after an API error`);
  }
}

// The lead's session ended its last turn on an API error: the last message in its transcript is Claude Code's
// synthetic error message (isApiErrorMessage), with nothing after it but bookkeeping.
function lastError(alias) {
  try {
    const record = path.join(project.dir(alias), 'lead-transcript.txt');
    if (fs.statSync(record).mtimeMs < fs.statSync(path.join(project.dir(alias), 'lead.pid')).mtimeMs) return null;
    const file = fs.readFileSync(record, 'utf8').trim();
    const size = fs.statSync(file).size, fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(Math.min(size, 256 * 1024));
    fs.readSync(fd, buf, 0, buf.length, size - buf.length);
    fs.closeSync(fd);
    const last = buf.toString('utf8').split('\n').reverse().map(l => { try { return JSON.parse(l); } catch { return null; } })
      .find(e => e && (e.type === 'assistant' || e.type === 'user'));
    if (!last?.isApiErrorMessage) return null;
    const c = last.message?.content;
    return { at: Date.parse(last.timestamp), text: Array.isArray(c) ? c.map(x => x.text || '').join(' ') : String(c || 'API error') };
  } catch { return null; }
}

// Whether Claude's API answers at all (any HTTP reply counts), so a restart isn't spent while the PC is still offline.
function claudeReachable() {
  const r = spawnSync(process.execPath, ['-e', "fetch('https://api.anthropic.com/',{method:'HEAD'}).then(()=>process.exit(0),()=>process.exit(1))"], { timeout: 10_000, windowsHide: true });
  return r.status === 0;
}

// When the lead's session last wrote anything, from the transcript its hooks recorded (at its start and each Stop). A lead that hasn't
// finished a turn yet (the record is from before this session started) is left alone.
function lastWord(alias) {
  try {
    const record = path.join(project.dir(alias), 'lead-transcript.txt');
    if (fs.statSync(record).mtimeMs < fs.statSync(path.join(project.dir(alias), 'lead.pid')).mtimeMs) return 0;
    return fs.statSync(fs.readFileSync(record, 'utf8').trim()).mtimeMs;
  } catch { return 0; }
}

// A tick can run for minutes on a busy PC, so its lock lasts as long as it lives. It used to expire after a
// minute: the next tick then ran alongside it, and both started the same queued task.
function lock() {
  try { return takeLock(paths.tickLock, 15 * 60_000); } catch { return false; }
}

function unlock() {
  dropLock(paths.tickLock);
}
