/* D5 §8 decisions. Numbering fixed in DESIGN.md › UX (D5). Each: the question, why it matters to the owner,
   2–3 options (one marked rec), and an optional schematic picture per option (`fig`, keyed to FIGS in ux.js).
   `scope: true` marks an option that needs new server behaviour or new scope (the lead's call, Open questions). */
window.DECISIONS = [
  {
    id: 1, title: 'What opens first', jobs: 'J1',
    why: 'The first screen answers “does anything need me?” in one glance (AC-1). It is the screen you see most.',
    options: [
      { k: 'A', name: 'The Inbox, always', rec: true, text: 'Same screen every time; when nothing needs you it says so in one quiet line and shows who is working.', fig: 'first-inbox' },
      { k: 'B', name: 'The Inbox if something needs you, else the Office', text: 'Skips a screen on quiet days, but the first screen changes under you, so you have to read it before you trust it.', fig: 'first-office' },
      { k: 'C', name: 'Wherever you were last', text: 'Good for long desk sessions; on the phone it often reopens an old task page.' },
    ],
    because: 'One fixed home is what makes the glance trustworthy. The quiet zero already shows “3 agents working” with a link to the Office.',
  },
  {
    id: 2, title: 'The phone’s tab bar', jobs: 'J1 J2',
    why: 'Four places sit under your thumb; everything else is one more tap away.',
    options: [
      { k: 'A', name: 'Inbox · Office · Projects · Activity', rec: true, text: 'As today. Settings and the plan sit in the top bar (gear, and today’s spend as text).', fig: 'tabs-a' },
      { k: 'B', name: 'Inbox · Office · Projects · You', text: '“You” holds Activity, your plan, spend and Settings. Tidier, but Activity moves one tap deeper.', fig: 'tabs-b' },
      { k: 'C', name: 'Inbox · Team · Projects', text: 'Three big targets; Activity lives inside each project and in Projects’ foot.', fig: 'tabs-c' },
    ],
    because: 'Your thumb already knows today’s tabs, and Activity is where you check what happened overnight.',
  },
  {
    id: 3, title: 'Where settings that cover every project live', jobs: 'J5',
    why: 'Today the Claude plan limits sit inside each project, though one plan covers them all.',
    options: [
      { k: 'A', name: 'One global Settings, plus a Settings tab per project', rec: true, text: 'Global: your Claude plan limits, appearance, this device, about. Per project: approvals, gating, reporting, shipping, budgets, team, lead.' },
      { k: 'B', name: 'Keep everything per project', text: 'As today; appearance moves to a small menu by your name. Changing the plan limits in one project changes them for all, which surprises.' },
    ],
    because: 'Each setting then lives where its effect is: one plan, many projects.',
  },
  {
    id: 4, title: 'Opening a task from the Office or a task list', jobs: 'J4 J2',
    why: 'You open tasks to watch them and look at their proof. The question is whether you leave the list to do it.',
    options: [
      { k: 'A', name: 'A full page with its own address', rec: true, text: 'Back returns you to the list where you were. Proof gets the whole width. Same on desk and phone.', fig: 'task-page' },
      { k: 'B', name: 'A peek beside the list on the desk', text: 'Faster to flick through several tasks; proof is squeezed to about 520 px and there are now two detail patterns (Inbox and peek). Full page on the phone.', fig: 'task-peek' },
    ],
    because: 'Proof is the point of the task page and wants the width; one detail pattern (the Inbox’s) is easier to learn than two.',
  },
  {
    id: 5, title: 'How a task’s progress reads', jobs: 'J4',
    why: 'Today’s “iteration 0 of 6” says nothing about how close the work is (your pain point 3).',
    options: [
      { k: 'A', name: 'Its stage, the latest step, and when it last did anything', rec: true, text: 'Planning · Building · Checking · Review · Done, with “Wiring the trim handles into the timeline” and “last active 1 min ago”.', fig: 'prog-stage' },
      { k: 'B', name: 'A percentage bar', text: 'Steps done of steps planned. Looks precise; agents re-plan, so it jumps backwards.', fig: 'prog-bar' },
      { k: 'C', name: 'Time so far against the usual', text: '“40 min so far, these usually take about an hour.” Honest, but says nothing about what it is doing.', fig: 'prog-time' },
    ],
    because: 'A stage never goes backwards for the wrong reason, and the step sentence tells you what it is actually doing.',
  },
  {
    id: 6, title: 'The top of a project page', jobs: 'J2 J5',
    why: 'R13: what needs you here, what is happening, and progress against the milestone, before anything else.',
    options: [
      { k: 'A', name: '“Now” first, figures in one line under it', rec: true, text: 'Needs you here (1) · working now (2 tasks) · the phase track · the next step; then “4 of 9 outcomes met · $40.00 of $40 today”.', fig: 'proj-now' },
      { k: 'B', name: 'Figures first', text: 'Four numbers across the top (working, waiting, outcomes, spend), then Now. Reads like a dashboard; the numbers win the eye even when they are fine.', fig: 'proj-figs' },
      { k: 'C', name: 'The phase track as the header', text: 'Brief → Spec → Design → Contracts → Build, large, then Now. Good for the milestone, weak for “what needs me”.', fig: 'proj-phase' },
    ],
    because: 'Sentences before numbers: the page tells you what is going on, and the figures confirm it.',
  },
  {
    id: 7, title: 'Navigation between 768 and 1279 px (tablet, small laptop window)', jobs: 'J1',
    why: 'The 240 px sidebar eats a third of an iPad in portrait.',
    options: [
      { k: 'A', name: 'A 64 px rail', rec: true, text: 'Icons with their counts; the name appears on hover and focus; projects listed by their dot and first letters.', fig: 'nav-rail' },
      { k: 'B', name: 'The phone’s tab bar up to 1023, the sidebar from 1024', text: 'Fewer patterns, but the tab bar looks out of place on a laptop window.', fig: 'nav-tabs' },
      { k: 'C', name: 'A sidebar you fold yourself', text: 'Full sidebar with a fold button; the device remembers. One more control to think about.', fig: 'nav-fold' },
    ],
    because: 'The rail keeps the same places in the same order as the sidebar, so nothing moves when the window narrows.',
  },
  {
    id: 8, title: 'How the Office looks', jobs: 'J2',
    why: 'R12 asks to keep the office’s spirit (playful) and make it clear who is working, waiting or stuck.',
    options: [
      { k: 'A', name: 'A floor per project, a desk per agent', rec: true, text: 'Desks in rows of three, busiest floor first; each desk: role, what it is doing in a phrase, its status dot. Quiet floors fold to one line.', fig: 'office-floors' },
      { k: 'B', name: 'One list of agents, grouped by status', text: 'Working · Waiting · Stuck, the project on each row. Fastest to scan, loses the office.', fig: 'office-list' },
    ],
    because: 'The floors keep the spirit you asked for and still read in a glance, because only the busy floors open.',
  },
  {
    id: 9, title: 'Where spend and your plan sit', jobs: 'J5',
    why: 'Money is the one figure you want to see without asking, and the one that most easily turns into clutter.',
    options: [
      { k: 'A', name: 'In the chrome, quietly', rec: true, text: 'Desk: the sidebar foot (plan meter, spent today). Phone: “Today $52.60” in the top bar, tap for the breakdown. Each project page shows its share.', fig: 'money-foot' },
      { k: 'B', name: 'Only on the project page and in Settings', text: 'Calmest chrome; you have to go looking, and the total across projects has no home.', fig: 'money-none' },
      { k: 'C', name: 'A strip across the top of every screen', text: 'Always in view on desk and phone; costs a row on every screen.', fig: 'money-strip' },
    ],
    because: 'Always in view, never loud: one figure, from the one summary (R2), the same everywhere.',
  },
  {
    id: 10, title: 'Confirm, or undo', jobs: 'J1 J7',
    why: 'A confirm costs a tap every time; an undo costs nothing until you need it.',
    options: [
      { k: 'A', name: 'Decisions are instant with Undo; confirm only what can’t be undone', rec: true, text: 'Approve, answer, dismiss: instant, Undo in the toast for 6 s. Stop or restart the lead, stop a task, and run an audit (it spends money): one sentence to confirm.' },
      { k: 'B', name: 'Confirm every decision', text: 'Safest, slowest: every decision becomes two taps, which doubles journey 1.' },
      { k: 'C', name: 'Never confirm; hold to stop', text: 'Stopping the lead becomes press-and-hold. Fast, but hidden and hard to do with a keyboard.' },
    ],
    because: 'Linear’s model: you go faster when mistakes are cheap. Undo needs a short grace period on the server (open question for the lead); without it, A keeps the confirms and drops Undo.',
  },
  {
    id: 11, title: 'An early budget warning', jobs: 'J5',
    why: 'Today you first hear about money when a project hits its daily limit and stops.',
    options: [
      { k: 'A', name: 'No early warning', text: 'As today: the limit item in the Inbox is the first you hear.' },
      { k: 'B', name: 'A quiet Inbox item at 80 %', scope: true, text: '“replay has used most of today’s $40” in When you have a minute, with Raise today. Needs the server to raise a new item.' },
      { k: 'C', name: 'Words on the money line, no Inbox item', rec: true, text: 'At 80 % the project’s money line reads “$32.00 of $40 today · most of today’s budget used”, in neutral text. Nothing new from the server: the summary already has both figures.' },
    ],
    because: 'You see it where you already look, the Inbox stays for things only you can decide, and it adds no scope. Pick B if you want to be told.',
  },
  {
    id: 12, title: 'Starting a project: a short form or a brief', jobs: 'J3',
    why: 'The lead writes the brief and brings it to you as the first gate either way; the question is how much you say up front.',
    options: [
      { k: 'A', name: 'The form as today, fewer words', text: 'Name, one line on what it is for, team, shipping, private repo, start the lead.' },
      { k: 'B', name: 'The same form, the one line can grow into a brief', rec: true, text: 'The description field grows to a paragraph or a pasted brief (same field, same action). The lead starts from what you wrote.' },
    ],
    because: 'Same result and same action (R21); you can say as much or as little as you have. Whether the lead reads a long description in full is the lead’s to confirm (open question).',
  },
  {
    id: 13, title: 'Filtering Activity', jobs: 'J2 J7',
    why: 'Activity is the overnight record; most of it is fine, and you read it for what wasn’t.',
    options: [
      { k: 'A', name: 'A project picker and “Only problems”', rec: true, text: 'Two controls above one feed by day. Only problems keeps failures, stops and findings.' },
      { k: 'B', name: 'No filters, a search box', text: 'One control; you have to know what to type.' },
      { k: 'C', name: 'Status chips', text: 'All · Done · Problems · Decisions · Money. Five chips in a row are the pill clutter you asked to avoid.' },
    ],
    because: 'The two questions you ask Activity are “what happened in replay?” and “did anything go wrong?”.',
  },
  {
    id: 14, title: 'Call “Criteria” “Outcomes”', jobs: 'J6',
    why: 'Criteria is the agents’ word. They are the results you asked for, in your words, that the work is checked against.',
    options: [
      { k: 'A', name: 'Outcomes', rec: true, text: '“4 of 9 outcomes met”. The tab, the figure and the Inbox item for judging one all use it.' },
      { k: 'B', name: 'Keep Criteria', text: 'Matches the files and the agents’ vocabulary.' },
      { k: 'C', name: 'Done means', text: 'Mirrors the task briefs’ heading; reads oddly as a tab name.' },
    ],
    because: 'Plain words (R3): you judge outcomes; the file can keep its name behind Details.',
  },
  {
    id: 15, title: 'Being told when the dashboard isn’t open', jobs: 'J1',
    why: 'Today nothing reaches you outside the open tab; you look in.',
    options: [
      { k: 'A', name: 'Nothing outside the app, for now', rec: true, text: 'Inside the app: the Inbox count, the tab title “(2) Atelier” and a dot on the icon. You look in, as today.' },
      { k: 'B', name: 'Phone notifications for “Needs you now” only', scope: true, text: 'An installed web app sends a push when something becomes urgent. New scope: a service worker and a push sender on the server.' },
    ],
    because: 'It adds no scope to this redesign, and the Inbox is designed so a look-in is cheap. B is the natural next step once you have lived with it.',
  },
];
