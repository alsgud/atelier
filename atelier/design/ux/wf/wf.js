/* D5 low-fi wireframes: one engine, one page per screen (wf/<screen>.html sets <body data-screen>).
   Real content from the walkthrough's data set: 7 waiting (2 need you now), 3 working, $52.60 today, plan 41 %;
   replay at its $40 daily limit, atelier-ui busy, dodge waiting on its design gate with the lead off.
   ?clean hides the region notes, ?shot puts sticky bars in flow, ?state=zero shows the empty Inbox.
   D6: the data model below (window.ATELIER_MODEL) is shared with the high-fi screens (design/screens2/),
   so a different answer to a UX decision changes here, once, for both. */
window.ATELIER_MODEL = (() => {
  /* The UX answers the screens are drawn on. PROVISIONAL: the owner hasn't replied yet, so these are the recommendations
     (DESIGN.md › UX › Decisions). Each screen reads its pick from here; screens2/index.html lists them. */
  const UX = {
    'UX-1': ['A', 'The Inbox opens first, always'],
    'UX-2': ['A', 'Phone tabs: Inbox · Office · Projects · Activity; Settings and spend in the top bar'],
    'UX-3': ['A', 'One global Settings, plus a Settings tab per project'],
    'UX-4': ['A', 'A task opens as a full page with its own address'],
    'UX-5': ['A', 'Task progress: stage, latest step, last active'],
    'UX-6': ['A', 'Project page: Now first, figures in one line'],
    'UX-7': ['A', '768–1279: a 64 px rail'],
    'UX-8': ['A', 'Office: a floor per project, a desk per agent'],
    'UX-9': ['A', 'Spend and plan quietly in the chrome (sidebar foot, phone top bar)'],
    'UX-10': ['A', 'Decisions are instant with Undo; confirm only the irreversible and the costly'],
    'UX-11': ['C', 'Early budget warning: words on the money line at 80 %, no new Inbox item'],
    'UX-12': ['B', 'New project: the same field, growing into a brief'],
    'UX-13': ['A', 'Activity: project picker + Only problems'],
    'UX-14': ['A', 'Criteria are called Outcomes'],
    'UX-15': ['A', 'Nothing outside the app for now'],
  };
  /* The one summary (R2): every count and money figure on every screen comes from here. */
  const NOW = { waiting: 7, needs: 2, working: 3, onDuty: 6, today: '$52.60', plan: 41, planReset: '2 h 10 min', updated: '14:02' };
  const PROJECTS = [
    { id: 'replay', lead: true, waiting: 3, today: '$40.00', limit: '$40', line: 'Building · 4 of 9 outcomes met · paused at today’s $40' },
    { id: 'atelier-ui', lead: true, waiting: 2, today: '$12.60', limit: '$30', line: 'Design · 2 working · 11 of 17 outcomes met' },
    { id: 'dodge', lead: false, waiting: 2, today: '$0.00', limit: '$20', line: 'Design · waiting for your OK on the design · lead off' },
  ];
  /* D6 Projects list: per project the phase, its outcomes, the Now sentence (as on its page), how many of the waiting need
     you now, today's share of its limit, and the task summary [working, needs you, queued, done] (inventory: Projects list). */
  const LIST = {
    replay: { phase: 4, met: 4, of: 9, needsNow: 1, pct: 100, now: 'Today’s $40 is used, so new work waits.', tasks: [1, 0, 1, 3] },
    'atelier-ui': { phase: 2, met: 11, of: 17, needsNow: 0, pct: 42, now: 'The designer is drawing the Office for phones; the auditor is checking contrast.', tasks: [2, 0, 2, 6] },
    dodge: { phase: 2, met: 0, of: 6, needsNow: 1, pct: 0, now: 'The design waits for your OK. The lead is off until you approve.', tasks: [0, 0, 0, 0] },
  };
  PROJECTS.forEach(p => Object.assign(p, LIST[p.id]));
  /* Activity (UX-13 A): the last 3 days across every project, newest first. Same events as the project and task pages.
     [day, time, project, task (or ''), event word, the message, k: 'needs' bad · 'done' good · '' neutral, href] */
  const ACTIVITY = [
    ['Today', '13:58', 'atelier-ui', 'High-fi Inbox and Office screens', 'Step', 'Drawing the Office floor at 390', '', 'task.html?t=draw'],
    ['Today', '13:41', 'atelier-ui', 'High-fi Inbox and Office screens', 'Showed its work', '2 screenshots: the Office on the desk and on a phone', '', 'task.html?t=draw'],
    ['Today', '13:40', 'replay', '', 'Paused', 'Today’s $40 is used, so new work waits', 'needs', 'inbox.html'],
    ['Today', '13:37', 'atelier-ui', '', 'Question', 'The lead asked how the toast should read', '', 'inbox.html'],
    ['Today', '13:31', 'replay', 'Trim clips on the timeline', 'Check failed', 'First try: the sound drifts by 40 ms after a trim', 'needs', 'task.html'],
    ['Today', '13:22', 'replay', 'Trim clips on the timeline', 'Showed its work', '2 screenshots and a 0:48 recording', '', 'task.html'],
    ['Today', '13:10', 'atelier-ui', 'Checking contrast in light and dark', 'Started', 'Scheduled audit of every text colour', '', 'task.html?t=audit'],
    ['Today', '13:08', 'replay', 'Trim clips on the timeline', 'Started', 'The lead planned it as part of Build', '', 'task.html'],
    ['Today', '11:05', 'replay', 'The clip list scrolls smoothly', 'Review passed', 'Scrolls smoothly with 500 clips', 'done', 'project.html?tab=tasks'],
    ['Today', '11:02', 'replay', '', 'Finding', 'The trim handles can’t be reached by keyboard', 'needs', 'inbox.html'],
    ['Today', '10:52', 'atelier-ui', '', 'You answered', 'The designer asked which screen opens first; you said the Inbox', '', 'project.html?p=atelier-ui'],
    ['Yesterday', '17:20', 'replay', '', 'You approved', 'The spec: 9 outcomes, from trimming to export', 'done', 'project.html?tab=docs'],
    ['Yesterday', '16:30', 'dodge', '', 'Lead stopped', 'You stopped the lead', '', 'project.html?p=dodge'],
    ['Yesterday', '16:04', 'dodge', '', 'Ready for your OK', 'The design: playing a round and the results', '', 'inbox.html'],
    ['Yesterday', '10:02', 'replay', '', 'Audit', 'Performance: 8 checks, nothing found', 'done', 'project.html?tab=audits'],
    ['Saturday 24 Oct', '18:12', 'atelier-ui', '', 'You approved', 'The brand: the N1 mark in North light, dark first', 'done', 'project.html?p=atelier-ui'],
    ['Saturday 24 Oct', '15:47', 'dodge', '', 'Charter changed', 'The lead changed one line after you approved it', 'needs', 'inbox.html'],
  ];
  /* Office (UX-8 A): a floor per project, busiest first; a desk per agent. k = the four meanings (§5):
     'active' Working (lilac), 'needs' Needs you (red), '' Waiting (neutral), 'off' Off. quiet = the stuck signal, neutral text. */
  const OFFICE = [
    { p: 'atelier-ui', working: 2, today: '$12.60', desks: [
      { id: 'd-ui-designer', role: 'Designer', k: 'active', st: 'Working', what: 'High-fi Inbox and Office screens', step: 'Drawing the Office floor at 390', prog: [4, 6, 'step'], ago: '4 min ago', href: 'task.html?t=draw' },
      { id: 'd-ui-auditor', role: 'Auditor', k: 'active', st: 'Working', what: 'Checking contrast in light and dark', step: 'Measuring text on every surface', prog: [12, 14, 'checks'], ago: '38 min ago', quiet: 'Quiet for 38 min, longer than usual', href: 'task.html?t=audit' },
      { id: 'd-ui-lead', role: 'Lead', k: '', st: 'Waiting', what: 'Asked you how the toast should read', step: 'In your Inbox', ago: '25 min ago', href: 'inbox.html' }] },
    { p: 'replay', working: 1, today: '$40.00', atLimit: true, desks: [
      { id: 'd-re-builder', role: 'Builder', k: 'active', st: 'Working', what: 'Trim clips on the timeline', step: 'Finishing its second try', prog: [2, 5, 'try'], ago: '1 min ago', href: 'task.html' },
      { id: 'd-re-lead', role: 'Lead', k: 'needs', st: 'Needs you', what: 'Paused: today’s budget is used', step: 'Raise it or wait for midnight', ago: '12 min ago', href: 'inbox.html' },
      { id: 'd-re-reviewer', role: 'Reviewer', k: '', st: 'Waiting', what: 'Nothing to review yet', step: 'Last review 40 min ago', ago: '40 min ago', href: 'project.html' }] },
    { p: 'dodge', working: 0, today: '$0.00', quiet: true, lead: false, needs: 1, note: 'Lead off · nothing running · the design waits for your OK in the Inbox', desks: [] },
  ];
  /* Project pages (UX-6 A: Now first). Every figure agrees with NOW, PROJECTS and OFFICE above.
     needs: [k, title, kind, age] (the project's Inbox items); work: tasks in progress or next; recent: [time, words, k]. */
  const PHASES = ['Brief', 'Spec', 'Design', 'Contracts', 'Build'];
  const PAGES = {
    replay: {
      lead: true, app: 'replay lead', phase: 4, met: 4, of: 9, tasks: 6, audits: 1,
      now: 'Today’s $40 is used, so new work waits.',
      nowMore: 'The builder finishes its current try first. Raise today’s limit, or work starts again at midnight.',
      act: ['Review the budget', 'inbox.html'],
      needs: [['needs', 'replay used today’s $40, so new work is paused', 'Budget', '12 min'], ['', 'Does a trim land on the exact frame you picked?', 'Your judgement', '1 h'], ['', 'The trim handles can’t be reached by keyboard', 'Auditor finding', '3 h']],
      work: [
        { id: 't-trim', k: 'active', title: 'Trim clips on the timeline', who: 'Builder', stage: 1, step: 'Wiring the trim handles into the timeline', prog: 'Try 2 of 5', ago: '1 min ago', href: 'task.html' },
        { id: 't-share', k: '', title: 'Share a clip as a link', who: 'Next', stage: 0, step: 'Starts when the budget allows', prog: '', ago: '', href: 'task.html' }],
      recent: [['13:40', 'Paused: today’s budget is used', ''], ['13:31', 'First try failed the check: audio drifts by 40 ms', ''], ['13:22', 'Trim clips on the timeline showed its work', ''], ['11:05', 'Review passed: the clip list scrolls smoothly', 'done']],
      money: { today: '$40.00', limit: '$40', pct: 100, total: '$286.40', split: [['Tasks', '$241.10'], ['Lead', '$38.90'], ['Audits', '$6.40']] },
      facts: [['Shipping', 'Draft pull requests you merge'], ['Gating', 'Standard: you OK the spec, design and contracts']],
      team: [['Lead', 'needs', 'Needs you'], ['Builder', 'active', 'Working'], ['Reviewer', '', 'Waiting']],
    },
    'atelier-ui': {
      lead: true, app: 'atelier-ui lead', phase: 2, met: 11, of: 17, tasks: 4, audits: 1,
      now: 'The designer is drawing the Office for phones; the auditor is checking contrast.',
      nowMore: 'The lead asked you one question about the toast. Nothing is blocked while it waits.',
      act: ['Answer the lead', 'inbox.html'],
      needs: [['', 'Should the toast say the time, or “just now”?', 'Question from the lead', '25 min'], ['', 'Atelier closed a window an agent opened', 'Notice', 'Mon']],
      work: [
        { id: 't-draw', k: 'active', title: 'High-fi Inbox and Office screens', who: 'Designer', stage: 1, step: 'Drawing the Office floor at 390', prog: 'Step 4 of 6', ago: '4 min ago', href: 'task.html?t=draw' },
        { id: 't-audit', k: 'active', title: 'Checking contrast in light and dark', who: 'Auditor', stage: 2, step: 'Measuring text on every surface', prog: 'Check 12 of 14', ago: 'quiet for 38 min', href: 'task.html?t=audit' },
        { id: 't-lists', k: '', title: 'High-fi Projects and Settings screens', who: 'Next', stage: 0, step: 'Starts when the designer is free', prog: '', ago: '', href: 'task.html?t=draw' }],
      recent: [['13:58', 'The designer started drawing the Office floor at 390', ''], ['13:41', 'High-fi Inbox and Office screens showed its work', ''], ['13:37', 'The lead asked how the toast should read', ''], ['13:10', 'Contrast audit started', ''], ['10:52', 'You answered: the Inbox opens first', 'done']],
      money: { today: '$12.60', limit: '$30', pct: 42, total: '$418.70', split: [['Tasks', '$352.30'], ['Lead', '$54.20'], ['Audits', '$12.20']] },
      facts: [['Shipping', 'Draft pull requests you merge'], ['Gating', 'Strict: you OK every task’s plan, and the brief, spec, design and contracts']],
      team: [['Lead', '', 'Waiting'], ['Designer', 'active', 'Working'], ['Auditor', 'active', 'Working']],
    },
    dodge: {
      lead: false, app: 'dodge lead', phase: 2, met: 0, of: 6, tasks: 0, audits: 0,
      now: 'The design waits for your OK.',
      nowMore: 'Two screens: playing a round and the results. The lead is off; it starts again when you approve.',
      act: ['Review the design', 'inbox.html'],
      needs: [['needs', 'The design for dodge is ready for your OK', 'Design gate', '2 h'], ['', 'The charter changed after you approved it', 'Charter', 'Mon']],
      work: [],
      recent: [['Yesterday 16:30', 'Lead stopped by you', ''], ['Yesterday 16:04', 'The design is ready for your OK', '']],
      money: { today: '$0.00', limit: '$20', pct: 0, total: '$64.20', split: [['Tasks', '$0.00'], ['Lead', '$58.10'], ['Audits', '$6.10']] },
      facts: [['Shipping', 'Draft pull requests you merge'], ['Gating', 'Standard: you OK the spec and design']],
      team: [['Lead', 'off', 'Off']],
    },
    /* A project created a minute ago (New project → here): the lead reads the description and drafts a charter. */
    tidepool: {
      lead: true, app: 'tidepool lead', phase: 0, met: 0, of: 0, tasks: 0, audits: 0, fresh: true,
      now: 'The lead is reading your description.',
      nowMore: 'It drafts a charter next, about ten minutes. You approve it in the Inbox; nothing else to do now.',
      act: null, needs: [], work: [], recent: [['14:02', 'You created tidepool', '']],
      money: { today: '$0.04', limit: '$20', pct: 0, total: '$0.04', split: [['Tasks', '$0.00'], ['Lead', '$0.04'], ['Audits', '$0.00']] },
      facts: [['Shipping', 'Draft pull requests you merge'], ['Gating', 'Standard: you OK the spec, design and contracts']],
      team: [['Lead', 'active', 'Working']],
    },
  };
  /* Task pages (UX-4 A: a full page; UX-5 A: stage, latest step, last active). Same figures as OFFICE and PAGES.
     stage: 0 Planning … 4 Done; prog: [done, of, unit] inside the stage when known; tries: one letter per try,
     f failed the check · n now · p passed · '' not used yet; steps: [time, words] newest first (the latest steps);
     proof: [img, caption, kind, extra] from the view port (kind 'rec' = recording with its length); outs: [met, words, status]. */
  const TASKS = {
    trim: {
      p: 'replay', title: 'Trim clips on the timeline', role: 'Builder', k: 'active', word: 'Working', stage: 1, prog: null,
      step: 'Wiring the trim handles into the timeline',
      why: 'Its first try let the sound drift by 40 ms after a trim, so the check sent it back. It finishes this try before today’s pause.',
      ago: '1 min ago', into: '14 min into this try', started: 'Today 13:08',
      tries: ['f', 'n', '', '', ''], spend: ['$6.20', '$10', 62], files: 7, pr: 'Draft #14', tests: false,
      steps: [['14:01', 'Wiring the trim handles into the timeline'], ['13:56', 'Moved each cut to the nearest audio frame'], ['13:48', 'Started its second try'], ['13:31', 'First try failed the check: the sound drifts by 40 ms']],
      proofAt: 'From the first try · 13:22',
      proofNote: 'The handles trim a clip to the exact frame. The recording shows the sound slipping after the cut, which is what the check caught.',
      proof: [['replay-trim.png', 'Trim handles on a clip', 'img'], ['replay-player.png', 'The trimmed clip playing', 'rec', '0:48'], ['replay-feed.png', 'The clip list on a phone', 'phone']],
      log: ['✓ 37 tests passed', '✗ trim.spec.ts › keeps the sound in sync after a trim', '  expected drift ≤ 5 ms, got 40 ms', 'npm test exited with 1'],
      outs: [[true, 'Dragging a handle trims the clip to the exact frame', 'Met by the first try’s check'], [false, 'Trimming a clip keeps the sound in sync', 'Being built: the second try']],
      check: ['npm test -- trim', 'Last run 13:31: 37 of 38 passed'],
      review: 'Not reviewed yet. The reviewer watches the recording once the check passes.',
      decisions: [['Cuts snap to the nearest audio frame, not the video frame', 'The sound can’t drift; a cut moves by at most 20 ms. Reversible: one setting.'], ['Kept the old trim code behind a switch', 'So the second try can be compared with the first. Removed before review.']],
      brief: 'Let the owner trim a clip by dragging handles on the timeline. Done when a trim lands on the exact frame, the sound stays in sync (drift ≤ 5 ms), and the handles are 44 px on a phone.',
      notes: [['13:48', 'Second try: snapping cuts to audio frames. Next, the handles’ keyboard steps.'], ['13:20', 'First try done; recording and screenshots sent to the view port.']],
      history: [['13:08', 'Started · the lead planned it as part of Build'], ['13:09', 'First try started'], ['13:22', 'Showed its work: 2 screenshots and a recording'], ['13:31', 'The check failed: the sound drifts by 40 ms'], ['13:40', 'replay reached today’s $40; this try finishes first'], ['13:48', 'Second try started']],
    },
    audit: {
      p: 'atelier-ui', title: 'Checking contrast in light and dark', role: 'Auditor', k: 'active', word: 'Working', stage: 2, prog: [12, 14, 'checks'],
      step: 'Measuring text on every surface',
      why: 'It measures every text colour against the surface under it, in both modes.',
      ago: '38 min ago', into: '52 min in', started: 'Today 13:10', quiet: 'Quiet for 38 min, longer than usual. It usually reports every few minutes.',
      tries: ['n'], spend: ['$2.10', '$4', 52], files: 0, pr: '', tests: false,
      steps: [['13:24', 'Measuring text on every surface'], ['13:19', 'Light mode: 12 of 12 pairs pass'], ['13:12', 'Read the colour tokens']],
      proofAt: '', proofNote: '', proof: [], log: [],
      outs: [[false, 'Every text pair passes WCAG AA in light and dark', '12 of 14 checks done']],
      check: ['node contrast.mjs tokens.css', 'Not run yet'],
      review: 'Audits aren’t reviewed: what it finds comes to your Inbox.',
      decisions: [], brief: 'Measure every text and surface pair in light and dark against WCAG AA (4.5:1, 3:1 for large text). Report each failure as a finding.',
      notes: [['13:19', 'Light mode done, no failures. Dark mode next.']],
      history: [['13:10', 'Started · scheduled audit'], ['13:12', 'Read the colour tokens'], ['13:19', 'Light mode: 12 of 12 pairs pass']],
    },
    draw: {
      p: 'atelier-ui', title: 'High-fi Inbox and Office screens', role: 'Designer', k: 'active', word: 'Working', stage: 1, prog: [4, 6, 'steps'],
      step: 'Drawing the Office floor at 390',
      why: 'The Office is done on the desk; this step fits each desk into a phone row.',
      ago: '4 min ago', into: '1 h 12 min in', started: 'Today 12:58',
      tries: ['n', '', ''], spend: ['$9.80', '$16', 61], files: 5, pr: 'Draft #31', tests: false,
      steps: [['13:58', 'Drawing the Office floor at 390'], ['13:41', 'Office at 1440 in dark and light'], ['13:20', 'The shell: sidebar, rail and tab bar']],
      proofAt: 'Shown working · 13:41',
      proofNote: 'The Office on the desk in both modes. Each desk has a lit window while its agent works.',
      proof: [['../screens2/img/office-1440-dark.png', 'The Office at 1440, dark', 'img'], ['../screens2/img/office-390-darkv.png', 'The Office on a phone', 'phone']],
      log: ['30 renders, 0 console errors', 'contrast: 0 pairs under AA'],
      outs: [[true, 'Every screen in the chosen brand, dark first', 'Office done'], [false, 'Every screen at 390, 768 and 1440', 'Office at 390 in progress']],
      check: ['atelier verify design', 'Last run 13:41: passed'],
      review: 'Not reviewed yet.',
      decisions: [['A floor per project, a desk per agent', 'Your recommended answer UX-8 A; a list is one file away.']],
      brief: 'Turn the wireframes into high-fi screens in the chosen brand, dark first, with every state.',
      notes: [['13:41', 'Office desk done. Phone next.']],
      history: [['12:58', 'Started'], ['13:20', 'The shell drawn'], ['13:41', 'Showed its work: 2 screenshots']],
    },
  };
  return { UX, NOW, PROJECTS, OFFICE, PHASES, PAGES, TASKS, ACTIVITY };
})();

