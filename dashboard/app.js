// Atelier dashboard. Plain JS, hash routes: #/ (home), #/p/<project>/<tab>, #/t/<task>.
// Everything agents write is untrusted text: it's escaped before it reaches the page.
const app = document.getElementById('app');
let state = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = iso => {
  if (!iso) return '';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
const PHASES = ['brief', 'spec', 'design', 'contracts', 'build'];

async function get(path) {
  const r = await fetch(path, { credentials: 'same-origin' });
  if (r.status === 401) { renderLogin(); throw new Error('signed out'); }
  return r.json();
}

async function act(body, done = 'Done') {
  const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok || j.error) { toast(j.error || 'Something went wrong'); return false; }
  toast(done);
  await refresh();
  return true;
}

function toast(text) {
  const t = document.getElementById('toast');
  t.textContent = text; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 2600);
}

// ---------- login ----------

function renderLogin() {
  const failed = location.search.includes('login=failed');
  app.innerHTML = `<form class="login" method="post" action="/login">
    <h1>Atelier</h1>
    <p>Enter the access token printed when the dashboard started (once per device).</p>
    ${failed ? '<p class="fail">That token didn\'t match.</p>' : ''}
    <input type="password" name="token" autocomplete="current-password" aria-label="Access token" required autofocus>
    <button class="act" type="submit">Sign in</button>
  </form>`;
  document.getElementById('bell').hidden = true;
}

// ---------- data + routing ----------

async function refresh() {
  state = await get('/api/overview');
  renderBell();
  document.getElementById('usage').textContent = state.limitsText.startsWith('limits:') ? '' : `Plan: ${state.limitsText.replace(/ · read.*$/, '')}`;
  await route();
}

async function route() {
  const [, kind, a, b] = location.hash.split('/');
  if (kind === 'p' && a) return renderProject(a, b || 'overview');
  if (kind === 't' && a) return renderTask(a);
  if (kind === 'new') return renderNew();
  renderHome();
}

window.addEventListener('hashchange', () => { closeDropdown(); route(); });

// ---------- the "needs you" queue ----------

function queueRow(q, { compact = false } = {}) {
  const p = esc(q.project);
  const alert = q.kind === 'finding' && q.severity === 'high' || q.kind === 'charter-tampered';
  const meta = `${p} · ${({ gate: 'gate', charter: 'charter', 'charter-tampered': 'charter', criterion: 'criterion', 'owner-criterion': 'your judgement', plan: 'task plan', question: 'question', finding: `drift · ${q.severity} · ${q.reversibility === 'hard' ? 'hard to undo' : 'easy to undo'}`, dial: 'trust' })[q.kind] || q.kind}`;
  if (compact) return `<div class="row" data-go="${q.kind === 'question' || q.kind === 'plan' ? `#/t/${esc(q.id)}` : `#/p/${p}/${q.kind === 'finding' ? 'audit' : q.kind.includes('criterion') ? 'criteria' : q.kind.startsWith('charter') ? 'decisions' : 'overview'}`}"><div class="title ${alert ? 'alert' : ''}">${esc(q.title)}</div><div class="meta">${meta}</div></div>`;
  const key = `${q.kind}:${q.project}:${q.id || q.phase || ''}`;
  let actions = '';
  switch (q.kind) {
    case 'gate': actions = `<textarea data-k="${esc(key)}" placeholder="Your approval, in your own words (this is the record)"></textarea>
      <div class="actions"><button class="act" data-do="gate-approve" data-project="${p}" data-phase="${esc(q.phase)}" data-k="${esc(key)}">Approve</button>
      <button class="act" data-do="gate-skip" data-project="${p}" data-phase="${esc(q.phase)}" data-k="${esc(key)}">Skip this phase</button>
      <a href="#/p/${p}/decisions">Read the documents</a></div>`; break;
    case 'charter': case 'charter-tampered': actions = `<div class="actions"><a href="#/p/${p}/decisions">Read and approve the charter</a></div>`; break;
    case 'criterion': actions = `<div class="actions"><button class="act" data-do="criterion" data-verb="approve" data-project="${p}" data-id="${esc(q.id)}">Approve</button>
      <button class="act danger" data-do="criterion" data-verb="retire" data-project="${p}" data-id="${esc(q.id)}">Retire</button></div>`; break;
    case 'owner-criterion': actions = `<textarea data-k="${esc(key)}" placeholder="Note (required if you reject: what's wrong, so the lead can turn it into a ruling)"></textarea>
      <div class="actions"><button class="act" data-do="criterion" data-verb="accept" data-project="${p}" data-id="${esc(q.id)}" data-k="${esc(key)}">Accept</button>
      <button class="act danger" data-do="criterion" data-verb="reject" data-project="${p}" data-id="${esc(q.id)}" data-k="${esc(key)}">Reject</button></div>`; break;
    case 'plan': actions = `<div class="actions"><button class="act" data-do="plan-approve" data-id="${esc(q.id)}">Approve plan</button><a href="#/t/${esc(q.id)}">Read the brief</a></div>`; break;
    case 'question': actions = `<textarea data-k="${esc(key)}" placeholder="Your answer"></textarea>
      <div class="actions"><button class="act" data-do="answer" data-id="${esc(q.id)}" data-k="${esc(key)}">Send answer</button><a href="#/t/${esc(q.id)}">Open task</a></div>`; break;
    case 'finding': actions = `<textarea data-k="${esc(key)}" placeholder="Optional note"></textarea>
      <div class="actions"><button class="act" data-do="finding" data-verdict="confirm" data-project="${p}" data-id="${esc(q.id)}" data-k="${esc(key)}">Confirm drift</button>
      <button class="act" data-do="finding" data-verdict="dismiss" data-project="${p}" data-id="${esc(q.id)}" data-k="${esc(key)}">Dismiss</button></div>`; break;
    case 'dial': actions = `<div class="actions"><button class="act" data-do="dial" data-project="${p}" data-dial="${esc(q.dial)}" data-value="${esc(q.to)}">Loosen to ${esc(q.to)}</button></div>`; break;
  }
  return `<div class="row"><div class="title ${alert ? 'alert' : ''}">${esc(q.title)}</div><div class="meta">${meta}</div>${q.detail ? `<div class="detail">${esc(q.detail)}</div>` : ''}${actions}</div>`;
}

