# Dashboard API shapes (atelier-ui)

Read-only shapes the redesigned screens rely on, within contracts rules 2 to 4 (README). Actions (`POST /api/action`) are unchanged. Source of truth: `lib/dashboard.mjs` `overview()`, `summarize()`, `queueFor()` and `reviewFor()`.

History: lead-approved in substance 2026-10-26 from branch atelier/5u8q (request mesj). Owner OK to reopen the contracts gate 2026-10-27 ("yes to the rules"); written in 2026-10-28 with the read-only additions from uey2 (audit F-2, F-8) and the owner's `ask` items.

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
Each item gains `needs` (true when priority is at most 1, which is "Needs you now"). It also gains read-only content by kind, so the Inbox shows the thing itself (SPEC R10, AC-15):

| kind | extra fields |
|---|---|
| budget | `spent, limit, split{ tasks[{id,title,spent}], lead, audits }` |
| gate | `review.images[{url, caption, phone}]`, `review.imageCount` (image URLs are signed view-port paths only); `review.doc`: the phase document's text for brief, spec and contracts gates, empty for design (F-8) |
| charter-tampered | `approvedAt, changedAt, changes[{section, removed[], added[]}] \| null, sectionsChanged` |
| charter | `text` (charter without comments); `draft` when the text comes from `atelier/CHARTER-draft.md`, read only, with its title normalised to `# Charter` (F-2). Approving a draft uses the existing charter-save then charter-approve actions |
| owner-criterion | `proof{ task, taskTitle, notes, viewPort, files[] } \| null` |
| question | `role, taskTitle, context, options[], suggested, rest` |
| screen | `why, role, taskTitle` |
| screen-notice | `role, app, windowTitle, count, closed` |
| criterion | `statement, serves` |
| criteria | `statements[]` |
| plan | `role, criteria, iterations, budgetLimit, brief` (the task card's brief text, F-8) |
| ask | `ask` (the lead's ask thread: kind approval, question, feedback or update, with its options, recommendation and attachments) |
| finding | `impact` |
| github | `problem, at` |
| dial | `why, current` |

All of these strings are agent or owner text. The client escapes them through `esc()` / `md()` (rule 4, AC-10).
