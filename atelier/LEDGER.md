# Ledger

<!-- The lead updates this at every heartbeat. After a restart it's the lead's memory, so keep it complete. -->

## Resumed by owner 2026-10-27 (xhen running). Owner pauses and resumes on demand: stop or resume xhen at once when asked.
## (was) PAUSED BY OWNER 2026-10-26 ~23:30
- Owner asked to stop all workers (lag, being tabbed out). xhen stopped at try 3/17 (`atelier resume xhen` when the owner says resume). Nothing else was running. Leftover headless Edge pid 40788: owner given the command. Do not start new work until the owner says so.

## Slice 2 done 2026-10-26 ~23:00
- 66eq APPROVED round 3. Lead checked office-1440-dark on real data: matches the mockup. Owner to merge atelier/66eq. xhen slice 3 started on base atelier/66eq with all reviewer follow-ups. After xhen: second-port try (R25), owner tries it, audit (`atelier audit atelier-ui run --bg`), file the contracts (owner OK pending).

## 2026-10-26 21:36
- Owner merged 5u8q (slice 1 live) and raised Atelier's plan ceilings to 90% (5h) / 90% (week). A paced runner sleeps to its fixed time and ignores new ceilings, so the lead stopped and resumed 66eq once. 66eq round 1 review: changes; builder fixing.

- 66eq round 2 must-fix: a paced task shows as working and stuck. Lead ruled: paced tasks are not counted in working; add a read-only paced count to the summary; wording "Waiting for your plan window, carries on at HH:MM"; dim desk. Answered 21:53.
- 21:41 window guard closed Chrome New Tab, the Tailscale installer and its setup window, blamed on 66eq: almost certainly the owner's own (second false positive). Told the owner. Atelier core fix, the owner's call.

## Slice 1 done 2026-10-26 ~17:00
- 5u8q APPROVED round 2 (round 1 must-fix: double exposure leaving Inbox zero). Lead checked inbox-gate-1440-dark (matches mockup) and inbox-real-390-dark (real data, matches). Evidence: ~/.atelier/runs/5u8q/evidence/. Owner to merge atelier/5u8q to use it (restart: the service restarts the dashboard within 5 min).
- 66eq slice 2 started on base atelier/5u8q, includes reviewer follow-ups (cold first switch, Office wrap at 390, cache overview helpers). Still open from review: phone Inbox zero has no stale line (designer question); answered questions don't show in Decided today (answered event lacks who; Atelier core).

## Build started 2026-10-26 13:35
- Design gate APPROVED by owner ("Good"), recommended UX answers accepted. 6dug + whole design chain merged to main by owner. The review-task notes below are settled. hspr, ysk4, 6umt, pjv7, 57cv still show "review" but their branches are in main; Atelier's tick marks a merged branch done on its own (it did 6dug and 68h6), so nothing to do. Correction: tick only closes a branch that is an ancestor of its own base, so chained branches never close; lead closed 57cv, hspr, ysk4, 6umt, pjv7, tkvt with `atelier close` (worth telling the owner: core quirk). 5u8q is queued behind two replay tasks (c8pn, qsg9) using both parallel slots; it starts by itself when one frees.
- 5u8q slice 1 (shell, one summary, Inbox) queued, $30 / 12 it. Next: when it reaches review, check the proof myself, then slice 2 brief (PLAN), then slice 3.

