#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { HOME, PKG, paths, ensureHome, config, readJson, writeJson, resolveRepo, repoAlias, runDir } from '../lib/home.mjs';
import * as cards from '../lib/card.mjs';
import * as events from '../lib/events.mjs';
import * as limits from '../lib/limits.mjs';
import * as gitx from '../lib/git.mjs';
import { tick } from '../lib/tick.mjs';
import { run, alive, atelierEnv, spawnDetached, runCheck, runnerPid, stopRunner } from '../lib/runner.mjs';
import * as budget from '../lib/budget.mjs';
import * as toolkit from '../lib/toolkit.mjs';
import * as projenv from '../lib/projenv.mjs';
import * as project from '../lib/project.mjs';
import * as guard from '../lib/guard.mjs';
import * as decisions from '../lib/decisions.mjs';
import * as owner from '../lib/owner.mjs';
import * as auditor from '../lib/auditor.mjs';
import * as messages from '../lib/messages.mjs';
import * as asks from '../lib/asks.mjs';
import * as checklist from '../lib/checklist.mjs';
import * as metrics from '../lib/metrics.mjs';

const HELP = `atelier — task cards, Ralph loops and a phone-driven foreman for Claude Code

  atelier init                         create ~/.atelier and the foreman folder
  atelier repo add <alias> <path>      register a repo under a short name
  atelier repo list
  atelier add <repo> "<title>" --check "<cmd>" [--goal "..."] [--iterations N] [--hours H]
           [--role R] [--phase design|contracts] [--autonomy pr|branch] [--where local|cloud]
           [--model M] [--effort E] [--priority 1-5] [--base main] [--hold]
  atelier list [--all] [--json]        the board (done tasks hidden unless --all)
  atelier board [project]              tasks grouped by role

 projects and teams (v2)
  atelier project init <alias> [--roster team|pair|game] [--trust strict|standard|loose]
  atelier project status <alias>
  atelier project role add <alias> <role> [--owns "glob,glob"] | role remove <alias> <role>
  atelier project trust <alias> strict|standard|loose
  atelier project autonomy <alias> pr|merge|branch   pr (default): draft PRs · merge: push reviewed work to main
  atelier roles                        list role templates
  atelier gate <alias> <brief|spec|design|contracts> approve|skip|reopen --quote "<owner's words>" [--merge <task>]
  atelier approve <id> [--check "<cmd>"]   planned/requested → queued
  atelier close <id> "<note>"          mark a request for the lead handled (resumes tasks waiting on it)
  atelier request --to <role> "<what>" [--from <id>]   file a request card (agents: --from is automatic)
  atelier overrule <alias> "<proposal → what the owner wanted>"
  atelier verify design|contracts      done-checks for planning tasks (run in the repo/worktree)
  atelier watch <alias>             stream owner decisions and task changes (the lead runs this under Monitor)
  atelier ask <alias> approval|question|feedback|update "<title>" [--body ..] [--attach f,..] [--task id]   the lead writes to the owner's Inbox
  atelier checklist <alias> [propose|ready|add|withdraw]   the current round: what's on it and how far along
  atelier asks <alias> [--all]         the lead's threads with the owner and their answers
  atelier lead <alias>                 start the project's lead session with Remote Control
  atelier guard                        (PreToolUse hook: enforces role ownership and frozen docs)

  atelier show <id>                    card, recent progress, open questions, last check
  atelier digest                       phone-sized summary of everything
  atelier tick                         reconcile and start queued tasks
  atelier answer <id> "<text>"         answer the agent's question and requeue it
  atelier extend <id> [--iterations N] [--hours H]   more budget, requeue
  atelier stop <id> | resume <id> | retry <id> | cancel <id>
  atelier clean <id>                   remove a finished task's worktree (branch stays)
  atelier events [--unseen] [--mark] [--since MIN]
  atelier limits                       last known plan usage
  atelier cloud <id>                   print the prompt to start this task as a cloud session
  atelier open                         open the dashboard (starts it if needed)
  atelier new <name> [--roster team|pair|game] [--ship merge|pr] [--no-github]   create a project from scratch
  atelier dashboard [--lan] [--port N] run the dashboard server (also on Tailscale when connected; --lan: whole home Wi-Fi)
  atelier foreman                      start the foreman session with Remote Control
  atelier statusline                   (status line command; records plan limits)
  atelier run <id>                     (internal) run the Ralph loop in the foreground
`;

const [cmd, ...rest] = process.argv.slice(2);
const { flags, args } = parseArgs(rest);

try {
  ensureHome();
  await main();
} catch (err) {
  console.error(`atelier: ${err.message}`);
  if (process.env.ATELIER_DEBUG) console.error(err.stack);
  process.exit(1);
}

async function main() {
  switch (cmd) {
    case 'init': return init();
    case 'repo': return repo();
    case 'add': return add();
    case 'list': case 'ls': return list();
    case 'board': return board(args[0]);
    case 'project': return projectCmd();
    case 'roles': return console.log(project.roles().map(r => `${r.padEnd(14)} ${project.roleTemplate(r).title} — owns ${project.roleTemplate(r).owns.join(', ') || 'nothing'}`).join('\n'));
    case 'gate': return gate();
    case 'approve': return approve(need(0, 'id'));
    case 'charter': return charterCmd();
    case 'watch': return watchCmd();
    case 'msg': return msgCmd();
    case 'messages': return messagesCmd();
    case 'ask': return askCmd();
    case 'checklist': return checklistCmd();
    case 'asks': return asksCmd();
    case 'audit': return auditCmd();
    case 'sync': return syncCmd();
    case 'tools': return console.log(toolkit.describe());
    case 'costs': return costsCmd(args[0]);
    case 'service': return serviceCmd(args[0] || 'status');
    case 'screen': return screenCmd();
    case 'criteria': return criteriaCmd();
    case 'ruling': return rulingCmd();
    case 'holdout': return holdoutCmd();
    case 'request': return request();
    case 'overrule': return overrule(need(0, 'project'), args.slice(1).join(' '));
    case 'verify': return verify(need(0, 'design|contracts'));
    case 'lead': return lead(need(0, 'project'));
    case 'lead-context': return leadContext(need(0, 'project'));
    case 'guard': return guardHook();
    case 'lead-stop': return leadStopHook(need(0, 'project'));
    case 'close': return close();
    case 'show': return show(need(0, 'id'));
    case 'digest': return digest();
    case 'tick': { const r = tick(); if (r.skipped) console.log(r.skipped); else if (!r.changes.length) console.log('no changes'); return; }
    case 'run': return run(need(0, 'id'));
    case 'answer': return answer(need(0, 'id'), args.slice(1).join(' ') || flags.text);
    case 'extend': return extend(need(0, 'id'));
    case 'stop': return stop(need(0, 'id'));
    case 'resume': case 'retry': return requeue(need(0, 'id'), cmd);
    case 'cancel': return cancel(need(0, 'id'));
    case 'land': return land(need(0, 'id'));
    case 'clean': return clean(need(0, 'id'));
    case 'events': return printEvents();
    case 'limits': return console.log(limits.describe());
    case 'cloud': return cloud(need(0, 'id'));
    case 'foreman': return foreman();
    case 'dashboard': return dashboardCmd();
    case 'open': return openCmd();
    case 'new': {
      const { create } = await import('../lib/newproject.mjs');
      const r = create({ name: args.join(' '), roster: flags.roster || 'team', ship: flags.ship || 'merge', github: !flags['no-github'], description: typeof flags.description === 'string' ? flags.description : '' });
      return console.log(`${r.alias}:\n  ${r.steps.join('\n  ')}\nnext: atelier open, then start the lead`);
    }
    case 'statusline': return statusline();
    case undefined: case 'help': case '--help': case '-h': return console.log(HELP);
    default: throw new Error(`unknown command "${cmd}"\n\n${HELP}`);
  }
}

function init() {
  installForeman();
  console.log(`atelier home: ${HOME}\nforeman:   ${paths.foreman}\nconfig:    ${paths.config}`);
}

function repo() {
  const repos = readJson(paths.repos, {});
  if (args[0] === 'add') {
    const [, alias, p] = args;
    if (!alias || !p) throw new Error('usage: atelier repo add <alias> <path>');
    const abs = path.resolve(p);
    gitx.must(abs, 'rev-parse', '--git-dir');
    repos[alias] = abs;
    writeJson(paths.repos, repos);
    return console.log(`${alias} → ${abs}`);
  }
  for (const [alias, p] of Object.entries(repos)) console.log(`${alias.padEnd(16)} ${p}`);
}

