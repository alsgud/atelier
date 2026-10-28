// The lead's line to the owner, in the dashboard instead of the chat: approval requests, questions,
// requests for feedback and updates, each with pictures or recordings attached, plus the owner's own notes
// to the lead. Every one is a thread (A-n) the owner answers in the Inbox; answering wakes the lead.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';
import * as events from './events.mjs';
import { writeJson, runDir } from './home.mjs';

export const KINDS = ['approval', 'question', 'feedback', 'update'];
const MEDIA = /\.(png|jpe?g|webp|gif|svg|mp4|webm|wav|mp3|ogg|flac|m4a|html?|pdf|md|txt)$/i;
const MAX_FILES = 8, MAX_BYTES = 40 * 1024 * 1024;

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

// The lead asks or tells the owner something. Attachments are copied in, so they outlive the worktree they came from.
export function ask(alias, { kind, title, body = '', options = [], recommend = '', attach = [], task = '', links = [] }) {
  if (!KINDS.includes(kind)) throw new Error(`kind must be one of ${KINDS.join(', ')}`);
  if (!title?.trim()) throw new Error('a title is required: one line the owner reads first');
  if (title.length > 140) throw new Error('keep the title under 140 characters; the detail goes in --body');
  if (body.length > 4000) throw new Error('keep the body under ~4,000 characters; attach the full document instead');
  const list = all(alias);
  const id = `A-${list.reduce((n, a) => Math.max(n, Number(a.id.slice(2)) || 0), 0) + 1}`;
  // Every attachment is checked before any is copied, so a refused ask leaves nothing behind.
  const picked = [];
  const add = (src, name = path.basename(src)) => {
    if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) throw new Error(`can't attach ${src}: no such file`);
    if (!MEDIA.test(src)) throw new Error(`can't attach ${path.basename(src)}: only pictures, recordings, sound, pages, PDFs and text`);
    if (fs.statSync(src).size > MAX_BYTES) throw new Error(`${path.basename(src)} is over 40 MB; attach a shorter clip or a smaller picture`);
    if (picked.length < MAX_FILES) picked.push([src, name.replace(/[^\w.-]+/g, '-')]);
  };
  for (const f of attach) add(path.resolve(f));
  // A task's proof, so the lead can show what a specialist made without copying it by hand.
  if (task) {
    const ev = path.join(runDir(task), 'evidence');
    const found = fs.existsSync(ev) ? fs.readdirSync(ev).filter(f => MEDIA.test(f) && f !== 'EVIDENCE.md') : [];
    if (!found.length && !attach.length) throw new Error(`task ${task} has no proof to attach yet`);
    for (const f of found) add(path.join(ev, f), `${task}-${f}`);
  }
  fs.rmSync(filesDir(alias, id), { recursive: true, force: true });
  if (picked.length) fs.mkdirSync(filesDir(alias, id), { recursive: true });
  for (const [src, name] of picked) fs.copyFileSync(src, path.join(filesDir(alias, id), name));
  const files = picked.map(([, name]) => name);
  const a = { id, kind, title: title.trim(), body: body.trim(), options: options.filter(Boolean), recommend: recommend.trim(), files, links: links.filter(Boolean),
    at: new Date().toISOString(), from: 'lead', status: kind === 'update' ? 'unread' : 'open', thread: [] };
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
  if (a.kind === 'approval' && !['approve', 'decline'].includes(verdict)) throw new Error('approve or decline');
  if (verdict === 'decline' && !text.trim()) throw new Error('say why, so the lead can change it');
  if (['question', 'feedback'].includes(a.kind) && verdict === 'answer' && !text.trim()) throw new Error('write an answer');
  a.status = verdict === 'seen' && !text.trim() ? 'seen' : 'answered';
  a.answer = { verdict, text: text.trim(), at: new Date().toISOString() };
  a.thread.push({ from: 'owner', at: a.answer.at, text: text.trim(), verdict });
  save(alias, list);
  const said = { approve: 'APPROVED', decline: 'NOT APPROVED', answer: 'ANSWERED', seen: 'SEEN' }[verdict] || verdict;
  // Updates the owner only marks as seen don't wake the lead; anything with words in it does.
  if (a.status === 'answered') events.emit(alias, 'ask-answered', `${a.id} "${a.title}" ${said}${text.trim() ? `: ${text.trim().slice(0, 300)}` : ''}`);
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
export function reply(alias, id, text, { reopen = false } = {}) {
  if (!text?.trim()) throw new Error('empty reply');
  const list = all(alias);
  const a = find(list, id);
  a.thread.push({ from: 'lead', at: new Date().toISOString(), text: text.trim() });
  if (a.status === 'for-lead') a.status = 'replied';
  if (reopen && a.kind !== 'note') { a.status = 'open'; delete a.answer; }
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