- Owner raised the daily budget to $250 (14:24). 5u8q in iteration 1 at 15:00ish, check passing. M-1 from frontend: Undo holds the decision on the client for 6 s before sending it, so no server change. Accepted (matches the design's undo window).
- Request mesj (frontend): record the new read-only API shapes in atelier/contracts/dashboard-api.md. Lead reviewed the branch diff: read-only, no action changes, fine. But contracts/ is frozen (gate approved), so the guard blocked the write. Draft is in atelier/dashboard-api-draft.md. ASK OWNER: OK to reopen the contracts gate to file it? Then `atelier gate atelier-ui contracts reopen --quote "<owner words>"`, move the file, re-request. (mesj was closed with a note saying it was added: wrong, the draft is where it lives for now.)

## Design gate requested 2026-10-26 ~06:00 (settled)
- pjv7 D6 APPROVED round 3 ($41+). Screens index worktrees/pjv7/atelier/design/screens2/index.html (linked from design/index.html, so the dashboard's Design review opens it). Lead checked office-1440-dark (lit desks, legend, good character) and task-1440-dark (stage track, proof, outcomes: strong). Gate approval = accepts recommended UX answers unless the owner names changes.
- After approval: owner merges the design chain (tip atelier/pjv7). Then frontend slice 1 (shell + summary endpoint + Inbox) based on pjv7, then slices 2 and 3. Write the slice briefs from DESIGN.md Screens + Endpoint needs.

- 2026-10-26 13:23: owner accepted AC-7 (feels calm) in the dashboard and said "good, continue" in chat. The design gate is still only requested, and building can't start until the owner approves it in the dashboard (the lead can't approve it). Asked the owner to press approve.

- Why these review tasks wait (2026-10-26): 68h6, 57cv, hspr, ysk4, 6umt and pjv7 are the design chain, each built on the last. Under `branch` autonomy the lead can't land them; they reach main when the owner approves the design gate and merges atelier/pjv7 (the chain tip). Right now the gate is blocked because the main checkout has the owner's uncommitted README line. The owner has been asked to commit or drop it.

## Lead lesson
- `atelier answer` on a needs-you task already requeues and starts it. Do not also run `retry` or `tick`: pjv7 started twice and failed with EPERM on the board file rename (2026-10-26). One retry after that.

## Tell the owner (morning)
- 02:36:59 window-closed during 6umt review: Atelier closed a chrome.exe window whose title was the owner's own video tab. That is probably the owner's own browser, closed by Atelier's window guard (a false positive in Atelier core, owner's code), not an agent opening it. Tell the owner, and that it may be worth fixing the guard.

## Waiting on the owner (morning)
- UX-1..UX-15 answers: 6umt APPROVED; page worktrees/6umt/atelier/design/ux/index.html. Lead ruled the D5 open questions: no Retry action, UX-11 C, long description = brief draft, no push. Lead looked at wf-office-1440: clean but plain, so D6 pushes Office.
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
- Tasks left in review on purpose (autonomy `branch`, `atelier land` refuses): 6dug waits for the owner's merge; 68h6 -> 57cv -> hspr -> ysk4 -> 6umt -> pjv7 is the design chain, each based on the last; the whole chain reaches main in one owner merge at the design gate. All of them reach main in one owner merge at the design gate.
- 6dug round 2: tab switch paint 838 ms median / 4.5 s max -> 2 ms / under 40 ms; warm API 4 ms. Must-fix: after being unwatched it shows old data for 15 s. Lead answered with the fix (stale flag + quick re-fetch). $5.90 of $10.
- Atelier core bug (owner's code): a task fails when its end-of-iteration leftovers commit finds nothing to commit (ysk4, 2026-10-25). Lead used `atelier retry` with an answer note. Mention to owner.
- Atelier core (owner's call), from request 45nt 2026-10-26: card writes fail with EPERM on Windows when the atomic rename races a reader (a dashboard Stop answers 500 in about 2 of 8 tries; same error as the pjv7 double start). Fix: retry the rename on EPERM/EBUSY in the card writer. Lead told the frontend to retry once in lib/dashboard.mjs meanwhile.
- Atelier core (owner's call), from request kghe 2026-10-26: lib/newproject.mjs passes the whole New project description to `gh repo create --description`; a long brief (UX-12 B) makes GitHub refuse it, so the repo isn't made. Fix: pass the first line, cut to ~300 chars. The dashboard now shows a toast when it fails.
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
