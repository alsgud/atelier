# Ledger

<!-- One page of current state. Settled history: atelier/LEDGER-archive.md. -->

## State (2026-10-28)
- M1 redesign is on main, plus the audit fixes (uey2) and the transition fixes (hn3n). The owner merged atelier/hn3n by fast-forward (main cbdea06, 2026-10-28). Both tasks are closed. F-2..F-13 are marked fixed; the next audit checks them.
- Charter approved by the owner, 2026-10-28. AC-7 accepted again ("good"). Daily budget is $100, set by the owner.
- Phase shows `design` because the design gate was reopened for the Office characters work (M2).
- Running: vbnh, the Office directions designer task (R-15, R-16).

## Open
- F-1 fixed: the owner restarted 4747 on main cbdea06 and said "good" (2026-10-28). All M1 audit findings are now marked fixed.
- Lead proof check done 2026-10-28: uey2 and hn3n evidence read, F-3/F-8/F-10 shots viewed. Fine.
- Contracts: reopened with the owner's quote and re-approved by the lead, 2026-10-28. Shapes now in atelier/contracts/dashboard-api.md; dashboard-api-draft.md is a stub to delete (lead git rm is denied).

## Waiting on the owner
1. Office characters: the owner rejected the direction (A1-A3 and board S1-S14; overrule #5, R-12, 2026-10-28). Owner asked for varied sources and inspirations shown in the Inbox to pick from. Running: **m87r** (designer, $25, 6 it, base main, brief atelier/briefs/office-inspiration.md), with 14-18 numbered inspirations I1.., including no-character options. Done 2026-10-28 (atelier/m87r; board at atelier/design/office-inspiration/, I1-I16, 9 with no characters). The lead checked the images. Owner approved the design gate 2026-10-28 21:46 ("Approved") without naming numbers; asked A-2, answered 8, 7, 4 (recorded as R-14) but the owner had not seen the pictures (A-1 reply: "send me the references here in the inbox"). Sent all 16 as A-4 (1-8) and A-5 (9-16). A-4 answered: 7 and 8, anonymous but personable characters (overrule #6, R-15 replaces R-14; brief updated). A-5: 12 also liked; 16's idea but not its look (R-16). **Running: vbnh** (designer, 8 it, $30, brief atelier/briefs/office-directions.md). When done: look at the images, send them to the owner with `atelier ask ... feedback --task vbnh` (max 8 attachments per item), and request the design gate. Brief ready: atelier/briefs/office-directions.md (replace PICKS; designer, base main — m87r merged 2026-10-28 — ~7 it, $30). Next: the owner's numbers become a new ruling and an original-drawing designer task on base atelier/m87r. Branches 9pfh and 3e5b stay unmerged.

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
- Owner asks now go through `atelier ask atelier-ui approval|question|feedback|update` (R-13).
- Shift 2026-10-28 eve: single `git add`/`git commit`/`git status` and single `atelier ...` commands run; `git rm` and chained commands are denied. The owner runs commands with a leading `!` (plain pasted text doesn't execute). Read .git/refs to check a merge.
