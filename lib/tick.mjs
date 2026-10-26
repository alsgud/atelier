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
import { alive, spawnDetached } from './runner.mjs';
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
      if (m.status === 'running' && !alive(m.pid)) {
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

    let running = list.filter(c => c.meta.status === 'running').length;
    const pacedUntil = limits.waitUntil();
    const queued = list.filter(c => c.meta.status === 'queued' && (c.meta.where || 'local') === 'local');
    if (pacedUntil && queued.length) {
      changes.push(`holding ${queued.length} queued: plan window nearly full until ${new Date(pacedUntil * 1000).toLocaleTimeString()}`);
    } else {
      for (const c of queued) {
        if (running >= cfg.maxParallel) break;
        if (c.meta.project && dayOf(c.meta.project).over) continue;
        // One writer per area: hold a task while another running task could touch the same files.
        const clash = list.find(o => o.meta.status === 'running' && o.meta.project && o.meta.project === c.meta.project && overlaps(o.meta, c.meta));
        if (clash) { changes.push(`${c.meta.id} held: its files overlap running task ${clash.meta.id}`); continue; }
        const pid = spawnDetached(['run', c.meta.id]);
        // Mark it right away so a second tick can't start it twice.
        cards.update(c.meta.id, { status: 'running', pid, heartbeat: new Date().toISOString(), reason: '' });
        changes.push(`${c.meta.id} started (${c.meta.title})`);
        running++;
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

function lock() {
  try {
    fs.writeFileSync(paths.tickLock, String(process.pid), { flag: 'wx' });
    return true;
  } catch {
    const age = Date.now() - fs.statSync(paths.tickLock).mtimeMs;
    if (age > 60_000) { fs.rmSync(paths.tickLock, { force: true }); return lock(); }
    return false;
  }
}

function unlock() {
  fs.rmSync(paths.tickLock, { force: true });
}
