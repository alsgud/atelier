// Atelier dashboard. Plain JS, hash routes:
//   #/inbox[/<key>]  #/activity  #/projects  #/new
//   #/p/<project>/<tab>[/<doc>]   tabs: overview tasks criteria audits docs activity settings
//   #/t/<task>
// Everything agents write is untrusted text: esc() it, or render it through md() (which escapes first).
const $ = id => document.getElementById(id);
let state = null;
let loadedVersion = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = iso => {
  const t = Date.parse(iso); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
const PHASES = ['brief', 'spec', 'design', 'contracts', 'build'];
const resetIn = sec => { const m = Math.round((sec * 1000 - Date.now()) / 60000); return m <= 0 ? 'now' : m < 60 ? `in ${m}m` : `in ${Math.floor(m / 60)}h ${m % 60}m`; };

// ---------- icons ----------
const ICON = {
  inbox: '<path d="M4 13h4l1.5 2.5h5L16 13h4M4 13l2.4-7.2A1 1 0 0 1 7.35 5h9.3a1 1 0 0 1 .95.8L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
  projects: '<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2h7A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
  activity: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  office: '<path d="M3 20h18M5 20V10h14v10M9 10V7a3 3 0 0 1 6 0v3"/><circle cx="12" cy="15" r="1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gate: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  doc: '<path d="M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 16h6"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2v.3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.5M12 16.8v.3"/>',
  dial: '<path d="M5 7h9M18 7h1M5 17h3M12 17h7"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  back: '<path d="M14.5 6 8.5 12l6 6"/>',
};
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;

// Linear-style status glyphs: outline = not started, half = in progress, filled = finished.
function st(status, title = status) {
  const c = { lilac: 'var(--lilac)', red: 'var(--red)', green: 'var(--green)', muted: 'var(--faint)', fg: 'var(--fg2)' };
  const svg = inner => `<svg class="st" viewBox="0 0 14 14" aria-label="${esc(title)}" role="img">${inner}</svg>`;
  switch (status) {
    case 'planned': case 'draft': case 'requested': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.muted}" stroke-width="1.5" stroke-dasharray="1.6 1.8"/>`);
    case 'queued': case 'approved': case 'open': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.fg}" stroke-width="1.5"/>`);
    case 'running': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.lilac}" stroke-width="1.5"/><path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="${c.lilac}"/>`);
    case 'review': case 'awaiting-owner': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.lilac}" stroke-width="1.5"/><path d="M7 3.5a3.5 3.5 0 1 1-3.5 3.5H7z" fill="${c.lilac}"/>`);
    case 'done': case 'pass': case 'accepted': case 'confirmed': return svg(`<circle cx="7" cy="7" r="6.2" fill="${c.green}"/><path d="M4.3 7.2l1.9 1.9 3.6-3.8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    case 'needs-you': case 'fail': case 'stalled': case 'high': return svg(`<circle cx="7" cy="7" r="6.2" fill="${c.red}"/><path d="M7 3.8v3.6M7 9.8v.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`);
    case 'failed': case 'rejected': case 'retired': case 'dismissed': case 'cancelled': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.muted}" stroke-width="1.5"/><path d="M5 5l4 4M9 5l-4 4" stroke="${c.muted}" stroke-width="1.4" stroke-linecap="round"/>`);
    case 'paused': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.muted}" stroke-width="1.5"/><path d="M5.8 5v4M8.2 5v4" stroke="${c.muted}" stroke-width="1.4" stroke-linecap="round"/>`);
    case 'medium': case 'low': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.fg}" stroke-width="1.5"/><path d="M7 4.2v3.4M7 9.6v.2" stroke="${c.fg}" stroke-width="1.5" stroke-linecap="round"/>`);
    default: return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.muted}" stroke-width="1.5"/>`);
  }
}
const taskStatus = t => t.status === 'failed' && /cancelled/.test(t.reason || '') ? 'cancelled' : t.status;
const STATUS_WORD = { 'needs-you': 'Needs you', running: 'Working', queued: 'Queued', planned: 'Waiting for your OK', requested: 'Request', review: 'In review', done: 'Done', stalled: 'Stalled', failed: 'Failed', cancelled: 'Cancelled', paused: 'Paused' };

// ---------- data ----------
async function get(path) {
  const r = await fetch(path, { credentials: 'same-origin' });
  if (r.status === 401) { renderLogin(); throw new Error('signed out'); }
  return r.json();
}

async function act(body, done = 'Done') {
  const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: 'Something went wrong' }));
  if (!r.ok || j.error) { toast(j.error || 'Something went wrong'); return null; }
  toast(done);
  await refresh();
  return j.result ?? true;
}

function toast(text) {
  const t = $('toast');
  t.textContent = text; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 2600);
}

async function refresh() {
  state = await get('/api/overview');
  // A new version of the dashboard was installed: reload so the owner always sees the latest.
  if (loadedVersion && state.version && state.version !== loadedVersion) return location.reload();
  loadedVersion = loadedVersion || state.version;
  renderChrome();
  await route();
}

// ---------- chrome: sidebar + phone tab bar ----------
function renderChrome() {
  const here = location.hash || '#/inbox';
  const n = state.queue.length;
  const lim = state.limits || {};
  const meter = (label, w) => w ? `<div class="meter"><span>${label}</span><div class="bar"><i class="${w.used_percentage >= 85 ? 'hot' : ''}" style="width:${Math.min(100, Math.round(w.used_percentage))}%"></i></div><span>${Math.round(w.used_percentage)}%</span></div>` : '';
  $('side').innerHTML = `
    <div class="brand"><img src="icon.svg" alt="">Atelier</div>
    <a class="nav ${here.startsWith('#/inbox') ? 'on' : ''}" href="#/inbox">${icon('inbox')}Inbox<span class="count ${n ? 'hot' : ''}">${n || ''}</span></a>
    <a class="nav ${here.startsWith('#/office') ? 'on' : ''}" href="#/office">${icon('office')}Office<span class="count">${state.projects.reduce((n, p) => n + (p.tasks || []).filter(t => t.status === 'running').length, 0) || ''}</span></a>
    <a class="nav ${here.startsWith('#/activity') ? 'on' : ''}" href="#/activity">${icon('activity')}Activity</a>
    <div class="side-h"><span>Projects</span><a href="#/new" title="New project" aria-label="New project">+</a></div>
    ${state.projects.map(p => {
      const needs = state.queue.filter(q => q.project === p.alias).length;
      return `<a class="nav ${here.startsWith(`#/p/${p.alias}/`) ? 'on' : ''}" href="#/p/${esc(p.alias)}/overview"><span class="pdot ${p.lead?.running ? 'live' : ''}" title="${p.lead?.running ? 'Lead is on' : 'Lead is off'}"></span>${esc(p.alias)}<span class="count ${needs ? 'hot' : ''}">${needs || ''}</span></a>`;
    }).join('')}
    <a class="nav" href="#/new">${icon('plus')}New project</a>
    <div class="side-foot" title="Your whole Claude plan: this includes your own chats and Claude Code sessions, not just Atelier.">
      <div style="color:var(--fg2);font-weight:500">Your Claude plan</div>
      ${meter('5h', lim.five_hour)}${meter('7d', lim.seven_day)}
      ${lim.five_hour ? `<div class="faint" style="margin-top:4px">5h resets ${esc(resetIn(lim.five_hour.resets_at))} · updated ${esc(ago(new Date((lim.saved_at || 0) * 1000).toISOString()) || 'now')} ago</div>` : '<div class="faint">shows after the first run</div>'}
      <div style="color:var(--fg2);font-weight:500;margin-top:10px">Atelier today</div>
      <div>${money(state.atelierToday?.cost)} finished${state.atelierToday?.liveTokens ? ' + work in progress' : ''}</div>
      <div class="faint">${(((state.atelierToday?.tokens || 0) + (state.atelierToday?.liveTokens || 0)) / 1e6).toFixed(1)}M tokens · API-equivalent, not a bill</div>
    </div>`;
  $('tabbar').innerHTML = `
    <a class="${here.startsWith('#/inbox') ? 'on' : ''}" href="#/inbox">${icon('inbox')}Inbox${n ? `<span class="badge">${n}</span>` : ''}</a>
    <a class="${here.startsWith('#/office') ? 'on' : ''}" href="#/office">${icon('office')}Office</a>
    <a class="${/^#\/(projects|p\/|t\/|new)/.test(here) ? 'on' : ''}" href="#/projects">${icon('projects')}Projects</a>
    <a class="${here.startsWith('#/activity') ? 'on' : ''}" href="#/activity">${icon('activity')}Activity</a>`;
  document.title = n ? `(${n}) Atelier` : 'Atelier';
}

