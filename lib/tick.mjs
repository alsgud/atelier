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
      if (m.status !== 'needs-you' || !m.waits_on) continue;
      const waits = String(m.waits_on).split(',').filter(Boolean);
      if (waits.every(w => status.get(w) === 'done')) {
        cards.update(m.id, { status: 'queued', reason: '', waits_on: '' });
        events.emit(m.id, 'queued', `requests ${waits.join(', ')} are done`);
        changes.push(`${m.id} requeued: requests ${waits.join(', ')} are done`);
        m.status = 'queued';
      }
    }

    // The owner's auditor runs after every gate approval and daily while the team is active.
    for (const alias of project.list()) {
      const p = project.tryLoad(alias);
      if (!p) continue;
      const last = Date.parse(p.lastAudit?.at || 0);
      const gateAt = Math.max(0, ...project.PHASES.map(ph => p.gates[ph]?.status === 'approved' ? Date.parse(p.gates[ph].at) : 0));
      const active = list.some(c => c.meta.project === alias && Date.now() - Date.parse(c.meta.updated || 0) < 24 * 3600_000 && ['running', 'review', 'done'].includes(c.meta.status));
      if (auditRunning(alias)) continue;
      if (gateAt > last || (active && Date.now() - last > 24 * 3600_000 && p.charter)) {
        spawnDetached(['audit', alias, 'run']);
        changes.push(`${alias}: audit started (${gateAt > last ? 'gate approved since last audit' : 'daily'})`);
      }
    }

    let running = list.filter(c => c.meta.status === 'running').length;
    const pacedUntil = limits.waitUntil();
    const queued = list.filter(c => c.meta.status === 'queued' && (c.meta.where || 'local') === 'local');
    if (pacedUntil && queued.length) {
      changes.push(`holding ${queued.length} queued: plan window nearly full until ${new Date(pacedUntil * 1000).toLocaleTimeString()}`);
    } else {
      for (const c of queued) {
        if (running >= cfg.maxParallel) break;
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
