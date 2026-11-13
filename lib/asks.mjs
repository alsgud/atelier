// The lead's line to the owner, in the dashboard instead of the chat: approval requests, questions,
// requests for feedback and updates, each with pictures or recordings attached, plus the owner's own notes
// to the lead. Every one is a thread (A-n) the owner answers in the Inbox; answering wakes the lead.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as project from './project.mjs';
import * as events from './events.mjs';
import * as cards from './card.mjs';
import { writeJson, runDir, resolveRepo } from './home.mjs';

const readMeta = id => { try { return cards.load(id).meta; } catch { return null; } };

export const KINDS = ['approval', 'question', 'feedback', 'update'];
const MEDIA = /\.(png|jpe?g|webp|gif|svg|mp4|webm|wav|mp3|ogg|flac|m4a|html?|pdf|md|txt)$/i;
const MAX_FILES = 16, MAX_BYTES = 40 * 1024 * 1024;

const file = alias => path.join(project.dir(alias), 'asks.json');
export const filesDir = (alias, id) => path.join(project.dir(alias), 'asks', id);

export function all(alias) {
  try { return JSON.parse(fs.readFileSync(file(alias), 'utf8')); } catch { return []; }
}
const save = (alias, list) => writeJson(file(alias), list);
const find = (list, id) => {
  const a = list.find(x => x.id === String(id).toUpperCase());
  if (!a) throw new Error(`no message ${id} (atelier asks <alias> lists them)`);
  return a;
};

// Attachments named by the lead: "a.png=What it shows" (or "a.png"), and a task's proof. Everything is checked before
// anything is copied, so a refused message leaves nothing behind. Too many is an error, never a silent cut.
export function collect({ attach = [], task = '' }) {
  const picked = [];
  const add = (src, name, caption = '') => {
    if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) throw new Error(`can't attach ${src}: no such file`);
    if (!MEDIA.test(src)) throw new Error(`can't attach ${path.basename(src)}: only pictures, recordings, sound, pages, PDFs and text`);
    if (fs.statSync(src).size > MAX_BYTES) throw new Error(`${path.basename(src)} is over 40 MB; attach a shorter clip or a smaller picture`);
    picked.push({ src, name: name.replace(/[^\w.-]+/g, '-'), caption });
  };
  for (const a of attach) { const [f, ...c] = a.split('='); add(path.resolve(f.trim()), path.basename(f.trim()), c.join('=').trim()); }
  // A task's proof, so the lead can show what a specialist made without copying it by hand.
  if (task) {
    const ev = path.join(runDir(task), 'evidence');
    const found = fs.existsSync(ev) ? fs.readdirSync(ev).filter(f => MEDIA.test(f) && f !== 'EVIDENCE.md') : [];
    if (!found.length && !attach.length) throw new Error(`task ${task} has no proof to attach yet`);
    for (const f of found) add(path.join(ev, f), `${task}-${f}`);
  }
  if (picked.length > MAX_FILES) throw new Error(`${picked.length} attachments is too many to look at: choose the ${MAX_FILES} that matter and caption them (--attach "a.png=What it shows | b.png=...")`);
  return picked;
}
export function store(picked, dir) {
  if (picked.length) fs.mkdirSync(dir, { recursive: true });
  const captions = {};
  for (const p of picked) { fs.copyFileSync(p.src, path.join(dir, p.name)); if (p.caption) captions[p.name] = p.caption; }
  return { files: picked.map(p => p.name), captions };
}
// Split on "|", or on commas when no line uses "|" (captions may contain commas).
export const attachList = v => String(v || '').split(String(v || '').includes('|') ? '|' : ',').map(x => x.trim()).filter(Boolean);

