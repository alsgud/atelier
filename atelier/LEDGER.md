# Ledger

<!-- One page of current state. Settled history: atelier/LEDGER-archive.md. -->

## State (2026-10-30 12:45)
- M1 redesign is on main, with audit fixes (uey2, hn3n). All M1 findings F-1..F-13 are marked fixed.
- M2 Office: the owner picked O1 Panorama (R-21). Design gate approved 2026-10-30. **mfyp** built O1 plus a Projects nav row on PC (3 it, ~$8.40, reviewer APPROVE). Lead checked 1440 and 390 Office and the Projects nav. Sent as A-14 ("Looks good"); merged into main via A-15 (owner-approved run, 2026-10-30). mfyp closed.
- M2 audit done (18f8b91, $12.27): F-14..F-18 with the owner (Inbox); F-19..F-24 to the lead. **5r4a** running: frontend fixes F-19..F-24 (6 it, $18, brief briefs/audit-fixes-m2.md, base main), incl. ATELIER_NO_TICK=1 opt-out for test dashboards (F-21). Owner told in A-16. 5r4a done, reviewer APPROVE, lead checked shots; merge sent as **A-17** (--run). After merge: `atelier close 5r4a`, mark F-19..F-24 fixed. Follow-ups (minor): reviewer-only headline says "The team is at work"; at 360 the Settings link drops to its own line; pager counts decisions not rows. Today's spend $18.94 of $100; plan 7d 43%.

- 2026-10-30: owner confirmed F-14 (high drift) → **trust back to strict, reporting everything** (new tasks start planned; owner approves). F-14..F-18 all confirmed (no notes). **ghjy** planned: frontend F-14..F-18 (8 it, $25, brief briefs/audit-fixes-m2-owner.md, `--after 5r4a`), plan approved by the owner; started 14:21 (likely based on main without 5r4a: expect a merge of both at hand-off). Team holding on the 5-hour plan window (93%) until Fri 17:41. Today $53.77. Mark F-14..F-24 fixed only after the owner merges.

## Next
1. Owner answers F-14..F-18 → rulings for overrules → one frontend task `--after 5r4a` (same files). 5r4a done → check proof → A-ask merge with --run → mark F-19..F-24 fixed.
2. If the owner finds the Office sluggish: stop the waiting desks' animation loops first (~40% gain; nf3m measured 21-25 ms/frame at 4x CPU throttle, 60 fps normal).
- Minor for later: on phone, working cards leave empty space above the small scene.

## Housekeeping
- dashboard-api-draft.md is a stub to delete (lead `git rm` is denied).
- Unmerged branches kept on purpose, not to merge: 9pfh, 3e5b, vbnh, wad8, 5cbr, f2e6.

## Tell the owner (Atelier core bugs, owner's code)
- EPERM card-write race on Windows (crashes runners): retry the rename on EPERM/EBUSY.
- Ownership revert undoes merged-in base changes (a46b, 5ee365a).
- `atelier watch` doesn't exit when its parent dies (107 orphans).
- Window guard false positives (closed the owner's Chrome tab, Tailscale installer).
- Chained review branches never auto-close; New project passes the whole brief to `gh repo create --description`.
- Design gate for m87r reached the owner without pictures (reviewFor image lookup for NN-*.png).
- `atelier ask --attach` keeps only the first 8 files without warning.
- Ask answers (A-10) don't appear in `atelier events`.
- F-21: every dashboard process spawns a tick each minute; with spare-port test dashboards the 60 s stale-lock rule lets one task start several runners (q644, voice-assistant, 2026-10-30; runners 14872/8564 may still be alive). Told in A-16.
- Owner-approved merges can be run with `atelier ask ... approval --run "git merge --no-ff ..."` (A-15 worked).
- Stale "replay lead" remote session from xhen's settings test may show in the owner's Claude app.

## Lead rules learned
- Arm the watch as `timeout 1750 node "C:/Users/oiyew/AppData/Roaming/npm/node_modules/atelier/bin/atelier.mjs" watch atelier-ui`. Keep a 2-hour `Check-in.` cron.
- At every check-in run `atelier events --project atelier-ui --unseen --mark` AND `atelier asks atelier-ui` (ask answers can miss events; criterion verdicts can miss the watch).
- `atelier answer` already requeues a needs-you task; don't also retry.
- No double quotes inside `--goal`; long briefs go in atelier/briefs/*.md. When basing on a branch, put the brief in the goal, not only in a file on main.
- Under `branch` autonomy `atelier land` refuses; the owner merges. Close chained tasks with `atelier close` after the merge.
- R-9: weekly plan is the only limit; spend with care.
- An approved gate freezes its files: reopen it with the owner's quote before a task writes them.
- Owner asks go through `atelier ask` (R-13), never chat only.
- Task goals start with one plain sentence of what changes for the owner; file pointers after it (the Inbox shows the goal's start; F-18).
- Permissions: single `git add`/`git commit`/`git status` and single `atelier ...` commands only; chained commands, `git rm` and other shell (Get-Content etc.) are denied. Use Read/Glob for files.
