# Round 1: last rough edges (C-1, C-2, C-3, C-5)

The owner reads every line as one plain sentence, sees green only for real good news, finds the phone layout tidy, and sees a sharp header.

Base: main. Files: dashboard/**, lib/dashboard.mjs. Criteria AC-7, AC-12, AC-13, AC-15, AC-16. Rulings R-1..R-21 stand. The wording rules are in atelier/briefs/audit-fixes-m2-owner.md and atelier/briefs/polish-m2.md.

## Step 0: check the last polish round (it reached main without a review)
The polish round 3knx (merge commit on main: `git log --grep 3knx`) was merged before its review finished. Read its diff against atelier/briefs/polish-m2.md items 1-7. On real data, confirm each item works, and list anything that doesn't or that broke something else. Fix what's off as part of the lines below. Record what you found in EVIDENCE.md, under "3knx check".

## Lines
1. **C-1 Plain lines.** Every Inbox, Activity and task-card line reads as one plain sentence: no task ids or request ids, no file names cut mid-word, no raw task titles (use titleWords()), and planLede doesn't cut at abbreviations or inside quotes. Sweep the real events file and every real task title: 0 ids, 0 broken ledes.
2. **C-2 Honest green.** Colour comes from the event kind, never from words. Green only for done, merged, owner approvals and passed checks. Needs-lead, paused, waiting, rulings, lead notes and requests are never green. Sweep the real events: 0 green non-good events.
3. **C-3 Phone layout.** At 360 and 390: no empty space above the small Office scene on working cards; the Settings link stays on its sentence's line; nothing scrolls sideways; taps are at least 44 px.
4. **C-5 Sharp header (owner: "the top of the header area is blurry").** Find why the top of the header looks blurry: check the phone top bar and the PC top area at device scale 2 and 3 (an iPhone is 3). Likely suspects are a raster logo or icon scaled up, a semi-transparent or blurred bar under the iPhone status bar (safe-area area, see the recent commit "the top bar sits below the iPhone status bar"), a transform on text, or a gradient fade over the top. Fix the cause so the logo, text and edge are crisp. Show before and after crops at 3x, phone and PC, dark and light.

Out of scope: the Inbox number, Office art, new screens, how Atelier itself works.

## Constraints (unchanged)
Security: token login, X-Atelier on POSTs, esc()/md() for all agent text, agent pages only from the view port. No build step. Read-only endpoint changes only. Every test dashboard runs with ATELIER_NO_TICK=1 on a spare port; never port 4747; headless only; never start a lead or claude process. **Never press a decision button on the real ~/.atelier**: Playwright route blocks don't stop the dock's POST. Use a fixture home for any click.

## Done means
`node --check` on both files passes. Proof on real data on a spare port: before/after screenshots for each line at 390 and 1440 dark (360 for C-3; 3x crops for C-5; fixture where real data lacks a case), the two sweeps above with their counts, and warm tab switches still under 100 ms. EVIDENCE.md lists the 3knx check, then each line with its proof and limits.