function renderBell() {
  const n = state.queue.length;
  const bell = document.getElementById('bell');
  bell.hidden = false;
  const c = document.getElementById('bell-count');
  c.hidden = !n; c.textContent = n;
  bell.classList.toggle('ringing', state.queue.some(q => q.priority <= 1));
}

function closeDropdown() {
  document.getElementById('dropdown').hidden = true;
  document.getElementById('bell').setAttribute('aria-expanded', 'false');
}

document.getElementById('bell').addEventListener('click', e => {
  e.stopPropagation();
  const d = document.getElementById('dropdown');
  if (!d.hidden) return closeDropdown();
  d.innerHTML = state.queue.length
    ? `<div class="rows">${state.queue.map(q => queueRow(q, { compact: true })).join('')}</div><a class="row small muted" href="#/">See everything on the home page</a>`
    : '<p class="pad muted">Nothing needs you right now.</p>';
  d.hidden = false;
  document.getElementById('bell').setAttribute('aria-expanded', 'true');
});
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { location.hash = go.dataset.go; return; }
  if (!e.target.closest('#dropdown')) closeDropdown();
});

// ---------- home ----------

function renderHome() {
  const q = state.queue;
  app.innerHTML = `
    <h1>${q.length ? `${q.length} thing${q.length > 1 ? 's' : ''} need${q.length > 1 ? '' : 's'} you` : 'Nothing needs you'}</h1>
    <p class="sub">${q.length ? 'Most urgent first.' : 'The team is working. You\'ll see items here, and on the bell, when a decision is yours.'}</p>
    ${q.length ? `<div class="rows">${q.map(x => queueRow(x)).join('')}</div>` : ''}
    <h2>Projects</h2>
    <div class="rows">${state.projects.map(p => p.error ? `<div class="row"><div class="title">${esc(p.alias)}</div><div class="meta fail">${esc(p.error)}</div></div>` : `
      <a class="row" href="#/p/${esc(p.alias)}/overview">
        <div class="split"><div class="title"><span class="dot ${p.lead.running ? 'live' : ''}"></span>${esc(p.alias)}</div><span class="meta">${esc(p.phase)} · ${esc(p.trust)}</span></div>
        <div class="meta">${taskSummary(p.tasks)} · criteria ${p.metrics.criteriaMet}/${p.metrics.criteriaTotal} met · ${p.lead.running ? 'lead is on' : 'lead is off'}</div>
      </a>`).join('')}
      <a class="row" href="#/new"><div class="title">+ New project</div><div class="meta">Name it, pick the team shape, and the lead takes it from there</div></a></div>
    <h2>Recent activity</h2>
    <div class="rows">${state.events.slice(0, 15).map(eventRow).join('')}</div>`;
}

