# Fix buggy screen transitions (especially leaving the Inbox)

## Objective
The owner reports, 2026-10-28: "some page transitions are buggy, especially out of inbox". Find every broken transition between screens and fix them, so that switching screens is smooth and correct everywhere.

## Context
- Base: branch atelier/uey2 (audit fixes, approved, waiting for the owner to merge). Build on top of it, because it touches the same files.
- Motion is the Flow system: DESIGN.md Motion, timings in atelier/design/feel/flow/. Keep the timings and respect reduced motion (R-3).
- Speed: R-4 / AC-18. The first paint of the new screen comes in under 100 ms, and data arrives in under 300 ms. A slow read never freezes the page.
- SPEC navigation requirements; DESIGN.md Screens and Responsive (Y1 sidebar, 64 px rail, phone tab bar).
- The live dashboard on port 4747 may still run an old server process (audit F-1). Test only on your own spare port, against this branch's server.

## Process
1. Reproduce first. Drive the real dashboard headless with playwright, on real ~/.atelier data and a spare port. Cover every pair of screens, starting from the Inbox: Inbox → Office, Projects, a project, a task, Activity and Settings, then back again. Do this with the sidebar and the phone tab bar, the back and forward buttons, deep links, and the command palette. Do it at 390 and 1440, dark and light, normal motion and reduced motion. Also try it while an Inbox item is open or mid-decision (dock up, undo toast showing) and during a poll refresh.
2. Record a webm of each bug before you fix anything. For each one, write in evidence/EVIDENCE.md one plain line saying what goes wrong (flicker, stale content, a double animation, scroll position, focus lost, layout jump, the old screen left behind, console error).
3. Fix the root causes: one transition path for every screen, cancel a running transition when a new one starts, clean up the Inbox's own state on exit, and so on. Don't fix one screen at a time.
4. Add an automated transition check to the suite where you can, for example a playwright script that walks the pairs, fails on console errors or a leftover old-screen node, and measures first paint.

## Done means
- The check passes, every bug you found has an after recording, there are no console errors, and the tab-switch timings are re-measured (under 100 ms warm).
- Criteria: AC-18 (speed) and AC-13 (reduced motion, focus). AC-7 (calm) is the owner's judgement.

## In scope, out of scope
- In scope: dashboard/**, plus lib/dashboard.mjs only if a read is what freezes a transition.
- Out of scope: new screens, design changes, the Office characters, changing Flow timings, and how Atelier itself works.

## Constraints
Use headless browsers only, and never open windows on the owner's screen. Never touch port 4747. Never start a lead or claude process in tests. Security stays unchanged: esc()/md() for agent text, X-Atelier on POSTs.

## Hand-off
EVIDENCE.md lists each bug with a before and after recording. Note anything you found but did not fix, with the reason.
