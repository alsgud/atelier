# Charter (lead's draft, 2026-10-24, for the owner to correct and adopt in the dashboard)

## What we're making
A redesign of the Atelier dashboard: the one place where I, a solo developer running several AI agent teams, see what's happening and make the few decisions only I can make, quickly and calmly, at my desk or on my phone. It keeps every function the dashboard has today. It matters because managing the team has to cost me less time than doing the work myself.

## The quality bar
- In one glance I know whether anything needs me. If nothing does, the screen says so quietly and I leave.
- Any decision is one tap from the Inbox, with the thing I'm deciding about (the design, the question, the proof, the finding) shown right there. No "go read this file".
- I can tell at a glance whether work is really happening: live progress, the latest step, proof of real runs.
- Every number (who's working, spend, budget, plan left) is the same on every screen.
- The phone is a first-class screen, not a squeezed desktop.
- Professional, production-grade design that holds up next to Linear or Vercel. It never looks improvised or unfinished.
- Accessible: readable contrast, works from the keyboard, light and dark, respects reduced motion.

## Taste
- Calm and dense like Linear, clear status like Vercel, agent progress like Cursor or Devin: you see what it did without reading logs.
- One plain sentence per item. Detail one click away. Jargon, IDs and file names only when I ask.
- Colour means something: lilac is active, red is "needs you" or "wrong", green is done. Nothing else shouts.
- Familiar patterns: an inbox, a bell, plain dropdowns.
- Never: walls of text, a sea of pills, boxes and badges, or technical detail up front.
- The Office is the charming heart of the dashboard: characters that feel alive, polished and smooth, never cheap, in our calm aesthetic (games are fair inspiration, never copied).

## Out of bounds
- No change to how Atelier itself works (scheduling, runners, budgets, the auditor). The dashboard's own server may only change to serve the screens.
- No build step, no framework, nothing to install. Plain HTML, CSS and JavaScript that works offline.
- No weakening of security: login stays as it is, agent-written text is always escaped, and agent-made pages are never shown on the dashboard's own origin.
- Nothing reaches main except by my merge. I get one branch to try on another port first.
- Remote phone access, accounts and login are not part of this.

## What "wrong" looks like
- I have to read a paragraph, or open a file, to make a decision.
- Two screens show different numbers for the same thing.
- Something needs me and it isn't obvious, or nothing needs me and the screen looks alarming.
- I can't tell whether an agent is working or stuck.
- A function the old dashboard had is missing.
- The live dashboard I'm using breaks while this is being built.
