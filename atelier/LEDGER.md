# Ledger

<!-- One page of current state. Settled history: atelier/LEDGER-archive.md. -->

## State (2026-10-28)
- M1 redesign is on main, plus the audit fixes (uey2) and the transition fixes (hn3n). The owner merged atelier/hn3n by fast-forward (main cbdea06, 2026-10-28). Both tasks are closed. F-2..F-13 are marked fixed; the next audit checks them.
- Charter approved by the owner, 2026-10-28. AC-7 accepted again ("good"). Daily budget is $100, set by the owner.
- Phase shows `design` because the design gate was reopened for the Office characters work (M2).
- Owner rejected AC-7 on vbnh (2026-10-28): keep the glowing N1 windows (D-B), drop lamp/silhouettes (sad), add personality (overrule #8, R-17). A-6 answer adds: buildings out too, windows need stronger character. kydj cancelled before start (brief file isn't on its base branch); replaced by **37h3** with the brief inline in the goal: designer, base atelier/vbnh, 6 it, $25, P1-P3. Rule: when basing on a branch, put the brief in the goal, not only in a file on main. 37h3 done 2026-10-29 (atelier/37h3, in review): P1 Lived-in, P2 Temperament, P3 Little lights (designer and lead recommend P3). Lead checked images. Sent as A-7 (6 shots + 2 webm). A-7 answered 2026-10-29: owner picked P1 (P3 OK as second): overrule #9, R-18. Design gate approved by owner ("Good"); 37h3 is in main. wad8 built P1 (~$6), but on A-8 the owner preferred the current Office: P1 dropped (overrule #10, R-19 supersedes R-18). wad8 cancelled, branch kept, not to merge. **5cbr** started 2026-10-29: upgrade the existing Office in place, denser + more animated (frontend, 8 it, $30, priority 2, brief atelier/briefs/office-upgrade.md). When done: check proof, send before/after + webm as feedback, owner merges, then audit (~$12). Next: owner's letter → ruling → design gate request with the pick → M2 frontend build brief. vbnh cancelled (branch kept as 37h3's base; not needed to unblock, harmless). vbnh stays in review as kydj's base, unmerged; the owner merges the final design branch. When kydj is done: check images, send as one feedback ask (max 8), then request the design gate with the pick.

## Open
- F-1 fixed: the owner restarted 4747 on main cbdea06 and said "good" (2026-10-28). All M1 audit findings are now marked fixed.
- Lead proof check done 2026-10-28: uey2 and hn3n evidence read, F-3/F-8/F-10 shots viewed. Fine.
- Contracts: reopened with the owner's quote and re-approved by the lead, 2026-10-28. Shapes now in atelier/contracts/dashboard-api.md; dashboard-api-draft.md is a stub to delete (lead git rm is denied).

## Waiting on the owner
1. Office characters: the owner rejected the direction (A1-A3 and board S1-S14; overrule #5, R-12, 2026-10-28). Owner asked for varied sources and inspirations shown in the Inbox to pick from. Running: **m87r** (designer, $25, 6 it, base main, brief atelier/briefs/office-inspiration.md), with 14-18 numbered inspirations I1.., including no-character options. Done 2026-10-28 (atelier/m87r; board at atelier/design/office-inspiration/, I1-I16, 9 with no characters). The lead checked the images. Owner approved the design gate 2026-10-28 21:46 ("Approved") without naming numbers; asked A-2, answered 8, 7, 4 (recorded as R-14) but the owner had not seen the pictures (A-1 reply: "send me the references here in the inbox"). Sent all 16 as A-4 (1-8) and A-5 (9-16). A-4 answered: 7 and 8, anonymous but personable characters (overrule #6, R-15 replaces R-14; brief updated). A-5: 12 also liked; 16's idea but not its look (R-16). vbnh done 2026-10-28 (atelier/vbnh, in review): D-A Lamplight, D-B Lit shrines, D-C Night street; lead checked the images. Sent as A-6 (recommend D-A). Next: owner's letter → ruling → design gate request → M2 frontend build. Build note: cards must follow F-3 (no "Try N of M"); the designs still show it. Brief ready: atelier/briefs/office-directions.md (replace PICKS; designer, base main — m87r merged 2026-10-28 — ~7 it, $30). Next: the owner's numbers become a new ruling and an original-drawing designer task on base atelier/m87r. Branches 9pfh and 3e5b stay unmerged.

## Tell the owner (Atelier core bugs, owner's code)
- EPERM card-write race on Windows (frequent; crashes runners). Top core fix: retry the rename on EPERM/EBUSY.
- Ownership revert undoes merged-in base changes (a46b, 5ee365a). Should skip files equal to the base.
- `atelier watch` doesn't exit when its parent dies (107 orphans found).
- Window guard false positives (closed the owner's own Chrome tab, Tailscale installer).
- Chained review branches never auto-close; New project passes the whole brief to `gh repo create --description`.
- The design gate for m87r reached the owner without its pictures (they couldn't see the board in the Inbox). Check reviewFor's image lookup for designer evidence named NN-*.png.
- `atelier ask --attach` keeps only the first 8 files without warning (A-3 dropped 9 of 17).
- Stale "replay lead" remote session from xhen's settings test may show in the owner's Claude app.

## Lead rules learned
- Arm the watch only as `timeout 1750 node "C:/Users/oiyew/AppData/Roaming/npm/node_modules/atelier/bin/atelier.mjs" watch atelier-ui`. While nothing runs, let it lapse; rely on the 2-hour check-in.
- `atelier answer` already requeues a needs-you task; don't also retry/tick.
- Never put double quotes inside `--goal` (PowerShell truncates); long briefs go in atelier/briefs/*.md.
- Under `branch` autonomy `atelier land` refuses; the owner merges. Chained branches: close with `atelier close` after the merge.
- R-10 (spend freely) ended at the weekly reset, Tue 2026-10-27 02:00. R-9 still holds: weekly plan is the only limit, spend with care.
- An approved gate freezes its files: reopen it (`atelier gate ... reopen --quote "<owner's words>"`) before starting a task that writes them (vbnh was blocked once, 2026-10-28).
- Owner asks now go through `atelier ask atelier-ui approval|question|feedback|update` (R-13).
- Shift 2026-10-28 eve: single `git add`/`git commit`/`git status` and single `atelier ...` commands run; `git rm` and chained commands are denied. The owner runs commands with a leading `!` (plain pasted text doesn't execute). Read .git/refs to check a merge.