function add() {
  const cfg = config();
  const [repoArg, ...titleParts] = args;
  const title = titleParts.join(' ') || flags.title;
  if (!repoArg || !title) throw new Error('usage: atelier add <repo> "<title>" --check "<cmd>" [--goal "..."]');
  if (!flags.check) throw new Error('every task needs --check: a command that exits 0 only when the task is done');
  const repoPath = resolveRepo(repoArg);
  const d = cfg.defaults;
  // A project may name its integration branch (e.g. 'v2' while main runs live); otherwise the checkout's branch.
  const base = flags.base || project.tryLoad(repoAlias(repoPath))?.base || gitx.git(repoPath, 'symbolic-ref', '--short', 'HEAD').out || d.base;
  const alias = repoAlias(repoPath);
  const p = project.tryLoad(alias);
  const role = flags.role || '';
  if (role) project.roleTemplate(role); // throws on an unknown role
  if (p) {
    const missing = project.missingGates(p, { phase: flags.phase, role });
    if (missing.length) throw new Error(`${alias} needs these gates approved first: ${missing.join(', ')} (see atelier project status ${alias})`);
    if (role && !p.roster.some(r => r.role === role) && role !== 'builder') throw new Error(`${role} isn't on ${alias}'s roster. Add it: atelier project role add ${alias} ${role}`);
    // Once a project has criteria, every build task must cite the approved criteria it satisfies.
    const known = decisions.loadCriteria(alias).criteria;
    if (known.length && !flags.phase) {
      const ids = decisions.criteriaIds(typeof flags.criteria === 'string' ? flags.criteria : '');
      if (!ids.length) throw new Error(`cite the acceptance criteria this task satisfies: --criteria AC-1,AC-2 (see atelier criteria ${alias} list)`);
      const bad = ids.filter(i => !known.some(c => c.id === i && decisions.isApproved(c)));
      if (bad.length) throw new Error(`${bad.join(', ')} ${bad.length > 1 ? "aren't" : "isn't"} an approved criterion (approved: ${known.filter(decisions.isApproved).map(c => c.id).join(', ') || 'none'}). Separate ids with commas or spaces.`);
    }
  }
  // Build work has to be for an open line of the approved checklist; phase documents come before any checklist.
  const forLines = checklist.forIds(flags.for);
  const outside = typeof flags.outside === 'string' ? flags.outside.trim() : '';
  if (p && !flags.phase) {
    if (outside) { if (!(Number(flags.budget) > 0 && Number(flags.budget) <= checklist.OUTSIDE_MAX)) throw new Error(`work outside the checklist is for small fixes only: give it --budget of at most $${checklist.OUTSIDE_MAX}, or put it on the next checklist`); }
    else checklist.checkFor(alias, forLines);
  }
  if (typeof flags.tools === 'string' && toolkit.unknown(flags.tools).length) throw new Error(`unknown tools: ${toolkit.unknown(flags.tools).join(', ')} (see atelier tools)`);
  // At strict trust every task waits for the owner to approve its plan.
  const after = typeof flags.after === 'string' ? flags.after.split(/[\s,]+/).filter(Boolean) : [];
  for (const a of after) if (!fs.existsSync(path.join(paths.board, `${a}.md`))) throw new Error(`--after: no task ${a}`);
  const initial = flags.hold ? 'paused' : (p?.trust === 'strict' ? 'planned' : after.length ? 'paused' : 'queued');
  const id = cards.newId();
  const goal = flags['goal-file'] ? fs.readFileSync(flags['goal-file'], 'utf8') : (flags.goal || title);
  cards.save({
    meta: {
      id, title, status: initial,
      project: p ? alias : '', role, phase: flags.phase || '',
      criteria: decisions.criteriaIds(typeof flags.criteria === 'string' ? flags.criteria : '').join(','),
      ...(forLines.length ? { for: forLines.join(',') } : {}), ...(outside ? { outside } : {}),
      ...(typeof flags.tools === 'string' ? { tools: flags.tools } : {}), ...(flags.evidence === 'none' ? { evidence: 'none' } : {}), ...(after.length ? { waits_on: after.join(','), reason: `waiting for ${after.join(', ')} to be done` } : {}), ...(typeof flags.paid === 'string' ? { paid: flags.paid } : {}), ...(flags.budget !== undefined ? { budget: num(flags.budget, 0) } : {}), files: typeof flags.files === 'string' ? flags.files : '',
      repo: repoPath, base, where: flags.where || d.where, autonomy: flags.autonomy || p?.autonomy || d.autonomy,
      check: flags.check, iterations: num(flags.iterations, d.iterations), hours: num(flags.hours, d.hours),
      model: flags.model || p?.roster.find(r => r.role === role)?.model, effort: flags.effort, priority: num(flags.priority, 3),
      iteration: 0, created: new Date().toISOString(),
    },
    body: `## Goal\n\n${goal.trim()}\n`,
  });
  events.emit(id, 'added', outside ? `${title} (outside the checklist: ${outside})` : title);
  console.log(`added ${id}: ${title} [${alias}${role ? ` · ${role}` : ''}]${initial === 'planned' ? ` — planned; start it with: atelier approve ${id}` : ''}`);
  if (initial === 'queued' && (flags.where || d.where) === 'local') tick();
}

function list() {
  const rows = cards.all().filter(c => flags.all || c.meta.status !== 'done');
  if (flags.json) return console.log(JSON.stringify(rows.map(c => c.meta), null, 2));
  if (!rows.length) return console.log('board is empty');
  for (const { meta: m } of rows) {
    const prog = m.status === 'running' || m.iteration ? ` ${m.iteration || 0}/${m.iterations}` : '';
    const chk = m.last_check ? ` check:${m.last_check}` : '';
    console.log(`${m.id}  ${m.status.padEnd(9)} ${repoAlias(m.repo).padEnd(12)} ${(m.role || '-').padEnd(13)} ${m.title}${prog}${chk}${m.reason ? `  — ${m.reason}` : ''}`);
  }
}

function show(id) {
  const card = cards.load(id);
  const dir = runDir(id);
  console.log(cards.serialize(card));
  const tail = (f, n) => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').slice(-n).join('\n') : '(none)';
  console.log(`--- progress (latest) ---\n${tail('PROGRESS.md', 25)}\n`);
  console.log(`--- decisions ---\n${tail('DECISIONS.md', 15)}\n`);
  console.log(`--- questions ---\n${tail('QUESTIONS.md', 20)}\n`);
  console.log(`--- last check ---\n${tail('last-check.txt', 15)}`);
}

function digest() {
  const all = cards.all();
  const by = s => all.filter(c => c.meta.status === s);
  const line = (m, extra = '') => `• ${m.id} ${m.title} [${repoAlias(m.repo)}]${extra}`;
  const out = [];
  const counts = cards.STATES.map(s => [s, by(s).length]).filter(([s, n]) => n && s !== 'done');
  out.push(counts.length ? counts.map(([s, n]) => `${n} ${s}`).join(' · ') : 'Board is empty.');
  const needs = by('needs-you');
  if (needs.length) out.push('', 'Waiting on you:', ...needs.map(c => line(c.meta, ` — ${c.meta.reason}`)));
  const planned = by('planned');
  if (planned.length) out.push('', 'Plans awaiting approval:', ...planned.map(c => line(c.meta, ` — ${c.meta.role || 'builder'}, check \`${c.meta.check}\`, ${c.meta.iterations} it / ${c.meta.hours}h`)));
  const requested = by('requested');
  if (requested.length) out.push('', 'Requests for the lead:', ...requested.map(c => line(c.meta, ` — for ${c.meta.role}, from ${c.meta.requested_by || '?'}`)));
  const review = by('review');
  if (review.length) out.push('', 'Ready for review:', ...review.map(c => line(c.meta, c.meta.pr ? ` — ${c.meta.pr}` : ` — ${c.meta.reason}`)));
  const running = by('running');
  if (running.length) out.push('', 'Working:', ...running.map(c => line(c.meta, ` — ${c.meta.iteration || 0}/${c.meta.iterations}, check ${c.meta.last_check || 'not run'}${c.meta.reason ? `, ${c.meta.reason}` : ''}`)));
  const broken = [...by('stalled'), ...by('failed')];
  if (broken.length) out.push('', 'Stopped:', ...broken.map(c => line(c.meta, ` — ${c.meta.status}: ${c.meta.reason}`)));
  out.push('', limits.describe());
  console.log(out.join('\n'));
}

function answer(id, text) {
  if (!text) throw new Error('usage: atelier answer <id> "<text>"');
  const dir = runDir(id);
  fs.appendFileSync(path.join(dir, 'QUESTIONS.md'), `\n### ANSWER from owner (${new Date().toLocaleString()})\n${text}\n`);
  const m = cards.load(id).meta;
  events.emit(id, 'answered', text.slice(0, 120));
  if (m.status === 'needs-you') {
    const outOfBudget = /Used all|budget/.test(m.reason || '');
    cards.update(id, {
      status: 'queued', reason: '',
      ...(outOfBudget ? { iterations: Number(m.iterations) + 5, hours: Number(m.hours) + 1 } : {}),
    });
    console.log(`answered and requeued ${id}${outOfBudget ? ' (+5 iterations, +1h)' : ''}`);
    tick();
  } else {
    console.log(`answer recorded; ${id} is ${m.status}, the agent reads it next iteration`);
  }
}

function extend(id) {
  const m = cards.load(id).meta;
  const iterations = Number(m.iterations) + num(flags.iterations, 5);
  const hours = Number(m.hours) + num(flags.hours, 1);
  // --budget N raises the task's spend limit by N dollars (default: one more task-sized allowance if it's at its limit).
  const cap = budget.taskLimit(m), spent = m.project ? budget.taskSpend(m) : 0;
  const newCap = flags.budget !== undefined ? cap + num(flags.budget, 0) : (m.project && spent >= cap ? cap + budget.limits(m.project).task : cap);
  if (m.project && budget.today(m.project).over) throw new Error(`${m.project} has used today's budget; only the owner can raise it (dashboard settings). The task resumes tomorrow on its own.`);
  const requeue = ['needs-you', 'stalled', 'failed'].includes(m.status) || (m.status === 'paused' && /^for the lead:/.test(m.reason || ''));
  cards.update(id, { iterations, hours, ...(m.project ? { budget: newCap } : {}), ...(requeue ? { status: 'queued', reason: '' } : {}) });
  events.emit(id, 'extended', `${iterations} iterations, ${hours}h${m.project ? `, $${newCap} budget` : ''}`);
  console.log(`${id}: now ${iterations} iterations / ${hours}h${m.project ? ` / $${newCap} budget ($${spent.toFixed(2)} spent)` : ''}${requeue ? ', requeued' : ''}`);
  if (requeue) tick();
}

function stop(id) {
  const m = cards.load(id).meta;
  stopRunner(m);
  const by = process.env.ATELIER_ROLE === 'lead' ? 'the lead' : 'owner';
  cards.update(id, { status: 'paused', reason: `stopped by ${by}`, pid: '' });
  events.emit(id, 'paused', `stopped by ${by}`);
  console.log(`stopped ${id}; resume with: atelier resume ${id}`);
}

function requeue(id, verb) {
  const m = cards.load(id).meta;
  if (m.status === 'running' && (runnerPid(id) || alive(m.pid))) return console.log(`${id} is already running`);
  cards.update(id, { status: 'queued', reason: '' });
  events.emit(id, 'queued', verb);
  console.log(`${id} queued`);
  tick();
}

function cancel(id) {
  const m = cards.load(id).meta;
  stopRunner(m);
  const by = process.env.ATELIER_ROLE === 'lead' ? 'the lead' : 'owner';
  cards.update(id, { status: 'failed', reason: `cancelled by ${by}`, pid: '' });
  events.emit(id, 'failed', `cancelled by ${by}`);
  console.log(`cancelled ${id}; its branch ${m.branch || '(none)'} is kept`);
}

