// Tools a specialist can be given: skills and MCP servers from the official plugin catalog already on this
// PC, loaded per run (never installed globally). Every tool costs tokens on every iteration, so roles get
// a small default kit and the lead adds others per task (`atelier add ... --tools a,b`).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CATALOG_DIR = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces', 'claude-plugins-official');

export const TOOLS = {
  'frontend-design': {
    what: 'Skill: distinctive, production-grade UI design and front-end code (avoids generic AI-looking layouts)',
    plugin: 'plugins/frontend-design',
  },
  playwright: {
    what: 'MCP: a headless browser to open pages, click through flows and take screenshots for checking UI work',
    // Pinned, and always headless and isolated: nothing appears on the owner's screen.
    mcp: { command: 'npx', args: ['-y', '@playwright/mcp@0.0.83', '--headless', '--isolated'] },
  },
  context7: {
    what: "MCP: current documentation and examples for libraries and frameworks (saves guessing at APIs). Queries go to context7.com. Needs a free API key in CONTEXT7_API_KEY",
    needs: 'CONTEXT7_API_KEY',
    mcp: { type: 'http', url: 'https://mcp.context7.com/mcp', headers: { CONTEXT7_API_KEY: '${CONTEXT7_API_KEY}' } },
  },
  'security-guidance': {
    what: 'Hook: warns while editing when code follows insecure patterns (injection, unsafe deserialisation and the like)',
    plugin: 'plugins/security-guidance',
  },
  'code-simplifier': {
    what: 'Agent: simplifies and tidies recently changed code without changing behaviour',
    plugin: 'plugins/code-simplifier',
  },
};

// Default kits per role. Kept small on purpose: add a tool to a task when it needs one.
export const ROLE_KITS = {
  designer: ['frontend-design', 'playwright'],
  frontend: ['frontend-design', 'playwright', 'context7'],
  gameplay: ['context7'],
  backend: ['context7', 'security-guidance'],
  systems: ['context7', 'security-guidance'],
  builder: ['context7'],
  // Tools whose 'needs' (an API key) isn't set are skipped at run time, so kits work before sign-up.
  reviewer: ['security-guidance'],
  'game-designer': [],
  auditor: ['playwright'],
};

export function kitFor(role, extra = '') {
  const names = [...(ROLE_KITS[role || 'builder'] || []), ...String(extra || '').split(/[\s,]+/)].map(s => s.trim()).filter(Boolean);
  return [...new Set(names)].filter(n => TOOLS[n] && (!TOOLS[n].needs || process.env[TOOLS[n].needs]));
}

export function unknown(list) {
  return String(list || '').split(/[\s,]+/).filter(Boolean).filter(n => !TOOLS[n]);
}

// claude CLI arguments that load a kit. MCP servers go in a per-run config file in the run folder.
export function args(names, runDir) {
  const out = [];
  const mcp = {};
  for (const n of names) {
    const t = TOOLS[n];
    if (t.plugin) {
      const dir = path.join(CATALOG_DIR, t.plugin);
      if (fs.existsSync(dir)) out.push('--plugin-dir', dir);
    }
    if (t.mcp) mcp[n] = t.mcp;
  }
  if (Object.keys(mcp).length && runDir) {
    const file = path.join(runDir, 'mcp.json');
    fs.writeFileSync(file, JSON.stringify({ mcpServers: mcp }, null, 2));
    // `--mcp-config` takes several values; the = form keeps it from swallowing the next argument.
    out.push(`--mcp-config=${file}`);
  }
  return out;
}

export function describe() {
  return Object.entries(TOOLS).map(([n, t]) => `${n.padEnd(18)} ${t.what}${t.needs && !process.env[t.needs] ? ` [inactive: ${t.needs} not set]` : ''}`).join('\n') +
    '\n\nAlso available to every specialist: the owner\'s claude.ai connectors (e.g. Figma, Mobbin) and synced skills (pdf, docx, xlsx, design critique and more).' +
    '\n\nDefault kits: ' + Object.entries(ROLE_KITS).map(([r, k]) => `${r}: ${k.join(', ') || 'none'}`).join(' · ');
}
