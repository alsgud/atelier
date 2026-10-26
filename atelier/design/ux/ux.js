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

  /* §7 Wireframes: desk and phone shots of design/ux/wf/<screen>.html (runs/6umt/tools/wf-shots.mjs), each linked live */
  const WF = [
    { id: 'inbox', file: 'inbox.html', name: 'Inbox', look: 'The top item is already open with the thing itself (the two dodge screens) and the dock under it. The queue keeps the two groups; on the phone it follows the item as “Also waiting”.', dec: 'UX-1 UX-2 UX-9 UX-10' },
    { id: 'inbox-zero', file: 'inbox.html?state=zero', name: 'Inbox, nothing waiting', look: 'One green line, who is working, what you decided today, New project. No count anywhere in the chrome, nothing red.', dec: 'UX-1' },
    { id: 'office', file: 'office.html', name: 'Office', look: 'A floor per project, busiest first, a desk per agent with its state in a word; the quiet project is one line at the foot.', dec: 'UX-8' },
    { id: 'projects', file: 'projects.html', name: 'Projects', look: 'One sentence per project and how many things wait on you there. Nothing else to read.', dec: 'UX-14' },
    { id: 'project', file: 'project.html', name: 'A project (replay)', look: '“Now” first: the next step with its button, the phase track, outcomes met. Then what needs you here, what is in progress, and recent events; money in the facts column. On the phone the tabs scroll sideways.', dec: 'UX-6 UX-11 UX-14' },
    { id: 'task', file: 'task.html', name: 'A task (Trim clips on the timeline)', look: 'Stage, latest step and last active; proof full width, pictures large. No dock, because nothing needs you. Facts fold away on the phone.', dec: 'UX-4 UX-5' },
    { id: 'new', file: 'new.html', name: 'New project', look: 'One short form. The description can grow into a pasted brief. Create goes straight to the new project.', dec: 'UX-12' },
    { id: 'activity', file: 'activity.html', name: 'Activity', look: 'One feed by day, newest first, a project picker and “Only problems”. Red only for problems, green only for good news.', dec: 'UX-13' },
    { id: 'settings', file: 'settings.html', name: 'Settings', look: 'Only what covers every project: your Claude plan limits, appearance, this device, about. Each project keeps its own Settings tab.', dec: 'UX-3 UX-9' },
  ];
  if ($('wf-list')) {
    $('wf-index').innerHTML = WF.map((w, i) => `<li><a href="#wf-${w.id}"><span class="n">${i + 1}</span>${esc(w.name)}</a></li>`).join('');
    $('wf-list').innerHTML = WF.map((w, i) => `
      <article class="wfc" id="wf-${w.id}" aria-labelledby="wf-${w.id}-h">
        <header class="wfc-head">
          <h3 id="wf-${w.id}-h"><span class="faint">${i + 1} ·</span> ${esc(w.name)}</h3>
          <a class="btn btn-secondary btn-sm" href="wf/${w.file}" target="_blank" rel="noopener">Open<span class="sr-only"> the ${esc(w.name)} wireframe</span> ↗</a>
        </header>
        <p class="cap">${esc(w.look)} <span class="from">${dref(w.dec)}</span></p>
        <div class="wfc-shots">
          <figure class="wfc-desk"><img src="img/wf-${w.id}-1440.png" alt="${esc(w.name)} wireframe at the desk, 1440 wide" decoding="async"><figcaption>Desk · 1440</figcaption></figure>
          <figure class="wfc-phone"><img src="img/wf-${w.id}-390v.png" alt="${esc(w.name)} wireframe on the phone, 390 wide, the first screen" decoding="async"><figcaption>Phone · 390, first screen</figcaption></figure>
        </div>
      </article>`).join('');
  }

  /* §8 Decisions: schematic pictures (structure only, low-fi on purpose), then one card per decision */
  const B = (w, c = '') => `<i class="mf-b${c ? ' ' + c : ''}" style="--w:${w}%"></i>`;
  const L = t => `<span class="mf-l">${esc(t)}</span>`;
  const box = (inner, c = '') => `<span class="mf-box${c ? ' ' + c : ''}">${inner}</span>`;
  const side = (inner = '') => `<span class="mf-side">${B(70, 't')}${B(80)}${B(60)}${B(70)}${inner}</span>`;
  const desk = (inner, c = '') => `<span class="mf mf-desk${c ? ' ' + c : ''}">${inner}</span>`;
  const main = (inner, c = '') => `<span class="mf-main${c ? ' ' + c : ''}">${inner}</span>`;
  const tabs = names => `<span class="mf-tabbar">${names.map((n, i) => `<span${i === 0 ? ' class="on"' : ''}>${esc(n)}</span>`).join('')}</span>`;
  const stages = (cur, names = ['Planning', 'Building', 'Checking', 'Review', 'Done']) => `<span class="mf-stages">${names.map((n, i) => `<span class="${i < cur ? 'past' : i === cur ? 'now' : ''}">${esc(n)}</span>`).join('')}</span>`;
  const FIGS = {
    'first-inbox': desk(side() + main(L('Inbox') + B(80, 't') + box(B(90) + B(70) + B(80)) + box(L('Dock'), 'dock')) + `<span class="mf-col">${L('Queue')}${B(90, 'n')}${B(80)}${B(85)}${B(70)}</span>`),
    'first-office': desk(side() + main(L('Office') + `<span class="mf-grid">${box(B(70, 'a') + B(90))}${box(B(70, 'a') + B(80))}${box(B(60) + B(90))}${box(B(70, 'a') + B(70))}${box(B(60) + B(80))}${box(B(60) + B(60))}</span>`)),
    'tabs-a': tabs(['Inbox', 'Office', 'Projects', 'Activity']),
    'tabs-b': tabs(['Inbox', 'Office', 'Projects', 'You']),
    'tabs-c': tabs(['Inbox', 'Team', 'Projects']),
    'task-page': desk(side() + main(L('Task page') + B(70, 't') + `<span class="mf-row2">${box(L('Proof, full width'), 'tall')}<span class="mf-col mf-facts">${L('Facts')}${B(80)}${B(60)}${B(70)}</span></span>`)),
    'task-peek': desk(side() + main(L('Office') + box(B(70, 'a') + B(90)) + box(B(60) + B(80)) + box(B(60) + B(70)), 'mf-narrow') + `<span class="mf-peek">${L('Peek')}${B(80, 't')}${box(L('Proof'), 'tall')}</span>`),
    'prog-stage': `<span class="mf-comp">${stages(1)}<span class="mf-sent">Wiring the trim handles into the timeline</span><span class="mf-meta">last active 1 min ago</span></span>`,
    'prog-bar': `<span class="mf-comp"><span class="mf-meter"><i style="--w:62%"></i></span><span class="mf-sent">62 % · 5 of 8 steps</span><span class="mf-meta">re-planned: was 5 of 6</span></span>`,
    'prog-time': `<span class="mf-comp"><span class="mf-sent">40 min so far</span><span class="mf-meta">these usually take about an hour</span></span>`,
    'proj-now': desk(main(L('replay') + box(L('Needs you here · 1'), 'needs') + box(B(70, 'a') + B(60, 'a')) + stages(4, ['Brief', 'Spec', 'Design', 'Contracts', 'Build']) + L('4 of 9 outcomes · $40.00 of $40'))),
    'proj-figs': desk(main(L('replay') + `<span class="mf-figs">${box(L('2'))}${box(L('1'))}${box(L('4/9'))}${box(L('$40'))}</span>` + box(L('Now')) + B(80) + B(60))),
    'proj-phase': desk(main(L('replay') + stages(4, ['Brief', 'Spec', 'Design', 'Contracts', 'Build']).replace('mf-stages', 'mf-stages is-big') + box(L('Now')) + B(80) + B(60))),
    'nav-rail': desk(`<span class="mf-rail">${B(80, 't')}${B(80)}${B(80)}${B(80)}</span>` + main(B(70, 't') + box(B(90) + B(70)) + B(80) + B(60))),
    'nav-tabs': desk(`<span class="mf-stack">${main(B(70, 't') + box(B(90) + B(70)) + B(80))}${tabs(['Inbox', 'Office', 'Projects', 'Activity'])}</span>`),
    'nav-fold': desk(side(`<span class="mf-fold" aria-hidden="true">«</span>`) + main(B(70, 't') + box(B(90) + B(70)) + B(80))),
    'office-floors': desk(main(L('replay · 3 working') + `<span class="mf-grid">${box(B(70, 'a') + B(90))}${box(B(70, 'a') + B(80))}${box(B(60, 'a') + B(90))}</span>` + L('atelier-ui · 2 working') + `<span class="mf-grid">${box(B(70, 'a') + B(80))}${box(B(60) + B(70))}</span>` + L('dodge · quiet'))),
    'office-list': desk(main(L('Working · 3') + B(90, 'a') + B(85, 'a') + B(80, 'a') + L('Waiting · 2') + B(80) + B(70) + L('Stuck · 0'))),
    'money-foot': desk(side(`<span class="mf-foot">${L('Plan 41 %')}<span class="mf-meter"><i style="--w:41%"></i></span>${L('Today $52.60')}</span>`) + main(B(70, 't') + box(B(90) + B(70)) + B(80))),
    'money-none': desk(side() + main(B(70, 't') + box(B(90) + B(70)) + B(80) + B(60))),
    'money-strip': desk(side() + `<span class="mf-stack">${`<span class="mf-strip">${L('Plan 41 % · Today $52.60')}</span>`}${main(B(70, 't') + box(B(90) + B(70)) + B(80))}</span>`),
  };
  if ($('decisions-list') && window.DECISIONS) {
    $('decisions-list').innerHTML = DECISIONS.map(d => `
      <article class="dec panel" id="ux-${d.id}" aria-labelledby="ux-${d.id}-h">
        <header class="dec-head"><span class="dec-code">UX-${d.id}</span><h3 id="ux-${d.id}-h">${esc(d.title)}</h3></header>
        <p class="dec-why">${esc(d.why)} <span class="from">${esc(d.jobs)}</span></p>
        <ol class="opts">${d.options.map(o => `
          <li class="opt${o.rec ? ' is-rec' : ''}">
            ${o.fig ? `<div class="opt-fig" aria-hidden="true">${FIGS[o.fig]}</div>` : ''}
            <div class="opt-body">
              <b><span class="opt-k">${o.k}</span>${esc(o.name)}</b>
              ${o.rec ? '<span class="rec">Recommended</span>' : ''}${o.scope ? '<span class="scope">New scope: the lead’s call</span>' : ''}
              <p>${esc(o.text)}</p>
            </div>
          </li>`).join('')}
        </ol>
        <p class="dec-because"><b>Why I recommend ${d.options.find(o => o.rec).k}:</b> ${esc(d.because)}</p>
      </article>`).join('');
    $('answer-text').textContent = DECISIONS.map(d => `UX-${d.id} ${d.options.find(o => o.rec).k}`).join(', ');
    $('answer-copy').addEventListener('click', async () => {
      const t = $('answer-text').textContent, st = $('answer-status');
      try { await navigator.clipboard.writeText(t); st.textContent = 'Copied. Change any letter you disagree with.'; }
      catch { getSelection().selectAllChildren($('answer-text')); st.textContent = 'Selected: copy it with your device’s Copy.'; }
    });
  }

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
