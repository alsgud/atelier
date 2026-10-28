# Dashboard API shapes (atelier-ui): draft for atelier/contracts/dashboard-api.md

Waiting for the owner's OK to reopen the contracts gate (frozen) so this can move into `atelier/contracts/dashboard-api.md`. Lead-approved in substance, 2026-10-26, from branch atelier/5u8q (request mesj): read-only, no action changes, within contracts rules 2 to 4. Owner said yes to reopening, 2026-10-27; waiting on the gate reopen command.

Read-only shapes the redesigned screens rely on. Actions (`POST /api/action`) are unchanged. Source of truth: `lib/dashboard.mjs` `overview()`, `summarize()`, `queueFor()` and `reviewFor()`.

## GET /api/overview: additions

Everything already sent stays. New fields:

### `summary` (the one summary, SPEC R2, AC-11)
Every count and money figure a screen shows. Screens read these; they never sum or recount lists.
```
summary: {
  waiting, needsNow,                  // Inbox items in all; those with needs = true
  working, onDuty, agentsNeed,        // agents by state, all projects
  spentToday,                         // $ today, all projects (2 dp)
  atLimit: [alias],                   // projects at today's limit
  decidedToday,                       // count of the owner's decisions today
  plan: { fiveHour: {used, resetsAt} | null, sevenDay: {used, resetsAt} | null, savedAt },
  projects: { <alias>: { waiting, needsNow, working, onDuty, agentsNeed,
                         spentToday, dayLimit, atLimit, spentTotal, lead } }
}
```

### `decidedToday`
`[{ what, project, at }]`, newest first, in plain words ("Approved the design"). It's built from today's owner events only.

### Queue items (`queue[]`)
Each item gains `needs` (true when priority is at most 1, which is "Needs you now"). It also gains read-only content by kind, so the Inbox shows the thing itself (SPEC R10):

| kind | extra fields |
|---|---|
| budget | `spent, limit, split{ tasks[{id,title,spent}], lead, audits }` |
| gate | `review.images[{url, caption, phone}]`, `review.imageCount` (image URLs are signed view-port paths only) |
| charter-tampered | `approvedAt, changedAt, changes[{section, removed[], added[]}] \| null, sectionsChanged` |
| charter | `text` (charter without comments) |
| owner-criterion | `proof{ task, taskTitle, notes, viewPort, files[] } \| null` |
| question | `role, taskTitle, context, options[], suggested, rest` |
| screen | `why, role, taskTitle` |
| screen-notice | `role, app, windowTitle, count, closed` |
| criterion | `statement, serves` |
| criteria | `statements[]` |
| plan | `role, criteria, iterations, budgetLimit` |
| finding | `impact` |
| github | `problem, at` |
| dial | `why, current` |

All of these strings are agent or owner text. The client escapes them through `esc()` / `md()` (rule 4, AC-10).
