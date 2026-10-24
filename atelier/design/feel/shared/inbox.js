/* Inbox, direction B, for the D3 feel variants. One engine, three feels.
   The layout and content are D2's (screens/inbox.html); what changes per variant is motion and finish,
   supplied by the page as window.FEEL (flags) and CSS (the view-transition choreography).
   Every state change that should move goes through transition(kind, update): the browser's View Transitions
   API snapshots before and after and animates only transform and opacity on the compositor.
   Query: theme=light|dark · motion=reduce · open=<id> · state=zero|loading|error · tab=office · fail=1 · shot · demo */
const P = new URLSearchParams(location.search);
const FEEL = Object.assign({ name: 'feel', morph: false, rowNames: true, countNames: false, holdRow: true }, window.FEEL || {});
const theme = P.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const ROOT = document.documentElement;
ROOT.dataset.theme = theme;
const RM = P.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
if (RM) ROOT.dataset.motion = 'reduce';
if (P.has('shot') || P.has('demo')) document.body.classList.add('is-shot');
const I = (n, c) => icon(n, c);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mark = '<span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
const IMG = '../../screens/img/';
const tok = v => parseFloat(getComputedStyle(ROOT).getPropertyValue(v)) || 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
/* A view-transition name, unless motion is reduced (then the whole page cross-fades once, nothing travels). */
const vt = (name, cls = '') => RM ? '' : ` style="view-transition-name:${name}${cls ? `;view-transition-class:${cls}` : ''}"`;
const wide = () => matchMedia('(min-width: 1024px)').matches;