const topbar = (crumbs, right = '') => `<div class="top"><div class="crumbs">${crumbs}</div><div class="spacer"></div>${right}</div>`;

// ---------- routing ----------
async function route() {
  const [, kind, a, b, c] = (location.hash || '#/inbox').split('/');
  try {
    if (kind === 'p' && a) return await renderProject(decodeURIComponent(a), b || 'overview', c);
    if (kind === 't' && a) return await renderTask(decodeURIComponent(a));
    if (kind === 'new') return renderNew();
    if (kind === 'projects') return renderProjects();
    if (kind === 'activity') return renderActivity();
    if (kind === 'office') return renderOffice();
    return renderInbox(a ? decodeURIComponent(a) : null);
  } catch (e) {
    if (e.message !== 'signed out') $('app').innerHTML = `${topbar('<b>Error</b>')}<div class="empty"><b>That didn't load</b>${esc(e.message)}</div>`;
  }
}
window.addEventListener('hashchange', () => { if (state) { renderChrome(); route(); } });

// ---------- inbox (Linear) ----------
const KIND = {
  gate: ['gate', 'Gate'], charter: ['doc', 'Charter'], 'charter-tampered': ['alert', 'Charter changed'], finding: ['alert', 'Drift'],
  criterion: ['check', 'Outcome'], criteria: ['check', 'Outcomes'], 'owner-criterion': ['eye', 'Your judgement'], plan: ['play', 'Task plan'], question: ['help', 'Question'], dial: ['dial', 'Trust'],
};

