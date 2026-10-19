# How Commercial AI Coding Products Organize Multi-Agent Teams (2025-2026)

Scope: Cursor (long-running autonomous coding research plus product parallel agents), OpenAI Codex and Agents SDK, Cognition Devin, Factory Droids/Missions. Research date: 2026-10-19. Primary sources were fetched unless a source is marked secondary.

## Q1: What did Cursor try first, why did it fail, what hierarchy worked, and what numbers did they report?

### Takeaway
Cursor first ran flat, equal-status peers that coordinated through a shared file. Locks made 20 agents perform like 1 to 3, and without a hierarchy the agents became risk-averse. Cursor then tried several fixed-role designs and settled on recursive planners (root planner, sub-planners) plus isolated workers. Removing roles (the integrator, then a dedicated judge in later iterations) helped more than adding them. Peak throughput was about 1,000 commits/hour with hundreds of concurrent agents running for weeks.

### Cited Findings
**Sources.** Two primary posts, both by Wilson Lin of Cursor:
- "Scaling long-running autonomous coding", Jan 14, 2026 — [Cursor blog](https://cursor.com/blog/scaling-agents)
- "Towards self-driving codebases", Feb 5, 2026, a more detailed follow-up — [Cursor blog](https://cursor.com/blog/self-driving-codebases)

**Before any multi-agent setup.**
- The project began as a no-JavaScript browser renderer driven by Claude Opus 4.5. A single agent lost track of its work, declared success prematurely and got stuck on complex details — [Cursor](https://cursor.com/blog/self-driving-codebases)
- Running tasks in parallel raised throughput, but those agents could not communicate or see the whole project — [Cursor](https://cursor.com/blog/self-driving-codebases)

**Attempt 1: flat peers with a shared state file.**
- Agents had equal status. Each read a shared file to see what others were doing, claimed tasks and updated its status — [Cursor](https://cursor.com/blog/scaling-agents)
- Locking failed in several ways:
  - agents held locks too long or never released them;
  - agents crashed while holding locks;
  - agents tried to re-acquire locks they already held;
  - agents wrote state without taking the lock.
- Twenty agents performed roughly like two or three, with most of their time spent waiting — [Cursor](https://cursor.com/blog/scaling-agents)
- The follow-up post puts this at 1 to 3 agents' worth of throughput — [Cursor](https://cursor.com/blog/self-driving-codebases)
- Cursor replaced locks with optimistic concurrency control: reads are free, and a write fails if the state changed underneath it. This was simpler and more robust but did not fix the deeper problems — [Cursor](https://cursor.com/blog/scaling-agents)

**Risk aversion in the flat setup.**
- Without a hierarchy, agents avoided hard tasks and made small, safe changes — [Cursor](https://cursor.com/blog/scaling-agents)
- No agent took ownership of difficult problems or end-to-end implementation, so work churned without progress — [Cursor](https://cursor.com/blog/scaling-agents)

**Intermediate designs (from the Feb 2026 post).**
- Planner + executor + workers + judge:
  - A planner wrote a plan, an executor spawned workers, and a judge checked completion.
  - The system was bottlenecked by its slowest worker and was too rigid.
  - Source: [Cursor](https://cursor.com/blog/self-driving-codebases)
- "Continuous executor":
  - The planner and then the judge were removed, so a single agent planned, spawned and reviewed.
  - It became pathological: it slept, stopped agents, did work itself, under-planned, failed to merge and claimed completion too early.
  - Cursor attributed this to one agent holding too many roles at once.
  - Source: [Cursor](https://cursor.com/blog/self-driving-codebases)
- Integrator removed:
  - A central quality-control and conflict-resolution gate for hundreds of workers became a bottleneck.
  - Workers could resolve conflicts themselves, so the integrator was dropped.
  - Sources: [Cursor](https://cursor.com/blog/scaling-agents); [Cursor](https://cursor.com/blog/self-driving-codebases)

**Final design.**
- A root planner owns the full scope, writes no code and delegates. Planners can recursively spawn sub-planners for narrower slices, which makes planning parallel and recursive — [Cursor](https://cursor.com/blog/self-driving-codebases); [Cursor](https://cursor.com/blog/scaling-agents)
- Workers own one task end to end, ignore the big picture and push their changes — [Cursor](https://cursor.com/blog/scaling-agents)
- No fixed hierarchy depth is stated; the recursion is open-ended — [Cursor](https://cursor.com/blog/self-driving-codebases)
- The January post describes a judge that decides at the end of each cycle whether to continue, after which the next iteration starts fresh. The February post describes later designs that dropped the separate judge. The two posts differ here because they describe different points in the same evolution — [Cursor Jan](https://cursor.com/blog/scaling-agents); [Cursor Feb](https://cursor.com/blog/self-driving-codebases)

**Numbers.**

| Project or measure | Reported figure | Source |
|---|---|---|
| Web browser from scratch | Close to one week; over 1M lines across about 1,000 files; hundreds of concurrent workers pushing to one branch with minimal conflicts | [Cursor](https://cursor.com/blog/scaling-agents) |
| Solid to React migration in Cursor's own codebase | Over three weeks; +266K/-193K edits; passing CI; still needs careful review | [Cursor](https://cursor.com/blog/scaling-agents) |
| Video rendering | 25x faster through a Rust rewrite; merged and heading to production | [Cursor](https://cursor.com/blog/scaling-agents) |
| Java LSP (ongoing) | 7.4K commits, 550K LoC | [Cursor](https://cursor.com/blog/scaling-agents) |
| Windows 7 emulator (ongoing) | 14.6K commits, 1.2M LoC | [Cursor](https://cursor.com/blog/scaling-agents) |
| Excel clone (ongoing) | 12K commits, 1.6M LoC | [Cursor](https://cursor.com/blog/scaling-agents) |
| Token spend | "Trillions of tokens" toward a single goal | [Cursor](https://cursor.com/blog/scaling-agents) |
| Peak throughput | About 1,000 commits/hour | [Cursor](https://cursor.com/blog/self-driving-codebases) |
| Tool calls | About 10M over one week | [Cursor](https://cursor.com/blog/self-driving-codebases) |
| Agents per run | Typically peaked at several hundred, each on its own large machine; "thousands of agents" across the research | [Cursor](https://cursor.com/blog/self-driving-codebases) |

- No dollar cost is published. A $3-5M cost estimate that circulates on LinkedIn is unverified — [search summary of secondary sources](https://www.zenml.io/llmops-database/scaling-multi-agent-autonomous-coding-systems)

**Model choice per role.**
- GPT-5.2 was much better at extended autonomous work: it followed instructions, stayed focused, avoided drift and implemented things completely — [Cursor](https://cursor.com/blog/scaling-agents)
- Opus 4.5 tended to stop early, take shortcuts and hand control back quickly — [Cursor](https://cursor.com/blog/scaling-agents)
- GPT-5.2 was a better planner than GPT-5.1-Codex, even though the latter is coding-specialized — [Cursor](https://cursor.com/blog/scaling-agents)
- Cursor now uses the best model for each role rather than one universal model — [Cursor](https://cursor.com/blog/scaling-agents)

**Infrastructure bottlenecks.**
- After RAM, disk I/O became the limit: hundreds of agents compiling one monolith generated many GB/s of build-artifact reads and writes — [Cursor](https://cursor.com/blog/self-driving-codebases)
- Cursor suggests copy-on-write or deduplication for Git and Cargo state, and notes that repository structure affects throughput — [Cursor](https://cursor.com/blog/self-driving-codebases)

**Cursor's product features (secondary sources).**
- Cursor 2.0 (Oct 2025) runs up to 8 parallel agents, each isolated in a git worktree or remote sandbox, plus "best-of-N" across models — [heise](https://heise.de/-10964241); [AlternativeTo](https://alternativeto.net/news/2025/10/cursor-2-0-introduces-composer-its-first-coding-model-and-parallel-agent-workflows)
- A Cursor staff member on the forum acknowledged that best-of-N has a narrow use case — [Cursor forum](https://forum.cursor.com/t/what-s-the-point-of-multiple-agents/141805)

### Inferences
- The failure pattern has three parts:
  - shared mutable coordination state plus locks leads to contention;
  - the absence of ownership leads to risk-averse, shallow work;
  - one agent with too many roles leads to pathological behavior.
- What worked separates three things: planning (recursive), execution (isolated workers) and integration (git plus error tolerance), with no central gatekeeper.
- "More structure" is not monotonically better. Cursor says the right amount sits in the middle.

### Gaps
- No total hours, dollar cost or per-role token breakdown is published.
- There is no objective quality measure for the browser (test pass rates, standards conformance). Cursor calls it "almost entirely runnable" and not meant for external use.
- No explicit maximum hierarchy depth is stated.

## Q2: Do workers talk to each other or only to planners? How is drift handled?

### Takeaway
Across all four vendors, workers do not message each other directly. They report up through a planner, coordinator or orchestrator, or they communicate indirectly through shared artifacts and git. The vendors handle drift in similar ways:
- fresh context per task or cycle;
- rewritten (not appended) scratchpads and summarization;
- independent reviewers or validators;
- an upward handoff of findings.

### Cited Findings
**Cursor.**
- Workers do not communicate with other workers or with planners mid-task. Each works in its own copy of the repo — [Cursor](https://cursor.com/blog/self-driving-codebases)
- On completion, a worker writes one handoff covering:
  - what was done;
  - notes and concerns;
  - deviations from the task;
  - findings and feedback.
- The system delivers that handoff to the requesting planner as a follow-up message. Planners that appear "done" keep receiving updates, pull the latest repo and can plan further — [Cursor](https://cursor.com/blog/self-driving-codebases)
- Drift controls:
  - scratchpad files are rewritten rather than appended;
  - agents auto-summarize when they hit context limits;
  - system prompts include self-reflection and alignment reminders, and agents are encouraged to challenge assumptions;
  - periodic fresh starts are still needed to counter drift and tunnel vision.
  - Sources: [Cursor](https://cursor.com/blog/self-driving-codebases); [Cursor](https://cursor.com/blog/scaling-agents)
- Open problems Cursor lists:
  - planners should wake up when their tasks finish (not yet implemented);
  - agents sometimes run far too long.
  - Source: [Cursor](https://cursor.com/blog/scaling-agents)

**Codex.**
- Orchestration runs through the parent: it spawns agents, routes follow-up instructions, waits for results and closes threads — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- The parent waits for all agents and returns one consolidated response. It collects subagent summaries rather than raw intermediate output — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- No peer-to-peer messaging between subagents is documented — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)

**Devin.**
- The coordinator can send instructions, context or corrections to any child mid-task — [Cognition](https://cognition.com/blog/devin-can-now-manage-devins)
- It can schedule messages to itself for checkpoints — [Cognition](https://cognition.com/blog/devin-can-now-manage-devins)
- It can pause or terminate children that are finished or off track — [Cognition](https://cognition.com/blog/devin-can-now-manage-devins)
- Children are coordinated through an internal MCP — [Cognition](https://cognition.com/blog/multi-agents-working)
- Documented failure: children don't report discoveries back to the manager by default — [Cognition](https://cognition.com/blog/multi-agents-working)
- Open problem: how a child surfaces discoveries that affect its siblings — [Cognition](https://cognition.com/blog/multi-agents-working)

**Factory.**
- Workers and validators coordinate through shared artifacts:
  - the validation contract;
  - the feature list;
  - research notes;
  - guidelines;
  - a knowledge base.
- They also coordinate through the orchestrator, which turns validator findings into "fix features". No direct agent-to-agent messaging is described — [Factory](https://factory.com/news/missions-architecture)
- Each worker starts with clean context, and state lives in external files rather than in any one agent's memory — [Factory](https://factory.com/news/missions-architecture)

### Inferences
- The convergent pattern is hub-and-spoke or a tree, with upward handoff reports plus shared external state (repo, files). Lateral worker-to-worker chat is absent in every product studied.
- Sibling-to-sibling discovery propagation is an acknowledged unsolved problem (Cognition), partially addressed by Cursor's "planner keeps receiving handoffs" design.

### Gaps
- None of the vendors publishes a quantitative measure of drift.

## Q3: How do Codex and the Agents SDK, Devin, and Factory structure delegation, verification and human review?

### Takeaway
Each vendor structures this differently:
- **Codex:** a parent with parallel subagents; read-heavy work is recommended; humans review PRs.
- **Agents SDK:** two primitives, handoffs (control transfers) and agents-as-tools (a manager keeps control), plus code-driven chains and evaluator loops.
- **Devin:** moved from "Don't build multi-agents" (June 2025) to "one writer, many contributors of intelligence" (April 2026), including a manager Devin over child Devins.
- **Factory Missions:** orchestrator, then serial workers, then independent validators, with test-first development at two levels.

### Cited Findings
**OpenAI Codex.**
- Cloud Codex launched in May 2025 (older background material) as a cloud agent that runs each task in an isolated sandbox, with tasks running in parallel and changes delivered for human review/PR — [OpenAI](https://openai.com/index/introducing-codex/)
  - The fetch of this page returned HTTP 403, so details should be verified.
- Codex subagents:
  - Built-in agent types are `default`, `worker` and `explorer`.
  - Custom agents are TOML files in `~/.codex/agents/` or `.codex/agents/`.
  - `agents.max_concurrent_threads_per_session` caps the number of parallel threads.
  - Subagents inherit the parent's model and reasoning effort unless set per agent.
  - Source: [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- Spawning is triggered by an explicit request, or by `AGENTS.md`/skill instructions — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- Subagents inherit the parent's sandbox and approval settings, which a custom agent cannot override. Approval requests surface in the main session, and in non-interactive runs they fail back to the parent — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- The docs recommend parallel agents for read-heavy work (exploration, tests, triage, summarization). They warn that write-heavy parallel work conflicts and adds coordination overhead — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- The Codex desktop app (Feb 2, 2026) acts as a "command center" for parallel agents with worktree isolation — [Verdent review (secondary)](https://verdent.ai/guides/codex-app-first-impressions-2026)

**OpenAI Agents SDK.**
- LLM-driven vs code-driven orchestration — [Agents SDK docs](https://openai.github.io/openai-agents-python/multi_agent/):
  - **Agents-as-tools** (`Agent.as_tool()`): a manager keeps the conversation and synthesizes the answer. Use it when a specialist "should help with a bounded subtask but should not take over".
  - **Handoffs:** a triage agent transfers control to a specialist, which then responds directly.
  - The two can be combined.
- Code-driven patterns: structured outputs, chaining, evaluator loops (repeat until criteria pass) and `asyncio.gather` parallelization — [Agents SDK docs](https://openai.github.io/openai-agents-python/multi_agent/)
- Handoff mechanics — [Agents SDK handoffs](https://openai.github.io/openai-agents-python/handoffs/):
  - Each handoff is exposed to the model as a `transfer_to_<agent>` tool.
  - The receiver sees the full history by default.
  - `input_filter` trims or redacts what the next agent sees.
  - `nest_handoff_history` (opt-in beta) compacts earlier history into summaries.
  - `on_handoff` is a callback, and `input_type` carries metadata.

**Cognition Devin.**
- **June 12, 2025, "Don't Build Multi-Agents" (Walden Yan)** — [Cognition](https://cognition.com/blog/dont-build-multi-agents):
  - Principles: share full context (whole agent traces, not single messages), and recognize that actions carry implicit decisions.
  - In a Flappy Bird example, two subagents built mismatched pieces (a Mario-style background and a wrong bird).
  - Recommended design: a single-threaded linear agent, plus a context-compression model for long tasks.
- **March 19, 2026, "Devin can now Manage Devins"** — [Cognition](https://cognition.com/blog/devin-can-now-manage-devins):
  - A coordinator Devin scopes work, assigns pieces, monitors progress, resolves conflicts and compiles results.
  - Each child is a full Devin in its own VM.
  - Children run tests and verify their changes before reporting.
  - Each child has its own session link that humans can inspect or message.
  - Compute (ACU) use is tracked per child.
  - The manager reads its children's full trajectories to improve future task breakdowns.
- **April 22, 2026, "Multi-Agents: What's Actually Working" (Walden Yan)** — [Cognition](https://cognition.com/blog/multi-agents-working):
  - Thesis: multi-agent works when writes stay single-threaded and the other agents contribute intelligence. Parallel writer swarms still see little real adoption.
  - Pattern 1, a clean-context review loop:
    - Devin Review averages about 2 bugs per Devin-written PR, about 58% of them severe.
    - The reviewer deliberately gets no prior context, which avoids context rot.
    - The coder filters review comments against the user's instructions, which prevents loops and out-of-scope work.
  - Pattern 2, a "smart friend":
    - A fast primary model (SWE-1.5, about 950 tokens/sec) escalates to a stronger model (Sonnet 4.5), sharing a forked copy of its full context.
    - It works best with broad questions, letting the stronger model over-scope.
    - It fails when the primary is too weak.
  - Pattern 3, a manager Devin with child Devins through an internal MCP. Cognition favors "map-reduce-and-manage" over swarms.
  - Failure modes:
    - managers trained on small tasks become overly prescriptive and lack codebase context;
    - agents assume they share state with children when they don't;
    - children don't report discoveries back;
    - models are weak at knowing when to escalate.

**Factory.**
- **Missions launch** — [Factory](https://factory.ai/news/missions); [Factory docs](https://docs.factory.ai/missions/overview):
  - The orchestrator splits projects into milestones, and every milestone ends with a validation phase (review, tests, regression checks, integration).
  - Problems found there become follow-up work.
  - Each feature gets a fresh worker session.
  - Missions is a research preview whose docs openly ask whether parallelization is "necessary or even value-add".
- **Architecture post (Theo Luan, April 10, 2026)** — [Factory](https://factory.com/news/missions-architecture):
  - The orchestrator clarifies requirements, writes a validation contract before any features, and decomposes the work into features and milestones. It delegates investigation and does not validate itself.
  - Workers write tests first.
  - Scrutiny validators review the code plus its trajectory.
  - User-testing validators run black-box checks against the contract.
  - The flow is serial: a runner executes features in order.
  - The implied hierarchy is about two levels.
- The CLI sets separate models for workers and validators (`--validator-model`, `--validator-reasoning-effort` on `droid exec --mission`) — [Factory docs](https://docs.factory.ai/missions/reference)
- Users can configure Droids as orchestrators with a Task tool that invokes other droids as subagents, plus TodoWrite — [third-party compat guide (secondary)](https://cdn.jsdelivr.net/npm/aiwg@2026.7.12/agentic/code/plugins/sdlc/agents/factory-compat.md)

### Inferences
- The common pattern across vendors has four parts:
  - a planner or coordinator that does not write code;
  - fresh-context executors;
  - independent verification by a separate agent with clean or withheld context;
  - a human at the PR boundary or session link.
- Self-evaluation bias is the explicit reason Factory and Cognition separate reviewers from implementers.

### Gaps
- No detail was found on how hosted Codex cloud tasks parallelize internally beyond the launch description.
- Factory publishes no human-review statistics.

## Q4: What concrete efficiency lessons (token cost, throughput, model choice per role) are documented?

### Takeaway
The vendors that published quantitative lessons agree on four points:
- **Use different models per role:** strong planners and validators, cheaper fast workers.
- **Expect large token spend:** Factory reports 778.5M tokens for a 38.8k-line app; Cursor reports trillions of tokens.
- **Validation is a large share of compute:** about 37% of Factory's wall time.
- **Tolerate small error rates** instead of gating every commit.

### Cited Findings
**Factory Slack-clone mission.** Source: [Factory](https://factory.com/news/missions-architecture)

| Measure | Figure |
|---|---|
| Total time | 16.5 h |
| Orchestration time | 0.38 h (2.3%) |
| Implementation time | 9.98 h (60.5%) |
| Validation time | 6.14 h (37.2%) |
| Runs | 185 |
| Total tokens | 778.5M |
| Tokens by role | 29.2M orchestration, 485.5M implementation, 263.8M validation |
| Code produced | 38.8k LoC, 52.5% of it tests |
| Statement coverage | 89.25% |
| Features | 61 total: 40 original, 21 fixes (34.4%) |
| Milestones | 6, each passing in 2-4 validation rounds |
| Issues surfaced | 81 (65 blocking) |
| Median turns (p90) | Implementation 51 (123); validation 30 (37) |
| Dollar cost | Not reported |

- Factory's role-to-model guidance: stronger judgment for the orchestrator, cost-efficient execution for workers, skeptical review for validators — [Factory](https://factory.com/news/missions-architecture)

**Cursor.**
- Requiring 100% correctness before each commit serialized the system, and small errors halted progress. Cursor instead accepted a small, steady error rate that other agents fix — [Cursor](https://cursor.com/blog/self-driving-codebases)
- It suggests a "green" branch with periodic snapshots and a fix-up pass — [Cursor](https://cursor.com/blog/self-driving-codebases)
- Prompting lessons — [Cursor](https://cursor.com/blog/self-driving-codebases):
  - Constraints ("no TODOs, no partial implementations") beat reminders.
  - Checklists narrow focus too much, so state intent instead.
  - Concrete ranges ("generate 20-100 tasks") produce larger scope.
  - Don't instruct models on things they already know.
  - Use an explicit dependency policy and timeouts.
- Prompts matter more than the harness or model choice — [Cursor](https://cursor.com/blog/scaling-agents)

**Cognition.**
- Use cheap, fast primaries with frontier escalation. Rising agent costs motivate this — [Cognition](https://cognition.com/blog/multi-agents-working)
- Devin usage in Cognition's largest enterprise segment grew about 8x over six months — [Cognition](https://cognition.com/blog/multi-agents-working)
- Showcase demos such as a browser or a C compiler have crisp success criteria that real software often lacks — [Cognition](https://cognition.com/blog/multi-agents-working)

**Codex.**
- Subagent workflows consume more tokens than single-agent runs, and higher reasoning effort increases both latency and tokens — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)
- The docs recommend a heavier model for demanding work and a lighter one for fast, narrow tasks. The current docs name `gpt-6.1-sol` and `gpt-6-luna`, which are current product names per the page — [Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)

### Inferences
- In Factory's run, validation consumed about a third of tokens and time, and about a third of all features were fixes. Independent verification is a major, non-optional cost line.
- Parallelism is consistently recommended for read-heavy or well-partitioned work. Parallel writers need either Cursor-style isolation plus error tolerance, or they should be avoided (Cognition, Codex docs, Factory's serial runner).

### Gaps
- None of the four vendors publishes dollar costs for long runs.
- Cursor publishes no per-role token split.
- No head-to-head comparison of flat vs hierarchical designs on a shared benchmark exists in the primary sources.