// The lead brings a finished (or good-enough) task branch into the base branch itself, instead of
// asking the owner to: latest base merged in, the check (or the project's full suite) re-run, then a
// fast-forward of base. The GitHub sync pushes it within a couple of minutes.
function land(id) {
  const m = cards.load(id).meta;
  if (!m.branch) throw new Error(`${id} has no branch to land`);
  if (runnerPid(id) || alive(m.pid)) throw new Error(`${id} is still running; stop it first (atelier stop ${id}) or let it finish`);
  const p = m.project ? project.tryLoad(m.project) : null;
  if ((p?.autonomy || 'pr') === 'pr') throw new Error(`${m.project} ships through pull requests; finished tasks open their own`);
  // Local-branch projects: only the owner brings work into the base branch (it may be live, as with Atelier's own dashboard).
  if (p?.autonomy === 'branch') throw new Error(`${m.project} keeps finished work on branches for the owner to merge; prepare an integration branch and tell the owner how to try it`);
  const { worktree } = gitx.ensureWorktree(m);
  try { gitx.mergeBases(worktree, m.base || 'main'); } catch { throw new Error(`${m.branch} conflicts with the latest ${m.base || 'main'}; extend the task so its specialist resolves it`); }
  const cmd = p?.suite || m.check;
  const check = runCheck(cmd, worktree, config().checkTimeoutMin);
  if (!check.ok) throw new Error(`the check fails on ${m.branch} merged with the latest base (${cmd}):\n${String(check.tail || '').split('\n').slice(-12).join('\n')}`);
  const base = m.base || 'main';
  const tip = gitx.head(worktree);
  if (!gitx.git(m.repo, 'merge-base', '--is-ancestor', base, tip).ok) throw new Error(`${base} moved while landing; run land again`);
  const onBase = gitx.git(m.repo, 'symbolic-ref', '--short', 'HEAD').out === base;
  if (onBase) gitx.must(m.repo, 'merge', '--ff-only', tip);
  else gitx.must(m.repo, 'update-ref', `refs/heads/${base}`, tip);
  const sha = tip.slice(0, 7);
  cards.update(id, { status: 'done', reason: `landed on ${base} by the lead (${sha})`, pid: '' });
  events.emit(id, 'done', `landed on ${base} by the lead (${sha}); GitHub sync pushes it shortly`);
  console.log(`landed ${id} on ${base} (${sha}); it reaches GitHub within a couple of minutes`);
}

function clean(id) {
  const m = cards.load(id).meta;
  if (!['done', 'failed', 'review'].includes(m.status)) throw new Error(`${id} is ${m.status}; only done/failed/review tasks can be cleaned`);
  if (m.worktree && fs.existsSync(m.worktree)) gitx.must(m.repo, 'worktree', 'remove', m.worktree);
  cards.update(id, { worktree: '' });
  console.log(`removed worktree for ${id}; branch ${m.branch} is kept`);
}

function printEvents() {
  const list = events.read({
    unseen: !!flags.unseen, mark: !!flags.mark, sinceMin: flags.since && Number(flags.since),
    project: typeof flags.project === 'string' ? flags.project : undefined, noProject: !!flags['no-project'],
  });
  const quietTypes = new Set(['iteration', 'paced']);
  const shown = flags.verbose ? list : list.filter(e => !quietTypes.has(e.type));
  if (!shown.length) return console.log('nothing new');
  for (const e of shown) console.log(`${new Date(e.ts).toLocaleTimeString()} ${e.id} ${e.type}${e.msg ? `: ${e.msg}` : ''}`);
}

function cloud(id) {
  const card = cards.load(id);
  const m = card.meta;
  const orders = fs.readFileSync(path.join(PKG, 'prompts', 'standing-orders.md'), 'utf8');
  console.log([
    `/goal \`${m.check}\` exits 0 and the work for "${m.title}" is committed on branch atelier/${m.id} with a draft PR open. Stop after ${m.iterations * 3} turns if not reached.`,
    '',
    card.body,
    '',
    orders,
  ].join('\n'));
}

// Lead and foreman are interactive sessions: without a real terminal (launched in the background,
// or from another tool) claude answers its first prompt and exits. Reopen in a console window.
function needsTerminal(args, title) {
  if (process.stdin.isTTY) return false;
  if (process.platform !== 'win32') throw new Error(`atelier ${args.join(' ')} needs an interactive terminal; run it in a terminal window`);
  if (!args.every(a => /^[\w-]+$/.test(a))) throw new Error('unexpected characters in arguments');
  spawn('cmd.exe', ['/c', `start "${title}" /min cmd /k atelier ${args.join(' ')}`], {
    detached: true, stdio: 'ignore', windowsVerbatimArguments: true,
  }).unref();
  console.log(`opened "${title}" in a new terminal window. Keep it open while you use it from the Claude app.`);
  return true;
}

function foreman() {
  if (needsTerminal(['foreman'], 'Foreman')) return;
  installForeman();
  const args = ['--remote-control', 'Foreman', '--permission-mode', 'auto', 'Start your shift.'];
  const child = spawn('claude', args, { cwd: paths.foreman, stdio: 'inherit' });
  child.on('exit', code => process.exit(code ?? 0));
}

function installForeman() {
  const src = path.join(PKG, 'foreman');
  fs.cpSync(src, paths.foreman, { recursive: true });
}

async function statusline() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input = null;
  try { input = JSON.parse(raw); } catch { /* not JSON */ }
  limits.saveFromStatusline(input);
  const all = cards.all();
  const n = s => all.filter(c => c.meta.status === s).length;
  const parts = [`${n('running')} running`];
  if (n('needs-you')) parts.push(`${n('needs-you')} need you`);
  if (n('review')) parts.push(`${n('review')} to review`);
  if (n('queued')) parts.push(`${n('queued')} queued`);
  const five = input?.rate_limits?.five_hour;
  if (five) parts.push(`5h ${Math.round(five.used_percentage)}%`);
  console.log(`atelier · ${parts.join(' · ')}`);
}

// ---------- v2: projects, gates, roles ----------

function board(alias) {
  const rows = cards.all().filter(c => (flags.all || c.meta.status !== 'done') && (!alias || c.meta.project === alias));
  if (!rows.length) return console.log(alias ? `no open tasks in ${alias}` : 'board is empty');
  const groups = new Map();
  for (const c of rows) {
    const key = `${c.meta.project || repoAlias(c.meta.repo)} · ${c.meta.role || 'builder'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c.meta);
  }
  for (const [key, list] of [...groups].sort()) {
    console.log(`\n${key}`);
    for (const m of list) console.log(`  ${m.id}  ${m.status.padEnd(9)} ${m.title}${m.iteration ? ` ${m.iteration}/${m.iterations}` : ''}${m.reason ? `  — ${m.reason}` : ''}`);
  }
}

function projectCmd() {
  const [sub, alias, ...more] = args;
  switch (sub) {
    case 'init': {
      if (!alias) throw new Error('usage: atelier project init <alias> [--roster team|pair|game] [--trust strict]');
      const repoPath = resolveRepo(alias);
      const p = project.init(alias, { roster: flags.roster || 'team', trust: flags.trust || 'strict' });
      const planDir = path.join(repoPath, 'atelier');
      fs.mkdirSync(path.join(planDir, 'acceptance'), { recursive: true });
      for (const t of ['CHARTER.md', 'BRIEF.md', 'SPEC.md', 'PLAN.md', 'LEDGER.md']) {
        const dest = path.join(planDir, t);
        if (!fs.existsSync(dest)) fs.copyFileSync(path.join(PKG, 'templates', t), dest);
      }
      console.log(`project ${alias}: roster ${p.roster.map(r => r.role).join(', ')} · trust ${p.trust}`);
      console.log(`scaffolded ${planDir} (BRIEF.md, SPEC.md, acceptance/)`);
      console.log(`next: atelier lead ${alias}   (then talk to "${alias} lead" in the Claude app)`);
      return;
    }
    case 'status': return projectStatus(alias || need(1, 'alias'));
    case 'role': {
      const [, action, a, role] = args;
      const p = project.load(a);
      if (action === 'add') {
        const t = project.roleTemplate(role);
        const prev = p.roster.find(r => r.role === role);
        const owns = typeof flags.owns === 'string' ? flags.owns.split(',').map(s => s.trim()).filter(Boolean) : (prev?.owns || t.owns);
        const model = typeof flags.model === 'string' ? flags.model : prev?.model;
        p.roster = p.roster.filter(r => r.role !== role).concat([{ role, owns, ...(model && { model }) }]);
      } else if (action === 'remove') {
        p.roster = p.roster.filter(r => r.role !== role);
      } else throw new Error('usage: atelier project role add|remove <alias> <role> [--owns "glob,glob"]');
      project.save(p);
      return console.log(`${a} roster: ${p.roster.map(r => `${r.role}${r.model ? ` [${r.model}]` : ''} (${r.owns.join(', ') || 'read-only'})`).join('; ')}`);
    }
    case 'autonomy': case 'trust': case 'reporting': {
      // The owner's dials: settable only by the owner (dashboard or their own terminal).
      owner.setDial(alias, sub, more[0]);
      return console.log(`${alias} ${sub} → ${more[0]}`);
    }
    case 'base': {
      owner.assertOwner('set the project base branch');
      const p = project.load(alias);
      p.base = more[0] || '';
      project.save(p);
      return console.log(p.base ? `${alias}: tasks branch from and land on ${p.base}` : `${alias}: tasks use the checkout's branch`);
    }
    case 'setup': {
      // Run once in every new worktree before its first iteration (dependencies, builds).
      const p = project.load(alias);
      p.setup = more.join(' ');
      project.save(p);
      return console.log(p.setup ? `${alias}: new worktrees run \`${p.setup}\` first` : `${alias}: no setup command`);
    }
    case 'data': {
      // Files the code needs that git doesn't hold, copied into each new worktree (never the live folder).
      owner.assertOwner('choose project data copies');
      const p = project.load(alias);
      p.dataCopy = more.join(' ').split(/[\s,]+/).filter(Boolean);
      project.save(p);
      return console.log(p.dataCopy.length ? `${alias}: new worktrees get a copy of ${p.dataCopy.join(', ')}` : `${alias}: worktrees get no data copies`);
    }
    case 'guard': {
      // Project-specific commands: 'live' ones need the owner's OK (speakers, mic, live accounts);
      // 'paid' ones need the lead's approval on the task. Patterns are regular expressions.
      owner.assertOwner('change project guards');
      const [kind, pattern, ...label] = more;
      if (!['live', 'paid'].includes(kind) || !pattern) throw new Error('usage: atelier project guard <alias> live|paid "<regex>" <label>');
      const p = project.load(alias);
      const key = kind === 'live' ? 'liveCommands' : 'paidCommands';
      p[key] = [...(p[key] || []).filter(x => x.pattern !== pattern), { pattern, label: label.join(' ') || pattern }];
      project.save(p);
      return console.log(`${alias} ${kind} commands: ${p[key].map(x => x.label).join(', ')}`);
    }
    case 'env': {
      // The project's keys: imported once by the owner, kept in Atelier's state, given to its runs.
      const [action, from] = more;
      if (action === 'import') {
        owner.assertOwner('import project keys');
        if (!from || !fs.existsSync(from)) throw new Error('usage: atelier project env <alias> import <path to .env> [--drop KEY,KEY] [--keep-live]');
        const r = projenv.importFile(alias, from, { drop: typeof flags.drop === 'string' ? flags.drop.split(',').map(s => s.trim()) : [], keepLive: !!flags['keep-live'] });
        return console.log(`${alias}: ${r.kept.length} keys stored for its runs (values not shown)${r.dropped.length ? `; left out: ${r.dropped.join(', ')}` : ''}`);
      }
      const e = projenv.load(alias);
      return console.log(e ? `${alias}: ${Object.keys(e.env).length} keys from ${e.from} (${e.importedAt.slice(0, 10)}): ${Object.keys(e.env).join(', ')}${e.dropped.length ? `\nleft out: ${e.dropped.join(', ')}` : ''}` : `${alias}: no keys imported`);
    }
    case 'suite': {
      // The project's full test suite: run when a task claims done and again on merge.
      const p = project.load(alias);
      p.suite = more.join(' ');
      project.save(p);
      events.emit(alias, 'suite', p.suite);
      return console.log(`${alias} full suite: ${p.suite}`);
    }
    default: throw new Error('usage: atelier project init|status|role|trust|reporting|autonomy|suite ...');
  }
}

