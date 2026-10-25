# Ledger

<!-- The lead updates this at every heartbeat. After a restart it's the lead's memory, so keep it complete. -->

## Waiting on the owner
- Pick a feel: Calm, Flow or Crisp (57cv APPROVED by reviewer round 2, branch atelier/57cv, $18.75; lead checked the contact sheets) — asked 2026-10-25 — lead and designer recommend Flow. Then D4 (other pages) bases on atelier/57cv.
- Price: redesign now estimated ~$150 instead of ~$120 (more design rounds for feel and motion) — told 2026-10-25
- Merge the speed hotfix: 6dug APPROVED (reviewer round 3: tab switch max 27 ms, warm API 4 ms, actions 10/10). `atelier land` refuses under `branch` autonomy, so the owner merges `atelier/6dug` and restarts the dashboard process (the service restarts it within 5 min) — sent the commands 2026-10-25
- Charter: draft in atelier/CHARTER-draft.md; owner to adopt in the dashboard — since 2026-10-24

## Open issues
- 6dug round 2: tab switch paint 838 ms median / 4.5 s max -> 2 ms / under 40 ms; warm API 4 ms. Must-fix: after being unwatched it shows old data for 15 s. Lead answered with the fix (stale flag + quick re-fetch). $5.90 of $10.
- Follow-ups outside the frontend's files (Atelier core, owner's call): memoize cards.all() by board mtime (lib/card.mjs:67), tail-read audit logs in budget.auditRuns (lib/budget.mjs:66), tick log grows ~15 KB/day. Mention to owner with the hotfix.
- Live dashboard too slow to use (R-4). 6dug measuring and fixing on its branch; reviewer must show before/after timings.
- 68h6 stays in review on branch atelier/68h6 (autonomy `branch`); 57cv builds on it.

## Since last update
- Owner accepted AC-7 ("feels calm") on the D2 Inbox, 2026-10-25.
- Owner: feel and animations still lacking; wants more demos and refined versions (overrule #2, ruling R-3). Cancelled w9ew. 57cv started: motion references, motion system, three feel variants with recorded demos.
- Ruling R-4 and team check AC-18 (speed). 6dug started.

## Lead's own cost
- 2026-10-25: re-arming the 30-min watch while idle cost ~$7 with no work running. While nothing runs and only owner decisions are pending, let the watch lapse; rely on the 2-hour check-in and owner chat. Re-arm as soon as any task starts.

## Next
- 6dug done and reviewed: check the timings, land it if the owner agrees, tell the owner it's faster.
- 57cv done: watch the demos myself, then send the owner feel/index.html and the phone demos, recommend one.
- Then D4: every other screen in the chosen feel (brief in PLAN.md, plus R-3 demos).
