Objective: fix the audit findings on the merged dashboard (main). Run atelier audit atelier-ui findings and atelier audit atelier-ui findings --lead for the full text. The owner confirmed F-2, F-3 and F-4 (F-1 is a server restart, done by the lead). F-5 to F-13 are the lead's. Each finding cites a file and line.

Owner findings:
- F-2: charter adoption must be easy.
  - When atelier/CHARTER.md is blank (only headings and comments) and atelier/CHARTER-draft.md exists, the Inbox shows Approve your charter. It shows the draft text inline with md(), and two actions:
    - Approve as written: save the draft to CHARTER.md through the existing charter-save path, then charter-approve with the owner's quote.
    - Edit first: open the project Docs charter editor, prefilled with the draft.
  - Server: read the draft read-only in the queue builder, next to lib/dashboard.mjs:424-426.
  - The charter-save and charter-approve actions stay as they are, in order.
  - Generic: works for any project with a draft.
- F-3: no Try N of M on cards (Inbox, Office, project cards). Show the stage and the latest step in plain words, as the task page does, e.g. Building - Fixing the tab counts - 4 min ago. The progress bar shows stage progress, not tries. Tries live only on the task page, under Details.
- F-4: show weekly plan use next to the 5-hour figure everywhere the plan shows (sidebar meter, project facts, phone), e.g. Plan: 5-hour 19%, week 10%, resets Tue 3 Nov. Show what's left for the owner's own use in plain words (e.g. Left for you: 80% of the week before Atelier stops at 90%), computed from limits and the ceiling.

Lead findings, with rulings:
- F-5: the gating line comes from ownerGates, e.g. You approve the brief and the design.
- F-6: technical detail sits behind a closed Details control, never first (SPEC R3).
  - Task Facts are closed by default.
  - Rows show a plain sentence, not raw t.reason; strip paced:-style prefixes, commands and hashes.
  - Shown working leads with a plain sentence, not the first EVIDENCE.md paragraph.
  - Steps say Waiting for your plan window.
  - Recent says Couldn't reach GitHub, will retry, with the raw error under Details.
- F-7: working always means agents working, from the summary, the same on the Projects card, the project page and the Office. The Tasks tab count and its heading agree (e.g. Tasks: 1 open of 24).
- F-8: the Inbox shows the thing itself inline (AC-15).
  - Plan items: the task brief via md(), collapsed after about 8 lines with Show all.
  - Brief, spec and contracts gates: the document text inline the same way.
  - Read endpoints may return the text (read only).
- F-9: one money formatter: $250 for whole dollars, $72.02 otherwise. The phone's top figure is labelled Today, all projects.
- F-10: idle means no red (SPEC R8 outranks the inventory line). Past failures are muted. Headline 154 past problems in neutral text, and the filter dot is neutral. Red only for what needs the owner now.
- F-11: an agent with a paused or waiting task shows it at its desk: Paused, the task, and why.
- F-12: the Tasks intro is one short sentence: Grouped by status; empty groups are hidden.
- F-13: reset times more than 24 h away include the date (Tue 3 Nov, 02:00). Within 24 h: today 14:00 or tomorrow 02:00.

Constraints, unchanged:
- Security: token login, X-Atelier on POSTs, esc()/md() for agent text, agent pages only from the view port.
- No build step or framework.
- R-4: warm tab switches stay under 100 ms; re-measure.
- Read-only endpoint additions only, apart from the existing charter actions. No change to how Atelier works.
- Headless browsers only; never open windows on the owner's screen. Never start a lead or claude process in tests.
- Never touch port 4747 or the real CHARTER.md. Test F-2 on a fixture home with a copy.

Done means:
- The check passes.
- Proof on real ~/.atelier data on a spare port (fixture for F-2): a before/after screenshot for each finding at 390 and 1440 dark, plus timings.
- The lead marks each F-n fixed after the owner merges.

Out of scope: Office character art and the design folder.