// The lead asks or tells the owner something. Attachments are copied in, so they outlive the worktree they came from.
// plans: planned tasks this explains. The owner approves them here, in one item, instead of once per task as well
// (13 Nov: research updates arrived next to the very plans they described). lines: checklist lines this is about,
// so the owner's words here show on the line's review and they aren't asked the same thing twice.
export function ask(alias, { kind, title, body = '', todo = '', options = [], recommend = '', attach = [], task = '', links = [], run = null, plans = [], lines = [], separate = false }) {
  if (!KINDS.includes(kind)) throw new Error(`kind must be one of ${KINDS.join(', ')}`);
  plans = [...new Set(plans.map(s => s.trim()).filter(Boolean))];
  lines = [...new Set(lines.map(s => s.trim().toUpperCase()).filter(Boolean))];
  const badLine = lines.find(l => !/^C-\d+$/.test(l));
  if (badLine) throw new Error(`--lines takes checklist lines like C-12, not "${badLine}"`);
  if (plans.length) {
    if (run) throw new Error('--plans and --run go in separate approvals');
    if (!['update', 'approval'].includes(kind)) throw new Error('--plans goes with an approval: the owner approves the plans by approving this');
    for (const id of plans) {
      const m = readMeta(id);
      if (!m || m.project !== alias) throw new Error(`${id} isn't a task of ${alias}`);
      if (m.status !== 'planned') throw new Error(`${id} is ${m.status}, not planned: only plans waiting for the owner go here`);
    }
    if (kind === 'update') { kind = 'approval'; todo ||= plans.length > 1 ? `Approve these ${plans.length} plans, or say what to change` : 'Approve the plan, or say what to change'; }
  } else if (!separate && ['update', 'approval'].includes(kind) && !run) {
    // A lead that just wrote plans and now writes to the owner is nearly always explaining them: make it say which.
    const linked = new Set(all(alias).flatMap(a => a.plans || []));
    const fresh = cards.all().map(c => c.meta).filter(m => m.project === alias && m.status === 'planned' && !linked.has(m.id) && Date.now() - Date.parse(m.created || 0) < 30 * 60_000);
    if (fresh.length) throw new Error(`you have plans waiting for the owner (${fresh.map(m => `${m.id} "${m.title.slice(0, 50)}"`).join(', ')}). If this item explains them, add --plans ${fresh.map(m => m.id).join(',')} so the owner approves them here, in one item, instead of meeting them twice. If it's about something else, add --separate.`);
  }
  if (!title?.trim()) throw new Error('a title is required: one line the owner reads first');
  if (run) run = checkRun(alias, kind, run);
  if (title.length > 140) throw new Error('keep the title under 140 characters; the detail goes in --body');
  if (/\b(AC|F|R|A|C)-\d+\b/.test(title)) throw new Error('say it in words in the title: the owner shouldn\'t need to look up codes like ' + title.match(/\b(AC|F|R|A|C)-\d+\b/)[0]);
  if (body.length > 4000) throw new Error('keep the body under ~4,000 characters; attach the full document instead');
  if (kind !== 'update' && !todo.trim()) throw new Error('--do "<what you need from the owner, in one plain sentence>" is required: it\'s the first thing they read (for example "Pick the look you want built")');
  // The owner reads items cold, between other projects: the body has to stand on its own (owner's call, 8 Nov).
  if (kind !== 'update' && body.trim().length < 80) throw new Error('--body is required, in two or three plain sentences the owner can read cold: what this is about (they may not remember), why it needs them, and what happens once they answer');
  const picked = collect({ attach, task });
  if (kind === 'feedback' && !picked.length && !links.filter(Boolean).length) throw new Error('feedback needs something to look at: --attach "shot.png=What it shows", --task <id> or --link <url>');
  const list = all(alias);
  const id = `A-${list.reduce((n, a) => Math.max(n, Number(a.id.slice(2)) || 0), 0) + 1}`;
  fs.rmSync(filesDir(alias, id), { recursive: true, force: true });
  const { files, captions } = store(picked, filesDir(alias, id));
  const a = { id, kind, title: title.trim(), todo: todo.trim(), body: body.trim(), options: options.filter(Boolean), recommend: recommend.trim(), files, captions, links: links.filter(Boolean),
    at: new Date().toISOString(), from: 'lead', status: kind === 'update' ? 'unread' : 'open', thread: [], ...(run && { run }), ...(plans.length && { plans }), ...(lines.length && { lines }) };
  list.push(a);
  save(alias, list);
  events.emit(alias, 'ask', `${id} [${kind}] ${a.title}`);
  return a;
}