/* ── Real content from the real projects (replay, dodge, atelier-ui). Typographic quotes and apostrophes. ── */
const ITEMS = [
  { id: 'finding', needs: true, glyph: 'finding', kind: 'From the auditor', project: 'replay', age: '25m', ageLong: '25 min ago',
    title: 'Some of your clips may need a paid Windows add‑on to play',
    short: 'from the auditor',
    body: () => `
      <p class="lede">Clips Medal saves in HEVC only play if Windows has Microsoft’s $0.99 HEVC add‑on. You asked for free components only, and this is cheap to fix now.</p>
      <dl class="facts">
        <dt>If nobody fixes it</dt><dd>On a PC without the add‑on, those clips say “can’t play” in the feed.</dd>
        <dt>To change later</dt><dd>Costly: the player would be rebuilt after the feed is done.</dd>
      </dl>
      <details class="details"><summary>${I('chevron-down')}Technical details</summary><div class="details-body">
        <span>Criterion <code>AC-34</code>: H.264, HEVC and AV1 in MP4 or MKV play with no paid codec extension.</span>
        <span>The playback spike passed with <code>hwdec=no</code>, but the app spec lets HEVC fall back to the Windows decoder.</span></div></details>`,
    dock: { note: 'Add a note for the lead (optional)', primary: 'Yes, fix it', busy: 'Sending…', secondary: 'No, it’s fine', done: 'Sent. The lead plans the fix.', toast: 'Asked the team to fix it.', log: 'Asked the team to fix the paid add‑on problem',
      alt: { done: 'Sent. The lead leaves it as it is.', toast: 'Told the lead it can stay.', log: 'Kept the HEVC fallback as it is' } } },

  { id: 'budget', needs: true, glyph: 'budget', kind: 'Budget', project: 'replay', age: '1h', ageLong: '1 h ago',
    title: 'Replay has used today’s $40, so new work is paused',
    short: 'budget',
    body: () => `
      <p class="lede">The two tasks already running finish their current step. Nothing new starts until you raise the limit, or until midnight.</p>
      <div class="meter" style="max-width:var(--measure)"><div class="meter-head"><span>Spent today</span><b>$40.00 of $40</b></div><div class="meter-track is-full"><i style="--value:100%"></i></div></div>
      <dl class="facts is-money">
        <dt>Trim editor</dt><dd class="num">$18.40</dd>
        <dt>Thumbnail indexing</dt><dd class="num">$9.10</dd>
        <dt>Reviews</dt><dd class="num">$6.30</dd>
        <dt>The lead</dt><dd class="num">$6.20</dd>
      </dl>`,
    dock: { primary: 'Raise today to $60', busy: 'Raising…', ghost: 'Budget settings', hint: 'Or do nothing: work resumes at midnight', done: 'Raised to $60. Work starts again.', toast: 'Raised replay’s limit to $60 for today.', log: 'Raised replay’s limit to $60 for today' } },

  { id: 'design', glyph: 'design', kind: 'Design to approve', project: 'replay', age: '2h', ageLong: '2 h ago',
    title: 'Approve the look of Replay',
    short: 'design',
    body: () => `
      <p class="lede">The designer drew 13 screens in the gamer style you asked for: dark, orange only for actions, the clips large. These three carry the most.</p>
      <div class="frames is-hero">
        ${frame('replay-home.png', 'Home')}
        ${frame('replay-trim.png', 'Cut clips')}
        ${frame('replay-feed.png', 'Feed · phone', 'is-phone')}
        <a href="#" class="frame frame-more" aria-label="See all 13 screens, opens in a new tab"><span class="frame-img"><b>+10</b>more screens</span><span class="frame-cap"><b>Everything else</b><span>Open ${I('external')}</span></span></a>
      </div>
      <div class="links"><a href="#">${I('external')}Open all 13 screens</a><a href="#">${I('log')}Read the design notes</a></div>`,
    dock: { note: 'Your decision, in your own words', required: 'Say what you approve in a few words. It goes to the designer.', primary: 'Approve design', busy: 'Approving…', secondary: 'Skip this phase', done: 'Approved. The designer starts on the rest.', toast: 'Approved the look of Replay.', log: 'Approved the look of Replay',
      alt: { done: 'Skipped. The team builds from the brief.', toast: 'Skipped the design phase for Replay.', log: 'Skipped the design phase for Replay' } } },

  { id: 'question', glyph: 'question', kind: 'Question', project: 'replay', age: '2h', ageLong: '2 h ago',
    title: 'Should hidden clips stay out of Throwbacks too?',
    short: 'question',
    body: () => `
      <blockquote class="quote" style="margin:0">Throwbacks shows clips from this week in past years. Hidden clips already stay out of the feed and out of sight when you show the app to others. Should Throwbacks follow the same rule?<footer>Frontend, building the Throwbacks row on Home</footer></blockquote>
      <fieldset class="choices" style="max-width:var(--measure)"><legend class="section-label" style="margin-bottom:var(--space-2)">Suggested answers</legend>
        <label class="choice"><input type="radio" name="ans"> Yes, keep them out</label>
        <label class="choice"><input type="radio" name="ans"> No, include them</label>
      </fieldset>`,
    dock: { note: 'Or write your own answer', primary: 'Send answer', busy: 'Sending…', ghost: 'Open the task', done: 'Answered. The frontend carries on.', toast: 'Answered the frontend.', log: 'Answered: hidden clips and Throwbacks' } },

  { id: 'proof', glyph: 'proof', kind: 'Your judgement', project: 'dodge', age: '3h', ageLong: '3 h ago',
    title: 'Play a round and say whether dodging feels fair',
    short: 'your judgement',
    body: () => `
      <p class="lede">Shown working: the tester played 40 rounds at a steady 60 fps. A hit only counts when a bullet touches the dot you steer, not the glow around it.</p>
      <div class="frames is-hero">
        ${frame('dodge-play.png', 'A round, mid‑spiral', '', '0:42')}
        ${frame('dodge-results.png', 'Results after the round')}
        ${frame('dodge-play-phone.png', 'On a phone', 'is-phone')}
      </div>
      <div class="links"><a href="#">${I('external')}Play it yourself</a><a href="#">${I('log')}Run log · 40 rounds</a></div>`,
    dock: { note: 'If you reject it, say what’s wrong', rejectNeedsNote: true, primary: 'Accept', busy: 'Accepting…', secondary: 'Reject', done: 'Accepted. Marked as met.', toast: 'Accepted: dodging feels fair.', log: 'Accepted: dodging feels fair',
      alt: { done: 'Rejected. The team fixes it and asks again.', toast: 'Rejected: dodging doesn’t feel fair yet.', log: 'Rejected: dodging doesn’t feel fair yet' } } },

  { id: 'outcome', glyph: 'outcome', kind: 'Outcome to approve', project: 'atelier-ui', age: '5h', ageLong: '5 h ago',
    title: 'Approve an outcome: it works well on your phone, not just your desk',
    short: 'outcome',
    body: () => `
      <blockquote class="quote" style="margin:0">It works well on my phone, not just on my desk.<footer>Your words, from the brief</footer></blockquote>
      <p class="lede">The lead checks it like this: 360 px wide, no sideways scrolling, and every button big enough to tap.</p>`,
    dock: { primary: 'Approve', busy: 'Approving…', secondary: 'Retire it', done: 'Approved. The lead adds it to the checks.', toast: 'Approved the outcome.', log: 'Approved an outcome: works well on your phone',
      alt: { done: 'Retired. The lead drops it from the checks.', toast: 'Retired the outcome.', log: 'Retired an outcome: works well on your phone' } } },

  { id: 'plan', glyph: 'plan', kind: 'Task plan', project: 'dodge', age: '1d', ageLong: 'yesterday',
    title: 'Start the last Dodge task: a full play‑through and a build to share',
    short: 'task plan',
    body: () => `
      <p class="lede">The integration builder plays the game end to end, fixes what breaks and makes a build your friends can open. Up to 6 rounds of work, about $15.</p>
      <details class="details"><summary>${I('chevron-down')}What it will change</summary><div class="details-body">
        <span>Owns <code>src/main.ts</code>, <code>README.md</code> and the build config. Done when <code>npm run build</code> passes and a recorded play‑through reaches the results screen.</span></div></details>`,
    dock: { primary: 'Approve plan', busy: 'Approving…', ghost: 'Read the brief', done: 'Approved. The builder starts within a minute.', toast: 'Approved the plan.', log: 'Approved the last Dodge task' } },
];
/* Working now: real figures that tick while you watch (R7 live refresh). */
const WORKING = [
  { id: 'trim', what: 'Building the trim editor', meta: 'replay · frontend', when: 'finishing its step', n: 4, of: 6, unit: 'step' },
  { id: 'thumbs', what: 'Indexing clip thumbnails', meta: 'replay · backend', when: '1 min ago', n: 1240, of: 1800, unit: 'clips' },
  { id: 'inbox', what: 'Drawing the Inbox in direction B', meta: 'atelier-ui · designer', when: 'just now', n: 1, of: 2, unit: 'round' },
];
const fmt = n => n.toLocaleString('en-US');
const figure = a => a.unit === 'step' ? `step ${a.n} of ${a.of}` : a.unit === 'round' ? `critique round ${a.n} of ${a.of}` : `${fmt(a.n)} of ${fmt(a.of)} ${a.unit}`;
const EARLIER = [['Approved the look of Dodge', 'dodge', '6h']];
const SPENT = '$52.60';

