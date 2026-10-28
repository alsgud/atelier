# Ledger

<!-- One page of current state. Settled history: atelier/LEDGER-archive.md. -->

## State (2026-10-28)
- M1 redesign is on main, plus the audit fixes (uey2) and the transition fixes (hn3n). The owner merged atelier/hn3n by fast-forward (main cbdea06, 2026-10-28). Both tasks are closed. F-2..F-13 are marked fixed; the next audit checks them.
- Charter approved by the owner, 2026-10-28. AC-7 accepted again ("good"). Daily budget is $100, set by the owner.
- Phase shows `design` because the design gate was reopened for the Office characters work (M2).
- Nothing is running. Start nothing new until the owner picks a character style.

## Open
- F-1 fixed: the owner restarted 4747 on main cbdea06 and said "good" (2026-10-28). All M1 audit findings are now marked fixed.
- **Lead proof check pending:** shell access was denied, so the lead has not yet looked at the uey2/hn3n proof itself. Check it on main when access returns.

## Waiting on the owner
1. Office characters: the owner rejected the direction (A1-A3 and board S1-S14; overrule #5, R-12, 2026-10-28). Owner asked for varied sources and inspirations shown in the Inbox to pick from. Running: **m87r** (designer, $25, 6 it, base main, brief atelier/briefs/office-inspiration.md), with 14-18 numbered inspirations I1.., including no-character options. Done 2026-10-28 (atelier/m87r; board at atelier/design/office-inspiration/, I1-I16, 9 with no characters). The lead checked the images. Design gate requested so the owner picks in the Inbox. Next: the owner's numbers become a new ruling and an original-drawing designer task on base atelier/m87r. Branches 9pfh and 3e5b stay unmerged.
2. Contracts reopen command (the owner said yes 2026-10-27: "yes to the rules"). A guard blocks the file until `atelier gate atelier-ui contracts reopen --quote "yes to the rules"` runs; the lead's PowerShell runs only some atelier commands. Then move dashboard-api-draft.md to contracts/dashboard-api.md, adding uey2's read-only additions (F-8 brief/doc text, F-2 charter draft text), and re-request the contracts gate.
3. atelier/ planning docs are uncommitted (lead git is denied). Ask the owner to commit, or commit when access returns.

## Tell the owner (Atelier core bugs, owner's code)
- EPERM card-write race on Windows (frequent; crashes runners). Top core fix: retry the rename on EPERM/EBUSY.
- Ownership revert undoes merged-in base changes (a46b, 5ee365a). Should skip files equal to the base.
- `atelier watch` doesn't exit when its parent dies (107 orphans found).
- Window guard false positives (closed the owner's own Chrome tab, Tailscale installer).
- Chained review branches never auto-close; New project passes the whole brief to `gh repo create --description`.
- No way for the lead to put a free-form question in the owner's Inbox (only gates, criteria, plans, agent questions, findings). R-13 wants all owner inputs there: needs an `atelier ask <alias> "..."` or similar.
- Stale "replay lead" remote session from xhen's settings test may show in the owner's Claude app.

## Lead rules learned
- Arm the watch only as `timeout 1750 node "C:/Users/oiyew/AppData/Roaming/npm/node_modules/atelier/bin/atelier.mjs" watch atelier-ui`. While nothing runs, let it lapse; rely on the 2-hour check-in.
- `atelier answer` already requeues a needs-you task; don't also retry/tick.
- Never put double quotes inside `--goal` (PowerShell truncates); long briefs go in atelier/briefs/*.md.
- Under `branch` autonomy `atelier land` refuses; the owner merges. Chained branches: close with `atelier close` after the merge.
- R-10 (spend freely) ended at the weekly reset, Tue 2026-10-27 02:00. R-9 still holds: weekly plan is the only limit, spend with care.
- In this session, PowerShell allows single `atelier ...` commands but denies git and multi-line scripts. The owner runs commands with a leading `!` (plain pasted text doesn't execute). Read .git/refs to check a merge.
