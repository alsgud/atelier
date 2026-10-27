# Ledger

<!-- One page of current state. Settled history: atelier/LEDGER-archive.md. -->

## State (2026-10-27 17:30)
- **ALL WORK STOPPED BY THE OWNER.** Start nothing and resume nothing until the owner says so. Then: `atelier resume uey2` first.
- M1 redesign is merged and on main (slices 1-3 via a7nb). M1 audit done: F-1..F-13.
- Phase shows `design` because the design gate was reopened for the Office characters work (M2).

## Open work
- **uey2** (frontend, $55, 10 it, base main, brief atelier/briefs/audit-fixes-m1.md): fixes F-2..F-13. Paused at try 3, mid review round 1. After the owner merges it, mark each F-n fixed (`atelier audit atelier-ui fixed F-n --note ...`).
- **F-1**: the owner restarts the live dashboard on port 4747 (old server process serving the new screens). Lead may not restart it.

## Waiting on the owner
1. Resume work (uey2 first).
2. Office characters style pick from board 3e5b (S1-S14; designer's top 3: S6 flat vector, S3 cosy dioramas, S7 rig, which would change the CSS-only rule). Then: designer draws polished directions in that style, base atelier/3e5b, copy the board summary into DESIGN.md; request design gate again with the pick. Building the pick = M2, its own frontend slice, priced when picked.
3. Charter: adopt atelier/CHARTER-draft.md in the dashboard (F-2; uey2 adds an Inbox item for it).
4. Contracts: OK to reopen the contracts gate to file atelier/dashboard-api-draft.md (read-only API shapes from slice 1)?
5. AC-7 shows awaiting-owner in the hook, though the owner accepted it 2026-10-27; check, and ask once if still pending.

## Tell the owner (Atelier core bugs, owner's code)
- EPERM card-write race on Windows (frequent; crashes runners). Top core fix: retry the rename on EPERM/EBUSY.
- Ownership revert undoes merged-in base changes (a46b, 5ee365a). Should skip files equal to the base.
- `atelier watch` doesn't exit when its parent dies (107 orphans found).
- Window guard false positives (closed the owner's own Chrome tab, Tailscale installer).
- Chained review branches never auto-close; New project passes the whole brief to `gh repo create --description`.
- Stale "replay lead" remote session from xhen's settings test may show in the owner's Claude app.

## Lead rules learned
- Arm the watch only as `timeout 1750 node "C:/Users/oiyew/AppData/Roaming/npm/node_modules/atelier/bin/atelier.mjs" watch atelier-ui`. While nothing runs, let it lapse; rely on the 2-hour check-in.
- `atelier answer` already requeues a needs-you task; don't also retry/tick.
- Never put double quotes inside `--goal` (PowerShell truncates); long briefs go in atelier/briefs/*.md.
- Under `branch` autonomy `atelier land` refuses; the owner merges. Chained branches: close with `atelier close` after the merge.
- R-10 (spend freely) ended at the weekly reset, Tue 2026-10-27 02:00. R-9 still holds: weekly plan is the only limit, spend with care.
