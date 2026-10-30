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
// Ages in words, for the eyebrow, desks and pages ("4 min ago", "yesterday").
const longAgo = iso => {
  const t = Date.parse(iso); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = new Date(t);
  return m < 2880 ? 'yesterday' : m < 7 * 1440 ? d.toLocaleDateString('en-GB', { weekday: 'long' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
// A title in plain words (F-18): codes like R-31, AC-1, F-14 or M2-A7 are for agents, so a bracket that holds only
// codes goes, and so do codes leading the title. Everything else stays as written.
const CODE = '[A-Z][A-Z0-9]{0,3}-?[A-Z]{0,2}\\d+[a-z]?';
const CODES_IN_BRACKETS = new RegExp(`\\s*[(\\[]\\s*${CODE}(?:\\s*(?:[,;/&]|and)\\s*${CODE})*\\s*[)\\]]`, 'g');
const CODES_LEADING = new RegExp(`^(?:${CODE}(?:\\s*[:—–]\\s*|\\s+))+(?=\\S)`);
const plainTitle = s => cap1(String(s || '').replace(CODES_IN_BRACKETS, '').replace(CODES_LEADING, '').trim()) || String(s || '');
const PHASES = ['brief', 'spec', 'design', 'contracts', 'build'];
const resetIn = sec => { const m = Math.round((sec * 1000 - Date.now()) / 60000); return m <= 0 ? 'now' : m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h ${m % 60} min`; };
// The one money formatter (F-9): $250 for whole dollars, $72.02 otherwise.
const money = n => { const c = Math.round((Number(n) || 0) * 100); return `$${c % 100 ? (c / 100).toFixed(2) : c / 100}`; };
const HHMM = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }); // one formatter: building one per call is slow on a phone
const hhmm = t => HHMM.format(new Date(t));
const DMY_ = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const DMY = { format: d => DMY_.format(d).replace(/ /g, ' ') }; // "Tue 3 Nov" never breaks across lines
// A reset time (epoch seconds) that can't be misread (F-13): "today 14:00", "tomorrow 02:00", or "Tue 3 Nov, 02:00".
const resetAt = sec => {
  const t = sec * 1000, d = new Date(t), now = new Date();
  if (t - now > 864e5) return `${DMY.format(d)}, ${hhmm(t)}`;
  return `${d.toDateString() === now.toDateString() ? 'today' : 'tomorrow'} ${hhmm(t)}`;
};
// The 5-hour window keeps its countdown after the time: "today 14:00, in 25 min".
const resetSoon = sec => `${resetAt(sec)}${resetIn(sec) === 'now' ? '' : `, ${resetIn(sec)}`}`;
// The Claude plan in words, the same on every screen (F-4, F-16): each window always says "used", where Atelier stops
// (Settings › pause at), so how much at least stays the owner's, and when it resets:
// "Week: 44% used. Atelier stops at 90%, so at least 10% stays yours. Resets Tue 3 Nov, 02:00."
// `rest` is that line after "Week: 44% used." for a meter that already shows the figure.
const planWords = (plan, pace) => {
  const one = (name, x, stop, when) => {
    if (!x) return null;
    const used = `${x.used}% used`;
    const mid = !stop ? '' : x.used < stop ? `Atelier stops at ${stop}%, so at least ${100 - stop}% stays yours. ` : `Atelier has stopped at ${stop}%, so the rest is yours. `;
    const rest = `${mid}Resets ${when(x.resetsAt)}.`;
    return { used, rest, line: `${name}: ${used}. ${rest}` };
  };
  const five = one('5‑hour', plan?.fiveHour, Number(pace?.fiveHour) || 0, resetSoon), week = one('Week', plan?.sevenDay, Number(pace?.sevenDay) || 0, resetAt);
  const short = [week && `week ${week.used}`, five && `5‑hour ${five.used}`].filter(Boolean).join(', ');
  return { five, week, short, lines: [week, five].filter(Boolean).map(x => x.line) };
};

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
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/>',
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
// Audio proof (voice projects): a player in a proof frame's box, its file name as the caption. src is a view-port URL.
const sounds = (list, src) => list.length ? `<div class="sounds">${list.map(f => `<figure class="sound"><span class="sound-box"><audio src="${esc(src(f))}" controls preload="none" aria-label="${esc(f.name)}"></audio></span>
    <figcaption class="frame-cap"><b>${esc(f.name)}</b><span>Sound</span></figcaption></figure>`).join('')}</div>` : '';
// What the lead attached to a message (lib/asks.mjs): pictures and recordings as frames, sound as players, pages,
// PDFs and links as links. Everything opens on the view port, never the dashboard's own origin.
function askMedia(a, { hero = true } = {}) {
  const url = f => a.viewPort && f.url ? `${location.protocol}//${location.hostname}:${a.viewPort}${f.url}` : '';
  const files = (a.files || []).filter(f => url(f));
  const cap = f => f.name.replace(/\.\w+$/, '').replace(/^[a-z0-9]{4}-/, '').replace(/[-_]+/g, ' ');
  const pics = files.filter(f => f.image || f.video), heard = files.filter(f => f.audio), other = files.filter(f => !f.image && !f.video && !f.audio);
  const frame = f => `<a href="${esc(url(f))}" target="_blank" rel="noopener" class="frame${/(390|360|phone)/i.test(f.name) ? ' is-phone' : ''}" aria-label="${esc(cap(f))}, opens full size in a new tab">
      <span class="frame-img">${f.video ? `<video src="${esc(url(f))}" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover"></video><span class="play">${I('play')}Recording</span>` : `<img src="${esc(url(f))}" alt="" decoding="async" loading="lazy">`}</span>
      <span class="frame-cap"><b>${esc(cap(f))}</b><span>Open ${I('external')}</span></span></a>`;
  const links = [...other.map(f => `<a href="${esc(url(f))}" target="_blank" rel="noopener">${I(f.page ? 'external' : 'log')}${f.page ? 'Open the page' : 'Open'}: ${esc(cap(f))}</a>`),
    ...(a.links || []).filter(l => /^https?:\/\//.test(l)).map(l => `<a href="${esc(l)}" target="_blank" rel="noopener">${I('external')}${esc(l.replace(/^https?:\/\//, ''))}</a>`)];
  return `${pics.length ? `<div class="frames${hero ? ' is-hero' : ''}">${pics.map(frame).join('')}</div>` : ''}${sounds(heard, url)}${links.length ? `<div class="links">${links.join('')}</div>` : ''}`;
}
const ASK_KIND = { approval: 'Approval', question: 'Question', feedback: 'Feedback wanted', update: 'Update', note: 'You wrote' };
// A command the lead wants run on this PC (atelier ask … --run): shown word for word before approving, its output after.
const RUN_STATE = { waiting: 'Runs when you approve', running: 'Running now', done: 'Ran fine', failed: 'Ran, and it failed', 'not-run': 'Not run' };
function askRun(a) {
  const r = a.run;
  if (!r) return '';
  const out = [r.error, (r.output || '').trim().split('\n').slice(-12).join('\n')].filter(Boolean).join('\n');
  return `<div class="m-run"><p class="section-label" style="margin:0">${esc(RUN_STATE[r.state] || r.state)} · on this PC${r.cwd ? ` in ${esc(r.cwd)}` : ''} · ${esc(r.shell)}</p>
    <pre class="m-cmd"><code>${esc(r.command)}</code></pre>${out ? `<details class="details"><summary>What it printed</summary><pre class="m-cmd"><code>${esc(out)}</code></pre></details>` : ''}</div>`;
}

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
// A running task the runner holds for the plan window (the server's 'paced' state): waiting, not working, never quiet.
const pacedWords = x => `Waiting for your plan window${x?.resumesAt ? `, carries on at ${x.resumesAt}` : ''}`;
// A task's reason as one plain sentence (F-6, SPEC R3). The runner's raw note (prefixes, commands, hashes, branch names)
// stays on the task page under Details; rows and steps show only this.
function reasonWords(t) {
  const r = String(t?.reason || '').trim();
  if (!r) return '';
  if (/^paced:/.test(r)) return 'Waiting for your plan window';
  if (/cancelled by (the )?owner/i.test(r)) return 'You cancelled it';
  if (/cancelled/i.test(r)) return 'The lead cancelled it';
  if (/superseded/i.test(r)) return 'Replaced by later work';
  if (/^(merged|landed|in main)\b/i.test(r)) { const b = r.match(/\b(?:into|on|in) (main|v\d+)\b/i)?.[1]; return b ? `Merged into ${b}` : 'Merged'; }
  if (/^ready on (local )?branch/i.test(r)) return 'Ready on its branch for you to merge';
  if (/^(waiting on request|request:)/i.test(r)) return 'Waiting on another teammate';
  if (/in review/i.test(r)) return 'In review';
  if (t.status === 'paused' && /owner/i.test(r)) return 'You stopped it';
  // Anything else: keep it only if it already reads as a short plain sentence.
  const s = r.replace(/^[a-z-]+:\s*/i, '').replace(/\s*\([0-9a-f]{7,40}\)/g, '').trim();
  return s.length <= 70 && !/[`/\\#{}<>=]|\b[0-9a-f]{7,40}\b|\b[a-z]+\/[a-z0-9-]+\b|\.(md|mjs|js|json)\b/i.test(s) ? cap1(s) : '';
}
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
  const [, kind, a] = (location.hash || '#/inbox').split('?')[0].split('/');
  if (kind === 'p' && a) return decodeURIComponent(a);
  const sp = kind === 'settings' && new URLSearchParams(location.hash.split('?')[1] || '').get('p');
  if (sp) return sp; // one project's settings sit under that project in the sidebar (D6)
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
  const plan = C?.plan?.fiveHour, pw4 = planWords(C?.plan, state?.pace);
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
      <a class="nav-item" href="#/projects"${aria('projects')}>${I('projects')}Projects</a>
      ${P.map(p => `<a class="nav-item" href="#/p/${esc(p.alias)}/overview"${aria(p.alias)} aria-label="${esc(p.alias)}${n(pw(p.alias)) && `, ${pw(p.alias)} waiting`}, lead ${p.lead?.running ? 'on' : 'off'}"><span class="dot${p.lead?.running ? ' dot-active' : ''}" role="img" aria-label="${p.lead?.running ? 'Lead on' : 'Lead off'}"></span>${esc(p.alias)}<span class="count">${n(pw(p.alias))}</span></a>`).join('')}
      <a class="nav-item" href="#/new"${aria('new')}>${I('plus')}New project</a>
    </nav>
    <div class="sidebar-foot">
      <div class="meter" title="Your whole Claude plan: this includes your own chats and Claude Code sessions, not just Atelier."><div class="meter-head"><span>Claude plan</span></div><div class="meter-track${plan && plan.used >= 100 ? ' is-full' : ''}" role="img" aria-label="${k && plan ? `${plan.used}% of the 5-hour window used` : 'Plan use not known yet'}"><i style="--value:${k && plan ? Math.min(100, plan.used) : 0}%"></i></div>${k && pw4.lines.length ? [pw4.five, pw4.week].filter(Boolean).map(x => `<span class="meter-foot">${esc(x.line)}</span>`).join('') : '<span class="meter-foot">Shows after the first run</span>'}</div>
      <div class="meter"><div class="meter-head"><span>Spent today</span><b class="num">${spent}</b></div><span class="meter-foot">${esc(limitLine)}</span></div>
      <a class="nav-item" href="#/settings"${aria('settings')} style="margin:0 calc(-1 * var(--space-2))">${I('settings')}Settings</a>
    </div>`;
  $('rail').innerHTML = `
    <a class="brand" href="#/inbox" aria-label="Atelier, Inbox">${markN1(22)}</a>
    <a href="#/inbox" aria-label="${inboxLabel}"${aria('inbox')}>${I('inbox')}${n(now.waiting) && `<span class="rc${now.needs ? ' is-needs' : ''}">${now.waiting}</span>`}</a>
    <a href="#/office" aria-label="Office${k ? `, ${now.working} working` : ''}"${aria('office')}>${I('office')}${n(now.working) && `<span class="rc is-active">${now.working}</span>`}</a>
    <a href="#/activity" aria-label="Activity"${aria('activity')}>${I('activity')}</a>
    <hr>
    <a href="#/projects" aria-label="Projects"${aria('projects')}>${I('projects')}</a>
    ${P.map(p => `<a href="#/p/${esc(p.alias)}/overview" aria-label="${esc(p.alias)}${n(pw(p.alias)) && `, ${pw(p.alias)} waiting`}, lead ${p.lead?.running ? 'on' : 'off'}"${aria(p.alias)}><span class="ini">${esc(p.alias.slice(0, 2))}</span><span class="dot${p.lead?.running ? ' dot-active' : ''}"></span></a>`).join('')}
    <a href="#/new" aria-label="New project"${aria('new')}>${I('plus')}</a>
    <a class="push" href="#/settings" aria-label="Settings${k && plan ? `, plan ${plan.used}% used` : ''}${k ? `, ${spent} spent today` : ''}"${aria('settings')}>${I('settings')}</a>`;
  $('top').innerHTML = `
    <a class="brand" href="#/inbox" aria-label="Atelier, Inbox">${lockup(20)}</a>
    <a class="spend" href="#/settings" aria-label="Spent today on all projects ${k ? spent : 'not known yet'}.${k && pw4.lines.length ? ` Claude plan: ${pw4.lines.join(' ')}` : ''} Plan settings"><span class="spend-l">Today, all projects<b class="num">${spent}</b></span>${k && pw4.short ? `<span class="spend-p num">Plan: ${esc(pw4.short)}</span>` : ''}</a>
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
let vtSeq = 0; // the newest view transition owns ROOT's data-vt/data-dir
// Scroll per screen: a new screen opens at its top; Back/Forward returns to where you were on it. A project's
// sub-tabs are one screen (they keep the scroll), and the Inbox keeps its own (it scrolls an opened item to the top).
history.scrollRestoration = 'manual';
const screenOf = h => { const [p, q] = (h || '#/inbox').split('?'), [, kind, a] = p.split('/'); return kind === 'p' || kind === 't' ? `#/${kind}/${a}` : !kind || kind === 'inbox' ? '#/inbox' : q ? `${p}?${q}` : p; };
const scrollAt = new Map();
let shownScreen = null, traverse = false;
window.navigation?.addEventListener('navigate', e => { traverse = e.navigationType === 'traverse'; });
// A screen's live data can land well after its first draw and grow the page (the Office on real history), and scroll
// anchoring then carries the view past the spot. Keep putting it back as the page grows, until the owner scrolls or
// leaves, or the data has had 3 s to land.
let unhold = null;
function holdY(y) {
  unhold?.();
  if (!y) return;
  const screen = screenOf(location.hash), ro = new ResizeObserver(() => {
    if (screenOf(location.hash) !== screen) return unhold();
    if (Math.abs(scrollY - y) > 1) scrollTo({ top: y });
  });
  const stop = () => unhold?.(), ev = ['wheel', 'touchstart', 'pointerdown', 'keydown'], timer = setTimeout(stop, 3000);
  ro.observe(document.body);
  ev.forEach(n => addEventListener(n, stop, { capture: true, passive: true }));
  unhold = () => { ro.disconnect(); clearTimeout(timer); ev.forEach(n => removeEventListener(n, stop, { capture: true })); unhold = null; };
}
async function route({ refreshing = false, wait = false } = {}) {
  if (!state && !failedAt) return renderLoading();
  renderChrome();
  const [, kind, a, b, c] = (location.hash || '#/inbox').split('?')[0].split('/');
  const tab = tabOf(place());
  const prev = shownTab;
  const moved = prev && prev !== tab && !refreshing;
  const screen = screenOf(location.hash), y0 = scrollY;
  const newScreen = !refreshing && shownScreen !== null && screen !== shownScreen;
  const wantY = newScreen ? (traverse && scrollAt.get(screen)) || 0 : null;
  if (!refreshing && shownScreen) scrollAt.set(shownScreen, y0);
  // The first draw after a page load comes from refresh(): it still names the screen, so the first switch counts.
  if (!refreshing || shownScreen === null) { shownScreen = screen; traverse = false; }
  if (newScreen) holdY(wantY);
  // Called once the new screen has drawn: it can only scroll as far as the page is tall so far (holdY does the rest).
  const toY = () => { if (wantY !== null && screenOf(location.hash) === screen && Math.abs(scrollY - wantY) > 1) scrollTo({ top: wantY }); };
  const draw = async () => {
    try {
      if (kind === 'inbox' || !kind) return Inbox.show(a ? decodeURIComponent(a) : null, { refreshing });
      Inbox.leave();
      if (!state) return renderPageError();
      // A project's Activity tab is the Activity screen filtered to it (D6); old links land there too.
      if (kind === 'p' && a && b === 'activity') { history.replaceState(null, '', `#/activity?p=${a}`); return await Activity.show(false); }
      if (kind === 'p' && a && b === 'settings') { history.replaceState(null, '', `#/settings?p=${a}`); renderChrome(); return Settings.show(); }
      if (kind === 'p' && a) return await Project.show(decodeURIComponent(a), b || 'overview', c ? decodeURIComponent(c) : c, refreshing, wait);
      if (kind === 't' && a) return await Task.show(decodeURIComponent(a), refreshing);
      if (kind === 'new') return New.show();
      if (kind === 'projects') return Projects.show();
      if (kind === 'activity') return await Activity.show(refreshing, wait);
      if (kind === 'office') return Office.show();
      if (kind === 'settings') return Settings.show();
      return Inbox.show(null, { refreshing });
    } catch (e) {
      if (e.message !== 'signed out') legacy(`${topbar('<b>Error</b>')}<div class="page">${loadError('This page')}</div>`);
    }
  };
  shownTab = tab;
  // Leaving the Office (F-24): a view transition first paints a picture of the old screen, and the Office's live scenes
  // made that take 60-150 ms. The new screen draws at once and arrives with the same slide on its own; the Office's
  // observers stop after that first paint, not before it.
  if (moved && prev === 'office' && !document.hidden) {
    const dir = TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(prev) ? 'fwd' : 'back';
    if (!RM) {
      const v = $('view');
      ROOT.dataset.arrive = dir;
      const done = e => { if (e.target !== v) return; v.removeEventListener('animationend', done); v.removeEventListener('animationcancel', done); delete ROOT.dataset.arrive; };
      v?.addEventListener('animationend', done); v?.addEventListener('animationcancel', done);
    }
    const p = draw(); toY(); p.then(toY);
    requestAnimationFrame(() => setTimeout(Office.stop));
    return p;
  }
  // Switching screens: the new one slides in the way you went (Flow); reduced motion cross-fades once.
  if (moved && document.startViewTransition && !document.hidden) {
    const dir = TAB_ORDER.indexOf(tab) > TAB_ORDER.indexOf(prev) ? 'fwd' : 'back';
    ROOT.dataset.vt = 'tab'; ROOT.dataset.dir = dir;
    const view = $('view'); if (view && !RM) view.style.viewTransitionName = 'page';
    // The slide waits for what draws at once (cached data or a skeleton), never for a read: the new view stays live.
    // The old page's picture stays where it was on screen while the new one opens at its own scroll (shell.css --vt-dy).
    const t = document.startViewTransition(async () => {
      const p = draw(); p.then(toY);
      await Promise.race([p, new Promise(r => setTimeout(r, 50))]);
      toY(); ROOT.style.setProperty('--vt-dy', `${scrollY - y0}px`);
      const v = $('view'); if (v && !RM) v.style.viewTransitionName = 'page';
    });
    // Only clear our own marks: a later transition (the Inbox's own, or the next switch) may have set its own.
    const mine = ++vtSeq;
    t.finished.catch(() => {}).finally(() => { if (vtSeq !== mine) return; delete ROOT.dataset.vt; delete ROOT.dataset.dir; ROOT.style.removeProperty('--vt-dy'); $('view')?.style.removeProperty('view-transition-name'); });
    return t.updateCallbackDone.catch(() => {});
  }
  const p = draw(); toY(); p.then(toY);
  return p;
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
  if (place() === 'office') return Office.loading();
  if (place() === 'projects') return Projects.loading();
  if (place() === 'activity') return Activity.loading();
  if (Settings.here()) return Settings.loading();
  // First load only: skeletons where the Inbox will be, counts hidden in the chrome (DESIGN §5).
  const sk = (w, h = 12) => `<span class="skeleton" style="width:${w};height:${h}px"></span>`;
  $('view').innerHTML = `<header class="page-head"><h1>${place() === 'inbox' ? 'Inbox' : 'Atelier'}</h1><span class="summary">Loading…</span></header>
    <div class="inbox" aria-busy="true"><section class="focus"><div class="focus-head">${sk('40%')}${sk('70%', 28)}${sk('55%', 28)}</div><div class="focus-body">${sk('90%', 14)}${sk('75%', 14)}<div class="frames is-hero"><div class="frame is-loading"><span class="frame-img"></span></div><div class="frame is-loading"><span class="frame-img"></span></div><div class="frame is-loading"><span class="frame-img"></span></div></div></div></section>
    <aside class="queue" aria-label="Waiting on you"><div class="queue-group">${Array.from({ length: 5 }, () => `<div class="qitem is-skeleton"><span class="skeleton" style="width:28px;height:28px"></span><span class="skeleton" style="height:12px;width:85%;margin-top:4px"></span><span></span><span class="qitem-meta"><span class="skeleton" style="height:10px;width:45%;margin-top:6px"></span></span></div>`).join('')}</div></aside></div>`;
}
// A project or task page before its first read arrives: Now, facts and two sections as skeletons (DESIGN, project
// and task States), so the switch shows the new screen at once and a slow read never holds the old one.
function pageLoading(crumbs) {
  const sk = (w, h = 12) => `<span class="skeleton" style="display:block;width:${w};height:${h}px;margin-top:var(--space-2)"></span>`;
  legacy(`${topbar(crumbs)}<div class="page" aria-busy="true"><span class="sr-only">Loading…</span>
    ${sk('30%')}${sk('60%', 24)}<div class="box" style="margin-top:var(--space-4)">${sk('90%', 14)}${sk('70%', 14)}</div>
    ${[0, 1].map(() => `<div class="sec">${sk('120px')}</div><div class="box">${sk('80%', 14)}${sk('55%', 14)}</div>`).join('')}</div>`);
  delete $('app').dataset.task;
}
function renderPageError() {
  if (place() === 'projects') return Projects.error();
  if (Settings.here()) return Settings.error();
  if (place() === 'activity') return void ($('view').innerHTML = `<div class="scr acts"><header class="hf-head"><h1>Activity</h1><span class="end">${liveLine()}</span></header><div class="hf-body">${loadError('Activity')}</div></div>`);
  if (place() === 'office') return void ($('view').innerHTML = `<header class="hf-head"><h1>Office</h1><span class="end">${liveLine()}</span></header><div class="hf-body">${loadError('The Office')}</div>`);
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
  const S = { open: null, dock: 'ready', which: '', note: '', choice: '', items: [], hidden: new Map(), decided: [], ghost: null, active: false, each: new Set() };
  // each: projects whose batch of outcomes the owner chose to decide one at a time (Decide each)
  // hidden: key → { x, i, body, r, committed } for decisions inside their Undo window or sent and not yet gone from the server's list
  let ownHash = false;

  const nums = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const viewUrl = (port, p) => port && p ? `${location.protocol}//${location.hostname}:${port}${p}` : '';
  const frame = (url, cap, cls = '', play = '') => url
    ? `<a href="${esc(url)}" target="_blank" rel="noopener" class="frame ${cls}" aria-label="${esc(cap)}, opens full size in a new tab">
        <span class="frame-img"><img src="${esc(url)}" alt="" decoding="async" loading="lazy" onerror="this.closest('.frame').classList.add('is-broken');this.parentNode.innerHTML='Couldn’t load this picture. Open it instead'">${play ? `<span class="play">${I('play')}${esc(play)}</span>` : ''}</span>
        <span class="frame-cap"><b>${esc(cap)}</b><span>Open ${I('external')}</span></span></a>` : '';
  const quote = (text, who) => `<blockquote class="quote" style="margin:0">${text}${who ? `<footer>${who}</footer>` : ''}</blockquote>`;
  const para = s => String(s || '').split(/\n\s*\n/)[0];
  // The thing itself, inline (AC-15, F-8): a document through md(), folded to about 8 lines with Show all when longer.
  const shownAll = new Set(); // item ids whose document the owner opened in full
  const inlineDoc = (id, text) => {
    const long = String(text).split('\n').filter(l => l.trim()).length > 8 || text.length > 700, open = !long || shownAll.has(id);
    return `<div class="doc${open ? '' : ' is-clamped'}" id="doc-${cssId(id)}" tabindex="-1">${md(text)}</div>${open ? '' : `<button class="btn btn-secondary doc-all" type="button" data-act="show-all" data-for="${esc(id)}" aria-controls="doc-${cssId(id)}">Show all</button>`}`;
  };

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
            <div class="links">${r.open ? `<a href="${esc(viewUrl(r.viewPort, r.open))}" target="_blank" rel="noopener">${I('external')}Open the clickable screens</a>` : ''}${r.doc ? '' : `<a href="${P}/docs/${docTab}">${I('log')}Read the ${esc(q.phase)} document</a>`}</div>
            ${r.doc ? inlineDoc(base.id, r.doc) : ''}
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
          title: `${a} used today’s ${money(q.limit)}, so new work is paused`,
          body: () => `<p class="lede">The work already running finishes its current try. Nothing new starts until you raise the limit, or until midnight.</p>
            <div class="meter" style="max-width:var(--measure)"><div class="meter-head"><span>Spent today on ${A}</span><b>${money(q.spent)} of ${money(q.limit)}</b></div><div class="meter-track is-full"><i style="--value:100%"></i></div></div>
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
        const files = (pr?.files || []).map(f => ({ ...f, url: viewUrl(pr.viewPort, f.url) })).filter(f => f.url);
        const pics = files.filter(f => !f.audio), heard = files.filter(f => f.audio);
        return { ...base, glyph: 'proof', kind: 'Your judgement', short: 'your judgement',
          body: () => `<p class="lede">${pr?.notes ? `Shown working: ${esc(pr.notes.replace(/[*_`#]/g, ''))}` : 'Try it yourself, then say whether it holds.'}</p>
            ${pics.length ? `<div class="frames is-hero">${pics.slice(0, 3).map((f, i) => f.video ? `<a href="${esc(f.url)}" target="_blank" rel="noopener" class="frame" aria-label="Recording ${esc(f.name)}, opens in a new tab"><span class="frame-img"><video src="${esc(f.url)}" preload="metadata" muted playsinline style="width:100%;height:100%;object-fit:cover"></video><span class="play">${I('play')}Recording</span></span><span class="frame-cap"><b>Recording</b><span>Open ${I('external')}</span></span></a>` : frame(f.url, f.name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' '), /(390|360|phone)/i.test(f.name) && i ? 'is-phone' : '')).join('')}</div>` : ''}
            ${sounds(heard, f => f.url)}
            ${pr ? `<div class="links"><a href="#/t/${encodeURIComponent(pr.task)}">${I('log')}Open the task</a></div>` : ''}`,
          dock: { note: 'If you reject it, say what’s wrong', rejectNeedsNote: true, primaryNoNote: true, required: 'Say what’s wrong so the team can fix it.', primary: 'Accept', secondary: 'Reject',
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
        // The charter is still blank and the lead's draft waits beside it (F-2): approving saves the draft as written
        // (charter-save), then approves it (charter-approve), in that order; Edit first opens it in Docs, prefilled.
        if (q.draft) return { ...base, glyph: 'log', kind: 'Charter to approve', short: 'charter', title: 'Approve your charter',
          body: () => `<p class="lede">The lead drafted ${A}’s charter from your brief. Until you approve it, the team has no charter in your words to work from. Approve it as written, or edit it first.</p>
            ${q.text ? `<div class="doc">${md(q.text.replace(/^# .*\n/, ''))}</div>` : ''}`,
          dock: { note: 'Approve in your own words', required: 'Say in a few words what you approve. It goes to the lead.', primary: 'Approve as written', ghost: 'Edit first', ghostHref: `${P}/docs/charter`,
            send: (w, note) => [{ action: 'charter-save', project: a, text: q.draft }, { action: 'charter-approve', project: a, quote: note }],
            done: 'Approved. The lead plans the next step.', toast: 'Approved the charter as written.', log: `Approved the charter for ${a}` } };
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
          body: () => `<p class="lede">Each one is a sentence the lead checks before it calls the work done. Approve them together, or decide each one here.</p><ol class="olist">${list.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`,
          dock: { primary: `Approve all ${list.length}`, ghost: 'Decide each', ghostAct: 'each',
            send: () => ({ action: 'criteria-approve-all', project: a, ids: q.id }),
            done: `Approved. The lead adds all ${list.length} to the checks.`, toast: `Approved ${list.length} outcomes.`, log: `Approved ${list.length} outcomes for ${a}` } };
      }
      case 'plan':
        return { ...base, glyph: 'plan', kind: 'Task plan', short: 'task plan', title: `Start a task: ${q.title}`,
          body: () => `<p class="lede">The ${esc(q.role)} works on it: up to ${esc(q.iterations)} tries${q.budgetLimit ? `, at most ${money(q.budgetLimit)}` : ''}. Its brief says what it will change.</p>
            ${q.brief ? inlineDoc(base.id, q.brief) : ''}
            <details class="details"><summary>${I('chevron-down')}What it will be checked against</summary><div class="details-body"><span>${q.criteria ? `Outcomes ${esc(q.criteria)}.` : 'No outcomes cited yet.'}</span></div></details>`,
          dock: { primary: 'Approve plan', ghost: 'Open the task', ghostHref: `#/t/${encodeURIComponent(q.id)}`,
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
      case 'ask': {
        // The lead writing to the owner (atelier ask): its words, what it attached, and one dock per kind.
        const k = q.ask || {}, M = `${P}/messages`;
        const opts = k.options || [];
        const send = (verdict, text) => ({ action: 'ask-answer', project: a, id: k.id, verdict, text });
        const words = `${k.body ? `<div class="doc">${md(k.body)}</div>` : ''}${askMedia(k)}`;
        const thread = (k.thread || []).length ? `<p class="faint" style="margin:0;font-size:var(--text-sm)"><a class="link" href="${M}">${k.thread.length} earlier ${k.thread.length === 1 ? 'reply' : 'replies'} in this thread</a></p>` : '';
        const common = { ...base, glyph: { approval: 'outcome', question: 'question', feedback: 'design', update: 'log' }[k.kind] || 'log', kind: `${ASK_KIND[k.kind] || 'Message'} from the lead`, short: k.kind === 'update' ? 'update' : `lead ${k.kind}` };
        if (k.kind === 'approval') return { ...common, body: () => words + askRun(k) + thread,
          dock: { note: 'Add a note, or say what to change', rejectNeedsNote: true, primaryNoNote: true, required: 'Say what to change, so the lead can rework it.', primary: 'Approve', secondary: 'Not yet', ghost: 'All messages', ghostHref: M,
            send: (w, note) => send(w === 'secondary' ? 'decline' : 'approve', note),
            done: k.run ? 'Approved. It’s running on your PC; the lead gets the result.' : 'Approved. The lead carries on.', toast: `Approved: ${q.title}`, log: `Approved: ${q.title}`,
            alt: { done: 'Sent back with your note.', toast: 'Sent it back to the lead.', log: `Not yet: ${q.title}` } } };
        if (k.kind === 'question') return { ...common, body: () => `${words}
            ${opts.length ? `<fieldset class="choices" style="max-width:var(--measure)"><legend class="section-label" style="margin-bottom:var(--space-2)">Choose one</legend>${opts.map((o, i) => `<label class="choice"><input type="radio" name="ans" value="${i}"${S.choice === String(i) ? ' checked' : ''}> ${esc(o)}${k.recommend && o.toLowerCase() === k.recommend.toLowerCase() ? ' <span class="faint">(the lead’s pick)</span>' : ''}</label>`).join('')}</fieldset>` : ''}
            ${k.recommend && !opts.some(o => o.toLowerCase() === k.recommend.toLowerCase()) ? `<p class="faint" style="margin:0;font-size:var(--text-sm)">The lead suggests: ${esc(k.recommend)}</p>` : ''}${thread}`,
          dock: { note: opts.length ? 'Add to it, or write your own answer' : 'Your answer', required: 'Pick an answer or write your own. It goes to the lead.', needsAnswer: true, primary: 'Send answer', ghost: 'All messages', ghostHref: M,
            send: (w, note, choice) => send('answer', [opts[Number(choice)], note].filter(Boolean).join(': ') || k.recommend || ''),
            done: 'Answered. The lead carries on.', toast: 'Answered the lead.', log: `Answered: ${q.title}` } };
        if (k.kind === 'feedback') return { ...common, body: () => words + thread,
          dock: { note: 'What works, what doesn’t', required: 'Say what you think, even in a few words. It goes to the lead.', primary: 'Send feedback', secondary: 'Looks good', ghost: 'All messages', ghostHref: M,
            send: (w, note) => send('answer', w === 'secondary' ? (note ? `Looks good. ${note}` : 'Looks good') : note),
            done: 'Sent to the lead.', toast: 'Sent your feedback.', log: `Feedback: ${q.title}`,
            alt: { done: 'Told the lead it looks good.', toast: 'Said it looks good.', log: `Looks good: ${q.title}` } } };
        return { ...common, body: () => words + thread,
          dock: { note: 'Reply to the lead (optional)', primary: 'Got it', ghost: 'All messages', ghostHref: M,
            send: (w, note) => send(note ? 'answer' : 'seen', note),
            done: 'Noted.', toast: 'Noted.', log: `Read: ${q.title}` } };
      }
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
      // A task says its stage and latest step in words, its bar filled by stage (F-3); tries live on the task page.
      const stage = x.state === 'reviewing' || x.kind === 'reviewer' ? 3 : 1;
      const fig = x.audit?.checkers ? { n: x.audit.finished, of: x.audit.checkers, unit: 'checks' } : x.id ? { n: stage + 1, of: STAGES.length, unit: 'stage', words: [STAGES[stage], x.quietMin ? `Quiet for ${x.quietMin} min` : x.step].filter(Boolean).join(' · ') } : null;
      out.push({ id: `${p.alias}-${x.id || x.kind}`, what: x.what, meta: `${p.alias} · ${who}`, when: x.id && x.lastAt ? longAgo(x.lastAt) : c ? `${c.minutes} min in` : x.kind === 'auditor' ? (x.meta || '').replace(/ · .*/, '') : 'now', href: x.href || '', ...(fig || {}) });
    }
    return out;
  }
  const figure = a => a.unit === 'stage' ? a.words : `${a.n} of ${a.of} ${a.unit}`;

  // The list as the owner sees it: the server's queue, minus decisions made here that the server still lists.
  // Decide each: a batch of outcomes becomes one Outcome item per draft, as the server lists a single draft
  // (same kind, same key), so each is approved or retired with that item's own dock and Undo.
  const expand = q => q.flatMap(x => x.kind !== 'criteria' || !S.each.has(x.project) ? [x]
    : String(x.id).split(',').map((id, i) => ({ ...x, kind: 'criterion', id, title: x.statements?.[i] || id, statement: x.statements?.[i] || id, key: `criterion:${x.project}:${id}`, from: x.key })));
  function decideEach() {
    const x = list().find(y => y.id === S.open);
    if (!x || x.q.kind !== 'criteria') return;
    S.each.add(x.project);
    const first = `criterion:${x.project}:${String(x.q.id).split(',')[0]}`;
    transition('open', () => { S.open = first; sync(); S.dock = 'ready'; S.note = ''; S.choice = ''; setHash(first); toTop(); }, 1, () => [first]).then(focusTitle);
  }
  function sync() {
    const q = expand(state?.queue || []);
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
    return `<a href="${esc(a.href || '#/office')}" class="agent" data-agent="${esc(a.id)}"${named && rowsMove() ? vt(`w-${cssId(a.id)}`, 'row') : ''} aria-label="${esc(a.what)}. ${esc(a.meta)}${fig ? `. ${fig}` : ''}"><span class="agent-dot"><span class="dot dot-active${failedAt ? '' : ' is-live'}" role="img" aria-label="Working"></span></span><span class="agent-what">${esc(a.what)}</span><span class="agent-meta">${esc(a.meta)} · <span class="when">${esc(a.when)}</span></span>${a.of ? `<span class="agent-progress"><span class="track"><i style="--v:${Math.min(1, a.n / a.of).toFixed(4)}"></i></span><span class="fig">${esc(fig)}</span></span>` : ''}</a>`;
  }
  function ledgerRows(rows) {
    return rows.map(r => { const t = r.id && tname(r.id); return `<a href="#/p/${encodeURIComponent(r.project)}/overview" class="ledger-row"${r.id ? ` data-lid="${esc(r.id)}"` : ''} aria-label="${esc(r.what)}. ${esc(r.project)}, ${r.age === 'now' ? 'just now' : `${esc(r.age)} ago`}"${(r.id || r.key) && rowsMove() ? vt(`l-${cssId(r.id || r.key)}`, 'row') : ''}>${I('check')}<span class="what"${t ? vt(t, 'title') : ''}>${esc(r.what)}</span><span class="qitem-age">${esc(r.age)}</span><span class="meta">${esc(r.project)}</span></a>`; }).join('');
  }
  function queue() {
    const L = list(), now = L.filter(x => x.needs), later = L.filter(x => !x.needs), D = ledger(), W = working(), C = counts();
    const g = n => rowsMove() ? vt(n, 'row') : '';
    // Group counts are decisions, as the header's summary counts them: a batch split by "Decide each" lists its items but stays one (F-20).
    const nd = rows => new Set(rows.map(x => x.q?.from || x.id)).size;
    return `<aside class="queue" aria-label="Waiting on you">
      ${now.length ? `<div class="queue-group"><div class="queue-head is-needs"${g('h-now')}><span>Needs you now</span><span class="n">${nd(now)}</span></div>${now.map(qitem).join('')}</div>` : ''}
      ${later.length ? `<div class="queue-group"><div class="queue-head"${g('h-later')}><span>When you have a minute</span><span class="n">${nd(later)}</span></div>${later.map(qitem).join('')}</div>` : ''}
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
    const ghost = !d.ghost ? '' : d.ghostAct ? `<button class="btn btn-ghost" data-act="${esc(d.ghostAct)}"${dis}>${esc(d.ghost)}</button>`
      : `<a class="btn btn-ghost" href="${esc(d.ghostHref || '#/inbox')}">${esc(d.ghost)}</a>`;
    const msg = offline ? `<span class="dock-hint" style="white-space:normal">Waiting for Atelier to answer; decide once it’s back.</span>`
      : d.hint ? `<span class="dock-hint">${esc(d.hint)}</span>` : d.note ? `<span class="dock-hint"><span class="kbd">Ctrl</span><span class="kbd">↵</span> to send</span>` : '';
    return `<div class="dock" aria-label="Your decision" role="group"${vt('dock')}>${field ? `<div class="field">${field}${err}</div>` : ''}<div class="dock-row">${primary}${second}${ghost}${msg}</div></div>`;
  }
  function head() {
    const C = counts(), L = list(), n = C ? C.waiting : 0, u = C ? C.needsNow : 0;
    // The pager counts the server's items, as the summary does: the outcomes split out of one batch are one item.
    const src = L.map(x => x.q?.from || x.id), i = src.indexOf(src[L.findIndex(x => x.id === S.open)]);
    const pos = new Set(src.slice(0, i + 1)).size, of = new Set(src).size;
    const pager = L.length > 1 ? `<div class="pager"><span class="of num">${pos} of ${of}</span>
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
      // Left the Inbox while this waited (the hold after deciding, or a queued move): keep the state change,
      // never draw the Inbox over the screen the owner went to.
      if (!S.active) { update(); return Promise.resolve(); }
      if (!document.startViewTransition || document.hidden) { update(); render(); return Promise.resolve(); }
      const mine = ++vtSeq;
      ROOT.dataset.vt = kind; ROOT.dataset.dir = dir > 0 ? 'fwd' : dir < 0 ? 'back' : '';
      $('view').style.removeProperty('view-transition-name'); // a screen switch still finishing must not wrap the item
      FLY.clear(); fly().forEach(id => id && FLY.add(id)); nameFlying();
      const t = document.startViewTransition(() => { update(); if (S.active) render(); });
      return t.finished.catch(() => {}).finally(() => {
        if (vtSeq === mine) { delete ROOT.dataset.vt; delete ROOT.dataset.dir; }
        FLY.clear(); document.querySelectorAll('#ttl, .qitem-title, .ledger-row .what').forEach(e => { e.style.removeProperty('view-transition-name'); e.style.removeProperty('view-transition-class'); });
      });
    };
    chain = chain.then(run);
    return chain;
  }
  const focusTitle = () => { if (S.active) $('ttl')?.focus({ preventScroll: true }); };
  const toTop = () => { if (S.active) scrollTo({ top: 0 }); };
  function setHash(id) {
    const h = id ? `#/inbox/${encodeURIComponent(id)}` : '#/inbox';
    if (S.active && location.hash !== h) { ownHash = true; history.replaceState(null, '', h); ownHash = false; }
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
    transition('open', () => { dropGhost(id); S.open = id; S.dock = 'ready'; S.note = ''; S.choice = ''; setHash(id); toTop(); }, j - i, () => [id]).then(focusTitle);
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
    const box = $('toasts'), dk = document.querySelector('.focus .dock, .task .t-dock');
    if (!box) return; // the sign in screen has no shell
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
    if ((d.required && which === 'primary' && !d.primaryNoNote && !note && !(d.needsAnswer && S.choice !== '')) || (d.rejectNeedsNote && which === 'secondary' && !note)) {
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
      const L = list(), i = L.findIndex(y => y.id === x.id);
      S.hidden.set(x.id, { x, i, body, r, committed: false, project: x.project, needs: x.needs });
      S.ghost = null;
      S.items = S.items.filter(y => y.id !== x.id);
      S.decided.unshift({ what: r.log, project: x.project, age: 'now', id: x.id });
      const L2 = list();
      S.open = (L2[i] || L2[0] || {}).id || null; S.dock = 'ready'; S.note = ''; S.which = ''; S.choice = '';
      next = L2.find(y => y.id === S.open);
      setHash(S.open);
      renderChrome();
      toTop();
    }, 1, () => [x.id]);
    deciding = false;
    // Left the Inbox during the hold: no Undo toast on another screen; the decision goes now, as leaving sends it.
    if (!S.active) { commit(); return; }
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
      toTop();
    }, -1, () => [h.x.id]).then(focusTitle);
  }
  // Send every decision whose Undo window has closed. A failure brings the item back with Try again.
  function commit(opts = {}) {
    for (const [k, h] of S.hidden) {
      if (h.committed || h.sending) continue;
      h.sending = true;
      if (k === last) last = null;
      // A decision may be several actions in order (adopting a charter draft: save, then approve).
      (Array.isArray(h.body) ? h.body.reduce((p, b) => p.then(() => post(b, { keepalive: !!opts.keepalive })), Promise.resolve()) : post(h.body, { keepalive: !!opts.keepalive })).then(() => {
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
        } else if (!opts.keepalive) {
          // The owner has moved on to another screen: still say so, and the item waits in the Inbox again.
          renderChrome();
          toast(`${/fetch|network|Failed/i.test(err.message) ? 'Couldn’t reach Atelier. Nothing was sent' : 'That didn’t go through'}: ${h.x.title}. It’s back in your Inbox.`, { error: true });
          refresh().catch(() => {});
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
    if (act === 'each') decideEach();
    if (act === 'toast-undo') undo();
    if (act === 'toast-retry') retry();
    if (act === 'show-all') { shownAll.add(a.dataset.for); const d = $(a.getAttribute('aria-controls')); a.remove(); d?.classList.remove('is-clamped'); d?.focus({ preventScroll: true }); }
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
    if (key && key !== S.open && (fresh || !refreshing)) { S.open = key; S.dock = 'ready'; S.note = ''; S.choice = ''; }
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
    show, leave, pending, placeToast,
    // An outcome split out of a batch is part of one decision: the batch leaves the counts once all of it has gone (F-20).
    hiddenItems: () => {
      const seen = new Set();
      return [...S.hidden.values()].filter(h => !h.committed || (state?.queue || []).some(x => x.key === (h.x.q?.from || h.x.id)))
        .filter(h => { const f = h.x.q?.from; if (!f) return true; if (seen.has(f) || S.items.some(x => x.q?.from === f)) return false; seen.add(f); return true; })
        .map(h => ({ project: h.project, needs: h.needs }));
    },
    localDecided: () => S.decided.filter(d => !d.committed || !(state?.decidedToday || []).length).length,
    // For the project page's "Needs you here": the same title and kind words as the Inbox, minus decisions in their Undo window.
    describe: q => { const x = item(q); return { title: x.title, kind: x.kind }; },
    isHidden: key => S.hidden.has(key),
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
  document.title = 'Sign in · Atelier';
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
      // A reload, not location.replace: the address is often already /#/inbox, and a same-page hash change wouldn't load the app.
      history.replaceState(null, '', '/' + (location.hash || '#/inbox'));
      location.reload();
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

// ---------- Office: O1 Panorama (R-20, R-21; atelier/design/office-fresh o1 + of.js + desk.js) ----------
// A floor per project, busiest first, and a desk per agent from the server's team list (the same list the sidebar
// and the project page count). A project is one room: every desk a bay of one size, in the team's own order, so the
// room never reshuffles; a line of words only for desks with news (working, needs you, paused, just finished, or a
// task at the desk that isn't moving) and one quiet line for the rest. Each bay is someone at a desk in front of an
// N1 window: lit lilac while working, a hand up with the red flag when it needs you, evening sky and a sleeping cat
// while waiting, curtains when off, green with a tick once when it finishes. A refresh patches each desk in place
// (R7): the drawing cross-fades by CSS, nothing re-renders, scroll and focus stay.
const Office = (() => {
  // ── The desk drawing (desk.js): one scene, cropped. bay = window + someone at the desk + one desk object (the
  // rooms); wide = the whole corner with the role's furniture (the empty state). Anonymous but personable (R-15): no
  // face or name; character from posture, one accessory per role and the things around the desk. ──
  const ROLE = r => /lead/i.test(r) ? 'lead' : /design/i.test(r) ? 'designer' : /audit/i.test(r) ? 'auditor'
    : /review|writ/i.test(r) ? 'reviewer' : 'builder'; // five looks: writers read, every other maker builds
  const arch = 'M36 76V37a20 20 0 0 1 40 0V76z';
  const HAT = {
    designer: '<path class="dk-acc" d="M104.4 57a7.6 7.6 0 0 1 15.2 0z"/><circle class="dk-acc" cx="112" cy="48.6" r="1.9"/>',
    builder: '<path class="dk-acc-l" d="M103.6 59a8.4 8.4 0 0 1 16.8 0"/><rect class="dk-acc" x="101.8" y="57" width="3.6" height="6" rx="1.6"/><rect class="dk-acc" x="118.6" y="57" width="3.6" height="6" rx="1.6"/>',
    reviewer: '<circle class="dk-acc" cx="112" cy="49.2" r="3.3"/>',
    auditor: '<path class="dk-acc" d="M104.4 57.4a7.6 7.6 0 0 1 15.2 0z"/><path class="dk-acc-l" d="M118.5 57.4h5.5"/>',
    lead: '<path class="dk-acc" d="M104.6 65.6h14.8l-1.6 3h-11.6z"/><path class="dk-acc" d="M115 68l2.4 6h-3l-.8-6z"/>',
  };
  const ON_DESK = {
    designer: '<rect x="86" y="80" width="12" height="4" rx="1"/><path d="M89 80l6-9" class="dk-l"/>',
    builder: '<rect x="86.5" y="76" width="10" height="8" rx="1"/><path d="M86.5 79h10" class="dk-l"/>',
    reviewer: '<rect x="86" y="80.5" width="12" height="3.5" rx=".8"/><rect x="87" y="77" width="10" height="3.5" rx=".8"/><rect x="86.5" y="73.5" width="11" height="3.5" rx=".8"/>',
    auditor: '<rect x="87" y="72" width="9" height="12" rx="1"/><path d="M89 76h5M89 79h5" class="dk-l"/>',
    lead: '<circle cx="92" cy="77.5" r="4.5"/><path d="M88 77.5h8M92 73v9" class="dk-l"/><rect x="90.6" y="82" width="2.8" height="2" rx=".5"/>',
  };
  const ROOM = {
    designer: `<path class="dk-l" d="M168 100l9-46 9 46M177 54v46"/><rect class="dk-canvas" x="163" y="56" width="28" height="24" rx="1.5"/>
      <path class="dk-sketch" d="M168 75c4-8 8-12 11-6s6-2 8-8"/><path class="dk-l" d="M162 80h30"/>`,
    builder: `<rect x="154" y="86" width="20" height="14" rx="1.5"/><rect x="176" y="90" width="14" height="10" rx="1.5"/><rect x="159" y="74" width="12" height="12" rx="1.5"/>
      <path class="dk-l" d="M154 92h20M159 79h12"/><rect class="dk-board" x="156" y="40" width="34" height="24" rx="1.5"/>
      <path class="dk-l dk-tool" d="M163 46v12M160 46h6M180 45v13M177.5 45.5l2.5 3 2.5-3"/>`,
    reviewer: `<rect class="dk-board" x="154" y="42" width="38" height="58" rx="1.5"/><path class="dk-l" d="M154 62h38M154 82h38"/>
      <rect x="158" y="49" width="4" height="13"/><rect x="163" y="46" width="4" height="16"/><rect x="168" y="51" width="4" height="11"/><path d="M174 62l4-14 3.5 1-4 13z"/>
      <rect x="158" y="70" width="4" height="12"/><rect x="163" y="72" width="5" height="10"/><rect x="176" y="68" width="4" height="14"/><rect x="181" y="71" width="4" height="11"/>
      <rect x="160" y="90" width="9" height="10" rx="1"/><rect x="172" y="88" width="14" height="12" rx="1"/>`,
    auditor: `<circle class="dk-board" cx="172" cy="36" r="9"/><path class="dk-l dk-hand-m" d="M172 36v-6"/><path class="dk-l dk-hand-h" d="M172 36h4"/>
      <path class="dk-l" d="M164 100l8-22 8 22M172 78v22"/><rect x="164" y="64" width="22" height="7" rx="3.5" transform="rotate(-24 175 67.5)"/>`,
    lead: `<path class="dk-bunting" d="M30 14q46 12 92 0"/><path class="dk-flags" d="M38 16.2l3 6 3-5.2zM52 19.5l3 6 3-4.8zM66 21.3l3 5.8 3-5.8zM80 21.3l3 5.8 3-5.8zM94 19.6l3 5.8 3-6zM108 16.6l3 5.6 3-6.4z"/>
      <circle class="dk-board" cx="173" cy="74" r="12"/><path class="dk-l" d="M161 74h24M173 62v24M164 66q9 6 18 0M164 82q9-6 18 0M173 86v8M165 100h16l-2-6h-12z"/>`,
  };
  const scene = (r, crop, i = 0) => `<svg class="dk-svg" viewBox="${crop === 'wide' ? '0 4 200 116' : '28 8 120 112'}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" style="--i:${i % 7}">
  <rect class="dk-floor" x="-40" y="100" width="280" height="30"/><circle class="dk-glow" cx="56" cy="48" r="50"/><polygon class="dk-patch" points="40,100 74,100 100,124 52,124"/>
  <g class="dk-room">${ROOM[r]}</g>
  <g class="dk-tree"><path class="dk-l" d="M17 100V70"/><path class="dk-leaf" d="M17 72c-9-2-12-10-9-16 6 2 9 8 9 16zM17 80c8-1 12-8 10-15-6 2-10 7-10 15zM17 64c-4-6-2-12 3-15 3 5 1 11-3 15z"/><path d="M10 100l2-12h10l2 12z"/></g>
  <path class="dk-wall-win" d="${arch}"/><path class="dk-pane" d="${arch}"/><path class="dk-pane-done" d="${arch}"/>
  <g class="dk-night"><path d="M70 26a5 5 0 1 0 4.4 7.4 4 4 0 1 1-4.4-7.4z"/><circle cx="44" cy="30" r="1.1"/><circle cx="69" cy="58" r=".9"/><circle cx="48" cy="56" r=".8"/></g>
  <path class="dk-bars" d="M56 17V76M36 48H76"/>
  <g class="dk-curtain"><path d="M36.5 76V37A19.5 19.5 0 0 1 54 17.6V76c-2-3-4-3-6 0-2-3-4-3-6 0-2-3-4-3-5.5 0z"/><path d="M75.5 76V37A19.5 19.5 0 0 0 58 17.6V76c2-3 4-3 6 0 2-3 4-3 6 0 2-3 4-3 5.5 0z"/><path class="dk-l" d="M42 22v52M48 18.5v55M64 18.5v55M70 22v52"/></g>
  <path class="dk-tick" d="M47 47l6 6 12-13"/>
  <g class="dk-spark"><path d="M32 22l1.4 3.6L37 27l-3.6 1.4L32 32l-1.4-3.6L27 27l3.6-1.4z"/><path d="M82 30l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/><path d="M78 12l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/></g>
  <rect class="dk-sill" x="32" y="75.5" width="48" height="3.5" rx="1.75"/>
  <g class="dk-pot"><path d="M67 75.5l1-6h7l1 6z"/><path class="dk-leaf" d="M71.5 69.5c-4-1-6-5-4-8 3 1 4 4 4 8zM71.5 69.5c4-1 6-4 4.5-8-3 1-4.5 4-4.5 8z"/></g>
  <g class="dk-cat"><path d="M40 75.5c0-5 4-7.5 9-7.5s8 2.5 8 7.5z"/><path d="M53 70l1.4-3.4 1.8 3zM50 69.2l1.6-3.2 1.4 3.2z"/><path class="dk-l" d="M40.5 75c-3 0-4-2-2.6-3.4"/><path class="dk-z" d="M57.5 61.5h4l-4 4.5h4"/></g>
  <g class="dk-chair"><rect x="99" y="58" width="26" height="30" rx="6"/></g>
  <g class="dk-who">
    <g class="dk-body"><path d="M96 88c0-12.5 7-19 16-19s16 6.5 16 19z"/><circle cx="112" cy="58" r="7.5"/>${HAT[r]}
      <path class="dk-rim" d="M105.4 54.5a7.5 7.5 0 0 0 0 7M97.6 84c.4-6 2.2-10 5.4-12.4"/></g>
    <g class="dk-sip"><path class="dk-arm" d="M124 76l4-6"/><rect class="dk-mug-held" x="125.5" y="62" width="6" height="7" rx="1.2"/></g>
    <g class="dk-wave"><path class="dk-arm" d="M124 74l7-16"/><circle class="dk-handc" cx="131.6" cy="56.2" r="2.8"/><path class="dk-pole" d="M131.6 54V40"/><path class="dk-flag" d="M132 40.5l10 3.5-10 3.5z"/></g>
    <g class="dk-cheer"><path class="dk-arm" d="M100 74l-7-15M124 74l7-15"/><circle class="dk-handc" cx="92.6" cy="57.4" r="2.8"/><circle class="dk-handc" cx="131.4" cy="57.4" r="2.8"/></g>
  </g>
  <g class="dk-think"><circle cx="128" cy="47" r="1.5"/><circle cx="133" cy="47" r="1.5"/><circle cx="138" cy="47" r="1.5"/></g>
  <path class="dk-lid" d="M100 84l2-13h20l2 13z"/><path class="dk-lid-mark" d="M110 80v-3.4a2 2 0 0 1 4 0V80z"/>
  <rect class="dk-lid-shut" x="100" y="81.5" width="24" height="2.5" rx="1"/>
  <g class="dk-card"><path d="M104 84l3-9h10l3 9z"/><path class="dk-card-ii" d="M110 78.4v3M114 78.4v3"/></g>
  <g class="dk-mug"><rect x="130" y="77.5" width="6.5" height="6.5" rx="1.2"/><path class="dk-l" d="M136.5 79.2h1.4a1.6 1.6 0 0 1 0 3.2h-1.4"/></g>
  <g class="dk-steam"><path d="M131.6 75c-1.5-2 1.5-3 0-5"/><path d="M134.8 75c-1.5-2 1.5-3 0-5"/></g>
  <g class="dk-thing">${ON_DESK[r]}</g>
  <rect class="dk-desk" x="83" y="84" width="62" height="3.5" rx="1.75"/><rect class="dk-desk" x="87" y="87.5" width="2.6" height="12.5"/><rect class="dk-desk" x="138.4" y="87.5" width="2.6" height="12.5"/>
</svg>`;
  const defs = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
    + '<radialGradient id="dk-glow"><stop offset="0" style="stop-color:var(--active);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--active);stop-opacity:0"/></radialGradient>'
    + '<radialGradient id="dk-glow-done"><stop offset="0" style="stop-color:var(--done);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--done);stop-opacity:0"/></radialGradient>'
    + '<linearGradient id="dk-pane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--active)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--active) 62%, var(--surface))"/></linearGradient>'
    + '</defs></svg>';

  // Only the design's words on a desk: Working, Needs you, Waiting, Off, and Done for a moment (S1 copy).
  const WORD = { active: 'Working', needs: 'Needs you', '': 'Waiting', off: 'Off', done: 'Done' };
  const ORDER = { needs: 0, active: 1, done: 2, '': 3, off: 4 };
  const HOLD = 2400; // the green window after a finish, then the light goes out
  const firstSeen = new Map(); // finished task id → when this page first showed it
  let sig = '', shown = new Map(), lines = new Map(), timer = null, io = null, ro = null;

  // A desk says its stage and when it last did something, as the task page does (F-3); tries live on the task page.
  // An audit's figure is its checks done; a task's gauge lights by stage, never by tries.
  const progText = p => !p || p[2] === 'try' ? '' : `${p[0]} of ${p[1]} ${p[2]}`;
  const meta = d => [d.k !== 'done' && d.stage !== undefined && STAGES[d.stage], progText(d.prog), d.ago].filter(Boolean).join(' · ');
  const dotOf = (k, word) => `<span class="dot${k && k !== 'off' ? ` dot-${k}` : ''}${k === 'active' && !failedAt ? ' is-live' : ''}" role="img" aria-label="${esc(word)}"></span>`;

  // One desk from one team entry. Every word is the server's or a fixed phrase; agent text goes through esc().
  function deskOf(p, x, keys) {
    const a = p.alias;
    const who = (x.kind === 'lead' ? 'lead' : x.reviewingFor ? 'reviewer' : x.who || x.role || 'agent').toLowerCase();
    let key = x.kind === 'lead' ? 'lead' : x.kind === 'auditor' ? 'auditor' : x.kind === 'reviewer' ? 'reviewer' : `r-${x.role || x.who}`;
    if (keys.has(key)) key += `-${x.id || keys.size}`;
    keys.add(key);
    const d = { key, id: x.id, role: x.kind === 'lead' ? 'Lead' : cap1(who), prop: ROLE(who), href: x.href || `#/p/${encodeURIComponent(a)}/overview`, k: '', what: x.what || '', step: '', quiet: false, prog: null, ago: '' };
    const working = () => Object.assign(d, { k: 'active', step: x.quietMin ? `Quiet for ${x.quietMin} min, longer than usual` : x.step || 'Getting started', quiet: !!x.quietMin, stage: x.kind === 'reviewer' ? 3 : 1, ago: longAgo(x.lastAt) });
    if (x.kind === 'lead') {
      if (x.state === 'working') Object.assign(d, { k: 'active', step: `In the Claude app as “${a} lead”` });
      else if (x.state === 'duty') d.step = `In the Claude app as “${a} lead”`;
      else Object.assign(d, { k: 'off', what: 'The lead is off', step: 'Start it on the project page' });
    } else if (x.kind === 'auditor') {
      if (x.audit) Object.assign(d, { k: 'active', step: x.audit.quietMin ? `Quiet for ${x.audit.quietMin} min, longer than usual` : cap1(x.audit.stage || 'Getting ready'), quiet: !!x.audit.quietMin, prog: x.prog || null, ago: `${x.audit.startedMin} min in` });
      else d.step = p.lastAudit?.at ? `Last audit ${longAgo(p.lastAudit.at)}` : 'Audits start once there is something built to check';
    } else if (x.id) {
      d.task = true; // a task at the desk is news even while it isn't moving (stalled, waiting for the plan window)
      if (x.kind === 'reviewer') d.what = `Reviewing ${x.what}`;
      if (x.state === 'needs') Object.assign(d, { k: 'needs', step: 'It asked you something. Answer it on its page' });
      else if (x.state === 'stuck') d.step = 'Stalled. The lead decides what happens next';
      else if (x.state === 'paced') Object.assign(d, { step: pacedWords(x), stage: x.kind === 'reviewer' ? 3 : 1 });
      else working();
    } else if (x.kind === 'reviewer') {
      d.step = 'Checks every task before it ships';
    } else if (x.held) {
      // A paused or held task stays at its desk (F-11): what it is, and why it isn't moving.
      const why = reasonWords(x.held);
      d.step = x.held.status === 'paused' ? `${why === 'You stopped it' ? 'You stopped it' : 'Paused'}. ${why && why !== 'You stopped it' ? `${why}. ` : ''}The lead decides what happens next` : `${why || 'Waiting'}. It starts once that is done`;
      d.held = x.held.status === 'paused' ? 'Paused' : 'Waiting';
    } else {
      const f = x.finished;
      if (f && !firstSeen.has(f.id)) firstSeen.set(f.id, Date.now());
      if (f && Date.now() - firstSeen.get(f.id) < HOLD) Object.assign(d, { k: 'done', what: f.title, step: 'Finished just now', stage: 4, ago: '' });
      else d.step = f ? `Finished “${f.title}”` : 'Starts when the lead hands it a task';
    }
    d.word = d.held || WORD[d.k];
    return d;
  }

  // News: a desk whose words get a line under the room. Everyone else is told by the picture and one shared line.
  const news = d => d.k === 'active' || d.k === 'needs' || d.k === 'done' || d.held === 'Paused' || !!d.task;
  const label = d => `${d.role}, ${d.word}. ${d.what}. ${d.step ? `${d.step}. ` : ''}${meta(d)}`.trim();
  const attrs = d => `data-key="${esc(d.key)}" data-k="${d.k}"${d.held ? ` data-held="${d.held.toLowerCase()}"` : ''}${d.quiet ? ' data-quiet' : ''}`;
  // the dot inside a desk is decoration: the link's label says the state, and a news line shouldn't add a pulse loop
  const st = d => `<span class="of-st"><span class="dot${d.k && d.k !== 'off' ? ` dot-${d.k}` : ''}" aria-hidden="true"></span><span class="w">${esc(d.word)}</span></span>`;
  const cap = d => `<b>${esc(d.role)}</b>${st(d)}`;
  // the stage as five small lights (R-16: readable at a glance like a gauge). Stage only, never tries (F-3)
  const gauge = d => d.stage === undefined ? '' : `<span class="of-gauge" role="img" aria-label="Stage ${d.stage + 1} of ${STAGES.length}, ${STAGES[d.stage]}">${STAGES.map((_, i) => `<i${i <= d.stage ? ' class="on"' : ''}></i>`).join('')}</span>`;
  const bay = d => `<a class="dk o1-bay" href="${esc(d.href)}" ${attrs(d)} aria-label="${esc(label(d))}"${news(d) ? ' tabindex="-1"' : ''}><span class="dk-scene">${scene(d.prop, 'bay', d.i)}</span><span class="o1-cap">${cap(d)}</span></a>`;
  // rows of equal length: 12 desks at most 5 a row = 4 + 4 + 4, never 5 + 5 + 2
  const bal = (k, max) => Math.ceil(k / Math.ceil(k / max));
  const restLine = (f, rest) => f.desks.every(d => d.k === 'off') ? 'Everyone is off. Start the lead on the project page and the team comes back in.'
    : (rest = rest.filter(d => d.k !== 'off')).length ? `${rest.length} at ${rest.length === 1 ? 'their desk' : 'their desks'}, ready for the lead’s next task` : '';
  const linesOf = f => {
    const nw = f.desks.filter(news).map((d, i) => [d, i]).sort((x, y) => ORDER[x[0].k] - ORDER[y[0].k] || x[1] - y[1]).map(x => x[0]);
    const rest = restLine(f, f.desks.filter(d => !news(d)));
    return `${nw.length ? `<ul class="o1-news">${nw.map(d => `<li><a class="o1-line" href="${esc(d.href)}" data-k="${d.k}"${d.held ? ` data-held="${d.held.toLowerCase()}"` : ''} aria-label="${esc(label(d))}">
      <span class="o1-who">${cap(d)}</span><span class="o1-what">${esc(d.what)}${d.step ? `<span class="o1-step">${esc(d.step)}</span>` : ''}</span><span class="o1-meta num">${gauge(d)}${esc([progText(d.prog), d.ago].filter(Boolean).join(' · '))}</span></a></li>`).join('')}</ul>` : ''}${rest ? `<p class="of-rest">${rest}</p>` : ''}`;
  };
  // Money in words (UX-11 C): the limit in red, "most of it used" from 80 %.
  const moneyLine = s => `${money(s.spentToday)} today${s.atLimit ? ', <span class="is-needs">at its limit</span>' : s.dayLimit && s.spentToday >= 0.8 * s.dayLimit ? ', most of it used' : ''}`;
  const needsSum = s => s.needsNow ? ` · <span class="is-needs">${s.needsNow} need${s.needsNow === 1 ? 's' : ''} you</span>` : '';
  const floorSum = f => f.quiet ? `Lead off · nothing running${f.s.waiting ? ` · ${f.s.waiting} waiting on you in the Inbox` : ''} · ${moneyLine(f.s)}`
    : `${f.s.working} working${f.s.paced ? ` · ${f.s.paced} waiting for your plan window` : ''}${needsSum(f.s)} · ${moneyLine(f.s)}`;

  // "Needs you" has one source, the summary's needsNow (F-14): a desk raises the red flag only for a decision in the
  // Inbox's "Needs you now". An agent's own question flags its desk; everything else (lead asks, gates, findings…) is
  // the lead's desk, so the flags on a floor add up to its count and the floors to the head.
  function flagNeeds(p, desks, s) {
    const own = state.queue.filter(q => q.project === p.alias && q.needs && !Inbox.isHidden(q.key));
    for (const d of desks) {
      if (d.k !== 'needs') continue;
      const q = own.find(q => q.kind === 'question' && q.id === d.id);
      if (q) { own.splice(own.indexOf(q), 1); continue; }
      // asked, but not (yet) a decision for you: the lead answers first, or it waits in the Inbox for a quiet minute
      const later = state.queue.some(q => q.kind === 'question' && q.id === d.id && !Inbox.isHidden(q.key));
      Object.assign(d, { k: '', word: WORD[''], step: later ? 'It asked a question. It waits in your Inbox for when you have a minute' : 'It asked a question. The lead answers it first' });
    }
    const lead = desks.find(d => d.key === 'lead');
    const n = Math.min(own.length, s.needsNow ?? own.length);
    if (lead && n) Object.assign(lead, { k: 'needs', word: WORD.needs, href: '#/inbox', what: n === 1 ? plainTitle(own[0].title) : `${n} decisions need you now`, step: n === 1 ? 'It’s in your Inbox' : 'They’re in your Inbox' });
  }

  function model() {
    const C = counts();
    let i = 0;
    const floors = state.projects.filter(p => !p.error && p.team).map(p => {
      const keys = new Set();
      const s = C.projects[p.alias] || {};
      const quiet = !p.lead?.running && !s.working && !s.paced && !s.needsNow;
      // the room keeps the team's own order, so a desk never moves when its state changes
      const desks = p.team.agents.map(x => deskOf(p, x, keys));
      flagNeeds(p, desks, s);
      for (const d of desks) {
        d.i = i++;
        // lead off and nothing running: the whole team is off for the day (curtains), not waiting on a lead who isn't there
        if (quiet && d.k === '' && !d.held && !d.task) Object.assign(d, { k: 'off', word: WORD.off });
      }
      return { a: p.alias, s, desks, quiet };
    });
    floors.sort((x, y) => (+x.quiet - +y.quiet) || (y.s.working - x.s.working) || ((y.s.needsNow || 0) - (x.s.needsNow || 0)) || (+y.s.lead - +x.s.lead));
    return { C, floors };
  }

  const head = C => `<h1>Office</h1>${C ? `<span class="hf-sum num"><span data-count="working">${C.working}</span> working · ${C.paced ? `${C.paced} waiting for your plan window · ` : ''}<span${C.needsNow ? ' class="is-needs"' : ''}>${C.needsNow} need${C.needsNow === 1 ? 's' : ''} you</span> · ${C.onDuty} on duty</span>` : ''}<span class="end">${liveLine()}</span>`;

  const LEGEND = ['<b class="a">Window lit</b>, tea steaming: working', '<b>Light low</b>, a thought in the air: quiet a long while',
    '<b class="n">Hand up with a red flag</b>: needs you', '<b>Back-soon card</b>, light left on: paused', '<b>Tea in hand</b>, cat asleep on the sill: waiting',
    '<b>Curtains drawn</b>: off', '<b class="d">Window floods green</b>, arms up: just finished'];
  const floorHTML = f => `<header class="floor-head"><h2 id="fl-${esc(f.a)}"><a href="#/p/${esc(f.a)}/overview">${esc(f.a)}</a></h2><span class="floor-sum num" data-floor-sum>${floorSum(f)}</span></header>
      <div class="o1-body"><div class="o1-room" style="--dc:${bal(f.desks.length, 12)};--pc:${bal(f.desks.length, 5)}">${f.desks.map(bay).join('')}</div>
      <div class="o1-lines" data-lines>${linesOf(f)}</div></div>`;
  const board = floors => `<div class="board of-board${failedAt ? ' is-stale' : ''}">
    ${floors.map(f => `<section class="floor of-floor" aria-labelledby="fl-${esc(f.a)}" data-floor="${esc(f.a)}">${floorHTML(f)}</section>`).join('')}
    <ul class="of-legend" aria-label="How to read a desk">${LEGEND.map(t => `<li>${t}</li>`).join('')}</ul></div>`;

  const empty = () => `<div class="hf-empty office-empty"><span class="of-empty-art dk" data-k="off" aria-hidden="true"><span class="dk-scene">${scene('lead', 'wide')}</span></span><h2>No one is in yet.</h2><p>Start a project and its team moves in here: a room for the project, a desk for each agent.</p><a class="btn btn-primary" href="#/new">${I('plus')}New project</a></div>`;

  // PC (t652): how many whole bays fit across; a team that doesn't fit wraps into rows of equal length, and a room
  // that fits one row sits beside its words when they still get 400 px. Every room is the board's width, so this reads
  // one width and lays out nothing (floors off screen stay skipped). SLOT and PAD mirror office.css: a 120 px bay in a
  // 136 px slot, the room's 8 px padding and 1 px border each side. The phone keeps its own rows (--pc).
  function fit() {
    const b = $('view').querySelector('.of-board');
    if (!b || matchMedia('(max-width: 640px)').matches) return;
    const SLOT = 136, PAD = 18, LINES = 400, GAP = 24, W = b.clientWidth;
    const room = Math.max(1, Math.floor((W - PAD) / SLOT));
    b.querySelectorAll('.o1-room').forEach(r => {
      const n = r.childElementCount, cols = n <= room ? n : bal(n, room);
      if (r.style.getPropertyValue('--dc') !== String(cols)) r.style.setProperty('--dc', cols);
      r.parentElement.classList.toggle('is-beside', cols === n && W - (n * SLOT + PAD) - GAP >= LINES);
    });
  }
  // Build note: loops hold still for desks off screen and while the tab is hidden (office.css is-away, data-tab-hidden).
  const tabHidden = () => document.documentElement.toggleAttribute('data-tab-hidden', document.hidden);
  document.addEventListener('visibilitychange', tabHidden);
  function watch(view) {
    io?.disconnect(); ro?.disconnect();
    const b = view.querySelector('.of-board');
    if (!b) return;
    fit();
    ro = new ResizeObserver(fit); ro.observe(b);
    io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-away', !e.isIntersecting)), { rootMargin: '120px 0px' });
    b.querySelectorAll('.dk').forEach(d => io.observe(d));
  }

  // Loading: two rooms' shape, counts hidden.
  function loading() {
    $('view').innerHTML = `<header class="hf-head">${head(null)}</header><div class="hf-body office"><div class="board of-board" aria-busy="true" aria-label="Loading the Office">${[5, 3].map(n => `<section class="of-floor"><span class="skeleton" style="width:160px;height:20px"></span>
      <div class="of-skel">${Array.from({ length: n }, () => '<span class="skeleton"></span>').join('')}</div></section>`).join('')}</div></div>`;
    sig = '';
  }

  function show() {
    const view = $('view');
    const { C, floors } = model();
    const next = floors.map(f => `${f.a}${f.quiet ? '~' : ''}:${f.desks.map(d => d.key).join(',')}`).join('|');
    const body = view.querySelector(':scope > .hf-body.office');
    if (body && next === sig && floors.length) patch(view, C, floors);
    else {
      sig = next;
      view.innerHTML = `<header class="hf-head" data-office-head>${head(C)}</header><div class="hf-body office">${defs}${floors.length ? board(floors) : empty()}</div>`;
      shown = new Map(floors.flatMap(f => f.desks.map(d => [`${f.a}/${d.key}`, JSON.stringify({ ...d, i: 0 })])));
      lines = new Map(floors.map(f => [f.a, linesOf(f)]));
      watch(view);
    }
    // A green window holds for a moment, then the light goes out: look again when the first one is due.
    clearTimeout(timer);
    const due = floors.flatMap(f => f.desks).some(d => d.k === 'done');
    if (due) timer = setTimeout(() => { if (place() === 'office' && state) show(); }, HOLD + 50);
  }

  // Same floors and desks as on screen: change each desk's attributes (its drawing cross-fades by CSS) and caption, and
  // the floor's lines only when their words changed. The room itself never re-renders.
  function patch(view, C, floors) {
    const h = view.querySelector('[data-office-head]');
    const hh = head(C);
    if (h && h.dataset.html !== hh) { h.innerHTML = hh; h.dataset.html = hh; }
    view.querySelector('.of-board')?.classList.toggle('is-stale', !!failedAt);
    for (const f of floors) {
      const fl = view.querySelector(`[data-floor="${CSS.escape(f.a)}"]`);
      if (!fl) continue;
      const fs = fl.querySelector('[data-floor-sum]');
      if (fs && fs.innerHTML !== floorSum(f)) fs.innerHTML = floorSum(f);
      for (const d of f.desks) {
        const id = `${f.a}/${d.key}`, json = JSON.stringify({ ...d, i: 0 });
        if (shown.get(id) === json) continue;
        const was = JSON.parse(shown.get(id) || '{}');
        shown.set(id, json);
        const el = fl.querySelector(`.dk[data-key="${CSS.escape(d.key)}"]`);
        if (!el) continue;
        el.dataset.k = d.k;
        if (d.held) el.dataset.held = d.held.toLowerCase(); else delete el.dataset.held;
        el.toggleAttribute('data-quiet', d.quiet);
        el.setAttribute('aria-label', label(d));
        el.setAttribute('href', d.href);
        if (news(d)) el.setAttribute('tabindex', '-1'); else el.removeAttribute('tabindex');
        el.querySelector('.o1-cap').innerHTML = cap(d);
        if (was.k !== d.k || was.held !== d.held || was.what !== d.what) { el.classList.remove('is-changing'); void el.offsetWidth; el.classList.add('is-changing'); }
      }
      const ln = linesOf(f);
      if (lines.get(f.a) !== ln) { lines.set(f.a, ln); fl.querySelector('[data-lines]').innerHTML = ln; }
    }
  }

  // The project page's Team facts use the same desks, so a desk and its line there never disagree.
  const desks = p => { const keys = new Set(); return (p.team?.agents || []).map(x => deskOf(p, x, keys)); };
  // Once the next screen has painted: the observers let go of the old desks (they come back with the next show()).
  function stop() { if (place() === 'office') return; io?.disconnect(); ro?.disconnect(); io = ro = null; clearTimeout(timer); }
  return { show, loading, desks, dotOf, stop };
})();

const etaText = e => e ? `likely ${e.low}–${e.high} min` : '';
const isBusy = s => s === 'working' || s === 'reviewing' || s === 'auditing';

// =====================================================================================================
// Projects (D6 design/screens2/projects.html; UX-6 A, UX-14 A, UX-11 C). One card per project in the sidebar's order:
// name, lead, the Office's window strip, what waits on you, then the project's Now sentence (the same words as its
// page) in the serif, and the phase, task counts and today's money in one quiet line. Figures are the one summary's.
// A refresh rewrites a card's insides only when its words changed, so focus, hover and scroll stay (R7).
// =====================================================================================================
const Projects = (() => {
  let shown = new Map(); // card id → the words on screen
  const needWord = n => `${n} need${n === 1 ? 's' : ''} you now`;
  // "working" is agents working (the summary's S.working), the same figure as the project page and the Office (F-7).
  const tasksLine = S => {
    const T = S.tasks || {};
    const parts = [[S.working, 'working'], [S.paced, 'waiting for your plan window'], [T['needs-you'], n => `${n} need${n === 1 ? 's' : ''} you`], [T.queued, 'queued'], [T.done, 'done']]
      .filter(([n]) => n).map(([n, w]) => typeof w === 'function' ? w(n) : `${n} ${w}`);
    return parts.length ? parts.join(' · ') : 'No tasks yet';
  };
  const moneyWords = S => `${money(S.spentToday)} of ${money(S.dayLimit)} today${S.atLimit ? ', at its limit' : S.dayLimit && S.spentToday >= 0.8 * S.dayLimit ? ', most of it used' : ''}`;
  const waitWords = S => !S.waiting ? 'Nothing waits on you' : `${S.waiting} waiting${S.needsNow ? ` · ${needWord(S.needsNow)}` : ''}`;
  const waitHTML = S => !S.waiting ? waitWords(S) : `${S.waiting} waiting${S.needsNow ? ` · <span class="is-needs">${needWord(S.needsNow)}</span>` : ''}`;

  function model(p, C) {
    const S = C.projects[p.alias];
    const own = state.queue.filter(q => q.project === p.alias && !Inbox.isHidden(q.key));
    const [nowT] = Project.nowOf(p, S, own);
    const desks = Office.desks(p).map(d => d.k);
    return { p, S, now: nowT, desks: desks.length ? desks : ['off'], ph: Math.max(0, PHASES.indexOf(p.phase)) };
  }
  const label = ({ p, S, now, ph }) => `${p.alias}, lead ${S.lead ? 'on' : 'off'}. ${now} ${waitWords(S)}. Phase ${cap1(PHASES[ph])}${S.outcomes?.of ? `, ${S.outcomes.met} of ${S.outcomes.of} outcomes met` : ''}. ${tasksLine(S)}. ${moneyWords(S)}.`;
  const inner = m => {
    const { p, S, now, ph } = m;
    return `<span class="pj-top">
        <span class="pj-name"><b>${esc(p.alias)}</b><span class="p-lead${S.lead ? '' : ' is-off'}"><span class="dot${S.lead ? ' dot-active' : ''}" aria-hidden="true"></span>${S.lead ? 'Lead on' : 'Lead off'}</span></span>
        <span class="strip" aria-hidden="true">${m.desks.map(k => `<i data-k="${k}"></i>`).join('')}</span>
        <span class="pj-wait num">${waitHTML(S)}</span>
      </span>
      <span class="pj-now">${esc(now)}</span>
      <span class="pj-foot num">
        <span class="pj-ph"><span class="pj-phase" aria-hidden="true">${PHASES.map((n, i) => `<i class="${i < ph ? 'past' : i === ph ? 'now' : ''}"></i>`).join('')}</span><span><b>${cap1(PHASES[ph])}</b>${S.outcomes?.of ? ` · ${S.outcomes.met} of ${S.outcomes.of} outcomes met` : ''}</span></span>
        <span>${tasksLine(S)}</span>
        <span class="pj-money${S.atLimit ? ' is-needs' : ''}">${moneyWords(S)}</span>
      </span>`;
  };
  // A project whose files couldn't be read keeps its card (the old list showed it too), with the reason.
  const broken = p => `<a class="pj" href="#/p/${esc(p.alias)}/overview" data-id="${esc(p.alias)}" aria-label="${esc(`${p.alias}. Couldn’t read this project: ${p.error}`)}"><span class="pj-top"><span class="pj-name"><b>${esc(p.alias)}</b></span></span><span class="pj-foot pj-err"><span>Couldn’t read this project: ${esc(p.error)}</span></span></a>`;
  const card = (p, C) => { if (p.error) return { id: p.alias, label: '', html: broken(p), whole: true }; const m = model(p, C); return { id: p.alias, label: label(m), html: inner(m) }; };

  const head = (C, n) => `<h1>Projects</h1>${C && n ? `<span class="hf-sum num">${n} project${n === 1 ? '' : 's'}${C.needsNow ? ` · <span class="is-needs">${needWord(C.needsNow)}</span>` : ''} · ${C.waiting} waiting</span>` : ''}${n || !C ? `${liveLine()}<span class="end"><a class="btn btn-secondary btn-sm pj-new" href="#/new">${I('plus')}New project</a></span>` : ''}`;
  const empty = () => `<div class="hf-empty"><h2>No projects yet.</h2><p>Describe what you want made, in a line or a whole brief. A lead reads it, drafts a charter, and asks for your OK in the Inbox.</p><a class="btn btn-primary" href="#/new">${I('plus')}New project</a></div>`;
  const frame = (h, body) => `<div class="scr pjs"><header class="hf-head" data-pj-head>${h}</header><div class="hf-body">${body}</div></div>`;

  function loading() {
    const sk = (w, h) => `<span class="skeleton" style="width:${w};height:${h}px"></span>`;
    $('view').innerHTML = frame(head(null, 0), `<div class="pj-list" aria-busy="true" aria-label="Loading projects">${[0, 1, 2].map(() => `<span class="pj is-skeleton">${sk('30%', 20)}${sk('80%', 24)}${sk('60%', 14)}</span>`).join('')}</div>`);
  }
  function error() { $('view').innerHTML = frame(head(null, 0), loadError('Your projects')); }

  function show() {
    const C = counts(), view = $('view');
    const list = state.projects.map(p => card(p, C));
    const ids = list.map(x => x.id).join('|');
    const root = view.querySelector(':scope > .pjs');
    const box = root?.querySelector('.pj-list:not([aria-busy])');
    if (root && box && box.dataset.ids === ids && ids) {
      const h = root.querySelector('[data-pj-head]'), hh = head(C, list.length);
      if (h.dataset.html !== hh) { h.innerHTML = hh; h.dataset.html = hh; }
      box.classList.toggle('is-stale', !!failedAt);
      for (const x of list) {
        const el = box.querySelector(`.pj[data-id="${CSS.escape(x.id)}"]`);
        if (!el || shown.get(x.id) === x.html) continue;
        shown.set(x.id, x.html);
        if (x.whole) { el.outerHTML = x.html; continue; }
        el.innerHTML = x.html; el.setAttribute('aria-label', x.label);
      }
      return;
    }
    view.innerHTML = frame(head(C, list.length), list.length
      ? `<div class="pj-list${failedAt ? ' is-stale' : ''}" data-ids="${esc(ids)}">${list.map(x => x.whole ? x.html : `<a class="pj" href="#/p/${esc(x.id)}/overview" data-id="${esc(x.id)}" aria-label="${esc(x.label)}">${x.html}</a>`).join('')}</div>`
      : empty());
    shown = new Map(list.map(x => [x.id, x.html]));
  }
  return { show, loading, error };
})();

// ---------- activity ----------
const EVENT_WORD = { added: 'Task added', started: 'Started', iteration: 'Iteration', criteria: 'Criteria', suite: 'Full suite', 'review-started': 'Review started', reviewed: 'Reviewed', done: 'Finished', review: 'Ready for review', 'needs-you': 'Needs you', stalled: 'Stalled', failed: 'Failed', approved: 'Approved', answered: 'Answered', gate: 'Gate', 'gate-request': 'Gate requested', audit: 'Audit', 'audit-started': 'Audit started', 'finding-confirmed': 'You asked for a fix', 'finding-dismissed': "You said it's fine", 'finding-to-lead': 'Auditor → lead', 'finding-fixed': 'Lead fixed', 'criterion-draft': 'Criterion drafted', 'criterion-approve': 'Criterion approved', 'criterion-accept': 'Criterion accepted', 'criterion-reject': 'Criterion rejected', ruling: 'Ruling', message: 'Message', requested: 'Request', 'test-touch': 'Tests changed', 'owner-review': 'Needs your judgement', trust: 'Gating', reporting: 'Reporting', autonomy: 'Shipping', lead: 'Lead', charter: 'Charter', demoted: 'Trust tightened', ownership: 'Out-of-bounds edit reverted', paced: 'Paused for plan limits', queued: 'Queued', project: 'Project' };

// =====================================================================================================
// Activity (D6 design/screens2/activity.html; UX-13 A). One feed by day, newest first, each event a line you can read
// aloud: its name, what happened, the project and task under it. Red only for problems, green for good news. Two
// filters: a project picker and Only problems; both live in the address (#/activity?p=<alias>&only=problems), so back
// and reload keep them. A project's Activity tab is this screen filtered to the project. Data: GET /api/activity
// (the last 3 days) and /api/activity/<alias> (the project's, at least its last 100). A refresh adds new events at the
// top of Today and leaves the rest alone, so scroll and focus stay (R7).
// =====================================================================================================
const Activity = (() => {
  const PAGE = 150; // rows drawn at once; real data has hundreds of events in 3 days
  const seen = new Map(); // read key → { events, since }
  let f = { p: '', only: false }, limit = PAGE, drawnKeys = [], drawnHTML = '', mounted = '';
  const DAY = 86_400_000;

  const keyOf = e => `${e.ts}|${e.id}|${e.type}`;
  const word = e => EVENT_WORD[e.type] || cap1(e.type.replace(/-/g, ' '));
  const KW = { needs: 'Needs you: ', past: 'Problem: ', done: 'Good news: ', '': '' };
  // Red only for what needs the owner now (SPEC R8, F-10): a problem whose task still waits on the owner. Past problems are muted.
  let waitingIds = new Set();
  const kOf = e => e.k === 'needs' && !waitingIds.has(e.id) ? 'past' : e.k;
  // One label per calendar day, worked out once (hundreds of events share a handful of days; date formatting is slow on a phone).
  const dayNames = new Map();
  const dayOf = ts => {
    const d = new Date(ts), t = new Date(); t.setHours(0, 0, 0, 0);
    const k = `${t.getTime()}|${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let name = dayNames.get(k);
    if (name === undefined) {
      const diff = Math.round((t - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / DAY);
      name = diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '');
      if (dayNames.size > 50) dayNames.clear();
      dayNames.set(k, name);
    }
    return name;
  };
  const linkOf = e => e.task ? `#/t/${encodeURIComponent(e.id)}` : e.project ? `#/p/${encodeURIComponent(e.project)}/overview` : '';
  const sub = e => [e.project, e.task || (e.id !== e.project ? e.id : '')].filter(Boolean).join(' · ');
  const label = e => `${hhmm(e.ts)}, ${[e.project, e.task].filter(Boolean).join(', ') || e.id}. ${KW[kOf(e)]}${word(e)}. ${e.msg}`;
  const row = e => {
    const href = linkOf(e), tag = href ? 'a' : 'div';
    return `<li data-key="${esc(keyOf(e))}"><${tag} class="act-row"${href ? ` href="${href}"` : ''} data-k="${kOf(e)}" aria-label="${esc(label(e))}">
      <time class="num" datetime="${esc(e.ts)}">${hhmm(e.ts)}</time><span class="dot${kOf(e) === 'needs' || kOf(e) === 'done' ? ` dot-${kOf(e)}` : ''}" aria-hidden="true"></span>
      <span class="act-t"><span class="act-l"><b>${esc(word(e))}</b> ${esc(e.msg)}</span>${sub(e) ? `<span class="act-s">${esc(sub(e))}</span>` : ''}</span></${tag}></li>`;
  };

  const readKey = () => f.p ? `p:${f.p}` : 'all';
  // What's on hand for the current filter: the project's own read, else the 3-day read filtered to it (until it lands).
  const data = () => seen.get(readKey()) || (f.p && seen.has('all') ? { ...seen.get('all'), events: seen.get('all').events.filter(e => e.project === f.p), partial: true } : null);
  const shown = d => d.events.filter(e => !f.only || e.k === 'needs');
  const span = d => d.since < Date.now() - 3 * DAY - 600_000 ? `Since ${new Date(d.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Last 3 days';
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const summary = d => { const l = shown(d); return `${span(d)} · ${plural(l.length, 'event')}${f.only ? '' : ` · ${plural(l.filter(e => e.k === 'needs').length, 'past problem')}`}`; };

  function feed(d) {
    waitingIds = new Set((state?.projects || []).flatMap(p => (p.tasks || []).filter(t => t.status === 'needs-you').map(t => t.id)));
    const list = shown(d);
    if (!list.length) {
      const where = f.p ? ` in ${esc(f.p)}` : '', when = span(d) === 'Last 3 days' ? 'in the last 3 days' : 'lately';
      return { keys: [], html: `<div class="act-none"><p>${f.only ? `No problems${where} ${when}.` : `Nothing happened${where} ${when}.`}</p><button class="btn btn-secondary" type="button" data-act-all>Show everything</button></div>` };
    }
    const top = list.slice(0, limit), days = new Map();
    for (const e of list) { const k = dayOf(e.ts); days.set(k, (days.get(k) || 0) + 1); }
    const groups = new Map();
    for (const e of top) { const k = dayOf(e.ts); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    const id = k => `ad-${k.replace(/\W/g, '')}`;
    const html = [...groups].map(([k, rows]) => `<section class="act-day" aria-labelledby="${id(k)}"><h2 id="${id(k)}">${esc(k)}<span class="n num">${days.get(k)}</span></h2>
      <ol class="act-list" data-day="${esc(k)}">${rows.map(row).join('')}</ol></section>`).join('')
      + (list.length > top.length ? `<button class="btn btn-secondary act-more" type="button" data-act-more>Show ${Math.min(PAGE, list.length - top.length)} older events</button>` : '');
    return { keys: top.map(keyOf), html };
  }

  const options = () => ['', ...state.projects.map(p => p.alias)].map(a => `<option value="${esc(a)}"${a === f.p ? ' selected' : ''}>${a ? esc(a) : 'All projects'}</option>`).join('');
  const filters = () => `<div class="act-filters" role="group" aria-label="Filter">
      <label class="sr-only" for="a-proj">Project</label>
      <span class="act-select"><select class="input" id="a-proj">${options()}</select>${I('chevron-down')}</span>
      <button class="btn btn-secondary act-only" type="button" aria-pressed="${f.only}" data-act-only><span class="dot" aria-hidden="true"></span>Only problems</button></div>`;
  const head = d => `${f.p ? `<a class="back" href="#/p/${encodeURIComponent(f.p)}/overview">${I('chevron-left')}<span>${esc(f.p)}</span></a>` : ''}<h1>Activity</h1>${d ? `<span class="hf-sum num" data-act-sum aria-live="polite">${summary(d)}</span>` : ''}<span class="end">${liveLine()}</span>`;
  const frame = (h, body) => `<div class="scr acts"><header class="hf-head" data-act-head>${h}</header><div class="hf-body">${body}</div></div>`;
  const firstRun = () => `<div class="hf-empty"><h2>Nothing has happened yet.</h2><p>Once a project starts, everything its team does shows up here, newest first: steps, proof, checks, reviews and what you decided.</p><a class="btn btn-primary" href="#/new">${I('plus')}New project</a></div>`;

  function loading() {
    const sk = (w, h) => `<span class="skeleton" style="width:${w};height:${h}px"></span>`;
    $('view').innerHTML = frame(head(null), `<div class="act" aria-busy="true" aria-label="Loading activity">${sk('260px', 36)}${[5, 3].map(n => `<section class="act-day">${sk('80px', 14)}${Array.from({ length: n }, () => sk('100%', 44)).join('')}</section>`).join('')}</div>`);
    mounted = '';
  }
  function error() { $('view').innerHTML = frame(head(null), loadError('Activity')); mounted = ''; }

  // Draw the whole screen, or (same filter, same screen) only what changed: new events slide in at the top of Today.
  function draw() {
    const d = data(), view = $('view');
    if (!d) return loading();
    const root = view.querySelector(':scope > .acts');
    const sig = `${f.p}|${f.only}`;
    if (!d.events.length && !f.p && !f.only) { view.innerHTML = frame(`<h1>Activity</h1>`, firstRun()); mounted = ''; return; }
    const fd = feed(d);
    if (root && mounted === sig && root.querySelector('[data-act-feed]')) {
      const h = root.querySelector('[data-act-head]'), hh = head(d);
      if (h.dataset.html !== hh) {
        // Same project as drawn, so the same back link: only the summary (ticking when it changes) and the live line move.
        const s = h.querySelector('[data-act-sum]'), nowSum = summary(d);
        if (s && h.dataset.p === f.p) { if (s.textContent !== nowSum) { s.textContent = nowSum; tick(s); } h.querySelector('.end').innerHTML = liveLine(); }
        else h.innerHTML = hh;
        h.dataset.html = hh; h.dataset.p = f.p;
      }
      root.querySelector('.act').classList.toggle('is-stale', !!failedAt);
      if (fd.html === drawnHTML) return;
      const box = root.querySelector('[data-act-feed]');
      const fresh = fd.keys.slice(0, fd.keys.indexOf(drawnKeys[0]));
      const today = box.querySelector('.act-list[data-day="Today"]');
      // Only new events at the head, and Today already drawn: add them in place, the rest stays (scroll, focus, hover).
      if (drawnKeys.length && fresh.length && fd.keys.indexOf(drawnKeys[0]) > 0 && today && box.querySelector('.act-list')?.dataset.day === 'Today') {
        const byKey = new Map(shown(d).map(e => [keyOf(e), e]));
        today.insertAdjacentHTML('afterbegin', fresh.map(k => row(byKey.get(k))).join(''));
        for (const li of [...today.children].slice(0, fresh.length)) li.classList.add('is-entering');
        const n = today.closest('.act-day').querySelector('h2 .n'), nn = String(shown(d).filter(e => dayOf(e.ts) === 'Today').length);
        if (n.textContent !== nn) { n.textContent = nn; tick(n); }
        limit += fresh.length;
        drawnKeys = [...fresh, ...drawnKeys]; drawnHTML = feed(d).html;
        return;
      }
      box.innerHTML = fd.html; drawnKeys = fd.keys; drawnHTML = fd.html;
      return;
    }
    view.innerHTML = frame(head(d), `<div class="act${failedAt ? ' is-stale' : ''}">${filters()}<div class="act-feed" data-act-feed>${fd.html}</div></div>`);
    Object.assign(view.querySelector('[data-act-head]').dataset, { html: head(d), p: f.p });
    drawnKeys = fd.keys; drawnHTML = fd.html; mounted = sig;
  }
  const tick = el => { el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); };

  // The address is the filter: #/activity?p=<alias>&only=problems
  function fromHash() {
    const q = new URLSearchParams(location.hash.split('?')[1] || '');
    const p = q.get('p') || '';
    return { p: state.projects.some(x => x.alias === p) ? p : '', only: q.get('only') === 'problems' };
  }
  const hashOf = () => { const q = new URLSearchParams(); if (f.p) q.set('p', f.p); if (f.only) q.set('only', 'problems'); const s = q.toString(); return `#/activity${s ? `?${s}` : ''}`; };

  async function load(wait) {
    const k = readKey(), path = f.p ? `/api/activity/${encodeURIComponent(f.p)}` : '/api/activity';
    const d = await get(`${path}${wait ? '?wait' : ''}`);
    seen.set(k, { events: d.events || [], since: d.since || Date.now() - 3 * DAY });
    return k;
  }

  async function show(refreshing, wait) {
    const next = fromHash();
    if (!refreshing || next.p !== f.p || next.only !== f.only) { if (next.p !== f.p || next.only !== f.only || !refreshing) limit = PAGE; f = next; }
    const hash = location.hash, had = data();
    if (had) draw(); else loading();
    try { const k = await load(wait); if (location.hash !== hash || k !== readKey()) return; } catch (e) {
      if (e.message === 'signed out') throw e;
      if (location.hash === hash && !had) error();
      else if (had) draw(); // keep what's shown; the live line says it's retrying
      return;
    }
    draw();
  }

  // Changing a filter redraws the feed in place (p-in) and rewrites the address without a new history entry.
  function refilter(focusPicker) {
    history.replaceState(null, '', hashOf());
    limit = PAGE;
    const root = $('view').querySelector(':scope > .acts');
    const d = data();
    if (root && d) {
      const fd = feed(d), box = root.querySelector('[data-act-feed]');
      box.innerHTML = fd.html; drawnKeys = fd.keys; drawnHTML = fd.html; mounted = `${f.p}|${f.only}`;
      box.classList.remove('is-entering'); void box.offsetWidth; box.classList.add('is-entering');
      const h = root.querySelector('[data-act-head]'); h.innerHTML = head(d); Object.assign(h.dataset, { html: head(d), p: f.p });
      root.querySelector('[data-act-only]').setAttribute('aria-pressed', String(f.only));
      $('a-proj').value = f.p;
    } else if (root) {
      // Not read yet for this filter: the filters stay (and keep focus), the feed waits as skeleton rows.
      const box = root.querySelector('[data-act-feed]');
      if (box) box.innerHTML = `<section class="act-day" aria-busy="true" aria-label="Loading activity">${Array.from({ length: 5 }, () => '<span class="skeleton" style="width:100%;height:44px"></span>').join('')}</section>`;
      drawnKeys = []; drawnHTML = ''; mounted = `${f.p}|${f.only}`;
      root.querySelector('[data-act-only]')?.setAttribute('aria-pressed', String(f.only));
      if ($('a-proj')) $('a-proj').value = f.p;
    } else draw();
    if (focusPicker) $('a-proj')?.focus();
    if (!seen.has(readKey())) load().then(k => { if (k === readKey() && /^#\/activity/.test(location.hash)) draw(); }).catch(() => {});
  }

  document.addEventListener('change', e => { if (e.target.id === 'a-proj') { f.p = e.target.value; refilter(); } });
  document.addEventListener('click', e => {
    if (!e.target.closest('.acts')) return;
    if (e.target.closest('[data-act-only]')) { f.only = !f.only; refilter(); }
    else if (e.target.closest('[data-act-all]')) { f = { p: '', only: false }; refilter(true); }
    else if (e.target.closest('[data-act-more]')) {
      const b = e.target.closest('[data-act-more]'), d = data(), at = drawnKeys.length;
      limit += PAGE; const fd = feed(d);
      b.closest('[data-act-feed]').innerHTML = fd.html; drawnKeys = fd.keys; drawnHTML = fd.html;
      // Focus moves to the first of the newly shown events, so the keyboard carries on where it was.
      document.querySelector(`.acts li[data-key="${CSS.escape(fd.keys[at])}"] .act-row`)?.focus({ preventScroll: true });
    }
  });
  return { show, loading };
})();

// =====================================================================================================
// Settings (D6: design/screens2/settings.html; UX-3 A, UX-10 A). Two scopes, said in the head: #/settings is every
// project (Claude plan, appearance, this device, each project, about); #/settings?p=<alias> is one project (lead,
// approvals, gating, money, shipping, reporting, reading, team, numbers), and the project page's Settings tab lands
// there. Everything comes from the overview, so the page paints at once. A change takes effect at once and says so:
// a choice saves on change with a toast and Undo, an amount on Enter or leaving the field with "Saved" beside it, and
// only stopping the lead confirms. Same actions as before (dial, pace, lead-*); the theme stays in the browser.
// A refresh replaces only sections whose words changed, never one being typed in or saving.
// =====================================================================================================
const Settings = (() => {
  let mounted = '', parts = new Map(), io = null, pin = '', pinAt = 0;
  const TRUST = { strict: 'Strict', standard: 'Standard', loose: 'Loose' };
  const SHIP = { merge: 'straight to main', pr: 'draft pull requests', branch: 'local branches only' };
  const REPORT = { everything: 'Everything', daily: 'A daily digest', exceptions: 'Only exceptions' };
  const GATES = [['brief', 'Brief'], ['spec', 'Spec'], ['design', 'Design'], ['contracts', 'Contracts']];
  const THEME = { dark: 'Dark', light: 'Light', device: 'Follow this device' };
  const q = () => new URLSearchParams(location.hash.split('?')[1] || '');
  const proj = a => (state?.projects || []).find(p => p.alias === a);
  const themePick = () => store.get('atelier-theme') || (!firstRun && isPhone() ? 'device' : 'dark');
  const setTheme = v => { if (v) store.set('atelier-theme', v); else try { localStorage.removeItem('atelier-theme'); } catch { /* private mode */ } applyTheme(); };

  const radio = (name, val, title, sub, cur, tag = '') => `<label class="choice is-two"><input type="radio" name="${name}" value="${val}"${cur === val ? ' checked' : ''} data-say="${esc(title)}"><span><b>${title}${tag ? `<span class="tag">${tag}</span>` : ''}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  const amount = (key, label, val, unit, help) => `
    <div class="field" data-field="${key}">
      <label class="field-label" for="s-${key}">${label}</label>
      <span class="f-inline"><span class="f-unit ${unit === '$' ? 'is-pre' : 'is-post'}">${unit === '$' ? '<i>$</i>' : ''}<input class="input" id="s-${key}" name="${key}" inputmode="decimal" autocomplete="off" value="${esc(String(val ?? ''))}" data-amount="${key}" data-was="${esc(String(val ?? ''))}" aria-describedby="s-${key}-h">${unit === '%' ? '<i>%</i>' : ''}</span><span class="f-saved" aria-live="polite">${I('check')}<span>Saved</span></span></span>
      <span class="field-help" id="s-${key}-h">${help}</span>
    </div>`;
  const sec = (key, title, body, why = '') => `<section class="f-sec s-sec" id="ss-${key}" aria-labelledby="ss-${key}-h" data-r="${key}"><h2 id="ss-${key}-h" tabindex="-1">${title}</h2>${why ? `<p class="f-why">${why}</p>` : ''}${body}</section>`;
  const meter = (label, w, foot) => `<div class="meter"><div class="meter-head"><span>${label}</span><b>${w ? `${w.used}%` : '–'} <small>used</small></b></div><div class="meter-track${w && w.used >= 100 ? ' is-full' : ''}" role="img" aria-label="${w ? `${label}: ${w.used}% used` : `${label}: not known yet`}"><i style="--value:${w ? Math.min(100, w.used) : 0}%"></i></div><span class="meter-foot">${foot}</span></div>`;
  // The earned-trust reason in words (the server's why: "3/10 approvals and 3 overrule(s) (max 1) since the last change").
  const whyWords = s => {
    const m = String(s || '').match(/^(\d+)\/(\d+) approvals and (\d+) overrule\(s\) \(max (\d+)\) since the last change(?:, (\d+) open high-severity)?/);
    if (!m) return esc(s || '');
    const [, got, need, over, max, high] = m;
    return `${got} of ${need} approvals and ${over} overrule${over === '1' ? '' : 's'} (at most ${max}) since the last change${high ? `; ${high} serious audit finding${high === '1' ? ' is' : 's are'} still open` : ''}.`;
  };

  // Why the pacing holds (the server's pace.holdingWhy), with the sidebar's figures.
  const holdWhy = (pace, plan) => {
    const w = pace.holdingWhy || [], pc = x => `<span class="num">${x}</span> %`;
    if (w.includes('fiveHour')) return `The 5‑hour window is at ${pc(plan.fiveHour?.used ?? pace.fiveHour)}, past the ${pc(pace.fiveHour)} you set below.`;
    if (w.includes('sevenDay')) return `This week is at ${pc(plan.sevenDay?.used ?? pace.sevenDay)}, past the ${pc(pace.sevenDay)} you set below.`;
    if (w.includes('spread')) return `Today has used more than its share of the week (${pc(plan.sevenDay?.used ?? 0)} so far).`;
    return 'Your plan use is past the line you set below.';
  };

  // overview.version is the newest dashboard file's time (base 36 ms): when this version was installed.
  const installed = () => {
    const ms = parseInt(state.version || '', 36);
    if (!(ms > 0)) return '';
    const d = new Date(ms), today = new Date().toDateString() === d.toDateString();
    return `This version was installed ${today ? 'today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}. `;
  };

  // ── Every project ──
  function global() {
    const C = counts(), plan = C?.plan || {}, pace = state.pace || {}, t = state.atelierToday || {};
    const upd = plan.savedAt ? ` Updated ${longAgo(new Date(plan.savedAt * 1000).toISOString())}.` : '';
    const pw = planWords(plan, pace);
    const tokens = ((t.tokens || 0) + (t.liveTokens || 0)) / 1e6;
    const holding = pace.holdingUntil
      ? `<p class="s-hold is-holding" role="status">${I('refresh')}<span><b>Holding new work until ${esc(resetAt(pace.holdingUntil))}.</b> ${holdWhy(pace, plan)} Running tasks finish first.</span></p>`
      : `<p class="s-hold" role="status"><span class="dot dot-done" aria-hidden="true"></span><span>Not holding: work runs as planned.</span></p>`;
    const rows = (state.projects || []).filter(p => !p.error).map(p => `<a class="p-row" href="#/settings?p=${encodeURIComponent(p.alias)}">${Office.dotOf(p.lead?.running ? 'active' : '', p.lead?.running ? 'Lead on' : 'Lead off')}<span class="t"><b>${esc(p.alias)}</b><span class="s">${TRUST[p.trust] || cap1(p.trust)} gating · ${money(p.budget?.day)} a day · ${SHIP[p.autonomy] || esc(p.autonomy)}</span></span><span class="m">${I('chevron-right')}</span></a>`).join('');
    return [
      ['plan', 'Claude plan', `
        <div class="s-meters">${meter('5‑hour window', plan.fiveHour, pw.five ? `${esc(pw.five.rest)}${upd}` : 'Shows after the first run')}${meter('This week', plan.sevenDay, pw.week ? esc(pw.week.rest) : 'Shows after the first run')}</div>
        <p class="field-help s-spent">Atelier spent <b class="num">${money(C?.spentToday)}</b> today so far${C?.working ? `, including work still running; ${C.working} agent${C.working === 1 ? ' is' : 's are'} still working, so it will rise` : ''}. <span class="num">${tokens.toFixed(1)}</span> M tokens. API-equivalent cost, not a bill.</p>
        ${holding}
        ${amount('fiveHour', 'Pause Atelier at this much of the 5‑hour window', pace.fiveHour, '%', 'New work waits until the window resets. Running tasks finish.')}
        ${amount('sevenDay', 'Pause Atelier at this much of the week', pace.sevenDay, '%', 'Atelier stops there, so the rest of the week stays yours.')}
        <label class="f-switch"><span>Spread work evenly over the week<small>Holds work when today has used more than its share.</small></span><input type="checkbox" name="spread"${pace.spread ? ' checked' : ''} data-say="Spread work evenly"></label>`,
        'Shared by every project, and by your own chats and Claude Code sessions. Atelier paces itself so the plan lasts.'],
      ['look', 'Appearance', `<fieldset class="f-sec"><legend class="sr-only">Theme</legend><div class="f-row3">${Object.entries(THEME).map(([k, v]) => radio('theme', k, v, '', themePick())).join('')}</div></fieldset>`,
        'Kept in this browser only.'],
      ['device', 'This device', `<p class="s-p">Signed in on this browser. To use Atelier on your phone, open it there, paste your access token once, and add it to the home screen.</p>`],
      ['projects', 'Each project', rows ? `<div class="p-rows">${rows}</div>` : `<p class="s-p">No projects yet. <a class="link" href="#/new">Start one</a>.</p>`,
        'Approvals, gating, money, shipping and the team are set per project.'],
      ['about', 'About', `<p class="s-p">${installed()}The dashboard reloads itself when a new version is installed.</p>`],
    ];
  }

  // ── One project ──
  function one(p) {
    const a = p.alias, A = esc(a), C = counts(), S = C?.projects[a] || {};
    const sg = p.suggestion, earned = sg?.ready ? sg : null;
    const tag = (dial, v) => earned && earned.dial === dial && earned.to === v ? 'earned' : '';
    const working = new Set((p.team?.agents || []).filter(x => x.state === 'working').map(x => (x.role || x.who || '').toLowerCase()));
    const model = r => r.model || (r.role === 'reviewer' ? p.reviewer?.model : '');
    const lead = p.lead?.running;
    const spent = Number(S.spentToday || 0), lim = Number(S.dayLimit || p.budget?.day || 0);
    const dayHelp = `Today ${money(spent)} of ${money(lim)}${S.atLimit ? ', at its limit' : ''}. Resets at midnight.`;
    const trustNote = earned
      ? `<p class="s-earned">${I('outcome')}<span><b>The team has earned ${earned.dial === 'trust' ? `${earned.to} gating` : `${(REPORT[earned.to] || earned.to).toLowerCase()} reporting`}.</b> ${whyWords(earned.why)}</span></p>`
      : sg ? `<p class="field-help">Next to earn: ${sg.dial === 'trust' ? `${esc(sg.to)} gating` : `${esc((REPORT[sg.to] || sg.to).toLowerCase())} reporting`}. So far ${whyWords(sg.why).replace(/^./, c => c.toLowerCase())}</p>` : '';
    return [
      ['lead', 'Lead', `<div class="s-lead"><span class="p-lead${lead ? '' : ' is-off'}">${Office.dotOf(lead ? 'active' : '', lead ? 'Lead on' : 'Lead off')}<span>${lead ? 'Lead on' : 'Lead off'}</span></span><span class="s-app">${lead ? `In the Claude app: “${A} lead”` : 'Start it, then talk to it in the Claude app'}</span></div>
        <div class="f-actions">${lead ? `<button class="btn btn-secondary" type="button" data-sa="restart">${I('refresh')}Restart fresh</button><button class="btn btn-secondary" type="button" data-sa="stop">${I('x')}Stop the lead…</button>` : `<button class="btn btn-primary" type="button" data-sa="start">${I('play')}Start the lead</button>`}</div>`],
      ['gates', 'Approvals', `<div class="f-checks">${GATES.map(([k, t]) => `<label class="f-check"><input type="checkbox" name="gate" value="${k}"${(p.ownerGates || []).includes(k) ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>`,
        'The phases you approve yourself. The lead approves the rest and logs it; the auditor still checks after every phase. Your charter is always yours.'],
      ['trust', 'Gating', `${trustNote}<div class="choices">
        ${radio('trust', 'strict', 'Strict', 'You OK every phase, and every task’s plan before it starts.', p.trust, tag('trust', 'strict'))}
        ${radio('trust', 'standard', 'Standard', 'You OK the phases ticked under Approvals; tasks start by themselves.', p.trust, tag('trust', 'standard'))}
        ${radio('trust', 'loose', 'Loose', 'You OK the brief; the lead takes the rest and logs it.', p.trust, tag('trust', 'loose'))}</div>`],
      ['money', 'Money', `<div class="s-money">${amount('budgetDay', 'Spend per day', p.budget?.day, '$', dayHelp)}${amount('budgetTask', 'Spend per task', p.budget?.task, '$', 'Then the lead decides whether to give it more.')}</div>`,
        'For the whole team, the lead included. API-equivalent cost, not a bill. Your Claude plan is in <a class="link" href="#/settings">Settings for every project</a>.'],
      ['ship', 'Shipping', `<div class="choices">${radio('autonomy', 'merge', 'Straight to main', 'Reviewed work lands by itself.', p.autonomy)}${radio('autonomy', 'pr', 'Draft pull requests', 'You merge each one.', p.autonomy)}${radio('autonomy', 'branch', 'Local branches only', 'Nothing leaves this computer.', p.autonomy)}</div>`],
      ['report', 'Reporting', `<div class="choices">${radio('reporting', 'everything', 'Everything', 'Every event reaches you.', p.reporting, tag('reporting', 'everything'))}${radio('reporting', 'daily', 'A daily digest', 'One summary each day.', p.reporting, tag('reporting', 'daily'))}${radio('reporting', 'exceptions', 'Only exceptions', 'Only what needs you and what went wrong.', p.reporting, tag('reporting', 'exceptions'))}</div>`],
      ['read', 'What you read', `<div class="f-row2">${radio('summaryStyle', 'plain', 'Plain words', 'Short summaries of what it means for the product.', p.summaryStyle)}${radio('summaryStyle', 'technical', 'Technical', 'Full detail: files, tests and diffs.', p.summaryStyle)}</div>`],
      ['team', 'Team', `<table class="s-team"><thead><tr><th scope="col">Role</th><th scope="col">Files it owns</th><th scope="col">Model</th></tr></thead><tbody>${(p.roster || []).map(r => `<tr><th scope="row"><span class="dot${working.has(r.role) ? ' dot-active' : ''}" aria-hidden="true"></span>${esc(cap1(r.role.replace(/-/g, ' ')))}${working.has(r.role) ? '<span class="sr-only">, working</span>' : ''}</th><td>${r.owns?.length ? esc(r.owns.join(', ')) : 'Reads everything, writes nothing'}</td><td>${model(r) ? esc(cap1(model(r))) : 'Set per task'}</td></tr>`).join('')}</tbody></table>`],
      ['numbers', 'Numbers', `<dl class="s-dl"><dt>Your approvals</dt><dd class="num">${p.metrics?.approvals ?? 0}</dd><dt>Overruled by you</dt><dd>${p.metrics?.overrules ? `<span class="num">${p.metrics.overrules}</span> time${p.metrics.overrules === 1 ? '' : 's'}` : 'Never yet'}</dd><dt>Audit hit rate</dt><dd>${p.hit?.judged ? `<span class="num">${p.hit.confirmed}</span> of <span class="num">${p.hit.judged}</span> findings confirmed` : 'No findings judged yet'}</dd><dt>Full test suite</dt><dd>${p.suite ? `<code>${esc(p.suite)}</code>` : 'Not set yet: the lead sets it'}</dd><dt>Project folder</dt><dd><code>${esc(p.repo || '')}</code></dd></dl>`],
    ];
  }

  const dialog = a => `<dialog class="p-dialog" id="s-stop" aria-labelledby="sstop-t" aria-describedby="sstop-d"><h2 id="sstop-t">Stop the lead for ${esc(a)}?</h2>
      <p id="sstop-d">Nothing new starts until you start it again. Running tasks finish the try they are on.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Keep it running</button><button class="btn btn-danger" type="button" value="go">Stop the lead</button></div></dialog>`;
  const head = a => `<header class="hf-head" data-r="head">${a ? `<a class="back" href="#/p/${encodeURIComponent(a)}/overview">${I('chevron-left')}<span>${esc(a)}</span></a>` : ''}<h1>Settings</h1><span class="hf-sum">${a ? `${esc(a)} only` : 'For every project'}</span><span class="end">${liveLine()}</span></header>`;

  function show() {
    const a = q().get('p') || '';
    const view = $('view');
    const p = a && proj(a);
    if (a && !p) { mounted = ''; view.innerHTML = `<div class="scr sets">${head('')}<div class="hf-body"><p class="p-empty"><b>There’s no project called ${esc(a)}.</b><span><a class="link" href="#/settings">Settings for every project</a></span></p></div></div>`; return; }
    if (p?.error) { mounted = ''; view.innerHTML = `<div class="scr sets">${head(a)}<div class="hf-body">${loadError(`Settings for ${a}`)}</div></div>`; return; }
    const S = p ? one(p) : global();
    const key = a || '*';
    const regions = [['head', head(a)], ...S.map(x => [x[0], sec(...x)])];
    const root = view.querySelector(':scope > .sets');
    if (mounted === key && root) { patch(root, regions); return; }
    mounted = key; parts = new Map(regions);
    const nav = `<nav class="s-nav" aria-label="Settings sections">${S.map(([k, t], i) => `<a class="nav-item" href="#ss-${k}" data-sec="${k}"${i === 0 ? ' aria-current="true"' : ''}>${t}</a>`).join('')}
      ${a ? `<a class="nav-item s-other" href="#/settings">${I('settings')}Every project</a>` : ''}</nav>`;
    view.innerHTML = `<div class="scr sets" data-a="${esc(a)}">${regions[0][1]}<div class="hf-body"><div class="s-grid">${nav}<form class="f-form s-form" novalidate>${regions.slice(1).map(r => r[1]).join('')}</form></div></div>${a ? dialog(a) : ''}</div>`;
    follow();
  }

  // Replace a section whose words changed, unless it is being typed in or is saving; focus stays on the same control.
  function patch(root, regions) {
    for (const [r, html] of regions) {
      if (parts.get(r) === html) continue;
      const old = root.querySelector(`[data-r="${r}"]`);
      if (!old || old.hasAttribute('data-hold')) continue;
      const f = document.activeElement;
      if (old.contains(f) && f.matches('input:not([type=radio]):not([type=checkbox])')) continue;
      const sel = !old.contains(f) ? '' : f.name ? `[name="${CSS.escape(f.name)}"]${f.type === 'radio' || f.name === 'gate' ? `[value="${CSS.escape(f.value)}"]` : ''}` : f.dataset.sa ? `[data-sa="${f.dataset.sa}"]` : 'h2';
      const tpl = document.createElement('template'); tpl.innerHTML = html;
      const el = tpl.content.firstElementChild;
      old.replaceWith(el); parts.set(r, html);
      if (sel) (el.querySelector(sel) || el.querySelector('h2')).focus({ preventScroll: true });
    }
    if (io) root.querySelectorAll('.s-sec').forEach(s => io.observe(s));
  }

  // The section nav follows the scroll (desk only); a link scrolls to its section and moves focus to its heading.
  function follow() {
    io?.disconnect();
    const links = [...document.querySelectorAll('.s-nav [data-sec]')];
    // Current = the last section whose top has passed 30 % of the view; the first at the top of the page, the last at the end.
    io = new IntersectionObserver(() => {
      const top = pin && $(`ss-${pin}`)?.getBoundingClientRect().top;
      if (pin && (Date.now() - pinAt < 1000 || (top >= 0 && top < innerHeight * 0.8))) return; // still scrolling there, or still on screen
      pin = '';
      const secs = [...document.querySelectorAll('.sets .s-sec')];
      const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 2; // the last ones can't scroll up to 30 %
      const cur = scrollY < 8 ? secs[0] : end ? secs.at(-1) : secs.filter(s => s.getBoundingClientRect().top < innerHeight * 0.3).pop() || secs[0];
      links.forEach(l => (`ss-${l.dataset.sec}` === cur?.id ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
    }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '0px 0px -70% 0px' });
    document.querySelectorAll('.sets .s-sec').forEach(s => io.observe(s));
  }

  // ── Saving ──
  const A = () => document.querySelector('.sets')?.dataset.a || '';
  const hold = (el, on) => el?.closest('[data-r]')?.toggleAttribute('data-hold', on);
  const fail = e => /fetch|network/i.test(e.message) ? 'Couldn’t reach Atelier. Nothing was saved.' : cap1(e.message);
  function toastUndo(text, undo) {
    const box = $('toasts');
    box.innerHTML = `<div class="toast toast-success" role="status"><span class="tick">${I('check')}</span><span class="toast-text">${esc(text)}</span>${undo ? '<button class="toast-action" type="button" data-sa="undo">Undo</button>' : ''}<span class="toast-life" aria-hidden="true"></span></div>`;
    Inbox.placeToast();
    const t = box.firstChild;
    let left = 6000, started = Date.now(), timer;
    const close = () => { if (t.isConnected) { t.remove(); Inbox.placeToast(); } };
    const run = () => { started = Date.now(); clearTimeout(timer); timer = setTimeout(close, left); };
    const pause = () => { clearTimeout(timer); left = Math.max(1500, left - (Date.now() - started)); };
    t.addEventListener('pointerenter', pause); t.addEventListener('focusin', pause);
    t.addEventListener('pointerleave', () => { if (!t.contains(document.activeElement)) run(); });
    t.addEventListener('focusout', e => { if (!t.contains(e.relatedTarget) && !t.matches(':hover')) run(); });
    t.querySelector('[data-sa="undo"]')?.addEventListener('click', () => { clearTimeout(timer); close(); undo(); });
    run();
  }
  // Send one setting; on failure put the control back and say why.
  async function save(el, body, putBack) {
    hold(el, true);
    try { await post(body); return true; } catch (e) { putBack?.(); toast(fail(e), { error: true }); return false; } finally { hold(el, false); refresh().catch(() => {}); }
  }
  const DIAL_SEC = { trust: 'Gating', autonomy: 'Shipping', reporting: 'Reporting', summaryStyle: 'What you read' };

  document.addEventListener('change', async e => {
    const t = e.target;
    if (!t.closest?.('.sets .s-form') || t.dataset.amount) return;
    const a = A(), p = a && proj(a), where = a ? ` for ${a}` : '';
    if (t.name === 'theme') {
      const was = store.get('atelier-theme');
      setTheme(t.value);
      return toastUndo(`Saved on this device. Appearance: ${THEME[t.value]}`, () => { setTheme(was); const r = document.querySelector(`.sets input[name="theme"][value="${themePick()}"]`); if (r) r.checked = true; });
    }
    if (t.name === 'spread') {
      const on = t.checked, back = () => { t.checked = !on; };
      if (await save(t, { action: 'pace', spread: on }, back)) toastUndo(`Saved. Spread work evenly: ${on ? 'on' : 'off'}`, () => { back(); save(t, { action: 'pace', spread: !on }, () => { t.checked = on; }); });
      return;
    }
    if (!p) return;
    if (t.name === 'gate') {
      const list = () => [...document.querySelectorAll('.sets input[name="gate"]:checked')].map(x => x.value);
      const now = list(), was = p.ownerGates || [], back = () => document.querySelectorAll('.sets input[name="gate"]').forEach(x => { x.checked = was.includes(x.value); });
      const said = `You approve the ${t.value}: ${t.checked ? 'on' : 'off'}`;
      if (await save(t, { action: 'dial', project: a, dial: 'ownerGates', value: now.join(',') }, back)) toastUndo(`Saved${where}. ${said}`, () => { back(); save(t, { action: 'dial', project: a, dial: 'ownerGates', value: was.join(',') }); });
      return;
    }
    if (DIAL_SEC[t.name]) {
      const was = p[t.name], v = t.value;
      const pick = x => { const r = document.querySelector(`.sets input[name="${t.name}"][value="${CSS.escape(x)}"]`); if (r) r.checked = true; };
      if (await save(t, { action: 'dial', project: a, dial: t.name, value: v }, () => pick(was))) toastUndo(`Saved${where}. ${DIAL_SEC[t.name]}: ${t.dataset.say}`, () => { pick(was); save(t, { action: 'dial', project: a, dial: t.name, value: was }, () => pick(v)); });
    }
  });

  // Amounts save on Enter or on leaving the field, once they read as a number; nothing is sent until then.
  async function amountSave(inp) {
    const k = inp.dataset.amount, isMoney = k.startsWith('budget'), v = inp.value.trim().replace(/^\$/, '').replace(/%$/, '').trim();
    const fld = inp.closest('.field'), help = `${inp.id}-h`;
    const err = msg => {
      fld.querySelector('.field-error')?.remove();
      if (!msg) { inp.removeAttribute('aria-invalid'); inp.setAttribute('aria-describedby', help); return; }
      inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', `${help} ${inp.id}-e`);
      inp.closest('.f-inline').insertAdjacentHTML('afterend', `<span class="field-error" id="${inp.id}-e">${I('alert')}<span>${esc(msg)}</span></span>`);
    };
    const n = Number(v);
    const ok = isMoney ? /^\d+(\.\d{1,2})?$/.test(v) && n > 0 && n <= 10000 : /^\d+$/.test(v) && n >= 10 && n <= 100;
    if (!ok) return err(isMoney ? 'Enter an amount in dollars, like 40.' : 'Enter a percentage from 10 to 100.');
    err('');
    if (n === Number(inp.dataset.was)) return;
    const a = A();
    const body = isMoney ? { action: 'dial', project: a, dial: k, value: String(n) } : { action: 'pace', [k]: n };
    hold(inp, true);
    try {
      await post(body);
      inp.dataset.was = String(n); inp.value = String(n);
      const s = fld.querySelector('.f-saved'); s.classList.add('is-on'); clearTimeout(s.t); s.t = setTimeout(() => s.classList.remove('is-on'), 2400);
    } catch (x) { err(fail(x)); } finally { hold(inp, false); refresh().catch(() => {}); }
  }
  // Leaving the field, not 'change': after Enter saved, typing the old value back fires no change (it equals the value at focus).
  document.addEventListener('focusout', e => { if (e.target.closest?.('.sets') && e.target.dataset.amount) amountSave(e.target); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest?.('.sets') && e.target.dataset.amount) { e.preventDefault(); amountSave(e.target); } });
  document.addEventListener('submit', e => { if (e.target.closest('.sets')) e.preventDefault(); });

  // ── The lead (R16): restart is instant, stop confirms; and the section nav ──
  document.addEventListener('click', async e => {
    const nav = e.target.closest('.sets .s-nav [data-sec]');
    if (nav) {
      e.preventDefault();
      const h = $(`ss-${nav.dataset.sec}-h`);
      h?.closest('.s-sec').scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
      h?.focus({ preventScroll: true });
      document.querySelectorAll('.s-nav [data-sec]').forEach(l => (l === nav ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
      pin = nav.dataset.sec; pinAt = Date.now(); // a picked section stays current while it is on screen, even one too short to reach 30 %
      return;
    }
    const b = e.target.closest('.sets [data-sa]');
    if (!b) return;
    const a = A();
    const go = async (body, done, busy) => {
      const was = b.innerHTML; b.disabled = true; b.setAttribute('aria-busy', 'true'); if (busy) b.textContent = busy;
      await act(body, done);
      if (b.isConnected) { b.disabled = false; b.removeAttribute('aria-busy'); b.innerHTML = was; }
    };
    if (b.dataset.sa === 'restart') go({ action: 'lead-restart', project: a }, `Restarting the lead for ${a} with a fresh start`, 'Restarting…');
    if (b.dataset.sa === 'start') go({ action: 'lead-start', project: a }, `Starting the lead for ${a} in a terminal on this PC`, 'Starting…');
    if (b.dataset.sa === 'stop') {
      const d = $('s-stop'); if (!d) return;
      d.querySelectorAll('button').forEach(x => { x.onclick = () => { d.close(); if (x.value === 'go') go({ action: 'lead-stop', project: a }, `Stopped the lead for ${a}`, 'Stopping…'); else b.focus(); }; });
      d.showModal();
    }
  });

  // Before the first overview: three skeleton blocks; if it doesn't come: the neutral notice (DESIGN Settings states).
  const here = () => location.hash.split('?')[0].split('/')[1] === 'settings';
  const frame = body => { const a = q().get('p') || ''; mounted = ''; $('view').innerHTML = `<div class="scr sets">${head(a)}<div class="hf-body">${body}</div></div>`; };
  const loading = () => frame(`<div class="s-grid" aria-busy="true" aria-label="Loading settings"><span></span><div class="f-form">${[120, 96, 140].map(h => `<span class="skeleton" style="display:block;height:${h}px"></span>`).join('')}</div></div>`);
  const error = () => { const a = q().get('p'); frame(loadError(a ? `Settings for ${a}` : 'Settings')); };

  return { show, here, loading, error };
})();

// =====================================================================================================
// Project page (D6: design/screens2/project.html; UX-6 A, UX-14 A, UX-3 A, UX-11 C). Now first: one sentence on what
// is going on and its one button, the phase track split into the outcomes, and the figures in one line; then what
// needs you here, the tasks in progress and the latest events. Money and facts sit beside it on the desk, under Now
// on the middle width and in one fold on the phone. Every count and money figure is the one summary's
// (counts().projects[alias]); the page's own read (/api/project/<alias>) brings the lists and documents.
// A refresh replaces only the parts whose words changed: open folds, typed text, focus and scroll stay (R7).
// =====================================================================================================
const STAGES = ['Planning', 'Building', 'Checking', 'Review', 'Done'];
// Mockups and evidence live on the dashboard's sibling port (their own origin), on whatever host this page uses.
const viewUrl = r => `${location.protocol}//${location.hostname}:${r.viewPort}${r.open}`;

// A time in the page's short form: 14:05 today, "Mon" this week, "18 Oct" before that.
const when = iso => {
  const t = Date.parse(iso); if (!t) return '';
  const d = new Date(t);
  if (d.toDateString() === new Date().toDateString()) return hhmm(t);
  return Date.now() - t < 6 * 864e5 ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const day = iso => { const t = Date.parse(iso); return t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''; };

// The project and task pages redraw in regions (data-r). A region whose words changed replaces the one on screen;
// folds the owner opened stay open, typed text and picked answers stay, and a region the owner is typing in, has a
// menu open in, or holds a sent answer (data-hold) waits for the next refresh.
function patchRegions(root, regions, parts, fill) {
  for (const [r, html] of regions) {
    if (parts.get(r) === html) continue;
    const old = root.querySelector(`[data-r="${r}"]`);
    if (!old) continue;
    if (old.contains(document.activeElement) && /^(TEXTAREA|INPUT|SELECT)$/.test(document.activeElement.tagName)) continue;
    if (old.querySelector('.p-pop:not([hidden]), [data-hold]')) continue;
    const tpl = document.createElement('template'); tpl.innerHTML = html;
    const el = tpl.content.firstElementChild;
    old.querySelectorAll('details[data-key]').forEach(d => { const n = el.querySelector(`details[data-key="${CSS.escape(d.dataset.key)}"]`); if (n) n.open = d.open; });
    old.querySelectorAll('textarea[id]').forEach(t => { const n = el.querySelector(`#${CSS.escape(t.id)}`); if (n && t.value !== t.defaultValue) n.value = t.value; });
    old.querySelectorAll('input[type="radio"]:checked').forEach(i => { const n = el.querySelector(`input[name="${CSS.escape(i.name)}"][value="${CSS.escape(i.value)}"]`); if (n) n.checked = true; });
    fill?.(el);
    old.replaceWith(el);
    parts.set(r, html);
  }
}

const Project = (() => {
  const seen = new Map(); // alias → the last read, so switching to the page paints at once
  let parts = new Map(), pageKey = '';
  const TABS = ['overview', 'messages', 'tasks', 'outcomes', 'audits', 'docs', 'activity', 'settings'];
  const href = (a, tab = 'overview', sub) => `#/p/${encodeURIComponent(a)}/${tab}${sub ? `/${sub}` : ''}`;
  const dot = (k, word) => Office.dotOf(k, word);
  // The status glyph is the Office's window at text size: lit while working, a tick when done (the words carry it).
  const win = k => `<span class="p-win" data-k="${k}" aria-hidden="true"><svg viewBox="0 0 12 16"><path d="M1 15V6a5 5 0 0 1 10 0v9z"/><path class="t" d="M3.4 9.6 5.3 11.5 8.8 7.6"/></svg></span>`;
  const moneyWords = S => `${money(S.spentToday)} of ${money(S.dayLimit)} today${S.atLimit ? ', at its limit' : S.dayLimit && S.spentToday >= 0.8 * S.dayLimit ? ', most of it used' : ''}`;
  const SHIP = { merge: 'Straight to main after review', pr: 'Draft pull requests you merge', branch: 'Local branches only' };
  // What the owner approves is the project's ownerGates, the list the server enforces (F-5): "You approve the brief and the design".
  const gating = p => { const g = (p.ownerGates || []).filter(x => PHASES.includes(x)).map(x => `the ${x}`); return g.length ? `You approve ${g.length > 1 ? `${g.slice(0, -1).join(', ')} and ${g.at(-1)}` : g[0]}` : 'The lead approves every phase'; };
  const SEVERITY = { high: 'important', medium: 'worth fixing', low: 'minor' };
  const FINDING_STATE = { open: 'waiting for you', confirmed: 'you asked for a fix · with the lead', 'sent-to-lead': 'small: the auditor sent it to the lead', fixed: 'the lead fixed it · the next audit checks', dismissed: 'you said it’s fine', withdrawn: 'withdrawn: nothing was built yet' };

  // ── Now (R13): what is going on, in a sentence, and the one thing to open ──
  function nowOf(p, S, own) {
    const a = p.alias, top = own[0];
    if (p.charter?.tampered) return ['Your charter changed after you approved it.', 'Read what changed, and approve it again if the change is yours.', ['Open the charter', href(a, 'docs', 'charter')]];
    if (top?.kind === 'budget') return [`Today’s ${money(S.dayLimit)} is used, so new work waits.`, 'The tries already running finish. Nothing new starts until midnight, unless you raise today’s limit.', ['Review the budget', `#/inbox/${encodeURIComponent(top.key)}`]];
    if (top && S.waiting) return [S.needsNow ? (S.needsNow === 1 ? 'Something here needs you now.' : `${S.needsNow} things here need you now.`) : S.waiting === 1 ? 'One decision waits for you.' : `${S.waiting} decisions wait for you.`,
      `First: ${Inbox.describe(top).title}. The team keeps going on anything that doesn’t depend on it.`, [S.waiting === 1 ? 'Open it in the Inbox' : 'Open the first in the Inbox', `#/inbox/${encodeURIComponent(top.key)}`]];
    if (!S.lead) return S.working ? ['The lead is off; the work already started carries on.', 'Nothing new starts until you start the lead again.', null]
      : ['The lead is off, so nothing new starts.', `Start it with the button above, then talk to “${a} lead” in the Claude app.`, null];
    if (!p.charter && p.phase === 'brief') return ['The lead is reading your description.', 'It drafts a charter next. You approve it in the Inbox; nothing else to do now.', null];
    const PH = { brief: 'The lead is shaping the brief.', spec: 'The spec is being written.', design: 'The design is being drawn.', contracts: 'The contracts are being drafted.' };
    if (PH[p.phase]) return [PH[p.phase], 'It comes to your Inbox for your OK when it is ready.', null];
    const queued = S.tasks?.queued || 0;
    const paced = S.paced ? `${S.paced} waiting for your plan window` : '';
    // "Building" only while a task of this project runs; a busy lead or auditor alone says what it is doing (F-19).
    if (S.tasks?.running) return ['The team is building.', `${S.working} working${paced ? `, ${paced}` : ''}${queued ? `, ${queued} queued` : ''}. Nothing needs you right now.`, null];
    if (S.working) {
      const ag = p.team?.agents || [], planning = ag.some(x => x.kind === 'lead' && x.state === 'working'), checking = ag.some(x => x.kind === 'auditor' && x.state === 'auditing');
      const t = planning && checking ? 'The lead is planning and the auditor is checking the work.' : planning ? 'The lead is planning.' : checking ? 'The auditor is checking the work.' : 'The team is at work.';
      const rest = [paced, queued && `${queued} queued`].filter(Boolean).join(', ');
      return [t, `${rest ? `${cap1(rest)}. ` : ''}Nothing needs you right now.`, null];
    }
    if (S.paced) return ['The team is waiting for your plan window.', `${S.paced === 1 ? 'Its task carries' : `${S.paced} tasks carry`} on by ${S.paced === 1 ? 'itself' : 'themselves'} when the window has room. Nothing needs you right now.`, null];
    if (queued) return ['Work is queued.', `${queued} task${queued === 1 ? '' : 's'} start${queued === 1 ? 's' : ''} as soon as a teammate is free.`, null];
    if (S.tasks?.paused) return ['Work is paused.', `${S.tasks.paused === 1 ? 'One task is' : `${S.tasks.paused} tasks are`} paused. The lead decides what happens next.`, null];
    if (p.tasks.length) return ['All current work is finished.', `Tell the lead what’s next: talk to “${a} lead” in the Claude app.`, null];
    return ['The lead is planning the build.', 'Task plans come to your Inbox for your OK.', null];
  }

  const phaseTrack = (p, S) => {
    const i = PHASES.indexOf(p.phase), o = S.outcomes || { met: 0, of: 0 };
    return `<ol class="p-phases" aria-label="Phase: ${cap1(p.phase)}${o.of ? `, ${o.met} of ${o.of} outcomes met` : ''}">${PHASES.map((n, j) => `<li class="${j < i ? 'past' : j === i ? 'now' : ''}"${j === i ? ' aria-current="step"' : ''}>
      <span class="bar">${j === i && o.of ? `<span class="pips">${Array.from({ length: o.of }, (_, m) => `<i${m < o.met ? ' class="met"' : ''}></i>`).join('')}</span>` : ''}</span><span class="n">${cap1(n)}</span></li>`).join('')}</ol>`;
  };
  const figs = S => `<p class="p-figs num">
      <span><b>${S.working}</b> working</span>
      ${S.paced ? `<span><b>${S.paced}</b> waiting for your plan window</span>` : ''}
      ${S.needsNow ? `<span class="is-needs"><b>${S.needsNow}</b> need${S.needsNow === 1 ? 's' : ''} you now</span>` : ''}
      <span><b>${S.waiting}</b> waiting on you</span>
      ${S.outcomes?.of ? `<span><b>${S.outcomes.met}</b> of ${S.outcomes.of} outcomes met</span>` : ''}
      <span${S.atLimit ? ' class="is-needs"' : ''}><b>${money(S.spentToday)}</b>${moneyWords(S).slice(money(S.spentToday).length)}</span></p>`;
  const now = (p, S, own) => {
    const [t, more, act] = nowOf(p, S, own);
    return `<section class="p-now" aria-labelledby="now-h" data-r="now"><h2 class="section-label" id="now-h">Now</h2>
      <p class="p-now-t">${esc(t)}</p><p class="lede">${esc(more)}</p>
      ${act ? `<div class="p-now-act"><a class="btn btn-primary" href="${esc(act[1])}">${esc(act[0])}${I('chevron-right')}</a></div>` : ''}
      ${phaseTrack(p, S)}${figs(S)}</section>`;
  };

  // ── Needs you here: the project's Inbox items, each opening the Inbox at that item ──
  const needs = (S, own) => !own.length ? '<div data-r="needs" hidden></div>' : `<section class="p-sec" aria-labelledby="needs-h" data-r="needs">
      <h2 class="p-h" id="needs-h">Needs you here <span class="n${S.needsNow ? ' is-needs' : ''}">${S.waiting}</span></h2>
      <div class="p-rows">${own.map(q => { const d = Inbox.describe(q), w = q.needs ? 'Needs you now' : 'Waiting';
        return `<a class="p-row" href="#/inbox/${encodeURIComponent(q.key)}" aria-label="${esc(`${d.title}. ${w}, ${d.kind}${q.at ? `, ${longAgo(q.at)}` : ''}`)}">${dot(q.needs ? 'needs' : '', w)}<span class="t"><b>${esc(d.title)}</b><span class="s">${esc(d.kind)}</span></span><span class="m num">${esc(longAgo(q.at))}</span></a>`; }).join('')}</div></section>`;

  // ── In progress: a card per task, the Office's window as its glyph and the five stages under it ──
  function taskView(p, t) {
    const x = p.team.agents.find(a => a.id === t.id) || {};
    const s = taskStatus(t), review = s === 'review' || x.kind === 'reviewer';
    const v = { id: t.id, title: t.title, k: '', who: cap1(review ? 'reviewer' : t.role || 'builder'), stage: 1, step: '', prog: '', ago: '' };
    if (s === 'queued') Object.assign(v, { who: 'Next', stage: 0, step: reasonWords(t) || 'Starts when a teammate is free' });
    else if (s === 'done') Object.assign(v, { k: 'done', stage: 4, step: reasonWords(t) || 'Finished' });
    else if (s === 'needs-you') v.step = 'It asked you something. Answer it on its page';
    else if (s === 'stalled') v.step = 'Stalled. The lead decides what happens next';
    else if (x.state === 'paced') Object.assign(v, { stage: review ? 3 : 1, step: pacedWords(x), paced: true });
    else if (review) Object.assign(v, { k: x.state === 'reviewing' ? 'active' : '', stage: 3, step: x.quietMin ? `Quiet for ${x.quietMin} min, longer than usual` : x.step || 'The reviewer is checking it' });
    else if (s === 'running') Object.assign(v, { k: 'active', step: x.quietMin ? `Quiet for ${x.quietMin} min, longer than usual` : x.step || 'Getting started' });
    else v.step = reasonWords(t) || STATUS_WORD[s] || s;
    v.ago = v.paced ? '' : x.lastAt ? longAgo(x.lastAt) : s === 'done' ? longAgo(t.updated) : '';
    // The runner's heartbeat touches a paced task's card every minute: its time is when it last did something.
    v.at = v.paced && x.lastAt ? x.lastAt : t.updated;
    v.word = v.k === 'active' ? 'Working' : v.k === 'done' ? 'Done' : s === 'needs-you' ? 'Needs you' : v.paced ? 'Waiting' : v.who === 'Next' ? 'Next' : STATUS_WORD[s] || 'Waiting';
    return v;
  }
  const stageTrack = st => `<span class="p-stages" role="img" aria-label="Stage: ${STAGES[st]}">${STAGES.map((n, i) => `<i class="${i < st ? 'past' : i === st ? 'now' : ''}"></i>`).join('')}</span>`;
  const card = v => `<a class="p-task" href="#/t/${encodeURIComponent(v.id)}" data-id="${esc(v.id)}" data-k="${v.k}" aria-label="${esc(`${v.title}. ${v.word}. ${v.step}. ${[v.who !== 'Next' && `${v.who}, ${STAGES[v.stage]}`, v.prog, v.ago].filter(Boolean).join(', ')}`)}">
      ${win(v.k)}<span class="p-task-b"><span class="p-task-t">${esc(v.title)}</span><span class="p-task-s">${esc(v.step)}</span>
      <span class="p-task-m">${stageTrack(v.stage)}<span class="w">${esc(v.who === 'Next' ? 'Next' : `${v.who} · ${STAGES[v.stage]}`)}</span><span class="num">${esc([v.prog, v.ago].filter(Boolean).join(' · '))}</span></span></span></a>`;
  const work = (p, S) => {
    const live = p.tasks.filter(t => ['running', 'needs-you', 'review', 'stalled', 'paused'].includes(t.status));
    const next = p.tasks.filter(t => t.status === 'queued').slice(0, 3);
    const list = [...live, ...next].map(t => taskView(p, t));
    // The count is the summary's open tasks (the Tasks tab shows the same); more than three queued are left to that tab.
    const more = S.tasksOpen > list.length;
    return `<section class="p-sec" aria-labelledby="work-h" data-r="work"><h2 class="p-h" id="work-h">In progress${S.tasksOpen ? ` <span class="n">${S.tasksOpen}</span>` : ''}</h2>
      ${list.length ? `<div class="p-tasks">${list.map(card).join('')}</div>${more ? `<a class="link p-more" href="${href(p.alias, 'tasks')}">All ${S.tasksOpen} open tasks</a>` : ''}`
        : `<p class="p-quiet">${S.lead ? `Nothing is being built ${p.tasks.length ? 'right now. New tasks appear here once the lead plans them.' : 'yet. Tasks appear here once the lead plans them.'}` : 'Nothing running. The lead is off, so nothing new starts.'}</p>`}</section>`;
  };

  // ── Recent: the newest few events, in words ──
  const GOOD = e => /^(done|approved|criterion-accept|finding-confirmed|finding-fixed)$/.test(e.type) || / pass|approve/.test(e.msg || '');
  // A failed push reads as a plain sentence; git's own error waits under Details (F-6).
  const eventWords = (p, e) => { if (e.type === 'push-failed') return 'Couldn’t reach GitHub, will retry'; const t = p.tasks.find(x => x.id === e.id); const w = EVENT_WORD[e.type] || cap1(e.type.replace(/-/g, ' ')); return t ? `${w}: ${t.title}` : `${w}${e.msg ? `: ${e.msg}` : ''}`; };
  const rawOf = e => e.type === 'push-failed' && e.msg ? `<details class="details p-raw"><summary>Details${I('chevron-down')}</summary><div class="details-body"><code>${esc(e.msg)}</code></div></details>` : '';
  const feed = (p, list) => `<ol class="p-feed">${list.map(e => `<li${GOOD(e) ? ' data-k="done"' : ''}><time class="num" datetime="${esc(e.ts)}">${esc(when(e.ts))}</time><span>${esc(eventWords(p, e))}${rawOf(e)}</span></li>`).join('')}</ol>`;
  const recent = p => `<section class="p-sec" aria-labelledby="rec-h" data-r="recent"><h2 class="p-h" id="rec-h">Recent</h2>
      ${p.events.length ? feed(p, p.events.slice(0, 4)) : '<p class="p-quiet">Nothing has happened here yet.</p>'}
      <a class="link p-more" href="#/activity?p=${encodeURIComponent(p.alias)}">All activity for ${esc(p.alias)}</a></section>`;

  // ── Facts (R14): money, the plan, the team, how it runs ──
  function facts(p, S, C) {
    const a = esc(p.alias), plan = C.plan?.fiveHour, week = C.plan?.sevenDay, pw = planWords(C.plan, state.pace), sp = S.split || {};
    const planMeter = (label, w, foot) => `<div class="meter"><div class="meter-head"><span>${label}</span><b class="num">${w ? `${w.used}%` : '–'} <small>used</small></b></div><div class="meter-track${w && w.used >= 100 ? ' is-full' : ''}" role="img" aria-label="${w ? `${label}: ${w.used}% used` : `${label}: not known yet`}"><i style="--value:${w ? Math.min(100, w.used) : 0}%"></i></div>
            <span class="meter-foot">${esc(foot)}</span></div>`;
    const pct = S.dayLimit ? Math.min(100, Math.round(S.spentToday / S.dayLimit * 100)) : 0;
    const gh = p.autonomy === 'branch' || !p.github ? '' : p.github.problem ? `<span class="is-needs">Not on GitHub</span>: ${esc(p.github.problem)}` : 'On GitHub';
    const team = Office.desks(p);
    return `<aside class="p-facts" aria-label="Money and facts" data-r="facts"><details class="p-factsfold" data-key="facts" open>
      <summary><span>Money and facts</span><span class="num${S.atLimit ? ' is-needs' : ''}">${money(S.spentToday)} of ${money(S.dayLimit)} today</span>${I('chevron-down')}</summary>
      <div class="p-facts-in">
        <section class="p-fact" aria-labelledby="f-money"><h3 class="section-label" id="f-money">Spent on ${a}</h3>
          <div class="meter"><div class="meter-head"><span>Today</span><b class="num">${money(S.spentToday)} <small>of ${money(S.dayLimit)}</small></b></div>
            <div class="meter-track${S.atLimit ? ' is-full' : ''}" role="img" aria-label="${esc(moneyWords(S))}"><i style="--value:${pct}%"></i></div>
            <span class="meter-foot${S.atLimit ? ' is-needs' : ''}">${S.atLimit ? 'At its limit: new work waits until midnight' : S.dayLimit && S.spentToday >= 0.8 * S.dayLimit ? 'Most of it used · resets at midnight' : 'Daily limit · resets at midnight'}</span></div>
          <div class="meter-head p-total"><span>So far</span><b class="num">${money(S.spentTotal)}</b></div>
          <details class="details p-split" data-key="split"><summary>Where it went${I('chevron-down')}</summary><div class="details-body">
            <dl class="p-dl num"><dt>Tasks</dt><dd>${money(sp.tasks)}</dd><dt>Lead</dt><dd>${money(sp.lead)}</dd><dt>Audits</dt><dd>${money(sp.audits)}</dd></dl>
            <span>API-equivalent cost, not a bill.</span></div></details></section>
        <section class="p-fact" aria-labelledby="f-plan"><h3 class="section-label" id="f-plan">Your Claude plan</h3>
          ${planMeter('5‑hour window', plan, pw.five ? `${pw.five.rest} Shared by every project.` : 'Shows after the first run')}
          ${planMeter('This week', week, pw.week ? pw.week.rest : 'Shows after the first run')}</section>
        <section class="p-fact" aria-labelledby="f-team"><h3 class="section-label" id="f-team">Team</h3>
          <ul class="p-team">${team.map(d => `<li>${dot(d.k === 'off' ? '' : d.k, d.word)}<b>${esc(d.role)}</b><span class="w${d.k && d.k !== 'off' ? ` is-${d.k}` : ''}">${esc(d.word)}</span></li>`).join('')}</ul>
          <a class="link p-more" href="#/office">Open the Office</a></section>
        <section class="p-fact" aria-labelledby="f-how"><h3 class="section-label" id="f-how">How it runs</h3>
          <dl class="p-dl is-stack"><dt>Shipping</dt><dd>${SHIP[p.autonomy] || esc(p.autonomy)}</dd><dt>Gating</dt><dd>${esc(gating(p))}</dd>
            <dt>In the Claude app</dt><dd>${S.lead ? `“${a} lead”` : 'Not running: start the lead'}</dd>${gh ? `<dt>GitHub</dt><dd>${gh}</dd>` : ''}</dl>
          <a class="link p-more" href="#/settings?p=${encodeURIComponent(p.alias)}">Change in Settings</a></section>
      </div></details></aside>`;
  }

  // ── Tasks: grouped by status in today's order; an empty group is left out and the line under the heading says so ──
  // A task held for the plan window has its own group (the summary counts it as paced), so Working counts only work.
  const groupOf = (p, t) => p.team.agents.some(x => x.id === t.id && x.state === 'paced') ? 'paced' : taskStatus(t);
  const GROUP = [['needs-you', 'Needs you', 'needs'], ['running', 'Working', 'active'], ['paced', 'Waiting for your plan window', ''], ['review', 'In review', 'active'], ['queued', 'Queued', ''], ['planned', 'Waiting for your OK', ''], ['requested', 'Requests', ''], ['stalled', 'Stalled', ''], ['paused', 'Paused', ''], ['done', 'Done', 'done'], ['failed', 'Failed', ''], ['cancelled', 'Cancelled', '']];
  function tasksTab(p, S) {
    if (!p.tasks.length) return empty('Tasks', 'No tasks yet', 'The lead plans tasks after you approve the spec. They appear here, grouped by status.');
    const by = S.tasks || {};
    const groups = GROUP.filter(([s]) => by[s]).map(([s, label, k]) => {
      const rows = p.tasks.filter(t => groupOf(p, t) === s).map(t => {
        const v = taskView(p, t);
        // A paced task stays in its status group (the summary counts it there) but reads as waiting: no ETA, not lit.
        const sub = v.paced ? `${v.who} · ${v.step}${v.prog ? ` · ${v.prog}` : ''}` : s === 'running' ? `${v.who} · ${STAGES[v.stage]}${v.prog ? ` · ${v.prog}` : ''}` : `${cap1(t.role || 'builder')}${reasonWords(t) ? ` · ${reasonWords(t)}` : ''}`;
        const eta = s === 'running' && t.eta && !v.paced ? `about ${t.eta.low}–${t.eta.high} min left` : '';
        return `<a class="p-row p-trow" href="#/t/${encodeURIComponent(t.id)}" aria-label="${esc(`${t.title}. ${v.paced ? v.word : label}. ${sub}${eta ? `, ${eta}` : ''}, ${longAgo(v.at)}`)}">${dot(v.paced ? '' : k, v.paced ? v.word : label)}<span class="t"><b>${esc(t.title)}</b><span class="s">${esc(sub)}${eta ? ` · <span class="p-eta">${eta}</span>` : ''}</span></span><span class="m num">${esc(when(v.at))}</span></a>`;
      }).join('');
      return `<section class="p-sec"><h3 class="p-h3">${label} <span class="n">${by[s]}</span></h3><div class="p-rows">${rows}</div></section>`;
    }).join('');
    return `<section class="p-sec"><h2 class="p-h">Tasks <span class="n">${S.tasksOpen} open of ${p.tasks.length}</span></h2>
      <p class="p-quiet">Grouped by status; empty groups are hidden.</p></section>${groups}`;
  }

  // ── Outcomes (UX-14 A): the owner's outcomes with a ring each; the team's checks folded under them ──
  function outcomesTab(p, S) {
    const live = p.criteria.filter(c => !['draft', 'retired', 'rejected'].includes(c.status));
    const mine = live.filter(c => (c.level || (c.kind === 'owner' ? 'owner' : 'team')) === 'owner');
    const checks = live.filter(c => !mine.includes(c));
    if (!mine.length && !checks.length) return empty('Outcomes', 'No outcomes yet', 'The lead drafts them with the spec. You approve each one in the Inbox.');
    const met = c => c.status === 'pass' || c.status === 'accepted';
    const last = c => (c.history || []).at(-1) || {};
    const building = c => p.tasks.find(t => ['running', 'review', 'needs-you', 'queued'].includes(t.status) && String(t.criteria || '').toUpperCase().split(/[\s,;]+/).includes(c.id));
    const words = c => {
      if (met(c)) return `Met ${when(last(c).at)}${c.status === 'accepted' ? ' · you accepted it' : ' · its check passed'}`;
      if (c.status === 'awaiting-owner') return 'Waiting for your judgement in the Inbox';
      const t = building(c);
      if (t) return `${t.status === 'queued' ? 'Next' : 'Being built'}: ${t.title}`;
      return c.status === 'fail' ? 'Not yet: its check is failing' : 'Not started';
    };
    const ring = (c, yes, no) => met(c) ? `<span class="p-ok" role="img" aria-label="${yes}">${I('check')}</span>` : `<span class="p-ok" role="img" aria-label="${no}"></span>`;
    const row = (c, yes, no) => `<li data-met="${met(c)}">${ring(c, yes, no)}<span class="t"><b>${esc(c.statement)}</b><span class="s">${esc(c.id)} · ${esc(words(c))}</span></span></li>`;
    const order = list => [...list.filter(c => c.status === 'fail'), ...list.filter(c => !met(c) && c.status !== 'fail'), ...list.filter(met)];
    return `<section class="p-sec"><h2 class="p-h">Outcomes <span class="n">${S.outcomes.met} of ${S.outcomes.of} met</span></h2>
      <p class="p-quiet">What the project must do to be finished, in the charter’s words.</p>
      ${mine.length ? `<ul class="p-outs">${mine.map(c => row(c, 'Met', 'Not met yet')).join('')}</ul>` : '<p class="p-quiet">No outcomes of yours yet. The lead drafts them with the spec.</p>'}
      ${checks.length ? `<details class="details p-doc" data-key="checks"><summary><span class="t"><b>Team checks</b><span class="s num">${S.checks.passing} of ${S.checks.of} passing · the tests behind the outcomes</span></span>${I('chevron-down')}</summary><div class="details-body">
        <ul class="p-outs">${order(checks).map(c => row(c, 'Passing', 'Not passing')).join('')}</ul></div></details>` : ''}</section>`;
  }

  // ── Audits: the running audit, when the next one starts, the findings by who has them, past audits ──
  // ── Messages: everything between the owner and the lead (lib/asks.mjs), newest first, with a box to write to it ──
  const ASK_STATE = { open: 'Waiting for you', unread: 'New', answered: 'Answered', seen: 'Read', withdrawn: 'Withdrawn by the lead', 'for-lead': 'Waiting for the lead', replied: 'The lead replied' };
  function messagesTab(p) {
    const a = esc(p.alias), list = p.asks || [];
    const verdictWord = { approve: 'Approved', decline: 'Not yet', seen: 'Read' };
    const line = t => `<div class="m-line is-${t.from === 'owner' ? 'you' : 'lead'}"><span class="p-lbl">${t.from === 'owner' ? 'You' : t.from === 'atelier' ? 'Atelier' : 'The lead'}${t.verdict && verdictWord[t.verdict] ? ` · ${verdictWord[t.verdict]}` : ''} · ${esc(when(t.at))}</span>${t.text ? md(t.text) : ''}</div>`;
    const fold = m => {
      const waiting = m.status === 'open' || m.status === 'unread';
      return `<details class="details p-doc m-thread" data-key="m-${esc(m.id)}"${waiting || m.status === 'for-lead' ? ' open' : ''}><summary><span class="t"><b>${esc(m.title)}</b><span class="s${waiting ? ' is-needs' : ''}">${esc([m.from === 'owner' ? 'You wrote' : ASK_KIND[m.kind] || 'Message', ASK_STATE[m.status] || m.status, when(m.at)].join(' · '))}</span></span>${I('chevron-down')}</summary>
      <div class="details-body">
        ${m.from === 'owner' ? line({ from: 'owner', at: m.at, text: m.body }) : `${m.body ? md(m.body) : ''}${askMedia(m, { hero: false })}${m.options?.length ? `<p class="p-quiet">Options: ${m.options.map(esc).join(' · ')}${m.recommend ? ` (the lead suggested ${esc(m.recommend)})` : ''}</p>` : ''}${askRun(m)}`}
        ${(m.thread || []).map(line).join('')}
        ${waiting ? `<p class="p-quiet"><a class="link" href="#/inbox/${encodeURIComponent(`ask:${p.alias}:${m.id}`)}">Answer it in the Inbox</a></p>` : m.status === 'withdrawn' ? '' : `<form class="m-reply" data-pa-form="lead-note" data-re="${esc(m.id)}"><div class="field"><label class="sr-only" for="mr-${esc(m.id)}">Reply to the lead</label><textarea class="input" id="mr-${esc(m.id)}" rows="1" placeholder="Reply to the lead"></textarea></div><button class="btn btn-secondary" type="submit">Reply</button></form>`}
      </div></details>`;
    };
    const compose = `<section class="p-sec"><h2 class="p-h">Messages</h2>
      <p class="p-quiet">The lead brings you approvals, questions, requests for feedback and updates here, with pictures attached, instead of in the chat. Anything waiting for you is also in your Inbox. Write to the lead here; it’s woken straight away.</p>
      <form class="m-new" data-pa-form="lead-note"><div class="field"><label class="field-label" for="m-new">Write to the ${a} lead</label><textarea class="input" id="m-new" rows="3" placeholder="An instruction, a correction, or a question"></textarea></div>
        <div class="p-act"><button class="btn btn-primary" type="submit">Send to the lead</button>${p.lead?.running ? '' : '<span class="p-quiet">The lead is off; it reads this when it starts.</span>'}</div></form></section>`;
    if (!list.length) return compose + '<p class="p-empty"><b>Nothing yet</b><span>When the lead needs you, or has something to show you, it appears here and in your Inbox.</span></p>';
    const waiting = list.filter(m => ['open', 'unread', 'for-lead'].includes(m.status)), rest = list.filter(m => !waiting.includes(m));
    return compose + (waiting.length ? `<section class="p-sec"><h3 class="p-h3">Open <span class="n">${waiting.length}</span></h3><div class="p-docs">${waiting.map(fold).join('')}</div></section>` : '')
      + (rest.length ? `<section class="p-sec"><h3 class="p-h3">Earlier</h3><div class="p-docs">${rest.map(fold).join('')}</div></section>` : '');
  }

  function auditsTab(p, S) {
    const a = esc(p.alias);
    const run = p.team.agents.find(x => x.kind === 'auditor')?.audit;
    const panel = run ? `<div class="p-audit" role="status" aria-label="Audit running">${win('active')}
        <span class="t"><b>Audit running · ${run.startedMin ? `${run.startedMin} min` : 'just started'}</b><span class="s">${esc(cap1(run.stage || 'getting ready'))}${run.quietMin ? ` · quiet for ${run.quietMin} min, longer than usual` : ''}</span></span>
        ${run.checkers ? `<span class="p-stages" role="img" aria-label="${run.finished} of ${run.checkers} checkers done">${Array.from({ length: run.checkers }, (_, i) => `<i class="${i < run.finished ? 'past' : i === run.finished ? 'now' : ''}"></i>`).join('')}</span>` : ''}</div>` : '';
    const lastLine = `${p.lastAudit ? `Last audit ${when(p.lastAudit.at)}, on what was built by then.` : 'No audit has run yet.'} ${p.auditMode === 'auto' ? 'Audits start on their own once 3 tasks have finished since the last one (or a day after work lands), or when you run one.' : 'Audits run when you or the lead start one: the lead runs one at the end of each milestone.'}`;
    const by = (...s) => [...p.findings].reverse().filter(f => s.includes(f.status));
    const fold = f => `<details class="details p-doc p-find" data-key="f-${esc(f.id)}"><summary><span class="t"><b>${esc(f.headline || f.claim)}</b><span class="s">${esc([cap1(SEVERITY[f.severity] || f.severity || ''), f.reversibility === 'hard' ? 'costly to change later' : '', FINDING_STATE[f.status] || f.status].filter(Boolean).join(' · '))}</span></span>${I('chevron-down')}</summary>
      <div class="details-body">
        ${f.impact ? `<div><span class="p-lbl">If nobody fixes it</span>${md(f.impact)}</div>` : ''}
        ${f.ownerNote ? `<div><span class="p-lbl">Your call</span><p>“${esc(f.ownerNote)}”</p></div>` : ''}
        <details class="details p-tech" data-key="ft-${esc(f.id)}"><summary>${I('chevron-down')}Technical details</summary><div class="details-body">${md(`**What you asked for:** ${f.expected || ''}\n\n**What the auditor found:** ${f.observed || ''}\n\n**Evidence:** ${f.evidence || ''}`)}</div></details>
        ${f.status === 'open' ? `<div class="field"><label class="field-label" for="fn-${esc(f.id)}">Note <span class="faint">(optional)</span></label><textarea class="input" id="fn-${esc(f.id)}" rows="2" placeholder="Why, in a few words"></textarea></div>
          <div class="p-act"><button class="btn btn-primary" type="button" data-pa="finding" data-verdict="confirm" data-id="${esc(f.id)}">Yes, fix it</button><button class="btn btn-secondary" type="button" data-pa="finding" data-verdict="dismiss" data-id="${esc(f.id)}">No, it’s fine</button></div>` : ''}
      </div></details>`;
    const group = (title, list) => list.length ? `<section class="p-sec"><h3 class="p-h3">${title} <span class="n">${list.length}</span></h3><div class="p-docs">${list.map(fold).join('')}</div></section>` : '';
    const past = p.events.filter(e => e.type === 'audit');
    const head = `<section class="p-sec"><h2 class="p-h">Audits</h2>${panel}<p class="p-quiet">${esc(lastLine)}</p>
      <div class="p-act"><button class="btn btn-secondary" type="button" data-pa="audit"${run ? ' disabled' : ''}>${I('finding')}Run an audit now…</button></div></section>`;
    if (!p.findings.length && !run && !p.lastAudit) return head + `<p class="p-empty"><b>Nothing from the auditor yet</b><span>Audits start once there is something built to check. What they find that only you can decide comes to your Inbox.</span></p>`;
    return head + group('Your call', by('open')) + group('Being fixed', by('confirmed', 'sent-to-lead')) + group('Settled', by('fixed', 'dismissed', 'withdrawn'))
      + (past.length ? `<section class="p-sec"><h3 class="p-h3">Past audits</h3>${feed(p, past.slice(0, 6))}</section>` : '')
      + '<p class="p-quiet">The auditor is your check on the whole team, the lead included: it judges what’s built against your own words and reports only to you. The reviewer is different: it checks each task before it ships.</p>';
  }

  // ── Docs: one list of folds; #/p/<alias>/docs/<key> opens one. Long documents render only when opened. ──
  const gateLine = (p, ph) => {
    const g = p.gates?.[ph];
    if (!g) return 'Not written yet';
    if (g.status === 'approved') return `Approved by ${/^delegated to the lead/i.test(g.quote || '') ? 'the lead' : 'you'} ${day(g.at)}`;
    if (g.status === 'requested') return 'Waiting for your OK in the Inbox';
    if (g.status === 'skipped') return `Skipped ${day(g.at)}`;
    return cap1(g.status);
  };
  const lazy = new Map(); // fold key → body html, made when the fold opens
  function docsTab(p, sub) {
    const a = esc(p.alias);
    const doc = (key, t, s, body, { red = false, big = false } = {}) => {
      if (big) lazy.set(`doc-${key}`, body);
      const open = sub === key;
      return `<details class="details p-doc" data-doc="${key}" data-key="doc-${key}"${open ? ' open' : ''}><summary><span class="t"><b>${t}</b><span class="s${red ? ' is-needs' : ''}">${s}</span></span>${I('chevron-down')}</summary><div class="details-body"${big ? ' data-lazy' : ''}>${big && !open ? '' : typeof body === 'function' ? body() : body}</div></details>`;
    };
    const ch = p.charter;
    // A blank charter with the lead's draft waiting (the Inbox's charter item, F-2): the editor starts from the draft, unsaved.
    const draft = !ch ? (state?.queue || []).find(q => q.kind === 'charter' && q.project === p.alias && q.draft)?.draft : '';
    const charter = `<form class="p-charter" data-pa-form="charter-save">
        <div class="field"><label class="field-label" for="ch-text">The charter, in your words</label>
          <textarea class="input p-chtext" id="ch-text" rows="9" aria-describedby="ch-h"${draft ? ' data-draft' : ''}>${esc(draft || p.docs.charter)}</textarea>
          <span class="field-help" id="ch-h">${draft ? 'This is the lead’s draft, not saved yet. Change anything that isn’t in your words, then save it or approve it below.' : 'The team works from this. A change after you approved it asks you to approve again.'}</span></div>
        <div class="p-act"><button class="btn btn-secondary" type="submit" data-ch-save${draft ? '' : ' disabled'}>${draft ? 'Save the draft' : 'Save changes'}</button></div></form>
      ${ch && !ch.tampered ? `<div class="p-approved"><span class="p-lbl">You approved it ${day(ch.approvedAt)}</span>${ch.quote ? `<p>“${esc(ch.quote)}”</p>` : ''}</div>` : ''}
      ${!ch || ch.tampered ? `<form class="p-chapprove" data-pa-form="charter-approve">
        <div class="field"><label class="field-label" for="ch-q">Approve in your own words</label><textarea class="input" id="ch-q" rows="2" placeholder="Say in a few words what you approve" aria-describedby="ch-qe"></textarea><span class="field-error" id="ch-qe" hidden>${I('alert')}Say in a few words what you approve, so the team knows what you read.</span></div>
        <div class="p-act"><button class="btn btn-primary" type="submit">Approve the charter</button></div></form>` : ''}`;
    const rulings = `${p.rulings?.length ? `<ol class="p-rulings">${p.rulings.map(r => `<li><b class="num">${esc(r.n)}</b><span class="t"><span>${esc(r.text)}</span>${r.note ? `<span class="s">${esc(r.note)}</span>` : ''}</span></li>`).join('')}</ol>` : '<p class="p-quiet">No rulings yet.</p>'}
      <form class="p-ruling" data-pa-form="ruling">
        <div class="field"><label class="field-label" for="r-new">Add a ruling</label><textarea class="input" id="r-new" rows="2" placeholder="For example: no modal dialogs, edit in place" aria-describedby="r-h"></textarea><span class="field-help" id="r-h">Every agent on ${a} follows it from their next step.</span></div>
        <div class="p-act"><button class="btn btn-secondary" type="submit" data-r-add disabled>Add the ruling</button></div></form>`;
    const review = ph => () => {
      const r = p.reviews?.[ph];
      if (!r || (!r.doc && !r.open)) return `<p class="p-quiet">No ${ph} yet.</p>`;
      return `<p class="p-meta">${r.merged ? 'Merged into the project' : 'The latest version, not merged yet'}, ${r.files} file${r.files === 1 ? '' : 's'}${r.open ? ` · <a class="link" href="${esc(viewUrl(r))}" target="_blank" rel="noopener">${ph === 'design' ? 'Open the clickable screens' : 'Open it'}${I('external')}</a>` : ''}</p>${md(r.doc || '')}`;
    };
    const rv = ph => { const r = p.reviews?.[ph]; return r && (r.doc || r.open) ? `${gateLine(p, ph)} · ${r.merged ? 'merged' : 'not merged yet'} · ${r.files} file${r.files === 1 ? '' : 's'}` : gateLine(p, ph); };
    const msgs = () => p.messages.length ? `<p class="p-quiet">Specialists message each other directly. Nothing here binds anyone; decisions go through the lead.</p><ol class="p-msgs">${p.messages.map(m => `<li><span class="p-msg-h"><b>${esc(cap1(m.fromRole || m.from))}</b> to <b>${esc(cap1(m.to))}</b> · ${esc(m.type)}<time class="num" datetime="${esc(m.at)}">${esc(when(m.at))}</time></span><span>${esc(m.text)}</span></li>`).join('')}</ol>` : '<p class="p-quiet">No messages yet.</p>';
    const text = (k, none) => () => p.docs[k]?.trim() ? md(p.docs[k]) : `<p class="p-quiet">${none}</p>`;
    lazy.clear();
    return `<section class="p-sec"><h2 class="p-h">Documents</h2><div class="p-docs">
      ${doc('charter', 'Charter', ch ? ch.tampered ? 'Changed after you approved it · approve it again' : `Approved by you ${day(ch.approvedAt)} · unchanged since` : p.docs.charter?.trim() ? 'Not approved yet' : 'Not written yet', charter, { red: !!ch?.tampered })}
      ${doc('rulings', `Rulings${p.rulings?.length ? ` <span class="n num">${p.rulings.length}</span>` : ''}`, 'Your decisions the team follows, newest last', rulings)}
      ${doc('brief', 'Brief', gateLine(p, 'brief'), text('brief', 'No brief yet.'), { big: true })}
      ${doc('spec', 'Spec', gateLine(p, 'spec'), text('spec', 'No spec yet.'), { big: true })}
      ${doc('design', 'Design', rv('design'), review('design'), { big: true })}
      ${doc('contracts', 'Contracts', rv('contracts'), review('contracts'), { big: true })}
      ${doc('plan', 'Lead’s plan', 'What the lead plans next', text('plan', 'No plan yet.'), { big: true })}
      ${doc('ledger', 'Lead’s ledger', 'What the lead decided without you', text('ledger', 'Nothing yet.'), { big: true })}
      ${doc('messages', 'Team messages', p.messages.length ? `${p.messages.length === 100 ? 'The latest 100' : p.messages.length} message${p.messages.length === 1 ? '' : 's'}` : 'None yet', msgs, { big: true })}
    </div></section>`;
  }

  const empty = (h, t, m) => `<section class="p-sec"><h2 class="p-h">${h}</h2><p class="p-empty"><b>${t}</b><span>${m}</span></p></section>`;

  // ── Head and tabs ──
  const head = (p, S) => {
    const a = esc(p.alias);
    const gh = p.github?.problem && p.autonomy !== 'branch' ? `<span class="p-gh" title="${esc(p.github.problem)}">${I('blocked')}Not on GitHub</span>` : '';
    const lead = S.lead
      ? `<span class="p-lead">${dot('active', 'Lead on')}<span>Lead on</span></span>
         <div class="p-menu"><button class="btn btn-secondary" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="lead-menu" data-pa="menu">Lead${I('chevron-down')}</button>
           <div class="p-pop" id="lead-menu" hidden><button type="button" data-pa="restart">${I('refresh')}<span>Restart the lead<small>It picks up where it left off</small></span></button><button type="button" data-pa="stop">${I('x')}<span>Stop the lead…<small>Running tasks finish first</small></span></button></div></div>`
      : `<span class="p-lead is-off">${dot('', 'Lead off')}<span>Lead off</span></span><button class="btn btn-secondary" type="button" data-pa="start">${I('play')}Start the lead</button>`;
    return `<header class="hf-head" data-r="head"><a class="back" href="#/projects">${I('chevron-left')}<span>Projects</span></a><h1>${a}</h1>${gh}${lead}<span class="end">${liveLine()}</span></header>`;
  };
  const tabs = (a, tab, S) => `<nav class="tabs p-tabs" aria-label="${esc(a)}" data-r="tabs">${[
    ['overview', 'Overview'], ['messages', 'Messages', S?.asksOpen || ''], ['tasks', 'Tasks', S?.tasksOpen || ''], ['outcomes', 'Outcomes', S?.outcomes?.of ? `${S.outcomes.met}/${S.outcomes.of}` : ''], ['audits', 'Audits', S?.findingsOpen || ''], ['docs', 'Docs'], ['activity', 'Activity'], ['settings', 'Settings'],
  ].map(([k, t, c]) => `<a class="tab" href="${k === 'activity' || k === 'settings' ? `#/${k}?p=${encodeURIComponent(a)}` : href(a, k)}"${tab === k ? ' aria-current="page"' : ''}>${t}${c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}</nav>`;

  // ── Mounting and patching ──
  const dialogs = a => `<dialog class="p-dialog" id="p-stop" aria-labelledby="pstop-t" aria-describedby="pstop-d"><h2 id="pstop-t">Stop the lead for ${esc(a)}?</h2>
      <p id="pstop-d">Nothing new starts until you start it again. Running tasks finish the try they are on.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Keep it running</button><button class="btn btn-danger" type="button" value="go">Stop the lead</button></div></dialog>
    <dialog class="p-dialog" id="p-audit" aria-labelledby="paud-t" aria-describedby="paud-d"><h2 id="paud-t">Run an audit of ${esc(a)} now?</h2>
      <p id="paud-d">Independent checkers look over what’s built so far, against your charter, outcomes and spec. It costs from today’s spend. Anything only you can decide comes to your Inbox.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Not now</button><button class="btn btn-primary" type="button" value="go">Run the audit</button></div></dialog>`;

  const patch = (root, regions) => patchRegions(root, regions, parts, fillLazy);
  const fillLazy = root => root.querySelectorAll('details[open] > [data-lazy]').forEach(b => { if (!b.childElementCount) b.innerHTML = lazy.get(b.parentElement.dataset.key)?.() || ''; });

  function draw(p, tab, sub) {
    const C = counts(), a = p.alias;
    const S = C.projects[a] || { waiting: 0, needsNow: 0, working: 0, spentToday: 0, dayLimit: 0, spentTotal: 0, tasks: {}, outcomes: { met: 0, of: 0 }, checks: { passing: 0, of: 0 } };
    const own = state.queue.filter(q => q.project === a && !Inbox.isHidden(q.key));
    const regions = [['head', head(p, S)], ['tabs', tabs(a, tab, S)]];
    let body;
    if (tab === 'overview') {
      const r = [['now', now(p, S, own)], ['facts', facts(p, S, C)], ['needs', needs(S, own)], ['work', work(p, S)], ['recent', recent(p)]];
      regions.push(...r);
      body = `<div class="p-grid${failedAt ? ' is-stale' : ''}">${r[0][1]}${r[1][1]}<div class="p-col">${r[2][1]}${r[3][1]}${r[4][1]}</div></div>`;
    } else {
      const html = tab === 'messages' ? messagesTab(p) : tab === 'tasks' ? tasksTab(p, S) : tab === 'outcomes' ? outcomesTab(p, S) : tab === 'audits' ? auditsTab(p, S) : docsTab(p, sub);
      const one = `<div class="p-col p-list" data-r="list">${html}</div>`;
      regions.push(['list', one]);
      body = one;
    }
    const key = `${a}/${tab}/${tab === 'docs' ? sub || '' : ''}`;
    const view = $('view');
    const root = view.querySelector(':scope > .project');
    if (root && root.dataset.key === key) return patch(root, regions);
    view.innerHTML = `<div class="project" data-key="${esc(key)}">${regions[0][1]}${regions[1][1]}<div class="hf-body">${body}</div>${dialogs(a)}</div>`;
    parts = new Map(regions); pageKey = key;
    const f = view.querySelector('details[data-key="facts"]');
    if (f && isPhone()) f.open = false;
    fillLazy(view);
    if (sub && tab === 'docs') view.querySelector(`details[data-doc="${CSS.escape(sub)}"]`)?.scrollIntoView({ block: 'start' });
  }

  // Before the first read: Now, facts and two sections as skeletons, counts hidden (States).
  function loading(a, tab) {
    const sk = (w, h) => `<span class="skeleton" style="width:${w};height:${h}px"></span>`;
    $('view').innerHTML = `<div class="project" data-key=""><header class="hf-head"><a class="back" href="#/projects">${I('chevron-left')}<span>Projects</span></a><h1>${esc(a)}</h1><span class="end">${liveLine()}</span></header>${tabs(a, tab, null)}
      <div class="hf-body"><div class="p-grid" aria-busy="true" aria-label="Loading ${esc(a)}">
        <section class="p-now">${sk('48px', 12)}${sk('70%', 28)}${sk('90%', 16)}${sk('100%', 28)}</section>
        <aside class="p-facts"><div class="p-facts-in p-skel">${sk('100%', 120)}${sk('100%', 72)}</div></aside>
        <div class="p-col">${[3, 2].map(n => `<section class="p-sec">${sk('120px', 16)}${Array.from({ length: n }, () => sk('100%', 44)).join('')}</section>`).join('')}</div></div></div></div>`;
    pageKey = '';
  }
  function error(a, tab) {
    $('view').innerHTML = `<div class="project" data-key=""><header class="hf-head"><a class="back" href="#/projects">${I('chevron-left')}<span>Projects</span></a><h1>${esc(a)}</h1><span class="end">${liveLine()}</span></header>${tabs(a, tab, null)}<div class="hf-body">${loadError(`The ${a} page`)}</div></div>`;
    pageKey = '';
  }
  // The server doesn't know this project (404): say so with a way back, and don't retry (Settings' unknown project).
  function missing(a) {
    $('view').innerHTML = `<div class="project" data-key=""><header class="hf-head"><a class="back" href="#/projects">${I('chevron-left')}<span>Projects</span></a><h1>${esc(a)}</h1><span class="end">${liveLine()}</span></header><div class="hf-body"><p class="p-empty"><b>There’s no project called ${esc(a)}.</b><span><a class="link" href="#/projects">All projects</a></span></p></div></div>`;
    pageKey = `missing:${a}`;
  }

  async function show(a, tab, sub, refreshing, wait) {
    if (tab === 'criteria') tab = 'outcomes';
    if (!TABS.includes(tab)) tab = 'overview';
    const hash = location.hash;
    const had = seen.get(a);
    if (refreshing && pageKey === `missing:${a}`) return;
    if (had && !(refreshing && pageKey.startsWith(`${a}/`))) draw(had, tab, sub);
    else if (!had) loading(a, tab);
    let p;
    try { p = await get(`/api/project/${encodeURIComponent(a)}${wait ? '?wait' : ''}`); } catch (e) {
      if (e.message === 'signed out') throw e;
      if (location.hash === hash && e.message === 'HTTP 404') { seen.delete(a); missing(a); return; }
      if (location.hash === hash && !had) error(a, tab);
      return;
    }
    if (location.hash !== hash) return; // the owner has already moved on
    seen.set(a, p);
    draw(p, tab, sub);
  }

  // ── Acting in place: the lead menu, the confirms, audits, findings, charter and rulings ──
  const pa = () => location.hash.split('/')[2] ? decodeURIComponent(location.hash.split('/')[2]) : '';
  const menu = () => [document.querySelector('.project [data-pa="menu"]'), $('lead-menu')];
  const closeMenu = () => { const [b, pop] = menu(); if (pop && !pop.hidden) { pop.hidden = true; b.setAttribute('aria-expanded', 'false'); } };
  async function run(btn, body, done, busyText) {
    const was = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); if (busyText) btn.textContent = busyText; }
    const r = await act(body, done);
    if (btn && btn.isConnected) { btn.disabled = false; btn.removeAttribute('aria-busy'); if (busyText) btn.innerHTML = was; }
    return r;
  }
  function confirmIn(id, go) {
    const d = $(id); if (!d) return;
    const back = document.activeElement;
    d.querySelectorAll('button').forEach(b => { b.onclick = () => { d.close(); if (b.value === 'go') go(); else back?.focus?.(); }; });
    d.showModal();
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('.project')) return closeMenu();
    const b = e.target.closest('[data-pa]');
    const [mb, pop] = menu();
    if (pop && !pop.hidden && !pop.contains(e.target) && b !== mb) closeMenu();
    if (!b) return;
    const a = pa();
    switch (b.dataset.pa) {
      case 'menu': e.stopPropagation(); pop.hidden = !pop.hidden; b.setAttribute('aria-expanded', String(!pop.hidden)); if (!pop.hidden) pop.querySelector('button').focus(); break;
      case 'restart': closeMenu(); mb?.focus(); run(null, { action: 'lead-restart', project: a }, `Restarting the lead for ${a}`); break;
      case 'stop': closeMenu(); confirmIn('p-stop', () => { mb?.focus(); run(mb, { action: 'lead-stop', project: a }, `Stopped the lead for ${a}`, 'Stopping…'); }); break;
      case 'start': run(b, { action: 'lead-start', project: a }, `Starting the lead for ${a} in a terminal on this PC`, 'Starting…'); break;
      case 'audit': confirmIn('p-audit', () => { b.focus(); run(b, { action: 'audit', project: a }, `Started an audit of ${a}`, 'Starting…'); }); break;
      case 'finding': {
        const note = ($(`fn-${b.dataset.id}`)?.value || '').trim();
        run(b, { action: 'finding', project: a, id: b.dataset.id, verdict: b.dataset.verdict, note }, b.dataset.verdict === 'confirm' ? 'Asked the team to fix it' : 'Marked it fine');
        break;
      }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const [b, pop] = menu(); if (pop && !pop.hidden) { closeMenu(); b.focus(); } } });
  document.addEventListener('toggle', e => { const d = e.target; if (d.matches?.('.project details[open]')) fillLazy(d.parentElement); }, true);
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'ch-text') { const s = document.querySelector('[data-ch-save]'); if (s) s.disabled = t.value === t.defaultValue && !t.hasAttribute('data-draft'); }
    if (t.id === 'r-new') { const s = document.querySelector('[data-r-add]'); if (s) s.disabled = !t.value.trim(); }
    if (t.id === 'ch-q' && t.value.trim()) { $('ch-qe').hidden = true; t.removeAttribute('aria-invalid'); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('[data-pa-form]');
    if (!f) return;
    e.preventDefault();
    const a = pa(), btn = f.querySelector('[type="submit"]'), ta = f.querySelector('textarea');
    const v = ta.value.trim();
    if (f.dataset.paForm === 'charter-approve' && !v) { $('ch-qe').hidden = false; ta.setAttribute('aria-invalid', 'true'); return ta.focus(); }
    if (!v) return;
    const body = f.dataset.paForm === 'charter-save' ? { action: 'charter-save', project: a, text: ta.value }
      : f.dataset.paForm === 'charter-approve' ? { action: 'charter-approve', project: a, quote: v }
      : f.dataset.paForm === 'lead-note' ? { action: 'lead-note', project: a, text: v, re: f.dataset.re || '' } : { action: 'ruling', project: a, text: v };
    const done = { 'charter-save': 'Saved the charter', 'charter-approve': `Approved the charter for ${a}`, ruling: `Added the ruling for ${a}`, 'lead-note': `Sent to the ${a} lead` }[f.dataset.paForm];
    ta.blur();
    // Approving with unsaved charter text (the lead's draft, or the owner's edits) saves it first, then approves: the
    // same two actions, in order (F-2).
    const text = $('ch-text');
    if (f.dataset.paForm === 'charter-approve' && text && (text.value !== text.defaultValue || text.hasAttribute('data-draft'))) {
      if (await run(btn, { action: 'charter-save', project: a, text: text.value }, 'Saved the charter') === null) return;
    }
    const r = await run(btn, body, done);
    // The refresh may have replaced the form: settle the field that is on screen now, not the one sent.
    const cur = $(ta.id);
    if (r !== null && cur) { if (f.dataset.paForm === 'charter-save') cur.defaultValue = cur.value = ta.value; else cur.value = cur.defaultValue = ''; }
  });
  addEventListener('resize', () => { if (!isPhone()) document.querySelectorAll('.project details[data-key="facts"]:not(.is-fold)').forEach(d => { d.open = true; }); });

  return { show, nowOf };
})();

// ---------- task page (D6 Task page; UX-4 A, UX-5 A, UX-10 A; R17-R20) ----------
// What it is doing, whether it is really working, and the proof, in that order. Status, tries, money and outcomes come
// from the one summary (the same figures as the Office and the project page); the task's read adds its question,
// proof, review and history. Agent text goes through esc() or md(); pictures and recordings come from the view port.
const Task = (() => {
  const seen = new Map(); // task id → the last read, so switching to the page paints at once
  let parts = new Map(), pageId = '', shots = [];
  const lazy = new Map(); // fold key → body, made when the fold opens (the brief and notes can be long)
  const dot = (k, word) => Office.dotOf(k, word);
  const viewAt = (port, u) => port && u ? `${location.protocol}//${location.hostname}:${port}${u}` : '';
  const plain = s => String(s || '').replace(/[`*_#>|]/g, '').replace(/\s+/g, ' ').trim();
  const clip = (s, n) => s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
  const TRY = { f: 'failed the check', p: 'passed', n: 'now', x: 'ended without a check', '': 'not used' };
  const idsOf = c => String(c || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);

  // One task's events in words (Latest steps and History).
  function stepWords(e) {
    const m = e.msg || '';
    if (e.type === 'iteration') {
      const x = m.match(/#(\d+)\s+(\w+)(?:.*?check (\w+))?/);
      if (x) return `Try ${x[1]} ended${x[3] === 'pass' ? ': the check passed' : x[3] === 'fail' ? ': the check failed' : ''}`;
    }
    if (e.type === 'evidence') return 'Showed its work';
    if (e.type === 'paced') return 'Waiting for your plan window';
    if (e.type === 'reviewed') { const x = m.match(/round (\d+): (\w+)/); if (x) return `Review round ${x[1]}: ${/approve/.test(x[2]) ? 'passed' : 'changes asked'}`; }
    if (e.type === 'review-started') return `The reviewer started${m ? ` ${m}` : ''}`;
    if (e.type === 'criteria') { const x = m.match(/(\d+)\/(\d+)/); if (x) return `Outcomes checked: ${x[1]} of ${x[2]} pass`; }
    if (e.type === 'suite') return /pass/.test(m) ? 'The full test suite passes' : `Full test suite: ${m}`;
    if (e.type === 'answered') return `You answered: ${m}`;
    if (e.type === 'approved') return 'You approved the plan';
    if (e.type === 'paused' && /owner/.test(m)) return 'You stopped it';
    const w = EVENT_WORD[e.type] || cap1(e.type.replace(/-/g, ' '));
    return m ? `${w}: ${m}` : w;
  }

  // ── The page's figures and words, from the summary first and the read second ──
  function view(t) {
    const m = t.meta, a = m.project || '';
    const p = (state?.projects || []).find(x => x.alias === a);
    const row = p?.tasks.find(x => x.id === m.id) || (state?.looseTasks || []).find(x => x.id === m.id) || {};
    const ag = p?.team.agents.find(x => x.id === m.id) || {};
    const T = { ...m, ...row };
    const s = taskStatus(T), reason = T.reason || '';
    const reviewing = ag.kind === 'reviewer' || /in review/.test(reason);
    const paced = s === 'running' && (ag.state === 'paced' || /^paced:/.test(reason));
    const live = row.live || t.live || {};
    const of = Number(T.iterations) || 0, n = live.current?.n || 0;
    const tries = [...(live.history || []).map(h => h.check === 'pass' ? 'p' : h.check === 'fail' ? 'f' : 'x'), ...(live.current ? ['n'] : [])];
    while (tries.length < of) tries.push('');
    const used = tries.filter(Boolean).length;
    const ids = idsOf(m.criteria);
    const outs = (p ? p.criteria : t.criteria || []).filter(c => ids.includes(c.id));
    const spent = row.cost !== undefined ? Number(((row.cost || 0) + (row.liveCost || 0)).toFixed(2)) : t.spend?.spent || Number(m.cost_usd || 0);
    const limit = Number(row.budget || t.spend?.limit || 0);
    const passed = /verdict:\s*\**\s*approve/i.test(t.review || '');
    const role = cap1(reviewing ? 'reviewer' : m.role || 'builder');
    const v = { id: m.id, title: m.title, a, role, k: '', word: STATUS_WORD[s] || cap1(s), stage: 1, step: '', why: '', stop: '', dock: '',
      tries, used, of, n, outs, spent, limit, reason, eta: s === 'running' && !reviewing && !paced ? T.eta : null, t, m, ag, s, last: '', quiet: paced ? 0 : ag.quietMin || 0 };
    const merge = m.pr ? 'its pull request is ready for you to merge' : m.where === 'local' || T.autonomy === 'branch' ? `it waits on ${m.branch || 'its branch'} for you to merge` : 'it lands by itself';
    switch (s) {
      case 'running':
        Object.assign(v, paced
          ? { word: 'Waiting', stage: reviewing ? 3 : 1, step: pacedWords(ag), why: 'Your Claude plan window is nearly full, so it waits instead of running into the limit. It carries on by itself; nothing it did is lost.' }
          : reviewing
          ? { k: 'active', word: 'In review', stage: 3, step: ag.step || 'Checking the work against its outcomes', why: 'The reviewer checks the work against its outcomes, and looks at the proof, before it ships.' }
          : { k: 'active', word: 'Working', step: ag.step || 'Getting started', why: `It runs its check when this step is done. Once the check passes, the reviewer looks at the work.${T.eta ? ` Likely ${T.eta.low}–${T.eta.high} min left.` : ''}` });
        v.stop = 'Stop task…'; break;
      case 'needs-you': Object.assign(v, { k: 'needs', step: 'Asked you a question', why: 'It stopped to ask before choosing. It carries on as soon as you answer; nothing it did is lost.', stop: 'Stop task…', dock: 'answer' }); break;
      case 'planned': Object.assign(v, { stage: 0, step: 'Planned, and waits for your OK to start', why: `Up to ${of} tries${limit ? `, at most ${money(limit)}` : ''}.${m.files ? ` It owns ${m.files}.` : ''} Approve it here or in the Inbox.`, stop: 'Stop it', dock: 'plan' }); break;
      case 'queued': Object.assign(v, { stage: n || used ? 1 : 0, step: 'Queued, and starts when a teammate is free', why: reasonWords(T) ? `${reasonWords(T)}.` : 'Nothing to do: it starts by itself.', stop: 'Stop task…' }); break;
      case 'review': Object.assign(v, passed
        ? { k: 'done', word: 'Passed review', stage: 4, step: `Passed review; ${merge}`, why: 'Its check and the reviewer both passed it. What the reviewer checked is under Review.' }
        : { stage: 3, step: 'Waiting for the reviewer', why: 'Its check passed. The reviewer looks at the work next.' }); break;
      case 'done': Object.assign(v, { k: 'done', stage: 4, step: reasonWords(T) || 'Finished', why: 'It passed its check and review.' }); break;
      case 'stalled': Object.assign(v, { step: 'Stopped making progress', why: 'The lead decides what happens next: another try, a new plan, or a question for you.', stop: 'Stop task…' }); break;
      case 'paused': Object.assign(v, { step: /owner/.test(reason) ? 'You stopped it' : 'Paused', why: 'This try’s work is kept as it is. The lead decides what happens next.' }); break;
      default: Object.assign(v, { step: v.word, why: reasonWords(T) ? `${reasonWords(T)}.` : '' });
    }
    v.label = v.k === 'done' ? `${role} · finished ${longAgo(T.updated)}` : (s === 'running' && !paced) || s === 'needs-you' ? `${role} · now` : `${role} · ${when(paced && ag.lastAt ? ag.lastAt : T.updated)}`; // a paced card's updated is the runner's heartbeat
    v.last = ag.lastAt || T.updated;
    // Building fills to tries used of those it is likely to need; other stages have no measure, so their bar is whole.
    v.fill = v.stage === 1 && n ? Math.round(100 * n / Math.max(n, Number(T.eta?.expected) || of || n)) : 100;
    v.shots = media(t.evidence);
    return v;
  }

  // Pictures and recordings from the view port: a picture leads (a recording's first frame is often blank), the
  // first recording second, because it shows the most.
  function media(ev) {
    const cap = name => cap1(name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' '));
    const list = (ev?.files || []).filter(f => (f.image || f.video) && f.url).map(f => ({ src: viewAt(ev.viewPort, f.url), cap: cap(f.name), kind: f.video ? 'rec' : /(^|[-_])(360|390|phone)([-_.]|$)/i.test(f.name) ? 'phone' : 'shot' }));
    const pic = list.findIndex(x => x.kind !== 'rec');
    if (pic > 0) list.unshift(...list.splice(pic, 1));
    const r = list.findIndex(x => x.kind === 'rec');
    if (r > 1) list.splice(1, 0, ...list.splice(r, 1));
    return list;
  }

  // ── Head: back to the project, the title, its status, and the one task action (R20) ──
  const statusChip = v => `<span class="p-lead t-status" data-k="${v.k}">${dot(v.k, v.word)}<span>${esc(v.word)}</span></span>`;
  const back = a => `<a class="back" href="${a ? `#/p/${encodeURIComponent(a)}/overview` : '#/projects'}">${I('chevron-left')}<span>${esc(a || 'Projects')}</span></a>`;
  const head = v => `<header class="hf-head" data-r="head">${back(v.a)}<h1>${esc(v.title)}</h1>${statusChip(v)}${v.stop ? `<button class="btn btn-secondary" type="button" data-ta="stop">${v.stop.endsWith('…') ? I('x') : ''}${v.stop}</button>` : ''}<span class="end">${liveLine()}</span></header>`;

  // ── Now (R17): the latest step is the headline; why and what next; last active or the stuck signal; the stage ──
  const pulse = v => {
    if (v.k === 'done') return '';
    if (v.k === 'active' && v.quiet) return `<p class="t-pulse is-quiet">${I('refresh')}<span>Quiet for ${v.quiet} min, longer than usual. It usually reports every few minutes.</span></p>`;
    const into = v.k === 'active' && v.t.live?.current ? ` · ${v.t.live.current.minutes} min in` : '';
    return `<p class="t-pulse">${v.k === 'active' ? dot('active', 'Working') : ''}<span>Last active <b class="num">${esc(longAgo(v.last))}</b>${into}</span></p>`;
  };
  const stageTrack = v => {
    return `<ol class="p-phases t-stages" data-k="${v.k}" aria-label="Stage: ${STAGES[v.stage]}">${STAGES.map((name, i) => `<li class="${i < v.stage || (v.k === 'done' && i === v.stage) ? 'past' : i === v.stage ? 'now' : ''}"${i === v.stage ? ' aria-current="step"' : ''}>
      <span class="bar">${i === v.stage && v.k !== 'done' ? `<span class="fill" style="--f:${v.fill}%"></span>` : ''}</span><span class="n">${name}</span></li>`).join('')}</ol>`;
  };
  const figs = v => `<p class="p-figs num">
      ${v.eta ? `<span>likely <b>${v.eta.low}–${v.eta.high}</b> min left</span>` : ''}
      ${v.outs.length ? `<span><b>${v.outs.filter(met).length}</b> of ${v.outs.length} outcomes met</span>` : ''}
      ${v.limit ? `<span><b>${money(v.spent)}</b> of ${money(v.limit)}</span>` : `<span><b>${money(v.spent)}</b> spent</span>`}</p>`;
  const met = c => c.status === 'pass' || c.status === 'accepted';
  const now = v => `<section class="p-now t-now" aria-labelledby="now-h" data-r="now"><h2 class="section-label" id="now-h">${esc(v.label)}</h2>
      <p class="p-now-t" data-step>${esc(plain(v.step).replace(/[.:;,]$/, ''))}.</p>${v.why ? `<p class="lede">${esc(v.why)}</p>` : ''}
      ${pulse(v)}${stageTrack(v)}${figs(v)}</section>`;

  // ── Its question (needs you) and the dock: the Inbox's question, asked in place ──
  const ask = v => {
    if (v.dock !== 'answer') return v.dock === 'plan' ? `<div data-r="ask">${dock(v)}</div>` : '<div data-r="ask" hidden></div>';
    const q = v.t.ask || {}, words = [q.context, q.rest].filter(Boolean).join('\n\n');
    return `<div data-r="ask"><section class="p-sec t-ask" aria-labelledby="ask-h"><h2 class="p-h" id="ask-h">${dot('needs', 'Needs you')}Its question</h2>
      <blockquote class="quote">${q.title ? `<p><b>${esc(q.title)}</b></p>` : ''}${words ? md(words) : ''}<footer>The ${esc(v.role.toLowerCase())}, try ${v.n || v.used || 1} of “${esc(v.title)}” · ${esc(longAgo(v.m.updated))}</footer></blockquote>
      ${q.options?.length ? `<fieldset class="choices"><legend class="section-label">Suggested answers</legend>${q.options.map((o, i) => `<label class="choice"><input type="radio" name="t-ans" value="${i}"> ${esc(o)}</label>`).join('')}</fieldset>` : ''}
      ${q.suggested ? `<p class="p-quiet">What it will do if you don’t mind: ${esc(q.suggested)}</p>` : ''}</section>${dock(v)}</div>`;
  };
  const dock = v => v.dock === 'answer' ? `<form class="dock t-dock" aria-label="Answer the ${esc(v.role.toLowerCase())}" data-dock="answer">
      <label class="sr-only" for="t-own">${v.t.ask?.options?.length ? 'Or write your own answer' : 'Your answer'}</label>
      <textarea class="input" id="t-own" rows="1" placeholder="${v.t.ask?.options?.length ? 'Or write your own answer' : 'Your answer'}" aria-describedby="t-msg"></textarea>
      <div class="dock-row"><span class="dock-msg" id="t-msg" data-msg hidden></span><span class="spacer"></span><button class="btn btn-primary" type="submit" data-go>Send answer</button></div></form>`
    : `<form class="dock t-dock" aria-label="Approve the plan" data-dock="plan">
      <div class="dock-row"><span class="dock-msg" id="t-msg" data-msg>Up to ${v.of} tries${v.limit ? ` · at most ${money(v.limit)}` : ''}</span><span class="spacer"></span><button class="btn btn-primary" type="submit" data-go>Approve plan</button></div></form>`;

  // ── Shown working (R18): pictures large, the recording first; the run log under it ──
  function proof(v) {
    const ev = v.t.evidence, list = v.shots, tl = v.t.timeline || [];
    const at = tl.filter(e => e.type === 'evidence').at(-1);
    const tryOf = at && [...tl.slice(0, tl.indexOf(at))].reverse().find(e => e.type === 'iteration')?.msg?.match(/#(\d+)/)?.[1];
    const others = (ev?.files || []).filter(f => !f.image && !f.video && !f.audio && f.url), heard = (ev?.files || []).filter(f => f.audio && f.url);
    // It leads with a plain sentence of what is shown (F-6); the agent's own notes are folded under it.
    const nOf = (n, one) => n ? `${n} ${one}${n === 1 ? '' : 's'}` : '';
    const shownList = [nOf(list.filter(x => x.kind !== 'rec').length, 'screenshot'), nOf(list.filter(x => x.kind === 'rec').length, 'recording'), nOf(heard.length, 'sound')].filter(Boolean);
    const note = shownList.length ? `The ${v.role.toLowerCase()} showed ${shownList.length > 1 ? `${shownList.slice(0, -1).join(', ')} and ${shownList.at(-1)}` : shownList[0]}.` : ev?.notes ? `The ${v.role.toLowerCase()} wrote notes on what it did.` : '';
    const lines = (v.t.lastCheck || '').trim().split('\n').filter(l => l.trim()).slice(-4);
    const frame = (x, i) => `<button class="frame${x.kind === 'phone' ? ' is-phone' : ''}" type="button" data-ta="shot" data-i="${i}" aria-label="${esc(x.cap)}${x.kind === 'rec' ? ', recording' : ''}. Open large">
        <span class="frame-img">${x.kind === 'rec' ? `<video src="${esc(x.src)}" preload="metadata" muted playsinline data-len></video><span class="play">${I('play')}<span>Recording</span></span>` : `<img src="${esc(x.src)}" alt="" decoding="async" loading="lazy">`}</span>
        <span class="frame-cap"><b>${esc(x.cap)}</b><span>${x.kind === 'rec' ? 'Recording' : x.kind === 'phone' ? 'Phone' : 'Screenshot'}</span></span></button>`;
    const shown = list.length > 3 ? list.slice(0, 2) : list;
    const more = list.length > 3 ? `<button class="frame frame-more" type="button" data-ta="shot" data-i="2" aria-label="See all ${list.length} pictures and recordings, from the third"><span class="frame-img"><b>+${list.length - 2}</b>more</span><span class="frame-cap"><b>See them all</b><span>${list.length} in all</span></span></button>` : '';
    if (ev?.notes) lazy.set('t-pnote', () => md(ev.notes));
    const body = list.length || heard.length || note ? `${note ? `<p class="t-note">${esc(note)}</p>` : ''}
        ${list.length ? `<div class="frames ${shown.length + (more ? 1 : 0) > 2 ? 'is-hero' : 't-two'}">${shown.map(frame).join('')}${more}</div>` : ''}
        ${sounds(heard, f => viewAt(ev.viewPort, f.url))}
        ${lines.length ? `<details class="details t-log" data-key="t-log"><summary>${I('log')}Run log · last ${lines.length} line${lines.length === 1 ? '' : 's'}${I('chevron-down')}</summary><div class="details-body"><pre>${lines.map(l => `<span${/✗|\bFAIL|\bfailed\b|Error/.test(l) ? ' class="bad"' : /✓|\bPASS|\bpassed\b|exit(ed)?( with)? 0\b/i.test(l) ? ' class="ok"' : ''}>${esc(l)}</span>`).join('\n')}</pre></div></details>` : ''}
        ${ev?.notes ? `<details class="details t-log" data-key="t-pnote"><summary>${I('doc')}Its notes on the proof${I('chevron-down')}</summary><div class="details-body" data-tlazy></div></details>` : ''}
        ${others.length ? `<details class="details t-log" data-key="t-files"><summary>${I('doc')}Other files · ${others.length}${I('chevron-down')}</summary><div class="details-body"><ul class="t-files">${others.map(f => `<li><a class="link" href="${esc(viewAt(ev.viewPort, f.url))}" target="_blank" rel="noopener">${esc(f.name)}${I('external')}</a></li>`).join('')}</ul></div></details>` : ''}`
      : `<p class="p-quiet">${v.k === 'active' ? `Nothing shown yet. The ${esc(v.role.toLowerCase())} shows its work when this step is done.` : v.k === 'done' ? 'It attached no screenshots or recordings.' : 'Nothing shown yet. Screenshots and recordings appear here once it starts.'}</p>`;
    return `<section class="p-sec t-proof" aria-labelledby="proof-h" data-r="proof"><h2 class="p-h" id="proof-h">Shown working ${at ? `<span class="n num">${tryOf ? `From try ${tryOf} · ` : ''}${esc(when(at.ts))}</span>` : ''}</h2>${body}</section>`;
  }

  // ── Latest steps: what it is doing now, then the newest events ──
  const row = ([ts, w], i) => `<li${i === 0 ? ' data-k="done"' : ''}><time class="num" datetime="${esc(ts)}">${esc(when(ts))}</time><span>${esc(clip(plain(w), 200))}</span></li>`;
  const steps = v => {
    const list = [...(v.k === 'active' && v.ag.step ? [[v.ag.lastAt, v.ag.step]] : []), ...[...(v.t.timeline || [])].reverse().map(e => [e.ts, stepWords(e)])].slice(0, 4);
    return `<section class="p-sec" aria-labelledby="steps-h" data-r="steps"><h2 class="p-h" id="steps-h">Latest steps</h2>
      ${list.length ? `<ol class="p-feed">${list.map(row).join('')}</ol>` : '<p class="p-quiet">Not started yet.</p>'}</section>`;
  };

  // ── Review: the verdict, with the reviewer's notes folded ──
  const review = v => {
    const r = v.t.review || '', at = (v.t.timeline || []).filter(e => e.type === 'reviewed').at(-1);
    let body;
    if (!r.trim()) body = `<p class="p-quiet">${v.word === 'In review' ? 'The reviewer is checking it now.' : 'Not reviewed yet. The reviewer looks at the work once the check passes.'}</p>`;
    else {
      lazy.set('t-review', () => md(r));
      const ok = /verdict:\s*\**\s*approve/i.test(r);
      body = `<div class="t-review"><p><span class="t-verdict${ok ? '' : ' is-changes'}">${ok ? `${I('check')}Passed` : 'Changes asked'}</span><span class="p-quiet">Reviewer${at ? ` · ${esc(when(at.ts))}` : ''}</span></p>
        ${ok ? '' : `<p class="p-quiet">The ${esc((v.m.role || 'builder'))} works on them in its next try.</p>`}
        <details class="details t-log" data-key="t-review"><summary>${I('doc')}The reviewer’s notes${I('chevron-down')}</summary><div class="details-body" data-tlazy></div></details></div>`;
    }
    return `<section class="p-sec" aria-labelledby="rev-h" data-r="review"><h2 class="p-h" id="rev-h">Review</h2>${body}</section>`;
  };

  // ── History and notes (R19): folded; each says how much is inside ──
  const folds = v => {
    const t = v.t, tl = [...(t.timeline || [])].reverse();
    const notes = (t.progress.match(/^## /gm) || []).length, dec = (t.decisions.match(/^- /gm) || []).length;
    const it = (t.timeline || []).filter(e => e.type === 'iteration').at(-1);
    lazy.set('t-hist', () => `<ol class="p-feed">${tl.map(e => `<li><time class="num" datetime="${esc(e.ts)}">${esc(when(e.ts))}</time><span>${esc(clip(plain(stepWords(e)), 240))}</span></li>`).join('')}</ol>`);
    lazy.set('t-notes', () => md(t.progress));
    lazy.set('t-dec', () => md(t.decisions));
    lazy.set('t-brief', () => md(t.body));
    lazy.set('t-check', () => `<p><code>${esc(v.m.check)}</code>${it ? ` · Last run ${esc(when(it.ts))}: ${v.m.last_check === 'pass' ? 'passed' : v.m.last_check === 'fail' ? 'failed' : 'no result'}` : ' · Not run yet'}</p>${t.lastCheck ? `<pre class="t-out">${esc(t.lastCheck.trim().split('\n').slice(-60).join('\n'))}</pre>` : ''}`);
    const f = (key, title) => `<details class="details" data-key="${key}"><summary>${title}${I('chevron-down')}</summary><div class="details-body" data-tlazy></div></details>`;
    return `<section class="p-sec t-folds" aria-label="History and notes" data-r="folds">
      ${f('t-hist', `History · ${tl.length} event${tl.length === 1 ? '' : 's'}`)}
      ${notes || t.progress.trim() ? f('t-notes', `Progress notes${notes ? ` · ${notes}` : ''}`) : ''}
      ${f('t-dec', `Decided without you · ${dec || 'none'}`)}
      ${f('t-brief', 'The brief')}
      ${f('t-check', 'Last check')}</section>`;
  };

  // ── Facts: status, tries, its own spend, outcomes, the work ──
  const facts = v => {
    const m = v.m, pct = v.limit ? Math.min(100, Math.round(v.spent / v.limit * 100)) : 0;
    const fails = v.tries.filter(x => x === 'f').length;
    const tryNote = v.tries.includes('p') ? `${fails ? `${fails === 1 ? 'One try' : `${fails} tries`} failed the check; the` : 'The'} last check passed.`
      : fails ? `${fails === 1 ? 'One try' : `${fails} tries`} failed the check; each new try starts from what the last one learned.` : v.used ? 'Each try ends with its check.' : `It may use up to ${v.of}.`;
    const words = c => met(c) ? `Met ${when((c.history || []).at(-1)?.at)}` : c.status === 'awaiting-owner' ? 'Waiting for your judgement in the Inbox' : c.status === 'fail' ? 'Not yet: its check is failing' : 'Not met yet';
    const pr = m.pr ? `<dt>Pull request</dt><dd><a class="link" href="${esc(m.pr)}" target="_blank" rel="noopener">${esc(m.pr.replace(/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\//, 'Draft #'))}${I('external')}</a></dd>` : m.branch ? `<dt>Branch</dt><dd class="mono">${esc(m.branch)}</dd>` : '';
    return `<aside class="p-facts" aria-label="Facts" data-r="facts"><details class="p-factsfold is-fold" data-key="facts">
      <summary><span>Details</span><span class="num">${money(v.spent)}${v.limit ? ` of ${money(v.limit)}` : ''}</span>${I('chevron-down')}</summary>
      <div class="p-facts-in">
        <section class="p-fact" aria-labelledby="f-st"><h3 class="section-label" id="f-st">Status</h3>
          <p class="t-st" data-k="${v.k}">${dot(v.k, v.word)}<b>${esc(v.word)}</b></p>
          <dl class="p-dl"><dt>ID</dt><dd class="num">${esc(v.id)}</dd><dt>Who</dt><dd>${esc(cap1(m.role || 'builder'))}</dd>${m.created ? `<dt>Started</dt><dd>${esc(`${day(m.created)}, ${hhmm(m.created)}`)}</dd>` : ''}${v.a ? `<dt>Project</dt><dd><a class="link" href="#/p/${encodeURIComponent(v.a)}/overview">${esc(v.a)}</a></dd>` : ''}</dl></section>
        <section class="p-fact" aria-labelledby="f-try"><h3 class="section-label" id="f-try">Tries</h3>
          <div class="t-tryrow"><ol class="t-tries" aria-label="${v.used} of ${v.of} tries used">${v.tries.map((x, i) => `<li data-t="${x === 'x' ? 'f' : x}" title="Try ${i + 1}: ${TRY[x]}"></li>`).join('')}</ol><span class="num">${v.used} of ${v.of}</span></div>
          <p class="p-quiet">${tryNote}</p>
          <div class="meter"><div class="meter-head"><span>Spent on this task</span><b class="num">${money(v.spent)}${v.limit ? ` <small>of ${money(v.limit)}</small>` : ''}</b></div>
            ${v.limit ? `<div class="meter-track${pct >= 100 ? ' is-full' : ''}" role="img" aria-label="${esc(`${money(v.spent)} of ${money(v.limit)} spent`)}"><i style="--value:${pct}%"></i></div>` : ''}
            <span class="meter-foot">Its own budget${v.a ? ` · part of ${esc(v.a)}’s day` : ''}</span></div></section>
        ${v.outs.length ? `<section class="p-fact" aria-labelledby="f-out"><h3 class="section-label" id="f-out">Outcomes · ${v.outs.filter(met).length} of ${v.outs.length}</h3>
          <ul class="p-outs t-outs">${v.outs.map(c => `<li data-met="${met(c)}"><span class="p-ok" role="img" aria-label="${met(c) ? 'Met' : 'Not met yet'}">${met(c) ? I('check') : ''}</span><span class="t"><b>${esc(c.statement)}</b><span class="s">${esc(c.id)} · ${esc(words(c))}</span></span></li>`).join('')}</ul></section>` : ''}
        <section class="p-fact" aria-labelledby="f-code"><h3 class="section-label" id="f-code">The work</h3>
          <dl class="p-dl">${(v.reason) ? `<dt>Runner’s note</dt><dd>${esc(v.reason)}</dd>` : ''}<dt>Check</dt><dd><code>${esc(m.check || 'none')}</code>${m.last_check ? ` · ${m.last_check === 'pass' ? 'last run passed' : m.last_check === 'fail' ? 'last run failed' : esc(m.last_check)}` : ''}</dd>
            ${m.files ? `<dt>Files</dt><dd class="mono">${esc(m.files)}</dd>` : ''}
            ${m.test_touch ? `<dt class="is-needs">Tests</dt><dd class="is-needs">Changed an existing test: <code>${esc(m.test_touch)}</code>. Look before you merge</dd>` : m.files ? '<dt>Tests</dt><dd>Didn’t change existing tests</dd>' : ''}
            ${pr}</dl></section>
      </div></details></aside>`;
  };

  // ── Mounting, patching, states ──
  const dialogs = `<dialog class="p-dialog" id="t-stop" aria-labelledby="tstop-t" aria-describedby="tstop-d"><h2 id="tstop-t"></h2><p id="tstop-d"></p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Keep it running</button><button class="btn btn-danger" type="button" value="go">Stop the task</button></div></dialog>
    <dialog class="t-lb" id="t-lb" aria-labelledby="lb-cap">
      <div class="t-lb-bar"><span id="lb-cap" class="t-lb-cap"></span><span class="t-lb-n num" data-n></span>
        <a class="btn btn-ghost btn-sm" href="#" target="_blank" rel="noopener" data-full>${I('external')}Full size</a>
        <button class="btn btn-ghost btn-icon" type="button" data-ta="lb-close" aria-label="Close" autofocus>${I('x')}</button></div>
      <figure class="t-lb-fig"><span class="t-lb-media"></span></figure>
      <button class="btn btn-secondary btn-icon t-lb-prev" type="button" data-ta="lb-prev" aria-label="Previous picture">${I('chevron-left')}</button>
      <button class="btn btn-secondary btn-icon t-lb-next" type="button" data-ta="lb-next" aria-label="Next picture">${I('chevron-right')}</button></dialog>`;
  const fillLazy = root => root.querySelectorAll('details[open] > [data-tlazy]').forEach(b => { if (!b.childElementCount) b.innerHTML = lazy.get(b.parentElement.dataset.key)?.() || ''; });

  function draw(t) {
    const v = view(t);
    const regions = [['head', head(v)], ['now', now(v)], ['facts', facts(v)], ['ask', ask(v)], ['proof', proof(v)], ['steps', steps(v)], ['review', review(v)], ['folds', folds(v)]];
    shots = v.shots;
    const box = $('view'), root = box.querySelector(':scope > .task');
    const cls = `p-grid t-grid${failedAt ? ' is-stale' : ''}${v.dock ? ' has-dock' : ''}`;
    if (root && root.dataset.id === v.id) {
      patchRegions(root, regions, parts, fillLazy);
      const g = root.querySelector('.t-grid'); if (g) g.className = cls;
      return;
    }
    box.innerHTML = `<div class="project task" data-id="${esc(v.id)}">${regions[0][1]}<div class="hf-body"><div class="${cls}">${regions[1][1]}${regions[2][1]}<div class="p-col">${regions.slice(3).map(r => r[1]).join('')}</div></div></div>${dialogs}</div>`;
    parts = new Map(regions); pageId = v.id;
    const f = box.querySelector('details[data-key="facts"]');
    if (f && isPhone()) f.open = false;
  }

  // Before the first read: Now, facts and two proof frames as skeletons (States); the title if the summary has it.
  function loading(id) {
    const row = (state?.projects || []).flatMap(p => p.tasks).find(x => x.id === id) || {};
    const sk = (w, h, more = '') => `<span class="skeleton" style="width:${w};height:${h}px${more}"></span>`;
    $('view').innerHTML = `<div class="project task" data-id=""><header class="hf-head">${back(row.project)}<h1>${esc(row.title || '')}</h1><span class="end">${liveLine()}</span></header>
      <div class="hf-body"><div class="p-grid t-grid" aria-busy="true" aria-label="Loading the task">
        <section class="p-now">${sk('96px', 12)}${sk('80%', 28)}${sk('95%', 16)}${sk('100%', 28, ';margin-top:8px')}</section>
        <aside class="p-facts"><div class="p-facts-in p-skel">${sk('100%', 96)}${sk('100%', 120)}</div></aside>
        <div class="p-col"><section class="p-sec">${sk('140px', 16)}<div class="frames t-two"><span class="skeleton" style="aspect-ratio:16/10"></span><span class="skeleton" style="aspect-ratio:16/10"></span></div></section></div></div></div></div>`;
    pageId = '';
  }
  function error(id) {
    const row = (state?.projects || []).flatMap(p => p.tasks).find(x => x.id === id) || {};
    $('view').innerHTML = `<div class="project task" data-id=""><header class="hf-head">${back(row.project)}<h1>${esc(row.title || id)}</h1><span class="end">${liveLine()}</span></header><div class="hf-body">${loadError('This task')}</div></div>`;
    pageId = '';
  }
  // The server doesn't know this task (404): say so with a way back, and don't retry (Settings' unknown project).
  let gone = '';
  function missing(id) {
    $('view').innerHTML = `<div class="project task" data-id=""><header class="hf-head">${back('')}<h1>${esc(id)}</h1><span class="end">${liveLine()}</span></header><div class="hf-body"><p class="p-empty"><b>There’s no task called ${esc(id)}.</b><span><a class="link" href="#/projects">All projects</a></span></p></div></div>`;
    pageId = ''; gone = id;
  }

  async function show(id, refreshing) {
    const hash = location.hash, had = seen.get(id);
    if (refreshing && gone === id && !pageId) return;
    gone = '';
    if (had && !(refreshing && pageId === id)) draw(had);
    else if (!had) loading(id);
    let t;
    try { t = await get(`/api/task/${encodeURIComponent(id)}`); } catch (e) {
      if (e.message === 'signed out') throw e;
      if (location.hash !== hash) return;
      if (e.message === 'HTTP 404') { seen.delete(id); missing(id); return; }
      if (had) draw(had); else error(id); // a failed refresh keeps the page, marked stale
      return;
    }
    if (location.hash !== hash) return; // the owner has already moved on
    seen.set(id, t);
    draw(t);
  }

  // ── The dock: answer or approve at once, with Undo while the toast shows (UX-10); then it goes to Atelier ──
  let pend = null; // { body, timer } inside its Undo window
  function commit(opts = {}) {
    if (!pend) return;
    const { body, form } = pend; pend = null;
    form?.removeAttribute('data-hold');
    post(body, opts).then(() => { if (!opts.keepalive) refresh().catch(() => {}); }).catch(e => {
      if (opts.keepalive) return;
      const f = document.querySelector('.task [data-dock]');
      if (f) reset(f, /fetch|network/i.test(e.message) ? 'Couldn’t reach Atelier. Nothing was sent.' : e.message);
      else toast(/fetch|network/i.test(e.message) ? 'Couldn’t reach Atelier. Nothing was sent.' : e.message, { error: true });
    });
  }
  function reset(form, err) {
    form.classList.remove('is-sent'); form.removeAttribute('data-hold');
    const go = form.querySelector('[data-go]'), msg = form.querySelector('[data-msg]'), own = form.querySelector('textarea');
    go.hidden = false; own?.removeAttribute('disabled');
    if (form.dataset.dock === 'plan') { msg.className = 'dock-msg'; msg.textContent = msg.dataset.was || msg.textContent; }
    else { msg.hidden = !err; msg.className = 'dock-msg'; msg.textContent = ''; }
    if (err) { msg.hidden = false; msg.className = 'dock-msg is-error'; msg.innerHTML = `${I('alert')}${esc(err)}`; }
    (own || go).focus();
  }
  function toastUndo(text) {
    const box = $('toasts');
    box.innerHTML = `<div class="toast toast-success" role="status"><span class="tick">${I('check')}</span><span class="toast-text">${esc(text)}</span><button class="toast-action" type="button" data-ta="undo">Undo</button><span class="toast-life" aria-hidden="true"></span></div>`;
    Inbox.placeToast();
    const t = box.firstChild;
    let left = 6000, started = Date.now();
    const run = () => { started = Date.now(); clearTimeout(pend?.timer); if (pend) pend.timer = setTimeout(close, left); };
    const hold = () => { clearTimeout(pend?.timer); left = Math.max(1500, left - (Date.now() - started)); };
    t.addEventListener('pointerenter', hold); t.addEventListener('focusin', hold);
    t.addEventListener('pointerleave', () => { if (!t.contains(document.activeElement)) run(); });
    t.addEventListener('focusout', e => { if (!t.contains(e.relatedTarget) && !t.matches(':hover')) run(); });
    run();
  }
  function close() { commit(); const box = $('toasts'); box.innerHTML = ''; Inbox.placeToast(); }
  document.addEventListener('submit', e => {
    const form = e.target.closest('.task [data-dock]');
    if (!form) return;
    e.preventDefault();
    if (pend) return;
    const id = pageId, own = form.querySelector('textarea'), msg = form.querySelector('[data-msg]'), go = form.querySelector('[data-go]');
    let body, said, done;
    if (form.dataset.dock === 'answer') {
      const pick = document.querySelector('.task input[name="t-ans"]:checked'), opts = seen.get(id)?.ask?.options || [];
      const text = own.value.trim() || (pick ? opts[Number(pick.value)] || '' : '');
      if (!text) { msg.hidden = false; msg.className = 'dock-msg is-error'; msg.innerHTML = `${I('alert')}Pick an answer or write your own.`; own.setAttribute('aria-invalid', 'true'); return own.focus(); }
      const who = (seen.get(id)?.meta.role || 'builder');
      body = { action: 'answer', id, text }; said = `Answered. The ${who} carries on.`; done = `Answered the ${who}.`;
    } else {
      body = { action: 'plan-approve', id }; said = `Approved. The ${seen.get(id)?.meta.role || 'builder'} starts within a minute.`; done = 'Approved the plan.';
      msg.dataset.was = msg.textContent;
    }
    form.classList.add('is-sent'); form.setAttribute('data-hold', '');
    go.hidden = true; own?.setAttribute('disabled', ''); own?.removeAttribute('aria-invalid');
    msg.hidden = false; msg.className = 'dock-msg is-done'; msg.innerHTML = `${I('check')}${esc(said)}`;
    pend = { body, form };
    toastUndo(done);
  });
  document.addEventListener('input', e => {
    if (e.target.id === 't-own' || e.target.name === 't-ans') { const msg = document.querySelector('.task [data-dock] [data-msg].is-error'); if (msg) { msg.hidden = true; msg.className = 'dock-msg'; $('t-own')?.removeAttribute('aria-invalid'); } }
  });
  addEventListener('pagehide', () => commit({ keepalive: true }));

  // ── Stop (asks first: it can't be undone), the proof viewer, Undo ──
  let at = 0, opener = null;
  function showShot(i) {
    const lb = $('t-lb'); if (!lb || !shots.length) return;
    at = (i + shots.length) % shots.length;
    const x = shots[at];
    lb.querySelector('.t-lb-media').innerHTML = x.kind === 'rec' ? `<video src="${esc(x.src)}" controls playsinline preload="metadata" aria-label="${esc(x.cap)}"></video>` : `<img src="${esc(x.src)}" alt="${esc(x.cap)}">`;
    lb.querySelector('[data-full]').href = x.src;
    lb.querySelector('.t-lb-cap').textContent = x.cap;
    lb.querySelector('[data-n]').textContent = `${at + 1} of ${shots.length}`;
    lb.classList.toggle('is-phone', x.kind === 'phone');
    lb.querySelectorAll('[data-ta="lb-prev"],[data-ta="lb-next"]').forEach(b => { b.hidden = shots.length < 2; });
  }
  document.addEventListener('click', e => {
    const lb = $('t-lb');
    if (lb && e.target === lb) return lb.close(); // the scrim
    const b = e.target.closest('[data-ta]');
    if (!b) return;
    switch (b.dataset.ta) {
      case 'shot': opener = b; showShot(Number(b.dataset.i)); lb.showModal(); break;
      case 'lb-close': lb.close(); break;
      case 'lb-prev': showShot(at - 1); break;
      case 'lb-next': showShot(at + 1); break;
      case 'undo': {
        if (!pend) return;
        clearTimeout(pend.timer);
        const f = pend.form; pend = null;
        $('toasts').innerHTML = ''; Inbox.placeToast();
        if (f?.isConnected) reset(f);
        break;
      }
      case 'stop': {
        const d = $('t-stop'), t = seen.get(pageId); if (!d || !t) return;
        const planned = t.meta.status === 'planned';
        $('tstop-t').textContent = `Stop “${t.meta.title}”?`;
        $('tstop-d').textContent = planned ? 'The plan is dropped and nothing starts. The lead can plan it again later.' : `The ${t.meta.role || 'builder'} stops now and this try’s work is kept as it is. The lead decides what happens next.`;
        d.querySelectorAll('button').forEach(x => { x.onclick = async () => {
          d.close();
          if (x.value !== 'go') return b.focus();
          const was = b.innerHTML; b.disabled = true; b.setAttribute('aria-busy', 'true'); b.textContent = 'Stopping…';
          const r = await act({ action: 'task-stop', id: t.meta.id }, `Stopped “${t.meta.title}”`);
          if (r === null && b.isConnected) { b.disabled = false; b.removeAttribute('aria-busy'); b.innerHTML = was; }
        }; });
        d.showModal();
        break;
      }
    }
  });
  document.addEventListener('keydown', e => {
    if ($('t-lb')?.open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); showShot(at + (e.key === 'ArrowLeft' ? -1 : 1)); }
  });
  document.addEventListener('close', e => { if (e.target.id === 't-lb') { e.target.querySelector('video')?.pause(); opener?.focus(); } }, true);
  document.addEventListener('toggle', e => { const d = e.target; if (d.matches?.('.task details[open]')) fillLazy(d.parentElement); }, true);
  // A recording's pill shows its length once the browser knows it.
  document.addEventListener('loadedmetadata', e => {
    const v = e.target; if (!v.matches?.('video[data-len]') || !isFinite(v.duration)) return;
    const s = Math.round(v.duration), pill = v.nextElementSibling?.lastElementChild;
    if (pill) pill.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, true);

  return { show };
})();

// ---------- new project ----------
// D6 New project (UX-12 B): one field that grows from a line into the brief draft (the lead reads it in full), team,
// shipping, repo, start the lead; "What happens next" beside it follows the choices. Same action as before: project-create.
const New = (() => {
  const isBrief = s => s.length > 280 || /\n/.test(s.trim());
  const words = s => (s.trim().match(/\S+/g) || []).length;
  const hint = s => !s.trim() ? 'One line is enough. Paste a whole brief if you have one.'
    : isBrief(s) ? `<b>Reads as your brief draft</b> · <span class="num">${words(s)}</span> words. The lead starts from it, in full, instead of a blank page.`
    : 'The lead turns this into a charter for you to approve.';
  const repoLine = n => (n ? `${esc(n)}, on your account` : 'Named after the project, on your account');
  const choice = (name, val, title, sub, on) => `<label class="choice is-two"><input type="radio" name="${name}" value="${val}"${on ? ' checked' : ''}><span><b>${title}</b><small>${sub}</small></span></label>`;
  const next = o => `<ol class="n-next">
      <li><b>Atelier makes the folder${o.repo ? ` and a private GitHub repo${o.name ? `, <span class="num">${esc(o.name)}</span>` : ''}` : ''}.</b><span>A few seconds.</span></li>
      ${o.lead ? `<li><b>The lead reads your ${o.brief ? 'brief' : 'description'} and drafts a charter.</b><span>About ten minutes. You can watch it in the Office.</span></li>
      <li><b>You approve the charter in the Inbox.</b><span>Nothing else to do until then.</span></li>`
      : '<li><b>The project waits with the lead off.</b><span>Start the lead from the project page when you’re ready.</span></li>'}
    </ol>`;
  const nameError = s => (!s ? 'Give it a name.' : !/^[a-z0-9][a-z0-9-]*$/.test(s) ? 'Use lowercase letters, numbers and dashes.'
    : (state?.projects || []).some(p => p.alias === s) ? `${esc(s)} already exists. Pick another name.` : '');

  function show() {
    if ($('n-form')) return; // a refresh never wipes what the owner is typing
    $('view').innerHTML = `<div class="scr news"><header class="hf-head"><a class="back" href="#/projects">${I('chevron-left')}<span>Projects</span></a><h1>New project</h1></header>
      <div class="hf-body"><div class="n-grid">
      <form class="f-form n-form" id="n-form" novalidate>
        <div class="field">
          <label class="field-label" for="n-name">Name</label>
          <input class="input n-name" id="n-name" name="name" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="n-name-help">
          <span class="field-help" id="n-name-help">Lowercase letters, numbers and dashes. Used for the folder and the GitHub repo.</span>
        </div>
        <div class="field n-desc" data-desc>
          <label class="field-label" for="n-desc">What it is <span class="faint">(one line, or paste a whole brief)</span></label>
          <textarea class="input" id="n-desc" name="desc" rows="2" aria-describedby="n-desc-hint" placeholder="A tide-times app for the three beaches near home…"></textarea>
          <span class="field-help n-hint" id="n-desc-hint" aria-live="polite">${I('plan')}<span>${hint('')}</span></span>
        </div>
        <fieldset class="f-sec"><legend>Team</legend>
          <div class="f-row3">
            ${choice('roster', 'pair', 'Pair', 'A lead, a builder and a reviewer. For small things.')}
            ${choice('roster', 'team', 'Team', 'Lead, designer, frontend, backend, reviewer.', true)}
            ${choice('roster', 'game', 'Game', 'Lead, game designer, gameplay, systems, reviewer.')}
          </div>
        </fieldset>
        <fieldset class="f-sec"><legend>Shipping</legend>
          <div class="f-row2">
            ${choice('ship', 'pr', 'Draft pull requests', 'You merge each one.', true)}
            ${choice('ship', 'merge', 'Straight to main', 'Reviewed work lands by itself.')}
          </div>
        </fieldset>
        <div class="f-checks">
          <label class="f-check"><input type="checkbox" name="github" checked><span>Make a private GitHub repo<small data-repo-name>${repoLine('')}</small></span></label>
          <label class="f-check"><input type="checkbox" name="lead" checked><span>Start the lead now<small>It drafts the charter first; you approve it in the Inbox.</small></span></label>
        </div>
        <div class="n-fail" data-fail role="alert" hidden></div>
        <div class="f-actions"><button class="btn btn-primary" type="submit" data-create>Create project</button><a class="btn btn-ghost" href="#/projects">Cancel</a></div>
      </form>
      <aside class="n-aside" aria-labelledby="n-next-h"><h2 class="section-label" id="n-next-h">What happens next</h2><div data-next>${next({ repo: true, lead: true, name: '', brief: false })}</div></aside>
      </div></div></div>`;
    wire($('n-form'));
  }

  function wire(f) {
    const ta = f.desc, nm = f.name, view = $('view');
    let kind = 'empty';
    const sync = () => {
      const s = ta.value, b = isBrief(s), k = b ? 'brief' : s.trim() ? 'line' : 'empty';
      view.querySelector('[data-desc]').classList.toggle('is-brief', b);
      // New words rise in (hf-tick) when the hint changes kind; the word count changes in place.
      const el = view.querySelector('.n-hint > span');
      if (k !== kind) el.replaceWith(Object.assign(document.createElement('span'), { innerHTML: hint(s) }));
      else if (b) el.innerHTML = hint(s);
      kind = k;
      view.querySelector('[data-repo-name]').innerHTML = repoLine(nm.value.trim());
      view.querySelector('[data-next]').innerHTML = next({ repo: f.github.checked, lead: f.lead.checked, name: nm.value.trim(), brief: b });
    };
    f.addEventListener('input', sync); f.addEventListener('change', sync);
    const err = msg => {
      $('n-name-err')?.remove();
      if (!msg) { nm.removeAttribute('aria-invalid'); nm.setAttribute('aria-describedby', 'n-name-help'); return true; }
      nm.setAttribute('aria-invalid', 'true'); nm.setAttribute('aria-describedby', 'n-name-help n-name-err');
      nm.insertAdjacentHTML('afterend', `<span class="field-error" id="n-name-err">${I('alert')}<span>${msg}</span></span>`);
      return false;
    };
    const check = () => err(nameError(nm.value.trim()));
    const blurCheck = () => { if (nm.value || nm.hasAttribute('aria-invalid')) check(); };
    // Pressing Create blurs Name; an error line inserted then would push the button out from under the click and
    // lose it. Hold the check until the press ends: the click's submit checks and focuses Name, else check then.
    let pressing = false;
    f.querySelector('[data-create]').addEventListener('pointerdown', () => {
      pressing = true;
      const end = () => { removeEventListener('pointerup', end); removeEventListener('pointercancel', end); setTimeout(() => { pressing = false; if (document.activeElement !== nm) blurCheck(); }); };
      addEventListener('pointerup', end); addEventListener('pointercancel', end);
    });
    nm.addEventListener('blur', () => { if (!pressing) blurCheck(); });
    nm.addEventListener('input', () => { if (nm.hasAttribute('aria-invalid') && !nameError(nm.value.trim())) err(''); });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const b = f.querySelector('[data-create]');
      if (b.disabled) return;
      if (!check()) { nm.focus(); return; }
      const name = nm.value.trim(), fail = f.querySelector('[data-fail]');
      const again = b.textContent !== 'Create project';
      b.setAttribute('aria-busy', 'true'); b.disabled = true; b.textContent = 'Creating…';
      const done = text => { b.removeAttribute('aria-busy'); b.disabled = false; b.textContent = text; };
      try {
        const r = await post({ action: 'project-create', name, description: ta.value.trim(), roster: f.roster.value, ship: f.ship.value, github: f.github.checked, startLead: f.lead.checked });
        await refresh().catch(() => {});
        location.hash = `#/p/${encodeURIComponent(r?.alias || name)}/overview`;
        // The project is made even when GitHub said no: say so, the project page shows where its work goes.
        const gh = (r?.steps || []).find(s => /^couldn't create the GitHub repo/.test(s));
        if (gh) toast(`${cap1(gh)}. Work stays on local branches.`, { error: true });
      } catch (x) {
        if (/already exists/.test(x.message)) { done(again ? 'Try again' : 'Create project'); fail.hidden = true; err(`${esc(name)} already exists. Pick another name.`); nm.focus(); return; }
        done('Try again');
        const net = /fetch|network/i.test(x.message);
        fail.innerHTML = `${I('alert')}<span><b>Couldn’t create ${esc(name)}.</b> ${net ? 'Atelier didn’t answer, so nothing was made. Try again.' : `${esc(cap1(x.message))}.`}</span>`;
        fail.hidden = false;
      }
    });
  }
  return { show };
})();

// ---------- keys: Ctrl/⌘ K palette, G then I/O/P/A, ? ----------
// DESIGN Interaction patterns › Keys and the UX page's keyboard table: ⌘K goes anywhere (a project, task, document or
// setting), G then a letter jumps to a place, ? shows the keys. Single keys never act while typing, and no key decides:
// the palette only moves you. The design gives the palette's job but no drawing: it is the confirm dialog's surface
// with the lead menu's 44 px rows (nearest pattern, R-1; DECISIONS).
const Keys = (() => {
  const PLACES = [['inbox', 'Inbox', 'inbox', 'I'], ['office', 'Office', 'office', 'O'], ['projects', 'Projects', 'projects', 'P'], ['activity', 'Activity', 'activity', 'A'], ['new', 'New project', 'plus', ''], ['settings', 'Settings', 'settings', '']];
  const TABS = [['overview', 'Overview'], ['messages', 'Messages', 'lead inbox ask'], ['tasks', 'Tasks'], ['outcomes', 'Outcomes', 'criteria'], ['audits', 'Audits', 'findings'], ['docs', 'Docs', 'documents']];
  const DOCS = [['charter', 'Charter'], ['rulings', 'Rulings'], ['brief', 'Brief'], ['spec', 'Spec'], ['design', 'Design'], ['contracts', 'Contracts'], ['plan', 'Lead’s plan'], ['ledger', 'Lead’s ledger'], ['messages', 'Team messages']];
  // Settings sections, as Settings draws them (keys are its #ss-<key> ids); the third word is what people may type instead.
  const SETS_ALL = [['plan', 'Claude plan', 'limits pace spread window'], ['look', 'Appearance', 'theme dark light'], ['device', 'This device', 'phone token home screen'], ['projects', 'Each project', ''], ['about', 'About', 'version']];
  const SETS_ONE = [['lead', 'Lead', 'start stop restart'], ['gates', 'Approvals', 'gates approve'], ['trust', 'Gating', 'trust'], ['money', 'Money', 'budget spend limit'], ['ship', 'Shipping', 'autonomy merge pull requests'], ['report', 'Reporting', 'digest'], ['read', 'What you read', 'summaries plain technical'], ['team', 'Team', 'roster model roles'], ['numbers', 'Numbers', 'metrics']];
  const GROUPS = ['Go to', 'Projects', 'Tasks', 'Documents', 'Settings'];
  const LIVE = ['needs-you', 'running', 'review', 'planned'];
  const signedOut = () => document.body.classList.contains('is-login') || document.body.hasAttribute('data-signed-out');
  const otherDialog = () => [...document.querySelectorAll('dialog[open]')].some(d => d.id !== 'k-pal' && d.id !== 'k-keys');
  let items = [], shown = [], at = 0, back = null;

  // Everything the palette can open, from the overview already in hand (no read of its own: it opens at once).
  function all() {
    const out = PLACES.map(([k, t, ic, g]) => ({ g: 0, t, href: `#/${k}`, ic, key: g && `G ${g}`, find: '' }));
    for (const p of (state?.projects || []).filter(p => !p.error)) {
      const a = p.alias, h = `#/p/${encodeURIComponent(a)}`;
      out.push({ g: 1, t: a, href: `${h}/overview`, ic: 'projects', sub: `${cap1(p.phase || '')} · Lead ${p.lead?.running ? 'on' : 'off'}`, find: '', top: true });
      for (const [k, t, w] of TABS.slice(1)) out.push({ g: 1, t: `${a} · ${t}`, href: `${h}/${k}`, ic: 'projects', find: w || '' });
      out.push({ g: 1, t: `${a} · Activity`, href: `#/activity?p=${encodeURIComponent(a)}`, ic: 'activity', find: 'events' });
      for (const t of p.tasks || []) {
        const s = taskStatus(t);
        out.push({ g: 2, t: t.title || t.id, href: `#/t/${encodeURIComponent(t.id)}`, ic: s === 'needs-you' ? 'question' : s === 'done' ? 'check' : 'plan', sub: `${t.id} · ${a} · ${STATUS_WORD[s] || s}`, id: t.id, find: '', top: LIVE.includes(s) });
      }
      for (const [k, t] of DOCS) out.push({ g: 3, t, href: `${h}/docs/${k}`, ic: 'log', sub: a, find: 'document' });
      for (const [k, t, w] of SETS_ONE) out.push({ g: 4, t, href: `#/settings?p=${encodeURIComponent(a)}`, sec: k, ic: 'settings', sub: `${a} settings`, find: w });
    }
    for (const [k, t, w] of SETS_ALL) out.push({ g: 4, t, href: '#/settings', sec: k, ic: 'settings', sub: 'Settings for every project', find: w });
    return out;
  }

  // Every word typed must appear somewhere; a name that starts with what you typed comes first.
  function match(q) {
    q = q.trim().toLowerCase();
    if (!q) return items.filter(x => x.g === 0 || x.top).slice(0, 24);
    const words = q.split(/\s+/);
    const scored = [];
    for (const x of items) {
      const name = x.t.toLowerCase(), hay = `${name} ${(x.sub || '').toLowerCase()} ${x.find}`;
      if (!words.every(w => hay.includes(w))) continue;
      const s = x.id === q || name.startsWith(q) ? 0 : name.split(/[\s·-]+/).some(w => w.startsWith(q)) ? 1 : name.includes(q) ? 2 : 3;
      scored.push([s, x]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1].g - b[1].g);
    return scored.slice(0, 50).map(s => s[1]);
  }

  function draw() {
    const q = $('k-q').value;
    shown = match(q);
    at = 0;
    const order = [...new Set(shown.map(x => x.g))];
    shown = order.flatMap(g => shown.filter(x => x.g === g)); // grouped, groups in the order of their best match
    let i = 0;
    $('k-list').innerHTML = shown.length ? order.map(g => `<div role="group" aria-labelledby="k-g${g}"><div class="k-gh" id="k-g${g}" role="presentation">${GROUPS[g]}</div>${shown.filter(x => x.g === g).map(x => {
      const n = i++;
      return `<a class="k-opt" role="option" id="k-o${n}" data-n="${n}" href="${esc(x.href)}" tabindex="-1" aria-selected="${n === 0}">${I(x.ic)}<span class="k-t"><b>${esc(x.t)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>${x.key ? `<span class="k-key" aria-label="Keys: G then ${x.key.slice(2)}">${x.key.split(' ').map(k => `<span class="kbd">${k}</span>`).join('')}</span>` : ''}</a>`;
    }).join('')}</div>`).join('') : `<p class="k-none">Nothing called “${esc(q.trim())}”. Try a project, a task’s name or ID, a document or a setting.</p>`;
    $('k-q').setAttribute('aria-activedescendant', shown.length ? 'k-o0' : '');
    $('k-n').textContent = !q.trim() ? '' : shown.length ? `${shown.length} result${shown.length === 1 ? '' : 's'}` : 'No results';
  }

  function move(d) {
    if (!shown.length) return;
    $(`k-o${at}`)?.setAttribute('aria-selected', 'false');
    at = (at + d + shown.length) % shown.length;
    const o = $(`k-o${at}`);
    o.setAttribute('aria-selected', 'true');
    o.scrollIntoView({ block: 'nearest' });
    $('k-q').setAttribute('aria-activedescendant', o.id);
  }

  function go(x) {
    back = null;
    $('k-pal').close();
    if (location.hash !== x.href) location.hash = x.href;
    if (!x.sec) return $('view')?.focus({ preventScroll: true });
    // A settings section: wait for the page to draw (it draws from the overview, so within a frame or two), then use its own nav.
    const t0 = Date.now();
    const find = () => { const l = document.querySelector(`.sets .s-nav [data-sec="${x.sec}"]`); if (l) l.click(); else if (Date.now() - t0 < 1500) requestAnimationFrame(find); };
    requestAnimationFrame(find);
  }

  function mount() {
    if ($('k-pal')) return;
    document.body.insertAdjacentHTML('beforeend', `<dialog class="k-pal" id="k-pal" aria-label="Go anywhere">
      <div class="k-in">${I('search')}<input class="k-q" id="k-q" type="text" role="combobox" aria-expanded="true" aria-controls="k-list" aria-autocomplete="list" aria-label="Go to a project, task, document or setting" placeholder="Go anywhere" autocomplete="off" autocapitalize="none" spellcheck="false"></div>
      <div class="k-list" id="k-list" role="listbox" aria-label="Places"></div>
      <div class="k-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> to move</span><span><span class="kbd">Enter</span> to open</span><span><span class="kbd">Esc</span> to close</span><span class="sr-only" id="k-n" role="status"></span></div>
    </dialog>
    <dialog class="p-dialog k-keys" id="k-keys" aria-labelledby="k-keys-t"><h2 id="k-keys-t">Keys</h2>
      <dl class="k-dl">
        <dt><span class="kbd">Ctrl</span><span class="kbd">K</span></dt><dd>Go anywhere: a project, task, document or setting (⌘ K on a Mac)</dd>
        <dt><span class="kbd">J</span> <span class="kbd">K</span></dt><dd>Next and previous item in the Inbox</dd>
        <dt><span class="kbd">Enter</span></dt><dd>Open the selected row; in the Inbox, move to the dock</dd>
        <dt><span class="kbd">Ctrl</span><span class="kbd">Enter</span></dt><dd>Send the dock’s main action (with your note)</dd>
        <dt><span class="kbd">Z</span></dt><dd>Undo, while the toast is up</dd>
        <dt><span class="kbd">G</span> then <span class="kbd">I</span> <span class="kbd">O</span> <span class="kbd">P</span> <span class="kbd">A</span></dt><dd>Inbox, Office, Projects, Activity</dd>
        <dt><span class="kbd">Esc</span></dt><dd>Close the palette or a fold; leave a note field</dd>
        <dt><span class="kbd">?</span></dt><dd>Show these keys</dd>
      </dl>
      <p>Single keys never act while you type. No key decides on its own: a decision always goes through the dock.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" data-k-close autofocus>Close</button></div>
    </dialog>`);
    const pal = $('k-pal');
    $('k-q').addEventListener('input', draw);
    pal.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Home' && e.ctrlKey || e.key === 'End' && e.ctrlKey) { e.preventDefault(); move((e.key === 'Home' ? 0 : shown.length - 1) - at); }
      else if (e.key === 'Enter' && shown[at]) { e.preventDefault(); go(shown[at]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pal.close(); } // only the palette: a toast under it stays
      else if (e.key === 'Tab') e.preventDefault(); // one field: arrows move, Tab would leave the dialog's only control
    });
    pal.addEventListener('click', e => {
      const o = e.target.closest('.k-opt');
      if (o && !(e.ctrlKey || e.metaKey || e.shiftKey || e.button)) { e.preventDefault(); go(shown[Number(o.dataset.n)]); return; }
      if (e.target === pal) pal.close(); // a click on the scrim
    });
    pal.addEventListener('close', () => { back?.isConnected && back.focus({ preventScroll: true }); back = null; });
    $('k-keys').addEventListener('click', e => { if (e.target.closest('[data-k-close]') || e.target.id === 'k-keys') $('k-keys').close(); });
  }

  function open() {
    mount();
    const pal = $('k-pal');
    if (pal.open) { $('k-q').select(); return; }
    back = document.activeElement;
    items = all();
    $('k-q').value = '';
    draw();
    pal.showModal();
    $('k-q').focus();
  }

  let gAt = 0;
  document.addEventListener('keydown', e => {
    if (signedOut()) return;
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      if (otherDialog()) return;
      e.preventDefault(); e.stopPropagation();
      $('k-keys')?.open && $('k-keys').close();
      open(); return;
    }
    const el = document.activeElement;
    const typing = el && (['TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName) || el.isContentEditable);
    if (typing || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) { gAt = 0; return; }
    const k = e.key.toLowerCase();
    if (gAt && Date.now() - gAt < 1200) {
      gAt = 0;
      const p = PLACES.find(x => x[3] && x[3].toLowerCase() === k);
      if (p) { e.preventDefault(); e.stopPropagation(); location.hash = `#/${p[0]}`; }
      return;
    }
    gAt = k === 'g' && !e.shiftKey ? Date.now() : 0;
    if (e.key === '?') { e.preventDefault(); mount(); $('k-keys').showModal(); }
  }, true);

  return { open };
})();

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

// Signed out: the server marks the page, so the sign in screen shows without a failed read in the console.
if (document.body.hasAttribute('data-signed-out')) renderLogin();
else { renderLoading(); refresh().catch(() => {}); }
