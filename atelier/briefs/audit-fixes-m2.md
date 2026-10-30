# Fix M2 audit findings F-19 to F-24 (frontend)

Base main. Role frontend, default model, 6 it, $18. Files dashboard/**, lib/dashboard.mjs. Check: project full suite. Criteria AC-3, AC-4, AC-8, AC-11, AC-12, AC-18.
Details of each finding: `atelier audit atelier-ui findings --lead` (claim, observed, evidence with line numbers).

## Objective
Make every count and status line agree and read plainly, per the audit of 18f8b91.

## Fixes (lead rulings)
- F-19: the project headline and the Projects card say "The team is building" only when a build task of that project is running. An auditor or lead alone reads in plain words (e.g. "Checking the work" / "Planning"), never "building", and never beside "Nothing is being built yet". Use the summary's existing fields; add a read-only field if needed.
- F-20: after "Decide each" splits a batch, the list group counts and the header total agree. Rule: counts are decisions from the one summary (AC-11); the expanded list shows the batch's items but the group heading keeps the summary count (or the header and groups both count expanded items; pick one, apply everywhere, say which in EVIDENCE).
- F-21 (dashboard side only): test dashboards on spare ports must not run the scheduler. Add an env opt-out (ATELIER_NO_TICK=1) that skips the minute tick spawn in lib/dashboard.mjs:90; default behaviour unchanged. Every test and proof run in this task uses it. The core lock race itself is out of scope (the owner's code).
- F-22: Settings spend line: say "today so far, including work still running" (or split finished vs running if the summary already has both). No claim the figure is finished work only.
- F-23: "Settings for every project" link at least 44 px tall at 360 px.
- F-24: Office → Projects first paint under 100 ms: tear down Office loops/observers after the first paint of the next screen (or defer), not before it. Re-measure 10 tries each way at 1440.

## Done means
- The check passes.
- Proof on real ~/.atelier data on a spare port with ATELIER_NO_TICK=1: a before/after screenshot per finding (390 and 1440, dark), F-24 timings table, and a process list showing no runner spawned by the test dashboard.
- After the owner merges, the lead marks each F-n fixed.

## Out of scope
F-14 to F-18 (with the owner), the design folder, write endpoints, anything in lib/ other than lib/dashboard.mjs.

## Constraints
Security unchanged (token login, X-Atelier on POSTs, esc()/md()). No build step or framework. Headless browsers only; never open windows on the owner's screen; never touch port 4747; never start a lead or claude process in tests.
