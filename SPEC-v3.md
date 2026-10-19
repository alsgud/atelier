# atelier v3: a manager, a lead, and a flat team that can't drift quietly

**Status:** draft for the owner's review. Nothing in this document is built yet.

**Builds on:** [SPEC-v2.md](SPEC-v2.md) (projects, gates, roles, ownership, the reviewer, request cards).

**Evidence:** [reports/AI coding agent team workflows.md](reports/AI%20coding%20agent%20team%20workflows.md) and [docs/research-team-design.md](docs/research-team-design.md).

## Goal

The owner works like a senior manager. They give deep briefs to one team lead, approve decisions, and spend less time overseeing the team than they would pairing with a single agent or vibe coding alone. The two biggest risks are that the lead drifts from the owner's vision, and that quality slips without anyone noticing. Everything below is designed around those two risks.

The research summed up atelier's central question as **where decisions are allowed to happen**. In v3, decisions happen in exactly two places: the owner, and the lead acting in writing. Everything else is either isolated (a specialist in its own worktree) or mechanical (tests, hooks, ledgers). The owner checks the lead through an independent auditor.

## Structure

```
Owner ── deep briefs, gate approvals, rulings
  │
Lead ── the only decision-maker below the owner; its authority lives in files, not in its context
  │       plans, staffs, writes contracts and criteria (with the owner), triages, reports
  ├── Specialist (fresh-context Ralph loop, own worktree, implements its own tasks)
  ├── Specialist …        ← one writer per piece of work by default
  └── Reviewer (read-only, different model family where possible)

Auditor ── plan-blind, reports drift straight to the owner, outside the tree
```

There's one layer below the lead. Specialists do their own work, and nobody below them delegates. Recursive sub-leads are only an escape hatch if a project ever needs more than about 5–8 concurrent writers.

## What changes from the v3 sketch, and why

| # | Change | Why (evidence) |
|---|---|---|
| 1 | The lead's authority lives in files. It runs in fresh-context cycles, reads digests instead of raw messages, and a hook blocks it from writing code. | Cursor's planners needed periodic fresh starts. A single agent holding every role became pathological. Claude Code teams report leads doing tasks themselves and declaring the team done early. |
| 2 | Peer messages stay but are **typed and non-binding**. Only the lead amends contracts, nobody blocks waiting on a peer, and messages per iteration are capped. | No commercial system lets workers chat. Peer topologies amplified errors 7.8× vs 4.4× for a hub. Anthropic saw "excessive updates". The owner's reason for keeping the channel (nothing lost in translation, and the Conway's-law split) is also the gap Cognition calls unsolved. |
| 3 | **One writer per piece of work by default.** A second concurrent writer only with disjoint ownership and criteria that tell failures apart. Read-only help (designer specs, reviewer, auditor) is freely parallel. | Anthropic: multi-agent fits "most coding tasks" poorly. Every multi-agent setup lost 39–70% on sequential work. The C compiler's 16 agents collided until an oracle separated their failures. |
| 4 | Tests and criteria are **read-only to implementers**, with holdout tests for critical criteria, automatic flags on test-touching diffs, and a "spec conflict" escape route. | ImpossibleBench: some models gamed tests on 54–76% of impossible tasks. An abort option reduced cheating. |
| 5 | **Tiered verification:** a fast sampled suite in the loop, the full suite on merge, review depth by risk, and a reviewer from a different model family. | Validation was 37% of Factory's wall time. Cursor found gating every commit serialized the system. LLM judges prefer their own model's output. |
| 6 | Acceptance criteria live in **JSON with IDs**, and their status can only be flipped by verification. Every iteration starts with a smoke test. | Anthropic's long-running harness: a JSON feature list where agents may only flip `passes`, plus a startup smoke test. |
| 7 | The **interview** is the default deep-brief format. Rambles are welcome, but the lead must follow with a clarification pass before anything freezes. Spec size scales with task size. | Brief quality drives everything downstream. Böckeler found heavy spec tools turned a small bug into 16 acceptance criteria. |
| 8 | Findings are **ranked by severity and reversibility**. Autonomy thresholds are set **before** starting, and gating depends on reversibility, not only on accumulated trust. | The owner's attention is the scarcest resource ("attention tax"). |
| 9 | **Measure from day one:** cost per accepted criterion, auditor findings the owner confirms, and whether peer messages prevented mismatches, compared against a single-loop baseline. | There's no published coding baseline, so atelier has to answer "is the team worth it?" on its own work. |