function frame(file, cap, cls = '', play = '') {
  return `<a href="#" class="frame ${cls}" aria-label="${esc(cap)}, opens full size in a new tab">
    <span class="frame-img"><img src="${IMG}${file}" alt="" decoding="async">${play ? `<span class="play">${I('play')}Recording ${play}</span>` : ''}</span>
    <span class="frame-cap"><b>${esc(cap)}</b><span>Open ${I('external')}</span></span></a>`;
}

/* ── State ── */
const S = {
  view: P.get('state') || 'items',  // items | zero | loading | error
  tab: P.get('tab') || 'inbox',     // inbox | office (the tab switch; Office's own screen comes next)
  items: ITEMS.slice(),
  open: P.get('open') || ITEMS[0].id,
  dock: 'ready',                     // ready | sending | failed | sent | invalid
  decided: [],                       // { what, project, age, id }, newest first
  note: '',
};
if (S.view === 'zero') { S.items = []; S.decided = ITEMS.map((x, i) => ({ what: x.dock.log, project: x.project, age: ['2m', '4m', '7m', '9m', '12m', '15m', '18m'][i] })); }
const ledger = () => S.decided.concat(EARLIER.map(([what, project, age]) => ({ what, project, age })));
const budgetHit = () => S.items.some(x => x.id === 'budget');
const needsN = () => S.items.filter(x => x.needs).length;
/* The title of an item lives in exactly one place: the focus (open), its queue row, or the ledger (decided).
   Flow names it t-<id> wherever it is, so the browser flies it from one place to the next. */
const tname = id => FEEL.morph && wide() ? `t-${id}` : '';

