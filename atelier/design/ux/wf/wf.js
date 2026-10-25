/* D5 low-fi wireframes: one engine, one page per screen (wf/<screen>.html sets <body data-screen>).
   Real content from the walkthrough's data set: 7 waiting (2 need you now), 3 working, $52.60 today, plan 41 %;
   replay at its $40 daily limit, atelier-ui busy, dodge waiting on its design gate with the lead off.
   ?clean hides the region notes, ?shot puts sticky bars in flow, ?state=zero shows the empty Inbox. */
(() => {
  const q = new URLSearchParams(location.search);
  const screen = document.body.dataset.screen;
  document.body.classList.toggle('is-clean', q.has('clean'));
  document.body.classList.toggle('is-shot', q.has('shot'));
  const zero = q.get('state') === 'zero';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = n => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
  const note = t => `<span class="wf-note" aria-hidden="true">${esc(t)}</span>`;
  const lockup = () => `<span class="lockup">${window.mark2('N1', 20)}<span class="wm">Atelier</span></span>`;
  const dot = (k, label) => `<span class="dot${k ? ' dot-' + k : ''}" role="img" aria-label="${esc(label)}"></span>`;
  const row = (d0, title, sub, meta, o = {}) => { const d = d0 || '<span aria-hidden="true"></span>'; return `<${o.href ? `a href="${o.href}"` : 'div'} class="wf-row${sub ? ' is-two' : ''}${o.sel ? ' is-sel' : ''}"${o.sel ? ' aria-current="true"' : ''}>${d}<span><b>${esc(title)}</b>${sub ? `<span class="s${o.subNeeds ? ' is-needs' : ''}">${esc(sub)}</span>` : ''}</span>${meta ? `<span class="m${o.metaNeeds ? ' is-needs' : ''}">${esc(meta)}</span>` : ''}</${o.href ? 'a' : 'div'}>`; };
  const track = (names, cur, label) => `<span class="wf-track" role="img" aria-label="${esc(label)}">${names.map((n, i) => `<span class="${i < cur ? 'past' : i === cur ? 'now' : ''}">${esc(n)}</span>`).join('')}</span>`;
  const fold = (t, body) => `<details class="details"><summary>${esc(t)}${I('chevron-down')}</summary><div class="details-body">${body}</div></details>`;

  const NOW = { waiting: 7, needs: 2, working: 3, today: '$52.60', plan: 41 };
  const PROJECTS = [
    { id: 'replay', lead: true, waiting: 3 },
    { id: 'atelier-ui', lead: true, waiting: 2 },
    { id: 'dodge', lead: false, waiting: 2 },
  ];
  const cur = { inbox: 'inbox', office: 'office', projects: 'projects', project: 'replay', task: 'replay', new: 'new', activity: 'activity', settings: 'settings' }[screen];

  /* ── Navigation ── */
  const sidebar = `
    <aside class="wf-side sidebar" aria-label="Navigation">
      <span class="brand">${lockup()}</span>
      <nav class="nav" aria-label="Places">
        <a class="nav-item" href="inbox.html"${cur === 'inbox' ? ' aria-current="page"' : ''}>${I('inbox')}Inbox<span class="count is-needs">${zero ? '' : NOW.waiting}</span></a>
        <a class="nav-item" href="office.html"${cur === 'office' ? ' aria-current="page"' : ''}>${I('office')}Office<span class="count is-active">${NOW.working} working</span></a>
        <a class="nav-item" href="activity.html"${cur === 'activity' ? ' aria-current="page"' : ''}>${I('activity')}Activity</a>
      </nav>
      <nav class="nav" aria-label="Projects">
        <a class="nav-label" href="projects.html"${cur === 'projects' ? ' aria-current="page"' : ''}>Projects</a>
        ${PROJECTS.map(p => `<a class="nav-item" href="project.html"${cur === p.id ? ' aria-current="page"' : ''}>${dot(p.lead ? 'active' : '', p.lead ? 'Lead on' : 'Lead off')}${p.id}<span class="count">${zero ? '' : p.waiting}</span></a>`).join('')}
        <a class="nav-item" href="new.html"${cur === 'new' ? ' aria-current="page"' : ''}>${I('plus')}New project</a>
      </nav>
      <div class="sidebar-foot">
        ${note('Global money · the only figures in the chrome (UX-9)')}
        <div class="meter"><div class="meter-head"><span>Claude plan</span><b>${NOW.plan}%</b></div><div class="meter-track"><i style="--value:${NOW.plan}%"></i></div><span class="meter-foot">5‑hour window · resets in 2 h 10 min</span></div>
        <div class="meter"><div class="meter-head"><span>Spent today</span><b>${NOW.today}</b></div><span class="meter-foot">replay is at its $40 limit</span></div>
        <a class="nav-item" href="settings.html"${cur === 'settings' ? ' aria-current="page"' : ''} style="margin:0 calc(-1 * var(--space-2))">${I('settings')}Settings</a>
      </div>
    </aside>`;
  const rail = `
    <nav class="wf-rail" aria-label="Navigation">
      <a href="inbox.html" aria-label="Inbox, ${NOW.waiting} waiting"${cur === 'inbox' ? ' aria-current="page"' : ''}>${I('inbox')}${zero ? '' : `<span class="rc is-needs">${NOW.waiting}</span>`}</a>
      <a href="office.html" aria-label="Office, ${NOW.working} working"${cur === 'office' ? ' aria-current="page"' : ''}>${I('office')}<span class="rc">${NOW.working}</span></a>
      <a href="activity.html" aria-label="Activity"${cur === 'activity' ? ' aria-current="page"' : ''}>${I('activity')}</a>
      <hr>
      <a href="project.html" aria-label="replay"${cur === 'replay' ? ' aria-current="page"' : ''}><span class="ini">re</span></a>
      <a href="project.html" aria-label="atelier-ui"><span class="ini">at</span></a>
      <a href="project.html" aria-label="dodge"><span class="ini">do</span></a>
      <a href="new.html" aria-label="New project"${cur === 'new' ? ' aria-current="page"' : ''}>${I('plus')}</a>
      <a class="push" href="settings.html" aria-label="Settings"${cur === 'settings' ? ' aria-current="page"' : ''}>${I('settings')}</a>
    </nav>`;
  const top = `
    <header class="wf-top">
      <span class="brand">${lockup()}</span>
      <a class="spend" href="settings.html">Today<b>${NOW.today}</b></a>
      <a class="gear" href="settings.html" aria-label="Settings">${I('settings')}</a>
    </header>`;
  const tabIs = t => (t === 'projects' ? ['projects', 'replay', 'new'] : [t]).includes(cur) ? ' aria-current="page"' : '';
  const tabs = `
    <nav class="tabbar wf-tabs" aria-label="Tabs">
      <a href="inbox.html"${tabIs('inbox')}>${I('inbox')}Inbox${zero ? '' : `<span class="badge-n">${NOW.waiting}</span>`}</a>
      <a href="office.html"${tabIs('office')}>${I('office')}Office</a>
      <a href="projects.html"${tabIs('projects')}>${I('projects')}Projects</a>
      <a href="activity.html"${tabIs('activity')}>${I('activity')}Activity</a>
    </nav>`;

  /* ── Screens ── */
  const S = {};

  S.inbox = () => zero ? {
    title: 'Inbox',
    head: `<h1>Inbox</h1><span class="sum">Nothing waiting</span>`,
    body: `<div class="wf-body"><div class="wf-zero">
      ${note('Inbox zero · one quiet line, no alarm (AC-1)')}
      <div class="lead">${dot('done', 'Done')}<div><b>Nothing needs you.</b><div class="wf-meta">You decided 6 things today. The team carries on.</div></div></div>
      <section class="wf-stack"><h2 class="wf-h">Working now <span class="n">3</span></h2>
        <div class="wf-rows">
          ${row(dot('active', 'Working'), 'Trim clips on the timeline', 'replay · Building · 1 min ago', '', { href: 'task.html' })}
          ${row(dot('active', 'Working'), 'High-fi Inbox and Office screens', 'atelier-ui · Designer · 4 min ago', '')}
          ${row(dot('active', 'Working'), 'Checking contrast in light and dark', 'atelier-ui · Auditor · 6 min ago', '')}
        </div><a class="link" href="office.html">Open the Office</a></section>
      <section class="wf-stack"><h2 class="wf-h">Decided today <span class="n">6</span></h2>
        <div class="wf-rows">
          ${row(dot('', 'Decided'), 'Approved the spec for replay', '', '09:12')}
          ${row(dot('', 'Decided'), 'Answered: keep seconds in the toast', '', '08:40')}
        </div></section>
      <div><a class="btn btn-secondary" href="new.html">${I('plus')}New project</a></div>
    </div></div>`,
  } : {
    title: 'Inbox',
    head: `<h1>Inbox</h1><span class="sum"><span class="is-needs">${NOW.needs} need you now</span> · ${NOW.waiting} waiting</span><span class="end"><span class="pager"><span class="wf-meta">1 of ${NOW.waiting}</span></span></span>`,
    body: `<div class="wf-inbox">
      <article class="wf-col" aria-labelledby="item-t">
        ${note('Item · reading column ≤ 760 · the top item is already open (R-1)')}
        <div class="wf-stack">
          <span class="eyebrow"><span class="kind is-needs">${dot('needs', 'Needs you now')}Design gate</span><span class="sep">·</span><a href="project.html">dodge</a><span class="sep">·</span><span>2 h ago</span></span>
          <h2 class="wf-t" id="item-t">The design for dodge is ready for your OK</h2>
          <p class="wf-p">Two screens: playing a round and the results. The designer followed your note to keep the score readable at arm’s length.</p>
        </div>
        ${note('The thing itself · screens large, open ↗ in the view port (R10, AC-2)')}
        <div class="wf-proof">
          <figure><img src="../../screens/img/dodge-play.png" alt="dodge: playing a round"><figcaption>Playing a round · open ↗</figcaption></figure>
          <figure><img src="../../screens/img/dodge-results.png" alt="dodge: the results screen"><figcaption>Results · open ↗</figcaption></figure>
        </div>
        ${fold('Details: the design document, 4 files', '<p>Design document, about a 3-minute read. Merged: no. Files: tokens.css, play.html, results.html, DESIGN.md.</p>')}
        <div class="wf-dock" role="group" aria-label="Decide">
          ${note('Dock · sticky at the foot of the column')}
          <label class="sr-only" for="dock-note">Your words (optional)</label>
          <textarea class="input" id="dock-note" rows="1" placeholder="Approve in your own words (optional)"></textarea>
          <div class="row"><button class="btn btn-primary" type="button">Approve the design</button><button class="btn btn-secondary" type="button">Skip with a reason</button><span class="end"><span class="kbd">A</span> approve · <span class="kbd">J</span> next</span></div>
        </div>
      </article>
      <aside class="wf-queue" aria-label="Also waiting">
        ${note('Queue 344 · phone: “Also waiting” under the item')}
        <section class="wf-stack"><h2 class="queue-section-title wf-h">Needs you now <span class="n is-needs">2</span></h2>
          <div class="wf-rows">
            ${row(dot('needs', 'Needs you now'), 'The design for dodge is ready for your OK', 'dodge · Design gate', '2 h', { sel: true })}
            ${row(dot('needs', 'Needs you now'), 'replay used today’s $40, so new work is paused', 'replay · Budget', '12 min')}
          </div></section>
        <section class="wf-stack"><h2 class="queue-section-title wf-h">When you have a minute <span class="n">5</span></h2>
          <div class="wf-rows">
            ${row(dot('', 'Waiting'), 'Should the toast say the time, or “just now”?', 'atelier-ui · Question from the designer', '25 min')}
            ${row(dot('', 'Waiting'), 'Does trimming keep the sound in sync?', 'replay · Your judgement', '1 h')}
            ${row(dot('', 'Waiting'), 'The trim handles can’t be reached by keyboard', 'replay · Auditor finding', '3 h')}
            ${row(dot('', 'Waiting'), 'The charter changed after you approved it', 'dodge · Charter', 'Mon')}
            ${row(dot('', 'Waiting'), 'Atelier closed a window an agent opened', 'atelier-ui · Notice', 'Mon')}
          </div></section>
      </aside>
    </div>`,
  };

  S.office = () => ({
    title: 'Office',
    head: `<h1>Office</h1><span class="sum">${NOW.working} working · <span class="is-needs">${NOW.needs} need you</span> · 4 on duty</span>`,
    body: `<div class="wf-body"><div class="wf-col is-list" style="max-width:none">
      ${note('Board · a floor per project, busiest first, desks in rows of three (UX-8 A)')}
      ${[
        { p: 'atelier-ui', sum: '2 working · $12.60 today', desks: [
          ['Designer', 'active', 'Working', 'High-fi Inbox and Office screens', 'Drawing the Office floor at 390 · 4 min ago'],
          ['Auditor', 'active', 'Auditing', 'Checking contrast in light and dark', '12 of 14 checks so far · 6 min ago'],
          ['Lead', '', 'On duty', 'Waiting for your answer on the toast', 'Asked 25 min ago']] },
        { p: 'replay', sum: '1 working · $40.00 today, at its limit', desks: [
          ['Builder', 'active', 'Working', 'Trim clips on the timeline', 'Finishing its second try · 1 min ago', 'task.html'],
          ['Lead', 'needs', 'Needs you', 'Paused: today’s budget is used', 'Raise it or wait for midnight'],
          ['Reviewer', '', 'Idle', 'Nothing to review', 'Last review 40 min ago']] },
      ].map(f => `<section class="wf-floor"><h2 class="wf-h">${f.p} <span class="n">${esc(f.sum)}</span></h2><div class="wf-desks">${f.desks.map(([role, k, st, what, sub, href]) => `
        <${href ? `a href="${href}"` : 'div'} class="wf-desk"><span class="who">${dot(k, st)}<b>${role}</b><span class="st${k ? ' is-' + k : ''}">${st}</span></span><span class="what">${esc(what)}</span><span class="wf-meta">${esc(sub)}</span></${href ? 'a' : 'div'}>`).join('')}</div></section>`).join('')}
      <p class="wf-quiet">dodge · quiet · lead off · $0.00 today</p>
    </div></div>`,
  });

  S.projects = () => ({
    title: 'Projects',
    head: `<h1>Projects</h1><span class="sum">3 projects</span><span class="end"><a class="btn btn-secondary btn-sm" href="new.html">${I('plus')}New project</a></span>`,
    body: `<div class="wf-body"><div class="wf-col is-list">
      ${note('List ≤ 960 · one sentence per project')}
      <div class="wf-rows">
        ${row(dot('active', 'Lead on'), 'replay', 'Building · 4 of 9 outcomes met · paused at today’s $40', '3 waiting', { href: 'project.html', metaNeeds: true })}
        ${row(dot('active', 'Lead on'), 'atelier-ui', 'Design · 2 working · 11 of 17 outcomes met', '2 waiting', { href: 'project.html' })}
        ${row(dot('', 'Lead off'), 'dodge', 'Design · waiting for your OK on the design · lead off', '2 waiting', { href: 'project.html', metaNeeds: true })}
      </div>
    </div></div>`,
  });

  const ptabs = active => `<nav class="wf-tabsrow tabs" aria-label="Project">${[['Overview'], ['Tasks', '6'], ['Outcomes', '4/9'], ['Audits', '1'], ['Docs'], ['Activity'], ['Settings']].map(([t, c]) =>
    `<a class="tab" href="project.html"${t === active ? ' aria-current="page"' : ''}>${t}${c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}</nav>`;

  S.project = () => ({
    title: 'replay',
    head: `<a class="back" href="projects.html">${I('chevron-left')}Projects</a><h1>replay</h1><span class="sum">${dot('active', 'Lead on')} Lead on</span><span class="end"><button class="btn btn-secondary btn-sm" type="button">Lead ${I('chevron-down')}</button></span>`,
    tabs: ptabs('Overview'),
    body: `<div class="wf-body"><div class="wf-split">
      <div class="wf-col">
        ${note('Now first, figures in one line under it (UX-6 A)')}
        <section class="wf-box" aria-labelledby="now-h">
          <h2 class="wf-h" id="now-h">Now</h2>
          <p class="wf-p" style="color:var(--text)">Today’s $40 is used, so new work waits. Raise today’s limit or let it resume at midnight.</p>
          <div><a class="btn btn-primary btn-sm" href="inbox.html">Review the budget</a></div>
          ${track(['Brief', 'Spec', 'Design', 'Contracts', 'Build'], 4, 'Phase: Build')}
          <span class="wf-meta">4 of 9 outcomes met · 1 working · 3 waiting on you</span>
        </section>
        <section class="wf-stack"><h2 class="wf-h">Needs you here <span class="n is-needs">3</span></h2><div class="wf-rows">
          ${row(dot('needs', 'Needs you now'), 'replay used today’s $40, so new work is paused', '', '12 min', { href: 'inbox.html' })}
          ${row(dot('', 'Waiting'), 'Does trimming keep the sound in sync?', '', '1 h', { href: 'inbox.html' })}
          ${row(dot('', 'Waiting'), 'The trim handles can’t be reached by keyboard', '', '3 h', { href: 'inbox.html' })}
        </div></section>
        <section class="wf-stack"><h2 class="wf-h">In progress <span class="n">2</span></h2><div class="wf-rows">
          ${row(dot('active', 'Working'), 'Trim clips on the timeline', 'Building · finishing its second try', '1 min ago', { href: 'task.html' })}
          ${row(dot('', 'Waiting'), 'Share a clip as a link', 'Queued · starts when the budget allows', '')}
        </div></section>
        <section class="wf-stack"><h2 class="wf-h">Recent</h2><div class="wf-rows">
          ${row('', 'Paused: today’s budget is used', '', '13:40')}
          ${row('', 'Trim clips on the timeline showed its work', '', '13:22')}
          ${row('', 'Review passed: the clip list scrolls smoothly', '', '11:05')}
        </div><a class="link" href="activity.html">All activity</a></section>
      </div>
      <aside class="wf-facts" aria-label="Facts">
        ${note('Facts 280 · middle: one line under the header')}
        <dl><dt>Today</dt><dd class="is-needs">$40.00 of $40</dd><dt>So far</dt><dd>$286.40</dd><dt>Shipping</dt><dd>Draft PRs</dd><dt>Gating</dt><dd>Standard</dd></dl>
      </aside>
    </div></div>`,
  });

  S.task = () => ({
    title: 'Trim clips on the timeline',
    head: `<a class="back" href="project.html">${I('chevron-left')}replay</a><h1>Trim clips on the timeline</h1><span class="end"><button class="btn btn-ghost btn-sm" type="button" aria-label="Task menu: Stop">${I('menu')}</button></span>`,
    body: `<div class="wf-body"><div class="wf-split">
      <div class="wf-col">
        <div class="wf-stack">
          <span class="eyebrow"><span class="kind">${dot('active', 'Working')}Working</span><span class="sep">·</span><span>Builder</span><span class="sep">·</span><span>last active 1 min ago</span></span>
          <p class="wf-p" style="color:var(--text)">Finishing its second try before today’s pause. No dock: nothing to decide here.</p>
        </div>
        ${note('Now · stage, latest step, last active (UX-5 A)')}
        <section class="wf-box"><h2 class="wf-h">Now</h2>
          ${track(['Planning', 'Building', 'Checking', 'Review', 'Done'], 1, 'Stage: Building')}
          <p class="wf-p" style="color:var(--text)">Wiring the trim handles into the timeline</p>
          <span class="wf-meta">Try 2 of 5 · 14 min into this try · $6.20 of $10</span>
        </section>
        ${note('Proof · pictures large, full column width')}
        <section class="wf-stack"><h2 class="wf-h">Shown working <span class="n">14:02</span></h2>
          <div class="wf-proof">
            <figure><img src="../../screens/img/replay-trim.png" alt="replay: the trim handles on a clip"><figcaption>Trim handles on a clip · open ↗</figcaption></figure>
            <figure><img src="../../screens/img/replay-player.png" alt="replay: the trimmed clip playing"><figcaption>The trimmed clip playing · recording 0:48</figcaption></figure>
          </div>
          ${fold('Run log, last 20 lines', '<p><code>✓ 38 tests passed</code> · <code>trim.spec.ts › keeps audio in sync</code></p>')}
        </section>
        <div class="wf-folds">
        ${fold('History · 12 events', '<p>Started 13:08 · first try failed the check at 13:31 · second try started 13:48.</p>')}
        ${fold('Review', '<p>Not reviewed yet.</p>')}
        ${fold('Notes: progress, decisions without you, the brief, last check', '<p>2 decisions made without you, both reversible.</p>')}
        </div>
      </div>
      <aside class="wf-facts" aria-label="Facts">
        ${note('Facts 280 · phone: a Facts fold')}
        <details class="details wf-factsfold" data-desk-open><summary>Facts · tries, spend, files, pull request${I('chevron-down')}</summary>
        <dl><dt>Status</dt><dd>Working</dd><dt>Tries</dt><dd>2 of 5</dd><dt>Spend</dt><dd>$6.20 of $10</dd><dt>Outcomes</dt><dd>1 of 2 met</dd><dt>Files</dt><dd>7 changed</dd><dt>Pull request</dt><dd>Draft #14 ↗</dd></dl>
        </details>
      </aside>
    </div></div>`,
  });

  S.new = () => ({
    title: 'New project',
    head: `<a class="back" href="projects.html">${I('chevron-left')}Projects</a><h1>New project</h1>`,
    body: `<div class="wf-body"><form class="wf-col is-form wf-form" onsubmit="return false">
      ${note('Form ≤ 640 · labels above fields (UX-12 B: the description grows into a brief)')}
      <div class="field"><label class="field-label" for="n-name">Name</label><input class="input" id="n-name" value="tidepool"><span class="field-help">Lowercase, used for the folder and the GitHub repo.</span></div>
      <div class="field"><label class="field-label" for="n-desc">What it is <span class="faint">(optional: one line, or paste a brief)</span></label><textarea class="input" id="n-desc" rows="3">A tide-times app for the three beaches near home, readable at a glance on a phone.</textarea></div>
      <fieldset class="choices"><legend class="field-label">Team</legend>
        <label class="choice"><input type="radio" name="team">Pair · a lead and one builder</label>
        <label class="choice"><input type="radio" name="team" checked>Team · lead, designer, builders, reviewer, auditor</label>
        <label class="choice"><input type="radio" name="team">Game · a team with a game designer</label>
      </fieldset>
      <fieldset class="choices"><legend class="field-label">Shipping</legend>
        <label class="choice"><input type="radio" name="ship" checked>Draft pull requests you merge</label>
        <label class="choice"><input type="radio" name="ship">Straight to main</label>
      </fieldset>
      <label class="wf-check"><input type="checkbox" checked><span>Make a private GitHub repo<small>tidepool, on your account</small></span></label>
      <label class="wf-check"><input type="checkbox" checked><span>Start the lead now<small>It drafts the charter first; you approve it in the Inbox.</small></span></label>
      <div class="wf-actions"><button class="btn btn-primary" type="submit">Create project</button><a class="btn btn-ghost" href="projects.html">Cancel</a></div>
    </form></div>`,
  });

  S.activity = () => ({
    title: 'Activity',
    head: `<h1>Activity</h1><span class="sum">Last 3 days</span>`,
    body: `<div class="wf-body"><div class="wf-col is-list">
      ${note('One feed by day · filters (UX-13 A)')}
      <div class="wf-filters"><label class="sr-only" for="a-proj">Project</label><select class="input" id="a-proj"><option>All projects</option><option>replay</option><option>atelier-ui</option><option>dodge</option></select><button class="btn btn-secondary btn-sm" type="button" aria-pressed="false">Only problems</button></div>
      <div class="wf-rows">
        <span class="wf-day">Today</span>
        ${row(dot('needs', 'Problem'), 'Paused: today’s budget is used', 'replay', '13:40', { subNeeds: false })}
        ${row(dot('needs', 'Problem'), 'First try failed the check: audio drifts by 40 ms', 'replay · Trim clips on the timeline', '13:31')}
        ${row(dot('', 'Event'), 'Trim clips on the timeline showed its work', 'replay', '13:22', { href: 'task.html' })}
        ${row(dot('done', 'Good'), 'Review passed: the clip list scrolls smoothly', 'replay', '11:05')}
        ${row(dot('', 'Event'), 'The designer asked a question', 'atelier-ui', '10:52')}
        <span class="wf-day">Yesterday</span>
        ${row(dot('done', 'Good'), 'You approved the spec', 'replay', '17:20')}
        ${row(dot('', 'Event'), 'Lead stopped by you', 'dodge', '16:30')}
        ${row(dot('', 'Event'), 'The design is ready for your OK', 'dodge', '16:04')}
      </div>
    </div></div>`,
  });

  S.settings = () => ({
    title: 'Settings',
    head: `<h1>Settings</h1><span class="sum">Every project</span>`,
    body: `<div class="wf-body"><div class="wf-set">
      <nav class="wf-setnav" aria-label="Settings sections">
        <a class="nav-item" href="#plan" aria-current="page">Claude plan</a><a class="nav-item" href="#look">Appearance</a><a class="nav-item" href="#device">This device</a><a class="nav-item" href="#about">About</a>
      </nav>
      <form class="wf-form" onsubmit="return false">
        ${note('Global only · each project keeps its own Settings tab (UX-3 A)')}
        <section class="wf-stack" id="plan"><h2 class="wf-h">Claude plan</h2>
          <div class="meter"><div class="meter-head"><span>5‑hour window</span><b>${NOW.plan}%</b></div><div class="meter-track"><i style="--value:${NOW.plan}%"></i></div><span class="meter-foot">Resets in 2 h 10 min · updated 1 min ago</span></div>
          <div class="meter"><div class="meter-head"><span>This week</span><b>58%</b></div><div class="meter-track"><i style="--value:58%"></i></div><span class="meter-foot">Resets Thu 09:00</span></div>
          <div class="field"><label class="field-label" for="s-5h">Pause Atelier at this much of the 5‑hour window</label><input class="input" id="s-5h" value="85%" style="max-width:120px"></div>
          <div class="field"><label class="field-label" for="s-wk">Pause Atelier at this much of the week</label><input class="input" id="s-wk" value="90%" style="max-width:120px"></div>
          <label class="wf-check"><input type="checkbox" checked><span>Spread work evenly over the week<small>Not holding now.</small></span></label>
        </section>
        <section class="wf-stack" id="look"><h2 class="wf-h">Appearance</h2>
          <fieldset class="choices"><legend class="sr-only">Theme</legend>
            <label class="choice"><input type="radio" name="th" checked>Dark</label><label class="choice"><input type="radio" name="th">Light</label><label class="choice"><input type="radio" name="th">Follow this device</label>
          </fieldset></section>
        <section class="wf-stack" id="device"><h2 class="wf-h">This device</h2><p class="wf-p">Signed in on this browser since 12 Oct. <a class="link" href="#device">Sign out</a></p></section>
        <section class="wf-stack" id="about"><h2 class="wf-h">About</h2><p class="wf-p">Atelier 0.9 · dashboard updated today 08:02</p></section>
        <div class="wf-actions"><button class="btn btn-primary" type="submit">Save</button></div>
      </form>
    </div></div>`,
  });

  const s = S[screen]();
  document.title = `${s.title} · wireframe · Atelier`;
  document.getElementById('wf').innerHTML = `${sidebar}${rail}${top}
    <main class="wf-main" id="main">
      <header class="wf-head">${s.head}</header>
      ${s.tabs || ''}
      ${s.body}
    </main>${tabs}`;
  /* Facts are a column from 768 up and a closed fold on the phone */
  document.querySelectorAll('[data-desk-open]').forEach(d => { d.open = innerWidth >= 768; });
})();