function renderInbox(sel) {
  const q = state.queue;
  const pick = sel ? q.find(x => x.key === sel) : null;
  const rows = q.map(x => {
    const [ic, label] = KIND[x.kind] || ['inbox', x.kind];
    const hot = x.priority <= 1 || (x.kind === 'finding' && x.severity === 'high');
    return `<a class="item ${pick && pick.key === x.key ? 'on' : ''} ${hot ? 'urgent' : ''}" href="#/inbox/${encodeURIComponent(x.key)}">
      <span style="color:${hot ? 'var(--red)' : 'var(--muted)'}">${icon(ic, 'st')}</span>
      <span class="t">${esc(x.title)}<small>${esc(x.project)} · ${label}</small></span>
      <span class="r">${esc(ago(x.at))}</span></a>`;
  }).join('');
  $('app').innerHTML = `${topbar('<b>Inbox</b>')}
    <div class="inbox ${pick ? 'has-detail' : ''}">
      <div class="col">
        <div class="seg"><a class="on">Needs you<span class="n">${q.length}</span></a></div>
        ${q.length ? `<div>${rows}</div>` : `<div class="empty"><b>You're all caught up</b>Decisions that need you show up here.</div>`}
      </div>
      <div class="col">${pick ? inboxDetail(pick) : (q.length ? '<div class="empty">Select an item</div>' : nothingDetail())}</div>
    </div>`;
}

function nothingDetail() {
  const working = state.projects.flatMap(p => (p.tasks || []).filter(t => t.status === 'running').map(t => ({ ...t, project: p.alias })));
  return `<div class="detail">
    <h1>Nothing needs you</h1>
    <div class="sub">${working.length ? `${working.length} task${working.length > 1 ? 's are' : ' is'} being worked on.` : 'No one is working right now.'}</div>
    ${working.length ? `<div class="list">${working.map(t => taskRow(t, { project: true })).join('')}</div>` : `<div class="btns"><a class="btn primary" href="#/new">${icon('plus', 'st')}New project</a></div>`}
  </div>`;
}

function inboxDetail(x) {
  const p = esc(x.project);
  const [, label] = KIND[x.kind] || ['', x.kind];
  const back = `<a class="btn ghost" href="#/inbox" style="margin:-6px 0 6px -10px">${icon('back', 'st')}Inbox</a>`;
  let decide = '';
  switch (x.kind) {
    case 'gate': decide = `<div class="label">Approve in your own words; it's kept as the record</div>
      <textarea id="d-text" placeholder="e.g. Yes, this is the game I want"></textarea>
      <div class="btns"><button class="btn primary" data-do="gate-approve" data-project="${p}" data-phase="${esc(x.phase)}">Approve ${esc(x.phase)}</button>
      <button class="btn" data-do="gate-skip" data-project="${p}" data-phase="${esc(x.phase)}">Skip this phase</button>
      <a class="btn ghost" href="#/p/${p}/docs/${x.phase === 'spec' ? 'spec' : 'brief'}">Read the document</a></div>`; break;
    case 'charter': case 'charter-tampered': decide = `<div class="btns"><a class="btn primary" href="#/p/${p}/docs/charter">Open the charter</a></div>`; break;
    case 'criterion': decide = `<div class="btns"><button class="btn primary" data-do="criterion" data-verb="approve" data-project="${p}" data-id="${esc(x.id)}">Approve</button>
      <button class="btn danger" data-do="criterion" data-verb="retire" data-project="${p}" data-id="${esc(x.id)}">Retire</button></div>`; break;
    case 'criteria': decide = `<div class="label">These are the results you'll judge the product by. The lead handles the technical checks behind them.</div>
      <div class="btns"><button class="btn primary" data-do="criteria-all" data-project="${p}" data-ids="${esc(x.id)}">Approve all</button>
      <a class="btn ghost" href="#/p/${p}/criteria">Review one by one</a></div>`; break;
    case 'owner-criterion': decide =`<textarea id="d-text" placeholder="If you reject it, say what's wrong; it becomes a ruling"></textarea>
      <div class="btns"><button class="btn primary" data-do="criterion" data-verb="accept" data-project="${p}" data-id="${esc(x.id)}">Accept</button>
      <button class="btn danger" data-do="criterion" data-verb="reject" data-project="${p}" data-id="${esc(x.id)}">Reject</button></div>`; break;
    case 'plan': decide = `<div class="btns"><button class="btn primary" data-do="plan-approve" data-id="${esc(x.id)}">Approve plan</button><a class="btn ghost" href="#/t/${esc(x.id)}">Read the brief</a></div>`; break;
    case 'question': decide = `<textarea id="d-text" placeholder="Your answer"></textarea>
      <div class="btns"><button class="btn primary" data-do="answer" data-id="${esc(x.id)}">Send answer</button><a class="btn ghost" href="#/t/${esc(x.id)}">Open task</a></div>`; break;
    case 'finding': decide = `<textarea id="d-text" placeholder="Optional note"></textarea>
      <div class="btns"><button class="btn primary" data-do="finding" data-verdict="confirm" data-project="${p}" data-id="${esc(x.id)}">Confirm drift</button>
      <button class="btn" data-do="finding" data-verdict="dismiss" data-project="${p}" data-id="${esc(x.id)}">Dismiss</button></div>`; break;
    case 'dial': decide = `<div class="btns"><button class="btn primary" data-do="dial" data-project="${p}" data-dial="${esc(x.dial)}" data-value="${esc(x.to)}">Loosen to ${esc(x.to)}</button></div>`; break;
  }
  return `<div class="detail">${back}
    <div class="sub">${icon((KIND[x.kind] || ['inbox'])[0], 'st')} ${label}${x.kind === 'finding' ? ` · ${esc(x.severity)} · ${x.reversibility === 'hard' ? 'hard to undo' : 'easy to undo'}` : ''} · <a href="#/p/${p}/overview">${p}</a>${x.at ? ` · ${esc(ago(x.at))} ago` : ''}</div>
    <h1>${esc(x.title)}</h1>
    ${x.detail ? md(x.detail) : ''}
    <div class="box decide">${decide}</div>
  </div>`;
}

// ---------- office: who's working, at a glance ----------
// One desk per agent. The bubble says what they're doing: typing (working), red "!" (needs you),
// magnifier (reviewing), "zz" (stuck), coffee (idle). Empty chair = not running.
function scene(state) {
  const typing = state === 'working' || state === 'reviewing' || state === 'auditing';
  const person = state === 'away' ? '' : `
    <g class="${typing ? 'typing' : ''}">
      <rect class="chair" x="52" y="44" width="34" height="34" rx="6"/>
      <rect class="shirt" x="56" y="46" width="26" height="24" rx="8"/>
      <circle class="skin" cx="69" cy="36" r="9"/>
      <path class="hair" d="M60 34a9 9 0 0 1 18 0c-3-4-15-4-18 0z"/>
      <rect class="skin arm l" x="54" y="58" width="12" height="5" rx="2.5"/>
      <rect class="skin arm r" x="72" y="58" width="12" height="5" rx="2.5"/>
    </g>`;
  const bubbles = {
    working: `<g class="float"><rect class="bubble" x="88" y="4" width="34" height="18" rx="9"/><g class="dots"><circle class="lilac" cx="98" cy="13" r="2.2"/><circle class="lilac" cx="105" cy="13" r="2.2"/><circle class="lilac" cx="112" cy="13" r="2.2"/></g></g>`,
    auditing: `<g class="float"><rect class="bubble" x="88" y="4" width="34" height="18" rx="9"/><g class="dots"><circle class="lilac" cx="98" cy="13" r="2.2"/><circle class="lilac" cx="105" cy="13" r="2.2"/><circle class="lilac" cx="112" cy="13" r="2.2"/></g></g>`,
    needs: `<g class="float"><circle class="red" cx="100" cy="14" r="10"/><rect x="98.6" y="8" width="2.8" height="7.5" rx="1.4" fill="#fff"/><circle cx="100" cy="18.6" r="1.6" fill="#fff"/></g>`,
    reviewing: `<g class="float"><rect class="bubble" x="88" y="4" width="26" height="20" rx="9"/><circle cx="99" cy="13" r="4.5" fill="none" stroke="var(--lilac)" stroke-width="2"/><path d="M102.5 16.5l4 4" stroke="var(--lilac)" stroke-width="2" stroke-linecap="round"/></g>`,
    stuck: `<g class="float"><text x="90" y="18" class="muted" font-size="13" font-weight="700" font-family="var(--font)">z z</text></g>`,
    idle: `<g><rect class="muted" x="96" y="50" width="9" height="10" rx="2"/><path d="M105 52h2a2 2 0 0 1 0 5h-2" fill="none" stroke="var(--faint)" stroke-width="1.5"/></g>`,
    away: '',
  };
  return `<svg class="scene" viewBox="0 0 138 92" aria-hidden="true">
    ${state === 'away' ? '<rect class="chair" x="52" y="44" width="34" height="34" rx="6"/>' : ''}
    ${person}
    <rect class="deskwood" x="14" y="66" width="110" height="6" rx="2"/>
    <rect class="monitor" x="22" y="42" width="30" height="22" rx="2"/>
    <rect class="screen ${typing ? 'on' : ''}" x="24.5" y="44.5" width="25" height="17" rx="1"/>
    <rect class="monitor" x="34" y="64" width="6" height="3"/>
    ${bubbles[state] || ''}
  </svg>`;
}

const money = n => `$${(n || 0).toFixed(2)}`;
const etaText = e => e ? `likely ${e.low}–${e.high} min` : '';

function desk({ href, state, who, what, meta, cls = '' }) {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="desk ${cls} ${state === 'needs' ? 'needs' : ''} ${state === 'away' ? 'off' : ''}" ${href ? `href="${href}"` : ''}>
    ${scene(state)}
    <div class="who">${who}</div>
    ${what ? `<div class="what">${what}</div>` : ''}
    ${meta ? `<div class="meta">${meta}</div>` : ''}
  </${tag}>`;
}

