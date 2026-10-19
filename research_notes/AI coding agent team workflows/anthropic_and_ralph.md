# Anthropic multi-agent / long-running agent patterns, Claude Code teams & workflows, and Ralph Wiggum loops (2025-2026)

## What exactly does Anthropic recommend about when to use multiple agents vs one, and how leads should brief workers?

### Takeaway
Anthropic recommends multi-agent (orchestrator-worker) only for high-value, breadth-first, parallelizable work. It costs about 15x the tokens of chat, and it fits poorly when agents must share context or depend on each other heavily, which Anthropic says covers "most coding tasks". Leads must give each worker an objective, an output format, guidance on tools and sources, and clear task boundaries, and should scale the number of workers to the task's complexity.

### Cited Findings
**Multi-agent research system (orchestrator-worker)**
- Architecture: a LeadResearcher agent plans, spawns subagents that search in parallel, and synthesizes their results. It can spawn more subagents or refine its strategy. A separate CitationAgent attaches citations at the end. Hierarchy depth is 2 (lead to workers), plus a citation pass. — [Anthropic, How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- Each subagent brief must include an objective, an output format, guidance on tools and sources, and clear task boundaries. Short briefs such as "research the semiconductor shortage" led to misinterpretation and duplicated searches. In one case, one subagent covered the 2021 chip crisis while two others duplicated 2025 supply-chain research. — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- Effort-scaling rules embedded in the prompt:
  - Simple fact-finding: 1 agent, 3-10 tool calls.
  - Direct comparisons: 2-4 subagents, 10-15 calls each.
  - Complex research: more than 10 subagents with divided responsibilities.
  — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- Token economics:
  - Agents use about 4x the tokens of chat; multi-agent systems use about 15x.
  - Token usage alone explains 80% of performance variance on BrowseComp. Tool-call count and model choice bring the explained total to 95%.
  - An Opus 4 lead with Sonnet 4 subagents beat single-agent Opus 4 by 90.2% on Anthropic's internal research eval.
  — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- Parallelism: the lead spins up 3-5 subagents in parallel, and each subagent uses 3+ tools in parallel. This cut research time by up to 90% for complex queries. — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- When multi-agent is a poor fit:
  - Tasks where all agents need the same context, or with many dependencies between agents.
  - Tasks with few parallelizable parts, "such as most coding tasks".
  - Low-value tasks.
  - Anthropic also notes that agents are "not yet strong at real-time coordination and delegation".
  — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- Observed failure modes: spawning 50 subagents for simple queries; endless searches for nonexistent sources; agents distracting each other with excessive updates; duplicated work; overly long queries; and preferring SEO content farms over authoritative sources. — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- Communication and state:
  - Execution is synchronous: the lead waits for each batch of subagents.
  - The lead can't steer subagents mid-run, subagents can't coordinate with each other, and one slow subagent blocks the batch.
  - The lead saves its plan to Memory because context beyond 200,000 tokens is truncated.
  - Agents near their context limit spawn fresh subagents and hand off through memory.
  - Subagents can write outputs to external storage and return lightweight references instead of relaying everything through the lead.
  — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)
- Evaluation and reliability:
  - Evals started with about 20 queries.
  - An LLM judge scored each output with a single 0.0-1.0 prompt plus a pass/fail grade, against a rubric of factual accuracy, citation accuracy, completeness, source quality and tool efficiency.
  - Human testing caught source-selection bias.
  - Runs resume from the point of failure using checkpoints.
  - A tool-testing agent that rewrote tool descriptions cut task completion time by 40%.
  — [Anthropic multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)

