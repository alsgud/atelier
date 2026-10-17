# crew

A personal agent crew for Claude Code. You hand out tasks from your phone, agents grind on them for hours in Ralph loops, and you get pinged only when something needs you.

It was inspired by Agent Office (sessions as desks with working / needs-you / finished / stale states), OpenClaw's heartbeat, and Hermes's self-written skills, but none of their code is used. crew is a few hundred lines of dependency-free Node on top of features Claude Code already ships with: headless `claude -p`, auto mode, git worktrees, Remote Control, and push notifications.

## How it fits together

```
 phone (Claude app)
      │  Remote Control
      ▼
 Foreman session ──── crew CLI ──── ~/.crew/board/<id>.md   (task cards)
  heartbeat every 15m      │
                           ├─ tick: start queued tasks up to maxParallel, pace on plan limits
                           ▼
                     runner (detached, one per task)
                       loop: fresh `claude -p` in its own worktree
                             → commit → run the done-check
                       until check passes + agent says DONE  → push branch, draft PR
                          or agent BLOCKED / budget spent    → needs-you
                          or nothing changes 3x               → stalled
```

- **Task card**: goal, a done-check command, a budget (iterations and hours), and autonomy (`pr` or `branch`). Board states: `queued → running → needs-you → review → done`, plus `stalled`, `failed`, and `paused`.
- **Ralph runner** (`lib/runner.mjs`): every iteration starts with fresh context, and state lives in files: `PROGRESS.md`, `DECISIONS.md`, `QUESTIONS.md`, git history, and a per-repo lessons file. *Done* is decided by running the check, not by the model saying so.
- **Standing orders** (`prompts/standing-orders.md`): the rule is "assume and flag". Agents make routine calls themselves and log them, and stop only for irreversible, outward-facing, money, credential, or product-direction decisions.
- **Guardrails**: auto mode answers permission prompts, and anything it would still ask about is denied instead of left hanging (`--permission-prompts none`). A deny list blocks push, merge, and deploy commands. The runner itself pushes the branch and opens a *draft* PR, so you always do the merge.
- **Pacing**: each headless run reports plan usage (`rate_limit_event`) and crew saves it to `~/.crew/limits.json`. Runners and the scheduler hold work when the 5-hour window passes 90% or the 7-day window passes 97% (set in `config.json`), and resume after the reset.
- **Foreman** (`foreman/CLAUDE.md`): a Remote Control session you talk to from the Claude app. It turns messages into cards, runs the heartbeat, and pushes you only for needs-you, review, stalled, or failed.

## Teams (v2)

[SPEC-v2.md](SPEC-v2.md) has the full design. In short: a **project** is a repo with a roster, a trust level and four gates. You talk to the project's **lead** (`crew lead <alias>`, which shows up in the Claude app as "<alias> lead"). The lead walks you through brief → spec → design → contracts, and nothing gets built until you approve each gate. Specialists then work in parallel, each one locked by a `PreToolUse` hook to the files its role owns. Approved planning docs are frozen. The reviewer checks every task before its PR opens. Anything that crosses a boundary goes through a request card to the lead.

```bash
crew repo add mygame ~/Documents/mygame
crew project init mygame --roster game --trust strict   # scaffolds crew/BRIEF.md, SPEC.md, acceptance/
crew lead mygame                                        # then open "mygame lead" on your phone
```

Role templates live in [roles/](roles) and can be listed with `crew roles`. Each project's roster sets which files every role owns in that repo (`crew project role add <alias> <role> --owns "src/ui/**"`). Where ownership overlaps, the most specific glob wins.

## Setup (once)

```bash
cd ~/Documents/crew && npm link      # puts `crew` on PATH
crew init
crew repo add sandbox ~/Documents/crew-sandbox
```

In Claude Code, run `/config` and turn on **Push when actions required** and **Push when Claude decides**. Open the Claude app on your phone once so it registers for push.

## Daily use

At the PC, start the foreman and leave the window open:

```bash
crew foreman
```

From your phone, open the **Foreman** session in the Claude app and talk to it:

- "in sandbox: add a `todo clear` command that removes completed todos"
- "status"
- "jmfv: use ISO dates, not locale dates"
- "more time for jmfv"

Or drive it directly from any terminal:

```bash
crew add sandbox "Clear command" --check "npm test" --goal "..." --iterations 6
crew digest
crew show <id>
crew answer <id> "go with option B"
```

## Writing good tasks

The done-check matters most. It should fail now and pass only when the work is really finished. The pattern used in `crew-sandbox` is to write an acceptance spec first (`spec/*.spec.mjs`), commit it on main, and set the check to `npm test && npm run spec`. The agent can't weaken the spec without breaking the standing orders, and the draft PR shows any changes to it.

## Files

| Path | What |
|---|---|
| `~/.crew/board/<id>.md` | task cards |
| `~/.crew/runs/<id>/` | progress, decisions, questions, per-iteration stream logs, last check output |
| `~/.crew/worktrees/<id>/` | each task's git worktree (branch `crew/<id>`) |
| `~/.crew/lessons/<repo>.md` | durable lessons agents leave for the next agent in that repo |
| `~/.crew/events.jsonl` | event log the foreman's heartbeat reads |
| `~/.crew/config.json` | `maxParallel`, pace thresholds, timeouts, defaults, deny list |

## Limits

- Local runners and Remote Control need the PC on. Remote Control reconnects after sleep, but a session exits if the PC stays awake with no network for about 10 minutes.
- `where: cloud` tasks aren't dispatched automatically yet. `crew cloud <id>` prints a `/goal` prompt with the standing orders, ready to paste into a cloud session from the Claude app for when the PC is off.
