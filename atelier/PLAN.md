# Plan

<!-- The lead's ledger. Read it at the start of every shift and heartbeat; it survives context compaction. -->

## Facts (decided)
- Scope, constraints, taste, roster — BRIEF (drafted with owner, commit 5cd7b68)
- Budget ~$120 total, $40/day, $15 default per task, one audit at the end — BRIEF / project settings
- Owner approves brief and design personally; lead approves spec and contracts — project settings
- Autonomy `branch`: nothing reaches main except by owner merge — BRIEF
- Trust set to `loose` by the owner, 2026-10-24 — dashboard

## Assumptions (guessed)
- Personal-scale process, one milestone, two design directions, phone-first on core screens, one code writer, numbers from one server summary — BRIEF "Assumptions"; owner can overrule at the brief gate
- No cost history for this project yet — first tasks set the per-iteration numbers; size from `atelier costs atelier-ui` once the design task has run

## Milestone M1: the redesign (~$120)
Rough split (to be re-priced from real costs after the design task):
- Design: directions + all screens — ~$25
- Build slice 1: shell, navigation, one-source summary endpoint, Inbox with inline decisions — ~$25
- Build slice 2: project page and task page (live progress, proof) — ~$25
- Build slice 3: office, new project, settings — ~$20
- Reviews, fixes, integration branch + try-on-another-port — ~$15
- Audit — ~$10

## Task graph
| id | role | task | depends on | status |
|---|---|---|---|---|
| tkvt | designer | D1: inventory + two Inbox directions ($10, 5 it) | spec gate | running |
| 68h6 | designer | D2: production-grade foundation (refs, tokens, components, critique x2) + Inbox in B ($16, 8 it) | R-1 | running |
| w9ew | designer | D3 (old): every other screen | — | cancelled 2026-10-25 (owner: feel/motion lacking) |
| 6dug | frontend | Hotfix: live dashboard too slow to switch tabs ($10, 5 it, priority 1) | R-4 | running |
| 57cv | designer | D3: feel and motion, three refined demos on the Inbox ($16, 8 it) | R-3 | running |
| hspr | designer | D4: brand: logos, colour schemes, layouts, combos for owner pick ($20, 7 it) | R-5 (Flow picked) | running |
| ysk4 | designer | D4b: brand round 2 (N1-N11, K1-K3) | R-6 | done, owner picked N1 + K1 (R-7) |
| 6umt | designer | D5: UX research + walkthrough with numbered decisions ($22, 8 it) | R-8 | running |
| — | designer | D6: every screen high-fi in N1 + K1 dark-first, from D5 answers (old D4 brief below + R-3 motion) | owner answers UX decisions | not started |
| 5u8q | frontend | Slice 1: shell + summary endpoint + Inbox (12 it, $30) | design gate (approved 2026-10-26) | queued |
| — | frontend | Slice 2: project + task pages | slice 1 | not started |
| — | frontend | Slice 3: office, new project, settings | slice 2 | not started |
| — | auditor | End-of-milestone audit | slice 3 | not started |

## Ready-to-send briefs
- **D4 (was D3; designer, `--base atelier/68h6`, ~8 it, $16, check `atelier verify design`)**: every other screen on the D2 system: Office (playful, clearer; R12), project page (R13-R16), task page (live progress, proof, history; R17-R20), new project (R21), settings (R22), Activity. Same process as D2 (ruling R-1): wireframe each first, only D2 tokens and components (extend the sheet if needed, logged), real content and images, 390/768/1440 light and dark, two critique rounds per screen group, a toast-up hit test on any screen with a dock. Cover every line of atelier/design/inventory.md (R1, AC-9) and mark where each lives. Numbers on every screen must match the one-summary rule (R2, AC-11). Hand-off: DESIGN.md complete for frontend, plus an "Endpoint needs" list for slice 1.

