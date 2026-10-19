# Academic Multi-Agent Software Engineering Frameworks and Empirical Studies of Multi-Agent LLM Effectiveness and Failure

(Researched 2026-10-19. Publication dates are given for each source. Numbers are as reported by the primary paper unless noted. Note that MetaGPT and ChatDev each report results that favor themselves over the other; see Q2.)

## Q1: What does the evidence say about centralized (hub) vs decentralized (peer-to-peer) communication, and about hierarchy depth?

### Takeaway
The largest controlled study (Google Research/DeepMind/MIT, Dec 2025) finds that a central orchestrator contains error propagation best (4.4x amplification vs 17.2x for independent agents and 7.8x for decentralized). However, every multi-agent topology costs 2.6-5x more tokens than a single agent at matched reasoning budgets and gains nothing on average once the single agent passes about 45% accuracy. Sequential tasks get worse under every multi-agent topology. Hierarchy (a top-level agent that aggregates and checks) is the most robust to faulty agents. I found no study that varies hierarchy depth (number of layers) cleanly.

### Cited Findings
**"Towards a Science of Scaling Agent Systems" (Kim et al., Google Research / Google DeepMind / MIT; arXiv 2512.08296, v2 dated 17 Dec 2025)**
- Compares a single-agent system (SAS) with four multi-agent systems (MAS): Independent (parallel, no communication, results aggregated at the end), Centralized (hub-and-spoke orchestrator), Decentralized (peer-to-peer) and Hybrid. Covers 180 configurations on Finance-Agent, BrowseComp-Plus, PlanCraft and Workbench. **No coding/SWE benchmark is included.** — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2); [Google Research blog](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)
- Error amplification relative to SAS (=1.0): Independent 17.2x, Decentralized 7.8x, Hybrid 5.1x, Centralized 4.4x. — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2)
- MIT Media Lab's summary credits the orchestrator acting as a "validation bottleneck" that catches errors before they propagate. — [MIT Media Lab](https://www.media.mit.edu/projects/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/overview/)
- Change in performance vs SAS:
  - Finance-Agent (parallelizable): Centralized +80.8%, Decentralized +74.5%, Hybrid +73.1%.
  - Workbench: Centralized -1.2%, Decentralized +5.7%, Hybrid -1.2%.
  - BrowseComp-Plus: Centralized +0.2%, Decentralized +9.2%, Independent about -35%.
  - PlanCraft (sequential): Independent -70.1%, Centralized -50.3%, Decentralized -41.5%, Hybrid -39.1%.
  - Source: [arXiv HTML v2](https://arxiv.org/html/2512.08296v2). (v1 and HuggingFace report the Finance gain as 80.9%: [HF](https://huggingface.co/papers/2512.08296).)
- **Decentralized beat centralized on web navigation and Workbench. Centralized beat decentralized on Finance-Agent and had lower error amplification.** — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2)
- Capability saturation: coordination gives diminishing or negative returns once SAS baselines exceed about 45% accuracy (interaction β = -0.404, p<0.001). Tool-coordination tradeoff: β = -0.267 (p<0.001), meaning tool-heavy tasks are hurt most by MAS overhead. — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2)
- The predictive model reaches cross-validated R² = 0.524 (0.513 in v1) and picks the best architecture for 87% of held-out configurations. Out-of-sample on GPT-5.2 it has MAE 0.071. — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2)