function renderOffice() {
  const ps = [...state.projects].filter(p => !p.error).sort((a, b) => (b.lead?.running - a.lead?.running) || (b.tasks.filter(t => t.status === 'running').length - a.tasks.filter(t => t.status === 'running').length));
  const allRunning = ps.flatMap(p => p.tasks.filter(t => t.status === 'running'));
  const waiting = state.queue.length;
  const t = state.atelierToday || {};
  const floors = ps.map(p => {
    const a = esc(p.alias);
    const active = p.tasks.filter(x => ['running', 'needs-you', 'stalled'].includes(x.status) || (x.status === 'review' && /in review/.test(x.reason || '')));
    if (!p.lead.running && !active.length && !p.auditing) {
      return `<a class="item" href="#/p/${a}/overview" style="margin-bottom:6px;border:1px solid var(--line);border-radius:8px"><span class="pdot"></span><span class="t">${a}<small>Nobody working · lead off · ${money(p.metrics.cost)} spent in total</small></span></a>`;
    }
    const busyRoles = new Set(active.map(x => x.role || 'builder'));
    const reviewing = p.tasks.filter(x => x.status === 'running' && /in review/.test(x.reason || ''));
    const desks = [];
    desks.push(desk({ href: `#/p/${a}/overview`, cls: 'lead', state: p.lead.running ? (state.queue.some(q => q.project === p.alias) ? 'idle' : 'working') : 'away',
      who: `Lead`, what: p.lead.running ? `Running ${a}` : 'Off', meta: p.lead.running ? `talk to "${a} lead" in the Claude app` : 'start it from the project page' }));
    for (const x of active) {
      const s = x.status === 'needs-you' ? 'needs' : x.status === 'stalled' ? 'stuck' : /in review/.test(x.reason || '') ? 'reviewing' : 'working';
      const spend = x.cost + (x.liveCost || 0);
      desks.push(desk({ href: `#/t/${esc(x.id)}`, state: s,
        who: `${esc(x.role || 'builder')}${s === 'reviewing' ? ' <span class="faint">+ reviewer</span>' : ''}`,
        what: esc(x.title),
        meta: s === 'needs' ? '<span style="color:var(--red)">needs you</span>' : s === 'stuck' ? 'stuck: the lead will replan' : `iteration ${x.iteration || 0} of ${x.iterations}${x.eta ? ` · ${etaText(x.eta)}` : ''}${spend ? ` · ${money(spend)}` : ''}` }));
    }
    if (!reviewing.length && p.roster.some(r => r.role === 'reviewer')) desks.push(desk({ state: 'idle', who: 'reviewer', what: 'Waiting for finished work', meta: 'Opus · reviews every task' }));
    desks.push(desk({ href: `#/p/${a}/audits`, state: p.auditing ? 'auditing' : 'idle', who: 'auditor', what: p.auditing ? 'Checking the product against your words' : 'Between audits', meta: p.lastAudit ? `last audit ${esc(ago(p.lastAudit.at))} ago` : 'reports only to you' }));
    for (const r of p.roster.filter(r => r.role !== 'reviewer' && !busyRoles.has(r.role))) desks.push(desk({ state: 'idle', who: esc(r.role), what: 'No task right now', meta: '' }));
    const spendNow = p.metrics.cost + (p.metrics.liveCost || 0);
    return `<div class="sec" style="display:flex;justify-content:space-between;gap:12px"><a href="#/p/${a}/overview" style="color:var(--fg);font-weight:600">${a}</a><span>${p.tasks.filter(x => x.status === 'running').length} working · ${money(spendNow)} so far</span></div>
      <div class="floor">${desks.join('')}</div>`;
  }).join('');
  $('app').innerHTML = `${topbar('<b>Office</b>')}
    <div class="page">
      <div class="office-bar"><span><b>${allRunning.length}</b> agent${allRunning.length === 1 ? '' : 's'} working</span><span><b>${waiting}</b> waiting on you</span><span>Atelier today: <b>${money(t.cost + 0)}</b> finished${t.liveTokens ? ` + work in progress` : ''} · ${((t.tokens + t.liveTokens) / 1e6).toFixed(1)}M tokens</span></div>
      ${floors || '<div class="empty"><b>No projects yet</b>Create one and the team shows up here.</div>'}
    </div>`;
}

// ---------- projects list (phone) ----------
function renderProjects() {
  $('app').innerHTML = `${topbar('<b>Projects</b>', `<a class="btn" href="#/new">${icon('plus', 'st')}New</a>`)}
    <div class="list">${state.projects.map(p => `<a class="item" href="#/p/${esc(p.alias)}/overview">
      <span class="pdot ${p.lead?.running ? 'live' : ''}"></span>
      <span class="t">${esc(p.alias)}<small>${esc(p.phase)} · ${taskSummary(p.tasks || [])}</small></span>
      <span class="r">${state.queue.filter(q => q.project === p.alias).length || ''}</span></a>`).join('') || '<div class="empty"><b>No projects yet</b>Create one to get started.</div>'}</div>`;
}

function taskSummary(tasks) {
  const n = s => tasks.filter(t => t.status === s).length;
  const parts = [[n('running'), 'working'], [n('needs-you'), 'need you'], [n('queued'), 'queued'], [n('done'), 'done']].filter(([x]) => x);
  return parts.length ? parts.map(([x, l]) => `${x} ${l}`).join(', ') : 'no tasks yet';
}

// ---------- activity ----------
const EVENT_WORD = { added: 'Task added', started: 'Started', iteration: 'Iteration', criteria: 'Criteria', suite: 'Full suite', 'review-started': 'Review started', reviewed: 'Reviewed', done: 'Finished', review: 'Ready for review', 'needs-you': 'Needs you', stalled: 'Stalled', failed: 'Failed', approved: 'Approved', answered: 'Answered', gate: 'Gate', 'gate-request': 'Gate requested', audit: 'Audit', 'audit-started': 'Audit started', 'finding-confirmed': 'Drift confirmed', 'finding-dismissed': 'Finding dismissed', 'criterion-draft': 'Criterion drafted', 'criterion-approve': 'Criterion approved', 'criterion-accept': 'Criterion accepted', 'criterion-reject': 'Criterion rejected', ruling: 'Ruling', message: 'Message', requested: 'Request', 'test-touch': 'Tests changed', 'owner-review': 'Needs your judgement', trust: 'Gating', reporting: 'Reporting', autonomy: 'Shipping', lead: 'Lead', charter: 'Charter', demoted: 'Trust tightened', ownership: 'Out-of-bounds edit reverted', paced: 'Paused for plan limits', queued: 'Queued', project: 'Project' };
function eventLine(e, showProject = true) {
  const bad = /failed|stalled|FAIL|demoted|tampered|reverted/.test(`${e.type} ${e.msg}`);
  const good = /^(done|approved|criterion-accept|finding-confirmed)$/.test(e.type) || / pass|approve/.test(e.msg);
  return `<li><span>${st(bad ? 'needs-you' : good ? 'done' : 'queued')}</span>
    <span>${showProject ? `<span class="mono faint">${esc(e.id)}</span> ` : ''}<span class="ev-k">${esc(EVENT_WORD[e.type] || e.type.replace(/-/g, ' '))}</span> <span class="muted">${esc(e.msg)}</span></span>
    <span class="when">${esc(ago(e.ts))}</span></li>`;
}

function renderActivity() {
  $('app').innerHTML = `${topbar('<b>Activity</b>')}<div class="page"><ul class="timeline">${state.events.slice(0, 120).map(e => eventLine(e)).join('') || '<div class="empty">No activity yet</div>'}</ul></div>`;
}

