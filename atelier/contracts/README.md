# Contracts: atelier-ui

Personal-scale project: no separate contracts phase. One builder (frontend) owns both sides of the only interface, the dashboard's own API in `lib/dashboard.mjs`. These rules bind it; the frontend records concrete shapes in `dashboard-api.md` as it builds, and the lead approves changes there.

## Rules
1. **Actions don't change.** `POST /api/action` keeps every existing action name and argument. New actions are not added unless SPEC R1 needs one to keep a current function; a removal needs a lead ruling.
2. **One summary (SPEC R2).** The server computes, in one place, every count and money figure the screens show: items waiting on the owner (total and per project), agents by state (working, waiting, stuck) per project and in all, spend today (tasks, lead, audits) against the daily budget, project totals, per-task spend, and plan headroom (5h and 7d use, reset times, Atelier's ceilings). It is sent with the overview the client already polls. Screens read these figures; they never sum or recount them.
3. **Read endpoints may be added or reshaped** to serve the screens (for example inline content for Inbox items: question text, proof file list, finding text). Each one is listed in `dashboard-api.md` with its shape.
4. **Security unchanged (SPEC R23).** Same login and cookie, `X-Atelier` on every POST, agent text escaped on the client, agent-made pages and evidence served only from the view port.
5. **Compatible while building.** The live dashboard runs from main; branch changes to the server must not be needed by main's client, and the branch's client must run against the branch's server only.
