// Atelier dashboard. Plain JS, no build step, hash routes:
//   #/inbox[/<key>]  #/office  #/activity  #/projects  #/new  #/settings
//   #/p/<project>/<tab>[/<doc>]   tabs: overview tasks criteria audits docs activity settings
//   #/t/<task>
// The shell (sidebar ≥ 1280, 64 px rail 768–1279, top bar + tab bar < 768), the sign in page and the Inbox follow
// atelier/design/screens2 (D6) and the Flow feel (design/feel/shared/inbox.js); the other screens are the old ones
// inside the new shell until slices 2 and 3 rebuild them. Every count and money figure comes from the server's one
// summary (overview.summary); screens never add lists up themselves.
// Everything agents write is untrusted text: esc() it, or render it through md() (which escapes first).
const $ = id => document.getElementById(id);
let state = null;          // the last /api/overview
let loadedVersion = null;
let failedAt = 0;          // the last refresh that failed (the page is stale until one succeeds)
let lastOk = 0;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = iso => {
  const t = Date.parse(iso); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
const PHASES = ['brief', 'spec', 'design', 'contracts', 'build'];
const resetIn = sec => { const m = Math.round((sec * 1000 - Date.now()) / 60000); return m <= 0 ? 'now' : m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h ${m % 60} min`; };
const money = n => `$${(n || 0).toFixed(2)}`;
const hhmm = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ---------- icons (the design's set, atelier/design/icons.js, as one inline sprite) ----------
const ICON = {
  inbox: '<path d="M3.5 13h4.2l1.6 2.6h5.4l1.6-2.6h4.2"/><path d="M5.8 5.6h12.4l2.3 7.4v5.2a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3V13z"/>',
  office: '<path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M9.5 20v-5.5h5V20"/><path d="M3 20h18"/>',
  projects: '<path d="M3.5 7.2c0-.9.7-1.7 1.7-1.7h4l2 2.2h7.6c.9 0 1.7.7 1.7 1.7v8.4c0 .9-.7 1.7-1.7 1.7H5.2c-.9 0-1.7-.7-1.7-1.7z"/>',
  activity: '<path d="M3 12h4l2.5-6.5 5 13 2.5-6.5h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
  'chevron-left': '<path d="M14.5 6 8.5 12l6 6"/>',
  'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
  external: '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M17.5 14v4.2c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3V7.8c0-.7.6-1.3 1.3-1.3H10"/>',
  play: '<path d="M8 5.8v12.4c0 .6.7 1 1.2.7l9.6-6.2c.5-.3.5-1 0-1.3L9.2 5.1c-.5-.3-1.2.1-1.2.7z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  alert: '<path d="M12 4.2 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17h.01"/>',
  design: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17M9 9v10.5"/>',
  question: '<path d="M5.5 18.5 4 21l3.6-1.6c1.3.6 2.8 1 4.4 1 4.7 0 8.5-3.4 8.5-7.7S16.7 5 12 5 3.5 8.4 3.5 12.7c0 2.2 1 4.2 2 5.8z"/><path d="M10 10.6a2 2 0 1 1 2.9 1.8c-.6.3-.9.8-.9 1.4v.3M12 16.6h.01"/>',
  proof: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
  finding: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/><path d="M10.5 7.8v3M10.5 13.2h.01"/>',
  budget: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.2c-.4-.9-1.4-1.4-2.6-1.4-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2.1c1.8.4 2.8 1 2.8 2.2s-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.8-1.6M12 6.2v1.6M12 16.2v1.6"/>',
  plan: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="m4 6.5 1.2 1.2L7.4 5.4M4 12l1.2 1.2 2.2-2.3"/><circle cx="5.5" cy="17.5" r="1.2"/>',
  outcome: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  screen: '<rect x="3" y="4.5" width="18" height="12" rx="1.6"/><path d="M9 20h6M12 16.5V20"/>',
  blocked: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  log: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5M9 12h7M9 15.5h7M9 19h4"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 4.5v4.2h-4.2"/>',
  // the old screens' extra glyphs, until slices 2 and 3 replace them
  gate: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
  doc: '<path d="M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 16h6"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.5M12 16.8v.3"/>',
  dial: '<path d="M5 7h9M18 7h1M5 17h3M12 17h7"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  back: '<path d="M14.5 6 8.5 12l6 6"/>',
};
document.body.insertAdjacentHTML('afterbegin', `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${Object.entries(ICON).map(([k, v]) =>
  `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('')}</svg>`);
const I = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

// The N1 mark (design/brand/r2/marks.js): the arched window and the patch of light it throws. Its small cut is used at 20 px and under.
const markN1 = (size = 20) => {
  const W1 = 'M8.5 22V11.5a7.5 7.5 0 0 1 15 0V22z';
  const body = size <= 20
    ? `<path d="${W1}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M16 4v18" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M7 24.5h17l5 6.5H12z" style="fill:var(--brand-accent)"/>`
    : `<path d="${W1}" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linejoin="round"/><path d="M16 4v18M8.5 13.5h15" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 24.5h15l5 6h-15z" style="fill:var(--brand-accent)"/>`;
  return `<svg class="lg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${body}</svg>`;
};
const lockup = (size = 20) => `<span class="lockup">${markN1(size)}<span class="wm">Atelier</span></span>`;

// ---------- theme and motion ----------
// Dark on first run everywhere (ruling R-7). After that a phone follows the device's setting; a desktop stays dark.
// The owner's own pick in Settings (dark, light, follow the device) overrides both. The tokens never guess.
const ROOT = document.documentElement;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
const firstRun = !store.get('atelier-seen');
store.set('atelier-seen', '1');
const isPhone = () => matchMedia('(max-width: 767px)').matches;
function applyTheme() {
  const pick = store.get('atelier-theme'); // dark | light | device | null
  const device = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const theme = pick === 'dark' || pick === 'light' ? pick : pick === 'device' ? device : !firstRun && isPhone() ? device : 'dark';
  ROOT.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#edf0f3' : '#0b0e12');
}
applyTheme();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (RM) ROOT.dataset.motion = 'reduce';
const shot = new URLSearchParams(location.search).has('shot'); // full-page screenshots: sticky bars sit in flow
if (shot) ROOT.classList.add('is-shot');

// Linear-style status glyphs for the old screens: outline = not started, half = in progress, filled = finished.
function st(status, title = status) {
  const c = { lilac: 'var(--lilac)', red: 'var(--red)', green: 'var(--green)', muted: 'var(--faint)', fg: 'var(--fg2)', on: 'var(--surface)' };
  const svg = inner => `<svg class="st" viewBox="0 0 14 14" aria-label="${esc(title)}" role="img">${inner}</svg>`;
  switch (status) {
    case 'planned': case 'draft': case 'requested': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.muted}" stroke-width="1.5" stroke-dasharray="1.6 1.8"/>`);
    case 'queued': case 'approved': case 'open': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.fg}" stroke-width="1.5"/>`);
    case 'running': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.lilac}" stroke-width="1.5"/><path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="${c.lilac}"/>`);
    case 'review': case 'awaiting-owner': return svg(`<circle cx="7" cy="7" r="5.5" fill="none" stroke="${c.lilac}" stroke-width="1.5"/><path d="M7 3.5a3.5 3.5 0 1 1-3.5 3.5H7z" fill="${c.lilac}"/>`);
    case 'done': case 'pass': case 'accepted': case 'confirmed': return svg(`<circle cx="7" cy="7" r="6.2" fill="${c.green}"/><path d="M4.3 7.2l1.9 1.9 3.6-3.8" fill="none" stroke="${c.on}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    case 'needs-you': case 'fail': case 'stalled': case 'high': return svg(`<circle cx="7" cy="7" r="6.2" fill="${c.red}"/><path d="M7 3.8v3.6M7 9.8v.2" stroke="${c.on}" stroke-width="1.6" stroke-linecap="round"/>`);
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
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (j?.stale) refreshSoon();
  return j;
}

// The server answered from an old build and is rebuilding it: ask again now, and the server answers when
// the rebuild is ready (not on the next 15 s tick).
function refreshSoon() {
  if (refreshSoon.timer || refreshSoon.tries >= 5) return; // a few tries per 15 s refresh, in case a rebuild keeps failing
  refreshSoon.tries = (refreshSoon.tries || 0) + 1;
  refreshSoon.timer = setTimeout(() => {
    refreshSoon.timer = null;
    if (document.hidden || !state) return;
    if (busy()) return refreshSoon(); // don't redraw under the owner; check again later
    refresh(true).catch(() => {});
  }, 300);
}

// POST an action exactly as today: same names and arguments, X-Atelier on every POST.
async function post(body, opts = {}) {
  const r = await fetch('/api/action', { method: 'POST', credentials: 'same-origin', keepalive: !!opts.keepalive, headers: { 'Content-Type': 'application/json', 'X-Atelier': '1' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: 'Something went wrong' }));
  if (!r.ok || j.error) throw new Error(j.error || 'Something went wrong');
  return j.result ?? true;
}

// The old screens' actions: send at once, say so in a toast, redraw.
async function act(body, done = 'Done') {
  try {
    const r = await post(body);
    toast(done);
    await refresh();
    return r;
  } catch (e) {
    toast(/fetch|network/i.test(e.message) ? 'Couldn’t reach Atelier. Nothing was sent.' : e.message, { error: true });
    return null;
  }
}

let refreshing = null;
async function refresh(wait) {
  if (refreshing && !wait) return refreshing;
  refreshing = (async () => {
    try {
      const s = await get(`/api/overview${wait ? '?wait' : ''}`);
      if (wait && busy()) return refreshSoon(); // the owner started typing while we waited
      state = s; failedAt = 0; lastOk = Date.now();
      // A new version of the dashboard was installed: reload so the owner always sees the latest.
      if (loadedVersion && state.version && state.version !== loadedVersion && !Inbox.pending()) return location.reload();
      loadedVersion = loadedVersion || state.version;
      await route({ refreshing: true, wait });
    } catch (e) {
      if (e.message === 'signed out') throw e;
      failedAt = Date.now();
      await route({ refreshing: true });
      throw e;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

// ---------- the one summary, as the screens show it ----------
// Everything here is read from overview.summary. The one adjustment is the Inbox's own: a decision you just made
// (still inside its Undo window) has left the list, so it has left the counts too, on every screen at once.
function counts() {
  const s = state?.summary;
  if (!s) return null;
  const gone = Inbox.hiddenItems();
  const projects = {};
  for (const [a, p] of Object.entries(s.projects)) {
    const mine = gone.filter(x => x.project === a);
    projects[a] = { ...p, waiting: p.waiting - mine.length, needsNow: p.needsNow - mine.filter(x => x.needs).length };
  }
  return { ...s, waiting: s.waiting - gone.length, needsNow: s.needsNow - gone.filter(x => x.needs).length, decidedToday: s.decidedToday + Inbox.localDecided(), projects };
}

// ---------- shell: sidebar, rail, top bar, tab bar ----------
function place() {
  const [, kind, a] = (location.hash || '#/inbox').split('/');
  if (kind === 'p' && a) return decodeURIComponent(a);
  return kind || 'inbox';
}

function renderChrome() {
  const cur = place();
  const C = counts(), k = !!C;
  const P = (state?.projects || []).filter(p => !p.error);
  const n = v => (k && v ? v : '');
  const now = C ? { waiting: C.waiting, needs: C.needsNow, working: C.working } : {};
  const aria = c => (cur === c ? ' aria-current="page"' : '');
  const inboxLabel = k ? `Inbox, ${now.waiting} waiting${now.needs ? `, ${now.needs} need${now.needs === 1 ? 's' : ''} you now` : ''}` : 'Inbox';
  const pw = a => C?.projects[a]?.waiting || 0;
  const plan = C?.plan?.fiveHour;
  const atLimit = C?.atLimit || [];
  const limitLine = !P.length ? 'No projects yet' : atLimit.length ? `${atLimit.join(', ')} ${atLimit.length === 1 ? 'is' : 'are'} at ${atLimit.length === 1 ? 'its' : 'their'} daily limit` : 'Every project within its budget';
  const spent = k ? money(C.spentToday) : '–';
  $('side').innerHTML = `
    <a class="brand" href="#/inbox" aria-label="Atelier, Inbox">${lockup()}</a>
    <nav class="nav" aria-label="Places">
      <a class="nav-item" href="#/inbox"${aria('inbox')} aria-label="${inboxLabel}">${I('inbox')}Inbox<span class="count${now.needs ? ' is-needs' : ''}" data-count="waiting">${n(now.waiting)}</span></a>
      <a class="nav-item" href="#/office"${aria('office')} aria-label="Office${n(now.working) && `, ${now.working} working`}">${I('office')}Office<span class="count is-active">${n(now.working) && `${now.working} working`}</span></a>
      <a class="nav-item" href="#/activity"${aria('activity')}>${I('activity')}Activity</a>
    </nav>
    <nav class="nav" aria-label="Projects">
      <a class="nav-label" href="#/projects"${aria('projects')}>Projects</a>
      ${P.map(p => `<a class="nav-item" href="#/p/${esc(p.alias)}/overview"${aria(p.alias)} aria-label="${esc(p.alias)}${n(pw(p.alias)) && `, ${pw(p.alias)} waiting`}, lead ${p.lead?.running ? 'on' : 'off'}"><span class="dot${p.lead?.running ? ' dot-active' : ''}" role="img" aria-label="${p.lead?.running ? 'Lead on' : 'Lead off'}"></span>${esc(p.alias)}<span class="count">${n(pw(p.alias))}</span></a>`).join('')}
      <a class="nav-item" href="#/new"${aria('new')}>${I('plus')}New project</a>
    </nav>
    <div class="sidebar-foot">
      <div class="meter" title="Your whole Claude plan: this includes your own chats and Claude Code sessions, not just Atelier."><div class="meter-head"><span>Claude plan</span><b>${k && plan ? plan.used + '%' : '–'}</b></div><div class="meter-track${plan && plan.used >= 100 ? ' is-full' : ''}" role="img" aria-label="${k && plan ? `${plan.used}% of the 5-hour window used` : 'Plan use not known yet'}"><i style="--value:${k && plan ? Math.min(100, plan.used) : 0}%"></i></div><span class="meter-foot">${plan ? `5‑hour window · resets ${resetIn(plan.resetsAt)}` : 'Shows after the first run'}</span></div>
      <div class="meter"><div class="meter-head"><span>Spent today</span><b class="num">${spent}</b></div><span class="meter-foot">${esc(limitLine)}</span></div>
      <a class="nav-item" href="#/settings"${aria('settings')} style="margin:0 calc(-1 * var(--space-2))">${I('settings')}Settings</a>
    </div>`;
  $('rail').innerHTML = `
    <a class="brand" href="#/inbox" aria-label="Atelier, Inbox">${markN1(22)}</a>
    <a href="#/inbox" aria-label="${inboxLabel}"${aria('inbox')}>${I('inbox')}${n(now.waiting) && `<span class="rc${now.needs ? ' is-needs' : ''}">${now.waiting}</span>`}</a>
    <a href="#/office" aria-label="Office${k ? `, ${now.working} working` : ''}"${aria('office')}>${I('office')}${n(now.working) && `<span class="rc is-active">${now.working}</span>`}</a>
    <a href="#/activity" aria-label="Activity"${aria('activity')}>${I('activity')}</a>
    <hr>
    ${P.map(p => `<a href="#/p/${esc(p.alias)}/overview" aria-label="${esc(p.alias)}${n(pw(p.alias)) && `, ${pw(p.alias)} waiting`}, lead ${p.lead?.running ? 'on' : 'off'}"${aria(p.alias)}><span class="ini">${esc(p.alias.slice(0, 2))}</span><span class="dot${p.lead?.running ? ' dot-active' : ''}"></span></a>`).join('')}
    <a href="#/new" aria-label="New project"${aria('new')}>${I('plus')}</a>
    <a class="push" href="#/settings" aria-label="Settings${k && plan ? `, plan ${plan.used}% used` : ''}${k ? `, ${spent} spent today` : ''}"${aria('settings')}>${I('settings')}</a>`;
  $('top').innerHTML = `
    <a class="brand" href="#/inbox" aria-label="Atelier, Inbox">${lockup(20)}</a>
    <a class="spend" href="#/settings" aria-label="Spent today ${k ? spent : 'not known yet'}, plan settings">Today<b class="num">${spent}</b></a>
    <a class="gear" href="#/settings" aria-label="Settings">${I('settings')}</a>`;
  const tabIs = t => ((t === 'projects' ? ['projects', 'new', 't', ...P.map(p => p.alias)] : [t]).includes(cur) ? ' aria-current="page"' : '');
  $('tabs').innerHTML = `
    <a href="#/inbox"${tabIs('inbox')} aria-label="${inboxLabel}">${I('inbox')}Inbox${n(now.waiting) && `<span class="badge-n${now.needs ? '' : ' is-quiet'}" aria-hidden="true">${now.waiting}</span>`}</a>
    <a href="#/office"${tabIs('office')}>${I('office')}Office</a>
    <a href="#/projects"${tabIs('projects')}>${I('projects')}Projects</a>
    <a href="#/activity"${tabIs('activity')}>${I('activity')}Activity</a>`;
  const title = { inbox: 'Inbox', office: 'Office', activity: 'Activity', projects: 'Projects', new: 'New project', settings: 'Settings', t: 'Task' }[cur] || cur;
  document.title = `${k && now.waiting ? `(${now.waiting}) ` : ''}${title} · Atelier`; // the waiting count in the browser tab, as today
}

// The live line in the page head: how fresh the page is. Neutral always (DESIGN §5 states).
function liveLine() {
  if (!state) return '';
  if (failedAt) return `<span class="hf-live" role="status">${I('refresh')}Last updated ${hhmm(lastOk)} · Retrying</span>`;
  return `<span class="hf-live" data-live>Updated ${Date.now() - lastOk < 60_000 ? 'just now' : `at ${hhmm(lastOk)}`}</span>`;
}
setInterval(() => document.querySelectorAll('[data-live]').forEach(el => { el.textContent = `Updated ${Date.now() - lastOk < 60_000 ? 'just now' : `at ${hhmm(lastOk)}`}`; }), 30_000);

// A neutral, self-retrying error inside the page (never red: there is nothing for the owner to do).
const loadError = what => `<div class="hf-notice" role="alert">${I('refresh')}<span class="t">${esc(what)} didn’t load. Trying again in 15 s.<small>Your agents keep working while this page is away.</small></span><button class="btn btn-secondary btn-sm" type="button" data-try>Try now</button></div>`;

// ---------- routing ----------
const TAB_ORDER = ['inbox', 'office', 'projects', 'activity', 'settings'];
const tabOf = c => (TAB_ORDER.includes(c) ? c : c === 'new' || c === 't' || (state?.projects || []).some(p => p.alias === c) ? 'projects' : 'inbox');
let shownTab = null;
async function route({ refreshing = false, wait = false } = {}) {
  if (!state && !failedAt) return renderLoading();
  renderChrome();
  const [, kind, a, b, c] = (location.hash || '#/inbox').split('/');
  const tab = tabOf(place());
  const prev = shownTab;
  const moved = prev && prev !== tab && !refreshing;
  const draw = async () => {
    try {
      if (kind === 'inbox' || !kind) return Inbox.show(a ? decodeURIComponent(a) : null, { refreshing });
      Inbox.leave();
      if (!state) return renderPageError();
      if (kind === 'p' && a) return await renderProject(decodeURIComponent(a), b || 'overview', c, refreshing, wait);
      if (kind === 't' && a) return await renderTask(decodeURIComponent(a));
      if (kind === 'new') return renderNew();
      if (kind === 'projects') return renderProjects();
      if (kind === 'activity') return renderActivity();
      if (kind === 'office') return renderOffice();
      if (kind === 'settings') return renderSettings();
      return Inbox.show(null, { refreshing });
    } catch (e) {
      if (e.message !== 'signed out') legacy(`${topbar('<b>Error</b>')}<div class="page">${loadError('This page')}</div>`);
    }
  };
  shownTab = tab;
  // Switching screens: the new one slides in the way you went (Flow); reduced motion cross-fades once.
  if (moved && document.startViewTransition && !document.hidden) {
    const dir = TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(prev) ? 'fwd' : 'back';
    ROOT.dataset.vt = 'tab'; ROOT.dataset.dir = dir;
    const view = $('view'); if (view && !RM) view.style.viewTransitionName = 'page';
    const t = document.startViewTransition(async () => { await draw(); const v = $('view'); if (v && !RM) v.style.viewTransitionName = 'page'; });
    t.finished.catch(() => {}).finally(() => { delete ROOT.dataset.vt; delete ROOT.dataset.dir; const v = $('view'); if (v) v.style.removeProperty('view-transition-name'); });
    return t.updateCallbackDone.catch(() => {});
  }
  return draw();
}
window.addEventListener('hashchange', () => { if (!Inbox.ownsHash()) route(); });

// The page body: the Inbox draws into #view itself; the old screens draw into a .legacy wrapper.
function legacy(html) {
  let el = $('app');
  if (!el || !el.classList.contains('legacy')) { $('view').innerHTML = '<div class="legacy" id="app"></div>'; el = $('app'); }
  el.innerHTML = html;
}

function renderLoading() {
  renderChrome();
  if (!$('view')) return;
  // First load only: skeletons where the Inbox will be, counts hidden in the chrome (DESIGN §5).
  const sk = (w, h = 12) => `<span class="skeleton" style="width:${w};height:${h}px"></span>`;
  $('view').innerHTML = `<header class="page-head"><h1>${place() === 'inbox' ? 'Inbox' : 'Atelier'}</h1><span class="summary">Loading…</span></header>
    <div class="inbox" aria-busy="true"><section class="focus"><div class="focus-head">${sk('40%')}${sk('70%', 28)}${sk('55%', 28)}</div><div class="focus-body">${sk('90%', 14)}${sk('75%', 14)}<div class="frames is-hero"><div class="frame is-loading"><span class="frame-img"></span></div><div class="frame is-loading"><span class="frame-img"></span></div><div class="frame is-loading"><span class="frame-img"></span></div></div></div></section>
    <aside class="queue" aria-label="Waiting on you"><div class="queue-group">${Array.from({ length: 5 }, () => `<div class="qitem is-skeleton"><span class="skeleton" style="width:28px;height:28px"></span><span class="skeleton" style="height:12px;width:85%;margin-top:4px"></span><span></span><span class="qitem-meta"><span class="skeleton" style="height:10px;width:45%;margin-top:6px"></span></span></div>`).join('')}</div></aside></div>`;
}
function renderPageError() {
  legacy(`<div class="top"><div class="crumbs"><b>Atelier</b></div></div><div class="page">${loadError('This page')}</div>`);
}

const topbar = (crumbs, right = '') => `<div class="top"><div class="crumbs">${crumbs}</div><div class="spacer"></div>${right}${liveLine()}</div>`;

// =====================================================================================================
// Inbox: the Flow engine (design/feel/shared/inbox.js) on real data. One item large, the dock at the foot of the
// focus column, the queue in a quiet side column. Deciding: the dock shows it done in place (the hold), the item
// leaves and the next one arrives in one view transition, then a toast with Undo (6 s, paused while hovered or
// focused; Z). The decision is sent when that window closes, so Undo never needs a reverse action on the server.
// =====================================================================================================
const Inbox = (() => {
  const vt = (name, cls = '') => RM ? '' : ` style="view-transition-name:${name}${cls ? `;view-transition-class:${cls}` : ''}"`;
  const wide = () => matchMedia('(min-width: 1024px)').matches;
  const rowsMove = () => wide();
  const tok = v => parseFloat(getComputedStyle(ROOT).getPropertyValue(v)) || 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const S = { open: null, dock: 'ready', which: '', note: '', choice: '', items: [], hidden: new Map(), decided: [], ghost: null, active: false };
  // hidden: key → { x, i, body, r, committed } for decisions inside their Undo window or sent and not yet gone from the server's list
  let ownHash = false;

  const nums = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const longAgo = iso => {
    const t = Date.parse(iso); if (!t) return '';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    if (m < 1440) return `${Math.round(m / 60)} h ago`;
    const d = new Date(t);
    return m < 2880 ? 'yesterday' : m < 7 * 1440 ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const viewUrl = (port, p) => port && p ? `${location.protocol}//${location.hostname}:${port}${p}` : '';
  const frame = (url, cap, cls = '', play = '') => url
    ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="frame ${cls}" aria-label="${esc(cap)}, opens full size in a new tab">
        <span class="frame-img"><img src="${esc(url)}" alt="" decoding="async" loading="lazy" onerror="this.closest('.frame').classList.add('is-broken');this.parentNode.innerHTML='Couldn’t load this picture. Open it instead'">${play ? `<span class="play">${I('play')}${esc(play)}</span>` : ''}</span>
        <span class="frame-cap"><b>${esc(cap)}</b><span>Open ${I('external')}</span></span></a>` : '';
  const quote = (text, who) => `<blockquote class="quote" style="margin:0">${text}${who ? `<footer>${who}</footer>` : ''}</blockquote>`;
  const para = s => String(s || '').split(/\n\s*\n/)[0];
  const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // One Inbox item, from the server's queue entry: its words, the thing itself, and its dock. The dock's
  // actions are today's, with today's arguments (contracts rule 1).
  function item(q) {
    const a = q.project, A = esc(a);
    const base = { id: q.key, needs: !!q.needs, project: a, age: ago(q.at), ageLong: longAgo(q.at), title: q.title, q };
    const P = `#/p/${encodeURIComponent(a)}`;
    switch (q.kind) {
      case 'gate': {
        const r = q.review || {};
        const imgs = (r.images || []).map(im => ({ ...im, url: viewUrl(r.viewPort, im.url) })).filter(im => im.url);
        const more = Math.max(0, (r.imageCount || 0) - imgs.length);
        const docTab = PHASES.includes(q.phase) ? q.phase : 'brief';
        return { ...base, glyph: q.phase === 'design' ? 'design' : 'log', kind: `${cap1(q.phase)} gate`, short: `${q.phase} gate`,
          title: `The ${q.phase} for ${a} is ready for your OK`,
          body: () => `${q.detail ? `<p class="lede">${esc(para(q.detail).replace(/[*`]/g, ''))}</p>` : ''}
            ${imgs.length ? `<div class="frames is-hero">${imgs.map((im, i) => frame(im.url, im.caption, im.phone && i ? 'is-phone' : '')).join('')}${more && r.open ? `<a href="${esc(viewUrl(r.viewPort, r.open))}" target="_blank" rel="noopener" class="frame frame-more" aria-label="See all ${r.imageCount} pictures, opens in a new tab"><span class="frame-img"><b>+${more}</b>more</span><span class="frame-cap"><b>Everything else</b><span>Open ${I('external')}</span></span></a>` : ''}</div>` : ''}
            <div class="links">${r.open ? `<a href="${esc(viewUrl(r.viewPort, r.open))}" target="_blank" rel="noopener">${I('external')}Open the clickable screens</a>` : ''}<a href="${P}/docs/${docTab}">${I('log')}Read the ${esc(q.phase)} document</a></div>
            <details class="details"><summary>${I('chevron-down')}What’s in it</summary><div class="details-body">
              <span>${r.files || 0} file${r.files === 1 ? '' : 's'} for this phase${r.docName ? `, with <code>${esc(r.docName)}</code>` : ''}. ${r.merged ? 'They are on the main branch.' : 'Nothing is merged until you approve.'}</span>
              ${q.detail && q.detail.split(/\n\s*\n/).length > 1 ? `<div>${md(q.detail.split(/\n\s*\n/).slice(1).join('\n\n'))}</div>` : ''}</div></details>`,
          dock: { note: 'Approve in your own words, or say why you skip it', required: 'Say in a few words what you approve, or why you skip it. It goes to the team.', rejectNeedsNote: true,
            primary: `Approve ${q.phase}`, secondary: 'Skip this phase',
            send: (w, note) => w === 'secondary' ? { action: 'gate-skip', project: a, phase: q.phase, quote: note } : { action: 'gate-approve', project: a, phase: q.phase, quote: note },
            done: 'Approved. The lead carries on from here.', toast: `Approved the ${q.phase} for ${a}.`, log: `Approved the ${q.phase} for ${a}`,
            alt: { done: 'Skipped. The lead carries on without it.', toast: `Skipped the ${q.phase} phase for ${a}.`, log: `Skipped the ${q.phase} phase for ${a}` } } };
      }
      case 'budget': {
        const sp = q.split || {};
        const rows = [...(sp.tasks || []).map(t => [t.title, t.spent]), ['The lead', sp.lead], ['Audits', sp.audits]].filter(([, v]) => v > 0);
        const plan = state?.summary?.plan?.fiveHour;
        return { ...base, glyph: 'budget', kind: 'Budget', short: 'budget',
          title: `${a} used today’s ${money(q.limit).replace(/\.00$/, '')}, so new work is paused`,
          body: () => `<p class="lede">The work already running finishes its current try. Nothing new starts until you raise the limit, or until midnight.</p>
            <div class="meter" style="max-width:var(--measure)"><div class="meter-head"><span>Spent today on ${A}</span><b>${money(q.spent)} of ${money(q.limit).replace(/\.00$/, '')}</b></div><div class="meter-track is-full"><i style="--value:100%"></i></div></div>
            ${rows.length ? `<dl class="facts is-money">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="num">${money(v)}</dd>`).join('')}</dl>` : ''}
            <p class="faint" style="margin:0;font-size:var(--text-sm)">API‑equivalent cost, not a bill.${plan ? ` Your Claude plan is ${plan.used} % used.` : ''}</p>`,
          dock: { primary: `Raise today to $${q.to}`, ghost: 'Budget settings', ghostHref: `${P}/settings`, hint: 'Or do nothing: work starts again at midnight',
            send: () => ({ action: 'dial', project: a, dial: 'budgetDay', value: q.to }),
            done: `Raised to $${q.to}. Work starts again.`, toast: `Raised ${a}’s limit to $${q.to} for today.`, log: `Raised ${a}’s limit to $${q.to} for today` } };
      }
      case 'question': {
        const words = [q.context, q.rest].filter(Boolean).join('\n\n') || q.detail;
        return { ...base, glyph: 'question', kind: `Question from the ${q.role || 'team'}`, short: 'question',
          body: () => `${quote(md(words.replace(/\n\n\*From the .*\*$/, '')), `The ${esc(q.role || 'builder')}, working on: ${esc(q.taskTitle || '')}`)}
            ${q.options?.length ? `<fieldset class="choices" style="max-width:var(--measure)"><legend class="section-label" style="margin-bottom:var(--space-2)">Suggested answers</legend>${q.options.map((o, i) => `<label class="choice"><input type="radio" name="ans" value="${i}"${S.choice === String(i) ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</fieldset>` : ''}
            ${q.suggested ? `<p class="faint" style="margin:0;font-size:var(--text-sm)">What it will do if you don’t mind: ${esc(q.suggested)}</p>` : ''}`,
          dock: { note: q.options?.length ? 'Or write your own answer' : 'Your answer', required: 'Pick an answer or write your own. It goes to the agent.', needsAnswer: true,
            primary: 'Send answer', ghost: 'Open the task', ghostHref: `#/t/${encodeURIComponent(q.id)}`,
            send: (w, note, choice) => ({ action: 'answer', id: q.id, text: note || (q.options || [])[Number(choice)] || '' }),
            done: `Answered. The ${q.role || 'team'} carries on.`, toast: `Answered the ${q.role || 'team'}.`, log: `Answered: ${q.title}` } };
      }
      case 'owner-criterion': {
        const pr = q.proof;
        const pics = (pr?.files || []).map(f => ({ ...f, url: viewUrl(pr.viewPort, f.url) })).filter(f => f.url);
        return { ...base, glyph: 'proof', kind: 'Your judgement', short: 'your judgement',
          body: () => `<p class="lede">${pr?.notes ? `Shown working: ${esc(pr.notes.replace(/[*_`#]/g, ''))}` : 'Try it yourself, then say whether it holds.'}</p>
            ${pics.length ? `<div class="frames is-hero">${pics.slice(0, 3).map((f, i) => f.video ? `<a href="${esc(f.url)}" target="_blank" rel="noopener" class="frame" aria-label="Recording ${esc(f.name)}, opens in a new tab"><span class="frame-img"><video src="${esc(f.url)}" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover"></video><span class="play">${I('play')}Recording</span></span><span class="frame-cap"><b>Recording</b><span>Open ${I('external')}</span></span></a>` : frame(f.url, f.name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' '), /(390|360|phone)/i.test(f.name) && i ? 'is-phone' : '')).join('')}</div>` : ''}
            ${pr ? `<div class="links"><a href="#/t/${encodeURIComponent(pr.task)}">${I('log')}Open the task</a></div>` : ''}`,
          dock: { note: 'If you reject it, say what’s wrong', rejectNeedsNote: true, required: 'Say what’s wrong so the team can fix it.', primary: 'Accept', secondary: 'Reject',
            send: (w, note) => ({ action: 'criterion', project: a, id: q.id, verb: w === 'secondary' ? 'reject' : 'accept', note }),
            done: 'Accepted. Marked as met.', toast: 'Accepted the outcome.', log: `Accepted: ${q.title}`,
            alt: { done: 'Rejected. The team fixes it and asks again.', toast: 'Rejected the outcome.', log: `Rejected: ${q.title}` } } };
      }
      case 'finding':
        return { ...base, glyph: 'finding', kind: 'From the auditor', short: 'auditor finding',
          body: () => `<dl class="facts">
              ${q.impact ? `<dt>If nobody fixes it</dt><dd>${esc(q.impact)}</dd>` : ''}
              <dt>To change later</dt><dd>${q.reversibility === 'hard' ? 'Costly: it gets harder once more is built on it.' : 'Cheap: it can be changed later without much rework.'}</dd>
              <dt>How sure</dt><dd>${q.severity === 'high' ? 'Important: it goes against your own words.' : 'Worth a look.'}</dd>
            </dl>
            <details class="details"><summary>${I('chevron-down')}Technical details</summary><div class="details-body">${md(`**What you asked for:** ${q.expected || ''}\n\n**What the auditor found:** ${q.observed || ''}\n\n**Evidence:** ${q.evidence || ''}`)}</div></details>`,
          dock: { note: 'Add a note for the lead (optional)', primary: 'Yes, fix it', secondary: 'No, it’s fine',
            send: (w, note) => ({ action: 'finding', project: a, id: q.id, verdict: w === 'secondary' ? 'dismiss' : 'confirm', note }),
            done: 'Sent. The lead plans the fix.', toast: 'Asked the team to fix it.', log: `Asked the team to fix: ${q.title}`,
            alt: { done: 'Sent. The lead leaves it as it is.', toast: 'Told the lead it can stay.', log: `Kept as it is: ${q.title}` } } };
      case 'charter-tampered': {
        const ch = q.changes;
        return { ...base, glyph: 'log', kind: 'Charter changed', short: 'charter', title: `${a}’s charter changed after you approved it`,
          body: () => `<p class="lede">${A}’s charter was edited ${esc(longAgo(q.changedAt) || 'recently')}, after you approved it${q.approvedAt ? ` on ${esc(new Date(q.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}` : ''}. The team works from the new wording until you decide.</p>
            ${ch?.length ? ch.map(c => `<div class="diff" role="group" aria-label="What changed, under ${esc(c.section)}"><span class="diff-sec">${esc(c.section)}</span>${c.removed.map(l => `<p class="diff-old"><span class="sr-only">Removed: </span>${esc(l.replace(/^[-*]\s+/, ''))}</p>`).join('')}${c.added.map(l => `<p class="diff-new"><span class="sr-only">Added: </span>${esc(l.replace(/^[-*]\s+/, ''))}</p>`).join('')}</div>`).join('')
              : `<p class="faint" style="margin:0;font-size:var(--text-sm)">The wording you approved isn’t in the project’s history, so only the new text can be shown. Open the charter to read it.</p>`}
            ${ch?.length ? `<p class="faint" style="margin:0;font-size:var(--text-sm)">Changed ${esc(q.changedAt ? new Date(q.changedAt).toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : '')} in the project’s charter file. ${q.sectionsChanged === 1 ? 'One section changed' : `${q.sectionsChanged} sections changed`}; the rest is as you approved it.</p>` : ''}`,
          dock: { note: 'Approve in your own words', required: 'Say in a few words what you approve. It goes to the lead.', primary: 'Approve the new wording', ghost: 'Open the charter', ghostHref: `${P}/docs/charter`,
            send: (w, note) => ({ action: 'charter-approve', project: a, quote: note }),
            done: 'Approved. The charter stands as it is now.', toast: `Approved ${a}’s changed charter.`, log: `Approved ${a}’s changed charter` } };
      }
      case 'charter':
        return { ...base, glyph: 'log', kind: 'Charter to approve', short: 'charter', title: `${a}’s charter is ready for you to approve`,
          body: () => `<p class="lede">The lead drafted it from your brief. Read it here; approve it in your own words, or open it to change anything that isn’t in your words.</p>
            ${q.text ? `<div class="doc">${md(q.text.replace(/^# .*\n/, ''))}</div>` : ''}`,
          dock: { note: 'Approve in your own words', required: 'Say in a few words what you approve. It goes to the lead.', primary: 'Approve charter', ghost: 'Edit it', ghostHref: `${P}/docs/charter`,
            send: (w, note) => ({ action: 'charter-approve', project: a, quote: note }),
            done: 'Approved. The lead plans the next step.', toast: 'Approved the charter.', log: `Approved the charter for ${a}` } };
      case 'screen-notice':
        return { ...base, glyph: 'screen', kind: 'Notice', short: 'notice',
          body: () => `<p class="lede">${q.closed ? `The ${esc(q.role)} opened a window on your screen without asking. Atelier closed it straight away and told the agent to work without the screen.` : `The ${esc(q.role)} opened a window on your screen, as you allowed.`}</p>
            <dl class="facts"><dt>Who</dt><dd>The ${esc(q.role)}, ${A}</dd><dt>What it showed</dt><dd>${esc(q.app)}${q.windowTitle ? ` (“${esc(q.windowTitle)}”)` : ''}</dd>${q.count > 1 ? `<dt>How often</dt><dd>${esc(q.count)} times</dd>` : ''}<dt>When</dt><dd>${esc(longAgo(q.at))}</dd></dl>`,
          dock: { primary: 'Got it', send: () => ({ action: 'screen-seen', project: a, id: q.id }), done: 'Noted.', toast: 'Noted.', log: `Noted: ${q.title}` } };
      case 'screen':
        return { ...base, glyph: 'screen', kind: 'Screen use', short: 'screen use', title: `The ${q.role} asks to open a window on your screen`,
          body: () => `${quote(esc(q.why || ''), `The ${esc(q.role)}, working on: ${esc(q.taskTitle || '')}`)}
            <p class="lede">For about ${esc(q.minutes)} minute${q.minutes === 1 ? '' : 's'}. Nothing opens until you allow it, and Atelier closes the window when the time is up, whatever the agent is doing.</p>`,
          dock: { primary: `Allow for ${q.minutes} min`, secondary: 'Not now',
            send: w => ({ action: 'screen', project: a, id: q.id, verdict: w === 'secondary' ? 'decline' : 'allow' }),
            done: `Allowed for ${q.minutes} min.`, toast: `Allowed the ${q.role} your screen for ${q.minutes} min.`, log: 'Allowed screen use',
            alt: { done: `Declined. The ${q.role} works off screen.`, toast: 'Said not now.', log: 'Declined screen use' } } };
      case 'criterion':
        return { ...base, glyph: 'outcome', kind: 'Outcome to approve', short: 'outcome', title: `Approve an outcome: ${q.statement || q.title}`,
          body: () => `${quote(esc(q.statement || q.title), 'An outcome the lead wrote from your brief')}<p class="lede">If you approve it, the lead checks the work against it before calling anything done.</p>`,
          dock: { primary: 'Approve', secondary: 'Retire it',
            send: w => ({ action: 'criterion', project: a, id: q.id, verb: w === 'secondary' ? 'retire' : 'approve' }),
            done: 'Approved. The lead adds it to the checks.', toast: 'Approved the outcome.', log: `Approved an outcome: ${q.statement || q.title}`,
            alt: { done: 'Retired. The lead drops it from the checks.', toast: 'Retired the outcome.', log: `Retired an outcome: ${q.statement || q.title}` } } };
      case 'criteria': {
        const list = q.statements || [];
        return { ...base, glyph: 'outcome', kind: 'Outcomes to approve', short: 'outcomes', title: `Approve ${list.length} outcomes the lead wrote from your brief`,
          body: () => `<p class="lede">Each one is a sentence the lead checks before it calls the work done. Approve them together, or decide each on the project’s Criteria tab.</p><ol class="olist">${list.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`,
          dock: { primary: `Approve all ${list.length}`, ghost: 'Decide each', ghostHref: `${P}/criteria`,
            send: () => ({ action: 'criteria-approve-all', project: a, ids: q.id }),
            done: `Approved. The lead adds all ${list.length} to the checks.`, toast: `Approved ${list.length} outcomes.`, log: `Approved ${list.length} outcomes for ${a}` } };
      }
      case 'plan':
        return { ...base, glyph: 'plan', kind: 'Task plan', short: 'task plan', title: `Start a task: ${q.title}`,
          body: () => `<p class="lede">The ${esc(q.role)} works on it: up to ${esc(q.iterations)} tries${q.budgetLimit ? `, at most ${money(q.budgetLimit).replace(/\.00$/, '')}` : ''}. Read the brief for what it will change.</p>
            <details class="details"><summary>${I('chevron-down')}What it will be checked against</summary><div class="details-body"><span>${q.criteria ? `Outcomes ${esc(q.criteria)}.` : 'No outcomes cited yet.'}</span></div></details>`,
          dock: { primary: 'Approve plan', ghost: 'Read the brief', ghostHref: `#/t/${encodeURIComponent(q.id)}`,
            send: () => ({ action: 'plan-approve', id: q.id }),
            done: `Approved. The ${q.role} starts within a minute.`, toast: 'Approved the plan.', log: `Approved the plan: ${q.title}` } };
      case 'github':
        return { ...base, glyph: 'blocked', kind: 'Blocked', short: 'blocked', title: `${a}’s work isn’t reaching GitHub`,
          body: () => `<p class="lede">Atelier pushes finished work to GitHub on its own every couple of minutes, and it can’t right now, so the work stays on this PC. The lead has been told; if it’s about signing in to GitHub, that one is yours.</p>
            <details class="details"><summary>${I('chevron-down')}Technical details</summary><div class="details-body"><span>${esc(q.problem || '')}</span></div></details>`,
          dock: { hint: 'Nothing to decide here. This goes away by itself once a push works.' } };
      case 'dial':
        return { ...base, glyph: 'outcome', kind: 'Earned trust', short: 'gating', title: `${a}’s team has earned looser ${q.dial}`,
          body: () => `<p class="lede">The team has earned it: ${esc(q.why || '')}.</p>
            <dl class="facts"><dt>Now</dt><dd>${esc(cap1(String(q.current || '')))}</dd><dt>Would be</dt><dd>${esc(cap1(String(q.to || '')))}</dd><dt>Change back</dt><dd>Any time, in the project’s Settings</dd></dl>`,
          dock: { primary: `Loosen to ${q.to}`, ghost: 'Project settings', ghostHref: `${P}/settings`,
            send: () => ({ action: 'dial', project: a, dial: q.dial, value: q.to }),
            done: 'Loosened.', toast: `${a} is on ${q.to} ${q.dial} now.`, log: `Loosened ${a} to ${q.to} ${q.dial}` } };
      default:
        return { ...base, glyph: 'log', kind: cap1(q.kind), short: q.kind, body: () => md(q.detail || ''), dock: { hint: 'Open the project to act on this.' } };
    }
  }

  // Working now: the same busy agents the Office and the sidebar count (the server's team lists).
  function working() {
    const out = [];
    for (const p of state?.projects || []) for (const x of p.team?.agents || []) {
      if (!['working', 'reviewing', 'auditing'].includes(x.state)) continue;
      const c = x.live?.current;
      const who = x.kind === 'lead' ? 'lead' : x.reviewingFor ? 'reviewer' : x.who;
      const fig = x.audit?.checkers ? { n: x.audit.finished, of: x.audit.checkers, unit: 'checks' } : x.id && x.iterations ? { n: c?.n || x.iteration || 1, of: x.iterations, unit: 'try' } : null;
      out.push({ id: `${p.alias}-${x.id || x.kind}`, what: x.what, meta: `${p.alias} · ${who}`, when: c ? `${c.minutes} min in` : x.kind === 'auditor' ? (x.meta || '').replace(/ · .*/, '') : 'now', href: x.href || '', ...(fig || {}) });
    }
    return out;
  }
  const figure = a => a.unit === 'try' ? `try ${a.n} of ${a.of}` : `${a.n} of ${a.of} ${a.unit}`;

  // The list as the owner sees it: the server's queue, minus decisions made here that the server still lists.
  function sync() {
    const q = state?.queue || [];
    const keys = new Set(q.map(x => x.key));
    for (const [k, h] of S.hidden) if (h.committed && !keys.has(k)) S.hidden.delete(k); // the server has caught up
    S.decided = S.decided.filter(d => !(d.committed && !keys.has(d.id))); // from here on the server's own ledger lists it
    const prev = S.items;
    S.items = q.filter(x => !S.hidden.has(x.key)).map(item);
    // The open item is never swapped under you: if it went away elsewhere, it stays until you move on.
    if (S.open && !S.items.some(x => x.id === S.open) && !S.hidden.has(S.open)) {
      const was = (S.ghost?.id === S.open ? S.ghost : prev.find(x => x.id === S.open));
      if (was && S.active) S.ghost = was; else { S.ghost = null; S.open = null; }
    }
  }
  const list = () => S.ghost && !S.items.some(x => x.id === S.ghost.id) ? [...S.items, S.ghost] : S.items;
  const needsN = () => counts()?.needsNow ?? 0;
  const ledger = () => [...S.decided, ...(state?.decidedToday || []).map((d, i) => ({ what: d.what, project: d.project, age: ago(d.at), key: `s-${i}-${d.at}` }))];

  // ── markup ──
  function qitem(x) {
    const cur = x.id === S.open, t = !cur && tname(x.id);
    return `<a href="#/inbox/${encodeURIComponent(x.id)}" class="qitem" data-id="${esc(x.id)}" ${cur ? 'aria-current="true"' : ''}${rowsMove() ? vt(`q-${cssId(x.id)}`, 'row') : ''} aria-label="${esc(x.title)}. ${esc(x.project)}, ${esc(x.short)}${x.ageLong ? `, ${esc(x.ageLong)}` : ''}${x.needs ? '. Needs you now' : ''}">
      <span class="qitem-glyph">${I(x.glyph)}</span><span class="qitem-title"${t ? vt(t, 'title') : ''}>${esc(x.title)}</span>
      <span class="qitem-side">${x.needs ? '<span class="dot dot-needs" role="img" aria-label="Needs you now"></span>' : ''}<span class="qitem-age">${esc(x.age)}</span></span>
      <span class="qitem-meta">${esc(x.project)}<span class="sep"> · </span>${esc(x.short)}</span></a>`;
  }
  function agent(a, named) {
    const fig = a.of ? figure(a) : '';
    return `<a href="${esc(a.href || '#/office')}" class="agent" data-agent="${esc(a.id)}"${named && rowsMove() ? vt(`w-${cssId(a.id)}`, 'row') : ''} aria-label="${esc(a.what)}. ${esc(a.meta)}${fig ? `. ${fig}` : ''}"><span class="agent-dot"><span class="dot dot-active${failedAt ? '' : ' is-live'}" role="img" aria-label="Working"></span></span><span class="agent-what">${esc(a.what)}</span><span class="agent-meta">${esc(a.meta)} · <span class="when">${esc(a.when)}</span></span>${a.of ? `<span class="agent-progress"><span class="track"><i style="--v:${Math.min(1, a.n / a.of).toFixed(4)}"></i></span><span class="fig">${fig}</span></span>` : ''}</a>`;
  }
  function ledgerRows(rows) {
    return rows.map(r => { const t = r.id && tname(r.id); return `<a href="#/p/${encodeURIComponent(r.project)}/overview" class="ledger-row"${r.id ? ` data-lid="${esc(r.id)}"` : ''} aria-label="${esc(r.what)}. ${esc(r.project)}, ${r.age === 'now' ? 'just now' : `${esc(r.age)} ago`}"${(r.id || r.key) && rowsMove() ? vt(`l-${cssId(r.id || r.key)}`, 'row') : ''}>${I('check')}<span class="what"${t ? vt(t, 'title') : ''}>${esc(r.what)}</span><span class="qitem-age">${esc(r.age)}</span><span class="meta">${esc(r.project)}</span></a>`; }).join('');
  }
  function queue() {
    const L = list(), now = L.filter(x => x.needs), later = L.filter(x => !x.needs), D = ledger(), W = working(), C = counts();
    const g = n => rowsMove() ? vt(n, 'row') : '';
    return `<aside class="queue" aria-label="Waiting on you">
      ${now.length ? `<div class="queue-group"><div class="queue-head is-needs"${g('h-now')}><span>Needs you now</span><span class="n">${now.length}</span></div>${now.map(qitem).join('')}</div>` : ''}
      ${later.length ? `<div class="queue-group"><div class="queue-head"${g('h-later')}><span>When you have a minute</span><span class="n">${later.length}</span></div>${later.map(qitem).join('')}</div>` : ''}
      ${D.length ? `<div class="queue-group is-ledger"><div class="queue-head"${g('h-done')}><span>Decided today</span><span class="n">${C.decidedToday}</span></div><div class="ledger">${ledgerRows(D.slice(0, 3))}</div>${D.length > 3 ? `<a href="#/activity" class="ledger-more"${g('l-more')}>${D.length - 3} more today</a>` : ''}</div>` : ''}
      ${W.length ? `<div class="queue-group"><div class="queue-head"${g('h-work')}><span>Working now</span><span class="n">${C.working}</span></div>${W.map(a => agent(a, true)).join('')}</div>` : ''}
    </aside>`;
  }
  function dock(x) {
    const d = x.dock, st = S.dock, alt = S.which === 'secondary';
    if (S.ghost && x.id === S.ghost.id) return `<div class="dock is-sent" role="status"${vt('dock')}><div class="dock-row"><span class="dock-msg is-done"><span class="tick">${I('check')}</span>You decided this on another device.</span></div></div>`;
    if (st === 'sent') return `<div class="dock is-sent" role="status"${vt('dock')}><div class="dock-row"><span class="dock-msg is-done"><span class="tick">${I('check')}</span>${esc((alt && d.alt || d).done)}</span></div></div>`;
    const offline = !!failedAt, invalid = st === 'invalid';
    const dis = offline ? ' disabled' : '';
    const field = d.note ? `<textarea class="input" id="note" rows="1" aria-label="${esc(d.note)}" placeholder="${esc(d.note)}"${invalid ? ' aria-invalid="true" aria-describedby="noteErr"' : ''}>${esc(S.note)}</textarea>` : '';
    const err = invalid ? `<span class="field-error" id="noteErr">${I('alert')}${esc(d.required || 'Say what’s wrong so the team can fix it.')}</span>` : '';
    const primary = d.primary ? `<button class="btn btn-primary" data-act="primary"${dis}><span class="lbl">${esc(d.primary)}</span></button>` : '';
    const second = d.secondary ? `<button class="btn btn-secondary" data-act="secondary"${dis}><span class="lbl">${esc(d.secondary)}</span></button>` : '';
    const ghost = d.ghost ? `<a class="btn btn-ghost" href="${esc(d.ghostHref || '#/inbox')}">${esc(d.ghost)}</a>` : '';
    const msg = offline ? `<span class="dock-hint" style="white-space:normal">Waiting for Atelier to answer; decide once it’s back.</span>`
      : d.hint ? `<span class="dock-hint">${esc(d.hint)}</span>` : d.note ? `<span class="dock-hint"><span class="kbd">Ctrl</span><span class="kbd">↵</span> to send</span>` : '';
    return `<div class="dock" aria-label="Your decision" role="group"${vt('dock')}>${field ? `<div class="field">${field}${err}</div>` : ''}<div class="dock-row">${primary}${second}${ghost}${msg}</div></div>`;
  }
  function head() {
    const C = counts(), L = list(), n = C ? C.waiting : 0, u = C ? C.needsNow : 0;
    const i = L.findIndex(x => x.id === S.open);
    const pager = L.length > 1 ? `<div class="pager"><span class="of num">${i + 1} of ${L.length}</span>
      <button class="btn btn-ghost btn-icon btn-sm" data-go="-1" aria-label="Previous item">${I('chevron-left')}</button>
      <button class="btn btn-ghost btn-icon btn-sm" data-go="1" aria-label="Next item">${I('chevron-right')}</button>
      <span class="hint"><span class="kbd">J</span><span class="kbd">K</span> to move</span></div>` : '';
    const summary = !state ? '' : n ? `${n} waiting${u ? ` · <span class="is-needs">${u} need${u === 1 ? 's' : ''} you now</span>` : ''}` : 'Nothing waiting';
    return `<header class="page-head"${vt('head')}><h1>Inbox</h1><span class="summary num">${summary}</span>${pager}${liveLine()}</header>`;
  }
  function draw() {
    if (!state) { return `<header class="page-head"><h1>Inbox</h1>${liveLine()}</header><div class="hf-body">${loadError('The Inbox')}<aside class="faint" style="font-size:var(--text-sm)">The list comes back when the Inbox loads.</aside></div>`; }
    const L = list();
    if (!(state.projects || []).length) {
      return head() + `<div class="hf-body"><div class="hf-empty"><h2 id="ttl" tabindex="-1">Nothing needs you yet.</h2><p>Start a project, and everything that needs your say lands here: designs to approve, questions, proof to judge.</p><a class="btn btn-primary" href="#/new">${I('plus')}New project</a></div></div>`;
    }
    if (!L.length) {
      const W = working(), C = counts(), D = ledger();
      return head() + `<div class="inbox"><section class="focus"><div class="zero">
        <div class="empty"${vt('empty')}><span class="empty-mark"><span class="tick">${I('check')}</span>All caught up</span><h2 class="empty-title" tabindex="-1" id="ttl">Nothing needs you.</h2><p>${C.working ? `${C.working <= 10 ? nums[C.working] : C.working} agent${C.working === 1 ? ' is' : 's are'} working on ${C.working === 1 ? 'its' : 'their'} own.` : 'Nobody is working right now.'} Anything that needs you will show up here.</p></div>
        ${W.length ? `<div class="queue-group zero-group"${vt('zero-work')}><div class="queue-head" style="padding:0"><span>Working now</span><span class="n">${C.working}</span></div><div class="zero-working">${W.map(a => agent(a)).join('')}</div></div>` : ''}</div></section>
        <aside class="queue" aria-label="Today"><div class="queue-group"><div class="queue-head"${rowsMove() ? vt('h-done', 'row') : ''}><span>You decided today</span><span class="n">${C.decidedToday}</span></div>${D.length ? `<div class="ledger">${ledgerRows(D)}</div>` : '<p class="faint" style="padding:0 var(--space-3);font-size:var(--text-sm);margin:0">Nothing yet today.</p>'}</div></aside></div>`;
    }
    const x = L.find(y => y.id === S.open) || L[0];
    S.open = x.id;
    const t = tname(x.id);
    return head() + `<div class="inbox">
      <section class="focus" aria-labelledby="ttl">
        <div class="focus-head"${vt('ih')}>
          <div class="eyebrow">${x.needs ? `<span class="is-needs"><span class="dot dot-needs"></span>Needs you now</span>` : ''}<span class="grp">${x.needs ? '<span class="sep">·</span>' : ''}<span class="kind">${I(x.glyph)}${esc(x.kind)}</span></span><span class="grp"><span class="sep">·</span><a class="proj" href="#/p/${encodeURIComponent(x.project)}/overview">${esc(x.project)}</a></span>${x.ageLong ? `<span class="grp"><span class="sep">·</span><span>${esc(x.ageLong)}</span></span>` : ''}</div>
          <h2 class="title-display" id="ttl" tabindex="-1"${t ? vt(t, 'title') : ''}>${esc(x.title)}</h2>
        </div>
        <div class="focus-body"${vt('ib')}>${x.body()}</div>
        ${dock(x)}
      </section>
      ${queue()}
    </div>`;
  }
  const cssId = id => String(id).replace(/[^\w-]/g, '_');
  // Only touch the DOM when the markup changed, so a live refresh never resets what didn't.
  function render(force) {
    const html = draw();
    if (force || html !== S.last || !$('view').querySelector('.page-head')) { $('view').innerHTML = html; S.last = html; }
    placeToast();
  }

  // ── transitions (Flow): only the titles that travel are named, and only at ≥ 1024 ──
  const FLY = new Set();
  const tname = id => wide() && FLY.has(id) ? `t-${cssId(id)}` : '';
  let chain = Promise.resolve();
  function nameFlying() {
    if (RM) return;
    for (const id of FLY) {
      const n = tname(id); if (!n) continue;
      const el = S.open === id ? $('ttl') : document.querySelector(`.qitem[data-id="${CSS.escape(id)}"] .qitem-title, .ledger-row[data-lid="${CSS.escape(id)}"] .what`);
      if (el) { el.style.viewTransitionName = n; el.style.viewTransitionClass = 'title'; }
    }
  }
  function transition(kind, update, dir = 0, fly = () => []) {
    const run = () => {
      if (!document.startViewTransition || document.hidden) { update(); render(); return Promise.resolve(); }
      ROOT.dataset.vt = kind; ROOT.dataset.dir = dir > 0 ? 'fwd' : dir < 0 ? 'back' : '';
      FLY.clear(); fly().forEach(id => id && FLY.add(id)); nameFlying();
      const t = document.startViewTransition(() => { update(); render(); });
      return t.finished.catch(() => {}).finally(() => {
        delete ROOT.dataset.vt; delete ROOT.dataset.dir;
        FLY.clear(); document.querySelectorAll('#ttl, .qitem-title, .ledger-row .what').forEach(e => { e.style.removeProperty('view-transition-name'); e.style.removeProperty('view-transition-class'); });
      });
    };
    chain = chain.then(run);
    return chain;
  }
  const focusTitle = () => $('ttl')?.focus({ preventScroll: true });
  function setHash(id) {
    const h = id ? `#/inbox/${encodeURIComponent(id)}` : '#/inbox';
    if (location.hash !== h) { ownHash = true; history.replaceState(null, '', h); ownHash = false; }
  }
  function go(d) {
    const L = list(); if (L.length < 2) return;
    const i = L.findIndex(x => x.id === S.open);
    const next = L[(i + d + L.length) % L.length].id;
    transition(d > 0 ? 'next' : 'prev', () => { dropGhost(next); S.open = next; S.dock = 'ready'; S.note = ''; S.choice = ''; setHash(next); }, d, () => [next]).then(focusTitle);
  }
  function openItem(id) {
    if (id === S.open) return;
    const L = list();
    const i = L.findIndex(x => x.id === S.open), j = L.findIndex(x => x.id === id);
    transition('open', () => { dropGhost(id); S.open = id; S.dock = 'ready'; S.note = ''; S.choice = ''; setHash(id); scrollTo({ top: 0 }); }, j - i, () => [id]).then(focusTitle);
  }
  function dropGhost(next) { if (S.ghost && S.ghost.id !== next) S.ghost = null; }

  // ── toast ──
  let toastTimer;
  function showToast(text, { undo, retry, error } = {}) {
    const t = document.createElement('div');
    t.className = `toast ${error ? 'toast-error' : 'toast-success'}`; t.setAttribute('role', 'status');
    t.innerHTML = `<span class="tick">${I(error ? 'alert' : 'check')}</span><span class="toast-text">${esc(text)}</span>${undo ? '<button class="toast-action" data-act="toast-undo">Undo<span class="kbd">Z</span></button>' : ''}${retry ? '<button class="toast-action" data-act="toast-retry">Try again</button>' : ''}<span class="toast-life" aria-hidden="true"></span>`;
    const box = $('toasts'); box.innerHTML = ''; box.append(t);
    placeToast();
    // The 6 s window waits while the pointer is on the toast or focus is in it (WCAG 2.2.1), then resumes.
    let left = 6000, started = Date.now();
    const life = t.querySelector('.toast-life');
    const run = () => { started = Date.now(); clearTimeout(toastTimer); toastTimer = setTimeout(() => closeToast(), left); if (life) life.style.animationPlayState = 'running'; };
    const hold = () => { clearTimeout(toastTimer); left = Math.max(1500, left - (Date.now() - started)); if (life) life.style.animationPlayState = 'paused'; };
    t.addEventListener('pointerenter', hold); t.addEventListener('focusin', hold);
    t.addEventListener('pointerleave', () => { if (!t.contains(document.activeElement)) run(); });
    t.addEventListener('focusout', e => { if (!t.contains(e.relatedTarget) && !t.matches(':hover')) run(); });
    run();
  }
  // Closing the toast ends the Undo window: the decision goes to Atelier now.
  function closeToast(now) {
    const box = $('toasts'), t = box.firstChild;
    clearTimeout(toastTimer);
    commit();
    if (!t) return;
    if (now || RM) { box.innerHTML = ''; placeToast(); return; }
    t.classList.add('is-leaving');
    setTimeout(() => { if (t.parentNode) { t.remove(); placeToast(); } }, tok('--dur-base') || 200);
  }
  // The toast anchors to the dock (centred, as wide, --space-2 above it, or below when there's no room) and never
  // covers a dock button or a tab. No dock: the CSS default.
  function placeToast() {
    const box = $('toasts'), dk = document.querySelector('.focus .dock');
    if (!box.firstChild || !dk) { box.removeAttribute('data-anchor'); ['--toast-x', '--toast-w', '--toast-top'].forEach(v => box.style.removeProperty(v)); return; }
    const gap = tok('--space-2'), r = dk.getBoundingClientRect();
    box.style.setProperty('--toast-x', `${r.left + r.width / 2}px`); box.style.setProperty('--toast-w', `${r.width}px`);
    const bar = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return cs.display === 'none' || !['sticky', 'fixed'].includes(cs.position) ? null : e.getBoundingClientRect(); };
    const topLimit = Math.max(0, ...['.hf-top', '.page-head'].map(bar).filter(Boolean).map(b => b.bottom));
    const tabs = bar('.hf-tabs'), bottomLimit = tabs ? tabs.top : innerHeight;
    const h = box.offsetHeight, above = r.top - gap - h, below = r.bottom + gap;
    const top = above >= topLimit + gap ? above : below + h <= bottomLimit - gap ? below : topLimit + gap;
    box.style.setProperty('--toast-top', `${Math.round(top)}px`); box.setAttribute('data-anchor', '');
  }
  addEventListener('scroll', placeToast, { passive: true });
  addEventListener('resize', placeToast);
  document.addEventListener('input', placeToast);

  // ── deciding: press → shown done in place (the hold) → the item goes, the next arrives (one transition) →
  // the toast with Undo. The action is sent when the toast closes (or you decide the next one, or leave). ──
  let last = null, deciding = false;
  async function decide(which) {
    const x = list().find(y => y.id === S.open);
    if (!x || deciding || failedAt || !x.dock.send || (S.ghost && x.id === S.ghost.id)) return;
    const note = $('note')?.value.trim() || '';
    S.note = note;
    closeToast(true); // the previous decision's window closes: it is sent now
    const d = x.dock;
    if ((d.required && which === 'primary' && !note && !(d.needsAnswer && S.choice !== '')) || (d.rejectNeedsNote && which === 'secondary' && !note)) {
      S.dock = 'invalid'; render(); $('note')?.focus(); return;
    }
    deciding = true;
    const body = d.send(which, note, S.choice);
    S.which = which; S.dock = 'sent'; render();
    document.querySelector(`.qitem[data-id="${CSS.escape(x.id)}"]`)?.classList.add('is-done');
    await wait(tok('--dur-hold') || 560);
    const r = which === 'secondary' && d.alt || d;
    let next;
    await transition(list().length === 1 ? 'zero' : 'decide', () => {
      const L = list(), i = L.indexOf(x);
      S.hidden.set(x.id, { x, i, body, r, committed: false, project: x.project, needs: x.needs });
      S.ghost = null;
      S.items = S.items.filter(y => y.id !== x.id);
      S.decided.unshift({ what: r.log, project: x.project, age: 'now', id: x.id });
      const L2 = list();
      S.open = (L2[i] || L2[0] || {}).id || null; S.dock = 'ready'; S.note = ''; S.which = ''; S.choice = '';
      next = L2.find(y => y.id === S.open);
      setHash(S.open);
      renderChrome();
      scrollTo({ top: 0 });
    }, 1, () => [x.id]);
    deciding = false;
    last = x.id;
    showToast(next ? `${r.toast} Next: ${next.title}` : `${r.toast} That was the last one.`, { undo: true });
    focusTitle();
  }
  function undo() {
    if (!last || !S.hidden.has(last) || S.hidden.get(last).committed) return;
    const h = S.hidden.get(last); last = null;
    clearTimeout(toastTimer); $('toasts').innerHTML = ''; placeToast();
    transition('undo', () => {
      S.hidden.delete(h.x.id);
      S.items.splice(Math.min(h.i, S.items.length), 0, h.x);
      S.open = h.x.id; S.decided = S.decided.filter(dd => dd.id !== h.x.id); S.dock = 'ready';
      setHash(h.x.id); renderChrome();
      scrollTo({ top: 0 });
    }, -1, () => [h.x.id]).then(focusTitle);
  }
  // Send every decision whose Undo window has closed. A failure brings the item back with Try again.
  function commit(opts = {}) {
    for (const [k, h] of S.hidden) {
      if (h.committed || h.sending) continue;
      h.sending = true;
      if (k === last) last = null;
      post(h.body, { keepalive: !!opts.keepalive }).then(() => {
        h.committed = true; h.sending = false;
        const dd = S.decided.find(e => e.id === k); if (dd) dd.committed = true;
        refresh().catch(() => {});
      }).catch(err => {
        h.sending = false; S.hidden.delete(k);
        S.decided = S.decided.filter(e => e.id !== k);
        if (S.active) {
          S.items.splice(Math.min(h.i, S.items.length), 0, h.x);
          retryKey = k; retryBody = h;
          render(); renderChrome();
          showToast(/fetch|network|Failed/i.test(err.message) ? `Couldn’t reach Atelier. Nothing was sent: ${h.x.title}` : `That didn’t go through: ${err.message}`, { error: true, retry: true });
        }
      });
    }
  }
  let retryKey = null, retryBody = null;
  function retry() {
    if (!retryKey) return;
    const k = retryKey; retryKey = null;
    clearTimeout(toastTimer); $('toasts').innerHTML = '';
    S.open = k; S.dock = 'ready'; render(); focusTitle();
  }

  document.addEventListener('click', e => {
    if (!S.active) return;
    const q = e.target.closest('.qitem[data-id]'), g = e.target.closest('[data-go]'), a = e.target.closest('[data-act]');
    if (q) { e.preventDefault(); openItem(q.dataset.id); return; }
    if (g) { go(Number(g.dataset.go)); return; }
    if (!a) return;
    const act = a.dataset.act;
    if (act === 'primary' || act === 'secondary') decide(act);
    if (act === 'toast-undo') undo();
    if (act === 'toast-retry') retry();
  });
  document.addEventListener('change', e => { if (S.active && e.target.name === 'ans') { S.choice = e.target.value; if (S.dock === 'invalid') { S.dock = 'ready'; render(); } } });
  document.addEventListener('input', e => { if (S.active && e.target.id === 'note') S.note = e.target.value; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('toasts').firstChild) { closeToast(); return; }
    if (!S.active) return;
    const typing = ['TEXTAREA', 'INPUT', 'SELECT'].includes(document.activeElement?.tagName);
    if (typing && e.key === 'Enter' && (e.ctrlKey || e.metaKey) && document.activeElement.id === 'note') { e.preventDefault(); decide('primary'); return; }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && last && $('toasts').firstChild) { undo(); return; }
    if (k === 'j') go(1); if (k === 'k') go(-1);
  });
  // Leaving the page with a decision still in its window: send it on the way out.
  addEventListener('pagehide', () => commit({ keepalive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden && pending()) { clearTimeout(toastTimer); $('toasts').innerHTML = ''; commit({ keepalive: true }); } });

  // ── live refresh: figures change in place; the item you are reading, its folds and the note you are typing stay ──
  function show(key, { refreshing } = {}) {
    const fresh = !S.active;
    S.active = true;
    const prevKeys = list().map(x => x.id).join('|'), prevOpen = S.open;
    if (state) sync();
    if (key && key !== S.open && !refreshing) { S.open = key; S.dock = 'ready'; S.note = ''; S.choice = ''; }
    if (fresh || !refreshing) { render(true); return; }
    // A refresh while the owner reads: the open item, its folds and the note being typed stay as they are;
    // only the head and the queue (counts, rows, Working now) are redrawn, and only when they changed.
    const openStill = !!S.open && S.open === prevOpen && list().some(x => x.id === S.open);
    const same = prevKeys === list().map(x => x.id).join('|');
    const typing = document.activeElement?.id === 'note' || document.activeElement?.name === 'ans';
    const folded = !!document.querySelector('.focus details[open]');
    if (openStill && (same || typing || folded || S.dock !== 'ready')) { patch(); return; }
    const y = scrollY; render(); scrollTo({ top: y });
  }
  const swap = (sel, html) => { const el = document.querySelector(sel); if (!el) return; const n = document.createElement('div'); n.innerHTML = html; const next = n.firstElementChild; if (el.outerHTML !== next.outerHTML) el.replaceWith(next); return next; };
  function patch() {
    swap('#view .page-head', head());
    const q = document.querySelector('#view .queue'), top = q?.scrollTop || 0;
    const next = swap('#view .queue', queue());
    if (next) next.scrollTop = top;
  }
  function leave() {
    if (!S.active) return;
    S.active = false; S.ghost = null; S.last = '';
    if ($('toasts').firstChild) closeToast(true); else commit();
  }
  const pending = () => [...S.hidden.values()].some(h => !h.committed);
  return {
    show, leave, pending,
    hiddenItems: () => [...S.hidden.values()].filter(h => !h.committed || (state?.queue || []).some(x => x.key === h.x.id)).map(h => ({ project: h.project, needs: h.needs })),
    localDecided: () => S.decided.filter(d => !d.committed || !(state?.decidedToday || []).length).length,
    // A hash change the Inbox handles itself: its own address updates, or another item of the open Inbox.
    ownsHash: () => {
      if (ownHash) return true;
      if (!S.active || !/^#\/inbox(\/|$)/.test(location.hash)) return false;
      const k = decodeURIComponent(location.hash.split('/')[2] || '');
      if (k && list().some(x => x.id === k)) openItem(k);
      renderChrome();
      return true;
    },
  };
})();

// ---------- sign in ----------
// The one screen without the shell: nothing else is readable before the token. It posts to /login as today
// (HttpOnly, SameSite=Strict cookie); fetch follows the server's redirect, so a wrong token keeps what you pasted.
function renderLogin() {
  document.body.classList.add('is-login');
  document.body.innerHTML = `<main class="l-wrap" id="main"><form class="l-card" method="post" action="/login" novalidate>
    <span class="l-mark">${markN1(40)}</span>
    <h1>Sign in to Atelier</h1>
    <p class="l-lede">Paste the access token that <code>atelier open</code> prints on your PC. You do this once on each device.</p>
    <div class="field">
      <label class="field-label" for="token">Access token</label>
      <input class="input" id="token" name="token" type="password" autocomplete="current-password" spellcheck="false" required aria-describedby="t-help" autofocus>
      <span class="field-help" id="t-help">It stays signed in on this device until you clear its data.</span>
    </div>
    <button class="btn btn-primary l-go" type="submit">Sign in</button>
  </form></main>`;
  document.body.insertAdjacentHTML('afterbegin', `<svg xmlns="http://www.w3.org/2000/svg" style="display:none"><symbol id="i-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON.alert}</symbol></svg>`);
  const f = document.querySelector('form'), inp = $('token'), b = f.querySelector('.l-go');
  const fail = text => {
    let msg = f.querySelector('.field-help, .field-error');
    msg.className = 'field-error'; msg.id = 't-err'; msg.setAttribute('role', 'alert'); msg.innerHTML = `${I('alert')}<span>${text}</span>`;
    inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', 't-err'); inp.focus();
  };
  if (location.search.includes('login=failed')) { history.replaceState(null, '', '/' + location.hash); fail('That token didn’t match. Copy it again from <code>atelier open</code>.'); }
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!inp.value.trim()) return fail('Paste the token first.');
    b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Signing in…';
    try {
      const r = await fetch('/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: inp.value.trim() }) });
      if (r.url.includes('login=failed')) throw new Error('wrong');
      location.replace('/#/inbox');
      return;
    } catch (err) {
      b.disabled = false; b.removeAttribute('aria-busy'); b.textContent = 'Sign in';
      fail(err.message === 'wrong' ? 'That token didn’t match. Copy it again from <code>atelier open</code>.' : 'Couldn’t reach Atelier. Is it running on your PC?');
    }
  });
}

// =====================================================================================================
// The screens slices 2 and 3 rebuild, as they were, inside the shell. Their figures now come from the summary.
// =====================================================================================================

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
    needs: `<g class="float"><circle class="red" cx="100" cy="14" r="10"/><rect x="98.6" y="8" width="2.8" height="7.5" rx="1.4" fill="var(--surface)"/><circle cx="100" cy="18.6" r="1.6" fill="var(--surface)"/></g>`,
    reviewing: `<g class="float"><rect class="bubble" x="88" y="4" width="26" height="20" rx="9"/><circle cx="99" cy="13" r="4.5" fill="none" stroke="var(--lilac)" stroke-width="2"/><path d="M102.5 16.5l4 4" stroke="var(--lilac)" stroke-width="2" stroke-linecap="round"/></g>`,
    stuck: `<g class="float"><text x="90" y="18" class="muted" font-size="13" font-weight="700" font-family="var(--font-sans)">z z</text></g>`,
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

const etaText = e => e ? `likely ${e.low}–${e.high} min` : '';

const DESK_LABEL = { working: 'Working', reviewing: 'Reviewing', auditing: 'Auditing', needs: 'Needs you', stuck: 'Stuck', duty: 'On duty', idle: 'Idle', away: 'Off' };
const DESK_ORDER = { needs: 0, working: 1, reviewing: 1, auditing: 1, stuck: 2, duty: 3, idle: 4, away: 5 };
const isBusy = s => s === 'working' || s === 'reviewing' || s === 'auditing';

function desk({ href, state, who, what, meta, cls = '' }) {
  const tag = href ? 'a' : 'div';
  const tone = isBusy(state) ? 'busy' : state === 'needs' ? 'needs' : state === 'stuck' ? 'stuck' : state === 'duty' ? 'duty' : state === 'away' ? 'off' : 'idle';
  return `<${tag} class="desk ${cls} ${tone}" ${href ? `href="${href}"` : ''}>
    <div class="state"><span class="sdot"></span>${DESK_LABEL[state] || state}</div>
    ${scene(state === 'duty' ? 'idle' : state)}
    <div class="who">${who}</div>
    ${what ? `<div class="what">${what}</div>` : ''}
    ${meta ? `<div class="meta">${meta}</div>` : ''}
  </${tag}>`;
}

// Desks come straight from the server's team list, the same one the sidebar and project page count.
function officeDesks(p) {
  const desks = (p.team?.agents || []).map(x => {
    const meta = x.kind === 'task' || (x.kind === 'reviewer' && x.id)
      ? (x.state === 'needs' ? 'answer it in your inbox' : x.state === 'stuck' ? 'the lead will replan it' : esc(progressLine(x)))
      : esc(x.meta || '');
    return { order: x.state, d: { href: x.href ? esc(x.href) : '', cls: x.kind === 'lead' ? 'lead' : '', state: x.state,
      who: x.reviewingFor ? `reviewer <span class="faint">on ${esc(x.reviewingFor)}'s work</span>` : x.kind === 'lead' ? 'Lead' : esc(x.who),
      what: esc(x.what || ''), meta } };
  });
  desks.sort((x, y) => DESK_ORDER[x.order] - DESK_ORDER[y.order]);
  return desks;
}

function renderOffice() {
  const C = counts();
  const ps = [...state.projects].filter(p => !p.error);
  const all = ps.map(p => ({ p, desks: officeDesks(p), s: C.projects[p.alias] }));
  all.sort((x, y) => (y.s.working - x.s.working) || (y.p.lead.running - x.p.lead.running));
  const floors = all.map(({ p, desks, s }) => {
    const a = esc(p.alias);
    if (!p.lead.running && !s.working && !s.agentsNeed) {
      return `<a class="item quiet-floor" href="#/p/${a}/overview"><span class="pdot"></span><span class="t">${a}<small>Nobody working · lead off · ${money(s.spentTotal)} spent in total</small></span></a>`;
    }
    return `<div class="floor-h"><a href="#/p/${a}/overview">${a}</a><span>${s.working} working · ${money(s.spentToday)} today</span></div>
      <div class="floor">${desks.map(d => desk(d.d)).join('')}</div>`;
  }).join('');
  legacy(`${topbar('<b>Office</b>')}
    <div class="page">
      <div class="office-bar">
        <span class="ob busy"><span class="sdot"></span><b>${C.working}</b> working</span>
        <span class="ob ${C.agentsNeed ? 'needs' : ''}"><span class="sdot"></span><b>${C.agentsNeed}</b> need${C.agentsNeed === 1 ? 's' : ''} you</span>
        ${C.onDuty ? `<span class="ob duty"><span class="sdot"></span><b>${C.onDuty}</b> on duty</span>` : ''}
        <span class="ob">Spent today: <b>${money(C.spentToday)}</b></span>
      </div>
      ${floors || '<div class="empty"><b>No projects yet</b>Create one and the team shows up here.</div>'}
    </div>`);
}

// ---------- projects list ----------
function renderProjects() {
  const C = counts();
  legacy(`${topbar('<b>Projects</b>', `<a class="btn" href="#/new">${icon('plus', 'st')}New</a>`)}
    <div class="list">${state.projects.map(p => `<a class="item" href="#/p/${esc(p.alias)}/overview">
      <span class="pdot ${p.lead?.running ? 'live' : ''}"></span>
      <span class="t">${esc(p.alias)}<small>${esc(p.phase)} · ${taskSummary(p.tasks || [])}</small></span>
      <span class="r">${C.projects[p.alias]?.waiting || ''}</span></a>`).join('') || '<div class="empty"><b>No projects yet</b>Create one to get started.</div>'}</div>`);
}

function taskSummary(tasks) {
  const n = s => tasks.filter(t => t.status === s).length;
  const parts = [[n('running'), 'working'], [n('needs-you'), 'need you'], [n('queued'), 'queued'], [n('done'), 'done']].filter(([x]) => x);
  return parts.length ? parts.map(([x, l]) => `${x} ${l}`).join(', ') : 'no tasks yet';
}

// ---------- activity ----------
const EVENT_WORD = { added: 'Task added', started: 'Started', iteration: 'Iteration', criteria: 'Criteria', suite: 'Full suite', 'review-started': 'Review started', reviewed: 'Reviewed', done: 'Finished', review: 'Ready for review', 'needs-you': 'Needs you', stalled: 'Stalled', failed: 'Failed', approved: 'Approved', answered: 'Answered', gate: 'Gate', 'gate-request': 'Gate requested', audit: 'Audit', 'audit-started': 'Audit started', 'finding-confirmed': 'You asked for a fix', 'finding-dismissed': "You said it's fine", 'finding-to-lead': 'Auditor → lead', 'finding-fixed': 'Lead fixed', 'criterion-draft': 'Criterion drafted', 'criterion-approve': 'Criterion approved', 'criterion-accept': 'Criterion accepted', 'criterion-reject': 'Criterion rejected', ruling: 'Ruling', message: 'Message', requested: 'Request', 'test-touch': 'Tests changed', 'owner-review': 'Needs your judgement', trust: 'Gating', reporting: 'Reporting', autonomy: 'Shipping', lead: 'Lead', charter: 'Charter', demoted: 'Trust tightened', ownership: 'Out-of-bounds edit reverted', paced: 'Paused for plan limits', queued: 'Queued', project: 'Project' };
function eventLine(e, showProject = true) {
  const bad = /failed|stalled|FAIL|demoted|tampered|reverted/.test(`${e.type} ${e.msg}`);
  const good = /^(done|approved|criterion-accept|finding-confirmed)$/.test(e.type) || / pass|approve/.test(e.msg);
  return `<li><span>${st(bad ? 'needs-you' : good ? 'done' : 'queued')}</span>
    <span>${showProject ? `<span class="mono faint">${esc(e.id)}</span> ` : ''}<span class="ev-k">${esc(EVENT_WORD[e.type] || e.type.replace(/-/g, ' '))}</span> <span class="muted">${esc(e.msg)}</span></span>
    <span class="when">${esc(ago(e.ts))}</span></li>`;
}

function renderActivity() {
  legacy(`${topbar('<b>Activity</b>')}<div class="page"><ul class="timeline">${state.events.slice(0, 120).map(e => eventLine(e)).join('') || '<div class="empty">No activity yet</div>'}</ul></div>`);
}

// ---------- settings (global): appearance, plan pacing, about ----------
// Plan-limit ceilings are global: changing one saves straight away.
const paceSel = (key, value, options) => `<select data-pace="${key}" aria-label="${key === 'fiveHour' ? '5-hour window' : 'Week'}">${[...new Set([...options, Number(value)])].filter(Boolean).sort((a, b) => a - b).map(v => `<option value="${v}" ${v === Number(value) ? 'selected' : ''}>Pause Atelier at ${v}% used</option>`).join('')}</select>`;
function renderSettings() {
  const pick = store.get('atelier-theme') || 'auto';
  const lim = state.limits || {}, t = state.atelierToday || {};
  const meter = (label, w) => w ? `<dt>${label}</dt><dd>${Math.round(w.used_percentage)}% used · resets ${esc(resetIn(w.resets_at))}</dd>` : '';
  legacy(`${topbar('<b>Settings</b>')}<div class="page">
    <div class="sec">Appearance</div>
    <dl class="kv"><dt><label for="theme-pick">Theme</label></dt><dd><select id="theme-pick" data-theme-pick>
      <option value="auto" ${pick === 'auto' ? 'selected' : ''}>Dark here; a phone follows the device</option>
      <option value="dark" ${pick === 'dark' ? 'selected' : ''}>Dark</option>
      <option value="light" ${pick === 'light' ? 'selected' : ''}>Light</option>
      <option value="device" ${pick === 'device' ? 'selected' : ''}>Follow the device</option></select>
      <div class="hint">Kept on this device only.</div></dd></dl>
    <div class="sec">Your Claude plan<span class="faint"> · applies to all projects</span></div>
    <dl class="kv">
      ${meter('5-hour window', lim.five_hour)}${meter('Week', lim.seven_day)}
      <dt>Pause at (5 h)</dt><dd>${paceSel('fiveHour', state.pace?.fiveHour, [50, 60, 70, 80, 90])}</dd>
      <dt>Pause at (week)</dt><dd>${paceSel('sevenDay', state.pace?.sevenDay, [50, 60, 70, 75, 80, 90])} <label class="tick"><input type="checkbox" data-pace-spread ${state.pace?.spread ? 'checked' : ''}> spread evenly over the week</label>
        <div class="hint">You use the same plan yourself. Atelier pauses when your usage reaches these levels, and resumes when the window resets.${state.pace?.holdingUntil ? ` <b>Holding now</b> until ${esc(new Date(state.pace.holdingUntil * 1000).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}.` : ''}</div></dd>
      <dt>Atelier today</dt><dd>${money(t.cost)} finished${t.liveTokens ? ' + work in progress' : ''} · ${(((t.tokens || 0) + (t.liveTokens || 0)) / 1e6).toFixed(1)}M tokens <span class="hint">API-equivalent, not a bill</span>${lim.saved_at ? `<div class="hint">Plan figures updated ${esc(ago(new Date(lim.saved_at * 1000).toISOString()) || 'now')} ago.</div>` : ''}</dd>
    </dl>
    <div class="sec">This device</div>
    <p class="hint" style="max-width:62ch">To use Atelier on your phone, open it there, paste your access token once, and add it to the home screen.</p>
    <div class="sec">About</div>
    <p class="hint">The dashboard reloads itself when a new version is installed. Project settings are on each project’s Settings tab.</p>
  </div>`);
}

// ---------- project ----------
// The last data seen for each project, so switching tabs paints at once; fresh data fills in when it arrives.
const projectSeen = new Map();
async function renderProject(alias, tab, sub, refreshing, wait) {
  const hash = location.hash;
  const seen = refreshing ? null : projectSeen.get(alias);
  if (seen) drawProject(seen.p, tab, sub);
  const p = await get(`/api/project/${encodeURIComponent(alias)}${wait ? '?wait' : ''}`);
  if (location.hash !== hash) return; // the owner has already moved on
  const text = JSON.stringify(p);
  projectSeen.set(alias, { p, text });
  if (seen && (seen.text === text || busy())) return; // already on screen, or the owner is typing in it
  if (refreshing && busy()) return;
  drawProject(p, tab, sub);
}

function drawProject(p, tab, sub) {
  const a = esc(p.alias);
  const S = counts().projects[p.alias] || {};
  const own = state.queue.filter(q => q.project === p.alias);
  const step = nextStep(p, own, S.waiting);
  const idx = PHASES.indexOf(p.phase);
  const leadBtn = p.lead.running ? `<button class="btn ghost" data-do="lead-restart" data-project="${a}" title="Start a fresh lead session from its files">Restart lead</button>` : '';
  const tabs = [['overview', 'Overview'], ['tasks', 'Tasks', p.tasks.filter(t => !['done', 'failed'].includes(t.status)).length], ['criteria', 'Criteria', p.criteria.length],
    ['audits', 'Audits', p.findings.filter(f => f.status === 'open').length || ''], ['docs', 'Docs'], ['activity', 'Activity'], ['settings', 'Settings']];
  const views = { overview: projOverview, tasks: projTasks, criteria: projCriteria, audits: projAudits, docs: projDocs, activity: projActivity, settings: projSettings };
  legacy(`${topbar(`<a href="#/projects">Projects</a><span>/</span><b>${a}</b>`, leadBtn)}
    <div class="page">
      <div class="phead"><h1>${a}</h1>${githubChip(p)}<span class="chip"><span class="pdot ${p.lead.running ? 'live' : ''}"></span>${p.lead.running ? `Lead on · talk to "${a} lead" in the Claude app` : 'Lead off'}</span></div>
      <div class="now">
        <div><div class="k">Now</div><div class="big">${step.title}</div><div class="txt">${step.detail}</div>${step.action ? `<div class="btns">${step.action}</div>` : ''}
          <div class="steps">${PHASES.map((ph, i) => `<span class="${i < idx ? 'done' : i === idx ? 'cur' : ''}">${ph}</span>`).join('')}</div></div>
        <div class="stats">
          <div class="stat"><div class="v">${S.working ?? 0}</div><div class="l">working now</div></div>
          <div class="stat"><div class="v">${S.waiting ?? 0}</div><div class="l">waiting on you</div></div>
          <div class="stat"><div class="v">${p.metrics.criteriaTotal ? `${p.metrics.criteriaMet}<span class="faint">/${p.metrics.criteriaTotal}</span>` : '—'}</div><div class="l">criteria met</div></div>
          <div class="stat"><div class="v" style="${S.atLimit ? 'color:var(--red)' : ''}">${money(S.spentToday)}<span class="faint">/${money(S.dayLimit)}</span></div><div class="l">spent today · ${money(S.spentTotal)} in total, lead and audits included</div></div>
        </div>
      </div>
      <nav class="tabs">${tabs.map(([k, l, c]) => `<a href="#/p/${a}/${k}" class="${k === tab ? 'on' : ''}">${l}${c ? `<span class="n">${c}</span>` : ''}</a>`).join('')}</nav>
      <div id="tab">${(views[tab] || projOverview)(p, sub)}</div>
    </div>`);
}

// Whether GitHub has everything. Atelier pushes on its own every couple of minutes; this only turns red
// when that's failing, so the owner never has to check.
function githubChip(p) {
  const g = p.github;
  if (!g || p.autonomy === 'branch') return '';
  if (g.problem) return `<span class="chip" style="color:var(--red)" title="${esc(g.problem)}">Not on GitHub: ${esc(g.problem.split(':')[0])}</span>`;
  return `<span class="chip" title="Checked ${esc(ago(g.at))} ago">On GitHub</span>`;
}

// One plain sentence about what happens next.
function nextStep(p, own, waiting) {
  const a = esc(p.alias);
  const start = `<button class="btn primary" data-do="lead-start" data-project="${a}">Start lead</button>`;
  if (p.charter?.tampered) return { title: 'Your charter changed after you approved it', detail: 'Read it in Docs and approve it again if the change is yours.', action: `<a class="btn" href="#/p/${a}/docs/charter">Open charter</a>` };
  if (waiting && own.length) return { title: `${waiting} decision${waiting > 1 ? 's' : ''} waiting on you`, detail: 'The team keeps going on anything that doesn\'t depend on them.', action: `<a class="btn primary" href="#/inbox/${encodeURIComponent(own[0].key)}">Review ${waiting > 1 ? 'first' : 'it'}</a>` };
  if (!p.lead.running && p.phase !== 'build') return { title: 'Start the lead, then brief it', detail: `Then open "${a} lead" in the Claude app and describe what you want. It drafts your charter and brings it back here.`, action: start };
  if (!p.charter && p.phase !== 'build') return { title: 'Brief the lead', detail: `Open "${a} lead" in the Claude app. Talk it through, or let it interview you.` };
  const phaseText = { brief: 'The lead is shaping the brief with you.', spec: 'Requirements and acceptance criteria are being written.', design: 'The designer is working on the look and flows.', contracts: 'The interfaces between parts are being drafted.' };
  if (phaseText[p.phase]) return { title: `${p.phase[0].toUpperCase()}${p.phase.slice(1)} in progress`, detail: phaseText[p.phase] + ' It comes to you for approval.', action: p.lead.running ? '' : start };
  const n = s => p.tasks.filter(t => t.status === s).length;
  if (n('running') || n('queued')) return { title: 'The team is building', detail: `${n('running')} working, ${n('queued')} queued. Nothing needs you.` };
  if (p.tasks.length) return { title: 'All current work is finished', detail: p.lead.running ? 'Tell the lead what\'s next.' : 'Start the lead to plan what\'s next.', action: p.lead.running ? '' : start };
  return { title: 'Waiting for the lead to plan the build', detail: 'Task plans come here for your approval.', action: p.lead.running ? '' : start };
}

// What a task is doing right now, in one line: the iteration underway, how long it's been going, how many
// steps the agent has taken and its latest one, and spend against the task's budget.
function progressLine(t) {
  const c = t.live?.current;
  const spend = (t.cost || 0) + (t.liveCost || 0);
  const money2 = spend ? `${money(spend)}${t.budget ? ` of ${money(t.budget)}` : ''}` : '';
  if (!c) return [`iteration ${t.iteration || 0} of ${t.iterations}`, money2].filter(Boolean).join(' · ');
  return [`iteration ${c.n} of ${t.iterations}, ${c.minutes}m in`, `${c.actions} steps`, c.recent[0] || '', money2].filter(Boolean).join(' · ');
}

// Finished iterations as a row of dots (green: check passed, red: failed) plus the one underway.
function iterDots(t) {
  const h = t.live?.history || [];
  const dot = (cls, title) => `<span class="idot ${cls}" title="${esc(title)}"></span>`;
  return `<span class="idots">${h.map(x => dot(x.check === 'pass' ? 'pass' : x.check === 'fail' ? 'fail' : '', `#${x.n}: ${x.outcome}, check ${x.check}`)).join('')}${t.live?.current ? dot('now', `#${t.live.current.n}: underway`) : ''}</span>`;
}

function taskRow(t, { project = false } = {}) {
  const s = taskStatus(t);
  return `<a class="item ${s === 'needs-you' ? 'urgent' : ''}" href="#/t/${esc(t.id)}">
    ${st(s, STATUS_WORD[s] || s)}<span class="id">${esc(t.id)}</span>
    <span class="t">${esc(t.title)}<small>${s === 'running' ? esc(progressLine(t)) : `${esc(t.role || 'builder')}${project ? ` · ${esc(t.project)}` : ''}${t.reason && s !== 'done' ? ` · ${esc(t.reason)}` : ''}`}</small></span>
    <span class="r">${iterDots(t)}${s === 'running' && t.eta ? `<br>${etaText(t.eta)}` : ''}</span></a>`;
}

const KIND = {
  gate: ['gate', 'Gate'], charter: ['doc', 'Charter'], 'charter-tampered': ['alert', 'Charter changed'], github: ['alert', 'GitHub'], budget: ['alert', 'Budget'], screen: ['alert', 'Your screen'], 'screen-notice': ['alert', 'Your screen'], finding: ['alert', 'Drift'],
  criterion: ['check', 'Outcome'], criteria: ['check', 'Outcomes'], 'owner-criterion': ['eye', 'Your judgement'], plan: ['play', 'Task plan'], question: ['help', 'Question'], dial: ['dial', 'Trust'],
};

function projOverview(p) {
  const own = state.queue.filter(q => q.project === p.alias);
  const active = p.tasks.filter(t => ['running', 'needs-you', 'queued', 'planned', 'review'].includes(t.status));
  return `
    ${own.length ? `<div class="sec">Waiting on you</div><div class="list">${own.map(x => `<a class="item urgent" href="#/inbox/${encodeURIComponent(x.key)}">${icon((KIND[x.kind] || ['inbox'])[0], 'st')}<span class="t">${esc(x.title)}<small>${(KIND[x.kind] || ['', x.kind])[1]}</small></span><span class="r">${esc(ago(x.at))}</span></a>`).join('')}</div>` : ''}
    <div class="sec">Working now<span class="faint"> · ${counts().projects[p.alias]?.working ?? 0}</span></div>
    ${busyList(p)}
    <div class="sec">Tasks in progress</div>
    ${active.length ? `<div class="list">${active.map(t => taskRow(t)).join('')}</div>` : '<div class="hint">No active tasks.</div>'}
    <div class="sec">Recent</div>
    <ul class="timeline">${p.events.slice(0, 8).map(e => eventLine(e, false)).join('') || '<div class="hint">Nothing yet.</div>'}</ul>`;
}

// The same busy agents the Office and sidebar count, in one plain line each.
function busyList(p) {
  const busy = p.team.agents.filter(x => isBusy(x.state));
  if (!busy.length) return '<div class="hint">Nobody is working right now.</div>';
  return `<div class="list">${busy.map(x => {
    const who = x.kind === 'lead' ? 'Lead' : x.reviewingFor ? `Reviewer on ${esc(x.reviewingFor)}'s work` : esc(x.who[0].toUpperCase() + x.who.slice(1));
    const sub = x.kind === 'auditor' ? esc(x.meta) : x.id ? esc(progressLine(x)) : esc(x.meta || '');
    const inner = `${st('running')}<span class="t">${who}: ${esc(x.what)}<small>${sub}</small></span>`;
    return x.href ? `<a class="item" href="${esc(x.href)}">${inner}</a>` : `<div class="item" style="cursor:default">${inner}</div>`;
  }).join('')}</div>`;
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
  const run = p.team.agents.find(x => x.kind === 'auditor')?.audit;
  const banner = run ? `<div class="box" style="margin-top:14px"><div class="label"><span class="sdot" style="background:var(--accent)"></span> Audit running</div>
    Started ${run.startedMin} min ago · ${esc(run.stage)}${run.checkers ? ` <span class="faint">(${run.checkers} checkers each take one slice of your charter, outcomes and spec; a final pass tries to knock down every finding before you see it)</span>` : ''}</div>` : '';
  const head = banner + `<div class="btns" style="margin:14px 0">${run ? '' : `<button class="btn" data-do="audit" data-project="${esc(p.alias)}">Run audit now</button>`}
    <span class="hint">The auditor is your check on the whole team, the lead included. It never sees the lead's plan: it judges the finished product against your own words and reports only to you, here. (The reviewer is different: it checks each task before it merges and works for the lead.)${p.lastAudit ? ` Last run ${esc(ago(p.lastAudit.at))} ago.` : ''}</span></div>`;
  const when = '<span class="hint" style="display:block;margin-bottom:10px">Audits start on their own once the team is building: after a few tasks are merged, or once a day while work lands.</span>';
  if (!list.length) return head + when + '<div class="empty"><b>Nothing from the auditor</b>When it finds something only you can decide, it shows up here and in your inbox. Smaller things go straight to the lead.</div>';
  const a = esc(p.alias);
  const row = f => `<details class="item" style="display:block;cursor:default"><summary style="display:flex;gap:10px;align-items:center;cursor:pointer;list-style:none">
      ${st(f.status === 'open' ? f.severity : ['fixed', 'dismissed'].includes(f.status) ? 'done' : 'queued')}<span class="t" style="white-space:normal">${esc(f.headline || f.claim)}<small>${FINDING_STATE[f.status] || esc(f.status)}${f.ownerNote ? ` · your note: “${esc(f.ownerNote)}”` : ''}</small></span></summary>
      <div style="padding:8px 0 4px 24px">${f.impact ? md(`**If nobody fixes it:** ${f.impact}`) : ''}${findingTech(f)}
      ${f.status === 'open' ? `<div class="btns" style="margin-top:8px"><button class="btn primary" data-do="finding" data-verdict="confirm" data-project="${a}" data-id="${esc(f.id)}">Yes, fix it</button><button class="btn" data-do="finding" data-verdict="dismiss" data-project="${a}" data-id="${esc(f.id)}">No, it's fine</button></div>` : ''}</div></details>`;
  const group = (title, hint, xs) => xs.length ? `<div class="sec">${title}<span class="faint"> · ${hint}</span></div><div class="list">${xs.map(row).join('')}</div>` : '';
  const by = (...s) => list.filter(f => s.includes(f.status));
  return head + when
    + group('Your call', 'should the team change this?', by('open'))
    + group('Being fixed', 'the lead has these', by('confirmed', 'sent-to-lead'))
    + group('Settled', 'fixed, or you said it\'s fine', by('fixed', 'dismissed', 'withdrawn'));
}

const FINDING_STATE = { open: 'waiting for you', confirmed: 'you asked for a fix · with the lead', 'sent-to-lead': 'small: the auditor sent it to the lead', fixed: 'the lead fixed it · the next audit checks', dismissed: 'you said it\'s fine', withdrawn: 'withdrawn: nothing was built yet' };
// Mockups live on the dashboard's sibling port (their own origin), on whatever host this page uses.
const viewUrl = r => `${location.protocol}//${location.hostname}:${r.viewPort}${r.open}`;

// The auditor's working notes, folded away: there if you want them, not in the way.
function findingTech(f) {
  return `<details style="margin:8px 0"><summary class="faint" style="cursor:pointer">Technical details</summary>${md(`**What you asked for:** ${f.expected}\n\n**What the auditor found:** ${f.observed}\n\n**Evidence:** ${f.evidence}`)}</details>`;
}

const DOCS = [['charter', 'Charter'], ['rulings', 'Rulings'], ['brief', 'Brief'], ['spec', 'Spec'], ['design', 'Design'], ['contracts', 'Contracts'], ['plan', "Lead's plan"], ['ledger', "Lead's ledger"], ['messages', 'Team messages']];
function projDocs(p, sub = 'charter') {
  const a = esc(p.alias);
  let body;
  if (sub === 'charter') {
    body = `<div class="btns" style="margin-bottom:10px"><span class="hint">${p.charter ? `Approved ${esc(ago(p.charter.approvedAt))} ago${p.charter.tampered ? ' · <span style="color:var(--red)">changed since</span>' : ''}.` : 'Not approved yet.'} Only you change this; every agent reads it.</span></div>
      <textarea class="code" id="charter-text" aria-label="Charter">${esc(p.docs.charter)}</textarea>
      <div class="btns"><button class="btn" data-do="charter-save" data-project="${a}">Save</button></div>
      <div class="box decide"><div class="label">Approve in your own words</div><textarea id="d-text" aria-label="Your approval, in your own words" placeholder="e.g. Yes, this is what I want built"></textarea><button class="btn primary" data-do="charter-approve" data-project="${a}">Approve charter</button></div>`;
  } else if (sub === 'rulings') {
    body = `${md(p.docs.rulings || 'No rulings yet.')}<div class="box"><div class="label">Add a ruling</div><textarea id="d-text" aria-label="New ruling" placeholder="e.g. No modal dialogs: edit inline"></textarea><button class="btn" data-do="ruling" data-project="${a}">Add ruling</button></div>`;
  } else if (sub === 'messages') {
    body = p.messages.length ? `<div class="hint" style="margin-bottom:8px">Specialists message each other directly. Nothing here binds anyone; decisions go through the lead.</div><ul class="timeline">${p.messages.map(m => `<li><span>${st('queued')}</span><span><span class="muted">${esc(m.fromRole || m.from)} → ${esc(m.to)} · ${esc(m.type)}</span><br>${esc(m.text)}</span><span class="when">${esc(ago(m.at))}</span></li>`).join('')}</ul>` : '<div class="hint">No messages yet.</div>';
  } else if (sub === 'design' || sub === 'contracts') {
    const r = p.reviews?.[sub];
    body = !r || (!r.doc && !r.open) ? `<div class="hint">No ${sub} yet.</div>`
      : `<div class="btns" style="margin-bottom:12px">${r.open ? `<a class="btn primary" href="${esc(viewUrl(r))}" target="_blank" rel="noopener">Open the clickable screens</a>` : ''}
          <span class="hint">${r.merged ? '' : 'Latest version from the specialist, not merged yet. '}${r.files} file${r.files === 1 ? '' : 's'}.</span></div>${md(r.doc || '')}`;
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
  const sel = (dial, value, options, label) => `<select data-dial="${dial}" data-project="${a}" aria-label="${label}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const gates = ['brief', 'spec', 'design', 'contracts'];
  return `<div class="sec">How much you're involved</div>
    <dl class="kv">
      <dt>You approve</dt><dd><div class="btns">${gates.map(g => `<label class="tick"><input type="checkbox" data-gate="${g}" data-project="${a}" ${p.ownerGates.includes(g) ? 'checked' : ''}> ${g}</label>`).join('')}</div><div class="hint">Unticked phases are approved by the lead and logged. The auditor still checks after every phase. Your charter is always yours.</div></dd>
      <dt>What you read</dt><dd>${sel('summaryStyle', p.summaryStyle, [['plain', 'Plain: short, non-technical summaries'], ['technical', 'Technical: full detail']], 'What you read')}</dd>
      <dt>Gating</dt><dd>${sel('trust', p.trust, [['strict', 'Strict: approve every phase and task'], ['standard', 'Standard: approve phases'], ['loose', 'Loose: approve the brief only']], 'Gating')}</dd>
      <dt>Reporting</dt><dd>${sel('reporting', p.reporting, [['everything', 'Everything'], ['daily', 'Daily digest'], ['exceptions', 'Exceptions only']], 'Reporting')}</dd>
      <dt>Shipping</dt><dd>${sel('autonomy', p.autonomy, [['merge', 'Straight to main after review'], ['pr', 'Draft PRs you merge'], ['branch', 'Local branches only']], 'Shipping')}</dd>
      <dt>Spend per task</dt><dd>${sel('budgetTask', String(p.budget?.task), [...new Set([5, 10, 15, 20, 30, 50, Number(p.budget?.task)])].sort((x, y) => x - y).map(v => [String(v), `${v} (then the lead decides whether to extend)`]), 'Spend per task')}</dd>
      <dt>Spend per day</dt><dd>${sel('budgetDay', String(p.budget?.day), [...new Set([20, 40, 60, 100, 150, 250, 400, Number(p.budget?.day)])].sort((x, y) => x - y).map(v => [String(v), `${v} for the whole team, lead included`]), 'Spend per day')}<div class="hint">API-equivalent dollars: on your plan this measures usage, not a bill. When the day's budget is used up, new work waits until tomorrow.</div></dd>
      <dt>Earned trust</dt><dd>${p.suggestion ? `${esc(p.suggestion.dial)} → ${esc(p.suggestion.to)}: ${p.suggestion.ready ? '<b>earned</b>' : 'not yet'} <span class="hint">(${esc(p.suggestion.why)})</span>` : '—'}</dd>
    </dl>
    <div class="sec">Your Claude plan<span class="faint"> · applies to all projects</span></div>
    <dl class="kv">
      <dt>5-hour window</dt><dd>${paceSel('fiveHour', state.pace?.fiveHour, [50, 60, 70, 80, 90])}</dd>
      <dt>Week</dt><dd>${paceSel('sevenDay', state.pace?.sevenDay, [50, 60, 70, 75, 80, 90])} <label class="tick"><input type="checkbox" data-pace-spread ${state.pace?.spread ? 'checked' : ''}> spread evenly over the week</label>
        <div class="hint">You use the same plan yourself. Atelier pauses when your usage reaches these levels, and resumes when the window resets.${state.pace?.holdingUntil ? ` <b>Holding now</b> until ${esc(new Date(state.pace.holdingUntil * 1000).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}.` : ''}</div></dd>
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
  const hash = location.hash;
  const t = await get(`/api/task/${encodeURIComponent(id)}`);
  if (location.hash !== hash) return; // the owner has already moved on
  if (busy() && $('app')?.dataset.task === id) return; // the owner is typing an answer or reading a fold
  const m = t.meta;
  const s = taskStatus(m);
  const crit = t.criteria || [];
  const right = m.status === 'planned' ? `<button class="btn primary" data-do="plan-approve" data-id="${esc(m.id)}">Approve plan</button>`
    : ['running', 'queued'].includes(m.status) ? `<button class="btn danger" data-do="task-stop" data-id="${esc(m.id)}">Stop</button>` : '';
  const evIcon = e => st(/failed|FAIL|stalled/.test(`${e.type} ${e.msg}`) ? 'needs-you' : e.type === 'done' || /pass|approve/.test(e.msg) ? 'done' : e.type === 'started' || e.type === 'iteration' ? 'running' : 'queued');
  legacy(`${topbar(`${m.project ? `<a href="#/p/${esc(m.project)}/tasks">${esc(m.project)}</a><span>/</span>` : ''}<b>${esc(m.id)}</b>`, right)}
    <div class="page"><div class="task">
      <div>
        <div class="muted" style="display:flex;gap:8px;align-items:center">${st(s)} ${STATUS_WORD[s] || s}${m.reason ? ` · ${esc(m.reason)}` : ''}</div>
        <h1 style="font-size:20px;font-weight:600;margin:6px 0 4px">${esc(m.title)}</h1>
        ${m.status === 'needs-you' ? `<div class="box decide"><div class="label">The agent needs you</div>${md(t.questions.split(/^## /m).slice(-1)[0] || m.reason)}<textarea id="d-text" aria-label="Your answer" placeholder="Your answer"></textarea><button class="btn primary" data-do="answer" data-id="${esc(m.id)}">Send answer</button></div>` : ''}
        ${t.live?.current || t.live?.history?.length ? `<div class="box" style="margin-top:12px">
          <div class="label">Progress ${iterDots({ live: t.live })} <span class="faint">${(t.live.history || []).length} of ${esc(m.iterations)} iterations finished${t.spend ? ` · ${money(t.spend.spent)} of its ${money(t.spend.limit)} budget` : ''}</span></div>
          ${t.live.current ? `<div>Iteration ${t.live.current.n} is ${t.live.current.minutes} min in: ${t.live.current.actions} steps so far, ${t.live.current.edited} file${t.live.current.edited === 1 ? '' : 's'} changed.</div>
            <ul class="hint" style="margin:6px 0 0 18px;padding:0">${t.live.current.recent.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
        </div>` : ''}
        ${t.evidence && (t.evidence.files.length || t.evidence.notes) ? `<div class="sec">Shown working</div>
          <div class="box">${t.evidence.notes ? md(t.evidence.notes) : ''}
            <div class="evid">${t.evidence.files.map(f => {
              const u = f.url && t.evidence.viewPort ? `${location.protocol}//${location.hostname}:${t.evidence.viewPort}${f.url}` : '';
              if (!u) return `<span class="hint">${esc(f.name)}</span>`;
              if (f.image) return `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(f.name)}" loading="lazy"></a>`;
              if (f.video) return `<video src="${esc(u)}" controls preload="metadata"></video>`;
              return `<a class="btn ghost" href="${esc(u)}" target="_blank" rel="noopener">${esc(f.name)}</a>`;
            }).join('')}</div></div>` : ''}
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
    </div></div>`);
  $('app').dataset.task = id;
}

// ---------- new project ----------
function renderNew() {
  if ($('new-form')) return; // a refresh never wipes what the owner is typing
  legacy(`${topbar('<a href="#/projects">Projects</a><span>/</span><b>New project</b>')}
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
    </form></div>`);
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

// ---------- toasts for the old screens (same component as the Inbox's, no Undo) ----------
function toast(text, { error } = {}) {
  const box = $('toasts');
  box.innerHTML = `<div class="toast ${error ? 'toast-error' : 'toast-success'}" role="status"><span class="tick">${I(error ? 'alert' : 'check')}</span><span class="toast-text">${esc(text)}</span></div>`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { box.innerHTML = ''; }, 3200);
}

// ---------- the old screens' actions (unchanged names and arguments) ----------
document.addEventListener('click', async e => {
  const tr = e.target.closest('[data-try]');
  if (tr) { tr.setAttribute('aria-busy', 'true'); tr.textContent = 'Trying…'; refresh().catch(() => {}); return; }
  const b = e.target.closest('[data-do]');
  if (!b) return;
  const d = b.dataset;
  const text = ($('d-text')?.value || '').trim();
  b.disabled = true;
  try {
    switch (d.do) {
      case 'gate-approve': if (!text) return toast('Write your approval in your own words first'); await act({ action: 'gate-approve', project: d.project, phase: d.phase, quote: text }, `${d.phase} approved`); break;
      case 'gate-skip': if (!text) return toast('Say why you\'re skipping this phase'); await act({ action: 'gate-skip', project: d.project, phase: d.phase, quote: text }, `${d.phase} skipped`); break;
      case 'criterion': if (d.verb === 'reject' && !text) return toast('Say what\'s wrong, so it can become a ruling'); await act({ action: 'criterion', project: d.project, id: d.id, verb: d.verb, note: text }, `${d.id} ${d.verb === 'accept' ? 'accepted' : d.verb + 'd'}`); break;
      case 'criteria-all': await act({ action: 'criteria-approve-all', project: d.project, ids: d.ids }, 'Outcomes approved'); break;
      case 'plan-approve': await act({ action: 'plan-approve', id: d.id }, 'Approved. Work starts now'); break;
      case 'answer': if (!text) return toast('Write an answer first'); await act({ action: 'answer', id: d.id, text }, 'Answer sent; the task resumes'); break;
      case 'finding': await act({ action: 'finding', project: d.project, id: d.id, verdict: d.verdict, note: text }, d.verdict === 'confirm' ? 'Sent to the lead to fix' : "Noted: it won't come up again"); break;
      case 'screen': await act({ action: 'screen', project: d.project, id: d.id, verdict: d.verdict }, d.verdict === 'allow' ? 'Allowed' : 'Declined'); break;
      case 'screen-seen': await act({ action: 'screen-seen', project: d.project, id: d.id }, 'Noted'); break;
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
  const th = e.target.closest('select[data-theme-pick]');
  if (th) { if (th.value === 'auto') { try { localStorage.removeItem('atelier-theme'); } catch { /* private mode */ } } else store.set('atelier-theme', th.value); applyTheme(); return toast('Saved on this device'); }
  const g = e.target.closest('input[data-gate]');
  if (g) {
    const list = [...document.querySelectorAll(`input[data-gate][data-project="${CSS.escape(g.dataset.project)}"]`)].filter(x => x.checked).map(x => x.dataset.gate);
    return act({ action: 'dial', project: g.dataset.project, dial: 'ownerGates', value: list.join(',') }, list.length ? `You approve: ${list.join(', ')}` : 'All phases delegated to the lead');
  }
  const s = e.target.closest('select[data-dial]');
  if (s) return act({ action: 'dial', project: s.dataset.project, dial: s.dataset.dial, value: s.value }, 'Saved');
  const pc = e.target.closest('select[data-pace]');
  if (pc) return act({ action: 'pace', [pc.dataset.pace]: pc.value }, `Atelier pauses at ${pc.value}%`);
  const sp = e.target.closest('input[data-pace-spread]');
  if (sp) return act({ action: 'pace', spread: sp.checked }, sp.checked ? 'Spread over the week' : 'No weekly pacing');
});

// The owner is typing or reading an open fold: don't redraw under them.
function busy() {
  const el = document.activeElement;
  return (el && ['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) || !!document.querySelector('.legacy details[open]:not([data-auto])');
}

// Refresh every 15 seconds while visible (the Inbox redraws only what changed, so it never waits on busy()).
setInterval(() => {
  refreshSoon.tries = 0;
  if (document.hidden) return;
  if (!state && !failedAt) return;
  if (busy() && !/^#\/inbox|^$/.test(location.hash)) return;
  refresh().catch(() => {});
}, 15000);
document.addEventListener('visibilitychange', () => { refreshSoon.tries = 0; if (!document.hidden && (state || failedAt)) refresh().catch(() => {}); });

renderLoading();
refresh().catch(() => {});