// ---------- project (Vercel) ----------
async function renderProject(alias, tab, sub) {
  const p = await get(`/api/project/${encodeURIComponent(alias)}`);
  const a = esc(p.alias);
  const own = state.queue.filter(q => q.project === p.alias);
  const step = nextStep(p, own);
  const idx = PHASES.indexOf(p.phase);
  const n = s => p.tasks.filter(t => t.status === s).length;
  const leadBtn = p.lead.running ? `<button class="btn ghost" data-do="lead-restart" data-project="${a}" title="Start a fresh lead session from its files">Restart lead</button>` : '';
  const tabs = [['overview', 'Overview'], ['tasks', 'Tasks', p.tasks.filter(t => !['done', 'failed'].includes(t.status)).length], ['criteria', 'Criteria', p.criteria.length],
    ['audits', 'Audits', p.findings.filter(f => f.status === 'open').length], ['docs', 'Docs'], ['activity', 'Activity'], ['settings', 'Settings']];
  const views = { overview: projOverview, tasks: projTasks, criteria: projCriteria, audits: projAudits, docs: projDocs, activity: projActivity, settings: projSettings };
  $('app').innerHTML = `${topbar(`<a href="#/projects">Projects</a><span>/</span><b>${a}</b>`, leadBtn)}
    <div class="page">
      <div class="phead"><h1>${a}</h1><span class="chip"><span class="pdot ${p.lead.running ? 'live' : ''}"></span>${p.lead.running ? `Lead on · talk to "${a} lead" in the Claude app` : 'Lead off'}</span></div>
      <div class="now">
        <div><div class="k">Now</div><div class="big">${step.title}</div><div class="txt">${step.detail}</div>${step.action ? `<div class="btns">${step.action}</div>` : ''}
          <div class="steps">${PHASES.map((ph, i) => `<span class="${i < idx ? 'done' : i === idx ? 'cur' : ''}">${ph}</span>`).join('')}</div></div>
        <div class="stats">
          <div class="stat"><div class="v">${n('running')}</div><div class="l">working now</div></div>
          <div class="stat"><div class="v">${own.length}</div><div class="l">waiting on you</div></div>
          <div class="stat"><div class="v">${p.metrics.criteriaTotal ? `${p.metrics.criteriaMet}<span class="faint">/${p.metrics.criteriaTotal}</span>` : '—'}</div><div class="l">criteria met</div></div>
          <div class="stat"><div class="v">${money(p.metrics.cost + (p.metrics.liveCost || 0))}</div><div class="l">spent so far${p.metrics.liveCost ? ` (≈${money(p.metrics.liveCost)} in progress)` : ''}</div></div>
        </div>
      </div>
      <nav class="tabs">${tabs.map(([k, l, c]) => `<a href="#/p/${a}/${k}" class="${k === tab ? 'on' : ''}">${l}${c ? `<span class="n">${c}</span>` : ''}</a>`).join('')}</nav>
      <div id="tab">${(views[tab] || projOverview)(p, sub)}</div>
    </div>`;
}

// One plain sentence about what happens next.
function nextStep(p, own) {
  const a = esc(p.alias);
  const start = `<button class="btn primary" data-do="lead-start" data-project="${a}">Start lead</button>`;
  if (p.charter?.tampered) return { title: 'Your charter changed after you approved it', detail: 'Read it in Docs and approve it again if the change is yours.', action: `<a class="btn" href="#/p/${a}/docs/charter">Open charter</a>` };
  if (own.length) return { title: `${own.length} decision${own.length > 1 ? 's' : ''} waiting on you`, detail: 'The team keeps going on anything that doesn\'t depend on them.', action: `<a class="btn primary" href="#/inbox/${encodeURIComponent(own[0].key)}">Review ${own.length > 1 ? 'first' : 'it'}</a>` };
  if (!p.lead.running && p.phase !== 'build') return { title: 'Start the lead, then brief it', detail: `Then open "${a} lead" in the Claude app and describe what you want. It drafts your charter and brings it back here.`, action: start };
  if (!p.charter && p.phase !== 'build') return { title: 'Brief the lead', detail: `Open "${a} lead" in the Claude app. Talk it through, or let it interview you.` };
  const phaseText = { brief: 'The lead is shaping the brief with you.', spec: 'Requirements and acceptance criteria are being written.', design: 'The designer is working on the look and flows.', contracts: 'The interfaces between parts are being drafted.' };
  if (phaseText[p.phase]) return { title: `${p.phase[0].toUpperCase()}${p.phase.slice(1)} in progress`, detail: phaseText[p.phase] + ' It comes to you for approval.', action: p.lead.running ? '' : start };
  const n = s => p.tasks.filter(t => t.status === s).length;
  if (n('running') || n('queued')) return { title: 'The team is building', detail: `${n('running')} working, ${n('queued')} queued. Nothing needs you.` };
  if (p.tasks.length) return { title: 'All current work is finished', detail: p.lead.running ? 'Tell the lead what\'s next.' : 'Start the lead to plan what\'s next.', action: p.lead.running ? '' : start };
  return { title: 'Waiting for the lead to plan the build', detail: 'Task plans come here for your approval.', action: p.lead.running ? '' : start };
}

function taskRow(t, { project = false } = {}) {
  const s = taskStatus(t);
  return `<a class="item ${s === 'needs-you' ? 'urgent' : ''}" href="#/t/${esc(t.id)}">
    ${st(s, STATUS_WORD[s] || s)}<span class="id">${esc(t.id)}</span>
    <span class="t">${esc(t.title)}<small>${s === 'running' && t.now ? esc(t.now) : `${esc(t.role || 'builder')}${project ? ` · ${esc(t.project)}` : ''}${t.reason && s !== 'done' ? ` · ${esc(t.reason)}` : ''}`}</small></span>
    <span class="r">${s === 'running' && t.eta ? `${t.iteration || 0}/${t.iterations} · ${t.eta.low}–${t.eta.high}m` : t.iteration ? `${t.iteration}/${t.iterations}` : ''}${(t.cost || t.liveCost) ? `<br>${money((t.cost || 0) + (t.liveCost || 0))}` : ''}</span></a>`;
}

function projOverview(p) {
  const own = state.queue.filter(q => q.project === p.alias);
  const active = p.tasks.filter(t => ['running', 'needs-you', 'queued', 'planned', 'review'].includes(t.status));
  return `
    ${own.length ? `<div class="sec">Waiting on you</div><div class="list">${own.map(x => `<a class="item urgent" href="#/inbox/${encodeURIComponent(x.key)}">${icon((KIND[x.kind] || ['inbox'])[0], 'st')}<span class="t">${esc(x.title)}<small>${(KIND[x.kind] || ['', x.kind])[1]}</small></span><span class="r">${esc(ago(x.at))}</span></a>`).join('')}</div>` : ''}
    <div class="sec">In progress</div>
    ${active.length ? `<div class="list">${active.map(t => taskRow(t)).join('')}</div>` : '<div class="hint">No active tasks.</div>'}
    <div class="sec">Recent</div>
    <ul class="timeline">${p.events.slice(0, 8).map(e => eventLine(e, false)).join('') || '<div class="hint">Nothing yet.</div>'}</ul>`;
}

const GROUPS = [['needs-you', 'Needs you'], ['running', 'Working'], ['review', 'In review'], ['queued', 'Queued'], ['planned', 'Waiting for your OK'], ['requested', 'Requests'], ['stalled', 'Stalled'], ['paused', 'Paused'], ['done', 'Done'], ['failed', 'Failed'], ['cancelled', 'Cancelled']];
function projTasks(p) {
  if (!p.tasks.length) return '<div class="empty"><b>No tasks yet</b>The lead plans tasks after your brief and spec are approved.</div>';
  return GROUPS.map(([s, label]) => {
    const list = p.tasks.filter(t => taskStatus(t) === s);
    return list.length ? `<div class="group">${st(s)} ${label}<span class="n">${list.length}</span></div><div class="list">${list.map(t => taskRow(t)).join('')}</div>` : '';
  }).join('');
}

