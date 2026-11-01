# Polish round after M2 (owner said yes, A-21, ~$15)

The owner reads every line on the dashboard as one plain sentence, with nothing marked green that isn't good news, and every working agent visibly working.

Base: main (ghjy merged). Files: dashboard/**, lib/dashboard.mjs. Criteria AC-3, AC-11, AC-15, AC-16, AC-18. Rulings R-1..R-21 stand. Brief for the earlier rounds: atelier/briefs/audit-fixes-m2-owner.md (same wording rules).

## Fix, in this order
1. **Green only for good news.** Activity/Recent colour comes from the event kind, not from words in the message. Good: done, merged, approved-by-owner decisions, passes of a check. Never green: needs-lead, paused, rulings, lead notes, requests. Today "New ruling: … so it passes contrast" and "The lead told you: Design approved…" read green, and "New ruling: Error wording…" reads as a problem. (lib/dashboard.mjs good test near :559, app.js Recent GOOD near :2433.)
2. **No ids in Activity lines.** "Paused: Waiting on request 8ut8, jpz4" reads "Paused: waiting on 2 requests from the team". "Aej3 can't land…" loses the id. "Needs you: Already with the owner as rank-n colour…" reads as one clear sentence.
3. **Raw titles on project task cards and the Tasks tab** use the same titleWords() as the Inbox and Office.
4. **planLede**: don't cut at abbreviations (e.g., incl., i.e., vs.) or inside quotes; strip a stray emphasis mark ("scroll._"); a lede never starts with a task id.
5. **A working lead with a decision waiting** shows a lit window plus its flag (both true), so the floor never looks idle while the lead works.
6. **Task page during review**: "The reviewer showed N screenshots" becomes "N screenshots of the work" (the builder made them).
7. Small: the reviewer-only headline says "A task is being reviewed."; the project page heading "Needs you here" matches the Inbox's wording ("Needs you now"); at 360 the Settings link stays on the sentence's line.

Out of scope: the Inbox number (owner kept the waiting total), Office art, new screens, how Atelier itself works.

## Constraints (unchanged)
Security: token login, X-Atelier on POSTs, esc()/md() for all agent text, agent pages only from the view port. No build step. Read-only endpoint changes only. Every test dashboard runs with ATELIER_NO_TICK=1 on a spare port; never port 4747; headless only; never start a lead or claude process. **Never press a decision button on the real ~/.atelier**: Playwright route blocks don't stop the dock's POST. Use a fixture home for any click.

## Done means
`node --check` on both files passes. Proof on real data on a spare port: before/after shots for each item at 390 and 1440 dark (fixture where real data lacks the case), a sweep over the real events file showing 0 green non-good events and 0 ids in Activity sentences, and warm tab switches under 100 ms. EVIDENCE.md lists each item with its proof and limits. Run any script that wipes evidence/ once, at the end.
