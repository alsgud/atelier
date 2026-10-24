# Spec: Atelier dashboard redesign

Builds on BRIEF.md (approved 2026-10-24) and the charter draft. Numbered requirements; criteria cite these.

## Whole app
- **R1 Keep every function.** Every action and view the current dashboard offers (as of commit 463db1e) still exists after the redesign. The designer writes the inventory (`atelier/design/inventory.md`) from the current `dashboard/app.js` and `lib/dashboard.mjs`; it is the checklist.
- **R2 One source of numbers.** Counts (needs you, working, by status), spend (today, project total, per task) and plan headroom are computed once on the server and sent in one summary; no screen adds them up itself. The same figure reads the same everywhere it appears.
- **R3 Plain words.** Each list item is one plain sentence. IDs, file names, commands and technical terms are hidden behind a "details" control, never in the first line.
- **R4 Colour has meaning.** Lilac = active, red = needs you or wrong, green = done; everything else neutral. No decorative pills or badges.
- **R5 Phone and desktop.** Inbox, every decision, project overview and task page are designed phone-first (360 px wide, no sideways scrolling, tap targets ≥ 44 px). Every other screen works at 360 px.
- **R6 Accessible.** WCAG AA contrast in light and dark, every control reachable and operable by keyboard with a visible focus, reduced motion respected, screen-reader labels on icon-only controls.
- **R7 Live.** The screens update by themselves (as today) without losing scroll position, open details or text being typed.
- **R8 Calm when idle.** When nothing needs the owner, the Inbox says so in one quiet line and nothing on any screen is red.

## Inbox
- **R9 Everything waiting on the owner** in one list, most urgent first: gates, owner outcomes to approve or judge, questions, planned tasks at strict trust, auditor findings, budget raises, screen-use requests, failed pushes and other blockers.
- **R10 Decide in place.** Each item opens inline (or one tap away) showing the thing itself: the design (via the separate view port), the question text, the proof a task works (screenshots, recording, run log), the finding. The decision buttons (approve, reject with a note, answer, confirm, dismiss) sit right there. No item ever says "go read a file".
- **R11 Inbox zero.** After deciding, the item leaves the list; reaching zero is a calm, clear state.

## Office
- **R12 Who's working, playfully and clearly.** Keep the office's spirit; each agent shows its role, its project, what it's doing in a plain phrase, and whether it's working, waiting or stuck. Counts match R2.

## Project page
- **R13 Now.** At the top: what needs the owner in this project, what's happening right now, and progress against the current milestone.
- **R14 Money and limits.** One spend number against the daily budget and the project total; how much of the owner's Claude plan is left for their own use, with reset times. Same figures as R2.
- **R15 Sections.** Tasks, outcomes (criteria), audits, documents, activity and settings remain reachable, each in the plain style of R3.
- **R16 Lead control.** Start, stop and restart the lead, and see whether it is on.

## Task page
- **R17 Live progress.** What the agent is doing now (latest step in plain words), how far along it is in a form that means something (not "iteration 0 of 6"), how long since it last did anything, and whether it looks stuck.
- **R18 Proof.** The task's "shown working" evidence (screenshots, recording, run log) is visible on the page, served from the separate view port.
- **R19 History.** Past steps, checks and reviews, collapsed by default.
- **R20 Task actions.** Every current task action (approve, answer, extend, stop, resume, retry, cancel, etc.) stays available.

## New project and settings
- **R21 New project.** The current flow, fewer words, same result.
- **R22 Settings.** Budgets, plan limits, gating, reporting and the team, with plain labels and plain dropdowns.

## Safety and delivery
- **R23 Security unchanged.** Token login with HttpOnly, SameSite=Strict cookie; `X-Atelier` header on every POST; all agent text through `esc()`/`md()`; agent-made pages only from the view port.
- **R24 Stack.** Plain HTML, CSS, JS in `dashboard/`, served by `lib/dashboard.mjs`. No build step, no external runtime dependency, works offline. Server changes only add or reshape read endpoints; actions stay the same.
- **R25 Live dashboard safe.** All work on branches; the running dashboard on main is never broken. Final hand-off: one integration branch and a one-line command to run it on a second port.

## Endpoint note (replaces a contracts phase)
The frontend keeps `atelier/contracts/dashboard-api.md`: the summary endpoint of R2 and any reshaped read endpoints. The lead approves changes to it.
