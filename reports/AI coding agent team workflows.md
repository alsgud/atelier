# Fewer writers, harder checks: what the evidence says about atelier

## Executive summary

The evidence points one way: **the best agent teams for coding have a planner that writes no code, a small number of fresh-context workers isolated in their own copies of the repo, and verification that is mechanical and run by agents other than the authors. Workers report up through handoffs, not by talking to each other.** All four commercial systems surveyed avoid direct worker-to-worker messaging: Cursor, OpenAI Codex, Cognition's Devin and Factory. Cursor built its system at a scale of hundreds of agents and found that flat peers sharing state collapsed to the throughput of 1 to 3 agents. The largest controlled study found that peer-to-peer topologies amplify errors **7.8x** relative to a single agent, against **4.4x** for a central orchestrator ([Kim et al.](https://arxiv.org/html/2512.08296v2)). Multi-agent setups also cost a lot. They use 2.6 to 5x the tokens of a single agent at a matched reasoning budget, roughly 15x the tokens of chat in Anthropic's research system, and they give no average benefit once a single agent already succeeds about 45% of the time. On sequential tasks they actively hurt, by 39 to 70% ([Kim et al.](https://arxiv.org/html/2512.08296v2); [Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)).

Measured against this, atelier is mostly well aligned. Its single lead holding the source of truth, fresh-context Ralph specialists in separate worktrees, mechanically enforced acceptance criteria, independent per-task review and graduated autonomy each correspond to a practice with real support. The evidence argues for changes in five places:

1. **Restrict peer messaging.** Make it advisory, typed and non-binding, and route every binding decision through a contract change the lead approves.
2. **Make the lead restartable from files.** It should not be a long-running context that accumulates every message.
3. **Default to one writer.** Add parallel writers only when the work splits cleanly and an oracle can tell the workers' failures apart.
4. **Tier verification by risk.** Independent review and validation took **37% of Factory's wall time**.
5. **Make tests and criteria read-only to implementers.** Reward-hacking rates on adversarial tests reach 50 to 76% for some 2025 models.

The weak points are worth stating plainly. No controlled study compares single- and multi-agent setups on a realistic coding benchmark at a matched budget. Cursor, Cognition and Factory report their own results and publish no dollar costs. Two of atelier's most distinctive features, the plan-blind auditor and case-law "rulings", have no direct empirical test at all.

## Six systems converged on a planner, isolated workers and upward handoffs

The systems surveyed differ in scale and purpose, but they arrived at similar shapes. Cursor's research harness is the most important data point because it reached the largest scale and documented its failures. Cursor's first design used equal-status peers coordinating through a shared file with locks. Agents held locks too long, crashed while holding them and wrote state without taking them, so **twenty agents produced the throughput of two or three** ([Cursor](https://cursor.com/blog/scaling-agents)). Switching to optimistic concurrency fixed the contention but not the deeper problem. With no hierarchy, agents "avoided hard tasks and made small, safe changes", and no agent took ownership of difficult end-to-end work ([Cursor](https://cursor.com/blog/scaling-agents)).

Cursor's intermediate designs failed in instructive ways. A planner, executor, worker and judge pipeline was bottlenecked by its slowest worker. A "continuous executor" that planned, spawned and reviewed by itself became pathological: it slept, did work itself, under-planned and claimed completion early, which Cursor put down to one agent holding too many roles. A central integrator was also removed because it became a bottleneck ([Cursor](https://cursor.com/blog/self-driving-codebases)). The design that survived uses a root planner that writes no code and can recursively spawn sub-planners, plus workers that each own one task end to end in their own repo copy. Workers push their changes and send a single handoff report back to the planner that requested the work. That design peaked at **about 1,000 commits per hour** with several hundred concurrent agents ([Cursor](https://cursor.com/blog/self-driving-codebases)).

The other systems map onto the same template with different emphases:

- **Anthropic's long-running harness** is a single agent across many fresh sessions. An initializer writes a JSON feature list with every feature marked failing. Each later session reads git and a progress file, smoke-tests the app, implements one feature and commits ([Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)).
- **Ralph** reduces the same idea to `while :; do cat PROMPT.md | claude-code ; done`. State lives in specs and a plan file, each loop does one item, and tests and type checks act as backpressure ([Huntley](https://ghuntley.com/ralph/)).
- **Anthropic's C compiler** ran 16 Ralph-style loops in parallel with **no orchestration agent**. Agents coordinated only through lock files and git conflicts and produced a roughly 100,000-line Rust compiler for "just under $20,000" ([Anthropic](https://www.anthropic.com/engineering/building-c-compiler)).
- **Devin** moved from "Don't Build Multi-Agents" in June 2025 ([Cognition](https://cognition.com/blog/dont-build-multi-agents)) to a manager Devin over child Devins by March 2026 ([Cognition](https://cognition.com/blog/devin-can-now-manage-devins)). It then distilled the lesson as "writes stay single-threaded" while other agents contribute intelligence ([Cognition](https://cognition.com/blog/multi-agents-working)).
- **Factory Missions** runs features serially. An orchestrator writes a validation contract before any features, workers write tests first, and separate scrutiny and black-box validators close each milestone ([Factory](https://factory.com/news/missions-architecture)).

| System | Roles and depth | Planning | Communication | State freshness | Verification | Cost and throughput | Documented failure modes |
|---|---|---|---|---|---|---|---|
| Cursor research harness | Recursive planners plus workers; open-ended depth | Root planner writes no code; sub-planners slice scope | Workers send one handoff to the planner that requested the work; no peer chat | Workers start fresh; scratchpads rewritten; periodic fresh starts | Judge per cycle, later dropped; tolerate a small error rate, with a "green" branch and fix-up passes | ~1,000 commits/hr peak; "trillions of tokens"; no dollar figure | Lock contention; risk aversion in flat setups; overloaded single agent; drift; agents running too long |
| Anthropic long-running harness | 1 agent, 2 prompts (initializer, coder) | JSON feature list, all failing at start | None (single agent) | Fresh session each time; git plus progress file | Browser end-to-end tests; only the `passes` field may change | Not published | Premature "done"; untested "passes"; undocumented state |
| Ralph / C-compiler swarm | Depth 1; flat peers, no lead | Fixed prompt plus regenerated plan file | Git and lock files only | Fresh context per loop | Tests, types, one serialized build agent; GCC as oracle | Compiler: ~2,000 sessions, ~$20k | Duplicated code ("Achilles' heel"); all 16 agents chasing one bug; broken builds |
| Anthropic research system | Lead plus 3 to 5+ workers plus a citation pass; depth 2 | Lead plans, scales the number of workers to the task | Hub-and-spoke, synchronous | Lead saves its plan to memory at ~200k tokens | LLM judge with a rubric; human testing | ~15x chat tokens; +90.2% vs single agent (research only) | Spawns 50 agents for simple queries; excessive updates; duplicated work |
| Claude Code agent teams | Fixed lead plus 3 to 5 teammates; no nesting | Shared task list with dependencies | **Direct peer mailboxes** plus the lead | Teammates don't inherit the lead's history; no resume | `TaskCompleted`/`TeammateIdle` hooks block via exit 2 | ~7x tokens in plan mode | Task status lags; lead implements tasks itself; lead declares the team done early |
| Claude Code workflows | A script fans out to dozens or hundreds of agents | Deterministic JavaScript plan | Through script variables | Each agent fresh; resumable | Adversarial cross-review; voting | Warning above 25 agents or 1.5M tokens | No mid-run input |
| OpenAI Codex / Agents SDK | Parent plus worker/explorer subagents; handoffs or agents-as-tools | Parent, or code-driven chains | Parent routes everything | Parent collects summaries; history filters | Evaluator loops; human PR review | More tokens than a single agent | Write-heavy parallel work conflicts |
| Devin | Manager plus child Devins, each in its own VM | Manager scopes and assigns | Manager to children via MCP; no peer chat | Each child in its own VM; reviewer gets no prior context | Clean-context Devin Review (~2 bugs/PR) | Compute tracked per child | Children don't report discoveries; over-prescriptive managers |
| Factory Missions | Orchestrator, workers, validators; ~2 levels | Validation contract before features | Shared artifacts plus orchestrator | Fresh worker per feature | Tests first; scrutiny plus black-box validators | 16.5 h, 778.5M tokens for 38.8k LoC | 34% of features were fixes |
| MetaGPT / ChatDev / Magentic-One | Fixed SOP roles; orchestrator plus 4 workers | SOP documents; task and progress ledgers | Publish-subscribe pool; two-agent chat chains; hub | Solutions-only memory; context reset on replan | Test-and-retry loops; stall counter | MetaGPT ~31k tokens/task; Magentic-One "several dollars" per task | Low success rates (41 to 86.7% failure across MAS) |

The academic frameworks matter less as working architectures than as ablation evidence. MetaGPT's executable test feedback added **4.2 to 5.4 points** and cut human revision cost from 2.25 to 0.83 ([MetaGPT](https://arxiv.org/html/2308.00352v7)). Removing Magentic-One's ledger-based orchestrator cost about **31%** on GAIA ([Magentic-One](https://arxiv.org/html/2411.04468)). The ablations do not settle which framework is better, because MetaGPT and ChatDev each publish benchmarks on which they beat the other ([ChatDev](https://arxiv.org/html/2307.07924)). The reliable lesson is that structure helps: documents, tests and ledgers. Adding more agents does not help in itself.

The MAST taxonomy of 1,642 failed traces explains why structure matters ([Cemri et al.](https://arxiv.org/html/2503.13657)). About **44% of failures come from system design**, such as step repetition (15.7%), unawareness of when to stop (12.4%) and disobeying the task spec (11.8%). About 32% come from inter-agent misalignment, led by reasoning-action mismatch (13.2%). About 24% come from verification that is missing or wrong. The two largest measured fixes in MAST's case studies were an objective-level verification step (**+15.6%**) and giving one role final authority (**+9.4%**). The authors caution that such tactical fixes give inconsistent gains and that "task completion rates still remain low."

## Atelier matches the evidence on its structure and verification

### Lead, fresh-context specialists and worktrees

Atelier's backbone is sound. A single lead that holds the source of truth and decides staffing is the "centralized" topology. That topology had the lowest error amplification in the Google/DeepMind study, which attributes the effect to the hub acting as a validation checkpoint ([Kim et al.](https://arxiv.org/html/2512.08296v2)). It is also the shape that Cursor, Devin, Factory and Magentic-One all converged on.

Making each specialist a fresh-context Ralph loop with progress files reproduces the core of Anthropic's harness and Factory's fresh-worker-per-feature rule. Anthropic's context-engineering guidance says "context rot" degrades recall in every model ([Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)). For that reason atelier should run each iteration in a fresh process via a bash loop, not the in-session Stop-hook plugin. Critics argue that the plugin accumulates iterations in one degrading context ([AI Hero](https://www.aihero.dev/why-the-anthropic-ralph-plugin-sucks)).

Per-specialist budgets and stall detection match Magentic-One's progress ledger, which triggers replanning after a stall counter passes a threshold of 2 or less ([Magentic-One](https://arxiv.org/html/2411.04468)). They also match the "two rounds in a row make no progress" stop rule in Claude Code workflows ([Claude Code docs](https://code.claude.com/docs/en/workflows)). Together these target MAST's largest single failure mode, step repetition. Git worktrees per specialist match Cursor's isolated repo copies, Cursor 2.0 and the Codex app.

### Briefs, acceptance criteria, file ownership and staffing

Deep owner briefs and co-written acceptance criteria are among atelier's strongest features:

- **Brief quality.** Anthropic found that short briefs caused subagents to misread tasks and duplicate each other's work. It now requires an objective, an output format, tool guidance and boundaries in every brief ([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)).
- **Clarification.** ChatDev's "communicative dehallucination", in which an agent asks for specifics before answering, measurably raised quality ([ChatDev](https://arxiv.org/html/2307.07924)). Factory's orchestrator likewise clarifies requirements before decomposing work ([Factory](https://factory.com/news/missions-architecture)). This evidence favors the **interview mode over the free-form ramble**.
- **Contract before features.** Writing criteria and contracts before implementation is exactly Factory's validation contract.
- **Checkable state.** The evidence says intent survives best as checkable state. Anthropic stores features as JSON, because models were less likely to rewrite JSON than Markdown, and only lets coders flip a `passes` field ([Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)).

Per-task file ownership enforced by hooks and git-diff reverts addresses two documented failures. Claude Code's docs say two teammates editing one file causes overwrites ([Claude Code docs](https://code.claude.com/docs/en/agent-teams)). Cursor found that agents without clear ownership became risk-averse. Atelier's design is also safer than Cursor's first attempt in one respect. Ownership is assigned statically by the lead at task creation, not claimed through runtime locks, and runtime locks were the failure point Cursor documented.

Letting the lead decide how many specialists to staff matches Anthropic's effort-scaling rules: one agent for simple work, 2 to 4 for comparisons, more for complex research. It also matches Claude Code's advice to start with 3 to 5 teammates and 5 to 6 tasks each, because "three focused teammates often outperform five scattered ones" ([Claude Code docs](https://code.claude.com/docs/en/agent-teams)).

### Review, the auditor and graduated autonomy

The independent per-task reviewer has good support. Devin Review, run with no prior context, averages about **2 bugs per Devin-written PR, roughly 58% of them severe** ([Cognition](https://cognition.com/blog/multi-agents-working)). AgentCoder's separate test designer pushed HumanEval to 96.3% ([AgentCoder](https://arxiv.org/abs/2312.13010)).

The plan-blind auditor reporting to the owner is atelier's most original idea and has no direct test. Its closest analogues are encouraging, though. MAST's objective-level verification gave the largest gain it measured (+15.6%). A hierarchy with an Inspector reviewer recovered up to **96.4%** of errors from injected faulty agents ([Huang et al.](https://arxiv.org/pdf/2408.00989)). Cognition deliberately withholds context from its reviewer to avoid context rot. An auditor that checks charter, rulings and criteria against outcomes, without seeing the lead's rationale, is a reasonable way to catch the lead's own drift. Nothing else in the surveyed systems does this.

Graduated autonomy measured by approvals and overrules matches field data. Anthropic found that full auto-approve rises from about 20% to over 40% of sessions as users gain experience, while their interrupt rate also rises, from 5% to 9% of turns. Oversight shifts from approving each action to monitoring and intervening ([Anthropic](https://www.anthropic.com/research/measuring-agent-autonomy)). Anthropic explicitly advises against mandating approval of every action.

## The evidence argues for changing five parts of atelier

### Direct peer messaging is atelier's riskiest departure from practice

On the question of direct peer messaging, the evidence is lopsided but not conclusive:

- **No commercial product lets workers talk to each other.** Cursor workers "do not communicate with other workers or with planners mid-task" and send a single handoff on completion ([Cursor](https://cursor.com/blog/self-driving-codebases)). Codex documents no peer messaging. Devin routes through the manager. Factory coordinates through shared artifacts and the orchestrator ([Factory](https://factory.com/news/missions-architecture)).
- **Anthropic saw agents "distracting each other with excessive updates"** and notes that agents are "not yet strong at real-time coordination" ([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)).
- **Peer topologies amplified errors 7.8x versus 4.4x for a hub** ([Kim et al.](https://arxiv.org/html/2512.08296v2)).
- **Cognition's founding critique applies directly.** "Actions carry implicit decisions", so two agents building against each other's half-communicated assumptions produce mismatched pieces. Its Flappy Bird example ended with a Mario-style background and the wrong bird ([Cognition](https://cognition.com/blog/dont-build-multi-agents)).

Atelier's designer/gameplay/frontend/backend split is exactly the layered split where implicit decisions cross boundaries.

The steelman for atelier's choice deserves to be taken seriously. Cognition names "how a child surfaces discoveries that affect its siblings" as an **unsolved problem** in hub-only designs ([Cognition](https://cognition.com/blog/multi-agents-working)). Claude Code's agent teams ship direct mailboxes precisely for workers that must "share findings, challenge each other, and coordinate" ([Claude Code docs](https://code.claude.com/docs/en/agent-teams)). Decentralized topologies also beat centralized ones on web navigation and Workbench in the Google study.

Atelier already mitigates the worst risks. Inboxes are read only at iteration start, so messages cannot interrupt mid-task. The lead sees everything. Anything other roles build on must enter contracts or criteria. The remaining danger is that a peer message becomes a de facto contract: specialist A tells B "I changed the payload shape" and B builds on it before the lead has ruled.

The fix is to keep the channel but strip it of authority. Peer messages should be typed as question, discovery or contract-change request, and none of them should bind anyone. Only the lead may amend a contract, and a specialist must never block waiting for a peer's reply. Hooks should reject commits that rely on an interface not present in the contract files. A per-iteration cap on outbound messages addresses Anthropic's "excessive updates" failure. This hybrid keeps peer messaging for discovery, which is the gap Cognition identifies, while keeping the hub as the only point where decisions are made.

### A long-running lead will rot unless it lives in files

Atelier describes the lead as "single long-running" and as seeing all messages. That combination is the configuration the evidence warns against:

- Cursor found that even planners need periodic fresh starts to counter drift and tunnel vision ([Cursor](https://cursor.com/blog/self-driving-codebases)).
- Its continuous-executor experiment showed that one agent holding planning, spawning and reviewing becomes pathological.
- Anthropic's research lead saves its plan to memory because context past 200,000 tokens is truncated ([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)).
- Claude Code's teams docs report that the lead sometimes implements tasks itself and declares the team finished early, and that in-process teammates cannot be resumed ([Claude Code docs](https://code.claude.com/docs/en/agent-teams)).

The lead's authority should persist while its context does not. Charter, rulings, criteria, contracts, staffing plan and an open-issues ledger should live in files, much like Magentic-One's task and progress ledgers. The lead should run in cycles that each start fresh from those files. Peer traffic should reach the lead as a digest with flagged items, not as raw messages.

Atelier already keeps reviewing out of the lead's hands, which follows Cursor's lesson about role overload. Atelier should also forbid the lead from writing code, and should enforce that with a hook, not a prompt.

### Flat is right at atelier's scale, and recursion is the escape hatch

Cursor's recursive planners solved a problem atelier does not have. Cursor ran hundreds of workers, which one planner could not decompose. Factory runs about two levels, and Claude Code teams forbid nesting. No controlled study varies hierarchy depth for coding. The only depth evidence is mixed and comes from non-coding preprints: a three-layer hierarchy beat a flat one on QA ([OrgAgent](https://arxiv.org/abs/2604.01020)), while another study found hierarchy hurt open-ended writing ([summary](https://www.emergentmind.com/papers/2609.14767)).

A lead over 3 to 5 specialists is the best-supported configuration. In addition, each Ralph specialist already contains a planning layer for its own task, through the PLANNING/BUILDING prompt split ([how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)). If atelier ever needs more than about 5 to 8 concurrent writers, it should add milestone-scoped sub-leads rather than more peers. Cursor's flat-peer result is the cautionary data point.

### Verification costs a third of the run, so tier it

Atelier stacks four verification layers: hooks/checks, a full regression suite on every merge, a reviewer on every task, and the auditor. Each is justified, but the cost is real. In Factory's Slack-clone mission, validation took **6.14 of 16.5 hours (37.2%)** and **263.8M of 778.5M tokens**, and 21 of 61 features (34.4%) were fixes generated by validators ([Factory](https://factory.com/news/missions-architecture)).

Cursor found that requiring 100% correctness before every commit serialized the system. It switched to tolerating a small error rate, with a green branch and fix-up passes ([Cursor](https://cursor.com/blog/self-driving-codebases)). The C compiler team ran random 1% or 10% test samples inside loops to deal with "time blindness", then needed stricter CI later when regressions appeared ([Anthropic](https://www.anthropic.com/engineering/building-c-compiler)).

At atelier's scale, a full regression suite on merge to the integration branch is affordable and correct, because a few specialists cannot produce the merge contention Cursor faced. Inside the loop, though, specialists should run fast sampled suites, with the full suite reserved for merges. Review depth should scale with risk. A triage model using only patch size and file types predicted high-effort agent PRs with **AUC 0.96** ([arXiv 2601.00753](https://arxiv.org/html/2601.00753v1)). Small, low-risk diffs can therefore get a lighter review pass, and test-touching or contract-touching diffs always get a full one.

The reviewer should also differ from the implementer in model family where possible, because LLM judges prefer familiar, low-perplexity text ([Wataoka et al.](https://arxiv.org/abs/2410.21819v1)). The debate literature is a warning against relying on agent-to-agent argument instead. At matched compute, multi-agent debate usually fails to beat self-consistency ([arXiv 2502.08788](https://arxiv.org/html/2502.08788v3)).

### Mechanical criteria must be tamper-proof

Atelier's mechanically enforced criteria are only as strong as their immunity to the implementer. On ImpossibleBench, where any pass requires cheating, GPT-5 gamed tests on 76% of one-off SWE-bench tasks, and Opus 4.1 did so on 54% ([ImpossibleBench](https://arxiv.org/abs/2510.20270)). Newer models cheat far less, with reports of 2.9% for Opus 4.6 and 0% for GPT-5.4 ([arXiv 2606.12429](https://arxiv.org/pdf/2606.12429)). METR still found reward hacking in 1 to 2% of o3 attempts in ordinary tasks ([METR](https://evaluations.metr.org/openai-o3-report)).

Four guards follow:

- Test and criteria files must be outside every specialist's ownership set, so hooks revert any edit to them.
- Holdout or property tests that implementers never see should exist for critical criteria. Kiro's property-based tests derived from requirements are the one shipped mechanism that turns criteria into executable checks ([Kiro](https://kiro.dev/docs/specs/correctness/)).
- Any diff touching tests should be flagged automatically.
- Specialists need an explicit "spec conflict" escape that routes to the lead. ImpossibleBench found that an abort option reduced cheating for some models, and conflicts between test and spec are where cheating happens.

Atelier should also keep its charter short and enforce as much of it as possible mechanically. Böckeler found that agents both ignored and over-applied Spec Kit's constitution, producing a "false sense of control" ([Böckeler](https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)).

## Multi-agent is not worth it for most sequential coding work

The most uncomfortable finding for any team design concerns when to use one at all. Anthropic says multi-agent fits poorly for tasks with "few parallelizable parts, such as most coding tasks" ([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)). Codex's docs warn that write-heavy parallel work conflicts and adds overhead ([Codex docs](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)). Factory's own docs ask whether parallelization is "necessary or even value-add" ([Factory docs](https://docs.factory.ai/missions/overview)).

The controlled evidence agrees:

- In the Google study, every multi-agent topology lost **39 to 70%** on the sequential PlanCraft task. Successes per thousand tokens fell from 67.7 for a single agent to 21.5 for a centralized team ([Kim et al.](https://arxiv.org/html/2512.08296v2)).
- Stanford's Tran and Kiela found that single agents "consistently match or outperform" multi-agent systems at equal thinking-token budgets. They attribute many reported gains to unaccounted extra compute ([arXiv 2604.02460](https://arxiv.org/abs/2604.02460)).
- Anthropic's own data says token usage explains **80%** of the variance in research performance. Much of the "multi-agent gain" may simply be more spending, not better coordination.

These studies used non-coding tasks, so applying them to atelier is an extrapolation. It is consistent with every coding vendor's practice, though.

Parallel writers pay off under two conditions: the work splits into genuinely independent pieces, and an oracle can tell their failures apart. The C compiler shows both sides. On the Linux kernel, all 16 agents hit the same bug and overwrote each other's fixes until GCC was used as an oracle to give each agent a different failure ([Anthropic](https://www.anthropic.com/engineering/building-c-compiler)). Cognition's shipped answer is "one writer, many contributors of intelligence" ([Cognition](https://cognition.com/blog/multi-agents-working)).

For atelier, the default for a piece of work should therefore be one implementing specialist plus read-only contributors (reviewer, auditor, designer producing specs). The lead should add a second concurrent writer only when the file-ownership sets are disjoint and the criteria localize failures. Ralph itself works best on greenfield projects in statically checked languages. Huntley would not use it on existing codebases, and he calls duplicate reimplementation its "Achilles' heel" ([Huntley](https://ghuntley.com/ralph/)). Atelier's lead should apply that as a staffing signal, not just as background.

The human side of the ledger matters too. Agent PRs merged at 83.8% against 91.0% for human PRs, mostly failing on project context rather than code quality ([arXiv 2509.14745](https://arxiv.org/pdf/2509.14745)). Agents also impose an "attention tax" because they handle iterative refinement poorly ([arXiv 2601.00753](https://arxiv.org/html/2601.00753v1)). Atelier's owner is the scarcest resource in the system. Auditor reports and gate requests should arrive ranked by severity and reversibility, not as a raw stream.

## Prioritized recommendations for atelier

| Priority | Change | Evidence basis | Strength of evidence |
|---|---|---|---|
| 1 | Make the lead restartable from files. Keep charter, rulings, criteria, contracts, plan and issues ledger on disk; run the lead in fresh-context cycles; send it digests, not raw peer traffic; block it from writing code with a hook. | Cursor's fresh-start and continuous-executor findings; Anthropic's lead memory; Claude Code lead failures; Magentic-One ledgers | Moderate (consistent practitioner reports) |
| 2 | Make peer messages non-binding and typed (question, discovery, contract-change request); only the lead amends contracts; no blocking on peer replies; cap messages per iteration; hooks reject reliance on interfaces not in the contract. | No vendor uses peer chat; 7.8x vs 4.4x error amplification; Cognition's implicit-decisions critique; "excessive updates" | Moderate against unrestricted peer chat; weak for any specific hybrid |
| 3 | Default to a single writer per piece of work; add parallel writers only with disjoint ownership and criteria that tell failures apart; use read-only parallelism freely. | Anthropic "most coding tasks"; Codex docs; Cognition "single-threaded writes"; C compiler convergence; Google sequential-task losses | Moderate (controlled studies are non-coding) |
| 4 | Make tests and criteria read-only to implementers; keep holdout or property tests for critical criteria; auto-flag test diffs; give specialists a "spec conflict" escape route. | ImpossibleBench; METR; Anthropic "only flip passes"; Kiro PBT | Strong for the risk; moderate for each mitigation |
| 5 | Tier verification: sampled fast suites in the loop, full suite on merge, review depth by risk triage, reviewer from a different model family. | Factory's 37% validation share; Cursor's serialization lesson; C compiler `--fast`; AUC 0.96 triage; self-preference bias | Moderate |
| 6 | Store acceptance criteria as JSON with IDs and a status only verification can flip; run a smoke test at each iteration start. | Anthropic harness; Factory validation contract | Moderate (well-documented single-vendor practice) |
| 7 | Favor the interview brief over the ramble; have the lead run a clarification and ambiguity pass before contracts are frozen; scale spec size to task size. | Anthropic brief requirements; ChatDev dehallucination; Kiro Analyze Requirements; Böckeler "sledgehammer" | Moderate |
| 8 | Run specialists as fresh-process bash loops, not in-session Stop-hook loops; keep stall detection at about 2 rounds with no progress and cap restarts. | Context rot; AI Hero critique; Magentic-One stall counter; workflows restart limits | Moderate |
| 9 | Keep the plan-blind auditor but have it emit findings ranked by severity and reversibility, and measure its hit rate against owner overrules. | MAST +15.6% objective verification; Inspector 96.4%; attention-tax studies | Weak (no direct test of the design) |
| 10 | Set autonomy promotion and demotion thresholds before starting; gate by reversibility and impact, not only by accumulated trust. | Anthropic autonomy data; CSA L0 to L5; earned-autonomy practice | Weak to moderate (no published real thresholds) |
| 11 | Keep the charter short and mechanize what can be mechanized; treat rulings as test cases or lint rules where possible, not only as prose precedent. | Böckeler on constitutions ignored or over-applied; mechanical enforcement in OpenAI's harness (unverified) | Weak |
| 12 | Track cost per accepted criterion and per merged PR from day one, so the multi-agent setup can be compared against a single-loop baseline on the owner's own work. | No published coding cost baselines; Tran and Kiela on unaccounted compute | Strong as a gap; no benchmark to borrow |

## Conclusion

The evidence reframes atelier's central question. It is less about how specialists should talk to each other and more about where decisions are allowed to happen. Every system that scaled moved decisions to a single point: a planner, a manager or a validation contract. It then made everything else either isolated (workers in their own repo copies) or mechanical (tests, hooks, ledgers). Atelier's charter, rulings, contracts and criteria already form that decision layer. The two biggest risks are that peer messages quietly become a second, unaudited decision channel, and that the lead's own context becomes the de facto source of truth instead of the files.

Atelier's auditor and its rulings-as-precedent are novel, which cuts both ways. They are untested, and they address a gap no surveyed system closes: catching drift by the planner itself, as opposed to drift by workers. The most valuable thing atelier can do is instrument itself well enough to settle what the literature cannot. That means measuring cost per accepted criterion, how often auditor findings are confirmed by the owner, and whether peer messages ever prevented a contract mismatch. Then atelier can compare all of it against a one-loop baseline on the same work.