// The owner's answer. verdict: approve | decline (approvals), answer (questions, feedback), seen (updates).
export function answer(alias, id, { verdict = 'answer', text = '' }) {
  const list = all(alias);
  const a = find(list, id);
  if (!['open', 'unread'].includes(a.status)) throw new Error(`${a.id} is already ${a.status}`);
  // A lead's reply in a thread is read like an update: "Got it", or an answer back, whatever the thread began as.
  const followUp = !!a.reply;
  delete a.reply;
  if (followUp && !['seen', 'answer'].includes(verdict)) throw new Error('mark it seen, or write back');
  if (a.kind === 'approval' && !followUp && !['approve', 'decline'].includes(verdict)) throw new Error('approve or decline');
  if (verdict === 'decline' && !text.trim()) throw new Error('say why, so the lead can change it');
  if (['question', 'feedback'].includes(a.kind) && !followUp && verdict === 'answer' && !text.trim()) throw new Error('write an answer');
  if (followUp && verdict === 'answer' && !text.trim()) throw new Error('write an answer');
  a.status = verdict === 'seen' && !text.trim() ? 'seen' : 'answered';
  const mine = { verdict, text: text.trim(), at: new Date().toISOString() };
  if (!(followUp && verdict === 'seen')) a.answer = mine; // reading a reply keeps the thread's real answer
  a.thread.push({ from: 'owner', at: mine.at, text: mine.text, verdict });
  // An approved command runs next (the dashboard calls ran() when it finishes); the lead hears once, with the result.
  if (a.run && !followUp && verdict === 'approve') { a.run.state = 'running'; a.run.startedAt = mine.at; save(alias, list); return a; }
  if (a.run && !followUp) a.run.state = 'not-run';
  save(alias, list);
  const said = { approve: 'APPROVED', decline: 'NOT APPROVED', answer: 'ANSWERED', seen: 'SEEN' }[verdict] || verdict;
  // Updates the owner only marks as seen don't wake the lead; anything with words in it does.
  if (a.status === 'answered') events.emit(alias, 'ask-answered', `${a.id} "${a.title}" ${said}${text.trim() ? `: ${text.trim().slice(0, 300)}` : ''}`);
  return a;
}

// A command the owner runs by approving: things only the owner's own PC may do (copy files the team can't reach,
// write an approval ticket, start a paid run). The owner sees it word for word; nothing runs until they approve.
export const SHELLS = ['powershell', 'cmd', 'bash'];
const LOCAL_URL = /https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?\b/i;
export const OPENS_PAGE = /(Start-Process|\bstart\b|Invoke-Item|\bii\b|explorer(\.exe)?|xdg-open|\bopen\b)[^\n;|&]*?(https?:\/\/|\.html?\b)|\b(chrome|msedge|firefox)(\.exe)?\b/i;
function checkRun(alias, kind, { command, cwd = '', shell = '' }) {
  if (kind !== 'approval') throw new Error('--run goes with an approval: the owner approves the command before it runs');
  if (!command?.trim()) throw new Error('--run needs the command to run');
  if (command.length > 2000) throw new Error('keep the command under 2,000 characters; put longer steps in a script under atelier/ and run that');
  // Trying something happens inside the Inbox item, not in windows and browser tabs opened on the owner's PC.
  if (OPENS_PAGE.test(command)) throw new Error('don\'t open browser tabs or windows on the owner\'s PC: Atelier shows pages inside the item. Attach the page (--attach page.html="What to try"), or start the server with --run and give its address with --link http://127.0.0.1:<port> (the item shows it once it\'s running)');
  shell = shell || (process.platform === 'win32' ? 'powershell' : 'bash');
  if (!SHELLS.includes(shell)) throw new Error(`--shell must be one of ${SHELLS.join(', ')}`);
  let dir = cwd ? path.resolve(cwd) : '';
  if (!dir) try { dir = resolveRepo(alias); } catch { dir = ''; }
  if (cwd && !fs.existsSync(dir)) throw new Error(`--cwd ${cwd} doesn't exist`);
  const problems = preflight(command.trim(), shell, dir);
  if (problems.length) throw new Error(`this command would fail on the owner's PC, so it wasn't sent. Fix it first (have a specialist run it), then ask again:\n- ${problems.join('\n- ')}`);
  return { command: command.trim(), cwd: dir, shell, state: 'waiting' };
}

