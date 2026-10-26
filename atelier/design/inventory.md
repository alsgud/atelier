# Inventory of the current dashboard

The checklist for SPEC R1: everything the dashboard does today (commit 463db1e), read from
`dashboard/app.js` and `lib/dashboard.mjs`. One line each, in plain words, with the route, action or
data field in brackets. The redesign keeps every line; it may move or re-word them, never drop them.

## Whole app

- Sign in once per device by pasting the access token; a wrong token says so [POST /login, `renderLogin`]
- Desktop sidebar with Inbox, Office, Activity, the project list and New project [`renderChrome` #side]
- Phone tab bar with Inbox, Office, Projects and Activity [`renderChrome` #tabbar]
- Count of items waiting on you, on the Inbox link, the phone tab and the browser tab title [`state.queue.length`, `document.title`]
- Count of agents working right now, on the Office link [`team.working` summed over projects]
- Each project in the sidebar shows whether its lead is on and how many items wait on you there [`lead.running`, queue by project]
- Your Claude plan: 5-hour and 7-day usage bars, when the 5-hour window resets, when the figure was last updated [`limits.five_hour`, `limits.seven_day`, `limits.saved_at`]
- Atelier's spend today: finished cost, whether work is still in progress, tokens used, "API-equivalent, not a bill" [`atelierToday.cost`, `.tokens`, `.liveTokens`]
- Refreshes itself every 15 seconds and when the tab comes back into view, but never while you type or read an open detail [`setInterval` refresh, `visibilitychange`]
- Reloads itself when a new dashboard version is installed [`overview.version`]
- A short confirmation message after every action, or the error if it failed [`toast`]
- "That didn't load" page when a screen fails to load [`route` catch]
- Opens agent-made pages (mockups, proof) on the separate view port, in a new tab [`viewUrl`, `/view/…`, `/evidence/…` on port+1]
- Installable as a phone home-screen app [`manifest.webmanifest`, `apple-mobile-web-app-capable`]
- Light and dark follow the system setting [`prefers-color-scheme`]

## Inbox [#/inbox, #/inbox/<key>]

- One list of everything waiting on you, most urgent first, each with its kind, project and age [`queueFor`, sorted by `priority`]
- Urgent items (priority 0–1, or important findings) are marked red [`priority <= 1`, `severity === 'high'`]
- Selecting an item opens it beside the list (desktop) or on its own (phone), with a back link [#/inbox/<key>, `inboxDetail`]
- Each opened item shows its kind, project link, age, title and the explanation [`x.detail` through `md()`]
- Empty state: "You're all caught up", and beside it "Nothing needs you" with who's working now and a link to the Office, or a New project button [`nothingDetail`]
- After you decide, you go back to the list [`leaveInbox`]

### Item kinds and their decisions

- Gate waiting (approve a phase: brief, spec, design, contracts): open the clickable screens, read the document, then approve in your own words or skip the phase with a reason [kind `gate`; actions `gate-approve`, `gate-skip`; needs `quote`]
- Charter to approve, drafted by the lead: open the charter [kind `charter` → #/p/<project>/docs/charter]
- Charter changed after you approved it: open the charter [kind `charter-tampered`]
- Work isn't reaching GitHub: explanation only, no button [kind `github`]
- One owner outcome to approve: approve or retire it [kind `criterion`; action `criterion` verb `approve` / `retire`]
- Several owner outcomes to approve: approve all at once, or review one by one [kind `criteria`; action `criteria-approve-all`; link #/p/<project>/criteria]
- An outcome needing your judgement: accept, or reject with a note that becomes a ruling [kind `owner-criterion`; action `criterion` verb `accept` / `reject`; note required to reject]
- A task plan waiting for your OK (strict gating): approve the plan, or read its brief [kind `plan`; action `plan-approve`; link #/t/<task>]
- A question from an agent (shown as the question itself, with who asked and on what): type an answer and send, or open the task [kind `question`; action `answer`]
- An auditor finding: what happens if nobody fixes it, technical details folded away, "Yes, fix it" or "No, it's fine" with an optional note; marked important and costly to change later where so [kind `finding`; action `finding` verdict `confirm` / `dismiss`]
- Today's budget used up: raise today's limit by half in one tap, or go to budget settings; doing nothing resumes tomorrow [kind `budget`; action `dial` `budgetDay`]
- An agent asks to open a window on your screen: allow for N minutes, or "Not now" [kind `screen`; action `screen` verdict `allow` / `decline`]
- Atelier closed, or noticed, a window an agent opened: "Got it" [kind `screen-notice`; action `screen-seen`]
- The team has earned looser gating: loosen in one tap [kind `dial`; action `dial`]

## Office [#/office]

- Totals across all projects: working, needing you, on duty, and Atelier's spend today [`renderOffice` office-bar]
- One floor per project with how many are working and its spend so far; busiest projects first [`floor-h`]
- Quiet projects (nobody working, lead off) folded to one line with total spend [`quiet-floor`]
- One desk per agent: lead, each task's agent, reviewer, auditor, idle roles; a little scene shows its state (working, reviewing, auditing, needs you, stuck, on duty, idle, off) [`team()`, `desk`, `scene`]
- Each desk shows who, what it's working on and a progress line; desks link to the task, project or audits [`officeDesks`, `progressLine`]
- Empty state: "No projects yet" [`renderOffice`]

## Projects list [#/projects]

- Every project with lead on/off, phase, a task summary (working, need you, queued, done) and how many wait on you; New button [`renderProjects`, `taskSummary`]
- Empty state: "No projects yet" [`renderProjects`]

## Activity [#/activity]

- The last 3 days of events across all projects (up to 120), each with task or project, a plain event name, the message and age; bad ones red, good ones green [`renderActivity`, `eventLine`, `EVENT_WORD`]

## Project page [#/p/<project>/<tab>]

- Header: project name, GitHub status (on GitHub, or red "Not on GitHub" with the reason), lead on/off with the name to use in the Claude app [`githubChip`, `phead`]
- Restart lead button in the top bar when the lead is on [action `lead-restart`, with confirm]
- "Now" panel: one plain sentence on what happens next and its button (start the lead, review the first decision, open the charter) [`nextStep`]
- Phase steps: brief, spec, design, contracts, build, with the current one marked [`PHASES`]
- Figures: working now, waiting on you, criteria met of total, spent today of the daily budget, total spend with lead and audits [`team.working`, `metrics.criteriaMet/Total`, `budget.today.spent`, `budget.day`, `budget.total.spent`]
- Tabs with counts: Overview, Tasks (open), Criteria, Audits (open), Docs, Activity, Settings [`tabs`]

### Overview [#/p/<project>/overview]

- Waiting on you in this project, each linking to its Inbox item [`projOverview`]
- Working now: each busy agent in one line with its progress [`busyList`]
- Tasks in progress (running, needs you, queued, waiting for OK, in review) [`taskRow`]
- Recent: the last 8 events [`eventLine`]

### Tasks [#/p/<project>/tasks]

- All tasks grouped by status (needs you, working, in review, queued, waiting for your OK, requests, stalled, paused, done, failed, cancelled), with counts [`GROUPS`, `projTasks`]
- Each task row: status mark, ID, title, progress line or role and reason, iteration dots (green passed, red failed, current), likely minutes left [`taskRow`, `iterDots`, `etaText`]
- Empty state: "No tasks yet" [`projTasks`]

### Criteria [#/p/<project>/criteria]

- Your outcomes (what you judge the product by) with status and what each serves; approve a draft in place [`projCriteria`; action `criterion` verb `approve`]
- Team checks folded away with "N of M passing" [`projCriteria` details]
- Empty state: "No acceptance criteria yet" [`projCriteria`]

### Audits [#/p/<project>/audits]

- Audit running: how long, which stage, how many checkers [`auditProgress`]
- Run audit now [action `audit`]
- When the last audit ran, and when audits start on their own [`lastAudit.at`]
- Findings grouped: your call, being fixed, settled; each opens to show the impact, your note, technical details, and "Yes, fix it" / "No, it's fine" if open [`projAudits`, `FINDING_STATE`; action `finding`]
- Empty state: "Nothing from the auditor" [`projAudits`]

### Docs [#/p/<project>/docs/<doc>]

- Charter: edit and save the text, see when you approved it and whether it changed since, approve it in your own words [actions `charter-save`, `charter-approve`]
- Rulings: read them, add a new one [action `ruling`]
- Brief, Spec, Lead's plan, Lead's ledger: read [`docs.brief`, `.spec`, `.plan`, `.ledger`]
- Design and Contracts: open the clickable screens, see whether it's merged and how many files, read the document [`reviews.design`, `reviews.contracts`]
- Team messages: who messaged whom, the kind and the text [`messages`]

### Activity [#/p/<project>/activity]

- The project's last 100 events [`projActivity`]

### Settings [#/p/<project>/settings]

- Which phases you approve yourself (brief, spec, design, contracts) [action `dial` `ownerGates`]
- What you read: plain or technical summaries [action `dial` `summaryStyle`]
- Gating: strict, standard, loose [action `dial` `trust`]
- Reporting: everything, daily digest, exceptions only [action `dial` `reporting`]
- Shipping: straight to main, draft PRs, local branches only [action `dial` `autonomy`]
- Spend per task and spend per day [action `dial` `budgetTask`, `budgetDay`]
- Earned trust: which looser setting the team has earned, and why [`suggestion`]
- Your Claude plan (all projects): pause Atelier at N% of the 5-hour window and of the week, spread evenly over the week, and whether it's holding now and until when [action `pace` `fiveHour`, `sevenDay`, `spread`; `pace.holdingUntil`]
- Team: each role, the files it owns, its model [`roster`]
- Lead: start, restart fresh, stop [actions `lead-start`, `lead-restart`, `lead-stop`, with confirm]
- Numbers: your approvals, overrules, audit hit rate, full test suite command, project folder [`metrics.approvals`, `.overrules`, `hit`, `suite`, `repo`]

## Task page [#/t/<task>]

- Top bar: project link and task ID; Approve plan (if waiting for OK) or Stop (if running or queued) [actions `plan-approve`, `task-stop` with confirm]
- Status in words and the reason [`STATUS_WORD`, `meta.reason`]
- If it needs you: the question and an answer box [action `answer`]
- Progress: iteration dots, iterations finished of total, spend of its budget, the current iteration's minutes, steps, files changed and latest steps [`live.current`, `live.history`, `spend`]
- Shown working: the proof notes, screenshots, recordings and other files from the view port [`evidence`]
- Timeline of the task's events [`timeline`]
- Review result [`review`]
- Progress notes (open), decisions made without you, the brief, the last check output (folded) [`progress`, `decisions`, `body`, `lastCheck`]
- Side panel: status, role, iterations, acceptance criteria with their status, the done-check, files it owns, a red flag if it changed existing tests, pull request link, spend [`meta.*`, `criteria`]

## New project [#/new]

- Name, an optional one-line description, team (pair, team, game), shipping (straight to main, draft PRs), private GitHub repo, start the lead now; Create or Cancel; goes to the new project when done [action `project-create`]

## Server reads (for reference)

- Everything for the shell, Inbox, Office and Activity [GET /api/overview]
- One project's detail, documents, reviews, messages and events [GET /api/project/<alias>]
- One task's detail, notes, criteria, timeline, evidence, live progress and spend [GET /api/task/<id>]