const levelOf = c => c.level || (c.kind === 'owner' ? 'owner' : 'team');
function projCriteria(p) {
  if (!p.criteria.length) return '<div class="empty"><b>No acceptance criteria yet</b>You and the lead agree on a handful of outcomes during the spec phase. The lead turns them into technical checks.</div>';
  const row = c => `<div class="item" style="cursor:default">
    ${st(c.status)}<span class="id">${esc(c.id)}</span>
    <span class="t" style="white-space:normal">${esc(c.statement)}<small>${esc(c.status)} · serves ${esc(c.serves)}</small></span>
    ${c.status === 'draft' ? `<span class="btns"><button class="btn" data-do="criterion" data-verb="approve" data-project="${esc(p.alias)}" data-id="${esc(c.id)}">Approve</button></span>` : ''}
  </div>`;
  const live = c => !['retired'].includes(c.status);
  const mine = p.criteria.filter(c => levelOf(c) === 'owner' && live(c));
  const team = p.criteria.filter(c => levelOf(c) === 'team' && live(c));
  const met = team.filter(c => c.status === 'pass').length;
  return `<div class="sec">Your outcomes<span class="faint"> · what you'll judge the product by</span></div>
    ${mine.length ? `<div class="list">${mine.map(row).join('')}</div>` : '<div class="hint">None yet.</div>'}
    <details style="margin-top:18px"><summary class="sec" style="cursor:pointer">Team checks · ${met} of ${team.length} passing <span class="faint">(the lead approves these; the auditor checks them)</span></summary>
      <div class="list">${team.map(row).join('')}</div></details>`;
}

function projAudits(p) {
  const list = [...p.findings].reverse();
  const head = `<div class="btns" style="margin:14px 0"><button class="btn" data-do="audit" data-project="${esc(p.alias)}">Run audit now</button>
    <span class="hint">The auditor never sees the lead's plan. It checks the product against your own words and reports only to you.${p.lastAudit ? ` Last run ${esc(ago(p.lastAudit.at))} ago.` : ''}</span></div>`;
  if (!list.length) return head + '<div class="empty"><b>No findings</b>Audits run after each gate you approve, and daily while the team works.</div>';
  return head + `<div class="list">${list.map(f => `<details class="item" style="display:block;cursor:default"><summary style="display:flex;gap:10px;align-items:center;cursor:pointer;list-style:none">
      ${st(f.status === 'open' ? f.severity : f.status)}<span class="id">${esc(f.id)}</span><span class="t">${esc(f.claim)}<small>${esc(f.severity)} · ${f.reversibility === 'hard' ? 'hard to undo' : 'easy to undo'} · ${esc(f.status)}</small></span></summary>
      <div style="padding:8px 0 4px 24px">${md(`**Your words:** ${f.expected}\n\n**What the product does:** ${f.observed}\n\n**Evidence:** ${f.evidence}`)}
      ${f.status === 'open' ? `<div class="btns" style="margin-top:8px"><button class="btn primary" data-do="finding" data-verdict="confirm" data-project="${esc(p.alias)}" data-id="${esc(f.id)}">Confirm drift</button><button class="btn" data-do="finding" data-verdict="dismiss" data-project="${esc(p.alias)}" data-id="${esc(f.id)}">Dismiss</button></div>` : ''}</div></details>`).join('')}</div>`;
}

const DOCS = [['charter', 'Charter'], ['rulings', 'Rulings'], ['brief', 'Brief'], ['spec', 'Spec'], ['plan', "Lead's plan"], ['ledger', "Lead's ledger"], ['messages', 'Team messages']];
function projDocs(p, sub = 'charter') {
  const a = esc(p.alias);
  let body;
  if (sub === 'charter') {
    body = `<div class="btns" style="margin-bottom:10px"><span class="hint">${p.charter ? `Approved ${esc(ago(p.charter.approvedAt))} ago${p.charter.tampered ? ' · <span style="color:var(--red)">changed since</span>' : ''}.` : 'Not approved yet.'} Only you change this; every agent reads it.</span></div>
      <textarea class="code" id="charter-text">${esc(p.docs.charter)}</textarea>
      <div class="btns"><button class="btn" data-do="charter-save" data-project="${a}">Save</button></div>
      <div class="box decide"><div class="label">Approve in your own words</div><textarea id="d-text" placeholder="e.g. Yes, this is what I want built"></textarea><button class="btn primary" data-do="charter-approve" data-project="${a}">Approve charter</button></div>`;
  } else if (sub === 'rulings') {
    body = `${md(p.docs.rulings || 'No rulings yet.')}<div class="box"><div class="label">Add a ruling</div><textarea id="d-text" placeholder="e.g. No modal dialogs: edit inline"></textarea><button class="btn" data-do="ruling" data-project="${a}">Add ruling</button></div>`;
  } else if (sub === 'messages') {
    body = p.messages.length ? `<div class="hint" style="margin-bottom:8px">Specialists message each other directly. Nothing here binds anyone; decisions go through the lead.</div><ul class="timeline">${p.messages.map(m => `<li><span>${st('queued')}</span><span><span class="muted">${esc(m.fromRole || m.from)} → ${esc(m.to)} · ${esc(m.type)}</span><br>${esc(m.text)}</span><span class="when">${esc(ago(m.at))}</span></li>`).join('')}</ul>` : '<div class="hint">No messages yet.</div>';
  } else {
    body = md(p.docs[sub] || 'Empty.');
  }
  return `<div class="docs"><nav>${DOCS.map(([k, l]) => `<a href="#/p/${a}/docs/${k}" class="${k === sub ? 'on' : ''}">${l}</a>`).join('')}</nav><div>${body}</div></div>`;
}

function projActivity(p) {
  return `<ul class="timeline" style="margin-top:12px">${p.events.map(e => eventLine(e)).join('') || '<div class="hint">Nothing yet.</div>'}</ul>`;
}