// What can be known before the owner spends a click (review, 10 Nov: 1 in 7 approved commands failed, mostly
// script syntax errors, missing files, and keys or sign-ins nobody had checked). The command and every script
// it names must parse, those scripts must exist, and API keys they read must be set on this PC or in the
// folder's .env. Anything that only fails when it runs is still the lead's to test first.
const SCRIPT = /(?:^|[\s"'&(=])((?:[A-Za-z]:)?[\w.\\/-]*?[\w-]+\.(ps1|py|mjs|cjs|js|sh))(?=$|[\s"';|)&])/gi;
const KEY_VAR = /(?:\$env:|os\.environ(?:\.get)?\(\s*["']|os\.environ\[\s*["']|getenv\(\s*["']|process\.env\.)([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET)[A-Z0-9_]*)/g;
export function preflight(command, shell, cwd) {
  const problems = [];
  const scripts = [...new Set([...command.matchAll(SCRIPT)].map(m => m[1]))].map(s => ({ name: s, file: path.resolve(cwd || '.', s) }));
  for (const s of scripts) if (!fs.existsSync(s.file)) problems.push(`${s.name} doesn't exist in ${cwd || 'the folder'}`);
  const found = scripts.filter(s => fs.existsSync(s.file));
  if (shell === 'powershell') {
    const errs = psParse(command, found.filter(s => /\.ps1$/i.test(s.file)).map(s => s.file));
    if (errs) problems.push(...errs);
  }
  if (shell === 'bash') {
    const r = spawnSync('bash', ['-n'], { input: command, encoding: 'utf8', windowsHide: true, timeout: 15_000 });
    if (r.status && r.stderr) problems.push(`the command doesn't parse: ${r.stderr.trim().split('\n')[0]}`);
  }
  for (const s of found.filter(s => /\.(mjs|cjs|js)$/i.test(s.file))) {
    const r = spawnSync(process.execPath, ['--check', s.file], { encoding: 'utf8', windowsHide: true, timeout: 15_000 });
    if (r.status) problems.push(`${s.name} doesn't parse: ${(r.stderr || '').trim().split('\n').find(l => /Error/.test(l)) || 'syntax error'}`);
  }
  const env = dotEnv(cwd);
  const keys = new Set([command, ...found.map(s => { try { return fs.readFileSync(s.file, 'utf8'); } catch { return ''; } })].flatMap(t => [...t.matchAll(KEY_VAR)].map(m => m[1])));
  for (const k of keys) if (!process.env[k] && !env.has(k)) problems.push(`it reads ${k}, which isn't set on this PC or in ${path.join(cwd || '.', '.env')}: ask the owner for it in a question first, or make it optional`);
  return problems;
}
function dotEnv(dir) {
  const names = new Set();
  for (let d = dir || '.', i = 0; i < 3; i++, d = path.dirname(d)) {
    try { for (const l of fs.readFileSync(path.join(d, '.env'), 'utf8').split('\n')) { const m = l.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*\S/); if (m) names.add(m[1]); } } catch { /* none here */ }
  }
  return names;
}
// PowerShell's own parser on the command and its scripts: the errors it would stop on, or null.
function psParse(command, files) {
  if (process.platform !== 'win32') return null;
  const ps = `$out = @(); $e = $null; [void][System.Management.Automation.Language.Parser]::ParseInput($env:ATELIER_CMD, [ref]$null, [ref]$e); foreach ($x in $e) { $out += "the command doesn't parse (line $($x.Extent.StartLineNumber)): $($x.Message)" };
    foreach ($f in ($env:ATELIER_FILES -split [char]10 | Where-Object { $_ })) { $e = $null; [void][System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$null, [ref]$e); foreach ($x in $e) { $out += "$([IO.Path]::GetFileName($f)) doesn't parse (line $($x.Extent.StartLineNumber)): $($x.Message)" } }; $out -join [char]10`;
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true, timeout: 30_000, env: { ...process.env, ATELIER_CMD: command, ATELIER_FILES: files.join('\n') } });
  if (r.status !== 0 && !r.stdout) return null; // the checker itself couldn't run: don't block on it
  const lines = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  return lines.length ? lines.slice(0, 6) : null;
}