(() => {
  if (!document.getElementById('wf')) return; // the high-fi screens load this file for the model only
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

  const { NOW, PROJECTS, OFFICE } = window.ATELIER_MODEL;
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
            ${row(dot('', 'Waiting'), 'Should the toast say the time, or “just now”?', 'atelier-ui · Question from the lead', '25 min')}
            ${row(dot('', 'Waiting'), 'Does a trim land on the exact frame you picked?', 'replay · Your judgement', '1 h')}
            ${row(dot('', 'Waiting'), 'The trim handles can’t be reached by keyboard', 'replay · Auditor finding', '3 h')}
            ${row(dot('', 'Waiting'), 'The charter changed after you approved it', 'dodge · Charter', 'Mon')}
            ${row(dot('', 'Waiting'), 'Atelier closed a window an agent opened', 'atelier-ui · Notice', 'Mon')}
          </div></section>
      </aside>
    </div>`,
  };

  S.office = () => ({
    title: 'Office',
    head: `<h1>Office</h1><span class="sum">${NOW.working} working · <span class="is-needs">${NOW.needs} need you</span> · ${NOW.onDuty} on duty</span>`,
    body: `<div class="wf-body"><div class="wf-col is-list" style="max-width:none">
      ${note('Board · a floor per project, busiest first, desks in rows of three (UX-8 A)')}
      ${OFFICE.filter(f => !f.quiet).map(f => `<section class="wf-floor"><h2 class="wf-h">${f.p} <span class="n">${esc(`${f.working} working · ${f.today} today${f.atLimit ? ', at its limit' : ''}`)}</span></h2><div class="wf-desks">${f.desks.map(d => `
        <a href="${d.href}" class="wf-desk"><span class="who">${dot(d.k, d.st)}<b>${d.role}</b><span class="st${d.k ? ' is-' + d.k : ''}">${d.st}</span></span><span class="what">${esc(d.what)}</span><span class="wf-meta">${esc(d.quiet || `${d.step} · ${d.ago}`)}</span></a>`).join('')}</div></section>`).join('')}
      ${OFFICE.filter(f => f.quiet).map(f => `<p class="wf-quiet">${f.p} · quiet · lead off · ${f.today} today</p>`).join('')}
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

  const ptabs = active => `<nav class="wf-tabsrow tabs" aria-label="Project">${[['Overview'], ['Tasks', '2'], ['Outcomes', '4/9'], ['Audits', '1'], ['Docs'], ['Activity'], ['Settings']].map(([t, c]) =>
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
          ${row(dot('', 'Waiting'), 'Does a trim land on the exact frame you picked?', '', '1 h', { href: 'inbox.html' })}
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
        ${note('Facts 280 · middle: one line under the header · phone: a Facts fold')}
        <details class="details wf-factsfold" data-desk-open><summary>Facts · today’s spend, so far, shipping, gating${I('chevron-down')}</summary>
        <dl><dt>Today</dt><dd class="is-needs">$40.00 of $40</dd><dt>So far</dt><dd>$286.40</dd><dt>Shipping</dt><dd>Draft PRs</dd><dt>Gating</dt><dd>Standard</dd></dl>
        </details>
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
