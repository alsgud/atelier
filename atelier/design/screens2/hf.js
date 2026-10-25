/* D6 high-fi shell: one engine for every screen in screens2/. Reads the data model from ux/wf/wf.js
   (window.ATELIER_MODEL: the UX picks, the one summary, projects, Office), draws the chrome for the current width
   and hands each screen a few helpers. A screen file calls HF.mount({ cur, title, head, body, tabs, after }).
   Query (mockup only): theme=light · motion=reduce · state=loading|empty|error|stale · shot (sticky bars in flow,
   no mock flag) · demo (run the screen's scripted live changes; demo=loop repeats). */
window.HF = (() => {
  const M = window.ATELIER_MODEL;
  const q = new URLSearchParams(location.search);
  const root = document.documentElement;
  root.dataset.theme = q.get('theme') === 'light' ? 'light' : 'dark';
  if (q.get('motion') === 'reduce') root.dataset.motion = 'reduce';
  root.classList.toggle('is-shot', q.has('shot'));
  root.classList.toggle('is-demo', q.has('demo'));
  const state = q.get('state') || '';
  const known = !['loading', 'error'].includes(state); // counts are hidden until the summary arrives (§5)
  /* state=empty is the first run: no projects yet, so no counts and nothing spent (the Inbox's own empty is state=zero) */
  const first = state === 'empty';
  const N = first ? { ...M.NOW, waiting: 0, needs: 0, working: 0, onDuty: 0, today: '$0.00' }
    : q.get('p') === 'tidepool' ? { ...M.NOW, working: M.NOW.working + 1, onDuty: M.NOW.onDuty + 1, today: '$52.64' } : M.NOW; // tidepool's lead is reading
  /* ?p= picks the project on project.html; p=tidepool is the one created a minute ago, so it joins the list */
  const PROJECTS = first ? [] : q.get('p') === 'tidepool' ? [...M.PROJECTS, { id: 'tidepool', lead: true, waiting: 0, today: '$0.04', limit: '$20', line: 'Brief · the lead is drafting the charter' }] : M.PROJECTS;
  const pHref = id => `project.html${id === 'replay' ? '' : '?p=' + id}`;
  const n = v => (known && v ? v : '');
  const N0 = N, known0 = known;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = (n, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const dot = (k, label, live) => `<span class="dot${k ? ' dot-' + k : ''}${live && k === 'active' && state !== 'stale' ? ' is-live' : ''}" role="img" aria-label="${esc(label)}"></span>`;
  const lockup = (size = 20) => `<span class="lockup">${window.mark2('N1', size)}<span class="wm">Atelier</span></span>`;
  const keep = href => { const k = ['theme', 'motion'].filter(p => q.has(p)).map(p => `${p}=${q.get(p)}`).join('&'); return k ? `${href}${href.includes('?') ? '&' : '?'}${k}` : href; };

  /* o (Inbox only): live counts from the page's own list: { now: { waiting, needs }, pw: { project: waiting }, known } */
  function chrome(cur, o = {}) {
    const N = { ...N0, ...(o.now || {}) }, known = o.known ?? known0;
    const pw = p => (o.pw && p.id in o.pw ? o.pw[p.id] : p.waiting);
    const n = v => (known && v ? v : '');
    const curP = p => (cur === p ? ' aria-current="page"' : '');
    const inboxLabel = known ? `Inbox, ${N.waiting} waiting, ${N.needs} need you now` : 'Inbox';
    const side = `
    <aside class="hf-side sidebar" aria-label="Navigation">
      <a class="brand" href="${keep('index.html')}" aria-label="Atelier, all screens">${lockup()}</a>
      <nav class="nav" aria-label="Places">
        <a class="nav-item" href="${keep('inbox.html')}"${curP('inbox')} aria-label="${inboxLabel}">${I('inbox')}Inbox<span class="count is-needs" data-count="waiting">${n(N.waiting)}</span></a>
        <a class="nav-item" href="${keep('office.html')}"${curP('office')} aria-label="Office${n(N.working) && `, ${N.working} working`}">${I('office')}Office<span class="count is-active" data-count="working-label">${n(N.working) && `${N.working} working`}</span></a>
        <a class="nav-item" href="${keep('activity.html')}"${curP('activity')}>${I('activity')}Activity</a>
      </nav>
      <nav class="nav" aria-label="Projects">
        <a class="nav-label" href="${keep('projects.html')}"${curP('projects')}>Projects</a>
        ${PROJECTS.map(p => `<a class="nav-item" href="${keep(pHref(p.id))}"${curP(p.id)} aria-label="${p.id}${n(pw(p)) && `, ${pw(p)} waiting`}, lead ${p.lead ? 'on' : 'off'}">${dot(p.lead ? 'active' : '', p.lead ? 'Lead on' : 'Lead off')}${p.id}<span class="count">${n(pw(p))}</span></a>`).join('')}
        <a class="nav-item" href="${keep('new.html')}"${curP('new')}>${I('plus')}New project</a>
      </nav>
      <div class="sidebar-foot">
        <div class="meter"><div class="meter-head"><span>Claude plan</span><b>${known ? N.plan + '%' : '–'}</b></div><div class="meter-track"><i style="--value:${known ? N.plan : 0}%"></i></div><span class="meter-foot">5‑hour window · resets in ${N.planReset}</span></div>
        <div class="meter"><div class="meter-head"><span>Spent today</span><b>${known ? N.today : '–'}</b></div><span class="meter-foot">${first ? 'No projects yet' : 'replay is at its $40 limit'}</span></div>
        <a class="nav-item" href="${keep('settings.html')}"${curP('settings')} style="margin:0 calc(-1 * var(--space-2))">${I('settings')}Settings</a>
      </div>
    </aside>`;
    const rail = `
    <nav class="hf-rail" aria-label="Navigation">
      <a class="brand" href="${keep('index.html')}" aria-label="Atelier, all screens">${window.mark2('N1', 22)}</a>
      <a href="${keep('inbox.html')}" aria-label="${inboxLabel}"${curP('inbox')}>${I('inbox')}${n(N.waiting) && `<span class="rc is-needs">${N.waiting}</span>`}</a>
      <a href="${keep('office.html')}" aria-label="Office, ${N.working} working"${curP('office')}>${I('office')}${n(N.working) && `<span class="rc is-active" data-count="working">${N.working}</span>`}</a>
      <a href="${keep('activity.html')}" aria-label="Activity"${curP('activity')}>${I('activity')}</a>
      <hr>
      ${PROJECTS.map(p => `<a href="${keep(pHref(p.id))}" aria-label="${p.id}, ${pw(p)} waiting, lead ${p.lead ? 'on' : 'off'}"${curP(p.id)}><span class="ini">${p.id.slice(0, 2)}</span>${dot(p.lead ? 'active' : '', '')}</a>`).join('')}
      <a href="${keep('new.html')}" aria-label="New project"${curP('new')}>${I('plus')}</a>
      <a class="push" href="${keep('settings.html')}" aria-label="Settings, plan ${N.plan}% used, ${N.today} spent today"${curP('settings')}>${I('settings')}</a>
    </nav>`;
    const top = `
    <header class="hf-top">
      <a class="brand" href="${keep('index.html')}" aria-label="Atelier, all screens">${lockup(20)}</a>
      <a class="spend" href="${keep('settings.html')}" aria-label="Spent today ${known ? N.today : 'not known yet'}, plan settings">Today<b class="num">${known ? N.today : '–'}</b></a>
      <a class="gear" href="${keep('settings.html')}" aria-label="Settings">${I('settings')}</a>
    </header>`;
    const tabIs = t => ((t === 'projects' ? ['projects', 'new', ...PROJECTS.map(p => p.id)] : [t]).includes(cur) ? ' aria-current="page"' : '');
    const tabs = `
    <nav class="tabbar hf-tabs" aria-label="Tabs">
      <a href="${keep('inbox.html')}"${tabIs('inbox')} aria-label="${inboxLabel}">${I('inbox')}Inbox${n(N.waiting) && `<span class="badge-n" aria-hidden="true">${N.waiting}</span>`}</a>
      <a href="${keep('office.html')}"${tabIs('office')}>${I('office')}Office</a>
      <a href="${keep('projects.html')}"${tabIs('projects')}>${I('projects')}Projects</a>
      <a href="${keep('activity.html')}"${tabIs('activity')}>${I('activity')}Activity</a>
    </nav>`;
    return { side, rail, top, tabs };
  }

  /* The live line in the page head: fresh, or stale with the time and "Retrying" (§5). */
  const live = () => state === 'stale'
    ? `<span class="hf-live" role="status">${I('refresh')}Last updated ${N.updated} · Retrying</span>`
    : known ? `<span class="hf-live" data-live>Updated just now</span>` : '';

  /* A neutral, self-retrying error inside the page (never red: nothing for the owner to do). */
  const loadError = (what) => `<div class="hf-notice" role="alert">${I('refresh')}<span class="t">${esc(what)} didn’t load. Trying again in 15 s.<small>Your agents keep working while this page is away.</small></span><button class="btn btn-secondary btn-sm" type="button" data-try>Try now</button></div>`;

  function mount(s) {
    const c = chrome(s.cur);
    document.title = `${s.title} · Atelier`;
    const picks = (s.ux || []).map(k => `${k} ${M.UX[k][0]}`).join(' · ');
    document.getElementById('app').innerHTML = `
      <a class="skip btn btn-secondary" href="#main">Skip to content</a>
      <div class="hf" data-state="${state}">${c.side}${c.rail}${c.top}
        <main class="hf-main" id="main" tabindex="-1">
          <header class="hf-head">${s.head}</header>
          ${s.tabs || ''}
          ${s.body}
          <a class="mock-flag" href="${keep('index.html')}" title="Drawn on the recommended UX answers; the owner hasn’t replied yet">PROVISIONAL${picks ? ' · drawn on ' + picks : ''}</a>
        </main>${c.tabs}
      </div>
      <div class="toasts" aria-live="polite"></div>`;
    document.querySelectorAll('[data-try]').forEach(b => b.addEventListener('click', () => { b.setAttribute('aria-busy', 'true'); b.textContent = 'Trying…'; }));
    s.after && s.after();
  }

  /* Change a figure in place (R7): same box, new value rises in. */
  const tick = (el, text) => { if (!el || el.textContent === String(text)) return; el.textContent = text; el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); };
  const setCount = (key, value) => document.querySelectorAll(`[data-count="${key}"]`).forEach(el => tick(el, value));

  return { M, q, state, known, esc, I, dot, lockup, keep, pHref, live, loadError, mount, tick, setCount, chrome };
})();
