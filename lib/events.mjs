// Append-only event log that heartbeats read. Each reader (a project's lead, or the foreman)
// keeps its own "seen" offset, so one reader marking events doesn't hide them from another.
import fs from 'node:fs';
import { paths } from './home.mjs';
import * as cards from './card.mjs';

export function emit(id, type, msg = '') {
  const line = JSON.stringify({ ts: new Date().toISOString(), id, type, msg }) + '\n';
  fs.appendFileSync(paths.events, line);
}

// project: only events for that project's tasks. noProject: only tasks outside any project.
export function read({ unseen = false, mark = false, sinceMin, project, noProject = false } = {}) {
  if (!fs.existsSync(paths.events)) return [];
  const seenFile = `${paths.eventsSeen}${project ? `.${project}` : noProject ? '.foreman' : ''}`;
  const text = fs.readFileSync(paths.events, 'utf8');
  const offset = unseen ? Number(safeRead(seenFile) || 0) : 0;
  const slice = Buffer.from(text).subarray(offset).toString('utf8');
  if (mark) fs.writeFileSync(seenFile, String(Buffer.byteLength(text)));
  let events = slice.split('\n').filter(Boolean).map(l => JSON.parse(l));
  if (sinceMin) {
    const cutoff = Date.now() - sinceMin * 60_000;
    events = events.filter(e => Date.parse(e.ts) >= cutoff);
  }
  if (project || noProject) {
    const owner = new Map(cards.all().map(c => [c.meta.id, c.meta.project || '']));
    // Project-level events (gates, trust, overrules) use the project alias as their id.
    events = events.filter(e => project ? (owner.get(e.id) === project || e.id === project) : (owner.has(e.id) && !owner.get(e.id)));
  }
  return events;
}

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}
