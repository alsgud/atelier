# Brief

## One-liner
A redesign of the Atelier dashboard: the one place where the owner, a solo developer running several AI agent teams, sees what's happening and makes the few decisions only they can make, quickly, calmly and from a desktop or a phone.

## The moment that matters
The owner opens the dashboard for a minute between other things. In one glance they know whether anything needs them, and if it does, they can see what it is, look at the work it's about, and decide in one or two taps without reading a wall of text or hunting for files. If nothing needs them, the screen says so quietly and they leave.

## Users and their jobs
- **The owner (only user)**: sets up projects and briefs leads; approves a few things (the brief, the design direction, owner-level outcomes, daily-budget raises, requests to use their screen); judges auditor findings; checks progress and spend; occasionally stops, starts or restarts a lead.
- They use it on a desktop monitor while working, and on their phone away from the desk (remote access is on hold, but design for the phone as a first-class screen).
- They are technical, but don't want to read technical detail unless they choose to.

## First version: in scope
Redesign every screen the dashboard has today, keeping all current functions:
- **Inbox**: everything waiting on the owner. Each item opens what it's about (the design to review, the question, the proof a task works, the finding) and offers the decision right there.
- **Office**: the playful view of who's working. Keep the spirit; make it clearer.
- **Project page**: what's happening now, progress against the milestone, spend against budget, plan headroom, tasks, outcomes (criteria), audits, documents, activity, settings.
- **Task page**: what the agent is doing right now, its progress, its proof ("shown working"), and its history.
- **New project** flow.
- **Settings**: budgets, plan limits, gating and reporting, the team.

The pain points to fix (from the owner's first project):
1. **Text pollution.** Too many words on every screen: long summaries, technical terms, IDs and file names up front. One plain sentence per item; detail one click away; jargon only on request.
2. **Overhead of review and management.** Decisions needed too many steps and too much reading, and the thing to review was hard to find (for example, "check QUESTIONS.md" instead of showing the question). Every decision should be reachable from the Inbox in one tap, with what's needed shown inline.
3. **Not knowing if work is happening.** "Iteration 0 of 6" told the owner nothing. Live progress, the latest step and proof of real runs should be obvious.
4. **Numbers that disagreed.** Counts of who's working, and spend figures, differed between screens. Every number comes from one source and matches everywhere.
5. **Money and limits.** One spend number; budget against limit; how much of the owner's Claude plan is left for their own use.

## Explicitly out of scope
- Remote phone access setup (on hold), accounts and login changes.
- Changes to how Atelier itself works (scheduling, runners, budgets, the auditor). The dashboard's own API (`lib/dashboard.mjs`) may change only to serve the screens: new or reshaped read endpoints, and the same actions.
- A build step or a framework. Keep it plain HTML, CSS and JavaScript served by the existing Node server, so nothing needs installing.

## Constraints
- **Stack**: vanilla JS single-page app (`dashboard/index.html`, `app.css`, `app.js`) served by `lib/dashboard.mjs`. Hash routes. No build step, no external runtime dependencies, works offline.
- **Security, unchanged**: token login with an HttpOnly, SameSite=Strict cookie; every POST needs the `X-Atelier` header; all agent-written text is escaped (`esc()`/`md()`); agent-made pages (mockups, evidence) are only ever shown from the separate view port, never on the dashboard's own origin.
- **Live tool**: this dashboard runs Atelier right now, served from this repo's working copy. Nothing reaches `main` except by the owner merging it. Finished work stays on branches; the final hand-off is one integration branch plus a one-line way for the owner to try it on another port before merging.
- **Accessibility**: WCAG AA contrast, keyboard navigable, visible focus, reduced-motion respected, light and dark.
- **Budget**: about $120 for the whole redesign, $40 a day, one audit at the end. Report spend from `atelier costs atelier-ui`.

## Taste references
- **Linear**: calm density, keyboard-first, an inbox that gets you to zero.
- **Vercel**: clear status at a glance, restrained colour.
- **Cursor and Devin agent views**: seeing an agent's live progress and what it did, without reading logs.
- **Colour means something**: lilac for active, red for "needs you" or "wrong", green for done. Nothing else shouts.
- The owner likes conventional, familiar patterns (a bell or inbox, plain dropdowns) and dislikes too many pills, boxes and badges.

## Roster
- **Designer**: research, directions, the visual system and every screen (`atelier/DESIGN.md`, `atelier/design/**`).
- **Frontend**: builds it (`dashboard/**`, plus `lib/dashboard.mjs` for endpoints the screens need).
- **Reviewer**: tests every change by using it like the owner would, on the real data.

## Assumptions the lead made
<!-- Low-stakes defaults filled in without asking. The owner can overrule any of them. -->
