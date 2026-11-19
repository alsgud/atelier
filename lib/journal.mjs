// The journal: a durable, readable record of every finished task, so a project's history survives as the
// work grows past what any lead or ledger can hold. Built from what Atelier already records (the card, the
// task's own notes, the event log and the owner's Inbox answers), without spending tokens.
//   library/<project>/journal/tasks/<id>.md   one entry per finished or cancelled task
//   library/<project>/journal/README.md       that project's index by week, with counts and spend
//   library/journal.md                        every project together, latest first (one place for Tuesday's teams)
import fs from 'node:fs';
import path from 'node:path';
import { HOME, paths } from './home.mjs';
import * as cards from './card.mjs';
import * as project from './project.mjs';

export const ROOT = path.join(HOME, 'library');
const FINISHED = ['done', 'failed'];
const NOTES = [
  ['Decisions', 'DECISIONS.md'],
  ['Questions it raised', 'QUESTIONS.md'],
  ['Review', 'REVIEW.md'],
  ['Evidence', path.join('evidence', 'EVIDENCE.md')],
  ['Progress notes', 'PROGRESS.md'],
];

export const dir = alias => path.join(ROOT, alias, 'journal');
export const entryFile = (alias, id) => path.join(dir(alias), 'tasks', `${id}.md`);

