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
| — | designer | D5: every other screen in Flow + the owner's brand pick (brief below, add motion per R-3, base on hspr) | owner picks brand | not started |
| — | frontend | Slice 1: shell + summary endpoint + Inbox | design gate | not started |
| — | frontend | Slice 2: project + task pages | slice 1 | not started |
| — | frontend | Slice 3: office, new project, settings | slice 2 | not started |
| — | auditor | End-of-milestone audit | slice 3 | not started |

## Ready-to-send briefs
- **D4 (was D3; designer, `--base atelier/68h6`, ~8 it, $16, check `atelier verify design`)**: every other screen on the D2 system: Office (playful, clearer; R12), project page (R13-R16), task page (live progress, proof, history; R17-R20), new project (R21), settings (R22), Activity. Same process as D2 (ruling R-1): wireframe each first, only D2 tokens and components (extend the sheet if needed, logged), real content and images, 390/768/1440 light and dark, two critique rounds per screen group, a toast-up hit test on any screen with a dock. Cover every line of atelier/design/inventory.md (R1, AC-9) and mark where each lives. Numbers on every screen must match the one-summary rule (R2, AC-11). Hand-off: DESIGN.md complete for frontend, plus an "Endpoint needs" list for slice 1.

## Progress notes
- 2026-10-25 later: owner picked Flow; colour, layout and logo not settled (R-5). Started hspr D4 brand ($20). Old D4 brief below becomes D5 (base on hspr). Price estimate ~$185.
- 2026-10-25: owner: feel and animations lacking, wants more demos and refined versions (overrule #2, R-3); live dashboard too slow to switch tabs (R-4, AC-18). Cancelled queued w9ew. Started 6dug hotfix (frontend, priority 1) and 57cv feel/motion demos (designer). Design now ~$56 planned (D1 4 + D2 ~22 + D3 16 + D4 ~16) vs ~$35: total will exceed $120 — told owner, new estimate ~$150.
- 2026-10-24 eve: owner chose B's feel but called D1 sloppy, "winging it, no design guide" (overrule #1, ruling R-1, team check AC-17). Cause: lead's D1 brief cut the designer's research/system/critique steps for cost. D2 68h6 follows the full role process. Design line re-priced ~$25 -> ~$35 (D1 $4 + D2 $16 + D3 ~$15); holding the $120 total by keeping build tight. Charter draft gained a "production grade" line.
- 2026-10-24 later: brief approved ("Continue"; taken as accepting the brief's assumptions incl. two directions + one-branch hand-off). Spec, contracts approved by lead. AC-1..7 approved by owner; AC-8..16 team checks. No holdout tests (personal scale; reviewer + end audit cover). Designer D1 tkvt started.
- 2026-10-24: shift start. Brief already drafted. Charter drafted to atelier/CHARTER-draft.md (CHARTER.md is owner-only); sent owner a play-back + two questions. Next: once charter/brief approved, write SPEC + ~10 criteria, self-approve spec, start designer.
