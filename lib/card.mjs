// Task cards: one markdown file per task, flat `key: value` frontmatter plus a free-form body.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { paths, renameRetry } from './home.mjs';

// Board states, after Agent Office's bubbles: working / needs you / finished / stale.
// v2 adds `planned` (waiting for the owner to approve the task's plan) and `requested` (a
// specialist's request card, waiting for the lead to triage).
export const STATES = ['planned', 'requested', 'queued', 'running', 'needs-you', 'review', 'done', 'stalled', 'failed', 'paused'];

const KEY_ORDER = [
  'id', 'title', 'status', 'reason', 'project', 'role', 'phase', 'criteria', 'files', 'kind', 'waits_on', 'requested_by', 'review_rounds', 'test_touch', 'cost_usd', 'tokens_total', 'live_tokens', 'iter_started', 'iter_minutes', 'inbox_at',
  'repo', 'base', 'branch', 'where', 'autonomy', 'check',
  'iterations', 'hours', 'model', 'effort', 'priority', 'iteration', 'elapsed_min', 'last_check',
  'pid', 'heartbeat', 'worktree', 'pr', 'created', 'updated',
];

// Names and references stay text even when they happen to be all digits (a task id like 8988).
const TEXT_KEYS = new Set(['id', 'title', 'reason', 'project', 'role', 'phase', 'criteria', 'files', 'waits_on', 'requested_by', 'repo', 'base', 'branch', 'where', 'check', 'model', 'effort', 'worktree', 'pr', 'for']);

export function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('card has no frontmatter');
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    const raw = line.slice(i + 1).trim();
    meta[key] = !TEXT_KEYS.has(key) && /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
  }
  return { meta, body: m[2].trim() };
}

export function serialize({ meta, body }) {
  const keys = [...KEY_ORDER.filter(k => k in meta), ...Object.keys(meta).filter(k => !KEY_ORDER.includes(k))];
  const lines = keys
    .filter(k => meta[k] !== undefined && meta[k] !== null && meta[k] !== '')
    .map(k => `${k}: ${String(meta[k]).replace(/\r?\n/g, ' ')}`);
  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}

export function cardPath(id) {
  return path.join(paths.board, `${id}.md`);
}

export function load(id) {
  const file = cardPath(id);
  if (!fs.existsSync(file)) throw new Error(`No task "${id}"`);
  return parse(fs.readFileSync(file, 'utf8'));
}

export function save(card) {
  card.meta.updated = new Date().toISOString();
  const file = cardPath(card.meta.id);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, serialize(card));
  renameRetry(tmp, file);
  return card;
}

// Read-modify-write so a runner's heartbeat doesn't clobber a status change made from the CLI.
export function update(id, patch) {
  const card = load(id);
  Object.assign(card.meta, typeof patch === 'function' ? patch(card.meta) : patch);
  return save(card);
}

// A page build asks for every card many times over; only cards that changed on disk are read and parsed again.
// Each caller gets its own copy, since some change the meta they're given.
const parsed = new Map(); // file -> { key, card }
export function all() {
  if (!fs.existsSync(paths.board)) return [];
  const names = fs.readdirSync(paths.board).filter(f => f.endsWith('.md'));
  if (parsed.size > names.length * 2) parsed.clear();
  return names
    .map(f => {
      const file = path.join(paths.board, f);
      try {
        const st = fs.statSync(file), key = `${st.mtimeMs}:${st.size}`;
        let hit = parsed.get(file);
        if (!hit || hit.key !== key) parsed.set(file, hit = { key, card: parse(fs.readFileSync(file, 'utf8')) });
        return { meta: { ...hit.card.meta }, body: hit.card.body };
      } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => (a.meta.priority ?? 3) - (b.meta.priority ?? 3) || String(a.meta.created).localeCompare(String(b.meta.created)));
}

// Short ids so they're easy to type on a phone: four characters, no look-alikes.
export function newId() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (;;) {
    const id = Array.from(crypto.randomBytes(4), b => alphabet[b % alphabet.length]).join('');
    if (/^\d+$/.test(id)) continue; // an all-digit id reads like a number everywhere else
    if (!fs.existsSync(cardPath(id))) return id;
  }
}