const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const day = iso => String(iso || '').slice(0, 10);
const when = iso => String(iso || '').replace('T', ' ').slice(0, 16);
// The Monday that starts an entry's week: a busy project lands hundreds of tasks a month.
const week = iso => { const d = new Date(String(iso || '').slice(0, 10) + 'T00:00:00Z'); if (isNaN(d)) return 'undated'; d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7); return `Week of ${d.toISOString().slice(0, 10)}`; };
const money = n => `$${Number(n || 0).toFixed(2)}`;
// Notes are their own documents; push their headings under the entry's so the entry keeps one outline.
const demote = text => text.replace(/^(#{1,4}) /gm, (m, h) => `${h}## `);
const outcome = m => m.status === 'done' ? 'landed' : /^cancelled/.test(m.reason || '') ? 'cancelled' : 'failed';

function eventsByTask() {
  const by = new Map();
  for (const line of read(paths.events).split('\n')) {
    if (!line) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (!e.id) continue;
    (by.get(e.id) || by.set(e.id, []).get(e.id)).push(e);
  }
  return by;
}

function asksOf(alias) {
  try {
    const d = JSON.parse(read(path.join(project.dir(alias), 'asks.json')) || '{}');
    return Array.isArray(d) ? d : d.asks || [];
  } catch { return []; }
}

const mentions = (ask, id) => new RegExp(`(^|[^\\w-])${id}([^\\w-]|$)`).test(JSON.stringify(ask));

export function entry(meta, body, evts = [], asks = []) {
  const run = path.join(paths.runs, meta.id);
  const commit = /\b[0-9a-f]{7,40}\b/.exec(meta.reason || '')?.[0];
  const facts = [
    `**${outcome(meta)}**${meta.reason ? `: ${meta.reason}` : ''}`,
    `${meta.project} · ${meta.role || 'builder'}${meta.model ? ` · ${meta.model}` : ''}`,
    `Planned ${when(meta.created)}, last change ${when(meta.updated)}`,
    `${meta.iteration || 0} of ${meta.iterations || '?'} iterations${meta.review_rounds ? `, ${meta.review_rounds} review round(s)` : ''}, ${money(meta.cost_usd)}${meta.budget ? ` of a ${money(meta.budget)} budget` : ''}`,
    meta.for ? `Checklist line: ${meta.for}` : '',
    meta.criteria ? `Criteria: ${meta.criteria}` : '',
    meta.branch ? `Branch: ${meta.branch}${meta.base ? ` → ${meta.base}` : ''}${commit ? ` (${commit})` : ''}` : '',
    meta.files ? `Files: ${meta.files}` : '',
  ].filter(Boolean);
  const out = [`# ${meta.id} · ${meta.title}`, '', ...facts.map(f => `- ${f}`), '', '## Brief', '', demote(body || '(no brief)')];
  if (evts.length) {
    out.push('', '## Timeline', '', ...evts.map(e => `- ${when(e.ts)} · ${e.type} · ${String(e.msg || '').replace(/\s+/g, ' ').slice(0, 300)}`));
  }
  if (asks.length) {
    out.push('', "## In the owner's Inbox");
    for (const a of asks) {
      out.push('', `### ${a.id} · ${a.title} (${a.status})`, '', `${when(a.at)}, ${a.kind || 'item'} from ${a.from || 'the lead'}.`);
      for (const t of (a.thread || []).filter(t => t.from === 'owner')) {
        const verdict = { approve: 'approved', reject: 'declined', answer: '' }[t.verdict] ?? (t.verdict || '');
        const text = String(t.text || '').replace(/\n+/g, ' ').trim();
        if (verdict || text) out.push('', `> **Owner, ${when(t.at)}${verdict ? `, ${verdict}` : ''}:** ${text || '(no note)'}`);
      }
    }
  }
  for (const [title, file] of NOTES) {
    const text = read(path.join(run, file)).trim();
    if (text) out.push('', `## ${title}`, '', demote(text.replace(/^# [^\n]*\n+/, '')));
  }
  out.push('', '---', `Written by Atelier from the task's card, notes and events. Full run logs: \`${run}\``, `<!-- card-updated: ${meta.updated || ''} -->`, '');
  return out.join('\n');
}

const writtenFor = file => /<!-- card-updated: ([^ ]*) -->/.exec(read(file))?.[1];

function index(alias, metas) {
  const byWeek = new Map();
  for (const m of [...metas].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))) {
    const k = week(m.updated);
    (byWeek.get(k) || byWeek.set(k, []).get(k)).push(m);
  }
  const out = [`# ${alias}: journal`, '', `Every finished task, latest first, by week. ${metas.length} tasks, ${money(metas.reduce((n, m) => n + Number(m.cost_usd || 0), 0))} in all.`];
  for (const [wk, list] of byWeek) {
    const landed = list.filter(m => m.status === 'done').length;
    out.push('', `## ${wk}: ${list.length} tasks, ${landed} landed, ${money(list.reduce((n, m) => n + Number(m.cost_usd || 0), 0))}`, '');
    for (const m of list) out.push(`- ${day(m.updated)} · [${m.id}](tasks/${m.id}.md) · ${outcome(m)} · ${m.role || 'builder'} · ${money(m.cost_usd)} · ${m.title}`);
  }
  fs.writeFileSync(path.join(dir(alias), 'README.md'), out.join('\n') + '\n');
}

function combined(all) {
  const out = ['# Journal: every project', '', 'Every finished task across all projects, latest first. Each project\'s own index is in `<project>/journal/README.md`.', ''];
  let wk = '';
  for (const m of [...all].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))) {
    const k = week(m.updated);
    if (k !== wk) out.push('', `## ${k}`, ''), wk = k;
    out.push(`- ${day(m.updated)} · ${m.project} · [${m.id}](${m.project}/journal/tasks/${m.id}.md) · ${outcome(m)} · ${money(m.cost_usd)} · ${m.title}`);
  }
  fs.writeFileSync(path.join(ROOT, 'journal.md'), out.join('\n') + '\n');
}

// Writes an entry for each finished task that has none, or whose card changed since. Returns what it wrote.
export function pass({ rebuild = false } = {}) {
  const finished = cards.all().filter(c => FINISHED.includes(c.meta.status) && c.meta.project);
  const todo = finished.filter(c => rebuild || writtenFor(entryFile(c.meta.project, c.meta.id)) !== String(c.meta.updated || ''));
  if (!todo.length && fs.existsSync(path.join(ROOT, 'journal.md'))) return [];
  const evts = todo.length ? eventsByTask() : new Map();
  const asks = new Map();
  for (const c of todo) {
    const m = c.meta;
    if (!asks.has(m.project)) asks.set(m.project, asksOf(m.project));
    fs.mkdirSync(path.dirname(entryFile(m.project, m.id)), { recursive: true });
    fs.writeFileSync(entryFile(m.project, m.id), entry(m, c.body, evts.get(m.id) || [], asks.get(m.project).filter(a => mentions(a, m.id))));
  }
  const byProject = new Map();
  for (const c of finished) (byProject.get(c.meta.project) || byProject.set(c.meta.project, []).get(c.meta.project)).push(c.meta);
  for (const [alias, metas] of byProject) if (rebuild || todo.some(c => c.meta.project === alias) || !fs.existsSync(path.join(dir(alias), 'README.md'))) {
    fs.mkdirSync(dir(alias), { recursive: true });
    index(alias, metas);
  }
  fs.mkdirSync(ROOT, { recursive: true });
  combined(finished.map(c => c.meta));
  return todo.map(c => c.meta.id);
}