## Build slice briefs (ready once the design gate is approved)
Base: main after the owner merges atelier/6dug (speed fix) and atelier/pjv7 (whole design chain). If not merged, base on atelier/6dug and read the design from atelier/pjv7 with git show. Role frontend, default model (R-9: quality over cost), --files "dashboard/**,lib/dashboard.mjs", check = AC-8 suite, ~12 it, $30 each. One writer at a time (same files), slices in order. Every slice: DESIGN.md Screens/States/Responsive/Accessibility/Copy/Motion for its screens, the Endpoint needs list (read data only, contracts rules 1-5), R-4 speed (AC-18 numbers re-measured), AC-10 security unchanged, proof = the real dashboard on a spare port with real ~/.atelier data: screenshots at 360/390/768/1440 dark and light, webm of the key journey, timings. Never open windows on the owner's screen.
- Slice 1: shell (tokens K1 dark default, N1 mark + favicon, Y1 sidebar, 64 px rail, phone top bar + tab bar, sign in), the one summary on /api/overview (R2, AC-11), Inbox with every item kind, inline decisions, toast-up rules, undo (R9-R11, AC-1, AC-2, AC-5, AC-15). Criteria AC-1,2,5,8,10,11,12,13,14,15,18.
- Slice 2: Office (floors and lit desks, desk data, finished events), project page (Now first, tabs incl. Docs, Rulings, Audits per round S7), task page (stage track, proof, tries, history). R12-R20. Criteria AC-3,4,6,8,9,10,11,12,13,14,16,18.
- Slice 3: Projects list, Activity, New project, Settings (global + per project), palette, empty/error/stale states everywhere, then an inventory sweep (AC-9: every line of inventory.md works). Criteria AC-6,8,9,10,12,13,14,18.
- Then: integration on one branch, try it on a second port (R25), owner tries it, audit.

## Progress notes
- 2026-10-26 13:33: owner approved design ("Good"): recommended UX-1..15 answers stand, D6 screens no longer provisional. Owner merged 6dug and pjv7 (whole design chain) into main. Started slice 1, 5u8q, base main. Project total $188.
- 2026-10-26 ~06:00: D6 pjv7 approved (3 rounds, ~$41). Design gate requested (owner). Approval accepts recommended UX answers unless the owner names changes. Spent so far ~$184.
- 2026-10-26: owner picked N1 + K1 (R-7), asked for a full UX walkthrough with research (R-8). Started 6umt D5 ($22). Re-price: spent ~$115; remaining design D5 22 + D6 ~25; build 3 slices ~70; integration ~10; audit ~10: total ~$250.
- 2026-10-25 later: owner picked Flow; colour, layout and logo not settled (R-5). Started hspr D4 brand ($20). Old D4 brief below becomes D5 (base on hspr). Price estimate ~$185.
- 2026-10-25: owner: feel and animations lacking, wants more demos and refined versions (overrule #2, R-3); live dashboard too slow to switch tabs (R-4, AC-18). Cancelled queued w9ew. Started 6dug hotfix (frontend, priority 1) and 57cv feel/motion demos (designer). Design now ~$56 planned (D1 4 + D2 ~22 + D3 16 + D4 ~16) vs ~$35: total will exceed $120 — told owner, new estimate ~$150.
- 2026-10-24 eve: owner chose B's feel but called D1 sloppy, "winging it, no design guide" (overrule #1, ruling R-1, team check AC-17). Cause: lead's D1 brief cut the designer's research/system/critique steps for cost. D2 68h6 follows the full role process. Design line re-priced ~$25 -> ~$35 (D1 $4 + D2 $16 + D3 ~$15); holding the $120 total by keeping build tight. Charter draft gained a "production grade" line.
- 2026-10-24 later: brief approved ("Continue"; taken as accepting the brief's assumptions incl. two directions + one-branch hand-off). Spec, contracts approved by lead. AC-1..7 approved by owner; AC-8..16 team checks. No holdout tests (personal scale; reviewer + end audit cover). Designer D1 tkvt started.
- 2026-10-24: shift start. Brief already drafted. Charter drafted to atelier/CHARTER-draft.md (CHARTER.md is owner-only); sent owner a play-back + two questions. Next: once charter/brief approved, write SPEC + ~10 criteria, self-approve spec, start designer.
