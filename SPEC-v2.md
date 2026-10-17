# crew v2: teams, gates, and a lead per project

The research behind the role design is in [docs/research-team-design.md](docs/research-team-design.md).

v1 is a board of interchangeable workers. v2 turns a project into a small team. The team has a lead you talk to, specialists who own their part of the code, and a reviewer who never builds. Gated phases carry the work from your direction to merged code.

## Goals

- You set strong direction on everything (brief, spec, design, API), not just PRs. The lead walks you through each phase and doesn't move on until you approve it.
- Specialists work in parallel without stepping on each other: file ownership is enforced, not requested.
- Agents coordinate through the lead and written contracts, not chat.
- Gating starts strict and loosens as the lead earns trust, with a record to judge that by.
- Everything stays visible as text or tables in the Claude app.

## Non-goals (for now)

- No visual office or dashboard. That can come later on top of the same board.
- No agent-to-agent chat channel. Request cards cover the rare direct need.
- No automatic deploys, merges to main by agents, or pushes by agents.

## Concepts

### Project

A project is a registered repo (`crew repo add`) plus a project state file at `~/.crew/projects/<alias>.json`:

```json
{
  "alias": "sandbox",
  "roster": [
    { "role": "designer", "owns": ["crew/DESIGN.md", "crew/design/**"] },
    { "role": "frontend", "owns": ["src/ui/**", "public/**"] },
    { "role": "backend",  "owns": ["src/api/**", "src/db/**", "crew/contracts/**"] },
    { "role": "reviewer", "owns": [] }
  ],
  "trust": "strict",
  "gates": { "brief": null, "spec": null, "design": null, "contracts": null },
  "overrules": []
}
```

The planning documents live in the repo under `crew/`, so every worktree sees them:

| File | Phase | Written by |
|---|---|---|
| `crew/BRIEF.md` | kickoff | lead, with you |
| `crew/SPEC.md` | spec | lead, with you |
| `crew/DESIGN.md`, `crew/design/**` | design | designer |
| `crew/contracts/**` | contracts | lead and backend |

### Rosters

| Roster | Shape | Use |
|---|---|---|
| solo | you + one interactive session | day projects; crew stays out of the way |
| pair | builder + reviewer | small features |
| team | lead + designer + frontend + backend + reviewer | bigger projects |
| game | lead + game designer + gameplay + systems + reviewer | games |

Rosters are starting points. The lead proposes one at kickoff, you adjust it, and it can change later (`crew project role add/remove`).

### Roles

A role template lives at `roles/<role>.md`. It holds the role's standing orders: how a senior person in that role works, and what they hand off. The project roster gives each role its **owned paths** for this repo, because layouts differ between repos.

Ownership is enforced by a `PreToolUse` hook (`crew guard`) on every agent run:

- An agent may write only inside its role's owned paths in its worktree, plus its crew run folder and the lessons file.
- Planning docs are **frozen** once their gate is approved. No role may edit them; a change needs a request card to the lead.
- A role with no owned paths (the reviewer) can't write project files at all.
- A task with no role (v1 style) may write anywhere in its worktree, except frozen docs.

Shell commands can still write files, so ownership has a second layer. After every iteration, and after every review, the runner checks the git diff against the same rules and reverts out-of-bounds files in a commit of their own. The next iteration is told what was reverted. Where ownership globs overlap, the most specific one wins, so backend's `src/api/**` beats frontend's `src/**`. The generalist `builder` is exempt so it can do integration work.

### Phases and gates

```
kickoff → spec → design → contracts → build → integrate
   ▲        ▲       ▲         ▲         ▲         ▲
  gate     gate    gate      gate     per-task   merge
```

- **Kickoff**: the lead interviews you (vision, audience, scope, non-goals, constraints, taste references) until it can play the project back in its own words. Output: `BRIEF.md`.
- **Spec**: the requirements, each with acceptance criteria phrased so they become done-checks. Output: `SPEC.md`.
- **Design**: one or more designer tasks (see the designer role). Their check is `crew verify design`.
- **Contracts**: API routes, data shapes, events, and shared types. Their check is `crew verify contracts`.
- **Build**: role tasks run in parallel against the frozen contracts, in Ralph loops.
- **Integrate**: one integration task with an end-to-end check, then the reviewer, then your merge.

