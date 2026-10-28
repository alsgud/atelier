# Office: original directions from the owner's picked inspirations

## Objective
The owner picked inspirations 7 (One light per desk) and 8 (Lit shrines) from the board in task m87r (atelier/design/office-inspiration/, DESIGN.md › Office inspiration board). Ruling R-15, in their words: "something with anonymity so that there are no specific attachments to any character but also personable and characterisable enough to appreciate". So: anonymous figures (no names, faces or fixed identities), given character by posture, small habits, their desk and their light. Draw 2-3 original Office directions grown from 7 and 8 in that spirit, so the owner can choose one to build. Each direction is the real Office screen, not a mood board. Spread the directions: for example one where the light carries almost everything, one with more visible figures.

## Context
- Rulings: R-15 (this direction), R-1 (production-grade process: references, written rationale, real content, two critique rounds), R-3 (motion demos), R-6/R-7 (N1 + K1, dark first), R-11 (never cheap), R-12 (A1-A3 and S1-S14 rejected: do not drift back to them).
- Charter, Taste: the Office is the charming heart of the dashboard, alive, polished, calm; games are fair inspiration, never copied.
- Spec R12 (Office): floors per project, one desk per agent, state at a glance (working, needs you, waiting, off), the latest step in plain words.
- Today's Office on main: dashboard/ (read only for you). Keep its data and states; change only the look and motion.
- If a direction needs image or animation files rather than plain CSS, say so plainly with the trade-off (the charter forbids a build step; static files are allowed).

## What to make
For each direction (D-A, D-B, optionally D-C):
- The Office at 1440 and 390, dark (light as a second view), with real agents and states from ~/.atelier read on a spare port, or the 5u8q fixture.
- Every state visible: working, needs you, waiting, paused, off, and a finished-task moment.
- A short recording of it alive (webm plus a contact sheet): a task starting, progress, needing you, finishing. Respects reduced motion.
- One sentence on the feel, one on what it takes to build.
Mark your top pick in three sentences. One page, atelier/design/office-directions/index.html, phone-friendly, ids D-A..D-C. PNGs in evidence/ readable on a phone, for the owner's Inbox.

## Done means
`atelier verify design` passes; the page works at 390 and 1440 with no console errors (playwright, headless only; never open windows on the owner's screen); two critique rounds logged in DESIGN.md › Office directions. Criteria AC-7, AC-13, AC-17.

## Out of scope
Changes to dashboard/ or lib/, building the picked direction (that's a frontend slice afterwards), other screens.

## Hand-off
DESIGN.md › Office directions with each direction's rationale and what the frontend will need. The lead requests the design gate with the images.
