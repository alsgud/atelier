// The owner's independent auditor. Plan-blind: it gets a checkout of the product with the lead's plan,
// ledger and briefs removed, and judges it only against what the owner approved (charter, rulings,
// criteria, spec/design/contracts). Several checkers verify independently; a final pass tries to refute
// each finding before anything reaches the owner.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './home.mjs';
import * as project from './project.mjs';
import * as decisions from './decisions.mjs';
import * as events from './events.mjs';
import * as gitx from './git.mjs';
import { callClaude, claudeArgs, atelierEnv } from './runner.mjs';

const PLAN_ONLY = ['atelier/PLAN.md', 'atelier/LEDGER.md', 'atelier/briefs', 'atelier/holdout-draft'];
const CHECKERS = 4;

// An audit is running only if its lock exists and the process that took it is alive. A lock left by
// a killed audit is stale: it must neither show as "auditing" nor block the next audit.
export function auditRunning(alias) {
  const lock = path.join(project.dir(alias), 'audit.lock');
  if (!fs.existsSync(lock)) return false;
  const pid = Number(fs.readFileSync(lock, 'utf8').trim());
  try { process.kill(pid, 0); return true; } catch (e) {
    if (e.code === 'EPERM') return true;
    fs.rmSync(lock, { force: true });
    return false;
  }
}