function taskSummary(tasks) {
  const n = s => tasks.filter(t => t.status === s).length;
  const parts = [[n('running'), 'working'], [n('needs-you'), 'need you'], [n('queued'), 'queued'], [n('review'), 'in review'], [n('done'), 'done']].filter(([c]) => c);
  return parts.length ? parts.map(([c, l]) => `${c} ${l}`).join(', ') : 'no tasks yet';
}

function eventRow(e) {
  const bad = /failed|stalled|FAIL|demoted|tampered|high/.test(`${e.type} ${e.msg}`);
  return `<div class="row small"><span class="${bad ? 'fail' : ''}">${esc(e.id)} · ${esc(e.type)}</span> <span class="muted">${esc(ago(e.ts))}</span><div class="meta">${esc(e.msg)}</div></div>`;
}

// ---------- new project ----------

function renderNew() {
  app.innerHTML = `
    <h1>New project</h1>
    <p class="sub">Atelier creates the folder and repo and sets up the team. Then you give the lead your brief.</p>
    <form id="new-form" class="pad form">
      <label>Name<input type="text" name="name" placeholder="e.g. Pocket Garden" required autocomplete="off"></label>
      <label>One line about it <span class="muted">(optional)</span><input type="text" name="description" placeholder="A tiny idle game about growing a garden"></label>
      <fieldset><legend>Team shape</legend>
        <label class="choice"><input type="radio" name="roster" value="pair"> <strong>Pair</strong>: a builder and a reviewer. <span class="muted">Small apps and quick ideas.</span></label>
        <label class="choice"><input type="radio" name="roster" value="team" checked> <strong>Team</strong>: designer, frontend, backend, reviewer. <span class="muted">Web apps with a UI and an API.</span></label>
        <label class="choice"><input type="radio" name="roster" value="game"> <strong>Game</strong>: game designer, gameplay, systems, reviewer. <span class="muted">Games.</span></label>
        <p class="small muted">The lead can change the team later, with your approval.</p>
      </fieldset>
      <fieldset><legend>Shipping</legend>
        <label class="choice"><input type="radio" name="ship" value="merge" checked> <strong>Straight to main</strong> once checks and the reviewer pass. <span class="muted">For your own and test projects.</span></label>
        <label class="choice"><input type="radio" name="ship" value="pr"> <strong>Draft PRs</strong> that you merge. <span class="muted">For client work.</span></label>
      </fieldset>
      <label class="choice"><input type="checkbox" name="github" checked> Create a private GitHub repo</label>
      <label class="choice"><input type="checkbox" name="startLead" checked> Start the lead right away</label>
      <div class="actions"><button class="act" type="submit">Create project</button><a href="#/">Cancel</a></div>
    </form>`;
  document.getElementById('new-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Creating…';
    const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' },
      body: JSON.stringify({ action: 'project-create', name: f.get('name'), description: f.get('description'), roster: f.get('roster'), ship: f.get('ship'), github: f.get('github') === 'on', startLead: f.get('startLead') === 'on' }) });
    const j = await r.json();
    if (!r.ok || j.error) { btn.disabled = false; btn.textContent = 'Create project'; return toast(j.error || 'Could not create the project'); }
    toast(`Created ${j.result.alias}`);
    await refresh();
    location.hash = `#/p/${j.result.alias}/overview`;
  });
}

// ---------- markdown (escaped first, so agent-written text can't inject markup) ----------