function projectStatus(alias) {
  if (flags.json) return console.log(JSON.stringify(metrics.status(alias), null, 2));
  console.log(metrics.render(metrics.status(alias)));
}

function gate() {
  const [alias, phase, action] = args;
  const actions = ['request', 'approve', 'skip', 'reopen'];
  if (!alias || !phase || !actions.includes(action)) throw new Error("usage: atelier gate <alias> <phase> request --summary '...' (lead) | approve|skip --quote '<your words>' (owner) | reopen --quote '<owner words>'");
  const p = project.load(alias);
  if (action === 'request') {
    // The lead asks; the owner decides (dashboard or their own terminal).
    if (typeof flags.summary !== 'string' || !flags.summary.trim()) throw new Error('--summary is required: what the owner is approving, in a few plain lines');
    // Phases the owner delegated are approved by the lead at once, on the record; the auditor still runs.
    if (!project.dials(p).ownerGates.includes(phase)) {
      const next = owner.approveGateDelegated(alias, phase, flags.summary);
      return console.log(`${alias}: ${phase} approved by you as lead (the owner delegated this phase). Next: ${next}. Carry on.`);
    }
    p.gates[phase] = { status: 'requested', summary: flags.summary, at: new Date().toISOString() };
    project.save(p);
    events.emit(alias, 'gate-request', `${phase}: ${flags.summary.slice(0, 160)}`);
    return console.log(`${alias}: ${phase} gate requested; waiting for the owner's approval in the dashboard`);
  }
  if (typeof flags.quote !== 'string' || !flags.quote.trim()) throw new Error('--quote is required');
  if (action === 'reopen') {
    project.setGate(p, phase, 'reopen', flags.quote);
    events.emit(alias, 'gate', `${phase} reopened: "${flags.quote}"`);
    return console.log(`${alias}: ${phase} reopened`);
  }
  const next = owner.approveGate(alias, phase, flags.quote, { skip: action === 'skip', merge: typeof flags.merge === 'string' ? flags.merge : undefined });
  console.log(`${alias}: ${phase} ${action === 'skip' ? 'skipped' : 'approved'} · next: ${next}`);
}

function approve(id) {
  const m = cards.load(id).meta;
  if (m.status === 'planned') { owner.approveTask(id); console.log(`${id} approved and queued`); return tick(); }
  if (m.status !== 'requested') throw new Error(`${id} is ${m.status}; only planned or requested tasks need approval`);
  if (m.role === 'lead') throw new Error(`${id} is a request for the lead: handle it yourself, then close it with: atelier close ${id} "<what you did>"`);
  const patch = { status: 'queued', reason: '' };
  if (m.project && !m.phase) {
    if (typeof flags.outside === 'string') { if (!(Number(flags.budget) > 0 && Number(flags.budget) <= checklist.OUTSIDE_MAX)) throw new Error(`work outside the checklist is for small fixes only: give it --budget of at most $${checklist.OUTSIDE_MAX}, or put it on the next checklist`); patch.outside = flags.outside; patch.budget = Number(flags.budget); }
    else { const ids = checklist.forIds(flags.for); checklist.checkFor(m.project, ids); patch.for = ids.join(','); }
  }
  if (typeof flags.check === 'string') patch.check = flags.check;
  if (typeof flags.criteria === 'string') patch.criteria = decisions.criteriaIds(flags.criteria).join(',');
  if (typeof flags.paid === 'string') patch.paid = flags.paid;
  if (!m.check && !patch.check) throw new Error(`${id} has no done-check yet; approve it with --check "<cmd>"`);
  cards.update(id, patch);
  events.emit(id, 'approved', `request approved by lead: ${m.title}`);
  console.log(`${id} approved and queued`);
  tick();
}

// Pushes what should be on GitHub (see lib/sync.mjs). The tick runs this every couple of minutes.
// Agents ask before anything appears on the owner's screen; the owner allows or declines in the dashboard.
async function screenCmd() {
  const screen = await import('../lib/screen.mjs');
  const [action, id] = args;
  const alias = process.env.ATELIER_PROJECT || flags.project;
  if (!alias) throw new Error('run this from a task, or pass --project <alias>');
  if (action === 'request') {
    const task = process.env.ATELIER_TASK || flags.task;
    if (!task) throw new Error('only a task agent asks for the screen');
    if (screen.granted(alias, task)) return console.log('You already have the owner\'s OK for now: go ahead, keep it short, and close the window when done.');
    const r = screen.request(alias, task, typeof flags.why === 'string' ? flags.why : '', flags.minutes);
    return console.log(r.already ? 'Already asked; the owner will answer in their inbox. Carry on with other work.' : `Asked the owner (${r.id}). Carry on with other work; once they allow it, launching works for ${r.minutes} min.`);
  }
  if (action === 'allow' || action === 'decline') {
    owner.assertOwner(`screen ${action}`);
    const r = screen.decide(alias, id, action === 'allow', flags.minutes);
    return console.log(`${r.id} ${r.status}`);
  }
  const s = screen.load(alias);
  console.log(JSON.stringify({ pending: s.requests.filter(r => r.status === 'pending'), grants: s.grants.filter(g => Date.parse(g.until) > Date.now()) }, null, 2));
}

