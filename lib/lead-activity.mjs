// What a lead is doing right now, read from its own Claude session record (the path its hooks write to
// projects/<alias>/lead-transcript.txt). Used by the dashboard and the scheduler's idle check.
import fs from 'node:fs';
import path from 'node:path';
import * as project from './project.mjs';

// What the lead is doing, from its own Claude session record: busy from its first thought until its turn ends,
// and in words, from what it last did. Events alone missed most of it: a lead reading, thinking or writing to the
// owner showed as idle (15 Nov).
const LEAD_CMD = [[/\batelier ask\b.*\breply\b/, 'Replying to you'], [/\batelier ask\b/, 'Writing to you'], [/\batelier (add|approve)\b/, 'Planning tasks'],
  [/\batelier checklist\b/, 'Working on the checklist'], [/\batelier (land|merge)\b/, 'Bringing in finished work'], [/\batelier (extend|cancel|stop)\b/, 'Steering the team'],
  [/\batelier (board|asks|checklist|status|costs)\b/, 'Checking the board'], [/\bgit\b/, 'Looking at the code history']];
export function leadActivity(file, now = Date.now()) {
  let text = '';
  try {
    const fd = fs.openSync(file, 'r');
    try { const size = fs.fstatSync(fd).size, n = Math.min(256 * 1024, size), buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, size - n); text = buf.toString('utf8'); } finally { fs.closeSync(fd); }
  } catch { return null; }
  const entries = text.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const last = entries.filter(e => ['assistant', 'user', 'system'].includes(e.type)).at(-1);
  if (!last) return null;
  const at = Date.parse(last.timestamp || 0);
  if (last.type === 'system' && ['stop_hook_summary', 'turn_duration'].includes(last.subtype)) return { busy: false, since: last.timestamp };
  if (now - at > 30 * 60_000) return { busy: false, since: last.timestamp }; // a turn that never closed isn't work
  const said = entries.filter(e => e.type === 'assistant').at(-1)?.message?.content || [];
  const tool = [...said].reverse().find(c => c.type === 'tool_use');
  let doing = said.some(c => c.type === 'text') && !tool ? 'Writing' : 'Thinking';
  if (tool) {
    const cmd = String(tool.input?.command || '');
    doing = ['Bash', 'PowerShell'].includes(tool.name) ? (LEAD_CMD.find(([re]) => re.test(cmd))?.[1] || 'Running a command')
      : ['Read', 'Grep', 'Glob'].includes(tool.name) ? 'Reading the project'
      : ['Edit', 'Write', 'MultiEdit'].includes(tool.name) ? 'Writing plans and notes'
      : tool.name === 'Agent' ? 'Sending a helper to look into something' : 'Working';
  }
  return { busy: true, doing, since: last.timestamp };
}

// The same for a project: null when no record is known.
export function forProject(alias) {
  let file = '';
  try { file = fs.readFileSync(path.join(project.dir(alias), 'lead-transcript.txt'), 'utf8').trim(); } catch { return null; }
  return file ? leadActivity(file) : null;
}
