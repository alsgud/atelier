# Atelier

Your own agent studio. You work like a senior manager: you give deep briefs to a team lead, approve the decisions that matter, and a flat team of specialist agents does the work. An independent auditor tells you, not the lead, whether the product is drifting from what you asked for.

The design is in [SPEC-v3.md](SPEC-v3.md). The evidence behind it is in [reports/](reports) and [docs/research-team-design.md](docs/research-team-design.md).

## How it fits together

```
You ── dashboard (desktop + phone) and the lead chat in the Claude app
 │       approve gates, criteria, plans, the charter; judge drift; answer questions
Lead ── the only decision-maker below you; locked to planning docs; restarts fresh from files
 ├── Specialists ── fresh-context Ralph loops in their own worktrees; one writer per area
 └── Reviewer ───── Opus 5.5, high effort; light or full review by risk
Auditor ── never sees the lead's plan; checks the product against your words; reports to you
```

- **The decision layer** is what everyone obeys:
  - **Your charter**: only you change it, and any edit after approval is detected.
  - **Your rulings**: corrections that become precedents.
  - **Acceptance criteria**: you approve them. Only verification can mark one passing, and some need your judgement.
  - **Hidden holdout tests** that specialists never see.
- **Owner-only actions:** gates, criteria, task plans, the charter and the dials can only be approved by you, in the dashboard or your own terminal. Agents' shells are refused.
- **Specialists talk directly** with typed messages (question, discovery, contract-change). A message never binds anyone; only the lead changes contracts.
- **Verification in tiers:**
  1. The task's own check, every iteration.
  2. When a task claims done: its criteria, the holdout tests, and the full suite.
  3. The reviewer.
  4. The full suite again on merge.
- **Trust dials** loosen by rule when the team has earned it, and tighten automatically when you confirm high-severity drift.

## Daily use

```bash
atelier open
```

This opens the dashboard in your browser and starts it if needed. Everything waiting on you is on the home page and behind the bell, each item with its one-tap action. Start a project's lead from its Overview tab, then talk to it in the Claude app (Code → "<project> lead").

**On your phone:** run `atelier open --lan` and open the address it prints while you're on the same Wi-Fi. Enter the access token once. To reach it away from home, install Tailscale on the PC and your phone and use the PC's Tailscale address.

## Starting a project

```bash
atelier repo add mygame ~/Documents/mygame
atelier project init mygame --roster game     # or pair / team
atelier project suite mygame npm test         # the full test suite
atelier open                                  # then "Start the lead" on the project page
```

The lead interviews you (or listens to a ramble), drafts your charter and brief, and asks you to approve them. Criteria, design and contracts each come to you the same way, and only then does the team build.

## Commands you might use yourself

| | |
|---|---|
| `atelier open [--lan]` | the dashboard |
| `atelier project status <alias>` | everything about a project in one screen |
| `atelier board <alias>` | tasks grouped by role |
| `atelier audit <alias>` | run the auditor now |
| `atelier criteria <alias> list` | acceptance criteria and their status |
| `atelier help` | everything else |

## Files

| Path | What |
|---|---|
| `<repo>/atelier/` | charter, rulings, brief, spec, design, contracts, plan, ledger, acceptance tests |
| `~/.atelier/projects/<alias>/` | criteria, holdout tests, audits, messages, lead state |
| `~/.atelier/board/`, `runs/`, `worktrees/` | task cards, run logs, each task's worktree |
| `~/.atelier/config.json` | parallelism, pacing, timeouts, deny list |
