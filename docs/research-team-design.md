# What makes a good agent team: research notes for atelier

This note collects what the evidence says about multi-agent team structure and role prompts, and what each finding changes in atelier. Sources are listed at the end.

## 1. Split along seams, or don't split

- Anthropic's multi-agent research system works because research is wide and parallel. The authors warn that most coding tasks have fewer truly parallelizable parts than research. Multi-agent setups also use about 15× the tokens of a chat, so the task has to be worth it. [1]
- Cognition's counterpoint: *actions carry implicit decisions*. Two agents working in parallel make conflicting assumptions. In their Flappy Bird example, one built a Mario-style background and another built a bird that didn't match it, and the agent combining them couldn't reconcile the two. [2]
- Team Topologies treats cognitive load as the reason to split at all. Its default unit is a stream-aligned team that can ship a change end to end without waiting on others. Between teams it prefers "X-as-a-Service" (consume what another team provides, with little joint work). It treats collaboration as a temporary, expensive mode for discovery. [6]

**What this means for atelier**
- The default roster is **pair** (builder + reviewer). Use **team** only when the project has real seams: a UI with a design system, an API with a schema, an engine and its gameplay.
- Design and contracts are where the "collaboration" happens. After those gates, specialists consume them as a service, and the frozen documents *are* the shared decisions Cognition says parallel agents lack.
- When a feature crosses a seam that isn't nailed down by a contract, the lead gives the whole vertical slice to one builder rather than splitting it.

## 2. The brief is the main lever

- Anthropic found short task descriptions caused duplicated and misread work. Their lead now gives every subagent an **objective, an output format, guidance on tools and sources, and clear boundaries**, and follows explicit rules for scaling effort to task complexity. Early versions spawned 50 subagents for simple queries. [1]
- In MAST (1,642 annotated traces across 7 frameworks), the largest failure categories were system design (disobeying the task spec 11.8%, step repetition 15.7%, unaware of termination 12.4%) and inter-agent misalignment (task derailment 7.4%, reasoning-action mismatch 13.2%, failing to ask for clarification 6.8%). [3]

