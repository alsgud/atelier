/* D5 UX walkthrough: renders the repeated parts of index.html from ia.js, refs.js, flows.js and decisions.js.
   Figures are the D3 mockup's (feel/shared/inbox.js): 7 waiting, 2 need you now, 3 working, $52.60 today, plan 41 %. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = (n, cls = 'icon') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const lockup = (size = 20) => `<span class="lockup" style="font-size:${size <= 20 ? 'var(--text-base)' : 'var(--text-lg)'}">${window.mark2('N1', size)}<span class="wm">Atelier</span></span>`;
  /* Turn "UX-3" in text into a link to the decision */
  const dref = s => esc(s).replace(/\b(UX-\d+)\b/g, (m, c) => `<a class="dref" href="#${c.toLowerCase()}">${c}</a>`);
  window.UXK = { $, esc, I, lockup, dref };

  if ($('lockup-toc')) $('lockup-toc').innerHTML = lockup(20);
  if ($('lockup-hero')) $('lockup-hero').innerHTML = lockup(28);

  /* References board */
  if ($('refs') && window.REFS) $('refs').innerHTML = REFS.map(r => `
    <article class="ref">
      <figure><img src="../references/ux/${r.img}" alt="${esc(r.name)}: ${esc(r.what)}" decoding="async"></figure>
      <div class="body">
        <h4>${esc(r.name)}</h4>
        <span class="src">${esc(r.src)} · informs ${esc(r.jobs)}</span>
        <p class="cap" style="margin:0">${esc(r.what)}</p>
        <dl><dt>Take</dt><dd>${esc(r.take)}</dd><dt>Avoid</dt><dd>${esc(r.avoid)}</dd></dl>
      </div>
    </article>`).join('');

  /* Inventory map */
  if ($('ia-table') && window.IA) {
    let last = '';
    const rows = [];
    for (const [sec, t, home, change] of IA) {
      if (sec !== last) { rows.push(`<tr class="grp"><td colspan="3">${esc(sec)}</td></tr>`); last = sec; }
      rows.push(`<tr><td>${esc(t)}</td><td data-k="Now:">${dref(home)}</td><td data-k="Changes:">${change ? dref(change) : '<span class="faint">Same, new look</span>'}</td></tr>`);
    }
    $('ia-table').tBodies[0].innerHTML = rows.join('');
    const changed = IA.filter(r => r[3]).length;
    $('ia-count').innerHTML = `<span class="dot dot-done" role="img" aria-label="Complete"></span><span><b>${IA.length} of ${IA.length}</b> lines of the inventory have a home (checked against <code>inventory.md</code> line by line). ${changed} change how they work or where they sit; the rest only change their look.</span>`;
  }

  /* Navigation models: real components, inert (pictures of the nav, not working nav) */
  if ($('nav-desk')) $('nav-desk').innerHTML = `
    <div class="nav-figure" inert aria-hidden="true">
      <div class="sidebar" style="width:var(--size-sidebar);height:auto;background:var(--bg);border-radius:var(--radius-md);border:var(--border-width) solid var(--border)">
        <span class="brand">${lockup(20)}</span>
        <nav class="nav"><a class="nav-item" aria-current="page">${I('inbox')}Inbox<span class="count is-needs">7</span></a>
          <a class="nav-item">${I('office')}Office<span class="count is-active">3 working</span></a>
          <a class="nav-item">${I('activity')}Activity</a></nav>
        <nav class="nav"><span class="nav-label">Projects</span>
          <a class="nav-item"><span class="dot dot-active"></span>replay<span class="count">3</span></a>
          <a class="nav-item"><span class="dot dot-active"></span>atelier-ui<span class="count">2</span></a>
          <a class="nav-item"><span class="dot"></span>dodge<span class="count">2</span></a>
          <a class="nav-item">${I('plus')}New project</a></nav>
        <div class="sidebar-foot">
          <div class="meter"><div class="meter-head"><span>Claude plan</span><b>41%</b></div><div class="meter-track"><i style="--value:41%"></i></div><span class="meter-foot">5‑hour window · resets in 2 h 10 min</span></div>
          <div class="meter"><div class="meter-head"><span>Spent today</span><b>$52.60</b></div><span class="meter-foot">replay is at its $40 limit</span></div>
          <a class="nav-item" style="margin:0 calc(-1 * var(--space-2))">${I('settings')}Settings</a>
        </div>
      </div>
    </div>`;
  if ($('nav-phone')) $('nav-phone').innerHTML = `
    <div class="nav-figure phone-figure" inert aria-hidden="true">
      <div class="pf-top"><span class="brand">${lockup(20)}</span><span class="pf-spend">Today <b>$52.60</b></span>${I('settings')}</div>
      <div class="pf-body"><span class="faint">The Inbox: the top item open, the dock above the tabs</span></div>
      <nav class="tabbar" style="position:static"><a aria-current="page">${I('inbox')}Inbox<span class="badge-n">7</span></a><a>${I('office')}Office</a><a>${I('projects')}Projects</a><a>${I('activity')}Activity</a></nav>
    </div>`;

  /* §3 Journeys: an index table, then each flow as a numbered track of steps with its failure paths */
  const tapWord = n => n === 0 ? 'no tap' : n === 1 ? '1 tap' : `${n} taps`;
  if ($('flows-index') && window.FLOWS) $('flows-index').tBodies[0].innerHTML = FLOWS.map((f, i) =>
    `<tr><td><a href="#flow-${f.id}">${i + 1} · ${esc(f.title)}</a></td><td>${esc(f.jobs)}</td><td>${esc(f.total)}</td></tr>`).join('');
  if ($('flows-list') && window.FLOWS) $('flows-list').innerHTML = FLOWS.map((f, i) => `
    <article class="flow panel" id="flow-${f.id}" aria-labelledby="flow-${f.id}-h">
      <header class="flow-head">
        <span class="flow-n">${i + 1}</span>
        <div><h3 id="flow-${f.id}-h">${esc(f.title)}</h3>
        <p class="flow-meta">${esc(f.where)} · jobs ${esc(f.jobs)} · <b>${esc(f.total)}</b></p></div>
      </header>
      <ol class="flow-steps">${f.steps.map((s, j) => `
        <li class="step${s.optional ? ' is-optional' : ''}" id="flow-${f.id}-${j + 1}">
          <span class="step-n" aria-hidden="true">${j + 1}</span>
          <div class="step-body">
            <b class="step-screen">${esc(s.screen)}${s.optional ? ' <span class="faint">(optional)</span>' : ''}</b>
            <span class="step-state">${esc(s.state)}</span>
            <p>${dref(s.do)}</p>
            <span class="step-taps">${tapWord(s.taps)}</span>
          </div>
        </li>`).join('')}
      </ol>
      <div class="flow-fails">
        <h4>What can go wrong</h4>
        <ul>${[...f.fails].sort((a, b) => a.at - b.at).map(x => `
          <li><span class="from-step">at step ${x.at + 1}</span><div><b>${esc(x.if)}</b><p>${dref(x.then)}</p></div></li>`).join('')}
        </ul>
      </div>
    </article>`).join('');

  /* §4 Layout: the three widths as proportional frames (HTML, so the labels stay readable at any size) */
  if ($('bp-figure')) $('bp-figure').innerHTML = `
    <div class="bp-row" aria-hidden="true">
      <div class="bp bp-desk"><div class="bp-win">
        <div class="bp-side"><i>Sidebar 240</i></div>
        <div class="bp-panel"><div class="bp-focus"><i>Item, content ≤ 760</i><span class="bp-dock">Dock</span></div><div class="bp-queue"><i>Queue 344</i></div></div>
      </div><b>Desk · 1440</b></div>
      <div class="bp bp-mid"><div class="bp-win">
        <div class="bp-side bp-rail"><i>64</i></div>
        <div class="bp-panel bp-col"><div class="bp-focus"><i>Item</i><span class="bp-dock">Dock</span></div><div class="bp-queue bp-under"><i>Queue under the item</i></div></div>
      </div><b>Middle · 768</b></div>
      <div class="bp bp-phone"><div class="bp-win bp-col">
        <div class="bp-top"><i>Top bar 52</i></div>
        <div class="bp-focus"><i>Item, full width</i><span class="bp-dock">Dock</span></div>
        <div class="bp-tabs"><i>Tabs 56</i></div>
      </div><b>Phone · 390</b></div>
    </div>
    <figcaption class="cap">The Inbox at the three widths, to scale. The same plan holds for every screen: navigation, one reading column, at most one fixed column, the dock at the foot of the reading column.</figcaption>`;

  const TYPES = [
    { name: 'Queue and item', who: 'Inbox', desk: 'Sidebar · item (≤ 760) · queue 344 on the right.', mid: 'Rail · item; the queue sits beside it from 1024, under it below.', phone: 'The item fills the screen; the queue follows it; the dock above the tabs.' },
    { name: 'Board', who: 'Office', desk: 'One floor per project, desks in rows of three (min 280 each), quiet floors one line.', mid: 'Two desks a row.', phone: 'One desk a row, each one line plus its progress; busiest floor first.' },
    { name: 'List', who: 'Projects, Activity, a project’s Tasks, Outcomes, Audits', desk: 'One column ≤ 960; status dot, the sentence, meta at the right.', mid: 'Same.', phone: 'Meta moves under the sentence; rows ≥ 44.' },
    { name: 'Page with facts', who: 'Project page, task page, Docs', desk: 'Reading column ≤ 760 · facts 280 at the right (status, budget, files, PR).', mid: 'Facts become one line under the header.', phone: 'Facts fold away under the page’s sentence; proof full width.' },
    { name: 'Form', who: 'New project, Settings', desk: 'One column ≤ 640, labels above fields; Settings has its sections as a list on the left (200).', mid: 'Sections become a menu at the top.', phone: 'Sections a list you open one at a time; Save sticks above the tabs.' },
  ];
  if ($('screen-types')) $('screen-types').innerHTML = TYPES.map(t => `
    <div class="panel stype">
      <h4>${esc(t.name)} <small>${esc(t.who)}</small></h4>
      <dl><dt>1440</dt><dd>${esc(t.desk)}</dd><dt>768</dt><dd>${esc(t.mid)}</dd><dt>390</dt><dd>${esc(t.phone)}</dd></dl>
    </div>`).join('');

  /* ?open: every fold open (for screenshots) */
  if (new URLSearchParams(location.search).has('open')) document.querySelectorAll('details').forEach(d => d.open = true);

  /* Contents rail: mark the section in view */
  const links = [...document.querySelectorAll('.toc a')];
  if (links.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) links.forEach(a => a.setAttribute('aria-current', a.hash === '#' + e.target.id ? 'true' : 'false'));
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('main > section[id]').forEach(s => io.observe(s));
  }
})();