A gate is approved with `crew gate <project> <phase> approve --quote "<your words>"`. The lead runs it only after you approve in chat, and the quote is stored as the record. `skip` is allowed for phases that don't apply, such as design for a CLI. Approving design or contracts requires the documents to be on the base branch. `--merge <task>` merges a local task branch first, but only when the main checkout is clean and on the base branch.

### Trust dial

| Level | Gates required before build | Task plans | Reviewer |
|---|---|---|---|
| strict | brief, spec, design, contracts | each task starts `planned`; you approve it (`crew approve <id>`) | every task |
| standard | brief, spec, design, contracts | tasks queue directly | every task |
| loose | brief | tasks queue directly | if in roster |

New projects start at **strict**. When you overrule a proposal, the lead logs it (`crew overrule <project> "<what>"`). `crew project status` shows overrules against the number of decisions you approved, so you can tell when to turn the dial (`crew project trust <project> standard`).

### Reviewer

When a task with a reviewer in its roster passes its check and says DONE, the runner does **not** open the PR yet. It runs a review pass: a fresh `claude -p` under the reviewer role, which can read files but not edit them. The reviewer gets the task goal, the spec, the design, the contracts, the decisions log, and the branch diff. It writes `REVIEW.md` in the run folder and ends with `CREW_REVIEW: APPROVE` or `CREW_REVIEW: CHANGES`.

- The reviewer can run on a different model from the builders (`crew project role add <alias> reviewer --model opus`). A separate grader is the structural fix for self-preference, and a stronger one makes it stricter.
- On APPROVE, the runner pushes and opens the draft PR, with the review in the PR body.
- On CHANGES, the feedback goes into the next build iteration. After 2 rounds of CHANGES, the task moves to needs-you.

### Request cards

When a specialist needs something it doesn't own, it runs `crew request --to <role> "<what>"` from its task (for example, frontend needs an endpoint). That creates a card in state `requested`, linked to the requesting task (`requested_by`). The requester keeps working on anything independent. If it is fully blocked, it ends with BLOCKED and `waits_on` set to the request.

The lead triages requests: approve (`crew approve <id>`, which queues it for that role), fold it into another task, or bring it to you. When the request task reaches done, tick requeues every task waiting on it. On resume, the runner merges the base branch into the waiting task's worktree, aborting cleanly on conflict.

### Lead

`crew lead <project>` starts a Remote Control session named `<project> lead` in the repo's main checkout. It runs under the lead role, which owns only `crew/**` planning docs. On your phone, each project shows up as its own conversation. The lead:

- keeps `crew/PLAN.md` as its ledger (facts, assumptions, task graph, progress) so its plan survives context compaction
- runs kickoff and spec with you, writes the documents, and commits them to the base branch (`crew/` paths only)
- writes every task with the fixed brief (objective, context, done means, scope, files, hand-off) and the sizing rules in `roles/lead.md`
- replans stalled or bounced tasks instead of just extending their budget
- creates design and contracts tasks, then build tasks, each with a role and a done-check
- shows task plans at strict trust, triages request cards, and logs overrules
- runs its own heartbeat for its project's events and pushes you on needs-you, review, stalled, failed, requested, or a gate waiting on you

The cross-project foreman from v1 stays as a front desk ("what's going on everywhere?") and notifies only about tasks without a project.

## Commands added

```
crew project init <alias> [--roster team|pair|game] [--trust strict]
crew project status <alias>
crew project role add <alias> <role> [--owns "glob,glob"] | role remove <alias> <role>
crew project trust <alias> strict|standard|loose
crew gate <alias> <phase> approve|skip|reopen --quote "<owner's words>" [--merge <task>]
crew approve <id>                 planned/requested → queued
crew request --to <role> "<what>" [--from <id>]   (from inside an agent run, --from defaults to $CREW_TASK)
crew overrule <alias> "<what>"
crew board [alias]                tasks grouped by role
crew verify design|contracts      done-checks for planning tasks
crew lead <alias>                 start the project's lead session
crew guard                        (PreToolUse hook)
```

`crew add` gains `--role <role>`. For a project at strict or standard trust, it refuses build tasks until the required gates are approved. Design and contracts tasks are allowed once spec is approved.

## Build order

1. Roles, ownership guard, `--role` on tasks.
2. Projects, gates, trust dial, the lead session, and kickoff and spec templates.
3. Reviewer pass, request cards, `waits_on`, and the board grouped by role.