**Context engineering (Sep 29, 2025)**
- Context is a finite "attention budget". "Context rot" means recall degrades as token count grows, in all models, at differing rates. Transformers create n² pairwise relationships for n tokens. — [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Long-horizon techniques:
  - Compaction: Claude Code keeps architectural decisions, unresolved bugs and the 5 most recently accessed files.
  - Tool-result clearing: described as the lightest-touch form of compaction.
  - Structured note-taking: the Pokémon agent's notes are the example.
  - Sub-agent architectures: subagents may use tens of thousands of tokens but return condensed summaries of about 1,000-2,000 tokens.
  — [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- When to use each: compaction for long back-and-forth conversations; note-taking for iterative development with milestones; sub-agents for complex research where parallel exploration helps. — [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Just-in-time retrieval: agents keep lightweight identifiers (paths, queries, links) and load data with tools at runtime. A hybrid with some data preloaded often works best, and Claude Code is cited as the example. — [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### Inferences
- Anthropic's guidance on coding work is more conservative than its research results. Multi-agent pays off for breadth-first reading, while coding is "few parallelizable parts". The parallel-coding successes (the C compiler, below) relied on very strong test oracles and task locking, not on lead-mediated delegation.
- The roughly 15x token multiplier plus the 80% "tokens explain performance" finding suggests much of the multi-agent gain comes from spending more tokens across separate contexts, not from coordination itself.

### Gaps
- Anthropic published no numbers on multi-agent vs single-agent for coding tasks specifically; the 90.2% figure is research-only.
- The cost figures cover research workloads only. I found no comparable per-task cost data for coding work.

## How does the long-running harness keep agents from declaring victory early or losing state?

### Takeaway
Anthropic's harness (Nov 26, 2025) uses two prompts. An initializer session writes a large JSON feature list with every feature failing, plus `init.sh`, `claude-progress.txt` and an initial git commit. Each later coding session re-orients from git log and the progress file, smoke-tests the app, works one feature at a time, verifies end-to-end in a browser, and commits. The feature list blocks premature "done"; git plus the progress notes carry state between fresh contexts.

### Cited Findings
- Source: published Nov 26, 2025, by Justin Young. Two roles:
  - An initializer agent runs the first session and sets up the environment.
  - A coding agent runs every later session.
  - The two share the same system prompt, tools and harness and differ only in the initial user prompt.
  — [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Feature list:
  - It is JSON rather than Markdown, because models are less likely to inappropriately change or overwrite JSON.
  - The claude.ai-clone example had over 200 features, all starting as failing.
  - Each entry has `category`, `description`, `steps` and `passes` fields.
  - Coding agents may change only `passes`: "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality."
  — [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- One feature at a time:
  - Each session commits with a descriptive message and writes a progress summary, so bad changes can be reverted.
  - Each session must end in a "clean state", meaning code mergeable to main.
  — [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Getting up to speed: the agent runs `pwd`, reads the git log and progress files, reads the feature list and picks the highest-priority incomplete feature. It then starts the dev server via `init.sh` and runs a basic end-to-end test before new work, to catch broken states. — [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Failure modes and fixes:

  | Failure | Initializer fix | Coding-agent fix |
  |---|---|---|
  | Declares victory too early | Feature list | Read the list; work on one feature |
  | Leaves bugs or undocumented progress | Git repo and progress notes | Read notes and log, test, commit |
  | Marks features done prematurely | Feature list | Self-verify before marking passing |
  | Wastes time working out how to run the app | `init.sh` | Read `init.sh` at session start |

  — [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Verification:
  - Claude did poorly at verifying end-to-end until prompted to use browser automation and test "as a human user would". The team used the Puppeteer MCP server.
  - Remaining limits: Claude's vision, and it can't see browser-native alert modals through Puppeteer.
  — [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Open questions: whether one general coding agent or a multi-agent setup with testing, QA and cleanup specialists works better, and how to generalize beyond web apps. — [Anthropic harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### Inferences
- The harness is structurally very close to Ralph: a fixed prompt, a fresh context each session, state held in files and git, one item per iteration, and tests as backpressure. The main additions are the immutable JSON pass/fail ledger and the mandatory smoke test at session start.

### Gaps
- No cost or throughput numbers (sessions, tokens or dollars) were published for the harness experiments.

## What do Claude Code agent teams' docs say about team size, task sizing, direct messaging, quality-gate hooks and known limitations? (plus subagents and dynamic workflows)

### Takeaway
Agent teams are an experimental feature with one fixed lead and peer teammates. They coordinate through a shared, file-locked task list with dependencies and through direct mailbox messaging. The docs recommend 3-5 teammates and 5-6 self-contained tasks per teammate, owning separate files, with Sonnet for teammates. TeammateIdle, TaskCreated and TaskCompleted hooks use exit code 2 to block and feed back. Known limits: no resume for in-process teammates, task status can lag, no nested teams, one team per session, and the lead is fixed. Dynamic workflows instead put the plan in a JS script that fans out to dozens or hundreds of subagents, with adversarial cross-verification.

### Cited Findings
**Agent teams**
- Setup and positioning:
  - Disabled by default; enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
  - Spawning teammates requires an interactive session; in `-p`/SDK mode named subagents run as plain subagents.
  - The docs advise checking first whether subagents or cross-session messaging would suffice.
  — [Claude Code docs: agent teams](https://code.claude.com/docs/en/agent-teams)
- Architecture: a team lead (the main session), teammates (separate Claude Code instances), a shared task list, and a mailbox (JSON at `~/.claude/teams/{team}/inboxes/{agent}.json`). Teammates load CLAUDE.md, MCP servers and skills plus the spawn prompt, but not the lead's history. — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Communication:
  - Teammates message each other directly by name; there is no broadcast, so reaching everyone takes one message per recipient.
  - Messages are delivered automatically, so the lead needn't poll.
  - Idle teammates notify the lead and include their final answer.
  - The user can message any teammate directly.
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Tasks:
  - States are pending, in progress and completed.
  - Pending tasks with unresolved dependencies can't be claimed and auto-unblock when their dependencies complete.
  - The lead can assign tasks, or teammates self-claim the next unassigned, unblocked task.
  - Claiming uses file locking to prevent races.
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Planning: a teammate spawned while the lead is in plan mode works read-only until its plan is ready, then sends an approval request. The lead's session auto-approves the plan without review, and edits still go through permission prompts. — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Team size:
  - No hard limit, but token costs scale linearly, coordination overhead grows and returns diminish.
  - "Start with 3-5 teammates for most workflows... If you have 15 independent tasks, 3 teammates is a good starting point... Three focused teammates often outperform five scattered ones."
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Task sizing:
  - Too small and coordination overhead exceeds the benefit; too large and teammates work too long without check-ins.
  - Right-sized means "self-contained units that produce a clear deliverable, such as a function, a test file, or a review."
  - "Having 5-6 tasks per teammate keeps everyone productive."
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Best practices:
  - Give rich spawn prompts.
  - Tell the lead to "Wait for your teammates" because it sometimes implements tasks itself.
  - Start with research and review tasks.
  - Avoid file conflicts: two teammates editing one file causes overwrites.
  - Monitor and steer rather than leave the team unattended.
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Adversarial pattern: the docs' example spawns 5 teammates to test competing hypotheses and "try to disprove each other's theories, like a scientific debate", to counter anchoring. — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Quality-gate hooks:
  - `TeammateIdle`: exit code 2 sends feedback and keeps the teammate working.
  - `TaskCreated`: exit code 2 blocks creation and sends feedback.
  - `TaskCompleted`: exit code 2 blocks completion and sends feedback.
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Limitations:
  - No `/resume` or `/rewind` for in-process teammates.
  - Task status can lag, since teammates sometimes fail to mark tasks completed, which blocks dependent tasks.
  - Shutdown can be slow.
  - One team per session.
  - No nested teams: teammates can't spawn teammates.
  - In-process teammates can't run background subagents.
  - The lead is fixed for its lifetime.
  - Permissions are set at spawn, with prompts bubbling up to the lead.
  - Split panes need tmux or iTerm2 and aren't supported in VS Code's terminal, Windows Terminal or Ghostty.
  - Teammates may stop on errors, and the lead may declare the team finished early.
  — [agent teams](https://code.claude.com/docs/en/agent-teams)
- Costs:
  - "Agent teams use approximately 7x more tokens than standard sessions when teammates run in plan mode."
  - Advice: use Sonnet for teammates, keep teams small, keep spawn prompts focused, and shut teammates down when done.
  — [Claude Code docs: costs](https://code.claude.com/docs/en/costs)

**Subagents vs teams (from the comparison table)**
- Subagents return results to their caller and are cheaper because results come back summarized. Teams are fully independent, teammates message each other, and cost is higher because each teammate is a separate instance. Guidance: use subagents "when only the result matters", and teams when workers must "share findings, challenge each other, and coordinate on their own". — [agent teams](https://code.claude.com/docs/en/agent-teams)

**Dynamic workflows**
- A workflow is a JavaScript script Claude writes, with `agent()`, `pipeline()`, `parallel()`, `phase()` and schema-typed outputs. A runtime executes it in the background, intermediate results live in script variables rather than Claude's context, and the script can be saved to `.claude/workflows/`. — [Claude Code docs: workflows](https://code.claude.com/docs/en/workflows)
- Comparison table:

  | | Subagents | Agent teams | Workflows |
  |---|---|---|---|
  | Who decides what runs next | Claude, turn by turn | Lead, turn by turn | The script |
  | Scale | A few tasks per turn | A handful of long-running peers | Dozens to hundreds of agents per run |
  | Resumability | — | — | Resumable in the same session |

  — [workflows](https://code.claude.com/docs/en/workflows)
- Quality patterns: workflows "can have independent agents adversarially review each other's findings before they're reported, or draft a plan from several angles". The bundled `/deep-research` workflow votes on each claim and filters out claims that fail cross-checking. Example prompts include fix-until-tsc-passes "or two rounds in a row make no progress", per-file isolated-copy migrations, and finding issues until the list stops growing. — [workflows](https://code.claude.com/docs/en/workflows)
- Limits:
  - 16 concurrent agents by default, configurable from 1 to 256.
  - Up to 4,096 items per `parallel`/`pipeline` call.
  - 1,000 agents total per run.
  - No mid-run user input.
  - A "Large workflow" warning appears above 25 agents or 1.5M projected tokens.
  - Size guideline values: small (<5 agents), medium (<10, the default), large (<50).
  - Stalled agents restart, up to 5 times.
  — [workflows](https://code.claude.com/docs/en/workflows)

### Inferences
- Claude Code now offers three tiers of orchestration:
  - Subagents: hub-and-spoke, results go only to the caller.
  - Teams: peer messaging, shared task list, lead-centred.
  - Workflows: deterministic scripted fan-out with adversarial verification.
- Communication runs through the lead for subagents and workflows, and directly between peers for teams. Hierarchy depth is capped at 2 for teams (no nesting).

### Gaps
- No published success-rate or quality benchmarks for agent teams versus single sessions; the docs give only heuristics.
- The 7x figure is specific to plan mode; I found no general multiplier.

## What do Huntley and practitioners say makes Ralph loops succeed or fail, including running several loops in parallel?

### Takeaway
Ralph (Huntley, July 2025) is a bash loop that pipes a fixed PROMPT.md into a fresh agent context each time. State lives in specs/, a fix_plan or IMPLEMENTATION_PLAN and AGENTS.md. Each loop does one thing, and success depends on backpressure (tests, types, static analysis) plus an operator who watches and tunes the loop. Anthropic's ralph-loop plugin re-feeds the prompt in the same session via a Stop hook, and practitioners criticize this because context accumulates. Huntley keeps Ralph "monolithic" (one process, many subagents). The strongest published parallel-loop report is Anthropic's own: 16 Claudes in while-loops, coordinated only by git lock files, built a C compiler for about $20k.

### Cited Findings
**Huntley's original technique (14 Jul 2025)**
- The loop is `while :; do cat PROMPT.md | claude-code ; done`. "In its purest form, Ralph is a Bash loop." — [ghuntley.com/ralph](https://ghuntley.com/ralph/)
- Files:
  - PROMPT.md is fixed and piped in every iteration.
  - fix_plan.md is a prioritized list that is regenerated or deleted often.
  - specs/ holds one spec per file, built through conversation first.
  - AGENT.md holds build and run steps plus learnings.
  — [ghuntley.com/ralph](https://ghuntley.com/ralph/)
- Rules:
  - "One item per loop", with a fresh context of about 170k tokens each loop.
  - Up to 500 parallel subagents for search and writing, but "only 1 subagent for build/tests" so backpressure stays serialized.
  - Backpressure comes from tests per unit and type checkers or static analysers (Dialyzer and Pyrefly are named).
  - Tests should explain their purpose, because future loops lack the reasoning.
  - Commit, push and tag on green builds.
  — [ghuntley.com/ralph](https://ghuntley.com/ralph/)
- Failure modes:
  - Ralph concludes code isn't implemented after rg searches and duplicates it; Huntley calls this "the Achilles' heel of Ralph".
  - Placeholder implementations.
  - Waking to a codebase that won't compile, sometimes needing `git reset --hard`.
  - Compiler-error floods filling context.
  - Dynamic languages without static analysis lead to "a bonfire of outcomes".
  - Tuning is done with "signs" (prompt guardrails).
  - Huntley sees Ralph as best for greenfield work, expecting to get about "90% done", and would not use it on existing codebases.
  — [ghuntley.com/ralph](https://ghuntley.com/ralph/)
- Claimed results (anecdotes Huntley reports or relays, not independently verified):
  - The CURSED language.
  - A "$50k USD contract... MVP, tested + reviewed" for "$297 USD".
  - A YC hackathon post, "shipped 6 repos overnight".
  — [ghuntley.com/ralph](https://ghuntley.com/ralph/)
- "Everything is a ralph loop" (17 Jan 2026):
  - "Ralph is monolithic", a single OS process that "scales vertically" and "performs one task per loop".
  - Multi-agent communication is compared to non-deterministic microservices and called not needed yet.
  - Huntley urges engineers to "watch the loop" and fix each failure domain.
  - He describes Loom as "infrastructure for evolutionary software" (a software-factory vision).
  - The page doesn't discuss parallel loops.
  — [ghuntley.com/loop](https://ghuntley.com/loop/)

**Ralph playbook (Clayton Farr, forked by Huntley)**
- Structure: "3 Phases, 2 Prompts, and 1 Loop".
  - Phase 1 turns JTBD into specs/*.md.
  - The PLANNING prompt does gap analysis and writes IMPLEMENTATION_PLAN.md, with no code.
  - The BUILDING prompt does one task, validates, updates the plan and commits.
  - The plan file is the only shared state between iterations.
  — [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
- Context budget: about 176K of 200K is usable. Target 40-60% utilization (the "smart zone") and allocate the first ~5,000 tokens to specs. — [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)
- Backpressure and failure handling:
  - "Create backpressure via tests, typechecks, lints, builds."
  - LLM-as-judge tests are an untested option for subjective criteria.
  - Regenerate the plan when Ralph drifts, duplicates work or the plan goes stale.
  - Sandbox the loop because `--dangerously-skip-permissions` is in use: "It's not if it gets popped, it's when."
  — [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)

**Anthropic ralph-loop plugin (in-session)**
- Mechanism: a Stop hook (`hooks/stop-hook.sh`) blocks session exit and re-feeds the same prompt, so "the loop happens inside your current session". Work persists in files and git history.
- Commands: `/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "<text>"` and `/cancel-ralph`.
- Limits: max iterations default to unlimited, and the completion promise is exact string matching, so it can't express multiple conditions.
- Fit: good for well-defined tasks with automatic verification; not for judgment or design calls, unclear success criteria or production debugging. It also repeats the $297 and 6-repos claims.

— [claude-plugins-official ralph-loop README](https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/plugins/ralph-loop/README.md)

**Fresh-context vs in-session debate**
- AI Hero (updated Jan 22, 2026) argues "The plugin keeps all iterations in one session, causing the context to fill up and degrade performance over time." It claims the first 40% of context is a "smart zone" and that after 3-4 iterations the agent works "entirely in the dumb zone". These figures are illustrative, not measured. Its recommendation is a bash loop, because "Each iteration of Ralph uses a fresh context window." — [aihero.dev](https://www.aihero.dev/why-the-anthropic-ralph-plugin-sucks)
- Huntley, quoted in secondary coverage, says LLMs amplify operator skill: "if you just set it off and run away, you're not going to get a great outcome. You really want to babysit this thing." He also calls it "really cute that Anthropic has made the Ralph plugin". This came via a search summary of secondary sources, so it is unverified. — [tessl.io](https://tessl.io/blog/unpacking-the-unpossible-logic-of-ralph-wiggumstyle-ai-coding); [dreamhost](https://www.dreamhost.com/blog/ralph-wiggum/)
- Anthropic's own context-engineering post supports the fresh-context side in principle: context rot affects all models. — [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**Multiple parallel loops**
- Anthropic's C compiler (Nicholas Carlini, Feb 5, 2026) is the main primary-source parallel Ralph-style report:
  - Harness: 16 parallel Opus 4.6 agents, each in a bash `while true` loop in a fresh Docker container. Each clones from a bare repo at `/upstream` and pushes back.
  - Coordination: an agent claims a task by writing `current_tasks/<task>.txt`, and git conflicts force a second claimant onto another task. There is "no orchestration agent" and no other inter-agent channel; each agent picks the "next most obvious" problem.
  - Specialization: roles included dedup, performance, codegen, Rust-design critic and docs.
  — [Anthropic, Building a C compiler](https://www.anthropic.com/engineering/building-c-compiler)
- C compiler output and cost:
  - Nearly 2,000 sessions, 2B input and 140M output tokens, "just under $20,000".
  - The result is a roughly 100,000-line Rust compiler that builds Linux 6.9 on x86, ARM and RISC-V.
  — [Anthropic C compiler](https://www.anthropic.com/engineering/building-c-compiler)
- C compiler failure modes:
  - On the Linux kernel, all 16 agents hit the same bug and overwrote each other's fixes, so parallelism stopped helping. The fix was using GCC as an oracle: compile random subsets with GCC, then delta-debug, so agents work different bugs.
  - Context pollution: test output was cut to a few lines with "ERROR"-tagged logs.
  - Time blindness: a `--fast` option ran random 1% or 10% test samples.
  - Late regressions required stricter CI.
  - Lesson: "tests passing does not mean the job is done."
  — [Anthropic C compiler](https://www.anthropic.com/engineering/building-c-compiler)
- Practitioner patterns, from secondary and weak sources:
  - A git worktree per feature, with one loop per worktree.
  - Separate developer and tester loops, to avoid confirmation bias.
  - 30+ minutes spent specifying user stories before running parallel branches.
  - Claude Code's /batch for 5-30 parallel worktree agents.
  Evidence on what works best is thin and anecdotal. — [feedbagel](https://feedbagel.com/post/ralph-wiggum-loops-using-ai-agents-for-parallel-software-development); [awesomeclaude.ai](https://awesomeclaude.ai/ralph-wiggum)

### Inferences
- Success factors agree across sources: a fixed prompt plus a file-based plan and specs; one task per fresh context; hard, fast and quiet backpressure (tests, types, a single serialized build/test agent); an operator who watches and adds "signs"; and sandboxing.
- Failure factors: weak or noisy tests, dynamic languages, brownfield codebases, the "it's not implemented" duplication bug, and context bloat (the in-session plugin is the prime suspect).
- Parallel loops work when tasks are divisible and the oracle can localize failures to separate bugs. When every loop converges on the same blocker, parallelism collapses. Lock files plus git merges are a viable, lead-free coordination layer.
- Hierarchy contrast:
  - Ralph: depth 1, one loop with throwaway subagents.
  - C-compiler swarm: flat peers, no lead.
  - Agent teams: lead plus peers.
  - Research system and workflows: lead or script with workers.

### Gaps
- I could not fetch the official plugin README from GitHub's HTML page, only the raw README; the plugin's exact state-file mechanism is unverified.
- No direct Anthropic response to the in-session vs fresh-context criticism was found.
- No primary data from Huntley on running several Ralph loops in parallel. His posts describe a single monolithic loop, and the "Loom" vision lacks detail.
- The Huntley quotes about the plugin come only via secondary sources.