/* ── Chrome ── */
function chrome() {
  const n = S.items.length, u = needsN(), zero = !n;
  const loading = S.view === 'loading' || S.view === 'error';
  const cn = FEEL.countNames ? vt('count-side') : '', cn2 = FEEL.countNames ? vt('count-tab') : '', cn3 = FEEL.countNames ? vt('count-badge') : '';
  const count = n && !loading ? `<span class="count ${u ? 'is-needs' : ''}" aria-hidden="true"${cn}>${n}</span>` : '';
  const inboxLabel = n && !loading ? `Inbox, ${n} waiting${u ? `, ${u} need you now` : ''}` : 'Inbox';
  const cur = t => S.tab === t ? 'aria-current="page"' : '';
  const proj = [['replay', true], ['atelier-ui', true], ['dodge', false]].map(([p, on]) => [p, on, S.items.filter(x => x.project === p).length]);
  document.getElementById('side').innerHTML = `
    <span class="brand">${mark}Atelier</span>
    <nav class="nav" aria-label="Main">
      <a class="nav-item" ${cur('inbox')} href="#" data-tab="inbox" aria-label="${inboxLabel}">${I('inbox')}Inbox${count}</a>
      <a class="nav-item" ${cur('office')} href="#" data-tab="office">${I('office')}Office<span class="count is-active">3 working</span></a>
      <a class="nav-item" href="#">${I('activity')}Activity</a>
    </nav>
    <nav class="nav" aria-label="Projects"><span class="nav-label">Projects</span>
      ${proj.map(([p, on, c]) => `<a class="nav-item" href="#"><span class="dot ${on ? 'dot-active is-live' : ''}" role="img" aria-label="${on ? 'Lead on, working' : 'Lead on, nobody working'}"></span>${p}${!zero && !loading && c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}
      <a class="nav-item" href="#">${I('plus')}New project</a>
    </nav>
    <div class="sidebar-foot">
      <div class="meter"><div class="meter-head"><span>Claude plan</span><b>41%</b></div><div class="meter-track" role="img" aria-label="41% of the 5-hour window used"><i style="--value:41%"></i></div><span class="meter-foot">5‑hour window · resets in 2 h 10 min</span></div>
      <div class="meter"><div class="meter-head"><span>Spent today</span><b>${SPENT}</b></div><span class="meter-foot">${budgetHit() ? 'replay is at its $40 limit' : 'Every project within its budget'}</span></div>
      <a class="nav-item" href="#" style="margin:0 calc(-1 * var(--space-2))">${I('settings')}Settings</a>
    </div>`;
  document.getElementById('top').innerHTML = `
    <span class="brand">${mark}Atelier</span>
    <nav class="tabs" aria-label="Main"><a class="tab" ${cur('inbox')} href="#" data-tab="inbox" aria-label="${inboxLabel}">Inbox ${count.replace(cn, cn2)}</a><a class="tab" ${cur('office')} href="#" data-tab="office">Office</a><a class="tab" href="#">Projects</a><a class="tab" href="#">Activity</a></nav>
    <span class="topbar-status"><span>Plan <b>41%</b></span><span>Today <b>${SPENT}</b></span></span>`;
  document.getElementById('tabs').innerHTML = `
    <a ${cur('inbox')} href="#" data-tab="inbox" aria-label="${inboxLabel}">${I('inbox')}Inbox${count ? `<span class="badge-n ${u ? '' : 'is-quiet'}" aria-hidden="true"${cn3}>${n}</span>` : ''}</a>
    <a ${cur('office')} href="#" data-tab="office">${I('office')}Office</a><a href="#">${I('projects')}Projects</a><a href="#">${I('activity')}Activity</a>`;
  document.title = n ? `(${n}) Inbox · Atelier` : 'Inbox · Atelier';
}

/* ── Main ── */
function qitem(x) {
  const cur = x.id === S.open, t = !cur && tname(x.id);
  return `<a href="?open=${x.id}" class="qitem" data-id="${x.id}" ${cur ? 'aria-current="true"' : ''}${FEEL.rowNames ? vt(`q-${x.id}`, 'row') : ''} aria-label="${esc(x.title)}. ${x.project}, ${x.short}, ${x.ageLong}${x.needs ? '. Needs you now' : ''}">
    <span class="qitem-glyph">${I(x.glyph)}</span><span class="qitem-title"${t ? vt(t, 'title') : ''}>${esc(x.title)}</span>
    <span class="qitem-side">${x.needs ? '<span class="dot dot-needs" role="img" aria-label="Needs you now"></span>' : ''}<span class="qitem-age">${x.age}</span></span>
    <span class="qitem-meta">${x.project}<span class="sep"> · </span>${x.short}</span></a>`;
}
function agent(a) {
  const v = a.n / a.of;
  return `<a href="#" class="agent" data-agent="${a.id}" aria-label="${a.what}. ${a.meta}. ${figure(a)}"><span class="agent-dot"><span class="dot dot-active is-live" role="img" aria-label="Working"></span></span><span class="agent-what">${a.what}</span><span class="agent-meta">${a.meta} · <span class="when">${a.when}</span></span><span class="agent-progress"><span class="track"><i style="--v:${v.toFixed(4)}"></i></span><span class="fig">${figure(a)}</span></span></a>`;
}
const agents = () => WORKING.map(agent).join('');
function ledgerRows(rows) {
  return rows.map(r => { const t = r.id && tname(r.id); return `<a href="#" class="ledger-row"${r.id && FEEL.rowNames ? vt(`l-${r.id}`, 'row') : ''}>${I('check')}<span class="what"${t ? vt(t, 'title') : ''}>${esc(r.what)}</span><span class="qitem-age">${r.age}</span><span class="meta">${r.project}</span></a>`; }).join('');
}
function queue() {
  const now = S.items.filter(x => x.needs), later = S.items.filter(x => !x.needs), L = ledger();
  const g = n => FEEL.rowNames ? vt(n, 'row') : '';
  return `<aside class="queue" aria-label="Waiting on you">
    ${now.length ? `<div class="queue-group"><div class="queue-head is-needs"${g('h-now')}><span>Needs you now</span><span class="n">${now.length}</span></div>${now.map(qitem).join('')}</div>` : ''}
    ${later.length ? `<div class="queue-group"><div class="queue-head"${g('h-later')}><span>When you have a minute</span><span class="n">${later.length}</span></div>${later.map(qitem).join('')}</div>` : ''}
    <div class="queue-group is-ledger"><div class="queue-head"${g('h-done')}><span>Decided today</span><span class="n">${L.length}</span></div><div class="ledger">${ledgerRows(L.slice(0, 3))}</div>${L.length > 3 ? `<a href="#" class="ledger-more"${g('l-more')}>${L.length - 3} more today</a>` : ''}</div>
    <div class="queue-group"><div class="queue-head"${g('h-work')}><span>Working now</span><span class="n">${WORKING.length}</span></div>${agents()}</div>
  </aside>`;
}
function dock(x) {
  const d = x.dock, st = S.dock, alt = S.which === 'secondary';
  if (st === 'sent') return `<div class="dock is-sent" role="status"${vt('dock')}><div class="dock-row"><span class="dock-msg is-done"><span class="tick">${I('check')}</span>${(alt && d.alt || d).done}</span></div></div>`;
  const sending = st === 'sending', failed = st === 'failed', invalid = st === 'invalid';
  const field = d.note ? `<textarea class="input" id="note" rows="1" aria-label="${esc(d.note)}" placeholder="${esc(d.note)}" ${sending ? 'disabled' : ''} ${invalid ? 'aria-invalid="true" aria-describedby="noteErr"' : ''}>${esc(S.note)}</textarea>` : '';
  const err = invalid ? `<span class="field-error" id="noteErr">${I('alert')}${esc(d.required || 'Say what’s wrong so the team can fix it.')}</span>` : '';
  const primary = `<button class="btn btn-primary" data-act="primary" ${sending ? (alt ? 'disabled' : 'aria-busy="true"') : ''}><span class="lbl">${sending && !alt ? d.busy : failed && !alt ? 'Try again' : d.primary}</span></button>`;
  const second = d.secondary ? `<button class="btn btn-secondary" data-act="secondary" ${sending ? (alt ? 'aria-busy="true"' : 'disabled') : ''}><span class="lbl">${sending && alt ? 'Sending…' : failed && alt ? 'Try again' : d.secondary}</span></button>` : '';
  const ghost = d.ghost ? `<a class="btn btn-ghost" href="#">${d.ghost}</a>` : '';
  const msg = failed ? `<span class="dock-msg is-error" role="alert">${I('alert')}Couldn’t reach Atelier. Nothing was sent.</span>`
    : d.hint ? `<span class="dock-hint">${d.hint}</span>` : d.note ? `<span class="dock-hint"><span class="kbd">Ctrl</span><span class="kbd">↵</span> to send</span>` : '';
  return `<div class="dock" aria-label="Your decision" role="group"${vt('dock')}>${field ? `<div class="field">${field}${err}</div>` : ''}<div class="dock-row">${primary}${second}${ghost}${msg}</div></div>`;
}
function head() {
  if (S.tab === 'office') return `<header class="page-head"${vt('head')}><h1>Office</h1><span class="summary">3 working · nothing stuck</span></header>`;
  const n = S.items.length, u = needsN();
  const i = S.items.findIndex(x => x.id === S.open);
  const pager = n && S.view === 'items' ? `<div class="pager"><span class="of num">${i + 1} of ${n}</span>
    <button class="btn btn-ghost btn-icon btn-sm" data-go="-1" aria-label="Previous item">${I('chevron-left')}</button>
    <button class="btn btn-ghost btn-icon btn-sm" data-go="1" aria-label="Next item">${I('chevron-right')}</button>
    <span class="hint"><span class="kbd">J</span><span class="kbd">K</span> to move</span></div>` : '';
  const summary = S.view === 'loading' ? 'Loading…' : S.view === 'error' ? '' : n ? `${n} waiting${u ? ` · <span class="is-needs">${u} need${u === 1 ? 's' : ''} you now</span>` : ''}` : 'Nothing waiting';
  return `<header class="page-head"${vt('head')}><h1>Inbox</h1><span class="summary num">${summary}</span>${pager}</header>`;
}
function draw() {
  chrome();
  const main = document.getElementById('main');
  main.dataset.view = S.tab === 'office' ? 'office' : S.items.length || S.view !== 'items' ? S.view : 'zero';
  if (S.tab === 'office') {
    main.innerHTML = head() + `<div class="inbox"><section class="focus"${vt('page')}><div class="office">
      <div class="focus-head"><div class="eyebrow"><span class="kind">${I('office')}Office</span><span class="sep">·</span><span>three projects</span></div><h2 class="title-display" id="ttl" tabindex="-1">Three agents are working. Nothing is stuck.</h2></div>
      <div class="office-list">${agents()}</div>
      <p class="faint office-note">Office gets its own screen in the next design task, in the feel you choose. This view is here to show the tab switch.</p></div></section>
      <aside class="queue" aria-label="Today"><div class="queue-group"><div class="queue-head"><span>Decided today</span><span class="n">${ledger().length}</span></div><div class="ledger">${ledgerRows(ledger())}</div></div></aside></div>`;
    return;
  }
  if (S.view === 'loading') {
    const sk = (w, h = 12) => `<span class="skeleton" style="width:${w};height:${h}px"></span>`;
    main.innerHTML = head() + `<div class="inbox" aria-busy="true"><section class="focus"><div class="focus-head">${sk('40%')}${sk('70%', 28)}${sk('55%', 28)}</div><div class="focus-body">${sk('90%', 14)}${sk('75%', 14)}<div class="frames is-hero"><div class="frame is-loading"><span class="frame-img"></span></div><div class="frame is-loading"><span class="frame-img"></span></div><div class="frame is-loading"><span class="frame-img"></span></div></div></div></section>
      <aside class="queue" aria-label="Waiting on you"><div class="queue-group">${Array.from({ length: 5 }, () => `<div class="qitem is-skeleton"><span class="skeleton" style="width:28px;height:28px"></span><span class="skeleton" style="height:12px;width:85%;margin-top:4px"></span><span></span><span class="qitem-meta"><span class="skeleton" style="height:10px;width:45%;margin-top:6px"></span></span></div>`).join('')}</div></aside></div>`;
    return;
  }
  if (S.view === 'error') {
    main.innerHTML = head() + `<div class="inbox"><section class="focus"><div class="banner" role="alert">${I('alert')}<span>The Inbox didn’t load. Trying again in 15 s.</span><span class="spacer"></span><button class="btn btn-secondary" data-act="retry">Try now</button></div>
      <p class="lede">Your agents keep working while the dashboard is away; nothing is lost.</p></section><aside class="queue" aria-label="Waiting on you"><p class="faint" style="padding:0 var(--space-3);font-size:var(--text-sm)">The list comes back when the Inbox loads.</p></aside></div>`;
    return;
  }
  if (!S.items.length) {
    main.innerHTML = head() + `<div class="inbox"><section class="focus"><div class="zero">
      <div class="empty"${vt('empty')}><span class="empty-mark"><span class="tick">${I('check')}</span>All caught up</span><h2 class="empty-title" tabindex="-1" id="ttl">Nothing needs you.</h2><p>Three agents are working on their own. Anything that needs you will show up here.</p></div>
      <div class="queue-group zero-group"${vt('zero-work')}><div class="queue-head" style="padding:0"><span>Working now</span><span class="n">${WORKING.length}</span></div><div class="zero-working">${agents()}</div></div></div></section>
      <aside class="queue" aria-label="Today"><div class="queue-group"><div class="queue-head"${FEEL.rowNames ? vt('h-done', 'row') : ''}><span>You decided today</span><span class="n">${ledger().length}</span></div><div class="ledger">${ledgerRows(ledger())}</div></div></aside></div>`;
    return;
  }
  const x = S.items.find(y => y.id === S.open) || S.items[0];
  S.open = x.id;
  const t = tname(x.id);
  main.innerHTML = head() + `<div class="inbox">
    <section class="focus" aria-labelledby="ttl">
      <div class="focus-head"${vt('ih')}>
        <div class="eyebrow">${x.needs ? `<span class="is-needs"><span class="dot dot-needs"></span>Needs you now</span><span class="sep">·</span>` : ''}<span class="kind">${I(x.glyph)}${x.kind}</span><span class="sep">·</span><span>${x.project}</span><span class="sep">·</span><span>${x.ageLong}</span></div>
        <h2 class="title-display" id="ttl" tabindex="-1"${t ? vt(t, 'title') : ''}>${esc(x.title)}</h2>
      </div>
      <div class="focus-body"${vt('ib')}>${x.body()}</div>
      ${dock(x)}
    </section>
    ${queue()}
  </div>`;
}
function render() { draw(); placeToast(); }

/* ── Transitions ── */
let busy = Promise.resolve();
/* kind: open | next | prev | decide | undo | tab | zero | retry. The page CSS styles html[data-vt="<kind>"]. */
function transition(kind, update, dir = 0) {
  const run = () => {
    if (!document.startViewTransition) { update(); render(); return Promise.resolve(); }
    ROOT.dataset.vt = kind; ROOT.dataset.dir = dir > 0 ? 'fwd' : dir < 0 ? 'back' : '';
    const t = document.startViewTransition(() => { update(); render(); });
    return t.finished.catch(() => {}).finally(() => { delete ROOT.dataset.vt; delete ROOT.dataset.dir; FEEL.after?.(kind); });
  };
  busy = busy.then(run);
  return busy;
}
function focusTitle() { document.getElementById('ttl')?.focus({ preventScroll: true }); }
function go(d) {
  const i = S.items.findIndex(x => x.id === S.open);
  transition(d > 0 ? 'next' : 'prev', () => { S.open = S.items[(i + d + S.items.length) % S.items.length].id; S.dock = 'ready'; S.note = ''; }, d).then(focusTitle);
}
function openItem(id) {
  if (id === S.open) return;
  const i = S.items.findIndex(x => x.id === S.open), j = S.items.findIndex(x => x.id === id);
  transition('open', () => { S.open = id; S.dock = 'ready'; S.note = ''; scrollTo({ top: 0 }); }, j - i).then(focusTitle);
}
function switchTab(tab) {
  if (tab === S.tab) return;
  closeToast();
  transition('tab', () => { S.tab = tab; scrollTo({ top: 0 }); }, tab === 'office' ? 1 : -1).then(focusTitle);
}

/* ── Toast ── */
let toastTimer;
function toast(text, undo) {
  const t = document.createElement('div');
  t.className = 'toast toast-success'; t.setAttribute('role', 'status');
  t.innerHTML = `<span class="tick">${I('check')}</span><span class="toast-text">${esc(text)}</span>${undo ? '<button class="toast-action" data-act="toast-undo">Undo<span class="kbd">Z</span></button>' : ''}<span class="toast-life" aria-hidden="true"></span>`;
  const box = document.getElementById('toasts'); box.innerHTML = ''; box.append(t);
  placeToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => closeToast(), 6000);
}
function closeToast(now) {
  const box = document.getElementById('toasts'), t = box.firstChild;
  clearTimeout(toastTimer);
  if (!t) return;
  if (now || RM) { box.innerHTML = ''; placeToast(); return; }
  t.classList.add('is-leaving');
  setTimeout(() => { if (t.parentNode) { t.remove(); placeToast(); } }, tok('--dur-base') || 200);
}
/* D2 rule: the toast anchors to the dock (centred, as wide, --space-2 above it, or below when there's no room)
   and never covers a dock button or a tab. No dock: the CSS default. */
function placeToast() {
  const box = document.getElementById('toasts'), dk = document.querySelector('.focus .dock');
  if (!box.firstChild || !dk) { box.removeAttribute('data-anchor'); ['--toast-x', '--toast-w', '--toast-top'].forEach(v => box.style.removeProperty(v)); return; }
  const gap = tok('--space-2'), r = dk.getBoundingClientRect();
  box.style.setProperty('--toast-x', `${r.left + r.width / 2}px`); box.style.setProperty('--toast-w', `${r.width}px`);
  const bar = s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); return cs.display === 'none' || !['sticky', 'fixed'].includes(cs.position) ? null : e.getBoundingClientRect(); };
  const topLimit = Math.max(0, ...['.shell-top', '.page-head'].map(bar).filter(Boolean).map(b => b.bottom));
  const tabs = bar('.shell-tabs'), bottomLimit = tabs ? tabs.top : innerHeight;
  const h = box.offsetHeight, above = r.top - gap - h, below = r.bottom + gap;
  const top = above >= topLimit + gap ? above : below + h <= bottomLimit - gap ? below : topLimit + gap;
  box.style.setProperty('--toast-top', `${Math.round(top)}px`); box.setAttribute('data-anchor', '');
}
addEventListener('scroll', placeToast, { passive: true });
addEventListener('resize', placeToast);
document.addEventListener('input', placeToast);

/* ── Deciding: press → sending (the button says the verb) → sent, shown in place (the hold) → the item goes,
   the next arrives (one transition) → the toast with Undo. ── */
let last = null, failOnce = P.has('fail'), deciding = false;
async function decide(which) {
  const x = S.items.find(y => y.id === S.open);
  if (!x || deciding) return;
  const note = document.getElementById('note')?.value.trim() || '';
  S.note = note;
  closeToast(true);
  if ((x.dock.required && which === 'primary' && !note) || (x.dock.rejectNeedsNote && which === 'secondary' && !note)) {
    S.dock = 'invalid'; render(); FEEL.invalid?.(); document.getElementById('note').focus(); return;
  }
  deciding = true;
  S.which = which; S.dock = 'sending'; render();
  await wait(Number(P.get('latency') || 480));
  if (failOnce) { failOnce = false; S.dock = 'failed'; render(); FEEL.failed?.(); deciding = false; return; }
  S.dock = 'sent'; render();
  document.querySelector(`.qitem[data-id="${x.id}"]`)?.classList.add('is-done');
  FEEL.sent?.(x);
  await wait(tok('--dur-hold') || 560);
  const r = which === 'secondary' && x.dock.alt || x.dock;
  let next;
  await transition(S.items.length === 1 ? 'zero' : 'decide', () => {
    const i = S.items.indexOf(x);
    last = { x, i };
    S.items.splice(i, 1);
    S.decided.unshift({ what: r.log, project: x.project, age: 'now', id: x.id });
    S.open = (S.items[i] || S.items[0] || {}).id; S.dock = 'ready'; S.note = ''; S.which = '';
    next = S.items.find(y => y.id === S.open);
    scrollTo({ top: 0 });   // the next item opens at its top, at every width
  }, 1);
  deciding = false;
  toast(next ? `${r.toast} Next: ${next.title}` : `${r.toast} That was the last one.`, true);
  focusTitle();
}
function undo() {
  if (!last) return;
  const l = last; last = null;
  closeToast(true);
  transition('undo', () => { S.items.splice(l.i, 0, l.x); S.open = l.x.id; S.decided.shift(); S.dock = 'ready'; scrollTo({ top: 0 }); }, -1).then(focusTitle);
}

document.addEventListener('click', e => {
  const q = e.target.closest('.qitem[data-id]'), g = e.target.closest('[data-go]'), a = e.target.closest('[data-act]'), tb = e.target.closest('[data-tab]');
  if (tb) { e.preventDefault(); switchTab(tb.dataset.tab); return; }
  if (q) { e.preventDefault(); openItem(q.dataset.id); return; }
  if (g) { go(Number(g.dataset.go)); return; }
  if (e.target.closest('a[href="#"]')) e.preventDefault();
  if (!a) return;
  const act = a.dataset.act;
  if (act === 'primary' || act === 'secondary') decide(act);
  if (act === 'toast-undo') undo();
  if (act === 'retry') transition('retry', () => { S.view = 'items'; });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('toasts').firstChild) { closeToast(); return; }
  const typing = ['TEXTAREA', 'INPUT'].includes(document.activeElement?.tagName);
  if (typing && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); decide('primary'); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'z' && last && document.getElementById('toasts').firstChild) { undo(); return; }
  if (S.tab !== 'inbox' || S.view !== 'items' || !S.items.length) return;
  if (k === 'j') go(1); if (k === 'k') go(-1);
});

/* ── Live: Working now ticks (R7). Only the changed figure and bar update in place; nothing re-renders. ── */
function tickAgent(id) {
  const a = WORKING.find(w => w.id === id); if (!a || a.n >= a.of) return;
  a.n = a.unit === 'clips' ? Math.min(a.of, a.n + 40) : a.n + 1; a.when = 'just now';
  document.querySelectorAll(`.agent[data-agent="${id}"]`).forEach(el => {
    el.querySelector('.track i').style.setProperty('--v', (a.n / a.of).toFixed(4));
    el.querySelector('.fig').textContent = figure(a);
    el.querySelector('.when').textContent = a.when;
    el.setAttribute('aria-label', `${a.what}. ${a.meta}. ${figure(a)}`);
    el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick');
    FEEL.tick?.(el, a);
  });
}
window.ATELIER = { S, tickAgent, decide, undo, go, openItem, switchTab, transition };
if (!P.has('demo')) setInterval(() => tickAgent('thumbs'), 4000);

render();
FEEL.boot?.();

const link = (k, v, l) => { const q = new URLSearchParams(P); q.delete('shot'); v === null ? q.delete(k) : q.set(k, v); return `<a href="?${q}">${l}</a>`; };
document.getElementById('mock').innerHTML = link('theme', theme === 'dark' ? 'light' : 'dark', theme === 'dark' ? 'Light' : 'Dark')
  + link('motion', RM ? null : 'reduce', RM ? 'Full motion' : 'Reduced motion')
  + link('state', null, 'Items') + link('state', 'zero', 'Inbox zero') + link('state', 'loading', 'Loading') + link('fail', '1', 'Next send fails')
  + '<a href="../index.html">All three feels</a>';
