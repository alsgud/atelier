// A project's keys (API keys and settings its code reads from .env), kept in Atelier's state rather
// than the repo and handed to that project's runs as environment variables. Worktrees never get a .env
// file. Keys for live channels (the owner's real bot, phone line) are left out by default, so no agent
// can reach the owner through them.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';

export const LIVE_CHANNELS = /^(TELEGRAM_|TWILIO_|DISCORD_|SLACK_|WHATSAPP_)/;

const file = alias => path.join(project.dir(alias), 'env.json');

export function parse(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

export function importFile(alias, from, { drop = [], keepLive = false } = {}) {
  const all = parse(fs.readFileSync(from, 'utf8'));
  const kept = {}, dropped = [];
  for (const [k, v] of Object.entries(all)) {
    if (drop.includes(k) || (!keepLive && LIVE_CHANNELS.test(k))) dropped.push(k);
    else kept[k] = v;
  }
  fs.writeFileSync(file(alias), JSON.stringify({ from: path.resolve(from), importedAt: new Date().toISOString(), env: kept, dropped }, null, 2));
  return { kept: Object.keys(kept), dropped };
}

export function load(alias) {
  try { return JSON.parse(fs.readFileSync(file(alias), 'utf8')); } catch { return null; }
}

// What a run of this project gets added to its environment.
export function forRuns(alias) {
  return alias ? (load(alias)?.env || {}) : {};
}