**What this means for atelier**
- Every task the lead writes uses a fixed brief: **Objective, Context (relevant decisions plus links to R#, design, contracts), Done means, In and out of scope, Owned files, Hand-off, Budget**.
- The lead follows effort-scaling rules: how many tasks, how big, and when one builder beats a split.
- Termination is explicit and mechanical: `ATELIER_STATUS`, budgets, stall detection.

## 3. Verification is where the gains are

- MAST's most effective intervention was adding a high-level verification step against the task objective (+15.6% task success). Verification failures (premature termination, missing verification, incorrect verification) make up about a quarter of all failures. [3]
- Models tend to rate their own output higher, and reasoning before judging reduces the effect. Separating the grader from the writer is the structural fix. [7]
- Anthropic's evals use an LLM judge with a rubric (accuracy, completeness, source quality, efficiency) and one verdict, and judge end states rather than paths. [1]

**What this means for atelier**
- The reviewer is a separate agent with fresh context. It checks **against the objective first** (the spec and the acceptance criteria), not just the diff.
- Its rubric has a fixed order, and every must-fix needs evidence (a file and line, or a command and its output).
- It checks for gamed checks and for reasoning-action mismatch: do the decisions log and the code agree?
- It may run on a stronger model than the builder (`atelier project role add <alias> reviewer --model opus`).

## 4. Personas don't add skill; process and quality bars do

- On 2,410 factual questions across 4 model families and 162 roles, adding a persona to the system prompt didn't improve accuracy, and the effect of each persona was largely random. [4]
- Anthropic's guidance: a one-sentence role does focus tone and behaviour, but the gains come from explicit instructions, context about *why*, and examples. [5]

**What this means for atelier**
- Each role opens with one sentence of identity. Everything after that is concrete: **what this role is accountable for, how it works step by step, its decision rights, what it hands off, its quality bar, and the failure patterns to avoid**.
- "Senior designer" stops being a label. Each role file spells out what a senior does differently: frames the problem first, designs the system before the screens, writes down the rationale, and handles every state.

## 5. Prompt style for current Claude models

From Anthropic's prompting guide and its context-engineering post: [5] [8]

- Explain the reason behind a rule; Claude generalises from it. Avoid bare "NEVER" in capitals.
- Say what to do, not only what to avoid. Ask explicitly for above-and-beyond quality when you want it.
- Write at the right altitude: heuristics, not brittle if-else logic. Use structured sections and a few canonical examples. Then iterate on failures you've actually seen.
- For long-horizon work: start each fresh context with a fixed routine (read the progress notes, the test status and the git log), make incremental progress, use git as the state, and never edit tests to make them pass.
- Guard against known tendencies:
  - **over-engineering**: keep changes to what was asked
  - **test-fitting**: write general solutions, not ones keyed to specific test inputs
  - **helper scripts and workarounds** instead of standard tools
  - **speculating about code before reading it**
- For frontend work, steer away from "AI slop" defaults: generic fonts, purple gradients, cookie-cutter layouts. Commit to a distinctive direction.

**Seen in our own runs:** a builder edited files through a shell one-liner (`node -e` writing files) instead of the edit tools. That bypassed the ownership hook, and a stray `cat > file` hung the session. The standing orders now say to use the edit tools, with the reason given. The runner now also enforces ownership from the git diff, so a shell edit is reverted anyway.

## 6. The lead keeps ledgers and replans

- Microsoft's Magentic-One orchestrator keeps a task ledger (facts, guesses, plan) and a progress ledger, and replans when progress stalls. [9]
- Anthropic's lead writes its plan to external memory, because its context will be truncated. [1]
- Anthropic's long-running harness: a first session sets up the scaffolding (feature list, progress file, init script), and later sessions each make one verified increment. [10]

**What this means for atelier**
- The lead keeps `atelier/PLAN.md`: the task ledger (facts, assumptions, the task graph with ids) plus a progress section. It reads the plan at the start of every shift and heartbeat.
- When tasks stall or the reviewer bounces the same thing twice, the lead replans: it splits the task, rewrites the brief, or brings it to the owner. It doesn't just extend the budget.

## 7. Communication: little and structured

- Anthropic's agents "distracted each other with excessive updates". [1]
- MetaGPT replaced free chat with structured documents passed between roles, following standard operating procedures (PRD, design, tasks). [11]
- MAST counts information withholding and ignored input as failure modes in their own right. [3]

**What this means for atelier**
- Agents communicate only through documents and request cards, never status chatter.
- A request card must say *what, why, and what done looks like*.
- Decisions that cross a boundary (interfaces, shared UX, anything another role builds on) go to the lead as a request. Local decisions stay "assume and flag".

## Sources

1. Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
2. Cognition, [Don't Build Multi-Agents](https://cognition.com/blog/dont-build-multi-agents)
3. Cemri et al., [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/html/2503.13657v3) (MAST, NeurIPS 2025)
4. Zheng et al., [When "A Helpful Assistant" Is Not Really Helpful: Personas in System Prompts Do Not Improve Performances of LLMs](https://arxiv.org/abs/2311.10054v2) (Findings of EMNLP 2024)
5. Anthropic, [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
6. Martin Fowler, [Team Topologies](https://martinfowler.com/bliki/TeamTopologies.html) (summary of Skelton & Pais)
7. Chen et al., [Do LLM Evaluators Prefer Themselves for a Reason?](https://arxiv.org/abs/2504.03846v3)
8. Anthropic, [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
9. Microsoft Research, Magentic-One (task and progress ledgers), as described in its paper
10. Anthropic, [Effective harnesses for long-running agents](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents)
11. Hong et al., [MetaGPT: Meta Programming for a Multi-Agent Collaborative Framework](https://arxiv.org/pdf/2308.00352v6) (ICLR 2024)
