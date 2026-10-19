// The owner's screen is theirs. No agent opens a window on it unless the owner has said yes first:
//   - before: the guard blocks shell commands that would launch an app, unless the task holds a grant;
//     the agent asks with `atelier screen request`, which lands in the owner's inbox.
//   - after:  a watcher (every 15 s, from the dashboard and the scheduler) looks for visible windows
//     owned by any running task's processes, its checks included. Without a grant it closes them and
//     tells the owner; with one it still tells the owner what opened.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { PKG } from './home.mjs';
import * as project from './project.mjs';
import * as cards from './card.mjs';
import * as events from './events.mjs';

const file = alias => path.join(project.dir(alias), 'screen.json');

export function load(alias) {
  try { return JSON.parse(fs.readFileSync(file(alias), 'utf8')); } catch { return { requests: [], grants: [], notices: [] }; }
}
function save(alias, s) { fs.writeFileSync(file(alias), JSON.stringify(s, null, 2)); }

export function granted(alias, task) {
  return load(alias).grants.some(g => g.task === task && Date.parse(g.until) > Date.now());
}

// Shell commands that would put something on the screen: launching apps, browsers, or a GUI test run.
const LAUNCH = [
  /\bStart-Process\b/i, /(^|[;&|]\s*)start\s+(""|"[^"]*"\s+)?\S/i, /\bcmd(\.exe)?\s+\/[ck]\s+start\b/i, /\bInvoke-Item\b/i, /(^|[;&|]\s*)ii\s+\S/i,
  /\bexplorer(\.exe)?\s+\S/i, /\b(msedge|chrome|firefox|brave)(\.exe)?\b/i,
  /\bflutter\s+run\b(?![^;&|]*-d\s+web-server)/i, /\bflutter\s+test\b[^;&|]*integration_test/i,
  /\b(npx\s+)?(electron|tauri\s+dev|cargo\s+tauri\s+dev)\b/i, /\bplaywright\b[^;&|]*--headed/i,
  /\.exe["']?\s*($|[;&|]|\s-)/i,
];
// Executables that never open windows: build and dev tools.
const QUIET_EXE = /\b(git|node|npm|npx|cargo|rustc|rustup|dotnet|msbuild|cmake|ninja|cl|link|python|py|pip|ffmpeg|ffprobe|flutter|dart|where|reg|tasklist|taskkill|powershell|pwsh|cmd|claude|atelier|winget|choco|7z|tar|curl|robocopy|xcopy)\.exe\b/i;

export function launchReason(command) {
  const cmd = String(command || '');
  const hit = LAUNCH.find(r => r.test(cmd));
  if (!hit) return '';
  if (hit === LAUNCH[LAUNCH.length - 1] && !cmd.replace(new RegExp(QUIET_EXE, 'gi'), '').match(/\.exe["']?\s*($|[;&|]|\s-)/i)) return '';
  return cmd.split('\n')[0].slice(0, 120);
}

export function blockMessage(alias, task) {
  return `Blocked: this would open a window on the owner's screen. The owner's PC is their space, so nothing appears on it without their OK.
Prefer a headless way (run the app with no window, render off-screen, use a CLI or test harness). If you truly need the screen, ask once:
  atelier screen request --why "<what you need to show and why>" --minutes <how long>
The request goes to the owner's inbox. Carry on with other work; once they allow it, the same command works for that long.`;
}

export function request(alias, task, why, minutes = 5) {
  if (!why?.trim()) throw new Error('say why: --why "<what and why>"');
  const s = load(alias);
  if (s.requests.some(r => r.task === task && r.status === 'pending')) return { already: true };
  const r = { id: `S-${s.requests.length + 1}`, task, why: why.trim().slice(0, 400), minutes: Math.min(60, Math.max(1, Number(minutes) || 5)), at: new Date().toISOString(), status: 'pending' };
  s.requests.push(r);
  save(alias, s);
  events.emit(task, 'screen-request', `wants to open a window for ${r.minutes} min: ${r.why}`);
  return r;
}

export function decide(alias, id, allow, minutes) {
  const s = load(alias);
  const r = s.requests.find(x => x.id === id);
  if (!r) throw new Error(`no screen request ${id}`);
  r.status = allow ? 'allowed' : 'declined';
  r.decidedAt = new Date().toISOString();
  if (allow) s.grants.push({ task: r.task, until: new Date(Date.now() + (Number(minutes) || r.minutes) * 60_000).toISOString(), request: id });
  save(alias, s);
  events.emit(r.task, allow ? 'screen-allowed' : 'screen-declined', allow ? `owner allowed a window for ${Number(minutes) || r.minutes} min` : 'owner declined: find a way without opening a window');
  return r;
}

export function dismissNotice(alias, id) {
  const s = load(alias);
  const n = s.notices.find(x => x.id === id);
  if (n) n.seen = true;
  save(alias, s);
}

let watching = false;
// Find visible windows owned by running tasks; close the ungranted ones and record a notice either way.
export function watch() {
  if (process.platform !== 'win32' || watching) return;
  const running = cards.all().map(c => c.meta).filter(m => m.status === 'running' && m.pid && m.project);
  if (!running.length) return;
  watching = true;
  const ps = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(PKG, 'lib', 'windows.ps1'), '-Roots', running.map(m => m.pid).join(',')], { windowsHide: true });
  let out = '';
  ps.stdout.on('data', d => { out += d; });
  ps.on('error', () => { watching = false; });
  ps.on('close', () => {
    watching = false;
    let found = [];
    try { found = JSON.parse(out.trim() || '[]'); } catch { return; }
    for (const w of [].concat(found)) {
      const m = running.find(r => String(r.pid) === String(w.root));
      if (!m) continue;
      const ok = granted(m.project, m.id);
      if (!ok) spawnSync('taskkill', ['/PID', String(w.pid), '/T', '/F'], { windowsHide: true });
      const s = load(m.project);
      // One notice per app per task per hour, so a relaunch loop doesn't flood the inbox.
      const recent = s.notices.find(n => n.task === m.id && n.app === w.name && Date.now() - Date.parse(n.at) < 3600_000);
      if (recent) { recent.count = (recent.count || 1) + 1; save(m.project, s); continue; }
      s.notices.push({ id: `W-${s.notices.length + 1}`, task: m.id, role: m.role || 'builder', app: w.name, title: w.title, closed: !ok, at: new Date().toISOString(), count: 1 });
      save(m.project, s);
      events.emit(m.id, ok ? 'window-shown' : 'window-closed', ok
        ? `opened ${w.name} ("${w.title}") on the owner's screen, as allowed`
        : `tried to open ${w.name} ("${w.title}") on the owner's screen without permission; Atelier closed it`);
    }
  });
}
