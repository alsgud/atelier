/* D6 high-fi Inbox: the Flow Inbox engine (feel/shared/inbox.js, every behaviour of D2/D3: one item large, the dock,
   decide → sent → next, toast with Undo anchored to the dock, J/K, Ctrl+Enter, Z) wearing the D6 shell (hf.js) and
   the one data model (ux/wf/wf.js). This file only supplies the content and the hooks; it runs before the engine.
   Items are the wireframe's seven (7 waiting, 2 need you now; replay 3, atelier-ui 2, dodge 2), so every count agrees
   with the Office, the project pages and the chrome (AC-11). ?kind= swaps the last item (atelier-ui's notice) for
   another kind, so every kind has its look without changing a count: outcome · outcomes · plan · screen · charter ·
   github · trust. Query: everything the engine takes (open, state=zero|empty|loading|error|stale, fail, latency, demo)
   plus theme, motion, shot. */
(() => {
  const q = new URLSearchParams(location.search);
  const ask = (a, b) => `<blockquote class="quote" style="margin:0">${a}<footer>${b}</footer></blockquote>`;
  const choices = (...c) => `<fieldset class="choices" style="max-width:var(--measure)"><legend class="section-label" style="margin-bottom:var(--space-2)">Suggested answers</legend>${c.map(t => `<label class="choice"><input type="radio" name="ans"> ${t}</label>`).join('')}</fieldset>`;
  const link = (href, icon, words) => `<a href="${HF.keep(href)}">${I(icon)}${words}</a>`;

  const ITEMS = [
    { id: 'gate', needs: true, glyph: 'design', kind: 'Design gate', project: 'dodge', age: '2h', ageLong: '2 h ago',
      title: 'The design for dodge is ready for your OK', short: 'design gate',
      body: () => `
        <p class="lede">The designer drew the two screens you asked for: a round mid‑spiral and the results. Dark, one accent, and the dot you steer is always the brightest thing on screen.</p>
        <div class="frames is-hero">
          ${frame('dodge-play.png', 'Playing a round', '', '')}
          ${frame('dodge-results.png', 'Results after the round')}
          ${frame('dodge-play-phone.png', 'A round on a phone', 'is-phone')}
        </div>
        <div class="links"><a href="#">${I('external')}Open the clickable screens</a><a href="#">${I('log')}Read the design document · 3 min</a></div>
        <details class="details"><summary>${I('chevron-down')}What’s in it</summary><div class="details-body">
          <span>Four files: <code>tokens.css</code>, <code>play.html</code>, <code>results.html</code> and <code>DESIGN.md</code>. Nothing is merged until you approve.</span></div></details>`,
      dock: { note: 'Approve in your own words, or say why you skip it', required: 'Say in a few words what you approve, or why you skip it. It goes to the designer.', rejectNeedsNote: true,
        primary: 'Approve design', busy: 'Approving…', secondary: 'Skip this phase',
        done: 'Approved. The lead starts again and plans the build.', toast: 'Approved the design for dodge.', log: 'Approved the design for dodge',
        alt: { done: 'Skipped. The lead plans the build from the brief.', toast: 'Skipped the design phase for dodge.', log: 'Skipped the design phase for dodge' } } },

    { id: 'budget', needs: true, glyph: 'budget', kind: 'Budget', project: 'replay', age: '12m', ageLong: '12 min ago',
      title: 'replay used today’s $40, so new work is paused', short: 'budget',
      body: () => `
        <p class="lede">The builder finishes the try it is on. Nothing new starts until you raise the limit, or until midnight.</p>
        <div class="meter" style="max-width:var(--measure)"><div class="meter-head"><span>Spent today on replay</span><b>$40.00 of $40</b></div><div class="meter-track is-full"><i style="--value:100%"></i></div></div>
        <dl class="facts is-money">
          <dt>Clip list that scrolls smoothly</dt><dd class="num">$21.70</dd>
          <dt>Trim clips on the timeline</dt><dd class="num">$6.20</dd>
          <dt>The lead</dt><dd class="num">$6.20</dd>
          <dt>Reviews</dt><dd class="num">$5.90</dd>
        </dl>
        <p class="faint" style="margin:0;font-size:var(--text-sm)">API‑equivalent cost, not a bill. Your Claude plan is 41 % used.</p>`,
      dock: { primary: 'Raise today to $60', busy: 'Raising…', ghost: 'Budget settings', ghostHref: HF.keep('settings.html?p=replay'), hint: 'Or do nothing: work starts again at midnight',
        done: 'Raised to $60. Work starts again.', toast: 'Raised replay’s limit to $60 for today.', log: 'Raised replay’s limit to $60 for today' } },

    { id: 'question', glyph: 'question', kind: 'Question from the lead', project: 'atelier-ui', age: '25m', ageLong: '25 min ago',
      title: 'Should the toast say the time, or “just now”?', short: 'question',
      body: () => `
        ${ask('After you decide something, a toast confirms it with Undo. Should it say when it happened (“14:02”) or “just now”? Activity shows the exact time either way.', 'The lead, planning how the Inbox confirms a decision')}
        ${choices('Say “just now”', 'Say the time')}`,
      dock: { note: 'Or write your own answer', primary: 'Send answer', busy: 'Sending…', ghost: 'Open the project', ghostHref: HF.keep('project.html?p=atelier-ui'),
        done: 'Answered. The lead carries on.', toast: 'Answered the lead.', log: 'Answered: how the toast says the time' } },

    { id: 'judge', glyph: 'proof', kind: 'Your judgement', project: 'replay', age: '1h', ageLong: '1 h ago',
      title: 'Does a trim land on the exact frame you picked?', short: 'your judgement',
      body: () => `
        <p class="lede">Shown working: the builder trimmed 12 clips by dragging the handles, and each cut landed on the frame under the handle. Watch one and say whether it feels exact.</p>
        <div class="frames is-hero">
          ${frame('replay-trim.png', 'Trim handles on a clip')}
          ${frame('replay-player.png', 'The trimmed clip playing', '', '0:48')}
          ${frame('replay-feed.png', 'The clip list on a phone', 'is-phone')}
        </div>
        <div class="links"><a href="#">${I('external')}Try it yourself</a>${link('task.html', 'log', 'Open the task')}</div>`,
      dock: { note: 'If you reject it, say what’s wrong', rejectNeedsNote: true, primary: 'Accept', busy: 'Accepting…', secondary: 'Reject',
        done: 'Accepted. Marked as met.', toast: 'Accepted: trims land on the exact frame.', log: 'Accepted: trims land on the exact frame',
        alt: { done: 'Rejected. The builder fixes it and asks again.', toast: 'Rejected: trims don’t land on the exact frame yet.', log: 'Rejected: trims don’t land on the exact frame yet' } } },

    { id: 'finding', glyph: 'finding', kind: 'From the auditor', project: 'replay', age: '3h', ageLong: '3 h ago',
      title: 'The trim handles can’t be reached by keyboard', short: 'auditor finding',
      body: () => `
        <p class="lede">You can drag the handles with a mouse or a finger, but Tab skips them, so trimming needs a pointer. You asked for full keyboard use.</p>
        <dl class="facts">
          <dt>If nobody fixes it</dt><dd>Clips can’t be trimmed from the keyboard at all.</dd>
          <dt>To change later</dt><dd>Cheap now: the builder is making the handles in this task.</dd>
        </dl>
        <details class="details"><summary>${I('chevron-down')}Technical details</summary><div class="details-body">
          <span>Outcome <code>AC-13</code>: full keyboard operation with visible focus.</span>
          <span>The handles take pointer events but have no <code>tabindex</code> or role. Arrow keys should move a handle one frame, Shift + arrow one second.</span></div></details>`,
      dock: { note: 'Add a note for the lead (optional)', primary: 'Yes, fix it', busy: 'Sending…', secondary: 'No, it’s fine',
        done: 'Sent. The lead adds it to the trim task.', toast: 'Asked the team to fix it.', log: 'Asked the team to make the trim handles reachable by keyboard',
        alt: { done: 'Sent. The lead leaves it as it is.', toast: 'Told the lead it can stay.', log: 'Kept the trim handles pointer‑only' } } },

    { id: 'charter', glyph: 'log', kind: 'Charter changed', project: 'dodge', age: 'Mon', ageLong: 'Monday',
      title: 'The charter changed after you approved it', short: 'charter',
      body: () => `
        <p class="lede">dodge’s charter was edited on Monday, after you approved it on 18 Oct. The team works from the new wording until you decide.</p>
        <div class="diff" role="group" aria-label="What changed, under Taste">
          <span class="diff-sec">Taste</span>
          <p class="diff-old"><span class="sr-only">Removed: </span>Loud arcade colours, a new colour every level.</p>
          <p class="diff-new"><span class="sr-only">Added: </span>Calm: dark, one accent, and the dot you steer is always the brightest thing.</p>
        </div>
        <p class="faint" style="margin:0;font-size:var(--text-sm)">Changed Monday 16:02 in the project’s charter file. One section changed; the rest is as you approved it.</p>`,
      dock: { note: 'Approve in your own words', required: 'Say in a few words what you approve. It goes to the lead.', primary: 'Approve the new wording', busy: 'Approving…', ghost: 'Open the charter', ghostHref: HF.keep('project.html?p=dodge&tab=docs'),
        done: 'Approved. The charter stands as it is now.', toast: 'Approved dodge’s changed charter.', log: 'Approved dodge’s changed charter' } },

    { id: 'notice', glyph: 'screen', kind: 'Notice', project: 'atelier-ui', age: 'Mon', ageLong: 'Monday',
      title: 'Atelier closed a window an agent opened', short: 'notice',
      body: () => `
        <p class="lede">On Monday at 15:40 the designer opened a browser window on your screen without asking. Atelier closed it after 5 seconds. Nothing was typed or clicked in it.</p>
        <dl class="facts">
          <dt>Who</dt><dd>The designer, atelier-ui</dd>
          <dt>What it showed</dt><dd>The Office mockup, for a screenshot</dd>
          <dt>Since then</dt><dd>Its screenshots run off your screen.</dd>
        </dl>`,
      dock: { primary: 'Got it', busy: 'Saving…', done: 'Noted.', toast: 'Noted.', log: 'Noted: Atelier closed a window' } },
  ];

  /* Other kinds, each in the notice's slot (atelier-ui, Monday), so the counts stay the same. */
  const OTHER = {
    outcome: { glyph: 'outcome', kind: 'Outcome to approve', title: 'Approve an outcome: it works well on your phone, not just your desk', short: 'outcome',
      body: () => `${ask('It works well on my phone, not just on my desk.', 'Your words, from the brief')}<p class="lede">The lead checks it like this: 360 px wide, no sideways scrolling, and every button big enough to tap.</p>`,
      dock: { primary: 'Approve', busy: 'Approving…', secondary: 'Retire it', done: 'Approved. The lead adds it to the checks.', toast: 'Approved the outcome.', log: 'Approved an outcome: works well on your phone',
        alt: { done: 'Retired. The lead drops it from the checks.', toast: 'Retired the outcome.', log: 'Retired an outcome: works well on your phone' } } },
    outcomes: { glyph: 'outcome', kind: 'Outcomes to approve', title: 'Approve 3 outcomes the lead wrote from your brief', short: 'outcomes',
      body: () => `<p class="lede">Each one is a sentence the lead checks before it calls the work done. Approve them together, or decide each on the project’s Outcomes tab.</p>
        <ol class="olist"><li>When I open the dashboard I know in one glance whether anything needs me.</li><li>I can make any decision from the Inbox in one or two taps.</li><li>It feels calm: plain sentences, colour only where it means something.</li></ol>`,
      dock: { primary: 'Approve all 3', busy: 'Approving…', ghost: 'Decide each', ghostHref: HF.keep('project.html?p=atelier-ui&tab=outcomes'), done: 'Approved. The lead adds all 3 to the checks.', toast: 'Approved 3 outcomes.', log: 'Approved 3 outcomes for atelier-ui' } },
    plan: { glyph: 'plan', kind: 'Task plan', title: 'Start a task: draw the Settings screens', short: 'task plan',
      body: () => `<p class="lede">The designer draws global Settings and the per‑project Settings tab, at three widths, dark and light. Up to 3 tries, about $8.</p>
        <details class="details"><summary>${I('chevron-down')}What it will change</summary><div class="details-body"><span>Owns <code>design/screens2/settings.*</code>. Done when every setting the old dashboard had is on the page and the design check passes.</span></div></details>`,
      dock: { primary: 'Approve plan', busy: 'Approving…', ghost: 'Read the brief', ghostHref: HF.keep('task.html?v=plan'), done: 'Approved. The designer starts within a minute.', toast: 'Approved the plan.', log: 'Approved: draw the Settings screens' } },
    screen: { glyph: 'screen', kind: 'Screen use', title: 'The designer asks to open a window on your screen', short: 'screen use',
      body: () => `${ask('I need to check how the Office looks in a real browser window at your screen’s size. It opens one window, takes three screenshots and closes it.', 'The designer, atelier-ui')}
        <p class="lede">If you allow it, Atelier closes the window when the time is up, whatever the agent is doing.</p>`,
      dock: { primary: 'Allow for 10 min', busy: 'Allowing…', secondary: 'Not now', done: 'Allowed until 14:12.', toast: 'Allowed the designer your screen for 10 min.', log: 'Allowed screen use for 10 min',
        alt: { done: 'Declined. The designer works off screen.', toast: 'Said not now.', log: 'Declined screen use' } } },
    charter: { glyph: 'log', kind: 'Charter to approve', title: 'The lead redrafted the charter after your notes', short: 'charter',
      body: () => `<p class="lede">It now says what you told the lead on Friday. Read it here; approve it in your own words, or open it to edit.</p>
        <div class="doc"><h3>What we’re making</h3><p>A dashboard that lets one person run a team of AI agents from their phone: what needs them, who is working, and proof of what was done.</p><h3>The quality bar</h3><p>It holds up next to Linear and Vercel. Calm: plain sentences, colour only where it means something.</p></div>`,
      dock: { note: 'Approve in your own words', required: 'Say in a few words what you approve. It goes to the lead.', primary: 'Approve charter', busy: 'Approving…', ghost: 'Edit it', ghostHref: HF.keep('project.html?p=atelier-ui&tab=docs'),
        done: 'Approved. The lead plans the spec.', toast: 'Approved the charter.', log: 'Approved the charter for atelier-ui' } },
    github: { glyph: 'blocked', kind: 'Blocked', title: 'atelier-ui’s work isn’t reaching GitHub', short: 'blocked',
      body: () => `<p class="lede">The last 3 pushes failed, so finished work stays on this PC and no draft pull requests appear. Sign in to GitHub again on this PC; Atelier tries again every 10 minutes.</p>
        <details class="details"><summary>${I('chevron-down')}Technical details</summary><div class="details-body"><span><code>git push</code> said: <code>Authentication failed for 'https://github.com/…/atelier-ui.git'</code>. The token on this PC has expired.</span></div></details>`,
      dock: { hint: 'Nothing to decide here. This goes away by itself once a push works.' } },
    trust: { glyph: 'outcome', kind: 'Earned trust', title: 'atelier-ui’s team has earned looser gating', short: 'gating',
      body: () => `<p class="lede">You approved the last 14 task plans without a change. On Standard you still OK the spec, the design and the contracts, but no longer each task’s plan.</p>
        <dl class="facts"><dt>Now</dt><dd>Strict: you OK every plan</dd><dt>Would be</dt><dd>Standard</dd><dt>Change back</dt><dd>Any time, in the project’s Settings</dd></dl>`,
      dock: { primary: 'Loosen to standard', busy: 'Saving…', secondary: 'Keep it strict', done: 'Loosened. Plans start without asking.', toast: 'atelier-ui is on Standard gating now.', log: 'Loosened atelier-ui to Standard gating',
        alt: { done: 'Kept strict.', toast: 'Kept strict gating.', log: 'Kept atelier-ui on strict gating' } } },
  };
  const k = q.get('kind');
  if (OTHER[k]) ITEMS[6] = { ...ITEMS[6], id: k, ...OTHER[k] };

  /* Working now: the three working desks in the Office, with the same figures (task page links). */
  const WORKING = [
    { id: 'draw', what: 'High-fi Inbox and Office screens', meta: 'atelier-ui · designer', when: '4 min ago', n: 4, of: 6, unit: 'step', href: HF.keep('task.html?t=draw') },
    { id: 'trim', what: 'Trim clips on the timeline', meta: 'replay · builder', when: '1 min ago', n: 2, of: 5, unit: 'try', href: HF.keep('task.html') },
    { id: 'audit', what: 'Checking contrast in light and dark', meta: 'atelier-ui · auditor', when: 'quiet for 38 min', n: 12, of: 14, unit: 'checks', href: HF.keep('task.html?t=audit') },
  ];
  window.INBOX = { items: ITEMS, working: WORKING, spent: HF.M.NOW.today,
    earlier: [['Accepted: the clip list scrolls smoothly', 'replay', '3h'], ['Approved the spec for atelier-ui', 'atelier-ui', '5h']] };
  window.IMG_BASE = '../screens/img/';

  const picks = ['UX-1', 'UX-10', 'UX-2', 'UX-7', 'UX-9'].map(x => `${x} ${HF.M.UX[x][0]}`).join(' · ');
  window.FEEL = {
    name: 'flow', morph: true,
    /* The D6 chrome, counted from the page's own list so it ticks as you decide */
    chrome: ({ n, u, loading, items }) => {
      const pw = {}; HF.M.PROJECTS.forEach(p => { pw[p.id] = items.filter(x => x.project === p.id).length; });
      const c = HF.chrome('inbox', { now: { waiting: n, needs: u }, pw, known: !loading });
      document.getElementById('side').innerHTML = c.side + c.rail + c.top;
      document.getElementById('tabs').innerHTML = c.tabs;
      document.title = !loading && n ? `(${n}) Inbox · Atelier` : 'Inbox · Atelier'; /* ticks as you decide */
    },
    topBars: ['.hf-top', '.page-head'], tabBar: '.hf-tabs',
    headEnd: () => HF.live(),
    projectHref: p => HF.keep(HF.pHref(p)),
    errorHTML: () => `<div class="hf-body">${HF.loadError('The Inbox')}<aside class="faint" style="font-size:var(--text-sm)">The list comes back when the Inbox loads.</aside></div>`,
    firstRunHTML: () => `<div class="hf-body"><div class="hf-empty"><h2 id="ttl" tabindex="-1">Nothing needs you yet.</h2><p>Start a project, and everything that needs your say lands here: designs to approve, questions, proof to judge.</p><a class="btn btn-primary" href="${HF.keep('new.html')}">${I('plus')}New project</a></div></div>`,
    drawn: () => {
      const m = document.getElementById('main');
      if (!m.querySelector('.mock-flag')) m.insertAdjacentHTML('beforeend', `<a class="mock-flag" href="${HF.keep('index.html')}" title="Drawn on the recommended UX answers; the owner hasn’t replied yet">PROVISIONAL · drawn on ${picks}</a>`);
    },
  };

  /* Dark first: with no theme in the query the page is dark (set after hf.js read the query, so links stay clean). */
  if (!q.get('theme')) { q.set('theme', 'dark'); history.replaceState(null, '', `${location.pathname}?${q}${location.hash}`); }
})();
