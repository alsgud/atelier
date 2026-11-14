// The Claude desktop app, as Atelier's owner uses it to see and talk to the leads. On this PC (a Microsoft Store
// install) it closes itself to apply an update it can't apply: the window goes, the main process stays, and the app
// won't open again until that process is ended in Task Manager (5 times from 13 to 15 Nov). The leads keep working
// meanwhile; the owner just can't reach them. The scheduler checks each minute and the Inbox offers the fix.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { HOME } from './home.mjs';

export const STATE = path.join(HOME, 'claude-app.json');
const LOG = path.join(process.env.LOCALAPPDATA || '', 'Claude', 'logs', 'main.log');
const QUIT = 'beforeQuitForUpdate handler fired';
const STARTED = /\[updater\] (MSIX detected|App is installed)/;
const GRACE_MS = 3 * 60_000; // a real update restarts within seconds

// From the app's own log: when it last went down for an update without starting again since. Pure, for tests.
export function quitWithoutRestart(text) {
  let quit = null;
  for (const line of String(text).split('\n')) {
    if (line.includes(QUIT)) quit = line.slice(0, 19);
    else if (STARTED.test(line)) quit = null;
  }
  return quit ? new Date(quit.replace(' ', 'T')) : null; // the log writes local time
}

function tail(file, bytes = 2 * 1024 * 1024) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size, n = Math.min(bytes, size), buf = Buffer.alloc(n);
    fs.readSync(fd, buf, 0, n, size - n);
    return buf.toString('utf8');
  } finally { fs.closeSync(fd); }
}

const ps = cmd => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', windowsHide: true, timeout: 30_000 });

// The app's own main process (the Store install's Claude.exe, not a helper and not a lead's command-line claude).
export function mainProcesses() {
  const r = ps(`Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Where-Object { $_.ExecutablePath -like '*\\WindowsApps\\Claude_*' -and $_.CommandLine -notmatch '--type=' } | ForEach-Object { $_.ProcessId }`);
  return r.status === 0 ? r.stdout.split(/\s+/).map(Number).filter(Boolean) : [];
}

// Each scheduler pass: is the app stuck mid-update right now? Written to STATE for the dashboard.
export function check(now = Date.now()) {
  if (process.platform !== 'win32' || !fs.existsSync(LOG)) return null;
  let quit = null;
  try { quit = quitWithoutRestart(tail(LOG)); } catch { return null; }
  const state = { at: new Date(now).toISOString(), stuck: false };
  if (quit && now - quit.getTime() > GRACE_MS) {
    const pids = mainProcesses();
    if (pids.length) Object.assign(state, { stuck: true, since: quit.toISOString(), pids });
  }
  fs.writeFileSync(STATE, JSON.stringify(state));
  return state;
}

// For the Inbox: stuck, as of a check in the last few minutes.
export function stuck() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
    return s.stuck && Date.now() - Date.parse(s.at) < 5 * 60_000 ? s : null;
  } catch { return null; }
}

// The owner's click: end the stuck app and open it again. Only the app's own processes are ended; the leads
// are separate programs and keep running.
export function fix() {
  const pids = mainProcesses();
  for (const pid of pids) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
  const app = ps("(Get-StartApps | Where-Object { $_.AppID -like 'Claude_*!*' } | Select-Object -First 1).AppID").stdout.trim();
  if (app) spawnSync('explorer.exe', [`shell:AppsFolder\\${app}`], { windowsHide: true });
  fs.writeFileSync(STATE, JSON.stringify({ at: new Date().toISOString(), stuck: false, fixed: pids.length }));
  return { ended: pids.length, reopened: !!app };
}