// The approved command finished (or couldn't start). Wakes the lead with the outcome.
export function ran(alias, id, { code, output = '', error = '' }) {
  const list = all(alias);
  const a = find(list, id);
  const ok = code === 0 && !error;
  a.run = { ...a.run, state: ok ? 'done' : 'failed', code, output: output.slice(-4000), error, endedAt: new Date().toISOString() };
  // It started something to try on this PC (a server at a local address): back to the Inbox, with the page inside.
  const toTry = ok && [...(a.links || []), output].some(s => LOCAL_URL.test(s));
  a.thread.push({ from: 'atelier', at: a.run.endedAt, text: !ok ? `Ran it on your PC: it failed (${error || `exit ${code}`}).` : toTry ? 'It’s running on your PC. Try it here.' : 'Ran it on your PC: finished fine.' });
  if (toTry) { a.status = 'unread'; a.reply = true; }
  save(alias, list);
  const tail = (error || output).trim().split('\n').slice(-6).join(' | ').slice(0, 400);
  const note = a.answer?.text ? ` Owner's note: ${a.answer.text.slice(0, 200)}.` : '';
  events.emit(alias, 'ask-answered', `${a.id} "${a.title}" APPROVED and ran: ${ok ? 'OK' : `FAILED (${error || `exit ${code}`})`}.${note}${tail ? ` Output: ${tail}` : ''} (full output: atelier asks ${alias} --all)`);
  return a;
}

// The owner writes to the lead unprompted (the Messages tab), or adds to a thread.
export function note(alias, text, { re = '' } = {}) {
  if (!text?.trim()) throw new Error('empty message');
  const list = all(alias);
  const at = new Date().toISOString();
  if (re) {
    const a = find(list, re);
    a.thread.push({ from: 'owner', at, text: text.trim() });
    save(alias, list);
    events.emit(alias, 'owner-note', `on ${a.id} "${a.title}": ${text.trim().slice(0, 300)}`);
    return a;
  }
  const id = `A-${list.reduce((n, a) => Math.max(n, Number(a.id.slice(2)) || 0), 0) + 1}`;
  const a = { id, kind: 'note', title: text.trim().split('\n')[0].slice(0, 120), body: text.trim(), at, from: 'owner', status: 'for-lead', thread: [], files: [], options: [], links: [] };
  list.push(a);
  save(alias, list);
  events.emit(alias, 'owner-note', `${id}: ${text.trim().slice(0, 300)}`);
  return a;
}

// The lead replies inside a thread (to an owner's note, or to follow up an answer). A reply that asks again reopens it.
// A reply reaches the owner's Inbox when the owner wrote to the lead (a note, or a question back), or when the lead
// says it must (--tell). After the owner only answered or approved, it stays on the thread: putting every "Understood"
// back in the Inbox made answered items keep coming back, and the owner answered some of them two or three times.
export function reply(alias, id, text, { reopen = false, tell = false } = {}) {
  if (!text?.trim()) throw new Error('empty reply');
  const list = all(alias);
  const a = find(list, id);
  // The owner wrote to the lead: a note, a question, or words written back under one of its replies.
  const at = a.thread.map(t => t.from).lastIndexOf('owner'), last = a.thread[at];
  const wrote = a.kind === 'note' || (last ? !last.verdict || /\?\s*$/.test(last.text || '') || (!!last.text && a.thread[at - 1]?.from === 'lead') : a.status === 'for-lead');
  a.thread.push({ from: 'lead', at: new Date().toISOString(), text: text.trim(), ...(tell || wrote ? {} : { quiet: true }) });
  if (reopen && a.kind !== 'note') { a.status = 'open'; delete a.answer; delete a.reply; }
  else if (tell || wrote) { a.status = 'unread'; a.reply = true; }
  save(alias, list);
  events.emit(alias, 'ask', `${a.id} lead replied: ${text.trim().slice(0, 120)}`);
  return a;
}

export function withdraw(alias, id) {
  const list = all(alias);
  const a = find(list, id);
  a.status = 'withdrawn';
  save(alias, list);
  events.emit(alias, 'ask', `${a.id} withdrawn by the lead`);
  return a;
}

// What still needs the owner: open asks and unread updates.
export const forOwner = alias => all(alias).filter(a => a.status === 'open' || a.status === 'unread');
// What still needs the lead: owner notes it hasn't replied to, and answers since it last looked.
export const forLead = alias => all(alias).filter(a => a.status === 'for-lead');