export function auditDir(alias) {
  const d = path.join(project.dir(alias), 'audits');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export async function audit(alias, { log = console.log } = {}) {
  const p = project.load(alias);
  const repo = (await import('./home.mjs')).resolveRepo(alias);
  const base = gitx.git(repo, 'symbolic-ref', '--short', 'HEAD').out || 'main';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = path.join(auditDir(alias), stamp);
  fs.mkdirSync(runDir, { recursive: true });

  // 1. A plan-blind checkout of the latest product.
  const wt = path.join(project.dir(alias), 'audit-wt');
  if (fs.existsSync(wt)) { gitx.git(repo, 'worktree', 'remove', '--force', wt); fs.rmSync(wt, { recursive: true, force: true }); }
  const ref = gitx.remoteBase(repo, base) || base;
  gitx.must(repo, 'worktree', 'add', '--detach', wt, ref);
  for (const f of PLAN_ONLY) fs.rmSync(path.join(wt, f), { recursive: true, force: true });
  const head = gitx.head(wt).slice(0, 7);
  events.emit(alias, 'audit-started', `auditing ${ref} (${head})`);

  // 2. What the owner approved, and the milestones as facts (no reasoning from the lead).
  const crit = decisions.loadCriteria(alias).criteria.filter(c => decisions.isApproved(c));
  const milestones = project.PHASES.map(ph => `${ph}: ${p.gates[ph]?.status || 'open'}`).join(' · ');
  // The owner's intent: the charter, or the approved brief for projects that predate charters, plus each requirement.
  const charterFile = path.join(wt, 'atelier', 'CHARTER.md');
  const intent = fs.existsSync(charterFile) && /^## /m.test(fs.readFileSync(charterFile, 'utf8').replace(/<!--[\s\S]*?-->/g, ''))
    ? splitCharter(charterFile)
    : splitCharter(path.join(wt, 'atelier', 'BRIEF.md')).map(s => ({ ...s, title: `Brief — ${s.title}` }));
  const reqs = splitCharter(path.join(wt, 'atelier', 'SPEC.md')).filter(s => /^R\d+/.test(s.title)).map(s => ({ ...s, title: `Spec ${s.title}` }));
  const sections = [...intent, ...reqs];
  const groups = makeGroups(sections, crit);
  // Before the build there is no product, only plans; those findings are the lead's to fix, not the owner's.
  const stage = project.nextPhase(p) === 'build' ? 'product' : 'plans';
  const past = loadFindings(alias);
  const settled = past.filter(f => f.status === 'dismissed').map(f => `- ${f.headline || f.claim}${f.ownerNote ? ` (owner: "${f.ownerNote}")` : ''}`);
  const known = past.filter(f => ['open', 'confirmed', 'sent-to-lead'].includes(f.status)).map(f => `- ${f.headline || f.claim}`);
  const history = [
    settled.length ? `The owner has already said these are fine. Don't raise them again:\n${settled.join('\n')}` : '',
    known.length ? `Already reported and being handled. Only raise one again if it got worse:\n${known.join('\n')}` : '',
  ].filter(Boolean).join('\n\n');

  // 3. Independent checkers in parallel.
  const cfg = config();
  const auditorMeta = { id: `audit-${alias}`, role: 'auditor', project: alias, model: 'opus', effort: 'high' };
  const checkerPrompt = (g, i) => [
    project.roleTemplate('auditor').prompt,
    `# Your slice (${i + 1} of ${groups.length})\n\nCheck the product in your working directory against the following. The full charter and rulings are in atelier/CHARTER.md and atelier/RULINGS.md; the approved spec, design and contracts are under atelier/.\n\n${g.text}`,
    `Milestones (facts): ${milestones}. Product version: ${head}.`,
    history,
    'End with a JSON array in a ```json block: [{"claim": "...", "expected": "what the owner\'s words require", "observed": "what you found", "evidence": "command+output or file:line", "severity": "high|medium|low", "reversibility": "easy|hard", "source": "charter section / R-n / AC-n"}]. Return [] if you found no drift. Put things you could not verify in a final line starting UNVERIFIED:.',
  ].join('\n\n');
  const results = [];
  for (let i = 0; i < groups.length; i += CHECKERS) {
    const batch = groups.slice(i, i + CHECKERS).map((g, j) => callClaude(auditorMeta.id, log, checkerPrompt(g, i + j), {
      cwd: wt,
      logFile: path.join(runDir, `checker-${i + j + 1}.jsonl`),
      timeoutMs: cfg.iterationTimeoutMin * 60_000,
      args: claudeArgs(auditorMeta, runDir, `audit ${i + j + 1}`, cfg),
      env: atelierEnv(auditorMeta, runDir, wt),
    }));
    results.push(...await Promise.all(batch));
  }
  const candidates = results.flatMap((r, i) => parseFindings(r.text).map(f => ({ ...f, checker: i + 1 })));
  const unverified = results.flatMap(r => (r.text.match(/^UNVERIFIED:.*$/gm) || []));

  // 4. Adversarial cross-check: try to refute each candidate; keep only what survives.
  let findings = [];
  if (candidates.length) {
    const res = await callClaude(auditorMeta.id, log, [
      project.roleTemplate('auditor').prompt,
      '# Cross-check\n\nIndependent checkers reported the drift findings below. For each one, try to **refute** it: re-run the evidence, check whether the charter or rulings actually require what the finding claims, and look for an owner decision that explains it. Keep a finding only if it survives. Merge duplicates.',
      '```json\n' + JSON.stringify(candidates, null, 2) + '\n```',
      history,
    stage === 'plans' ? 'There is no built product yet: these findings are about plans and documents.' : '',
    'Then decide who each surviving finding is for. The owner is a busy, non-technical manager. Set "forOwner": true only when the owner would notice it when using the product, or it needs a decision only the owner can make (a trade-off between things they asked for, cost, scope). Gaps in tests or criteria, wording mismatches between documents, and anything the team can simply fix are "forOwner": false: they go to the lead to fix.',
    'For every finding also write "headline": one short sentence the owner understands at a glance, in plain words: no file names, IDs, codes or jargon (e.g. "Clips you recorded at high quality may not play"). And "impact": one plain sentence on what the owner would experience if nobody fixes it.',
    'End with a JSON array in a ```json block of the surviving findings, same fields, plus "verdict": "confirmed", a one-line "why", "headline", "impact" and "forOwner".',
    ].join('\n\n'), {
      cwd: wt,
      logFile: path.join(runDir, 'crosscheck.jsonl'),
      timeoutMs: cfg.iterationTimeoutMin * 60_000,
      args: claudeArgs(auditorMeta, runDir, 'audit cross-check', cfg),
      env: atelierEnv(auditorMeta, runDir, wt),
    });
    findings = parseFindings(res.text);
  }

  // 5. Rank by severity, then how hard the drift is to reverse; number them for the owner.
  const rank = f => ({ high: 0, medium: 1, low: 2 }[f.severity] ?? 3) * 2 + (f.reversibility === 'hard' ? 0 : 1);
  findings.sort((a, b) => rank(a) - rank(b));
  const all = loadFindings(alias);
  let n = all.length;
  const stamped = findings.map(f => ({ ...f, id: `F-${++n}`, audit: stamp, product: head, stage, status: f.forOwner === false ? 'sent-to-lead' : 'open' }));
  saveFindings(alias, [...all, ...stamped]);

  const report = { alias, at: new Date().toISOString(), product: head, checkers: groups.length, candidates: candidates.length, findings: stamped, unverified };
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));
  gitx.git(repo, 'worktree', 'remove', '--force', wt);
  const p2 = project.load(alias);
  p2.lastAudit = { at: report.at, product: head, findings: stamped.length };
  project.save(p2);
  const mine = stamped.filter(f => f.status === 'open');
  for (const f of stamped.filter(f => f.status === 'sent-to-lead')) events.emit(alias, 'finding-to-lead', `${f.id}: ${f.headline || f.claim} (details: atelier audit ${alias} findings --lead)`);
  events.emit(alias, 'audit', `${mine.length} for you, ${stamped.length - mine.length} sent to the lead to fix (${stage} audit of ${head})`);
  return report;
}