function projSettings(p) {
  const a = esc(p.alias);
  const sel = (dial, value, options) => `<select data-dial="${dial}" data-project="${a}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const gates = ['brief', 'spec', 'design', 'contracts'];
  return `<div class="sec">How much you're involved</div>
    <dl class="kv">
      <dt>You approve</dt><dd><div class="btns">${gates.map(g => `<label class="tick"><input type="checkbox" data-gate="${g}" data-project="${a}" ${p.ownerGates.includes(g) ? 'checked' : ''}> ${g}</label>`).join('')}</div><div class="hint">Unticked phases are approved by the lead and logged. The auditor still checks after every phase. Your charter is always yours.</div></dd>
      <dt>What you read</dt><dd>${sel('summaryStyle', p.summaryStyle, [['plain', 'Plain: short, non-technical summaries'], ['technical', 'Technical: full detail']])}</dd>
      <dt>Gating</dt><dd>${sel('trust', p.trust, [['strict', 'Strict: approve every phase and task'], ['standard', 'Standard: approve phases'], ['loose', 'Loose: approve the brief only']])}</dd>
      <dt>Reporting</dt><dd>${sel('reporting', p.reporting, [['everything', 'Everything'], ['daily', 'Daily digest'], ['exceptions', 'Exceptions only']])}</dd>
      <dt>Shipping</dt><dd>${sel('autonomy', p.autonomy, [['merge', 'Straight to main after review'], ['pr', 'Draft PRs you merge'], ['branch', 'Local branches only']])}</dd>
      <dt>Earned trust</dt><dd>${p.suggestion ? `${esc(p.suggestion.dial)} → ${esc(p.suggestion.to)}: ${p.suggestion.ready ? '<b>earned</b>' : 'not yet'} <span class="hint">(${esc(p.suggestion.why)})</span>` : '—'}</dd>
    </dl>
    <div class="sec">Team</div>
    <div class="list">${p.roster.map(r => `<div class="item" style="cursor:default"><span class="t">${esc(r.role)}<small>${r.owns.length ? esc(r.owns.join(', ')) : 'read-only'}</small></span><span class="r">${esc(r.model || '')}</span></div>`).join('')}</div>
    <div class="sec">Lead</div>
    <div class="btns">${p.lead.running ? `<button class="btn" data-do="lead-restart" data-project="${a}">Restart fresh</button><button class="btn danger" data-do="lead-stop" data-project="${a}">Stop lead</button>` : `<button class="btn primary" data-do="lead-start" data-project="${a}">Start lead</button>`}</div>
    <div class="sec">Numbers</div>
    <dl class="kv"><dt>Your approvals</dt><dd>${p.metrics.approvals}</dd><dt>Overrules</dt><dd>${p.metrics.overrules}</dd><dt>Audit hit rate</dt><dd>${p.hit.confirmed}/${p.hit.judged} confirmed</dd><dt>Full test suite</dt><dd>${p.suite ? `<code>${esc(p.suite)}</code>` : '<span class="hint">not set (the lead sets it)</span>'}</dd><dt>Folder</dt><dd class="mono">${esc(p.repo)}</dd></dl>`;
}

// ---------- task (Cursor / Devin agent view) ----------
async function renderTask(id) {
  const t = await get(`/api/task/${encodeURIComponent(id)}`);
  const m = t.meta;
  const s = taskStatus(m);
  const crit = t.criteria || [];
  const right = m.status === 'planned' ? `<button class="btn primary" data-do="plan-approve" data-id="${esc(m.id)}">Approve plan</button>`
    : ['running', 'queued'].includes(m.status) ? `<button class="btn danger" data-do="task-stop" data-id="${esc(m.id)}">Stop</button>` : '';
  const evIcon = e => st(/failed|FAIL|stalled/.test(`${e.type} ${e.msg}`) ? 'needs-you' : e.type === 'done' || /pass|approve/.test(e.msg) ? 'done' : e.type === 'started' || e.type === 'iteration' ? 'running' : 'queued');
  $('app').innerHTML = `${topbar(`${m.project ? `<a href="#/p/${esc(m.project)}/tasks">${esc(m.project)}</a><span>/</span>` : ''}<b>${esc(m.id)}</b>`, right)}
    <div class="page"><div class="task">
      <div>
        <div class="muted" style="display:flex;gap:8px;align-items:center">${st(s)} ${STATUS_WORD[s] || s}${m.reason ? ` · ${esc(m.reason)}` : ''}</div>
        <h1 style="font-size:20px;font-weight:600;margin:6px 0 4px">${esc(m.title)}</h1>
        ${m.status === 'needs-you' ? `<div class="box decide"><div class="label">The agent needs you</div>${md(t.questions.split(/^## /m).slice(-1)[0] || m.reason)}<textarea id="d-text" placeholder="Your answer"></textarea><button class="btn primary" data-do="answer" data-id="${esc(m.id)}">Send answer</button></div>` : ''}
        <div class="sec">Timeline</div>
        <ul class="timeline">${t.timeline.map(e => `<li><span>${evIcon(e)}</span><span><span class="ev-k">${esc(EVENT_WORD[e.type] || e.type.replace(/-/g, ' '))}</span> <span class="muted">${esc(e.msg)}</span></span><span class="when">${esc(ago(e.ts))}</span></li>`).join('') || '<div class="hint">Not started yet.</div>'}</ul>
        ${t.review ? `<div class="sec">Review</div><div class="box">${md(t.review)}</div>` : ''}
        ${t.progress ? `<details open data-auto><summary class="sec" style="cursor:pointer">Progress notes</summary>${md(t.progress)}</details>` : ''}
        ${t.decisions && t.decisions.split('\n').length > 2 ? `<details><summary class="sec" style="cursor:pointer">Decisions made without you</summary>${md(t.decisions)}</details>` : ''}
        <details><summary class="sec" style="cursor:pointer">Brief</summary>${md(t.body)}</details>
        ${t.lastCheck ? `<details><summary class="sec" style="cursor:pointer">Last check output</summary><pre class="raw">${esc(t.lastCheck)}</pre></details>` : ''}
      </div>
      <aside>
        <dl class="props">
          <dt>Status</dt><dd>${st(s)} ${STATUS_WORD[s] || s}</dd>
          <dt>Role</dt><dd>${esc(m.role || 'builder')}</dd>
          <dt>Progress</dt><dd>${esc(m.iteration || 0)} of ${esc(m.iterations)} iterations</dd>
          <dt>Acceptance criteria</dt><dd>${crit.length ? crit.map(c => `<div class="check-row">${st(c.status)}<span>${esc(c.id)} · ${esc(c.statement)}</span></div>`).join('') : '<span class="hint">none cited</span>'}</dd>
          <dt>Done when</dt><dd><code>${esc(m.check)}</code></dd>
          ${m.files ? `<dt>Owns</dt><dd class="mono">${esc(m.files)}</dd>` : ''}
          ${m.test_touch ? `<dt>Flagged</dt><dd style="color:var(--red)">changed existing tests: ${esc(m.test_touch)}</dd>` : ''}
          ${m.pr ? `<dt>Pull request</dt><dd><a href="${esc(m.pr)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(m.pr.replace(/^https:\/\/github.com\//, ''))}</a></dd>` : ''}
          <dt>Spend</dt><dd>$${Number(m.cost_usd || 0).toFixed(2)} API-equivalent</dd>
        </dl>
      </aside>
    </div></div>`;
}

// ---------- new project ----------
function renderNew() {
  $('app').innerHTML = `${topbar('<a href="#/projects">Projects</a><span>/</span><b>New project</b>')}
    <div class="page"><form id="new-form" class="form">
      <div class="f"><label for="nf-name">Name</label><input type="text" id="nf-name" name="name" placeholder="Pocket Garden" required autocomplete="off"></div>
      <div class="f"><label for="nf-desc">One line about it <span class="faint">(optional)</span></label><input type="text" id="nf-desc" name="description" placeholder="A tiny idle game about growing a garden"></div>
      <fieldset><legend>Team</legend>
        <label class="opt"><input type="radio" name="roster" value="pair"><div><b>Pair</b><span>Builder + reviewer. Small apps and quick ideas.</span></div></label>
        <label class="opt"><input type="radio" name="roster" value="team" checked><div><b>Team</b><span>Designer, frontend, backend, reviewer. Web apps.</span></div></label>
        <label class="opt"><input type="radio" name="roster" value="game"><div><b>Game</b><span>Game designer, gameplay, systems, reviewer.</span></div></label>
      </fieldset>
      <fieldset><legend>Shipping</legend>
        <label class="opt"><input type="radio" name="ship" value="merge" checked><div><b>Straight to main</b><span>After checks and review pass. For your own projects.</span></div></label>
        <label class="opt"><input type="radio" name="ship" value="pr"><div><b>Draft PRs</b><span>You merge each one. For client work.</span></div></label>
      </fieldset>
      <label class="tick"><input type="checkbox" name="github" checked> Private GitHub repo</label>
      <label class="tick"><input type="checkbox" name="startLead" checked> Start the lead now</label>
      <div class="btns" style="margin-top:18px"><button class="btn primary" type="submit">Create project</button><a class="btn ghost" href="#/inbox">Cancel</a></div>
    </form></div>`;
  $('new-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating…';
    const r = await act({ action: 'project-create', name: f.get('name'), description: f.get('description'), roster: f.get('roster'), ship: f.get('ship'), github: f.get('github') === 'on', startLead: f.get('startLead') === 'on' }, 'Project created');
    if (r && r.alias) location.hash = `#/p/${encodeURIComponent(r.alias)}/overview`;
    else { btn.disabled = false; btn.textContent = 'Create project'; }
  });
}

