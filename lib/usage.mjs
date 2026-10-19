// Usage, spend and ETAs read straight from each task's run logs, so they're accurate for every task,
// including ones started before live tracking existed.
//   - A finished run (its log has a `result` line) reports exact tokens and API-equivalent cost.
//   - A run in progress is summed from its streamed messages, and its cost estimated at the rate the same
//     task (or, failing that, the same model across all tasks) has actually been charged so far.
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './home.mjs';
import * as cards from './card.mjs';

const tokensOf = u => (u?.input_tokens || 0) + (u?.output_tokens || 0) + (u?.cache_read_input_tokens || 0) + (u?.cache_creation_input_tokens || 0);
const cache = new Map(); // file -> { key, value }

function readRun(file) {
  let st;
  try { st = fs.statSync(file); } catch { return null; }
  const key = `${st.size}:${st.mtimeMs}`;
  const hit = cache.get(file);
  if (hit && hit.key === key) return hit.value;
  const msgs = new Map();
  let result = null, model = '', first = null, last = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.type === 'assistant' && e.message?.usage) { msgs.set(e.message.id || msgs.size, e.message.usage); model = e.message.model || model; }
    if (e.type === 'result') result = e;
  }
  const value = {
    done: !!result,
    tokens: result?.usage ? tokensOf(result.usage) : [...msgs.values()].reduce((n, u) => n + tokensOf(u), 0),
    cost: result?.total_cost_usd || 0,
    model,
    started: st.birthtimeMs || st.ctimeMs,
    ended: st.mtimeMs,
    minutes: result?.duration_ms ? result.duration_ms / 60000 : null,
  };
  void first; void last;
  cache.set(file, { key, value });
  return value;
}

function runs(id) {
  const dir = path.join(paths.runs, id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /^(iter|review)-.*\.jsonl$/.test(f)).sort().map(f => ({ file: f, ...readRun(path.join(dir, f)) })).filter(r => r.tokens !== undefined);
}

// Per-model $/token actually charged across every finished run, for estimating runs in progress.
let rateCache = { at: 0, rates: {} };
function modelRates() {
  if (Date.now() - rateCache.at < 60_000) return rateCache.rates;
  const sums = {};
  for (const c of cards.all()) for (const r of runs(c.meta.id)) {
    if (!r.done || !r.tokens || !r.cost) continue;
    const m = r.model || 'unknown';
    sums[m] = sums[m] || { cost: 0, tokens: 0 };
    sums[m].cost += r.cost; sums[m].tokens += r.tokens;
  }
  rateCache = { at: Date.now(), rates: Object.fromEntries(Object.entries(sums).map(([m, s]) => [m, s.cost / s.tokens])) };
  return rateCache.rates;
}

export function forTask(meta) {
  const list = runs(meta.id);
  const done = list.filter(r => r.done);
  const live = list.filter(r => !r.done && meta.status === 'running');
  const cost = done.reduce((n, r) => n + r.cost, 0);
  const tokens = done.reduce((n, r) => n + r.tokens, 0);
  const liveTokens = live.reduce((n, r) => n + r.tokens, 0);
  const ownRate = tokens ? cost / tokens : 0;
  const rate = ownRate || modelRates()[live[0]?.model] || 0;
  const minutes = done.filter(r => r.file.startsWith('iter')).map(r => r.minutes).filter(Boolean);
  return {
    cost: Number(cost.toFixed(2)),
    tokens,
    liveTokens,
    liveCost: Number((liveTokens * rate).toFixed(2)),
    estimated: !!liveTokens,
    iterMinutes: minutes,
    model: (done[0] || live[0])?.model || '',
  };
}

// How many iterations tasks in a role usually take to finish, from this machine's own history.
let histCache = { at: 0, byRole: {}, all: [] };
function history() {
  if (Date.now() - histCache.at < 120_000) return histCache;
  const byRole = {}, all = [];
  for (const c of cards.all()) {
    const m = c.meta;
    if (m.status !== 'done' && m.status !== 'review') continue;
    const n = Number(m.iteration || 0);
    if (!n) continue;
    (byRole[m.role || 'builder'] = byRole[m.role || 'builder'] || []).push(n);
    all.push(n);
  }
  histCache = { at: Date.now(), byRole, all };
  return histCache;
}
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// A rough range, honest about being rough: "likely 20–40 min". Null when there's nothing to go on.
export function eta(meta, u) {
  if (meta.status !== 'running' && meta.status !== 'queued') return null;
  const h = history();
  const budget = Number(meta.iterations || 10);
  // Without history for this role, assume it uses a good part of its budget (the lead sizes budgets).
  const roleMedian = median(h.byRole[meta.role || 'builder'] || []);
  const expected = Math.max(1, roleMedian || Math.max(median(h.all) || 1, Math.ceil(budget * 0.4)));
  const perIter = median(u.iterMinutes) || 10;
  const at = Number(meta.iteration || 0);
  const started = Date.parse(meta.iter_started || 0) || null;
  const inCurrent = meta.status === 'running' && started ? Math.max(0, perIter - (Date.now() - started) / 60000) : perIter;
  const lowIters = Math.max(0, Math.min(budget, expected) - at - 1);
  const highIters = Math.max(0, Math.min(budget, expected + 2) - at - 1);
  const low = Math.round(inCurrent + lowIters * perIter);
  const high = Math.round(inCurrent + highIters * perIter + perIter * 0.5);
  return { low: Math.max(1, low), high: Math.max(low + 2, high), perIter: Math.round(perIter), expected, basis: (h.byRole[meta.role || 'builder'] || []).length };
}

// Atelier's own share of usage since local midnight, to set beside the whole-plan meters.
export function today() {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  let tokens = 0, cost = 0, runsCount = 0, liveTokens = 0;
  for (const c of cards.all()) for (const r of runs(c.meta.id)) {
    if (r.ended < since.getTime()) continue;
    runsCount++;
    if (r.done) { tokens += r.tokens; cost += r.cost; } else if (c.meta.status === 'running') liveTokens += r.tokens;
  }
  return { tokens, cost: Number(cost.toFixed(2)), runs: runsCount, liveTokens };
}
