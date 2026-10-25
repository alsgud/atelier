# Ledger

<!-- The lead updates this at every heartbeat. After a restart it's the lead's memory, so keep it complete. -->

## Running
- 6umt designer D5 UX research + walkthrough ($22, 8 it, base atelier/ysk4): records chosen brand in DESIGN.md, tokens default K1 dark; ux/index.html with research, IA, journeys, layout, info design, patterns, wireframes, numbered UX decisions. Next: owner answers UX-n, then D6 high-fi every screen.
- Check-ins resumed 2026-10-26 (cron 8f412b2d).

## Overnight plan (owner: keep going overnight, checks in the morning, 2026-10-26)
- When 6umt is approved: look at the walkthrough myself, then start D6 high-fi on the designer's recommended UX answers, marked provisional, core screens first (Office, project page, task page, then the rest), so the owner wakes to high-fi plus the questions. If the owner changes an answer, D6 reworks only those parts. Keep within the day budget.

## Decided 2026-10-26
- Brand N1 + K1 + Y1, dark default (R-7). Phone follows device after first run: lead assumption, not asked. Owner wants everything documented (R-7) and a full UX walkthrough with research (R-8).

## Waiting on the owner (phone viewing, low priority now)
- Owner wants to view round 2 on the phone. The Artifact upload is denied in this session (don't-ask mode), and sources outside the repo are refused. When home, the owner runs `/permissions` to allow Artifact plus `/add-dir C:\Users\oiyew\.atelier\worktrees\ysk4`, then the lead publishes atelier/share/brand-r2.html (the root page, untracked) with the files mapped under design/... (a helper already reviewed all 77 files: no external URLs or secrets). Meanwhile, the dashboard view-port route works: Design > Open the clickable screens, then change the end of the URL to atelier/design/brand/r2/index.html.

## Waiting on the owner (brand round 2)
- ysk4 APPROVED round 2; page worktrees/ysk4/atelier/design/brand/r2/index.html; marks N1-N11, schemes K1-K3; combos 1 = N1+K1 (designer's top), 2 = N6+K2, 3 = N11+K3. Lead checked 1-1440-dark. Sent 2026-10-25. Then D5 other screens dark-first, base atelier/ysk4.
- (done) ysk4 designer D4b brand round 2 ($16, 6 it, base atelier/hspr): N1-N12 logos from L8 + L12, dark-first K1-K3 from C4, Y1 fixed, phone dark vs light, 3 combos. Page brand/r2/index.html. Owner feedback 2026-10-25 = overrule #3, R-6.

## Waiting on the owner (new)
- (superseded by ysk4) Brand pick: hspr APPROVED round 2 (~$14). Pick page worktrees/hspr/atelier/design/brand/index.html: L1-L16, C1-C5, Y1-Y3, Combos A-D. Designer's top pick Combo B = L14 Chop + C2 Warm studio + Y1 Sidebar; lead checked b-1440-light and b-390-dark, looks polished. Sent 2026-10-25. Then D5 other screens, base atelier/hspr. Note for Y3: no logo on phone.
- Old note: cg59 cancelled at once because PowerShell double quotes truncated its goal. Never put double quotes inside --goal. (cg59 cancelled at once: PowerShell double quotes truncated its goal. Never put double quotes inside --goal.)

## Waiting on the owner
- Price: redesign now estimated ~$185 instead of ~$120 (feel rounds + brand task $20) — telling owner 2026-10-25
- Merge the speed hotfix: 6dug APPROVED (reviewer round 3: tab switch max 27 ms, warm API 4 ms, actions 10/10). `atelier land` refuses under `branch` autonomy, so the owner merges `atelier/6dug` and restarts the dashboard process (the service restarts it within 5 min) — sent the commands 2026-10-25
- Charter: draft in atelier/CHARTER-draft.md; owner to adopt in the dashboard — since 2026-10-24

## Open issues
- Tasks left in review on purpose (autonomy `branch`, `atelier land` refuses): 6dug waits for the owner's merge; 68h6 -> 57cv -> hspr -> ysk4 is the design chain (Flow picked; ysk4 waits for the owner's brand pick, and D5 will base on it). All of them reach main in one owner merge at the design gate.
- 6dug round 2: tab switch paint 838 ms median / 4.5 s max -> 2 ms / under 40 ms; warm API 4 ms. Must-fix: after being unwatched it shows old data for 15 s. Lead answered with the fix (stale flag + quick re-fetch). $5.90 of $10.
- Atelier core bug (owner's code): a task fails when its end-of-iteration leftovers commit finds nothing to commit (ysk4, 2026-10-25). Lead used `atelier retry` with an answer note. Mention to owner.
- Follow-ups outside the frontend's files (Atelier core, owner's call): memoize cards.all() by board mtime (lib/card.mjs:67), tail-read audit logs in budget.auditRuns (lib/budget.mjs:66), tick log grows ~15 KB/day. Mention to owner with the hotfix.
- Live dashboard too slow to use (R-4). 6dug measuring and fixing on its branch; reviewer must show before/after timings.
- 68h6 stays in review on branch atelier/68h6 (autonomy `branch`); 57cv builds on it.

## Since last update
- Owner picked Flow ("really like the feel") but wants colour, layout and logo revisited, with many logo options tied to colour schemes (R-5). Started hspr.
- Owner accepted AC-7 ("feels calm") on the D2 Inbox, 2026-10-25.
- Owner: feel and animations still lacking; wants more demos and refined versions (overrule #2, ruling R-3). Cancelled w9ew. 57cv started: motion references, motion system, three feel variants with recorded demos.
- Ruling R-4 and team check AC-18 (speed). 6dug started.

## Lead's own cost
- 2026-10-25: re-arming the 30-min watch while idle cost ~$7 with no work running. While nothing runs and only owner decisions are pending, let the watch lapse; rely on the 2-hour check-in and owner chat. Re-arm as soon as any task starts.

## Next
- 6dug done and reviewed: check the timings, land it if the owner agrees, tell the owner it's faster.
- 57cv done: watch the demos myself, then send the owner feel/index.html and the phone demos, recommend one.
- Then D4: every other screen in the chosen feel (brief in PLAN.md, plus R-3 demos).