## The decision layer (what the lead and agents must obey)

All of this lives in the project repo under `atelier/`. Each item has a clear owner:

| File | Who can change it | Notes |
|---|---|---|
| `CHARTER.md` | **Owner only**, enforced | Your deep brief distilled: vision, quality bar, taste, and what "wrong" looks like. Kept short (about one page), because long constitutions get both ignored and over-applied. |
| `RULINGS.md` | Owner, recorded by the lead | Numbered precedents from your corrections. Where possible, each ruling also becomes a test or lint rule, so it's enforced rather than just remembered. |
| `criteria.json` | Owner + lead together; implementers can't edit it | `AC-1…` with: statement, kind (`test` / `property` / `review` / `owner`), the command or rubric, which charter line or ruling it serves, `status`. Only verification flips `status`. `owner`-kind criteria never auto-pass. |
| `acceptance/` + `holdout/` | Lead (with owner approval); implementers can't see `holdout/` | `holdout/` tests run only in the runner and the reviewer, never in a specialist's worktree. |
| `contracts/` | Lead only, after the contracts gate | Changes go through contract-change requests. |
| `PLAN.md`, `LEDGER.md` | Lead | The plan, staffing, task graph and open issues. This is what keeps the lead restartable. |

## The lead

- **Authority in files, context disposable.** The lead re-reads the charter, rulings, criteria, plan and ledger at the start of every cycle: each heartbeat, and after any compaction. When its context grows long, atelier restarts it fresh with a handoff note, so the files remain the source of truth, not its memory. On your phone this may appear as a new "<project> lead" conversation. That's the trade-off for no drift.
- **Can't write code.** A hook allows edits only under `atelier/`, and blocks the lead from editing code or tests.
- **Staffing decisions follow rules:**
  - Start with one writer.
  - Add a second only when ownership doesn't overlap and the criteria can tell their failures apart.
  - Prefer read-only parallel help.
  - Treat existing codebases and dynamically typed code as signs to slow down and split less.
  - Explain every staffing choice to you in one line.
- **Reports everything at first.** Every plan, staffing change, peer-message digest, review verdict and criteria change, ranked by severity. A reporting dial (everything → daily → exceptions) loosens as trust grows (see Trust below).
- **Clarification pass.** After any ramble, and before freezing brief, spec or contracts, the lead lists its ambiguities, each with a proposed answer, and gets yours.

## Specialists

- Each specialist is a **fresh-process Ralph loop**: the atelier runner as built, with a fresh `claude -p` each iteration, in its own worktree, on its own budget.
- **Every iteration starts the same way:**
  1. smoke test
  2. read the task, the inbox, `criteria.json` and the contracts
  3. pick one thing to do
- **In the loop**, run the task's criteria plus a fast sampled slice of the suite. The full suite runs on merge.
- **Can't edit** tests, criteria, the charter, rulings or contracts. Ownership hooks block those edits, and the runner reverts them from the git diff if they slip through some other way. Any diff that touches test files is flagged to the reviewer and the lead.
- **Spec-conflict escape.** When a test, criterion and spec disagree, the specialist files `atelier request --to lead --kind spec-conflict` and keeps working on everything else. It never bends the test.
- **Specialist lessons** carry across projects, but only after the lead or reviewer promotes them, so one project's bad habit doesn't spread.

## Direct communication: kept, but non-binding

You want specialists to talk directly so nothing is lost in translation. The evidence says the danger is a peer message quietly becoming a decision. So:

- **Message types:**
  - `question`: asks a peer something
  - `discovery`: "FYI, I found X"
  - `contract-change-request`: needs the lead
  Nothing else is allowed.
- **No message binds anyone.** If something another role builds on changes, it has to go through a contract-change request that the lead rules on. Builders code against `contracts/` only, and the reviewer rejects work that relies on an interface that isn't in the contracts.
- **Nobody waits on a peer.** If an answer is needed to proceed, it becomes a request to the lead.
- **Up to 3 outbound messages per iteration**, each limited to a few lines. This prevents the "excessive updates" failure.
- **The lead gets a digest of all messages each cycle**, with contract-change requests and flagged items on top. You can read the full log at any time.

## Verification, in tiers

| Tier | When | What |
|---|---|---|
| Loop | every iteration | the task's criteria plus a sampled fast suite |
| Task done | DONE claimed | the task's criteria, holdout tests, then the reviewer. Review depth depends on risk: small, low-risk diffs get a light pass; diffs touching tests, contracts or shared code always get a full one. |
| Merge | before push / PR | the full regression suite against the latest main |
| Phase end + daily | scheduled | the auditor |

The reviewer runs on a different model family from the implementer where possible, and on Opus at minimum.

## The auditor

- **Sees:** the charter, rulings, `criteria.json`, a milestone list, and the running product.
- **Never sees:** the lead's plan, ledger or reasoning.
- **Runs** as a dynamic workflow. Several agents check each criterion and charter line independently, and only findings that survive cross-checking go out.
- **Reports to you directly**, ranked by severity and reversibility: "Charter says X; product does Y."
- **Has its hit rate tracked:** the share of findings you confirm. If it cries wolf, its bar goes up; if it misses what you catch, its checks get sharper.

## Trust, autonomy and reporting

These are set per project **before** work starts, and promotion or demotion happens by rule, not by mood:

| Dial | Levels | Promote when (example; you set the numbers) | Demote when |
|---|---|---|---|
| Gating | strict → standard → loose | 10 consecutive approvals with ≤1 overrule, and no unconfirmed auditor findings | any high-severity auditor finding you confirm |
| Reporting | everything → daily → exceptions | same as above | same |
| Autonomy | draft PR → merge to main | per project type (test projects merge; client work uses PRs), not by trust alone | a regression reaches main |

Irreversible or outward-facing actions stay with you at every trust level.

## Metrics (from day one)

`atelier project status` and a weekly digest show:
- cost per accepted criterion and per merged task
- your time spent: approvals, answers, review
- auditor findings you confirmed vs dismissed
- how often peer messages led to a contract change or prevented a mismatch
- the same numbers for a single-loop baseline run on comparable tasks

## Build order

Built in this order, each step tested on the sandbox or the dodge practice project before the next:

1. **Decision layer:** `CHARTER.md` (owner-only), `RULINGS.md`, `criteria.json`, read-only tests and criteria for implementers, holdout tests, test-diff flags, and the spec-conflict request.
2. **Lead hardening:** the code-write block, file-based restart cycles, the digest, the clarification pass, and staffing rules.
3. **Verification tiers:** sampled loop suites, the full suite on merge, risk-based review depth, and the reviewer's model family.
4. **Auditor:** a plan-blind workflow, ranked findings, and hit-rate tracking.
5. **Typed, non-binding peer messages** with the lead digest.
6. **Trust dials** with your thresholds, and the metrics.

## Open questions for the owner

1. **Lead restarts.** Are you OK with the lead occasionally appearing as a new conversation on your phone after a fresh restart? The alternative is one long conversation that is compacted, which risks drift.
2. **Reviewer model family.** Claude only has one model family. A truly different family would need another provider, such as OpenAI's Codex CLI as a reviewer. Is adding a second provider worth it, or is Opus reviewing Sonnet's work enough for now?
3. **Promotion thresholds.** The numbers above are placeholders. What would make you comfortable loosening each dial?
4. **The message cap.** Is 3 messages per iteration too tight for what you have in mind?
