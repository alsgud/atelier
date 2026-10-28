# M2 build: Office windows P1 Lived-in (frontend)

Ready to start once the owner approves the design gate. Base: main if the owner has merged atelier/37h3, otherwise atelier/37h3. Role frontend, default model, ~8 it, $30. Files: dashboard/**, lib/dashboard.mjs. Check: the AC-8 suite (project full suite). Criteria: AC-3, AC-8, AC-10, AC-12, AC-13, AC-18.

## Objective
Replace the Office floor in the real dashboard with the P1 Lived-in windows (R-17, R-18).

## Context
- Design: atelier/DESIGN.md, section Office windows (37h3), the P1 variant, the shared visual rules, Motion. Prototype: atelier/design/office-windows/ (win.js draws the window in layers, ow.js the Office with F-3 cards, p1.js and p1.css the P1 things and states). Port that, don't reinvent it.
- Rulings R-15 (anonymous, no faces or figures), R-17 (glowing N1 windows stay; no lamp, silhouettes of people or houses; nothing sad), R-18 (P1 picked).
- Audit F-3: cards show stage and latest step in words, never Try N of M.
- States come from the existing summary data only (one-summary rule, AC-11): working lit to stage, quiet (cat asleep), needs you (red pool + red flag), waiting, paused (back-soon card), off (curtains), finished (green flood + flower, held about 2.4 s).

## Done means
- The check passes.
- Proof on real ~/.atelier data on a spare port: screenshots at 390 and 1440, dark and light, of the Office plus a states sheet, and a short webm of states changing. Warm tab switches still under 100 ms (R-4, AC-18), re-measured.
- prefers-reduced-motion stops all loops (fades only).
- Contrast of card text unchanged (AC-13).

## Out of scope
Any other screen, the design folder, new endpoints with writes, how Atelier works.

## Constraints
Security unchanged (token login, X-Atelier on POSTs, esc()/md()). No build step or framework. Headless browsers only; never open windows on the owner's screen; never touch port 4747; never start a lead or claude process in tests.

## Hand-off
A short note in the progress log: what changed, the proof paths, and anything P1 couldn't do at phone size (then P3 is the fallback, R-18).
