# Fix owner-confirmed M2 audit findings F-14 to F-18 (frontend)

Base main after 5r4a (queued with --after 5r4a; if 5r4a is not merged yet, base atelier/5r4a). Role frontend, default model, 8 it, $25. Files dashboard/**, lib/dashboard.mjs. Check: project full suite. Criteria AC-3, AC-4, AC-8, AC-11, AC-15, AC-16, AC-18.
Details of each finding: `atelier audit atelier-ui findings` (claim, observed, evidence with line numbers). The owner confirmed all five; F-14 is high-severity drift.

## Objective
The dashboard never contradicts itself about what needs the owner, and every line reads as one plain sentence with technical detail one click away.

## Fixes (lead rulings)
- F-14: "need you" has one source: the summary's needsNow (the same figure as the Inbox). The Office head, its floors and the sidebar all use it. Decisions that belong to no agent's task (lead asks, gates, findings) show at the lead's desk as needing you (red flag), so the floors add up to the head. Never "0 need you" beside a red Inbox count.
- F-15: Activity and every project's Recent list show one plain sentence per event. Add plain wording for every event kind (ask-answered: "You approved: <ask title>" / "A command you approved ran fine" / "A command you approved failed"; criterion events: "You approved: <the criterion's plain text>", not "AC-7"). Command output, paths, hashes and CLI hints go behind a closed Details control. A generic fallback strips paths, command output and bare codes. Do the rewording in lib/dashboard.mjs or app.js; lib/asks.mjs is out of scope.
- F-16: one plan line everywhere (sidebar, top bar, project, Settings, phone), always saying "used": "Week: 44% used. Atelier stops at 90%, so at least 10% stays yours. Resets Tue 3 Nov, 02:00." The 5-hour figure follows the same pattern. Fix Settings' pause sentence to match. Remove the wrong "Left for you: <ceiling - used>" figure.
- F-17: a working agent's latest step never stays "Getting started" once it has made a tool call. When there is no agent text or tool description, describe the latest tool call in plain words from its kind: Reading files, Editing code, Running a check, Searching the code, Looking at the screen in a browser, Writing notes, plus how long ago. No file paths or commands. "Getting started" only before the first tool call.
- F-18: Inbox plan items and Office/Inbox first lines lead with plain words. Strip codes from titles (parenthesised R-n/AC-n/F-n, leading tokens like M2-A7, ids); show a criterion's text instead of its code; audio/file captions get a plain label (Clip 1, Clip 2). A plan item's plain lede is the goal's first plain sentence (skip sentences that point at files, paths or commands), then "<role> works on it: up to N tries, at most $X." The full brief stays behind Show all.

## Done means
- The check passes.
- Proof on real ~/.atelier data on a spare port, started with ATELIER_NO_TICK=1: a before/after screenshot per finding at 390 and 1440 dark. F-14 shown with a lead ask waiting (use a fixture home copy if needed; never write asks into the real ~/.atelier). F-17: a sample of 200 recent agent turns showing how many still read Getting started (target: only pre-first-tool). Warm tab switches still under 100 ms (R-4).
- After the owner merges, the lead marks each F-n fixed.

## Out of scope
F-19 to F-24 (5r4a), lib/ other than lib/dashboard.mjs, the design folder, write endpoints, how Atelier works.

## Constraints
Security unchanged (token login, X-Atelier on POSTs, esc()/md() for agent text). No build step or framework. Headless browsers only; never open windows on the owner's screen; never touch port 4747; never start a lead or claude process in tests.