function md(src) {
  const lines = esc(src || '').replace(/&lt;!--[\s\S]*?--&gt;/g, '').split('\n');
  const inline = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_(?=[\s).,]|$)/g, '$1<em>$2</em>');
  let html = '', list = null, code = false, para = [];
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith('```')) { flush(); html += code ? '</pre>' : '<pre class="code">'; code = !code; continue; }
    if (code) { html += l + '\n'; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { flush(); html += `<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`; continue; }
    if ((m = l.match(/^\s*[-*]\s+(?:\[( |x)\]\s+)?(.*)/))) { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } if (list !== 'ul') { if (list) html += `</${list}>`; html += '<ul>'; list = 'ul'; } html += `<li>${m[1] === 'x' ? '☑ ' : m[1] === ' ' ? '☐ ' : ''}${inline(m[2])}</li>`; continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } if (list !== 'ol') { if (list) html += `</${list}>`; html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; continue; }
    if (/^\|/.test(l)) { flush(); if (!/^\|[\s:-]+\|/.test(l.replace(/[^|:\s-]/g, '') + '|') || /[a-z0-9]/i.test(l)) html += `<div class="tr">${l.split('|').slice(1, -1).map(c => `<span>${inline(c.trim())}</span>`).join('')}</div>`; continue; }
    if (!l.trim()) { flush(); continue; }
    if (list) { html += `</${list}>`; list = null; }
    para.push(l.trim());
  }
  flush();
  if (code) html += '</pre>';
  return `<div class="md">${html}</div>`;
}

// ---------- project ----------

