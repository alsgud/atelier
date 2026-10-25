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
