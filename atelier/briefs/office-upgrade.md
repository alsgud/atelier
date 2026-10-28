# Office upgrade: same look, denser, more alive (frontend)

Ruling R-19 (owner, A-8, 2026-10-29): "I still prefer what we have now. i think we ditch your proposed design and upgrade this existing setup. maybe more space efficient would be good and more animated with life". R-18 (P1 windows, wad8) is dropped; don't reuse wad8.

Role frontend, base main, 8 it, $30. Files dashboard/**, lib/dashboard.mjs. Check: project full suite.

## Objective
Upgrade the Office that is on main now (window + figure at a desk + role prop, card below) in place. Keep its look, palette, figures and props; it's what the owner likes.

## 1. More space efficient
- Today each desk is a big card with a tall scene; a project with 8 idle desks fills a screen. Aim: about twice as many desks visible on one 1440 screen, and a phone screen shows at least 4 desks.
- Suggested (your call, explain it): smaller scene height; 4 columns at 1440 (3 at 768); idle desks (waiting, no task, off) as compact tiles (smaller scene, one line of text) while working, needs-you and paused desks keep the full card with task and step. Remove empty wall, not information: every desk still shows role, status and its one line.
- Keep F-3 (no Try N of M) and F-11 (paused task shown at its desk).

## 2. More animated, with life
- Working desks visibly busy: the figure types (head and arms move), the screen or window light flickers gently, the role prop does something small (sketch lines draw on the designer's board, the reviewer's bars rise, the auditor's checklist ticks, the builder's blocks stack, the lead's notes shuffle).
- Needs you: the hand-up figure waves, red stays the only red.
- Waiting and idle: slow, calm breathing (subtle), so the floor never looks dead but working desks stand out.
- Finished: a short happy moment (light flash, small sparkle) when a task finishes, then back to calm.
- Stagger timings so desks don't move in lockstep. Nothing sad or tense (R-17).
- CSS animations on transform/opacity only; pause when the tab is hidden; prefers-reduced-motion stops every loop (state changes as fades).

## Done means
- The check passes.
- Proof on real ~/.atelier data on a spare port: before/after screenshots at 1440 and 390, dark and light; a states sheet (working, needs you, paused, waiting, off, finished) through the real desk code; a 10-20 s webm at 1440 and 390 showing the motion; a count of desks visible above the fold before vs after.
- Warm tab switches still under 100 ms (R-4, AC-18), re-measured; no long frames from the animations (report frame times on the Office with 15+ desks).
- Reduced motion: zero running animations. Card text contrast unchanged (AC-13). No sideways scroll at 360.

## Out of scope
Other screens, the design folder, new looks (no windows-as-characters, no new art style), write endpoints, how Atelier works.

## Constraints
Security unchanged (token login, X-Atelier on POSTs, esc()/md()). No build step or framework. Headless browsers only; never open windows on the owner's screen; never touch port 4747; never start a lead or claude process in tests.

## Hand-off
Progress note: what changed, proof paths, desks-per-screen numbers, and any motion you held back and why.