async function renderProject(alias, tab) {
  const p = await get(`/api/project/${encodeURIComponent(alias)}`);
  const tabs = [['overview', 'Overview'], ['board', 'Board'], ['criteria', 'Criteria'], ['audit', 'Auditor'], ['messages', 'Messages'], ['decisions', 'Decisions'], ['activity', 'Activity']];
  const phaseIdx = PHASES.indexOf(p.phase);
  app.innerHTML = `
    <h1>${esc(p.alias)}</h1>
    <div class="phases">${PHASES.map((ph, i) => `<span class="${i < phaseIdx ? 'done' : i === phaseIdx ? 'now' : ''}">${ph}</span>`).join('')}</div>
    <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/p/${esc(alias)}/${k}" class="${k === tab ? 'on' : ''}">${l}</a>`).join('')}</nav>
    <div id="tab"></div>`;
  const el = document.getElementById('tab');
  const views = { overview: projOverview, board: projBoard, criteria: projCriteria, audit: projAudit, messages: projMessages, decisions: projDecisions, activity: projActivity };
  el.innerHTML = (views[tab] || projOverview)(p);
}

// The single most useful thing to know about a project right now, in plain words.
function nextStep(p, own) {
  const a = esc(p.alias);
  const leadBtn = `<div class="actions"><button class="act" data-do="lead-start" data-project="${a}">Start the lead</button></div>`;
  if (p.charter?.tampered) return { title: 'Your charter was changed after you approved it', detail: 'Check the Decisions tab: approve it again if the change is yours, or restore it.' };
  if (own.length) return { title: `${own.length} decision${own.length > 1 ? 's' : ''} waiting on you`, detail: 'They\'re listed below, most urgent first. The team keeps working on anything that doesn\'t depend on them.' };
  if (!p.lead.running && p.phase !== 'build') return { title: 'Start the lead, then give it your brief', detail: `The lead opens in a terminal window on this PC. Then open the Claude app → Code → "${a} lead" and tell it what you want built. It will interview you, or just talk freely and it will distil it.`, action: leadBtn };
  if (!p.charter && p.phase !== 'build') return { title: 'Give the lead your deep brief', detail: `In the Claude app, open "${a} lead". From your brief it drafts your charter (your vision, quality bar and taste), which comes back here for your approval.` };
  const phaseText = {
    brief: 'The lead is shaping the brief with you. It will ask you to approve it here.',
    spec: 'The lead is writing requirements and drafting acceptance criteria with you. Both come here for approval.',
    design: 'The designer is working. You\'ll approve the design here before anything is built.',
    contracts: 'The API and interfaces are being drafted. You\'ll approve them before the build starts.',
  };
  if (phaseText[p.phase]) return { title: `Phase: ${p.phase}`, detail: phaseText[p.phase] + (p.lead.running ? '' : ' The lead is off, so nothing moves until you start it.'), action: p.lead.running ? '' : leadBtn };
  const n = s => p.tasks.filter(t => t.status === s).length;
  if (n('running') || n('queued')) return { title: 'The team is building', detail: `${n('running')} working, ${n('queued')} queued. Nothing needs you. The bell rings when something does.` };
  if (p.tasks.length && !n('planned')) return { title: 'All current work is finished', detail: p.lead.running ? 'Tell the lead what\'s next, or review the result.' : 'Start the lead to plan what\'s next.', action: p.lead.running ? '' : leadBtn };
  return { title: 'Waiting for the lead to plan the build', detail: p.lead.running ? 'The lead will propose tasks; at strict gating you approve each plan here.' : 'Start the lead to plan the build.', action: p.lead.running ? '' : leadBtn };
}

function projOverview(p) {
  const own = state.queue.filter(q => q.project === p.alias);
  const sel = (dial, value, options) => `<select data-dial="${dial}" data-project="${esc(p.alias)}">${options.map(o => `<option ${o === value ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  const running = p.tasks.filter(t => t.status === 'running');
  const step = nextStep(p, own);
  return `
    <div class="next"><div class="label">What happens next</div><div class="title">${step.title}</div><div class="meta">${step.detail}</div>${step.action || ''}</div>
    ${own.length ? `<h2>Needs you</h2><div class="rows">${own.map(x => queueRow(x)).join('')}</div>` : ''}
    ${running.length ? `<h2>Working now</h2><div class="rows">${running.map(t => `<a class="row" href="#/t/${esc(t.id)}"><div class="split"><div class="title"><span class="dot live"></span>${esc(t.title)}</div><span class="meta">${esc(t.role || 'builder')} · ${t.iteration || 0}/${t.iterations}</span></div><div class="meta">${esc(t.now)}</div></a>`).join('')}</div>` : ''}
    <h2>Lead</h2>
    <div class="rows"><div class="row">
      <div class="title"><span class="dot ${p.lead.running ? 'live' : ''}"></span>${p.lead.running ? 'The lead is on' : 'The lead is off'}</div>
      <div class="meta">${p.lead.running ? `Talk to it in the Claude app: "${esc(p.alias)} lead".` : 'Start it to plan, brief and run the team. It opens a terminal window on this PC that has to stay open.'}</div>
      <div class="actions">${p.lead.running
        ? `<button class="act" data-do="lead-restart" data-project="${esc(p.alias)}">Restart fresh</button><button class="act danger" data-do="lead-stop" data-project="${esc(p.alias)}">Stop</button>`
        : `<button class="act" data-do="lead-start" data-project="${esc(p.alias)}">Start the lead</button>`}</div>
    </div></div>
    <h2>Dials</h2>
    <dl class="kv">
      <dt>Gating</dt><dd>${sel('trust', p.trust, ['strict', 'standard', 'loose'])}</dd>
      <dt>Reporting</dt><dd>${sel('reporting', p.reporting, ['everything', 'daily', 'exceptions'])}</dd>
      <dt>Shipping</dt><dd>${sel('autonomy', p.autonomy, ['pr', 'merge', 'branch'])} <span class="muted small">${p.autonomy === 'merge' ? 'reviewed work goes straight to main' : p.autonomy === 'pr' ? 'draft PRs you merge' : 'local branches only'}</span></dd>
      <dt>Next dial</dt><dd>${p.suggestion ? `${esc(p.suggestion.dial)} → ${esc(p.suggestion.to)}: ${p.suggestion.ready ? '<strong>earned</strong>' : 'not yet'} <span class="muted small">(${esc(p.suggestion.why)})</span>` : '—'}</dd>
    </dl>
    <h2>Numbers</h2>
    <dl class="kv">
      <dt>Criteria met</dt><dd>${p.metrics.criteriaMet} of ${p.metrics.criteriaTotal} approved</dd>
      <dt>Auditor</dt><dd>${p.lastAudit ? `last ran ${esc(ago(p.lastAudit.at))} · ` : 'never run · '}${p.findings.filter(f => f.status === 'open').length} open · hit rate ${p.hit.confirmed}/${p.hit.judged} <button class="act small" data-do="audit" data-project="${esc(p.alias)}">Run now</button></dd>
      <dt>Cost</dt><dd>$${p.metrics.cost} API-equivalent${p.metrics.costPerCriterion !== null ? ` · $${p.metrics.costPerCriterion} per criterion met` : ''}</dd>
      <dt>Your time</dt><dd>${p.metrics.approvals} approvals · ${p.metrics.overrules} overrules · ${p.metrics.findingsJudged} findings judged</dd>
      <dt>Charter</dt><dd>${p.charter ? `approved ${esc(p.charter.approvedAt.slice(0, 10))}${p.charter.tampered ? ' <span class="fail">— changed since</span>' : ''}` : 'not approved yet'}</dd>
    </dl>
    <h2>Team</h2>
    <div class="rows">${p.roster.map(r => `<div class="row"><div class="title">${esc(r.role)}${r.model ? ` <span class="muted small">${esc(r.model)}</span>` : ''}</div><div class="meta">${r.owns.length ? `owns ${esc(r.owns.join(', '))}` : 'read-only'}</div></div>`).join('')}</div>`;
}

const STATUS_ORDER = ['needs-you', 'running', 'planned', 'requested', 'queued', 'review', 'stalled', 'failed', 'paused', 'done'];
function projBoard(p) {
  const tasks = [...p.tasks].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  if (!tasks.length) return '<p class="pad muted">No tasks yet.</p>';
  const roles = [...new Set(tasks.map(t => t.role || 'builder'))];
  return roles.map(r => `<h2>${esc(r)}</h2><div class="rows">${tasks.filter(t => (t.role || 'builder') === r).map(t => `
    <a class="row" href="#/t/${esc(t.id)}">
      <div class="split"><div class="title ${t.status === 'needs-you' || t.status === 'stalled' || (t.status === 'failed' && !/cancelled/.test(t.reason || '')) ? 'alert' : ''}">${esc(t.title)}</div><span class="meta">${t.status === 'failed' && /cancelled/.test(t.reason || '') ? 'cancelled' : esc(t.status)}</span></div>
      <div class="meta">${esc(t.id)}${t.iteration ? ` · ${t.iteration}/${t.iterations}` : ''}${t.criteria ? ` · ${esc(t.criteria)}` : ''}${t.cost ? ` · ${t.cost.toFixed(2)}` : ''}${t.reason ? ` · ${esc(t.reason)}` : ''}</div>${t.now ? `<div class="meta"><span class="dot live"></span>${esc(t.now)}</div>` : ''}
    </a>`).join('')}</div>`).join('');
}

function projCriteria(p) {
  if (!p.criteria.length) return '<p class="pad muted">No acceptance criteria yet. The lead drafts them with you during the spec phase.</p>';
  const cls = s => s === 'pass' || s === 'accepted' ? 'pass' : s === 'fail' || s === 'rejected' ? 'fail' : '';
  return `<div class="rows">${p.criteria.map(c => `<div class="row">
    <div class="split"><div class="title">${esc(c.id)} · ${esc(c.statement)}</div><span class="meta ${cls(c.status)}">${esc(c.status)}</span></div>
    <div class="meta">${esc(c.kind)}${c.verify ? ` · <code>${esc(c.verify)}</code>` : ''} · serves ${esc(c.serves)}</div>
    ${c.status === 'draft' ? `<div class="actions"><button class="act" data-do="criterion" data-verb="approve" data-project="${esc(p.alias)}" data-id="${esc(c.id)}">Approve</button><button class="act danger" data-do="criterion" data-verb="retire" data-project="${esc(p.alias)}" data-id="${esc(c.id)}">Retire</button></div>` : ''}
  </div>`).join('')}</div>`;
}

function projAudit(p) {
  const open = p.findings.filter(f => f.status === 'open');
  const closed = p.findings.filter(f => f.status !== 'open');
  const row = f => `<div class="row"><div class="title ${f.severity === 'high' && f.status !== 'dismissed' ? 'alert' : ''}">${esc(f.id)} · ${esc(f.claim)}</div>
    <div class="meta">${esc(f.severity)} · ${f.reversibility === 'hard' ? 'hard to undo' : 'easy to undo'} · ${esc(f.source || '')} · product ${esc(f.product)}${f.status !== 'open' ? ` · ${esc(f.status)}` : ''}</div>
    <div class="detail">Expected: ${esc(f.expected)}\nObserved: ${esc(f.observed)}\nEvidence: ${esc(f.evidence)}</div>
    ${f.status === 'open' ? `<div class="actions"><button class="act" data-do="finding" data-verdict="confirm" data-project="${esc(p.alias)}" data-id="${esc(f.id)}">Confirm drift</button><button class="act" data-do="finding" data-verdict="dismiss" data-project="${esc(p.alias)}" data-id="${esc(f.id)}">Dismiss</button></div>` : ''}</div>`;
  return `<p class="sub" style="margin-top:12px">The auditor never sees the lead's plan. It checks the product against your charter, rulings and approved criteria, and reports here, to you. <button class="act" data-do="audit" data-project="${esc(p.alias)}">Run an audit now</button></p>
    ${open.length ? `<h2>Open</h2><div class="rows">${open.map(row).join('')}</div>` : '<p class="pad muted">No open findings.</p>'}
    ${closed.length ? `<h2>Judged</h2><div class="rows">${closed.slice(-20).reverse().map(row).join('')}</div>` : ''}`;
}

function projMessages(p) {
  if (!p.messages.length) return '<p class="pad muted">No messages between specialists yet.</p>';
  return `<p class="sub" style="margin-top:12px">Specialists talk directly. Nothing here binds anyone: decisions go through the lead into contracts and criteria.</p>
    <div class="rows">${p.messages.map(m => `<div class="row"><div class="split"><div class="title">${esc(m.fromRole || m.from)} → ${esc(m.to)}</div><span class="meta">${esc(m.type)} · ${esc(ago(m.at))}</span></div><div class="detail">${esc(m.text)}</div></div>`).join('')}</div>`;
}

function projDecisions(p) {
  return `
    <h2>Your charter</h2>
    <p class="sub">Only you change this. Every agent reads it every iteration, and the auditor checks the product against it.</p>
    <div class="pad" style="padding-top:0"><textarea class="doc" id="charter-text">${esc(p.docs.charter)}</textarea>
      <div class="actions"><button class="act" data-do="charter-save" data-project="${esc(p.alias)}">Save changes</button></div>
      <p class="small muted" style="margin-bottom:4px">${p.charter ? `Approved ${esc(p.charter.approvedAt.slice(0, 10))}${p.charter.tampered ? ' — <span class="fail">it has changed since; approve again if the changes are yours</span>' : ''}` : 'Not approved yet.'}</p>
      <textarea id="charter-quote" placeholder="Approve in your own words, e.g. 'Yes, this is what I want built'"></textarea>
      <div class="actions"><button class="act" data-do="charter-approve" data-project="${esc(p.alias)}">Approve the charter</button></div></div>
    <h2>Rulings</h2>
    ${md(p.docs.rulings || 'No rulings yet.')}
    <div class="pad"><textarea id="ruling-text" placeholder="Add a ruling directly, e.g. 'No modal dialogs: edit inline'"></textarea><div class="actions"><button class="act" data-do="ruling" data-project="${esc(p.alias)}">Add ruling</button></div></div>
    <h2>Lead's ledger</h2>${md(p.docs.ledger || 'Empty.')}
    <h2>Lead's plan</h2>${md(p.docs.plan || 'Empty.')}
    <h2>Brief</h2>${md(p.docs.brief || 'Empty.')}
    <h2>Spec</h2>${md(p.docs.spec || 'Empty.')}`;
}

function projActivity(p) {
  return `<div class="rows">${p.events.map(eventRow).join('') || '<p class="pad muted">No activity yet.</p>'}</div>`;
}

// ---------- task ----------

async function renderTask(id) {
  const t = await get(`/api/task/${encodeURIComponent(id)}`);
  const m = t.meta;
  const section = (title, body, raw = false) => body && body.trim() ? `<h2>${title}</h2>${raw ? `<pre class="doc">${esc(body.trim())}</pre>` : md(body.trim())}` : '';
  app.innerHTML = `
    <h1>${esc(m.title)}</h1>
    <p class="sub">${esc(m.id)} · ${esc(m.role || 'builder')} · ${esc(m.status)}${m.reason ? ` — ${esc(m.reason)}` : ''}${m.project ? ` · <a href="#/p/${esc(m.project)}/board">${esc(m.project)}</a>` : ''}</p>
    <dl class="kv">
      <dt>Progress</dt><dd>${esc(m.iteration || 0)} of ${esc(m.iterations)} iterations · check ${esc(m.last_check || 'not run')}</dd>
      <dt>Criteria</dt><dd>${esc(m.criteria || '—')}</dd>
      <dt>Done-check</dt><dd><code>${esc(m.check)}</code></dd>
      ${m.files ? `<dt>Files</dt><dd>${esc(m.files)}</dd>` : ''}
      ${m.pr ? `<dt>PR</dt><dd><a href="${esc(m.pr)}" target="_blank" rel="noopener">${esc(m.pr)}</a></dd>` : ''}
      ${m.test_touch ? `<dt>Flagged</dt><dd class="fail">changed existing tests: ${esc(m.test_touch)}</dd>` : ''}
    </dl>
    ${m.status === 'planned' ? `<div class="pad"><button class="act" data-do="plan-approve" data-id="${esc(m.id)}">Approve this plan</button></div>` : ''}
    ${m.status === 'needs-you' ? `<div class="pad"><textarea id="answer-text" placeholder="Your answer"></textarea><div class="actions"><button class="act" data-do="answer" data-id="${esc(m.id)}" data-src="answer-text">Send answer</button></div></div>` : ''}
    ${['running', 'queued'].includes(m.status) ? `<div class="pad"><button class="act danger" data-do="task-stop" data-id="${esc(m.id)}">Stop this task</button></div>` : ''}
    ${section('Brief', t.body)}
    ${section('Questions', t.questions)}
    ${section('Review', t.review)}
    ${section('Progress', t.progress)}
    ${section('Decisions made without you', t.decisions)}
    ${section('Last check', t.lastCheck, true)}`;
}

// ---------- actions ----------

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-do]');
  if (!b) return;
  const d = b.dataset;
  const text = d.k ? (document.querySelector(`textarea[data-k="${CSS.escape(d.k)}"]`)?.value || '').trim()
    : d.src ? (document.getElementById(d.src)?.value || '').trim() : '';
  b.disabled = true;
  try {
    switch (d.do) {
      case 'gate-approve': if (!text) return toast('Write your approval in your own words first'); await act({ action: 'gate-approve', project: d.project, phase: d.phase, quote: text }, `${d.phase} approved`); break;
      case 'gate-skip': if (!text) return toast('Say why you\'re skipping this phase'); await act({ action: 'gate-skip', project: d.project, phase: d.phase, quote: text }, `${d.phase} skipped`); break;
      case 'criterion': if (d.verb === 'reject' && !text) return toast('Say what\'s wrong, so it can become a ruling'); await act({ action: 'criterion', project: d.project, id: d.id, verb: d.verb, note: text }, `${d.id} ${d.verb === 'accept' ? 'accepted' : d.verb + 'd'}`); break;
      case 'plan-approve': await act({ action: 'plan-approve', id: d.id }, 'Plan approved; work starts'); break;
      case 'answer': if (!text) return toast('Write an answer first'); await act({ action: 'answer', id: d.id, text }, 'Answer sent; the task resumes'); break;
      case 'finding': await act({ action: 'finding', project: d.project, id: d.id, verdict: d.verdict, note: text }, d.verdict === 'confirm' ? 'Drift confirmed' : 'Finding dismissed'); break;
      case 'dial': await act({ action: 'dial', project: d.project, dial: d.dial, value: d.value }, `${d.dial} → ${d.value}`); break;
      case 'audit': await act({ action: 'audit', project: d.project }, 'Audit started; findings appear here in a few minutes'); break;
      case 'lead-start': await act({ action: 'lead-start', project: d.project }, 'Lead starting in a terminal window'); break;
      case 'lead-restart': await act({ action: 'lead-restart', project: d.project }, 'Lead restarting fresh'); break;
      case 'lead-stop': if (confirm('Stop the lead session?')) await act({ action: 'lead-stop', project: d.project }, 'Lead stopped'); break;
      case 'task-stop': if (confirm('Stop this task? You can resume it later.')) await act({ action: 'task-stop', id: d.id }, 'Task stopped'); break;
      case 'charter-save': await act({ action: 'charter-save', project: d.project, text: document.getElementById('charter-text').value }, 'Charter saved'); break;
      case 'charter-approve': { const q = document.getElementById('charter-quote').value.trim(); if (!q) return toast('Approve in your own words'); await act({ action: 'charter-approve', project: d.project, quote: q }, 'Charter approved'); break; }
      case 'ruling': { const r = document.getElementById('ruling-text').value.trim(); if (!r) return toast('Write the ruling first'); await act({ action: 'ruling', project: d.project, text: r }, 'Ruling added'); break; }
    }
  } finally { b.disabled = false; }
});

document.addEventListener('change', e => {
  const s = e.target.closest('select[data-dial]');
  if (s) act({ action: 'dial', project: s.dataset.project, dial: s.dataset.dial, value: s.value }, `${s.dataset.dial} → ${s.value}`);
});

// Refresh every 20 seconds while visible; don't clobber something the owner is typing.
setInterval(() => {
  if (document.hidden) return;
  const typing = document.activeElement && ['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement.tagName);
  if (!typing) refresh().catch(() => {});
}, 20000);

refresh().catch(() => {});