// Atelier as a background service: a Windows scheduled task starts the dashboard (which is also the
// scheduler, GitHub sync, screen watcher and lead supervisor) at logon and every 5 minutes if it isn't
// running. Nothing then depends on the Claude app or a terminal staying open.
function serviceCmd(action) {
  if (process.platform !== 'win32') throw new Error('the background service is Windows-only for now; run atelier dashboard under your init system');
  const dir = path.join(HOME, 'service');
  const vbs = path.join(dir, 'run-dashboard.vbs');
  const name = 'Atelier';
  const ps = cmd => spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8', windowsHide: true });
  if (action === 'install') {
    fs.mkdirSync(dir, { recursive: true });
    const q = s => s.replace(/"/g, '""');
    fs.writeFileSync(vbs, [
      "' Starts the Atelier dashboard with no window. Exits at once if it's already running (port in use).",
      'Set sh = CreateObject("WScript.Shell")',
      `sh.Run """${q(process.execPath)}"" ""${q(path.join(PKG, 'bin', 'atelier.mjs'))}"" dashboard --port 4747", 0, False`,
    ].join('\r\n'));
    const r = ps(`$a = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '"${vbs}"';
      $t1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME;
      $t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5);
      $t1.Repetition = $t2.Repetition;
      $s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 1);
      Register-ScheduledTask -TaskName '${name}' -Action $a -Trigger $t1,$t2 -Settings $s -Description 'Keeps the Atelier dashboard (scheduler, GitHub sync, screen watcher, lead supervisor) running.' -Force | Out-Null;
      Start-ScheduledTask -TaskName '${name}'; 'ok'`);
    if (!/ok/.test(r.stdout)) throw new Error(`couldn't register the task: ${r.stderr || r.stdout}`);
    return console.log('Atelier now runs in the background: started now, at every logon, and again within 5 minutes if it ever stops.');
  }
  if (action === 'uninstall') {
    ps(`Unregister-ScheduledTask -TaskName '${name}' -Confirm:$false`);
    return console.log('background service removed (a running dashboard keeps running until you stop it)');
  }
  const r = ps(`$t = Get-ScheduledTask -TaskName '${name}' -ErrorAction SilentlyContinue; if ($t) { $i = Get-ScheduledTaskInfo -TaskName '${name}'; "installed, last run $($i.LastRunTime)" } else { 'not installed' }`);
  console.log(`service: ${r.stdout.trim()}`);
}

// What work actually costs here, by role, from finished runs: the lead sizes briefs and budgets from this.
async function costsCmd(alias) {
  const usage = await import('../lib/usage.mjs');
  const rows = {};
  for (const c of cards.all().filter(c => !alias || c.meta.project === alias)) {
    const role = c.meta.role || 'builder';
    const r = rows[role] ||= { tasks: 0, iters: 0, cost: 0, finished: 0, finishedCost: 0, finishedIters: 0 };
    const runs = usage.runs(c.meta.id).filter(x => x.done && x.file.startsWith('iter'));
    if (!runs.length) continue;
    const cost = runs.reduce((n, x) => n + x.cost, 0);
    r.tasks++; r.iters += runs.length; r.cost += cost;
    if (c.meta.status === 'done') { r.finished++; r.finishedCost += cost; r.finishedIters += runs.length; }
  }
  const f = n => `$${n.toFixed(2)}`;
  console.log('role          per iteration   per finished task   iterations to finish   (from this PC\'s history' + (alias ? `, ${alias}` : '') + ')');
  for (const [role, r] of Object.entries(rows).filter(([, r]) => r.iters)) {
    console.log(`${role.padEnd(14)}${f(r.cost / r.iters).padEnd(16)}${(r.finished ? f(r.finishedCost / r.finished) : 'n/a').padEnd(20)}${r.finished ? (r.finishedIters / r.finished).toFixed(1) : 'n/a'}`);
  }
  if (alias) {
    const d = budget.today(alias), t = budget.total(alias);
    console.log(`\ntoday: $${d.spent} of $${d.limit} (tasks $${d.tasks}, lead $${d.lead}, audits $${d.audits})`);
    console.log(`project total: $${t.spent} (tasks and reviews $${t.tasks}, lead $${t.lead}, audits $${t.audits}). This is the one meter: report from it, never from estimates.`);
  }
  if (alias) {
    const root = path.join(project.dir(alias), 'audits');
    const runs = fs.existsSync(root) ? fs.readdirSync(root).filter(f => /^\d{4}-/.test(f)).length : 0;
    if (runs) console.log(`one audit costs about $${(budget.total(alias).audits / runs).toFixed(2)} here (${runs} run so far): budget it as a fixed line at each milestone's end`);
  }
  console.log(limits.describe());
}

async function syncCmd() {
  const { syncProject } = await import('../lib/sync.mjs');
  const all = cards.all();
  for (const alias of args[0] ? [args[0]] : project.list()) for (const line of syncProject(alias, all)) console.log(line);
}

// ---------- v3 decision layer ----------

async function auditCmd() {
  const [alias, action, id] = args;
  project.load(alias);
  if (!action || action === 'run') {
    if (flags.bg) { spawnDetached(['audit', alias, 'run']); return console.log(`audit of ${alias} started in the background; results go to the dashboard`); }
    const lockFile = path.join(project.dir(alias), 'audit.lock');
    if (auditor.auditRunning(alias)) return console.log('an audit is already running');
    fs.writeFileSync(lockFile, String(process.pid));
    try {
      const r = await auditor.audit(alias, { log: () => {} });
      console.log(`audit of ${r.product}: ${r.findings.length} finding(s) from ${r.candidates} candidates across ${r.checkers} checkers`);
      for (const f of r.findings) console.log(`  ${f.id} [${f.severity}/${f.reversibility}] ${f.claim}`);
    } finally { fs.rmSync(lockFile, { force: true }); }
    return;
  }
  if (action === 'findings') {
    // --lead: what the lead has to fix (the owner confirmed it, or the auditor sent it straight to the lead).
    const pick = f => flags.all || (flags.lead ? ['confirmed', 'sent-to-lead'].includes(f.status) : f.status === 'open');
    const list = auditor.loadFindings(alias).filter(pick);
    if (!list.length) return console.log(flags.lead ? 'nothing from the auditor to fix' : 'no open findings');
    for (const f of list) console.log(`${f.id} ${f.status.padEnd(12)} [${f.severity}/${f.reversibility}] ${f.headline || f.claim}\n    claim: ${f.claim}\n    expected: ${f.expected}\n    observed: ${f.observed}\n    evidence: ${f.evidence}${f.ownerNote ? `\n    owner's note: ${f.ownerNote}` : ''}`);
    const h = auditor.hitRate(alias);
    return console.log(`hit rate: ${h.confirmed}/${h.judged} confirmed`);
  }
  if (action === 'confirm' || action === 'dismiss') {
    owner.assertOwner(`audit ${action}`);
    const f = auditor.judge(alias, id, action, typeof flags.note === 'string' ? flags.note : '');
    return console.log(`${f.id} ${f.status}`);
  }
  if (action === 'fixed') {
    const f = auditor.judge(alias, id, 'fixed', typeof flags.note === 'string' ? flags.note : '');
    return console.log(`${f.id} marked fixed; the next audit checks it`);
  }
  throw new Error('usage: atelier audit <alias> [run] [--bg] | findings [--all|--lead] | confirm|dismiss <F-n> (owner) | fixed <F-n> [--note]');
}

function msgCmd() {
  const text = args.join(' ');
  const fromId = process.env.ATELIER_TASK || '';
  const from = fromId ? cards.load(fromId).meta : null;
  const alias = from?.project || (typeof flags.project === 'string' ? flags.project : '');
  if (!alias || typeof flags.to !== 'string') throw new Error('usage: atelier msg --to <task-id|role> --type question|discovery|contract-change "<short message>"');
  const type = typeof flags.type === 'string' ? flags.type : 'question';
  const m = messages.send(alias, { from: fromId, fromRole: from?.role || '', to: flags.to, type, text, iter: process.env.ATELIER_ITER || '' });
  // A contract change is a decision, so it also becomes a request card on the lead's desk.
  if (type === 'contract-change') {
    flags.kind = 'contract-change';
    flags.to = 'lead';
    args.splice(0, args.length, `[${m.id}] ${text}`);
    request();
  }
  console.log(`sent ${m.id} to ${flags.to === 'lead' && type === 'contract-change' ? 'the lead (contract-change request)' : m.to}. It's information for them, not an instruction; keep working.`);
}

function messagesCmd() {
  const [alias] = args;
  const list = messages.all(alias).slice(-(Number(flags.last) || 30));
  if (!list.length) return console.log('no messages yet');
  for (const m of list) console.log(`${m.id} ${m.at.slice(5, 16).replace('T', ' ')} [${m.type}] ${m.fromRole || m.from} → ${m.to}: ${m.text}`);
}

// The lead's line to the owner: it lands in the dashboard's Inbox, and the owner's answer comes back on the watch.
function askCmd() {
  const [alias, kind, ...words] = args;
  if (!alias || !kind) throw new Error('usage: atelier ask <alias> approval|question|feedback|update "<title>" [--body "..." | --body-file f] --do "<what you need from the owner>" [--options "A | B"] [--recommend "A"] [--attach "a.png=What it shows | b.png=..."] [--task <id>] [--link url]\n       atelier ask <alias> approval "<title>" --run "<command>" [--cwd dir] [--shell powershell|cmd|bash]   (runs on the owner\'s PC when they approve)\n       atelier ask <alias> reply <A-n> "<text>" [--reopen] | withdraw <A-n>');
  project.load(alias);
  if (kind === 'reply') { const a = asks.reply(alias, need(2, 'A-n'), args.slice(3).join(' ') || flags.text, { reopen: !!flags.reopen }); return console.log(`replied on ${a.id}${a.status === 'open' ? ' and reopened it for the owner' : ''}`); }
  if (kind === 'withdraw') return console.log(`withdrew ${asks.withdraw(alias, need(2, 'A-n')).id}`);
  const str = k => typeof flags[k] === 'string' ? flags[k] : '';
  const body = str('body-file') ? fs.readFileSync(str('body-file'), 'utf8') : str('body');
  const a = asks.ask(alias, { kind, title: words.join(' ') || str('title'), body, todo: str('do'), options: str('options').split(/\s*\|\s*/), recommend: str('recommend'),
    attach: asks.attachList(str('attach')), task: str('task'), links: str('link').split(',').map(s => s.trim()),
    run: str('run') ? { command: str('run'), cwd: str('cwd'), shell: str('shell') } : null });
  console.log(`sent ${a.id} to the owner's Inbox${a.files.length ? ` with ${a.files.length} attachment(s)` : ''}. ${a.run ? `When they approve, the dashboard runs it on their PC (${a.run.shell}, in ${a.run.cwd || 'their home folder'}) and the result arrives on your watch as ask-answered.` : kind === 'update' ? 'Nothing waits on it.' : 'Their answer arrives on your watch as ask-answered; keep working on what doesn\'t depend on it.'}`);
}

function checklistCmd() {
  const [alias, verb, ...words] = args;
  if (!alias) throw new Error('usage: atelier checklist <alias>   (what is on the current round)\n       atelier checklist <alias> propose "<goal>" --items "a | b | c" --by YYYY-MM-DD --finish YYYY-MM-DD --cost <dollars> [--why "..."]\n       atelier checklist <alias> ready <C-n> --how "<how the owner tries it>" [--attach "a.png=What it shows | ..."] [--task <id>] [--link url]\n       atelier checklist <alias> add "<line>" --owner "<their words>"\n       atelier checklist <alias> withdraw');
  project.load(alias);
  const str = k => typeof flags[k] === 'string' ? flags[k] : '';
  if (verb === 'propose') {
    const r = checklist.propose(alias, { goal: words.join(' ') || str('goal'), items: str('items').split('|'), by: str('by'), finish: str('finish'), cost: flags.cost, why: str('why') });
    return console.log(`round ${r.n} sent to the owner's Inbox: ${r.items.map(i => i.id).join(', ')}. Nothing on it can start until they approve; their answer arrives on your watch.`);
  }
  if (verb === 'ready') {
    const { item, left } = checklist.ready(alias, need(2, 'C-n'), { how: str('how'), attach: asks.attachList(str('attach')), task: str('task'), links: str('link').split(',').map(s => s.trim()) });
    return console.log(left ? `${item.id} is ready. ${left} line(s) still to build before the owner reviews.` : 'every line is ready: the round is in the owner\'s Inbox to review.');
  }
  if (verb === 'add') { const it = checklist.addLine(alias, words.join(' '), str('owner')); return console.log(`added ${it.id}`); }
  if (verb === 'withdraw') return console.log(`withdrew round ${checklist.withdraw(alias).n}`);
  if (verb) throw new Error('propose, ready, add or withdraw');
  const list = checklist.rounds(alias);
  const r = checklist.current(alias) || list.at(-1);
  if (!r) return console.log(`no checklist yet. Propose the first: atelier checklist ${alias} propose ...`);
  console.log(`round ${r.n} (${r.status}): ${r.goal}\ntarget ${r.by} · about $${r.cost} · whole project by ${r.finish}`);
  const mine = cards.all().map(c => c.meta).filter(m => m.project === alias);
  for (const i of r.items) {
    const t = mine.filter(m => String(m.for || '').split(',').includes(i.id));
    console.log(`  ${i.id} ${i.status.padEnd(9)} ${i.text}${t.length ? `  [tasks: ${t.map(m => `${m.id} ${m.status}`).join(', ')}]` : ''}${i.feedback ? `\n       owner: ${i.feedback}` : ''}`);
  }
}

function asksCmd() {
  const [alias] = args;
  project.load(alias);
  const list = asks.all(alias).filter(a => flags.all || ['open', 'unread', 'for-lead'].includes(a.status) || Date.now() - Date.parse(a.answer?.at || a.at) < 3 * 24 * 3600_000);
  if (!list.length) return console.log('nothing between you and the owner in the last 3 days');
  for (const a of list.slice(-30)) {
    console.log(`${a.id} ${a.at.slice(5, 16).replace('T', ' ')} [${a.kind}] ${a.status.toUpperCase()} · ${a.title}`);
    if (a.from === 'owner' && a.body !== a.title) console.log(`   owner: ${a.body}`);
    if (a.run) console.log(`   command (${a.run.shell}, ${a.run.state}): ${a.run.command}`);
    for (const t of a.thread) console.log(`   ${t.from}${t.verdict && t.verdict !== 'answer' ? ` (${t.verdict})` : ''}: ${t.text || '—'}`);
    if (a.run?.output || a.run?.error) console.log(`   output:\n${[a.run.error, ...(a.run.output || '').trim().split('\n').slice(-40)].filter(Boolean).map(l => `     ${l}`).join('\n')}`);
  }
}

async function dashboardCmd() {
  const { serve } = await import('../lib/dashboard.mjs');
  serve({ port: Number(flags.port) || 4747, lan: !!flags.lan, tailscale: !flags['no-tailscale'] });
}

// Starts the dashboard in the background if it isn't running, then opens it in the browser.
async function openCmd() {
  const port = Number(flags.port) || 4747;
  const up = await fetch(`http://127.0.0.1:${port}/`).then(() => true, () => false);
  if (!up) {
    const args = ['dashboard', '--port', String(port), ...(flags.lan ? ['--lan'] : []), ...(flags['no-tailscale'] ? ['--no-tailscale'] : [])];
    const out = fs.openSync(path.join(HOME, 'dashboard.log'), 'a');
    spawn(process.execPath, [path.join(PKG, 'bin', 'atelier.mjs'), ...args], { detached: true, stdio: ['ignore', out, out], windowsHide: true }).unref();
    for (let i = 0; i < 30 && !(await fetch(`http://127.0.0.1:${port}/`).then(() => true, () => false)); i++) await new Promise(r => setTimeout(r, 200));
  }
  const { token, tailscaleAddress } = await import('../lib/dashboard.mjs');
  console.log(`Atelier dashboard: http://localhost:${port}\naccess token (enter once per device): ${token()}`);
  const ts = !flags.lan && !flags['no-tailscale'] && tailscaleAddress();
  if (ts) console.log(`on your phone, anywhere (Tailscale on): http://${ts}:${port}`);
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', `http://localhost:${port}`], { detached: true, stdio: 'ignore' }).unref();
}

// Streams one line per event the lead should act on now: the owner's decisions in the dashboard and
// tasks that changed state. The lead runs it under its Monitor tool, so each line wakes it immediately
// instead of at the next heartbeat.
async function watchCmd() {
  const [alias] = args;
  project.load(alias);
  const OWNER = new Set(['gate', 'charter', 'criterion-approve', 'criterion-accept', 'criterion-reject', 'criterion-retire', 'approved', 'answered', 'finding-confirmed', 'finding-dismissed', 'ruling', 'trust', 'reporting', 'autonomy', 'demoted', 'ask-answered', 'owner-note', 'checklist-approved', 'checklist-declined', 'checklist-judged']);
  const TEAM = new Set(['done', 'review', 'needs-you', 'stalled', 'failed', 'requested', 'audit', 'finding-to-lead', 'push-failed', 'needs-lead', 'budget-day', 'budget-warn', 'paced']);
  const mine = id => id === alias || cards.all().some(c => c.meta.id === id && c.meta.project === alias);
  let offset = fs.existsSync(paths.events) ? fs.statSync(paths.events).size : 0;
  console.log(`watching ${alias}: owner decisions and task changes will appear here`);
  // One watch per project, and the newest wins. A re-arm ends only the shell around the old copy, so that copy
  // can't tell it's orphaned and nobody reads its output: it must not be able to keep the new one out.
  const lock = path.join(project.dir(alias), 'watch.lock');
  fs.writeFileSync(lock, String(process.pid));
  const lockHolder = () => { try { return Number(fs.readFileSync(lock, 'utf8').trim()) || 0; } catch { return 0; } };
  process.on('exit', () => { if (lockHolder() === process.pid) fs.rmSync(lock, { force: true }); });
  process.stdout.on('error', () => process.exit(0));
  endOlderWatches(alias);
  const leadPidFile = path.join(project.dir(alias), 'lead.pid');
  const myLead = fs.existsSync(leadPidFile) ? fs.readFileSync(leadPidFile, 'utf8').trim() : '';
  for (let n = 0; ; n++) {
    await new Promise(r => setTimeout(r, 2000));
    if (![0, process.pid].includes(lockHolder())) process.exit(0);
    if (myLead && n % 15 === 0) {
      const now = fs.existsSync(leadPidFile) ? fs.readFileSync(leadPidFile, 'utf8').trim() : '';
      if (now !== myLead || !alive(Number(myLead))) { console.log('the lead session this watch belongs to has ended; stopping'); process.exit(0); }
    }
    if (!fs.existsSync(paths.events)) continue;
    const size = fs.statSync(paths.events).size;
    if (size <= offset) { offset = Math.min(offset, size); continue; }
    const fd = fs.openSync(paths.events, 'r');
    const buf = Buffer.alloc(size - offset);
    fs.readSync(fd, buf, 0, buf.length, offset);
    fs.closeSync(fd);
    offset = size;
    for (const line of buf.toString('utf8').split('\n').filter(Boolean)) {
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (!mine(e.id)) continue;
      // Approvals of task plans come from the owner; approvals of request cards come from the lead itself.
      if (e.type === 'approved' && !/by owner/.test(e.msg)) continue;
      if (OWNER.has(e.type)) console.log(`OWNER DECIDED · ${e.type} · ${e.id} · ${e.msg}`);
      else if (TEAM.has(e.type)) console.log(`TEAM · ${e.type} · ${e.id} · ${e.msg}`);
    }
  }
}

// Copies from before the lock never look at it, so they're ended from here. Only older ones: two copies starting
// together can't end each other. The match is on node's whole command line, so a shell or prompt that merely
// mentions the watch is left alone.
function endOlderWatches(alias) {
  if (process.platform !== 'win32') return;
  const script = `$a = [regex]::Escape($env:ATELIER_WATCH_ALIAS); $cut = [datetime]$env:ATELIER_WATCH_STARTED;
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
      Where-Object { $_.ProcessId -ne ${process.pid} -and $_.CreationDate -lt $cut -and $_.CommandLine -match ('^"?[^"]*node(\\.exe)?"?\\s+"?[^"]*atelier\\.mjs"?\\s+watch\\s+' + $a + '\\s*$') } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  const env = { ...process.env, ATELIER_WATCH_ALIAS: alias, ATELIER_WATCH_STARTED: new Date(Date.now() - process.uptime() * 1000).toISOString() };
  spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { env, stdio: 'ignore', windowsHide: true }).on('error', () => {});
}

function charterCmd() {
  const [alias, action] = args;
  if (action === 'approve') {
    if (typeof flags.quote !== 'string') throw new Error('usage: atelier charter <alias> approve --quote "<your words>"');
    return console.log(`charter approved (${owner.approveCharter(alias, flags.quote)})`);
  }
  if (action === 'status') {
    const p = project.load(alias);
    const tampered = decisions.charterTampered(alias, resolveRepo(alias));
    return console.log(p.charter ? `approved ${p.charter.approvedAt.slice(0, 10)} (${p.charter.hash})${tampered ? ' — CHANGED SINCE APPROVAL' : ''}` : 'not approved yet');
  }
  throw new Error('usage: atelier charter <alias> approve|status');
}

function criteriaCmd() {
  const [alias, action, id] = args;
  project.load(alias);
  if (action === 'list' || !action) {
    const data = decisions.loadCriteria(alias);
    if (flags.json) return console.log(JSON.stringify(data, null, 2));
    if (!data.criteria.length) return console.log('no criteria yet');
    for (const lvl of decisions.LEVELS) {
      const list = data.criteria.filter(c => decisions.levelOf(c) === lvl);
      if (!list.length) continue;
      console.log(lvl === 'owner' ? "Owner outcomes (the owner's to approve):" : 'Team checks (the lead approves these):');
      for (const c of list) console.log(`  ${c.id.padEnd(6)} ${c.status.padEnd(14)} ${c.kind.padEnd(8)} ${c.statement}  [serves ${c.serves}]`);
    }
    return;
  }
  if (action === 'add') {
    const c = decisions.addCriterion(alias, { statement: args.slice(2).join(' ') || flags.statement, kind: flags.kind || 'test', verify: typeof flags.verify === 'string' ? flags.verify : '', serves: typeof flags.serves === 'string' ? flags.serves : '', level: typeof flags.level === 'string' ? flags.level : undefined });
    events.emit(alias, c.level === 'team' ? 'criterion-team' : 'criterion-draft', `${c.id}: ${c.statement}`);
    return console.log(c.level === 'team' ? `added team check ${c.id} (approved by you as lead; no owner approval needed)` : `added owner outcome ${c.id} (draft; the owner approves it in the dashboard)`);
  }
  if (action === 'request') {
    events.emit(alias, 'criteria-request', `please review drafts: ${decisions.loadCriteria(alias).criteria.filter(c => c.status === 'draft').map(c => c.id).join(', ')}`);
    return console.log('asked the owner to review draft criteria');
  }
  // Team checks are the lead's own: it may retire one (say, superseded by a newer check) without the owner.
  if (action === 'retire' && decisions.levelOf(decisions.findCriterion(decisions.loadCriteria(alias), id)) === 'team') {
    decisions.setStatus(alias, id, 'retired', 'lead', typeof flags.note === 'string' ? flags.note : '');
    events.emit(alias, 'criterion-retire', `${id} (team check, retired by the lead)`);
    return console.log(`${id} retired`);
  }
  if (['approve', 'retire', 'accept', 'reject'].includes(action)) {
    owner.criterion(alias, id, action, typeof flags.note === 'string' ? flags.note : '');
    return console.log(`${id} ${action}d`);
  }
  throw new Error('usage: atelier criteria <alias> list | add "<statement>" --kind test|property|review|owner [--level team|owner] --verify "<cmd>" --serves "<charter/R#/ruling>" | request | approve|retire|accept|reject <AC-n> (owner)');
}

function rulingCmd() {
  const [alias, action] = args;
  if (action !== 'add') throw new Error("usage: atelier ruling <alias> add '<the owner ruling>' [--source '<what prompted it>']");
  const text = args.slice(2).join(' ');
  if (!text) throw new Error('missing ruling text');
  const id = decisions.addRuling(resolveRepo(alias), text, typeof flags.source === 'string' ? flags.source : '');
  events.emit(alias, 'ruling', `${id}: ${text}`);
  console.log(`recorded ${id} in atelier/RULINGS.md. Commit it, and add a criterion if it can be checked mechanically.`);
}

function holdoutCmd() {
  const [alias, action, from] = args;
  if (action !== 'set' || !from || typeof flags.command !== 'string') throw new Error('usage: atelier holdout <alias> set <folder-with-tests> --command "<cmd; tests appear under .atelier-holdout/>"');
  owner.setHoldout(alias, path.resolve(from), flags.command);
  console.log(`holdout tests stored outside the repo; specialists won't see them. Runs as: ${flags.command}`);
}

function request() {
  const to = flags.to;
  const text = args.join(' ') || flags.text;
  if (typeof to !== 'string' || !text) throw new Error('usage: atelier request --to <role> "<what you need, why, and what done looks like>"');
  const fromId = typeof flags.from === 'string' ? flags.from : process.env.ATELIER_TASK;
  const from = fromId ? cards.load(fromId).meta : null;
  const alias = from?.project || (typeof flags.project === 'string' ? flags.project : '');
  if (!alias) throw new Error('can\'t tell which project this is for; pass --from <task> or --project <alias>');
  const p = project.load(alias);
  if (to !== 'lead' && !p.roster.some(r => r.role === to)) throw new Error(`${to} isn't on ${alias}'s roster (${p.roster.map(r => r.role).join(', ')}, or lead)`);
  const repoPath = resolveRepo(alias);
  const d = config().defaults;
  const id = cards.newId();
  cards.save({
    meta: {
      id, title: `Request: ${text.slice(0, 70)}${text.length > 70 ? '…' : ''}`, status: 'requested',
      project: alias, role: to, requested_by: fromId || '', kind: typeof flags.kind === 'string' ? flags.kind : '', repo: repoPath,
      base: from?.base || p.base || gitx.git(repoPath, 'symbolic-ref', '--short', 'HEAD').out || d.base,
      where: 'local', autonomy: d.autonomy, check: '', iterations: 6, hours: 2, priority: 2, iteration: 0,
      created: new Date().toISOString(),
    },
    body: `## Goal\n\n${text}\n\nRequested by ${fromId ? `task ${fromId} (${from.role || 'builder'}: ${from.title})` : 'the owner'}.\n`,
  });
  events.emit(id, 'requested', `${flags.kind ? `[${flags.kind}] ` : ''}${from?.role || 'owner'} → ${to}: ${text.slice(0, 100)}`);
  console.log(`filed request ${id} for ${to}. Keep working on anything that doesn't depend on it.`);
}

function close() {
  const id = need(0, 'id');
  const note = args.slice(1).join(' ');
  cards.update(id, { status: 'done', reason: note || 'closed by lead' });
  events.emit(id, 'done', note || 'closed by lead');
  console.log(`${id} closed`);
  tick();
}

function overrule(alias, text) {
  if (!text) throw new Error('usage: atelier overrule <alias> "<what you proposed> → <what the owner wanted>"');
  const p = project.load(alias);
  p.overrules.push({ at: new Date().toISOString(), text });
  project.save(p);
  events.emit(alias, 'overrule', text);
  console.log(`logged overrule #${p.overrules.length} for ${alias}`);
}

function verify(kind) {
  const root = typeof flags.dir === 'string' ? flags.dir : process.cwd();
  const problems = [];
  if (kind === 'design') {
    const doc = path.join(root, 'atelier', 'DESIGN.md');
    if (!fs.existsSync(doc)) problems.push('atelier/DESIGN.md is missing');
    else {
      const text = fs.readFileSync(doc, 'utf8');
      for (const s of ['Flows', 'Visual system', 'Screens', 'States', 'Responsive', 'Accessibility', 'Copy']) {
        if (!new RegExp(`^##\\s+${s}\\b`, 'im').test(text)) problems.push(`atelier/DESIGN.md has no "## ${s}" section`);
      }
    }
    const screens = listFiles(path.join(root, 'atelier', 'design')).filter(f => f.endsWith('.html'));
    if (!screens.length) problems.push('atelier/design/ has no HTML screens or wireframes');
  } else if (kind === 'contracts') {
    if (!fs.existsSync(path.join(root, 'atelier', 'contracts', 'README.md'))) problems.push('atelier/contracts/README.md (the index) is missing');
    if (listFiles(path.join(root, 'atelier', 'contracts')).length < 2) problems.push('atelier/contracts/ needs at least one contract file besides README.md');
  } else throw new Error('usage: atelier verify design|contracts');
  if (problems.length) { console.log(problems.map(p => `✗ ${p}`).join('\n')); process.exit(1); }
  console.log(`✓ ${kind} looks complete`);
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter(e => e.isFile()).map(e => path.join(e.parentPath ?? e.path, e.name));
}

function lead(alias) {
  project.load(alias);
  if (needsTerminal(['lead', alias], `${alias} lead`)) return;
  const repoPath = resolveRepo(alias);
  const promptFile = path.join(project.PROJECTS, `${alias}.lead.md`);
  // Rewritten at every (re)launch, so a restart always picks up the latest lead instructions.
  const writePrompt = () => {
    const tpl = fs.readFileSync(path.join(PKG, 'roles', 'lead.md'), 'utf8').replace(/^---[\s\S]*?---\r?\n/, '');
    fs.writeFileSync(promptFile, tpl.replaceAll('{{alias}}', alias));
  };
  // The lead may read anything, edit planning docs and housekeeping files, run atelier and read-only git,
  // and commit. Landing task branches and pushing go through atelier (land, the GitHub sync), not raw git.
  // dontAsk mode denies everything not on this list, so it can't write code even through the shell.
  const shells = ['Bash', 'PowerShell'];
  const allowShell = ['atelier *', 'git status*', 'git log*', 'git diff*', 'git show*', 'git add atelier*', 'git add .gitignore*', 'git add .gitattributes*', 'git add *.gitignore', 'git add .editorconfig', 'git commit *', 'git pull --ff-only*', 'git fetch*',
    'git branch*', 'git rev-parse*', 'git ls-files*', 'git blame*', 'git worktree list*',
    'ls*', 'dir*', 'cat *', 'head *', 'tail *', 'wc *', 'type *', 'rg *', 'grep *', 'where *', 'which *', 'Get-ChildItem*', 'Get-Content*', 'Select-String*', 'Test-Path*', 'Get-Item *',
    'node --version', 'npm ls*', 'cargo --version', 'flutter --version', 'tasklist*', 'Get-Process*'];
  const settings = {
    hooks: {
      ...guard.hookSettings().hooks,
      // Fresh start or compaction: reload the decision layer and ledger, so files stay the source of truth.
      SessionStart: [{ matcher: 'startup|compact|resume|clear', hooks: [{ type: 'command', command: `atelier lead-context ${alias}` }] }],
      // Before the lead goes idle: record its spend, and send it back only for concrete, affordable work.
      Stop: [{ hooks: [{ type: 'command', command: `atelier lead-stop ${alias}` }] }],
    },
    statusLine: { type: 'command', command: 'atelier statusline' },
    permissions: {
      allow: [
        'Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite', 'Skill', 'ToolSearch',
        'CronCreate', 'CronList', 'CronDelete', 'PushNotification', 'Monitor', 'TaskStop',
        'Edit(atelier/**)', ...project.HOUSEKEEPING.map(g => `Edit(${g})`),
        ...shells.flatMap(s => allowShell.map(c => `${s}(${c})`)),
      ],
    },
  };
  fs.writeFileSync(path.join(project.dir(alias), 'lead.wanted'), new Date().toISOString());
  const stopFlag = path.join(project.dir(alias), 'lead.stop');
  const restartFlag = path.join(project.dir(alias), 'lead.restart');
  fs.rmSync(stopFlag, { force: true });
  const launch = first => {
    fs.rmSync(restartFlag, { force: true });
    writePrompt();
    const claudeArgs = ['--remote-control', `${alias} lead`, '--permission-mode', 'dontAsk',
      '--append-system-prompt-file', promptFile, '--settings', JSON.stringify(settings),
      first ? 'Start your shift.' : 'Fresh restart: start your shift. Read atelier/PLAN.md and atelier/LEDGER.md first; nothing from before the restart is in your memory.'];
    const child = spawn('claude', claudeArgs, { cwd: repoPath, stdio: 'inherit', env: atelierEnv({ role: 'lead', project: alias }, '', repoPath) });
    fs.writeFileSync(path.join(project.dir(alias), 'lead.pid'), String(child.pid));
    events.emit(alias, 'lead', first ? 'lead started' : 'lead restarted fresh');
    child.on('exit', code => {
      // The dashboard's "restart lead" ends the session with a restart flag; anything else ends the loop.
      if (fs.existsSync(restartFlag) && !fs.existsSync(stopFlag)) return launch(false);
      process.exit(code ?? 0);
    });
  };
  launch(true);
}

// SessionStart hook for the lead: hands it the decision layer and ledger as fresh context.
function leadContext(alias) {
  const repo = resolveRepo(alias);
  const p = project.load(alias);
  const crit = decisions.loadCriteria(alias).criteria;
  const parts = [
    `You are the lead for ${alias}. Your memory may have just been reset. The files are the source of truth; re-read them before acting.`,
    `Phase: ${project.nextPhase(p)} · trust ${p.trust} · reporting ${project.dials(p).reporting} · autonomy ${p.autonomy || 'pr'}`,
    (d => `Spend today: $${d.spent} of the $${d.limit} daily budget (tasks $${d.tasks}, you $${d.lead}); default task budget $${budget.limits(alias).task}. Plan usage: ${limits.describe()}. Run \`atelier costs ${alias}\` before sizing tasks.`)(budget.today(alias)),
    `The owner approves these phases personally: ${project.dials(p).ownerGates.join(', ') || 'none'}; the others you approve via \`atelier gate ... request\`. Write everything the owner reads in a ${project.dials(p).summaryStyle} style.`,
    'Start the live watch now if it is not running: use the Monitor tool on `atelier watch ' + alias + '` so owner decisions wake you immediately.',
    p.github?.problem ? `WARNING: work is not reaching GitHub: ${p.github.problem}. Fix what you can (for example merge origin into the base branch); tell the owner if it needs their GitHub sign-in.` : '',
    decisions.charterTampered(alias, repo) ? 'WARNING: atelier/CHARTER.md changed since the owner approved it. Tell the owner immediately.' : '',
    p.charter ? 'The charter is approved: atelier/CHARTER.md.' : 'The charter is not approved yet: drafting it with the owner comes first.',
    (n => n ? `The auditor has ${n} item(s) for you to fix: \`atelier audit ${alias} findings --lead\`. Fix or delegate them, then \`atelier audit ${alias} fixed F-n --note "what changed"\`.` : '')(auditor.loadFindings(alias).filter(f => ['confirmed', 'sent-to-lead'].includes(f.status)).length),
    (o => o.length ? `In the owner's Inbox from you, unanswered: ${o.map(x => `${x.id} ${x.title}`).join('; ')}. Their answers arrive on your watch as ask-answered.` : '')(asks.forOwner(alias).filter(x => x.status === 'open')),
    (n => n.length ? `The owner wrote to you and is waiting for a reply: ${n.map(x => `${x.id} "${x.body.slice(0, 200)}"`).join('; ')}. Reply with atelier ask ${alias} reply <A-n> "...".` : '')(asks.forLead(alias)),
    (r => r ? `Current checklist: round ${r.n} (${r.status}), target ${r.by}: ${r.goal}. Lines: ${r.items.map(i => `${i.id} ${i.status}`).join(', ')} (atelier checklist ${alias}). Build only these; no new checklist until the owner has reviewed this one.` : `No checklist is open, so no new work can start. Propose the next small round now: atelier checklist ${alias} propose (see Small rounds in your instructions).`)(checklist.current(alias)),
    `Criteria: ${crit.length ? crit.map(c => `${c.id} ${c.status}`).join(', ') : 'none yet'} (atelier criteria ${alias} list)`,
    'Read now: atelier/CHARTER.md, atelier/RULINGS.md, atelier/PLAN.md, atelier/LEDGER.md. Then run `atelier digest` and `atelier board ' + alias + '`.',
  ].filter(Boolean);
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n') } }));
}

// Stop hook for the lead. It may go idle when nothing is waiting on it; its live watch wakes it for
// anything new. It's sent back only for concrete items, only within today's budget, and never more than
// twice for the same list (or six times an hour), so it can't loop or burn tokens spinning.
async function leadStopHook(alias) {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input = {};
  try { input = JSON.parse(raw); } catch { /* still decide */ }
  if (input.session_id) budget.recordLead(alias, input.session_id, input.transcript_path);
  const day = budget.today(alias);
  if (day.over || limits.waitUntil()) return;
  const asked = !input.stop_hook_active && chatAsk(alias, input);
  if (asked) return console.log(JSON.stringify({ decision: 'block', reason: `You asked the owner something in the chat ("${asked}"). The owner decides in the dashboard, not the chat: send it with atelier ask ${alias} approval|question|feedback "<title>" --body "..." (attach screenshots or recordings with --attach or --task), then say in one line that it's in their Inbox. If the owner has to run something on their PC (copy files, write a ticket, start a paid run), don't ask them to paste it: add --run "<command>" to the approval and the dashboard runs it when they approve, with the result coming back to you. If it was only a rhetorical line and nothing waits on the owner, just stop.` }));
  const p = project.load(alias);
  const mine = cards.all().map(c => c.meta).filter(m => m.project === alias);
  // [key, line]: each waiting item is raised once, and again only if it still waits 12 hours later, so the lead
  // isn't made to re-explain the same items (and spend on it) every time it goes idle.
  const items = [
    ...mine.filter(m => m.status === 'requested').map(m => [`req:${m.id}`, `request ${m.id} (${m.title}) is waiting for your ruling`]),
    ...mine.filter(m => m.status === 'paused' && /^for the lead:/.test(m.reason || '')).map(m => [`paused:${m.id}`, `task ${m.id} ${m.reason.replace(/^for the lead: /, '').split(';')[0]}: extend, land or cancel it`]),
    ...mine.filter(m => m.status === 'stalled').map(m => [`stalled:${m.id}`, `task ${m.id} stalled: resume or replan it`]),
    ...mine.filter(m => m.status === 'review').map(m => [`review:${m.id}`, `task ${m.id} is ready for review: ${(m.reason || '').slice(0, 80)}`]),
  ];
  const fixes = auditor.loadFindings(alias).filter(f => ['confirmed', 'sent-to-lead'].includes(f.status));
  if (fixes.length) items.push([`fix:${fixes.map(f => f.id).join(',')}`, `${fixes.length} auditor item(s) to fix or delegate (atelier audit ${alias} findings --lead)`]);
  if (p.github?.problem) items.push([`gh:${p.github.problem}`, `work isn't reaching GitHub: ${p.github.problem}`]);
  const round = checklist.current(alias);
  if (!round && p.gates?.spec?.status === 'approved') items.push([`no-round:${checklist.rounds(alias).length}`, `no checklist is open, so the project isn't moving: propose the next small round (atelier checklist ${alias} propose ...)`]);
  for (const i of round?.status === 'active' ? round.items.filter(i => i.status === 'sent-back') : []) items.push([`back:${i.id}:${i.judgedAt}`, `the owner sent back ${i.id} ("${i.text}"): ${i.feedback}`]);
  for (const n of asks.forLead(alias)) items.push([`note:${n.id}:${n.thread.length}`, `the owner wrote to you (${n.id}): "${n.body.slice(0, 160)}". Act on it, then answer with atelier ask ${alias} reply ${n.id} "..."`]);
  if (!items.length) return;
  const stateFile = path.join(project.dir(alias), 'lead-continue.json');
  let st = {}; try { st = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { /* first time */ }
  const told = st.told || {}, now = Date.now();
  const fresh = items.filter(([k]) => !(now - (told[k] || 0) < 12 * 3600_000));
  if (!fresh.length) return;
  for (const [k] of fresh) told[k] = now;
  for (const k of Object.keys(told)) if (now - told[k] > 24 * 3600_000) delete told[k];
  fs.writeFileSync(stateFile, JSON.stringify({ told }));
  console.log(JSON.stringify({ decision: 'block', reason: `Before going idle, these are waiting on you (today's spend $${day.spent} of $${day.limit}):\n- ${fresh.map(([, t]) => t).join('\n- ')}\nHandle each, or note in LEDGER.md why it waits, then stop. You won't be asked about these again for 12 hours; your watch wakes you for anything new.` }));
}

// The lead's last chat message, when it asks the owner to approve or choose something and no Inbox message
// (atelier ask, gate or criteria request) went out this turn. Returns the asking sentence, or ''.
function chatAsk(alias, input) {
  const ASKING = /\b(approve|approval|sign[- ]?off|go[- ]ahead|should I|shall I|want me to|do you want|would you like|which (one|option|do you|would you)|your call|ok to|okay to|let me know|prefer)\b/i;
  let lines = [];
  try { lines = fs.readFileSync(input.transcript_path, 'utf8').trim().split('\n').slice(-400).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { /* no transcript */ }
  // This turn starts at the owner's (or a hook's) last real message, not at a tool result.
  const isPrompt = e => e.type === 'user' && (typeof e.message?.content === 'string' || e.message?.content?.some?.(c => c.type === 'text'));
  let start = lines.length - 1;
  while (start > 0 && !isPrompt(lines[start])) start--;
  const turn = lines.slice(start);
  const said = input.last_assistant_message || [...turn].reverse().find(e => e.type === 'assistant' && e.message?.content?.some?.(c => c.type === 'text'))?.message.content.filter(c => c.type === 'text').map(c => c.text).join('\n') || '';
  const parts = said.split(/(?<=[.?!:])\s+|\n+/).map(s => s.trim());
  // A question to the owner, or a request to run something by hand ("paste this in a terminal").
  const sentence = parts.find(s => s.endsWith('?') && ASKING.test(s)) || parts.find(s => /\b(paste|in (your|a) terminal|run (this|it|that|one) (line|command))\b/i.test(s));
  if (!sentence) return '';
  const sent = turn.some(e => e.type === 'assistant' && e.message?.content?.some?.(c => c.type === 'tool_use' && /\batelier\s+(ask\s|(gate|criteria)\s.*?\brequest\b)/.test(JSON.stringify(c.input || {}))));
  return sent ? '' : sentence.slice(0, 160);
}

async function guardHook() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { return; }
  const reason = guard.check(input);
  if (reason) { process.stderr.write(reason + '\n'); process.exit(2); }
}

function parseArgs(list) {
  const flags = {}, args = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = list[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else { flags[key] = next; i++; }
    } else args.push(a);
  }
  return { flags, args };
}

function need(i, name) {
  if (!args[i]) throw new Error(`missing <${name}>`);
  return args[i];
}

function num(v, fallback) {
  return v === undefined || v === true ? fallback : Number(v);
}
