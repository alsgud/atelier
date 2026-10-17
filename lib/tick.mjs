// The scheduler: reconcile dead runners, notice merged PRs, start queued work up to the parallel limit.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { paths, config } from './home.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';
import * as limits from './limits.mjs';
import * as gitx from './git.mjs';
import { alive, spawnDetached } from './runner.mjs';

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

    let running = list.filter(c => c.meta.status === 'running').length;
    const pacedUntil = limits.waitUntil();
    const queued = list.filter(c => c.meta.status === 'queued' && (c.meta.where || 'local') === 'local');
    if (pacedUntil && queued.length) {
      changes.push(`holding ${queued.length} queued: plan window nearly full until ${new Date(pacedUntil * 1000).toLocaleTimeString()}`);
    } else {
      for (const c of queued) {
        if (running >= cfg.maxParallel) break;
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
