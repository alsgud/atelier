# Build: Office O1 Panorama (frontend)

Start when the owner approves the design gate. Base: main if the owner merged atelier/t652, else atelier/t652. Role frontend, default model, ~8 it, $30. Files dashboard/**, lib/dashboard.mjs. Check: project full suite. Criteria AC-3, AC-8, AC-10, AC-11, AC-12, AC-13, AC-18.

## Objective
Replace the Office floor in the real dashboard with O1 Panorama (R-20, R-21).

## Context
- Design: atelier/DESIGN.md › Office fresh (O1, O1 on PC, Motion, build note), prototype atelier/design/office-fresh/o1.html, o1.css, of.js, desk.js, data.js. Port it; don't reinvent it.
- PC: whole bays, wall gap between desks, equal rows via fit(), team words beside the room when wide enough. Phone (<=640): exactly as the prototype's phone.
- States from the existing summary only (AC-11): working, quiet, needs you, paused, waiting, off, finished. F-3: no Try N of M.
- Build note: pause animation loops for desks off-screen (IntersectionObserver) and when the tab is hidden; reduced motion stops all loops.

## Done means
- The check passes.
- Proof on real ~/.atelier data on a spare port: 390, 1024, 1440, dark and light, a states sheet through the real desk code, and a short webm; no sideways scroll at 360.
- Warm tab switches under 100 ms (R-4, AC-18), Office frame times with 15+ desks, re-measured. Card text contrast unchanged (AC-13).

## Out of scope
Other screens, the design folder, write endpoints, how Atelier works.

## Constraints
Security unchanged (token login, X-Atelier on POSTs, esc()/md()). No build step or framework. Headless browsers only; never open windows on the owner's screen; never touch port 4747; never start a lead or claude process in tests.