// The owner confirms or dismisses each finding; the confirm rate is the auditor's hit rate.
export function judge(alias, id, verdict, note = '') {
  const all = loadFindings(alias);
  const f = all.find(x => x.id === id);
  if (!f) throw new Error(`no finding ${id}`);
  if (verdict === 'fixed') {
    // The lead says it's fixed; the next audit checks.
    f.status = 'fixed'; f.leadNote = note; f.fixedAt = new Date().toISOString();
    saveFindings(alias, all);
    events.emit(alias, 'finding-fixed', `${id}: ${f.headline || f.claim}${note ? ` (${note})` : ''}`);
    return f;
  }
  f.status = verdict === 'confirm' ? 'confirmed' : 'dismissed';
  f.ownerNote = note;
  f.judgedAt = new Date().toISOString();
  saveFindings(alias, all);
  // Only real product drift tightens trust; a gap in the plans is just something to fix.
  if (f.status === 'confirmed' && f.severity === 'high' && f.stage === 'product') {
    const p = project.load(alias);
    if (p.trust !== 'strict' || project.dials(p).reporting !== 'everything') {
      p.trust = 'strict'; p.reporting = 'everything'; p.dialChangedAt = new Date().toISOString(); p.approvalsAtDialChange = p.approvals || 0;
      project.save(p);
      events.emit(alias, 'demoted', `trust back to strict and reporting to everything: you confirmed high-severity drift ${id}`);
    }
  }
  events.emit(alias, `finding-${f.status}`, f.status === 'confirmed'
    ? `${id}: owner wants this fixed: ${f.headline || f.claim}${note ? `. Owner's note: ${note}` : ''}`
    : `${id}: owner says this is fine: ${f.headline || f.claim}${note ? `. Owner's note: ${note}` : ''}`);
  return f;
}

export function hitRate(alias) {
  const judged = loadFindings(alias).filter(f => ['confirmed', 'dismissed'].includes(f.status));
  return { judged: judged.length, confirmed: judged.filter(f => f.status === 'confirmed').length };
}

export function loadFindings(alias) {
  const f = path.join(auditDir(alias), 'findings.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}

function saveFindings(alias, list) {
  fs.writeFileSync(path.join(auditDir(alias), 'findings.json'), JSON.stringify(list, null, 2));
}

function splitCharter(file) {
  if (!fs.existsSync(file)) return [{ title: 'Charter', body: '(no charter yet)' }];
  const text = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  return text.split(/^## /m).slice(1).map(s => ({ title: s.split('\n')[0].trim(), body: s.split('\n').slice(1).join('\n').trim() })).filter(s => s.body);
}

// Charter sections and approved criteria, dealt into a handful of slices for the checkers.
function makeGroups(sections, crit) {
  const items = [
    ...sections.map(s => `${/^(Brief|Spec) /.test(s.title) ? '' : 'Charter — '}${s.title}:\n${s.body}`),
    ...crit.map(c => `${c.id} (${c.kind}, status ${c.status}): ${c.statement}${c.verify ? `\n  verify: ${c.verify}` : ''}\n  serves: ${c.serves}`),
  ];
  if (!items.length) return [{ text: 'Check the product against atelier/CHARTER.md and atelier/RULINGS.md as a whole.' }];
  const n = Math.min(CHECKERS, items.length);
  const groups = Array.from({ length: n }, () => []);
  items.forEach((it, i) => groups[i % n].push(it));
  return groups.map(g => ({ text: g.join('\n\n') }));
}

function parseFindings(text) {
  const m = [...(text || '').matchAll(/```json\s*([\s\S]*?)```/g)].pop();
  if (!m) return [];
  try { const v = JSON.parse(m[1]); return Array.isArray(v) ? v : []; } catch { return []; }
}
