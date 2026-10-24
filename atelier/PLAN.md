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
| — | designer | D2: all screens + DESIGN.md in the chosen direction | owner picks direction | not started |
| — | frontend | Slice 1: shell + summary endpoint + Inbox | design gate | not started |
| — | frontend | Slice 2: project + task pages | slice 1 | not started |
| — | frontend | Slice 3: office, new project, settings | slice 2 | not started |
| — | auditor | End-of-milestone audit | slice 3 | not started |

## Progress notes
- 2026-10-24 later: brief approved ("Continue"; taken as accepting the brief's assumptions incl. two directions + one-branch hand-off). Spec, contracts approved by lead. AC-1..7 approved by owner; AC-8..16 team checks. No holdout tests (personal scale; reviewer + end audit cover). Designer D1 tkvt started.
- 2026-10-24: shift start. Brief already drafted. Charter drafted to atelier/CHARTER-draft.md (CHARTER.md is owner-only); sent owner a play-back + two questions. Next: once charter/brief approved, write SPEC + ~10 criteria, self-approve spec, start designer.