**Faulty-agent resilience (Huang et al., "On the Resilience of LLM-Based Multi-Agent Collaboration with Faulty Agents", arXiv 2408.00989, Aug 2024; ICML 2025)**
- Compares linear, flat and hierarchical structures with injected faulty agents. Hierarchical had the smallest performance drop (5.5%), against 10.5% and 23.7% for the other two structures. The authors attribute this to the top-level agent seeing several versions of each sub-task answer. A "Challenger" mechanism and an "Inspector" reviewer recovered up to 96.4% of the errors made by faulty agents. — [arXiv PDF](https://arxiv.org/pdf/2408.00989); [ICML 2025](https://icml.cc/virtual/2025/poster/44721) (per search snippet; full text not fetched)

**Hierarchy, 2026 preprints (mixed results)**
- OrgAgent (Wang et al., arXiv 2604.01020, 1 Apr 2026) uses a 3-layer company-style hierarchy: governance (planning and resource allocation), execution (task solving and review) and compliance (final answer control). On SQuAD 2.0 with GPT-OSS-120B it beat a flat MAS by 102.73% and used 74.52% fewer tokens. The tasks are reasoning/QA, not coding. — [arXiv abs](https://arxiv.org/abs/2604.01020)
- A paired experiment on open-ended writing (arXiv 2609.14767) reportedly found that hierarchical coordination with loop-back authority reduced utility and clarity, increased hedging and raised cost compared with flat coordination. — [EmergentMind summary](https://www.emergentmind.com/papers/2609.14767) (secondary; not verified against the full text)

**Topology at scale: MacNet (Qian et al., "Scaling Large-Language-Model-based Multi-Agent Collaboration", arXiv 2406.07155, Jun 2024; ICLR 2025)**
- Agents are organized as directed acyclic graphs, with collaboration among "over a thousand agents". Performance follows a logistic growth curve as agents are added ("collaborative scaling law"), and **irregular topologies outperform regular ones**. — [arXiv abs](https://arxiv.org/abs/2406.07155)

**Magentic-One (Microsoft, arXiv 2411.04468, 7 Nov 2024): centralized hub example**
- On the GAIA validation set, replacing the ledger-based Orchestrator with a simple orchestrator cut performance by about 31%. Removing any single worker cut it by about 21% (Coder, ComputerTerminal) to 39% (FileSurfer). — [arXiv HTML](https://arxiv.org/html/2411.04468)

### Inferences
- For coding, which is mostly sequential and tool-heavy (edit, run, test), the Google study's PlanCraft and tool-coordination results suggest a default of a single agent, or a centralized orchestrator with few workers, rather than peer-to-peer meshes. That study did not test coding, so this is an extrapolation.
- Centralized topologies seem to win on error containment, while decentralized ones win on some exploratory/search tasks. The deciding factor is task decomposability, not topology alone.
- The hierarchy evidence supports one aggregating/verifying layer above workers. There is no clean evidence that deeper hierarchies (3 or more layers) help coding.

### Gaps
- No controlled study found that varies hierarchy depth while holding everything else fixed.
- I could not get MacNet's per-topology numbers (chain/tree/mesh/star) from the abstract page.
- The 2026 hierarchy preprints (2609.14767, 2608.00028) were seen only via snippets or summaries.

## Q2: Which interventions measurably improve multi-agent reliability (verification steps, structured artifacts, role specs, termination conditions)?

### Takeaway
The best-measured interventions are executable verification (tests run in a loop), structured intermediate artifacts in place of free chat, explicit role specs and authority (who has the final say), and a planner that tracks progress with stall detection and replanning. Effects are real but modest, roughly +4 to +16 points. MAST's authors say these tactical fixes are inconsistent and that "task completion rates still remain low".

### Cited Findings
**MAST intervention case studies (Cemri et al., arXiv 2503.13657, Mar 2025, rev. v3 26 Oct 2025)**
- ChatDev: making the CEO have the final say (addresses FM-1.2, disobeying role specification) gave **+9.4%** task success with GPT-4o and the same user prompt. — [arXiv HTML](https://arxiv.org/html/2503.13657)
- ChatDev: adding a high-level task-objective verification step gave **+15.6%** on ProgramDev, the largest gain reported. — [arXiv HTML](https://arxiv.org/html/2503.13657)
- AG2/MathChat interventions (prompt improvements, topology change) are reported in Appendix H, Table 5, which I could not retrieve. — [arXiv HTML](https://arxiv.org/html/2503.13657)
- The authors conclude that "MAS failure is not merely a function of challenges in the underlying model", that verification is often superficial (they call for multi-level verification), and that tactical fixes give inconsistent gains. — [arXiv HTML](https://arxiv.org/html/2503.13657)

**MetaGPT (Hong et al., arXiv 2308.00352, Aug 2023, v7 Nov 2024; ICLR 2024 oral per the ICLR slides): SOPs and structured artifacts**
- Roles: Product Manager, Architect, Project Manager, Engineer, QA Engineer. SOPs are encoded into prompt sequences in an assembly-line style. Agents exchange structured documents (PRD, system design with file lists, data structures and interface definitions, sequence flow diagrams) rather than free chat. — [arXiv HTML v7](https://arxiv.org/html/2308.00352v7)
- Communication uses a shared message pool with publish-subscribe. Agents subscribe according to their role profiles and act only once all prerequisite inputs have arrived. — [arXiv HTML v7](https://arxiv.org/html/2308.00352v7)
- Executable feedback: the Engineer writes and runs unit tests and debugs until they pass or 3 retries are used. Removing this costs 4.2 points on HumanEval and 5.4 on MBPP. The full system scores 85.9% / 87.7% Pass@1. — [arXiv HTML v7](https://arxiv.org/html/2308.00352v7)
- Role ablation: Engineer-only produced 83 lines, needed 10 human revisions and scored executability 1.0. The full role set produced 191 lines, 2.5 revisions and executability 4.0. Adding roles improved results at higher cost. — [arXiv HTML v7](https://arxiv.org/html/2308.00352v7)
- Executable feedback raised executability from 3.67 to 3.75 and cut human revision cost from 2.25 to 0.83. — [arXiv HTML v7](https://arxiv.org/html/2308.00352v7); [ICLR 2024 slides](https://iclr.cc/media/iclr-2024/Slides/18491.pdf)

**ChatDev (Qian et al., arXiv 2307.07924, v5 5 Jun 2024; ACL 2024 per common citation, not confirmed on the fetched page)**
- Roles: CEO, CTO, programmer, reviewer, tester. A "chat chain" runs Design, then Coding (writing and completion), then Testing (static code review and dynamic system testing). Each subtask is a two-agent instructor/assistant dialogue. — [arXiv HTML](https://arxiv.org/html/2307.07924)
- "Communicative dehallucination": before answering, the assistant behaves like an instructor and proactively asks for more specific information. Removing it drops Quality from 0.3953 to 0.3094. Removing all role prompts drops it to 0.2212, the largest effect in their ablation. — [arXiv HTML](https://arxiv.org/html/2307.07924)
- State handling: short-term memory holds dialogue within a phase. Long-term memory passes only the previous phases' **solutions** forward, not the full transcripts. — [arXiv HTML](https://arxiv.org/html/2307.07924)
- Later lineage:
  - Experiential Co-Learning (arXiv 2312.17025, Dec 2023) adds co-tracking, co-memorizing ("shortcuts" extracted from past trajectories) and co-reasoning. — [arXiv PDF](https://arxiv.org/pdf/2312.17025)
  - Iterative Experience Refinement (arXiv 2405.04219, May 2024): the successive pattern can give better results, while the cumulative pattern is more stable. — [arXiv PDF](https://arxiv.org/pdf/2405.04219)
  - MacNet (see Q1).
  - ChatDev 2.0 "DevAll", a zero-code multi-agent orchestration platform, was released 7 Jan 2026 per the repo changelog (seen via a mirror). — [GitHub mirror](https://pycoder42--f92f31dc3d1611f189e242b51c65c3df.web.val.run/https://github.com/OpenBMB/ChatDev)

**Magentic-One (Fourney et al., Microsoft, arXiv 2411.04468, Nov 2024): ledgers and replanning**
- Agents: an Orchestrator plus WebSurfer, FileSurfer (read-only), Coder and ComputerTerminal (deterministic code/shell execution). Built on AutoGen 0.4. Default model is GPT-4o, with a variant that uses o1-preview for the Orchestrator outer loop and the Coder. — [arXiv HTML](https://arxiv.org/html/2411.04468)
- Outer loop, the **Task Ledger**: given/verified facts, facts to look up, facts to derive, educated guesses, and the plan (treated as a rough guide). **All agents reset their contexts after each plan update.** — [arXiv HTML](https://arxiv.org/html/2411.04468)
- Inner loop, the **Progress Ledger**, answered at each step: is the task complete? are we looping? is progress being made? which agent speaks next? what instruction should it get? A stall counter above a threshold (≤2 in experiments) triggers reflection, ledger revision and replanning. Termination is by completion, maximum attempts or time limit, with a best-guess answer at the end. — [arXiv HTML](https://arxiv.org/html/2411.04468)
- Results (test sets):
  - GAIA: 32.33±5.3% (GPT-4o), 38.00±5.5% (with o1).
  - AssistantBench accuracy: 25.3% / 27.7%.
  - WebArena: 32.8±3.2% (validation 35.1%, test 30.5%).
  - The o1 variant refused 26% of WebArena GitLab tasks.
  - Source: [arXiv HTML](https://arxiv.org/html/2411.04468)

**AgentCoder (Huang et al., arXiv 2312.13010, Dec 2023, v3 May 2024): separate test-designer agent**
- Three agents: a programmer, a test designer (writes tests independently of the code) and a test executor (runs the tests and feeds results back). With GPT-4 it scores 96.3% HumanEval and 91.8% MBPP Pass@1, against a prior state of the art of 90.2% and 78.9%. — [arXiv abs](https://arxiv.org/abs/2312.13010)

**Debate as an intervention: weak evidence**
- arXiv 2502.08788 (Feb 2025; titled "If Multi-Agent Debate is the Answer, What is the Question?" in v2 and "Stop Overvaluing Multi-Agent Debate" in v3) tested 5 multi-agent debate (MAD) methods on 9 benchmarks with 4 models. MAD often fails to beat chain-of-thought (CoT) and self-consistency, and does worse against self-consistency at matched calls or tokens. Model heterogeneity is the proposed fix. — [arXiv abs](https://arxiv.org/abs/2502.08788v2); [arXiv HTML v3](https://arxiv.org/html/2502.08788v3)
- Smit et al. (ICML 2024): MAD "do[es] not reliably outperform" self-consistency or ensembling, though some MAD methods (e.g., Multi-Persona) improve with tuning. — [PMLR](https://proceedings.mlr.press/v235/smit24a.html)
- Huang et al. (ICLR 2024): at an equal number of responses, debate significantly underperformed self-consistency with majority voting. — [arXiv 2310.01798](https://arxiv.org/pdf/2310.01798)
- "More Agents Is All You Need" (Tencent, arXiv 2402.05120, Feb 2024): plain sampling plus majority voting scales with agent count, and the gains correlate with task difficulty. — [arXiv PDF](https://arxiv.org/pdf/2402.05120)

### Inferences
- Gated, executable verification is the most consistently measured win: MetaGPT's test loop, AgentCoder's independent test designer, and MAST's +15.6% from objective-level verification.
- Structured artifacts plus "solutions-only" context hand-off (ChatDev long-term memory, Magentic-One context reset on replan, MetaGPT documents) are the recurring way these systems manage state and limit context bloat.
- Clear authority and termination rules address the largest MAST category (system design, about 44%). Debate is not a reliable reliability mechanism. Its gains mostly reduce to sampling-and-voting.

### Gaps
- MAST's AG2/MathChat intervention numbers (Table 5) were not retrieved.
- No DevAll/ChatDev 2.0 benchmark results were found.
- There are no head-to-head ablations of termination-condition fixes alone.

## Q3: What are the measured token/cost overheads of multi-agent vs single-agent setups for coding?

### Takeaway
Multi-agent coding systems typically use 2-13x more tokens than single calls. At matched reasoning budgets, multi-agent variants used 58-515% more tokens and delivered fewer successes per token (21.5 vs 67.7 per 1K tokens for centralized vs single). Some well-designed multi-agent coders (AgentCoder) are cheaper than older multi-agent baselines while scoring higher, so the comparison depends heavily on the baseline.

### Cited Findings
- Google scaling study, with all systems at about 4,800 reasoning tokens per trial — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2):

  | Metric | SAS | Independent | Decentralized | Centralized | Hybrid |
  |---|---|---|---|---|---|
  | Success rate | 0.466 | 0.370 | 0.477 | 0.463 | 0.452 |
  | Turns | 7.2 | 11.4 | 26.1 | 27.7 | 44.3 |
  | Token overhead | 0% | +58% | +263% | +285% | +515% |
  | Success per 1K tokens | 67.7 | 42.4 | 23.9 | 21.5 | 13.6 |

  These are non-coding tasks.
- Tran & Kiela (Stanford, arXiv 2604.02460, Apr 2026): with thinking tokens held constant, single agents "consistently match or outperform MAS" on multi-hop reasoning across Qwen3, DeepSeek-R1-Distill-Llama and Gemini 2.5. They attribute many reported MAS gains to unaccounted computation and context effects, and they found API budget-control artifacts (notably in Gemini 2.5) that inflate MAS gains. — [arXiv abs](https://arxiv.org/abs/2604.02460)
- MetaGPT vs ChatDev on SoftwareDev (MetaGPT's Table 1) — [arXiv HTML v7](https://arxiv.org/html/2308.00352v7):

  | System | Tokens | Time | Lines | Tokens/line | Executability | Human revisions |
  |---|---|---|---|---|---|---|
  | ChatDev | 19,292 | 762 s | 77.5 | 248.9 | 2.25 | 2.5 |
  | MetaGPT w/o feedback | 24,613 | 503 s | 194.6 | 126.5 | 3.67 | 2.25 |
  | MetaGPT | 31,255 | 541 s | 251.4 | 124.3 | 3.75 | 0.83 |

- **Conflicting evidence:** ChatDev's own paper reports the reverse — [arXiv HTML](https://arxiv.org/html/2307.07924):

  | System | Executability | Quality | Time | Tokens |
  |---|---|---|---|---|
  | ChatDev | 0.88 | 0.3953 | ~148 s | ~22,949 |
  | MetaGPT | 0.4145 | 0.1523 | 154 s | ~29,279 |
  | GPT-Engineer (single-pass) | 0.3583 | 0.1419 | 15.6 s | ~7,183 |

  The two papers use different benchmarks and metrics, and each favors its own system.
- AgentCoder (GPT-4) used 56.9K (HumanEval) and 66.3K (MBPP) tokens, against 138.2K and 206.5K for the prior multi-agent state of the art. — [arXiv abs](https://arxiv.org/abs/2312.13010)
- AdaCoder used 2.00x and 2.42x the tokens of the base LLMs on HumanEval and MBPP. A ParEval cost table showed multi-agent methods (Reflexion, MapCoder, MoA) at about 8-13x the tokens of a single Qwen14B call (estimated costs). — [arXiv 2504.04220](https://arxiv.org/pdf/2504.04220) (per search summary)
- AgentTaxo (ICLR 2025 workshop): multi-agent overhead comes from repeated LLM calls, and duplicated tokens are a major contributor. — [MLAnthology](https://mlanthology.org/iclrw/2025/wang2025iclrw-agenttaxo)
- Magentic-One: most tasks need dozens of LLM calls, estimated at several US dollars and tens of minutes per task, which the authors call a significant limitation. — [arXiv HTML](https://arxiv.org/html/2411.04468)

### Inferences
- The fair comparison is at matched compute. On that basis, single agents are usually as good or better unless the task is parallelizable or the single agent's context is degraded. Tran & Kiela predict MAS become competitive in exactly those cases.
- Token/line and executability gains in MetaGPT vs ChatDev come from structure (documents, tests), not from adding agents per se. Much of the overhead is duplicated context.

### Gaps
- I found no controlled 2025-2026 study comparing single- vs multi-agent setups on a realistic coding benchmark such as SWE-bench at matched token budgets. The Google and Stanford studies use non-coding tasks.
- The AdaCoder and ParEval figures come from search summaries, not full-text verification.

## Q4: What failure modes are most common, and how are they mitigated?

### Takeaway
MAST (1,642 traces, 7 frameworks) finds failures spread across system design (about 44%), inter-agent misalignment (about 32%) and verification (about 24%). The top individual modes are step repetition (15.7%), reasoning-action mismatch (13.2%), unawareness of termination conditions (12.4%) and disobeying the task spec (11.8%). Failure rates range from 41% to 86.7% across open-source MAS. Magentic-One's own error analysis similarly highlights inefficient repeated actions and insufficient verification.

### Cited Findings
- MAST basics: 1,642 annotated traces across MetaGPT, ChatDev, HyperAgent, AppWorld, AG2 (MathChat), Magentic-One and OpenManus. The introduction reports failure rates of 41% to 86.7%. Inter-annotator agreement is Cohen's κ = 0.88 for human experts. The LLM annotator (o1, few-shot) reaches κ = 0.77 and 94% accuracy, and κ = 0.79 on unseen MAS and benchmarks. — [arXiv HTML](https://arxiv.org/html/2503.13657)
- MAST prevalence by mode — [arXiv HTML](https://arxiv.org/html/2503.13657):

  | Category | Mode | Prevalence |
  |---|---|---|
  | FC1 System design (sum ≈44.2%) | FM-1.1 Disobey task spec | 11.8% |
  | | FM-1.2 Disobey role spec | 1.5% |
  | | FM-1.3 Step repetition | 15.7% |
  | | FM-1.4 Loss of conversation history | 2.8% |
  | | FM-1.5 Unaware of termination conditions | 12.4% |
  | FC2 Inter-agent misalignment (sum ≈32.4%) | FM-2.1 Conversation reset | 2.2% |
  | | FM-2.2 Fail to ask for clarification | 6.8% |
  | | FM-2.3 Task derailment | 7.4% |
  | | FM-2.4 Information withholding | 0.85% |
  | | FM-2.5 Ignored other agent's input | 1.9% |
  | | FM-2.6 Reasoning-action mismatch | 13.2% |
  | FC3 Task verification (sum ≈23.5%) | FM-3.1 Premature termination | 6.2% |
  | | FM-3.2 No/incomplete verification | 8.2% |
  | | FM-3.3 Incorrect verification | 9.1% |

  The category sums are computed from the mode percentages; the paper does not state them directly.
- MAST says FC2 failures likely require deeper "social reasoning" that context or protocol fixes alone may not solve. — [arXiv HTML](https://arxiv.org/html/2503.13657)
- Magentic-One's most common errors were persistent inefficient actions, insufficient verification steps and inefficient navigation attempts, followed by underutilized resources. The mitigations built in are the stall counter, replanning and context reset. — [arXiv HTML](https://arxiv.org/html/2411.04468)
- Google study: independent agents amplify errors 17.2x versus 4.4x for a centralized orchestrator. The mitigation is a validation checkpoint at the hub. — [arXiv HTML v2](https://arxiv.org/html/2512.08296v2)
- Faulty-agent study: hierarchy, plus Challenger and Inspector mechanisms, recovered up to 96.4% of errors. — [arXiv 2408.00989](https://arxiv.org/pdf/2408.00989)
- ChatDev limitations: low information density and simple logic, sensitivity to vague requirements, higher token and time cost; best suited to prototypes. — [arXiv HTML](https://arxiv.org/html/2307.07924)

### Inferences
Mitigations map to failure modes as follows:
- **Step repetition and termination issues (about 28% combined):** progress ledger with stall detection, explicit stop criteria, max-iteration caps (Magentic-One, MetaGPT's 3 retries).
- **Spec/role disobedience:** clear role authority (ChatDev's CEO final say, +9.4%) and structured specs (MetaGPT PRD/design docs).
- **Verification failures (about 24%):** executable tests and independent test authorship (AgentCoder) or an objective-level verifier (+15.6%).
- **Clarification failures:** ChatDev-style communicative dehallucination.
- **Reasoning-action mismatch:** no strong measured fix was found.

### Gaps
- Per-framework MAST prevalence breakdowns, for example coding-specific systems (ChatDev, MetaGPT, HyperAgent) vs others, were not extracted.
- Quantified effect sizes for termination-condition fixes alone were not found.