// ---------- markdown (escaped first, so agent-written text can't inject markup) ----------
function md(src) {
  const lines = esc(src || '').replace(/&lt;!--[\s\S]*?--&gt;/g, '').split('\n');
  const inline = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_(?=[\s).,]|$)/g, '$1<em>$2</em>');
  let html = '', list = null, code = false, para = [];
  const endPara = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>`; para = []; } };
  const endList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith('```')) { endPara(); endList(); html += code ? '</pre>' : '<pre class="code">'; code = !code; continue; }
    if (code) { html += l + '\n'; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { endPara(); endList(); html += `<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`; continue; }
    if ((m = l.match(/^\s*[-*]\s+(?:\[( |x)\]\s+)?(.*)/))) { endPara(); if (list !== 'ul') { endList(); html += '<ul>'; list = 'ul'; } html += `<li>${m[1] === 'x' ? '☑ ' : m[1] === ' ' ? '☐ ' : ''}${inline(m[2])}</li>`; continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { endPara(); if (list !== 'ol') { endList(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; continue; }
    if (/^\|/.test(l)) { endPara(); endList(); if (/[a-z0-9]/i.test(l)) html += `<div class="tr">${l.split('|').slice(1, -1).map(c => `<span>${inline(c.trim())}</span>`).join('')}</div>`; continue; }
    if (!l.trim()) { endPara(); endList(); continue; }
    endList();
    para.push(l.trim());
  }
  endPara(); endList();
  if (code) html += '</pre>';
  return `<div class="md">${html}</div>`;
}

// ---------- login ----------
function renderLogin() {
  const failed = location.search.includes('login=failed');
  $('side').style.display = 'none';
  $('tabbar').style.display = 'none';
  document.querySelector('.shell').style.display = 'block';
  $('app').innerHTML = `<form class="login" method="post" action="/login">
    <img src="icon.svg" width="28" height="28" alt="">
    <h1>Sign in to Atelier</h1>
    <p>Paste the access token from <code>atelier open</code>. You only do this once per device.</p>
    ${failed ? '<p style="color:var(--red)">That token didn\'t match.</p>' : ''}
    <input type="password" name="token" autocomplete="current-password" aria-label="Access token" required autofocus>
    <button class="btn primary" type="submit">Sign in</button>
  </form>`;
}

// ---------- actions ----------
const leaveInbox = ok => { if (ok && location.hash.startsWith('#/inbox/')) location.hash = '#/inbox'; };
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-do]');
  if (!b) return;
  const d = b.dataset;
  const text = ($('d-text')?.value || '').trim();
  b.disabled = true;
  try {
    switch (d.do) {
      case 'gate-approve': if (!text) return toast('Write your approval in your own words first'); leaveInbox(await act({ action: 'gate-approve', project: d.project, phase: d.phase, quote: text }, `${d.phase} approved`)); break;
      case 'gate-skip': if (!text) return toast('Say why you\'re skipping this phase'); leaveInbox(await act({ action: 'gate-skip', project: d.project, phase: d.phase, quote: text }, `${d.phase} skipped`)); break;
      case 'criterion': if (d.verb === 'reject' && !text) return toast('Say what\'s wrong, so it can become a ruling'); leaveInbox(await act({ action: 'criterion', project: d.project, id: d.id, verb: d.verb, note: text }, `${d.id} ${d.verb === 'accept' ? 'accepted' : d.verb + 'd'}`)); break;
      case 'criteria-all': leaveInbox(await act({ action: 'criteria-approve-all', project: d.project, ids: d.ids }, 'Outcomes approved')); break;
      case 'plan-approve': leaveInbox(await act({ action: 'plan-approve', id: d.id }, 'Approved. Work starts now')); break;
      case 'answer': if (!text) return toast('Write an answer first'); leaveInbox(await act({ action: 'answer', id: d.id, text }, 'Answer sent; the task resumes')); break;
      case 'finding': leaveInbox(await act({ action: 'finding', project: d.project, id: d.id, verdict: d.verdict, note: text }, d.verdict === 'confirm' ? 'Drift confirmed' : 'Dismissed')); break;
      case 'dial': await act({ action: 'dial', project: d.project, dial: d.dial, value: d.value }, `${d.dial} → ${d.value}`); break;
      case 'audit': await act({ action: 'audit', project: d.project }, 'Audit started; findings arrive in a few minutes'); break;
      case 'lead-start': await act({ action: 'lead-start', project: d.project }, 'Lead starting in a terminal window on this PC'); break;
      case 'lead-restart': if (confirm('Restart the lead fresh from its files?')) await act({ action: 'lead-restart', project: d.project }, 'Lead restarting'); break;
      case 'lead-stop': if (confirm('Stop the lead session?')) await act({ action: 'lead-stop', project: d.project }, 'Lead stopped'); break;
      case 'task-stop': if (confirm('Stop this task? You can resume it later.')) await act({ action: 'task-stop', id: d.id }, 'Task stopped'); break;
      case 'charter-save': await act({ action: 'charter-save', project: d.project, text: $('charter-text').value }, 'Charter saved'); break;
      case 'charter-approve': if (!text) return toast('Approve in your own words'); await act({ action: 'charter-approve', project: d.project, quote: text }, 'Charter approved'); break;
      case 'ruling': if (!text) return toast('Write the ruling first'); await act({ action: 'ruling', project: d.project, text }, 'Ruling added'); break;
    }
  } finally { b.disabled = false; }
});

document.addEventListener('change', e => {
  const g = e.target.closest('input[data-gate]');
  if (g) {
    const list = [...document.querySelectorAll(`input[data-gate][data-project="${CSS.escape(g.dataset.project)}"]`)].filter(x => x.checked).map(x => x.dataset.gate);
    return act({ action: 'dial', project: g.dataset.project, dial: 'ownerGates', value: list.join(',') }, list.length ? `You approve: ${list.join(', ')}` : 'All phases delegated to the lead');
  }
  const s = e.target.closest('select[data-dial]');
  if (s) act({ action: 'dial', project: s.dataset.project, dial: s.dataset.dial, value: s.value }, 'Saved');
});

// Refresh every 15 seconds while visible; never while the owner is typing or reading an open finding.
setInterval(() => {
  if (document.hidden || !state) return;
  const el = document.activeElement;
  if (el && ['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) return;
  if (document.querySelector("details[open]:not([data-auto])")) return;
  refresh().catch(() => {});
}, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && state) refresh().catch(() => {}); });

refresh().catch(() => {});
