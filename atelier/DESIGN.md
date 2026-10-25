# Design: Atelier dashboard

Direction B, "one at a time" (ruling R-1). This document covers the production-grade foundation (the
visual system and components) and the **Inbox**. The other screens come in the next task.

Open `atelier/design/index.html` first. Source of truth is HTML:

| File | What it is |
|---|---|
| `design/tokens.css` | Every raw value: colour roles (light, dark), type, spacing, sizes, radii, elevation, motion, reduced motion |
| `design/components.css` | Every component class, built only from tokens. Frontend lifts these as they are |
| `design/icons.js` | The icon set (24 px grid, 1.6 px stroke), injected as an inline sprite |
| `design/components.html` | The component sheet: every component in every state, light and dark (`?theme=dark`) |
| `design/screens/inbox.html` | The Inbox, desktop, tablet and phone, every state (switcher in the corner; query below) |
| `design/screens/img/` | Real images: renders of replay's and dodge's own design screens, used as the work shown in items |
| `design/references/` | The references board's screenshots |
| `design/review/` | Critique rounds (before/after) and the final render matrix |
| `design/direction-a/`, `direction-b/`, `shots/`, `directions.md`, `inventory.md` | D1, kept for the record. `inventory.md` is still the R1 checklist |
| `design/feel/index.html` | **D3: the three feels side by side** (Calm, Flow, Crisp), phone and desktop demo videos playing together, and the recommendation |
| `design/feel/<calm\|flow\|crisp>/` | Each feel: `inbox.html` (interactive, same D2 layout), `demo-desktop.webm` (1440×900), `demo-phone.webm` (390×844), `contact-desktop.png` / `contact-phone.png` (12 key frames). Flow also has `demo-phone-reduced.webm` |
| `design/feel/shared/` | `inbox.js` (one engine for all three: content, state, the transition hook) and `feel.css` (the D3 finish shared by all three) |
| `design/references/motion/` | Motion references: short clips and frame strips from Linear, Things, Superhuman, Raycast, Vercel |

Feel pages take `theme=light|dark`, `motion=reduce`, `open=<id>`, `state=zero|loading|error`, `tab=office`, `fail=1`, `demo` (hides the switcher).

Inbox query parameters (mockup only): `theme=light|dark`, `open=finding|budget|design|question|proof|outcome|plan`,
`state=zero|loading|error`, `dock=sending|failed|sent|invalid`, `toast=1`, `fail=1` (the next send fails), `shot` (hides the switcher).

## Framing

- **Who**: one owner, technical, running several agent teams. Uses it on a desktop monitor while working, and on the phone away from it.
- **The moment that matters**: a minute between other things. In one glance: does anything need me? If yes, see the thing itself and decide in one or two taps. If no, a calm line, and leave.
- **The second moment**: a short session clearing the queue, one decision after another, keyboard on desktop, thumb on phone.
- **What success feels like**: like closing Linear's inbox at zero. Nothing shouts unless it needs you; every number agrees; you never open a file to know what you're deciding.
- **What D1-B got wrong, and what fixes it here**: grey skeleton previews → real screenshots in a hero frame; one big heading and nothing else → a type scale with a display serif for the one title that matters; no identity → warm neutrals, the studio-grid mark, ink actions, lilac only for work; a flat text queue → grouped queue items with kind glyphs, red dot, age and a neutral selected state; cut-off spend → spend and plan in the sidebar foot, where they always fit; pill tabs → a sidebar, underline tabs on tablet, a conventional tab bar on phone; an orphaned "Later" → removed (the pager and J/K move on); a card floating on grey → the item sits on the app panel, and the dock is the only lifted surface; no states → every state below.

## References

Mobbin needs a paid plan, which would spend money (see Open questions), so references come from each product's own public pages and docs, captured headless into `design/references/`.

| Product | Screens | Take | Avoid |
|---|---|---|---|
| **Linear** inbox and triage (`linear-inbox.png`, `linear-inbox-2.png`, `linear-triage.png`) | Inbox list, priority split, triage queue | Two-line rows: a bold title, a quiet meta line, age right-aligned in a fixed column. A priority split ("Priority 4 / Other 12") → our **Needs you now / When you have a minute** groups. Inset app panel on a darker canvas. Keyboard-first: J/K | Avatars on every row (we have one user; kind glyphs instead). Pill-shaped filter tabs, which the owner dislikes. IDs up front ("DRV-9967"): R3 hides them behind Details |
| **Vercel Geist** (`vercel-geist-colors.png`, `vercel-geist-status.png`, `vercel-geist-type.png`) | Colour scales, status dot, type scale | Status as a small dot plus a plain word (Queued / Building / Error / Ready): our dot system. Neutral-first palette where colour is reserved for state. A named type scale engineers can use as classes. Ink-black primary buttons | Geist's blue as the accent (ours is lilac, and only for "working"). Ten colour scales: we need roles, not ramps |
| **GitHub** pull request (`github-pr.png`) | PR header and side panel | A state word beside the title, author and age in one meta line. The quiet side column of facts beside the main content: our queue column | The density of labels, chips and counts in the sidebar; code blocks up front |
| **Cursor** agent window (`cursor-agent-review.png`) | Agent session with summary, recording, diff | Proof shown as the thing itself: a recording thumbnail with a play affordance, then a plain summary. Review and Commit actions pinned at the bottom of the agent's pane: our sticky dock | The three-pane density and the diff as the default view; the owner reads outcomes, not diffs |
| **Devin** (`devin-session.png`, `devin-home.png`) | Session list, ask, session view | A left list of recent sessions with a title and a relative time, nothing else. A calm, centred empty prompt: the tone of our inbox zero | "Thinking process (21 tools used)" style logs as primary content |
| **Superhuman** (`superhuman.png`) | Split inbox | Text tabs with counts, no pills ("Important 12 · Calendar 13"), and the promise of zero as the goal | The marketing gradient and glass; any decoration behind content |

### Motion references (D3)

Captured headless from each product's public site (Mobbin is still paid; ruling R-2 allows free public screens) into `design/references/motion/`: a short clip (`.webm`) and a frame strip (`-frames.png`) each. Arc's site is now a farewell page with no product motion, so Arc is taken from what it is known for, not from a capture.

| Product | Clip | What happens | Take | Avoid |
|---|---|---|---|---|
| **Things** | `things-check-off.webm`, `things-check-off-frames.png` | Checking an item: the box ticks, the row greys **in place**, and only later does the list tidy. Completed items don't vanish under your finger | **The hold**: show the decision done where you made it (`--dur-hold` 560 ms) before anything moves. Ticks that draw in with a little spring | The long completion delay (Things waits seconds; a queue of decisions can't) |
| **Things** | `things-list-to-detail.webm`, `-frames.png` | A to-do opens into a card in place; the list around it recedes; closing reverses exactly | **List to detail is one object changing size**, and the reverse path is the same path: our Flow title flight and its Undo | Card shadows and paper metaphors |
| **Superhuman** | `superhuman-ask-progress.webm`, `-frames.png` | The Ask panel rises; "Searching your calendar…" sits as one quiet line while it works; the answer streams in under it | **Live progress as one plain line that updates in place**, no spinner wall: our Working now tick (figure rolls, bar moves, nothing re-renders) | The gradient sky; glass |
| **Linear** | `linear-hero-enter.webm`, `-frames.png` | Headline, sub-line and product frame arrive in sequence (blur + fade + a short rise), ~40–80 ms apart. Product (from use, not the clip): the app itself moves almost nothing; keyboard moves are instant | **Stagger in a fixed order** (eyebrow + title, then body; `--stagger` 40 ms, max 160 ms), and **instant response to input**: press feedback within `--dur-instant` | Blur as an entrance: `filter` isn't compositor-only and costs paint on every frame. We use opacity and a few px of travel instead |
| **Raycast** | `raycast-hero.webm` (site hero) | Site: the hero arrives in one quick move and settles. Product (from use, not the clip): the launcher snaps open and list selection has no animation at all | **Crisp**: what's under your hand answers immediately; motion is short and exact, rows snap | Long eased list animations that make keyboard users wait |
| **Vercel** | `vercel-scroll.webm` | Content fades up once as it enters; status dots pulse slowly; nothing loops loudly | **Status as a slow, small pulse** (`--dur-pulse`) and colour only where it means something | Decorative grid and glow motion |
| **Arc** (not captured) | — | Spaces slide sideways in the direction you swipe; the sidebar follows your finger | **Direction-aware page moves**: J/K and tab switches slide the way you went (Flow) | Playful bounces on everything |

What all six agree on: motion confirms an action or shows life, it never decorates; the thing you are reading never moves while you read it; exits are faster than entrances.

## Flows

1. **Glance (desktop)**: open → sidebar shows Inbox `7` in red (some need you now) → page head says "7 waiting · 2 need you now" → the top item is already open. If the count is grey, nothing is urgent; if it is absent, inbox zero.
2. **Decide one item**: read the eyebrow (kind · project · age), the title, one sentence, see the work (pictures, question, finding) → act in the dock (primary, secondary, optional note) → the dock shows **Sending…** → **sent** (green wash, what happens next; no Undo here, see the toast) → the queue row turns green, collapses out → the next item opens, focus moves to its title, a toast says "Done. Next: …" with Undo (6 s). The toast is the one place for Undo: the sent dock is only on screen for about a second, too short to be a usable target. A secondary action (Reject, Skip, No, Retire) gets its own sent line, toast and ledger line; the busy label sits on the button you pressed.
3. **Clear a session**: J/K or the pager move through items without deciding (this replaces "Later"; nothing is sent). Clicking any queue row opens it. Ctrl+Enter sends from the note field.
4. **Decide on the phone**: Inbox tab (red badge with the count) → the top item fills the screen, dock under the thumb, sticky `--size-tabbar` + safe area + `--space-2` above the bottom of the viewport, so it is always above the tab bar and on top (hit-tested), 44 px buttons → after a decision the next item opens at the top of the page → "Also waiting" is the queue below the item.
5. **First run / zero**: "All caught up · Nothing needs you." with who is working and what you decided today. Nothing red anywhere (R8). Reached by deciding, every number agrees: project counts come from the items still waiting (so they disappear), the ledger lists what you just decided on top of earlier decisions, and the spend line only mentions a limit while a budget item is still waiting. One spend figure per screen (sidebar on desktop, top bar below 1280).
6. **Errors and recovery**:
   - Validation: approving a design or rejecting proof with an empty note → the field turns red with one plain line ("Say what's wrong so the team can fix it."), focus goes to the field. Nothing is sent.
   - Send fails → dock shows "Couldn't reach Atelier. Nothing was sent." in red; the primary becomes **Try again**; your words stay in the field.
   - Undo (toast, 6 s) → the item comes back where it was, open and undecided; its ledger line is removed.
   - The Inbox itself fails to load → banner "The Inbox didn't load. Trying again in 15 s." with **Try now**, and a calm line that agents keep working. Counts in the chrome are hidden until data arrives (never show stale numbers as fact).
   - Live refresh (R7) never replaces the open item, the note being typed or the scroll position; new items join the queue quietly.

## Directions

D3 adds three **feels** of B for the owner to pick from (`design/feel/index.html`; see Motion): Calm, Flow (recommended), Crisp. Same layout, different motion and finish.

D1 rendered two directions (`design/directions.md`); the owner chose **B** at the design gate (ruling R-1). D2 does not reopen that choice: it is B built properly, with D1's recommendation from A kept where it helps (the work shown large, the dock pinned on the phone).

## Visual system

All values live in `design/tokens.css`; never write a raw colour or size in a screen.

**Identity.** Warm neutrals (paper, not blue-grey), ink-black actions, one display serif for the single title that matters, and the mark: a 2×2 studio grid with one lilac cell, "the team at work". Colour is never decoration. *Why the serif*: it gives Atelier a voice without spending colour, and it marks the one thing to read first. *Reversible*: change `--font-display` to `--font-sans`.

**Colour roles** (light / dark):

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Canvas | `--bg` | `#f5f4f1` | `#0f0f0e` | Behind the app panel; sidebar |
| Surface | `--surface` | `#ffffff` | `#181816` | App panel, dock, frames |
| Sunken | `--surface-sunken` | `#f0eee9` | `#141412` | Quotes, image wells, code |
| Hover / selected | `--surface-hover` / `--surface-selected` | `#ebe9e4` / `#e5e2dc` | `#22211f` / `#2a2927` | Row hover; the open queue item and current nav (neutral on purpose: lilac means working) |
| Hairline / field | `--border` / `--border-field` | `#e3e0da` / `#8a857c` | `#2a2927` / `#6f6a63` | Dividers / text-field and radio borders (3:1) |
| Text 1/2/3 | `--text`, `--text-2`, `--text-3` | `#1c1b19`, `#5d5953`, `#67625a` | `#edebe7`, `#aaa59d`, `#9a958c` | Content / secondary / meta and placeholders |
| Ink | `--ink` | `#1c1b19` | `#edebe7` | Primary button (with `--text-on-ink`) |
| Active (lilac) | `--active` | `#6447cc` | `#b19cff` | Working, live, focus ring. Washes: `--active-soft`, `--active-track` |
| Needs (red) | `--needs` | `#b0291a` | `#ff8170` | Needs you now, wrong, error. Wash: `--needs-soft` |
| Done (green) | `--done` | `#176a40` | `#5ccf91` | Done, decided, sent. Wash: `--done-soft` |
| Inverse | `--surface-inverse` | `#1c1b19` | `#f1efeb` | Toasts (with `--toast-done`, `--toast-needs`) |

**Type** (system fonts only: Segoe UI Variable / SF Pro; display serif Sitka / New York / Georgia; nothing loads from the internet):

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `--text-2xl` | 40 / 46 serif | 400 | Inbox zero line (phone: `--text-xl`) |
| `--text-xl` | 30 / 36 serif | 400 | Title of the item in focus (phone: `--text-xl-phone` 24 / 30), max 24ch, balanced |
| `--text-lg` | 20 / 28 | 600 | Section headings on wide pages (next screens) |
| `--text-md` | 16 / 24 | 400 | Reading text in the item (`.lede`, quotes), max `--measure` 62ch |
| `--text-base` | 14 / 20 | 400–500 | UI default: queue titles (500), buttons (500), fields |
| `--text-sm` | 13 / 18 | 400–500 | Meta lines, nav labels, captions under frames |
| `--text-xs` | 12 / 16 | 500 | Group headings, ages, keyboard hints |

Numbers use tabular figures (`.num`, `font-variant-numeric`). Display tracking `--tracking-display` −0.015em.

**Spacing**: 4 px base, `--space-0-5` 2 · `-1` 4 · `-1-5` 6 · `-2` 8 · `-2-5` 10 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-10` 40 · `-12` 48 · `-16` 64.

**Grid and sizes**: sidebar `--size-sidebar` 240; queue column `--size-queue` 344 (300 on tablet); focus content max `--size-focus-max` 760 with `--space-12` side padding; top bar and page head `--size-topbar` 52; phone tab bar `--size-tabbar` 56; controls `--size-control` 36 (desktop), `--size-control-lg` 44 (phone, every tap target), `--size-control-sm` 28 (desktop pager only); glyph tile `--size-glyph-box` 28; dot `--size-dot` 8; icons 16 / 20.

**Radii**: `--radius-xs` 4 (kbd) · `-sm` 6 (buttons, fields, rows) · `-md` 10 (frames, quotes, toasts) · `-lg` 14 (app panel, dock) · `-full` (dots, tracks).

**Elevation**: flat with hairlines everywhere, except `--shadow-1` (app panel, frames, secondary buttons), `--shadow-2` (the dock, frame hover), `--shadow-3` (toasts). *Why*: only the thing you act on lifts.

## Components

Every component is on `design/components.html` in every state, light and dark. Class names are in `components.css`.

| Component | Classes | Spec |
|---|---|---|
| Brand | `.brand`, `.mark` | Mark 18×18, 2×2 cells with 2 px gap, cell 2 = `--active`; wordmark 14/600 |
| Status dot | `.dot`, `.dot-needs`, `.dot-done`, `.dot-active.is-live` | 8 px; live dot pulses a ring every `--dur-pulse` (off with reduced motion); always paired with words or an `aria-label` |
| Buttons | `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger`, `.btn-lg`, `.btn-icon`, `.btn-sm` | Height 36 (44 `lg`), padding 0 16 (`--space-4`), radius 6, 14/500. One primary per dock. Danger only behind a confirm (stop the lead) |
| Text field | `.field`, `.field-label`, `.input`, `.field-help`, `.field-error` | Border `--border-field`, radius 6, padding 8 12; textarea grows with content (`field-sizing: content`), in the dock min 36 (44 phone), max 160 |
| Choices | `.choices`, `.choice` | Radio rows, 44 tall, for an agent's suggested answers. Not pills |
| Sidebar nav | `.sidebar`, `.nav`, `.nav-item`, `.count`, `.nav-label`, `.sidebar-foot` | Items 32 tall, radius 6, icon 16 + label 14/500; current = `--surface-selected`; Inbox count red (`.is-needs`) only when something needs you now |
| Meter | `.meter`, `.meter-track`, `.is-full` | 4 px track; neutral fill, red only when the limit is reached |
| Top bar + tabs | `.topbar`, `.tabs`, `.tab` | Tablet: 52 tall, underline tabs (2 px `--text` bar), plan and spend at the right |
| Phone tab bar | `.tabbar`, `.badge-n` | 4 tabs, 56 tall + safe area, icon 22 + label 11/500; Inbox badge red when something needs you now, grey otherwise |
| Queue item | `.qitem`, `.qitem-glyph`, `.qitem-title`, `.qitem-meta`, `.qitem-side`, `.qitem-age`, `.is-done`, `.is-leaving`, `.is-skeleton` | Grid 28 / 1fr / auto, gap 12, padding 10 12, radius 6. Title 14/500 two lines max; meta 13 `--text-2` "project · kind"; age 12 `--text-3` right; red dot before the age only for needs-you-now |
| Queue group | `.queue-group`, `.queue-head` | 12/500 heading with count; "Needs you now" count in red |
| Working now | `.agent`, `.agent-progress`, `.track` | Live lilac dot, plain phrase, meta, a full-width 3 px lilac track (every bar ends on one edge) with the real figure under it ("1,240 of 1,800 clips") |
| Item parts | `.pager`, `.eyebrow`, `.title-display`, `.lede`, `.details`, `.quote`, `.facts`, `.section-label`, `.kbd` | See Screens |
| Preview frame | `.frames`, `.frames.is-hero`, `.frame`, `.frame-img`, `.frame-cap`, `.is-phone`, `.frame-more`, `.is-loading`, `.is-broken`, `.play` | Real screenshots from the view port, 16:10, radius 10, hairline + `--shadow-1`. Hero layout: first picture full width, the rest in a 3-up strip; phone shots sit whole (`contain`) in the strip. Caption 13: name left, "Open ↗" right. Recording pill bottom-left |
| Decision dock | `.dock`, `.dock-row`, `.dock-msg`, `.dock-hint`, `.is-sent` | Padding 12, radius 14, `--shadow-2`; sticky 20 px above the viewport bottom (8 on phone); note field on top, then primary, secondary, ghost, and a hint or message at the right |
| Toast | `.toasts`, `.toast`, `.toast-success`, `.toast-error`, `.toast-action` | Inverse surface, min 44 tall, radius 10, max 440 wide; 6 s, with Undo or Retry. Never covers a dock button or a tab: with a dock on screen it is centred on the dock, as wide as it (max 440), `--space-2` above its top edge (below it if there's no room above, under the top bar). No dock: `--space-6` from the bottom, on the phone `--size-tabbar` + safe area + `--space-2`. Closes on Escape and when you act on the next item. Phone: Undo is 44 tall (`--size-control-lg`) |
| Banner | `.banner` | Red wash, icon, one sentence, one action |
| Empty | `.empty`, `.empty-title`, `.empty-mark`, `.ledger`, `.ledger-row` | Serif line + one sentence; ledger of today's decisions with green ticks |
| Shell | `.shell`, `.shell-side`, `.shell-top`, `.shell-main`, `.shell-tabs`, `.page-head`, `.inbox`, `.focus`, `.queue`, `.skip` | See Responsive |

## Screens

- **Inbox**: `design/screens/inbox.html`. Specified here and below.
  - Page head (52): "Inbox" 14/600 · summary 13 "7 waiting · **2 need you now**" (red part only when > 0) · pager at the right "3 of 7 ‹ ›  J K to move".
  - Focus column, top to bottom with `--space-6` between blocks: eyebrow 13 ("● Needs you now" in red when so · glyph + kind 500 · project · age); title in display serif; one `.lede` sentence; the thing itself (hero frames, quote, facts, choices, meter); Details (closed) for anything technical; links (Open all screens, Read the design notes, Run log); the dock.
  - Queue column: Needs you now, When you have a minute, Working now. On inbox zero: You decided today (spend stays in the sidebar or top bar, never twice).
  - Item kinds and their docks (all from `inventory.md`): finding (Yes, fix it / No, it's fine + optional note); budget (Raise today to $60 / Budget settings; "Or do nothing: work resumes at midnight"); design gate (your words required / Approve design / Skip this phase); question (suggested answers + own answer / Send answer / Open the task); owner judgement with proof (Accept / Reject, note required to reject); outcome (Approve / Retire it); task plan (Approve plan / Read the brief). Charter, screen-use, push-failure and earned-trust items use the same parts: eyebrow, title, one sentence, the thing, the dock.
- **Office, Projects, Project page, Task page, New project, Settings, Activity**: come in the next task, built from these tokens and components.

## States

Shown on `components.html` (component states) and `screens/inbox.html` (screen states). Hover/focus/active on the sheet use `.is-hover`/`.is-focus`/`.is-active`, which exist only for the sheet.

| Element | Hover | Focus | Active | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|
| Primary button | `--ink-hover` | 2 px `--focus-ring`, 2 px offset | `--ink-active`, 1 px down | `--surface-selected` bg, `--text-3` | spinner + verb ("Approving…"), `aria-busy` | — | label becomes "Try again" |
| Secondary / ghost | `--surface-hover` | ring | `--surface-selected` | `--text-3`, no shadow | spinner + verb | — | — |
| Text field | border `--text-3` | border + 2 px ring `--focus-ring` 35% | — | `--surface-sunken`, `--text-3` | disabled while sending | placeholder `--text-3` | border `--needs`, `.field-error` line, focus moved here |
| Choice | `--surface-hover` | ring on the row | dot fills | — | — | — | — |
| Nav item / tab | `--surface-hover`, text 1 | ring | — | — | counts hidden | count absent | counts hidden |
| Queue item | `--surface-hover` | ring | opens it | — | skeleton rows | group hidden | — |
| Queue item, decided | — | — | — | — | — | — | `.is-done` green wash, then `.is-leaving` collapses out (`--dur-slow`) |
| Preview frame | border `--border-strong`, `--shadow-2`, caption text 2 | ring on the image | opens view port in a new tab | — | shimmer (`.is-loading`) | — | dashed well "Couldn't load this picture. Open it instead" |
| Details | text 1 | ring | chevron rotates | — | — | — | — |
| Dock | — | — | — | buttons disabled while sending | "Sending…" | — (no dock on zero) | "Couldn't reach Atelier. Nothing was sent." + Try again |
| Dock, sent | — | — | — | — | — | — | green wash, what happens next (Undo lives in the toast) |
| Toast | action underline bg 10% | ring in inverse text colour | — | — | — | — | error variant with Retry |
| Inbox screen | — | skip link "Skip to the decision" | — | — | `?state=loading`: skeleton head, frames, 5 queue rows; chrome counts hidden | `?state=zero` | `?state=error`: banner + Try now |

## Responsive

Breakpoints: **phone < 768**, **tablet 768–1279**, **desktop ≥ 1280**. Checked at 390, 768 and 1440 in light and dark; no sideways scrolling at 390 (measured).

- **≥ 1280**: sidebar 240 | app panel (8 px inset, radius 14, hairline, `--shadow-1`) containing focus (fluid, content ≤ 760) | queue 344. Page head sticks to the top; the queue scrolls on its own; the dock sticks to the bottom of the focus column.
- **1024–1279**: sidebar becomes the top bar (52, underline tabs, plan and spend at right); panel full bleed; queue 300 beside the focus.
- **768–1023**: one column; the queue follows the item.
- **< 768**: top bar keeps brand, plan and spend; tabs move to the bottom tab bar; focus padding 24 16; title 24/30; frames 2-up with the hero full width and "+N more" hidden; dock 8 px above the tab bar with 44 px full-width buttons; pager arrows 44; facts stack; every row ≥ 44 tall.

## Accessibility

Measured, not guessed (`runs/68h6/tools/contrast.mjs` reads `tokens.css`; `a11y.mjs` drives the page headless).

- **Contrast (WCAG 1.4.3)**: every text role on every surface it can sit on passes 4.5:1 in both themes. Lowest pairs: light `--text-3` on `--surface-selected` 4.68, `--active` on selected 4.90; dark `--text-3` on selected 4.88. Text 1 is 17.2 (light) / 14.9 (dark). Washes: needs on needs-soft 5.76 / 6.30, done on done-soft 5.79 / 7.86, active on active-soft 5.38 / 6.92. Primary button text 17.2 / 15.5. Toast text 15.7 / 15.0.
- **Non-text (1.4.11)**: field borders 3.67 / 3.32 on surface; focus ring 6.33 / 7.68; progress fill against its track 4.44 / 5.47.
- **Not colour alone (1.4.1)**: "needs you now" is a group heading and a word in the eyebrow, not only a red dot; dots carry `aria-label`s.
- **Focus (2.4.7)**: every focusable element shows a 2 px `--focus-ring` ring with 2 px offset (checked for the first 30 Tab stops at 390 and 1440: all show a ring). After a decision or J/K, focus moves to the new item's title (`tabindex="-1"`).
- **Keyboard (2.1.1, 2.4.3)**: Tab order desktop: skip link → sidebar → pager → the item's links and frames → note → primary → secondary → queue → working now. J / K next, previous (not while typing); Ctrl+Enter sends from the note; Enter on any queue row opens it; Enter/Space toggles Details. Phone: skip link → pager → item → dock → queue → tab bar.
- **Tap targets (2.5.5)**: every control ≥ 44×44 at 390 (measured, zero failures after round 2).
- **Names (4.1.2)**: icon-only buttons have labels ("Previous item", "Next item"); the Inbox link reads "Inbox, 7 waiting, 2 need you now"; queue rows read "title. project, kind, age. Needs you now"; frames read "Home, opens full size in a new tab"; images inside labelled links are `alt=""`.
- **Live regions**: toasts in `aria-live="polite"`; send errors and the load banner are `role="alert"`; the sent dock is `role="status"`.
- **Reduced motion** (D3): `prefers-reduced-motion` zeroes every travel, scale and pulse token; a change is one 120 ms cross-fade of the page; stamps and slides become fades; no pulse, no shimmer; spinner becomes a static ring. See Motion › Reduced motion.
- **Timing (2.2.1)** (D3): the toast's 6 s Undo window pauses while it is hovered or focused; Undo is also on `Z`.
- **Zoom**: at 200 % a 1440 window is 720 CSS px wide, so the phone layout applies (the breakpoints are in CSS px); not yet checked by render.

## Motion

D3 (rulings R-1, R-3: the owner found D2's feel and animation lacking). The system below is in `design/tokens.css`; the three feels in `design/feel/` are built only from it. *Why a system before the feels*: three feels that invent their own numbers can't be compared, and frontend can't build the chosen one without guessing.

### Principles

1. **Motion confirms or shows life; it never decorates.** It says "done", "gone", "next", "back", "working". Nothing moves on its own except a working agent's dot and its progress.
2. **What you read never moves while you read it.** The item in focus, the text you are typing and the scroll position stay put; live updates (R7) change figures in place.
3. **The dock never moves.** It sits at the foot of the focus column for every item (D3 change: D2 put it directly under short items, so it jumped from item to item), sticky when the item is long. Its words cross-fade; your hand doesn't have to find it again.
4. **Exits are faster than entrances.** The old is gone (`--dur-fast`) before the new is more than faint; never a double exposure.
5. **The decision is shown done in place before anything moves** (`--dur-hold`, from Things).
6. **Response to input within one frame budget**: hover in ≤ `--dur-fast`, press in `--dur-instant`.

### Tokens

| Token | Value | For |
|---|---|---|
| `--dur-instant` | 80 ms | press: the control answers your finger |
| `--dur-fast` | 120 ms | hover, colour, a tick appearing, every exit |
| `--dur-base` | 200 ms | enter: toast, disclosure, the next item's first block |
| `--dur-slow` | 320 ms | move: rows closing a gap, an item settling |
| `--dur-hold` | 560 ms | the decision shown done, in place, before the item goes |
| `--dur-calm` | 640 ms | the one slow moment: inbox zero arriving |
| `--dur-pulse` | 2.4 s | a working agent's live dot (Calm 3.2 s, Crisp 1.6 s) |
| `--dur-shimmer` | 1.8 s | one sheen across a progress bar per update (Crisp) |
| `--stagger` / `--stagger-max` | 40 / 160 ms | between blocks of an arriving item; never more in total |
| `--ease-enter` | `cubic-bezier(.16, 1, .3, 1)` | arrive: fast start, long quiet landing |
| `--ease-exit` | `cubic-bezier(.4, 0, .84, .44)` | leave: gathers speed, gone before you look |
| `--ease-move` | `cubic-bezier(.65, 0, .35, 1)` | A to B on screen |
| `--ease-press` | `cubic-bezier(.3, 0, .5, 1)` | press and release |
| `--spring-snappy` (+ `-dur` 400 ms) | `linear(…)`, stiffness 420, damping 32, ratio 0.79, ~2 % overshoot | presses, rows landing, ticks |
| `--spring-soft` (+ `-dur` 660 ms) | stiffness 160, damping 20, ratio 0.79 | medium travel with a little life (Flow's tick bar). Not for long flights: 1.7 % of an 800 px flight is a 14 px overshoot onto the next row |
| `--spring-glide` (+ `-dur` 700 ms) | stiffness 170, damping 26, critically damped | big surfaces arriving and long flights (Flow's title to Decided today), no bounce |
| `--shift-sm` / `--shift` / `--shift-lg` | 4 / 8 / 24 px | quiet / default / spatial travel |
| `--press-scale` / `--press-depth` | 0.97 / 1 px | pressed controls |

D2's `--ease-out` and `--ease-in-out` stay for components that already use them. Springs are CSS `linear()` curves generated from the physics (`runs/57cv/tools/spring.py`), so frontend needs no animation library; the duration is part of the spring and always travels with it.

### What moves and what never moves

| Moves | Never moves |
|---|---|
| The item in focus, when it changes (leave, arrive) | The item while you read it; the text you type |
| Queue rows closing a gap or making room (≥ 1024 px only, where the queue is beside the item) | The dock's position; the sidebar, top bar, tab bar |
| A title flying from its row to the focus, and from the focus to Decided today and back (Flow, ≥ 1024 px) | Counts: they change in place (Crisp rolls the digit within its own box) |
| The toast (rises from the dock it anchors to) | The scroll position, except to the top when the next item opens |
| Ticks (stamp, pop or fade), progress bars and figures | Anything when nothing happened |

### Choreography of one decision (all feels)

`press` (`--dur-instant`) → **Sending…** on the button pressed (latency) → **sent, held in place**: the dock turns green with what happens next, the queue row turns green, the tick appears (`--dur-hold`) → **one transition**: the old item leaves (`--dur-fast`), queue rows close the gap, the decision lands in **Decided today** (new at the foot of the queue, above Working now), the next item arrives (eyebrow + title, then body, `--stagger` apart), the dock's words cross-fade → **toast** with Undo (`Z`), focus on the new title. Undo is the same transition in reverse. Leader: the thing you touched; followers: the queue, then the next item; last: the toast.

Three rules for the queue (round 9):
1. **A group moves as one.** Every part of the queue tail (each header, each ledger row including the earlier ones, each Working now row) has its own name at ≥ 1024 px, so nothing jumps while its header slides.
2. **A leaving row is gone before anything moves onto its place**, and **a new row appears only once its gap is open** (Calm: rows wait `--dur-fast`, the new row comes in after `--dur-fast` + `--dur-slow`; Crisp: rows wait `--dur-instant`, the new row after 0.4 × `--spring-snappy-dur`; Flow: the leaving row shrinks away in `--dur-fast`, then rows and the flying title start, the new row grows in from 200 ms).
3. **Only a title that carries meaning flies** (Flow): the decided one (focus ↔ Decided today) and the one you open from its row (row → focus). After a decision the next item rises in place: its title leaving its row crossed the decided row. A title going back to its row stays with the row.

*Why Decided today moved into the queue*: a decision needs somewhere to go. D2 only showed the ledger at inbox zero; now the last three sit under the waiting items ("Decided today 2"), so the eye (and Flow's title) has a destination, and zero no longer introduces a new list.

### The three feels (`design/feel/`)

Same layout, content and journey; they differ in feel. Each refines D2's finish the same way (`feel/shared/feel.css`): icon stroke 1.75 on the 24 grid (1.17 px at 16, the stem of 14/500 text; D2's 1.6 read thin); typographic quotes, apostrophes and non-breaking hyphens in all copy; the serif title pulled back 0.03 em so its stem lines up with the eyebrow; the queue glyph centred on the title's first line; tabular figures everywhere a number changes; a focus ring plus a soft 16 % halo; preview frames with an inner 7 % hairline and concentric corners; a filled green tick in the sent dock and on zero; a toast with a visible Undo countdown (2 px life bar) and a `Z` key hint; inbox zero with more air, the line a third of the way down, Working now under a hairline.

| | **Calm** | **Flow** (recommended) | **Crisp** |
|---|---|---|---|
| In a sentence | Things stay where they are; what changes, fades | Every item is a thing with a place | Every action clicks |
| Next item | Old fades `--dur-fast`; new rises `--shift-sm` over `--dur-slow`, 80 ms later, body `--stagger` after | Desktop: the decided title flies into Decided today (`--spring-glide`; the snapshots keep their own size, the big serif leaves in `--dur-fast`, the small title fades in from 160 ms, so it is faint while it crosses other rows; the flight waits `--dur-fast` so the old body is gone first) while the next item rises in place; the rest slides in `--shift-lg` from the side you're going (`--spring-glide`). Undo: the title flies home first and the body unfolds under it at 380 ms. < 1024: the item slides like a card, out left, in right | Old out `--dur-fast`; new in `--shift` over `--dur-base`, no stagger; J/K slide 8 px in their direction |
| Queue rows | Close the gap over `--dur-slow`, `--ease-move` | `--spring-snappy` after `--dur-fast`; removed rows shrink to 0.96 in `--dur-fast` | `--spring-snappy` with overshoot; removed rows slip right 8 px |
| Press / hover | Colour only; hover eases `--dur-base`; the focus ring's colour fades in over `--dur-base` (the control itself never fades) | Scale 0.97, springs back; frames lift 2 px on hover | 1 px depth and the shadow closes; hover in `--dur-instant`; ink edge on the current row |
| Ticks | Fade | Pop (`--spring-snappy`) | Stamp from 0.5 (`--spring-snappy`), also on the queue row |
| Counts | Change in place | Change in place | Roll (old up and out, new up from below) |
| Working now tick | Bar eases over 1.2 s; figure fades | Bar springs (`--spring-soft`); figure rises 4 px | Bar steps (`--dur-slow`), one sheen passes, figure rolls |
| Toast | Fades up 4 px | Rises 24 px out of the dock (`--spring-snappy`) | Pops from 0.97 in `--dur-base` |
| Invalid note | Red border fades in | One 4 px nudge | Two-cycle 4 px shake |
| Inbox zero | Line settles over `--dur-calm`, Working now a beat later | The last title lands in the ledger, then the line rises 48 px (`--spring-glide`) | Tick stamps, line in `--dur-slow` |
| Tab switch | Cross-fade | Slides the way you went | Fast fade-up |

### Recommendation

**Flow.** It makes the Inbox feel like a place: you see where a decision goes and where the next one comes from, which is what "one at a time" is about. Its motion is spent only on the moments that carry meaning (deciding, undoing, moving between items) while the work you read, the dock and the chrome never move, so it stays calm between actions. Calm is the safe fallback if Flow feels busy after a week of daily use; Crisp feels more like a tool than a studio.

### Reduced motion

`prefers-reduced-motion: reduce` (or `?motion=reduce`): nothing travels, scales, pulses or shimmers. No view-transition names are set, so each change is **one page cross-fade of `--dur-base` (120 ms there)**; every stamp, pop, slide and shake becomes a fade (`feel.css`); the hold stays (400 ms) because it is information, not decoration; the toast's countdown bar is hidden. Spinners become a static ring (D2). Recorded: `feel/flow/demo-phone-reduced.webm`.

### Frame budget

- **Only `transform` and `opacity` animate**, on our elements and on the view-transition images. Measured (`runs/57cv/tools/motion-audit.mjs`, all animations sampled every frame during a decision): our elements animate only transform and opacity (plus a 120 ms background-colour transition on button hover, and in Calm the focus ring's outline and halo colour fading in over `--dur-base` on the one focused element: a repaint of one ring, no layout).
- **The one exception, by design:** view-transition *groups* interpolate their box (width, height) to morph. For rows the size doesn't change; Flow's title flight does change size. Measured with a Chromium trace of one decision at 1440: Calm 13 layouts (9 ms in total), Crisp 13 (9 ms), Flow 159 (18 ms in total, ~0.12 ms per frame): well inside a 16.7 ms frame.
- **60 fps:** with no recorder running, rAF frame times during transitions: Flow 2 of 2,563 frames over 25 ms, Crisp 1 of 1,200; worst 33 ms, the one snapshot frame at the start of a transition. Each decision has two main-thread tasks of 19–28 ms (re-render + snapshot), both before the animation starts. Frontend should update the DOM in place (not re-render the page) to bring those under 10 ms.
- No `filter`, `backdrop-filter` (except the static play pill), `box-shadow`, `width`, `height`, `top` or `left` animation on our elements; no layout reads inside animation frames; images decode async.

### For frontend

The mockup uses the browser's **View Transitions API** (same-document; Chromium 111+, Safari 18+, Firefox 144+); where it's missing, changes apply instantly (still correct, just not animated). Name the parts as `feel/shared/inbox.js` does: `ih` (eyebrow + title), `ib` (body), `dock`, `head`, `page` (Office), `empty`, `zero-work`, rows `q-<id>` (queue), `l-<id>` (ledger; earlier days' rows by a stable key), `w-<id>` (Working now), `h-*` (headers) and `l-more`, all with class `row` (≥ 1024 only), titles `t-<id>` with class `title` (Flow, ≥ 1024 only, and only on the titles that travel in this transition: name them in the old DOM just before it starts, remove them when it ends); set `data-vt=<open|next|prev|decide|undo|tab|zero|retry>` and `data-dir=<fwd|back>` on `<html>` for the duration. The chosen feel's `<style>` block is then the whole motion spec.

## Copy

Voice: plain, short, second person, calm. One sentence per item (R3). Technical words only inside Details.

- **Titles say what's at stake**, not what the system did: "Some of your clips may need a paid Windows add-on to play", not "Audit finding F-21 (high)".
- **Buttons are verbs that say the outcome**: "Yes, fix it", "No, it's fine", "Approve design", "Raise today to $60", "Send answer". Never "OK" or "Submit".
- **While working**: the verb in progress, "Approving…", "Sending…".
- **After**: what happens next, "Approved. The designer starts on the rest." Toast: "Approved the look of Replay. Next: …" + Undo.
- **Errors say what happened and that nothing is lost**: "Couldn't reach Atelier. Nothing was sent." / "Your answer is kept." / "The Inbox didn't load. Trying again in 15 s."
- **Validation says what to do**: "Say what's wrong so the team can fix it." / "Say what you approve in a few words. It goes to the designer."
- **Zero**: "All caught up. Nothing needs you. Three agents are working on their own. Anything that needs you will show up here."
- **Numbers**: "$40.00 of $40", "1,240 of 1,800 clips", "step 4 of 6", "resets in 2 h 10 min". Ages short in lists (25m, 2h, 1d), long in the eyebrow (25 min ago).

## Critique log

Each round: rendered headless with playwright (installed Edge) at 390, 768 and 1440, light and dark, then the **design-critique** and **accessibility-review** skills, fixes, and a re-render. Screenshots in `design/review/` (also in the run folder's `evidence/`).

### Round 1

Before: `review/round-1/before/` (first render). After: `review/round-1/after/`.

- **Found (design-critique)**: the dock floated at the very bottom of the page, far from the content (D1's "card on grey" problem again); the design and proof previews were a row of three small frames, the phone frame taller than the others so captions misaligned, and the work didn't read large, which is the whole point of B; the queue's age and red dot sank to the bottom of one-line rows; the sidebar foot (plan and spend) fell below the fold in tall pages.
- **Found (accessibility-review)**: sideways scrolling at 390 px (page 413 px wide, from the frame row).
- **Changed**: hero frame layout (`.frames.is-hero`: first picture full width, the rest in a strip, phone shots contained); the dock sits directly under the content and sticks to the viewport bottom; page head sticks; the queue scrolls on its own; queue age and dot align to the title line; the "Later" button stays removed in favour of the pager.
- **Result**: the Replay home screen and the Dodge round now fill the column; no sideways scroll at 390.

### Round 2

Before: `review/round-2/before/`. After: `review/round-2/after/`. Full final matrix (50 shots): `review/final/`.

- **Found (design-critique)**:
  1. Loading state showed the red "7" and project counts before any data had arrived: stale numbers shown as fact.
  2. Inbox zero: the Working now progress tracks ran 750 px wide and read as dividers.
  3. Budget item: amounts were left-aligned in a loose list, not lined up under "$40.00 of $40".
  4. The eyebrow's underlined project link was the only underline on the page and pulled the eye.
  5. The pager's J/K hint had no words.
  6. Content could peek out beneath the sticky dock.
  7. Copy slip: the failed-send sample text on the question item was the finding's text.
- **Found (accessibility-review, measured)**:
  1. Pager arrows were 28×28 on the phone (under 44).
  2. The eyebrow project link was a 35×18 tap target.
  3. No skip link: 8 sidebar stops before the decision.
  4. Accessible names ran together ("Inbox7", "Building the trim editorreplay").
- **Changed**: counts are hidden while loading or after a failed load; the zero Working now group is capped at 560; the money list (`.facts.is-money`) is right-aligned with tabular figures in the meter's width; the project in the eyebrow is plain text; "J K to move"; a surface fill under the sticky dock; pager arrows 44 on the phone; a "Skip to the decision" link (44 on phone); `aria-label`s on the Inbox links, queue rows and agent rows; per-item sample text.
- **Result**: zero tap-target failures at 390; all Tab stops show a ring; 0 text pairs under 4.5:1 in either theme.

### Round 3

Before: `review/round-3/before/`. After: `review/round-3/after/`. Final matrix re-rendered into `review/final/`.

- **Found (design-critique)**: in Working now, each track ended where its label began, so the three bars had three different right edges ("step 4 of 6" vs "1,240 of 1,800 clips"). The ragged edge read as noise next to the aligned queue.
- **Found (accessibility-review, measured at 390 in every open state)**: "Open all 13 screens" and "Read the design notes" were 28 px tall tap targets. Round 2's check had only measured the default view.
- **Changed**: `.agent-progress` is now a column with the track full width and the figure under it; on the phone, `.links a` is `--size-control-lg` (44 px) tall with no row gap, so the list doesn't grow taller than it needs to.
- **Result**: 0 unnamed controls, 0 targets under 44 px, 0 Tab stops without a ring across design, proof, question, budget and zero at 390, light and dark; 0 text pairs under 4.5:1.

### Round 4 (reviewer's findings)

Before: the reviewer's shots `runs/68h6/review-evidence/p1-390-dark-design-viewport.png`, `u1-after-dock-undo.png`, `z1-cleared-to-zero.png`. After: `review/round-4/`.

- **Found (review, real phone viewport)**: at 390×844 the sticky dock sat at `--space-2` from the bottom, under the sticky tab bar, so Accept/Reject and Approve were covered. Our own matrix missed it because `?full` un-sticks every bar, and a11y.mjs measured size, not occlusion.
- **Found (review, journey)**: the sent dock's Undo didn't cancel the pending removal, and was on screen for about a second. Rejecting proof toasted "Accepted". Inbox zero reached by deciding kept stale project counts, "replay is at its $40 limit" after the limit was raised, a second spend figure ($31.80 vs $52.60) and a ledger that didn't include what you'd just decided.
- **Changed**: phone dock `bottom: calc(var(--size-tabbar) + env(safe-area-inset-bottom) + var(--space-2))`. The sent dock has no Undo; the toast's Undo (6 s) is the only one and also removes the ledger line. Secondary actions have their own sent line, toast and ledger line. Project counts come from the waiting items; the spend line is one figure and mentions a limit only while a budget item waits; the zero column lists what you decided, newest first. J/K work with Caps Lock. Component sheet: the design gate's Approve stays enabled and validates on click (as the screen does), and the neutral toast no longer refers to the removed "Later".
- **Result** (`runs/68h6/tools/iter4.mjs`, real viewport, no `?full`): design, proof and question at 390 in light and dark, at the top and at the end of the item: 0 dock controls covered, every dock control is the top element at its centre. Decide-all journey: sidebar counts `[]`, one spend figure, "Every project within its budget", ledger 8 (7 just decided + 1 earlier). Toast Undo restores the item and its count, and it stays restored. 0 page errors.

### Round 5 (re-measure after round 4)

Before: `review/round-5/before-inbox-390-light.png`. After: `review/round-5/after-inbox-390-light.png`.

- **Found (accessibility-review, measured with a11y.mjs at 390 in the default view)**: the "Technical details" disclosure in the auditor's finding was 358×36, under the 44 px tap target. Earlier rounds measured each `open=` state but read the default view's log only for unnamed controls.
- **Changed**: on the phone, `.details summary` gets `min-height: var(--size-control-lg)` (44 px), like `.links a`. Desktop keeps `--size-control` (36 px), which is a pointer target.
- **Result**: a11y.mjs at 390, default view and design, proof, question, budget and zero, light and dark: 0 targets under 44 px, 0 unnamed controls. The final matrix in `review/final/` is re-rendered from this HTML (66 Inbox + 4 component shots, no sideways scroll, no console errors).

### Round 6 (reviewer's toast finding)

Before: `review/round-6/before-390-light-toast-over-next.png`, `before-1280-toast-over-next.png`. After: `review/round-6/after-390-light-toast-over-next.png`, `after-1280-toast-over-next.png`.

- **Found (review, hit test with the toast up)**: the toast sat 24 px from the bottom of the viewport, centred on the window. After each decision it covered the next item's dock buttons for 6 s: Accept and Reject plus the whole tab bar at 390 and 360, and Reject at 768 and 1280. The toast's Undo also sat on top of the next item's Reject, so a thumb aimed at Reject could undo the decision you had just made. Earlier rounds only tested the dock with no toast showing.
- **Changed**: the toast anchors to the dock. It is centred on the dock and as wide as it (max 440), `--space-2` above the dock's top edge, and it follows the dock while you scroll or type. If there's no room above, it goes below the dock instead, and never under the top bar or tab bar. With no dock (inbox zero), it sits above the tab bar on the phone. It closes on Escape and when you act on the next item. On the phone its Undo is 44 px tall. *Why above the dock*: the confirmation shows up where your eye and thumb already are, and it never takes the place of the next thing you'll press.
- **Result** (`runs/68h6/tools/toast-hit.mjs`, real viewport, headless): 390×844, 360×640, 768×1024, 1280×720 and 1440×900 in light and dark, toast up over a long next item (question → proof, budget → design), checked at the top, the middle and the end of the item: every dock button and every tab is the top element at its centre, and the toast overlaps neither the dock nor the tab bar. Escape and acting on the next item both close it. Tapping Accept's centre with the toast up decides that item. 101/101 checks pass, 0 page errors. The reviewer's r3b/r3c re-run: every dock button reads `dock`, every tab `TABBAR`. At 390, Undo is at 594–638 and Reject at 727–771, so they no longer overlap.

### Round 7 (D3, feel round 1: watching the recordings frame by frame)

Method: each feel recorded with Playwright's video capture doing the full journey (`runs/57cv/tools/record.mjs`), then frames extracted at 10 fps around every transition (ffmpeg) and read one by one, plus the **design-critique** skill on the contact sheets. Before: `review/d3-round-1/before-flow-desktop-decide.png` (12 frames, 1.2 s around a decision), `before-flow-phone-rows-fly-over-item.png`. After: `after-flow-desktop-decide-mid.png`, `after-flow-phone-rows-stay.png`.

- **Found (frames)**:
  1. *The dock jumped.* Deciding a long item (the design) and landing on a short one (the question) moved the dock from the bottom of the screen to the middle, mid-transition: its old image showed at the new place. The hand loses its target.
  2. *Double exposure.* In Flow the old item's body left over 320 ms while the new one arrived from 40 ms: for ~250 ms the Replay screenshot and the question's quote were both half visible.
  3. *The next item opened mid-scroll on desktop*: after scrolling down to look at the frames, the next item appeared from its middle.
  4. *Rows flew across the item on the phone.* Below 1024 px the queue is under the item and the page scrolls to the top on each change, so named queue rows animated from the bottom of the old view to their new place, sweeping across the design image and the tab bar labels (`before-flow-phone-rows-fly-over-item.png`, frames 5, 6 and 11).
  5. *Frame drops on desktop recordings* (Flow 57 of 994 frames over 25 ms).
- **Changed**: the focus column is at least one screen tall and the dock sits at its foot for every item ("the dock never moves", now a principle); exits take `--dur-fast` and entrances start ≥ 80–100 ms later in all three feels; the next item, Undo and opening from the queue scroll to the top at every width; queue rows (and Flow's titles) only get view-transition names at ≥ 1024 px; the decided list moved above Working now so it is on screen as the destination.
- **Measured** (item 5): the drops came from the recorder, not the page. With no video capture, Flow drops 2 of 2,563 transition frames and Crisp 1 of 1,200 (worst 33 ms, the snapshot frame). A Chromium performance trace of one decision found Flow's title flight costs 159 tiny layouts (18 ms in total over the flight), Calm and Crisp 13: recorded as the one frame-budget exception.
- **Result**: no double exposure in any frame, the dock in the same place across all seven items, no rows crossing the item on the phone (re-recorded all six demos; `feel/*/contact-*.png`).

### Round 8 (D3, feel round 2: accessibility and reduced motion)

Method: the **accessibility-review** skill; `a11y.mjs` on each feel at 390 and 1440, light and dark, default, `open=design` and `state=zero` (36 runs); `motion-audit.mjs` samples every running animation each frame during a decision, with and without reduced motion, checks where focus lands and whether the Undo window waits. Before: `review/d3-round-2/before-crisp-390-toast-after-7s-hover.png`. After: `after-crisp-390-toast-after-7s-hover.png`.

- **Found**:
  1. *Undo window didn't wait* (WCAG 2.2.1 Timing adjustable): with the pointer resting on the toast, it still closed after 6 s (before shot: no toast). Someone reading the long "Next: …" line could lose Undo.
  2. *Reduced motion still scaled things*: Flow's tick pop and Crisp's tick stamp (on the dock and the queue row) animated `transform: scale` under `prefers-reduced-motion`, because their keyframes used literal scales, not the zeroed tokens.
  3. *Names ran together* (4.1.2): "Office3 working", "replay4", "Approved the look of Dodge6hdodge".
  4. Checked and fine: 0 unnamed controls, 0 targets under 44 px at 390, every Tab stop shows a ring (first 30 stops, both widths, both themes), images have `alt`, focus lands on the new item's title (`#ttl`) after every decision, J/K and Undo in all three feels; no new colour pairs (ticks reuse D2's done/done-soft 5.79:1 and 7.86:1; the countdown bar is decorative).
- **Changed**: the toast's timer and countdown bar pause while it is hovered or focused, and resume with the time left (minimum 1.5 s); under reduced motion every stamp, pop, slide, nudge and shake becomes a fade (`feel.css`); `aria-label`s "Office, 3 working", "replay, 4 waiting, working", "Approved the look of Dodge. dodge, 6h ago".
- **Result**: toast still present after 7 s of hover, gone ~6 s after the pointer leaves (all three feels); under reduced motion the only transforms running during a decision are the browser's page cross-fade group (no travel), in all three; Flow's reduced-motion journey recorded (`feel/flow/demo-phone-reduced.webm`, `contact-phone-reduced.png`).

### Round 9 (D3, feel round 3: the reviewer's frames, then every frame of a decision and an undo)

Method: the reviewer's frame grabs from the committed demos and focus-opacity samples, then a new stepped-frame tool (`runs/57cv/tools/vt-frames.mjs`): it pauses every animation of a view transition and sets them to 0, 60, 120, 180, 240, 320, 420, 560 and 720 ms, shooting the page at each, for a decision and its Undo in all three feels at 1440. That makes the frames exact instead of what a 25 fps recorder happened to catch. Then the **design-critique** read of each strip and the **accessibility-review** check on focus. Before: `review/d3-round-3/before-*.png` (the reviewer's grabs). After: `review/d3-round-3/after-<feel>-{decide,undo}-queue.png` (queue column, the nine steps left to right) and `after-calm-focus.png`.

- **Found (review)**:
  1. *Headers slid over rows, in every feel, on every decide and undo at ≥ 1024 px.* The queue headers had names and moved; the rows under them (the earlier "Approved the look of Dodge", every Working now agent) didn't, so they jumped and the headers slid across them for 0.3–0.4 s: "Decided today" over "Approved the look of Dodge", "Working now" over "Building the trim editor". Round 7 said "no double exposure in any frame"; it was checked on the item, not the queue tail.
  2. *Calm's focus blinked the control.* `:focus-visible` ran a fade on the whole element, so every control you Tab to went to opacity 0 and back (0.00 → 0.66 → 0.89 → 1.00 over ~100 ms), against AC-13.
- **Found (our stepped frames, after fixing 1)**:
  3. *Flow: every queue title had its own name*, so titles sprang on their own clock (`--spring-soft`, 660 ms) while their rows used `--spring-snappy` (400 ms): titles pulled away from their meta lines ("Should hidden clips…" a row above "replay · question").
  4. *Flow: the landing title read larger and overshot onto the row below.* The browser stretches a snapshot to its morphing box, and a 1.7 % spring overshoot on an 800 px flight is 14 px.
  5. *Calm and Crisp: a new ledger row appeared under the header still sliding onto it* (Calm at 240 ms, Crisp at 180 ms), and on Undo the header slid down onto the ledger row that was still fading out.
- **Changed**: every element of the queue tail is named (`l-<id>` with a stable key for earlier rows, `w-<id>` for agents), so groups move as one; Calm's focus animates only the ring's colour (`outline-color`, halo), never the element; Flow names only the titles that travel (the decided one and the one being opened) and only for that transition, its title snapshots keep their own size, the flight uses `--spring-glide` (no overshoot), and the big serif leaves in `--dur-fast` while the small title fades in from 160 ms; in Calm and Crisp a leaving row is gone before rows move (`--dur-fast` / `--dur-instant`) and a new row appears once its gap is open. Rules written into Motion › Choreography.
- **Result**: in the stepped frames of Calm and Crisp, no text sits on text in the queue at any step of a decision or an undo (`after-{calm,crisp}-{decide,undo}-queue.png`). Flow still had three crossings, taken up in round 10. Calm's focused control reads opacity 1.00 at every sample after a Tab (was 0.00 at the first); every Tab stop still shows a ring (a11y.mjs). The reviewer's journey script: 159/162, the same 3 known false positives (`html` always carries `view-transition-name: root`), 0 page errors.

### Round 10 (D3, feel round 4: Flow's whole page, frame by frame)

Method: the same stepped frames (`vt-frames.mjs`), this time of the whole page and not only the queue, for Flow's decide and undo at 1440, read with the **design-critique** lens "is there ever text on text, anywhere?". Before: `review/d3-round-3/before-flow-decide-060-title-on-body.png`, `before-flow-decide-120-rows-overlap.png`, `before-flow-undo-320-title-on-frames.png`. After: `after-flow-decide-060.png`, `after-flow-decide-120.png`, `after-flow-undo-320.png`, and the strips `after-flow-{decide,undo}-{item,queue}.png`.

- **Found**:
  1. *At 60 ms the decided title was already flying through the old body* ("Approve the look of Replay" over "The designer drew 13 screens…"): the flight started at 0 while the body took `--dur-fast` to leave.
  2. *The next item's title left its queue row and crossed the decided row* ("Should hidden clips stay out of" over "replay · design"), outside the queue column.
  3. *The leaving row and the row moving up overlapped for ~80 ms* (shrink `--dur-base`, rows from 80 ms).
  4. *On Undo the returning title crossed the design's frames* as they arrived (320 ms).
- **Changed** (Flow only): the title flight and the queue rows wait `--dur-fast`, and the leaving row is gone in `--dur-fast`, so nothing moves onto anything still visible; after a decision only the decided title flies and the next item rises in place; on Undo the body unfolds at 380 ms, under a title that has nearly landed. Motion › Choreography and the Flow column updated.
- **Result**: in the full-page stepped frames of Flow's decide and undo, no text sits on text at any step; the one crossing left is the small decided title passing the "Decided today" header on its way in, at under a third of its opacity. The flight still reads as one move (it starts 120 ms later; total under 0.85 s). All seven demos and contact sheets re-recorded on this code and re-encoded to VP9 (sizes in EVIDENCE.md).

## Brand (D4)

The owner loves Flow (R-5) but not yet the colour, layout or logo. D4 gives numbered options on one pick page:
**`design/brand/index.html`** (phone-friendly; reply with e.g. `L7 + C2 + Y1` or `Combo B`). Flow's motion is untouched:
`brand/app/inbox.html` is `feel/flow/inbox.html` with its `<style>` copied byte for byte, plus a logo, a scheme and a layout
from the query (`logo=L1..L16`, `scheme=c1..c5`, `layout=y1..y3`, and every Flow parameter).

| File | What it is |
|---|---|
| `brand/index.html` | The pick page: logos, colours, contrast, layouts, combinations, top pick |
| `brand/logos.js` | The 16 marks as hand-built SVG (32-unit grid) and the lockup helper |
| `brand/schemes.css` | Five schemes: an 11-step neutral ramp per theme, one accent, the meanings; mapped onto D2's role tokens |
| `brand/brand.css` | Lockup type (per concept) and the pick page |
| `brand/app/inbox.html`, `app/layouts.css` | The Flow Inbox wearing an option; the three layouts |
| `brand/img/` | Top-bar crops of every logo in the real app; layout and combo screens; demos |
| `references/brand/` | The identity references board |

### Identity references

Captured headless from each brand's own public pages (R-2; Mobbin is still paid) into `references/brand/`.

| Brand | What works | Take | Avoid |
|---|---|---|---|
| **Linear** (`linear-brand.png`) | A mark that is one simple filled shape, a plain geometric sans wordmark, lots of room around both; the guidelines ask for "room to breathe" | One idea per mark; the mark survives as a solid shape at 16 px; spacing is part of the logo | Diagonal-stripe motion marks; anything that reads as "speed" (we sell calm) |
| **Vercel / Geist** (`vercel-brands.png`) | A single primitive (a triangle) and a tight, heavy wordmark; every sub-brand is a monochrome glyph next to a name | A family: four executions of one concept should read as siblings; ink-only versions must work | The triangle itself and any single-primitive mark that close to it |
| **Things** (`things.png`) | The app icon is the product's own object (a box with a tick) and the wordmark is a friendly rounded bold | The mark can be the product's own object: our "cell at work", "window", "seal" are Atelier's objects | Skeuomorphic depth and gloss; a tick (green tick means *done* in our R4) |
| **Raycast** (`raycast.png`) | A compact geometric mark with one strong colour that also leads the site | One accent that belongs to the brand | Red as a brand colour: red means *needs you* here |
| **Mercury** (`mercury.png`) | A fine-line emblem plus a widely tracked caps wordmark: calm, premium, trustworthy | Tracked caps for a "maker's mark" wordmark (seal concept) | Atmospheric photography behind the product |
| **Teenage Engineering** (`teenage.png`) | Line-drawn pictograms and a lowercase light wordmark: a studio that makes things | The studio-and-craft voice; line marks drawn on a grid | The playfulness and density of its navigation |

What they agree on: one idea, drawn simply; the mark works in one colour; the wordmark is quiet and set with care.

### Logos: four concepts × four executions (L1–L16)

All drawn by hand on a 32-unit grid with 3-unit strokes (so a 16 px favicon keeps 1.5 px lines), ink in `currentColor`, the accent from `--brand-accent`, knock-outs from `--brand-knock`. The Maker's-mark letters are drawn too, not set: the cap A of L13, L15 and L16 is one shape (`serifA` in `logos.js`: thin left stroke, thick right stroke, thin bar, slab feet, drawn at cap height 10 and scaled), and L14's double-storey a (`serifA2`: a bowl heavier on the left, a hooked top with a ball terminal, a stem with a tail) is drawn for the chop alone. No mark contains a `<text>` element, so every mark looks the same on every device, whatever fonts it has. Wordmarks are set in the system's own faces per concept (sans 600 for Grid, the display serif for North light, lowercase sans 500 at −0.03 em for Thread, serif caps at +0.2 em for Maker's mark); the chosen one gets outlined to paths in the next task so it renders the same everywhere.

| Concept | Why it fits Atelier | Executions |
|---|---|---|
| **Studio grid** (L1–L4) | The team as cells of one studio; the coloured cell is the one at work. Continuity with D2 | L1 Lit cell (three squares, one round); L2 Open seat (one cell left open: the owner's place); L3 Rising cell (one cell steps up: work coming to you); L4 Grid tile (on an ink tile, the app-icon execution) |
| **North light** (L5–L8) | An atelier is a room with a big north window; the light in it is the work going on | L5 Window and light (outline arch, sill, lit dot); L6 Four panes (solid, one pane lit); L7 Arch A (arch + crossbar reads as an A); L8 Line panes (the four panes in line) |
| **Thread** (L9–L12) | Craft as one continuous line; a lowercase a, nearest the wordmark, the most personal | L9 Thread a (bowl in ink, stem as the thread); L10 Stitched a (bowl as a running stitch); L11 a tile (knocked out of an ink tile); L12 One line, full stop |
| **Maker's mark** (L13–L16) | The stamp a maker puts on finished work, and the owner's sign-off: you decide, the mark is your approval | L13 Seal ring (a quarter lit); L14 Chop (serif a cut from a square); L15 Hallmark (cut-corner frame, A and its signed line); L16 Signet (solid, with a lit dot on the rim) |

**Favicon test (16 px), honestly:** strongest at 16 are the solid ones (L1, L4, L6, L11, L14, L16). L3 and L8 get busy, L10's stitch turns to noise, L13 and L15's serif A blurs: those need a simplified 16 px cut if chosen (the tile executions L4 and L11 are exactly that for their concepts).

**How originality was checked.** (1) Silhouette test: each mark was compared, filled black at 16 and 128 px, against the marks of the tools in the references board and of other well-known software, finance and fashion brands I know well. Typical near-misses: a 2×2 grid of equal squares (D2's mark) is the silhouette of a famous four-square logo, so every grid execution breaks it (a round cell, an open cell, a raised cell); arches stay single (a doubled arch is a famous fast-food sign); the seal avoids a notched rim (verified-badge look) and the tick. (2) Construction test: every shape is drawn in `logos.js` on the 32 grid, as primitives (rects, circles, arcs) or, for the Maker's-mark letters, as hand-placed polygons and Béziers; no font glyph is set or outlined, and nothing is traced or generated. The letterforms follow the generic structure of a serif A and a double-storey a, not any one typeface (no glyph was copied or used as a template). (3) Before the owner adopts one, the chosen mark needs a trademark search (USPTO / EUIPO image search) by the owner or a lawyer: that's outward-facing, so it's listed under Open questions, not done here.

### Colour schemes (C1–C5)

Each scheme is an 11-step neutral ramp per theme (`--n0` … `--n10`) mapped onto D2's roles in one block per theme (light: `--bg` n1, `--surface` n0, `--surface-sunken` n2, hover n3, selected and hairline n4, strong border n5, field border n6, text 3/2/1 n7/n8/n10; dark: `--bg` n0, sunken n1, surface n2, then the same), one accent, and the meanings. **Waiting** is neutral by design (R4: everything else neutral): a hollow `--wait` ring and the word. **Working** stays in the lilac family in every scheme, **needs you / problem** red, **done** green, each retuned to its ramp.

| | Mood | Accent | Pairs with |
|---|---|---|---|
| **C1 Ink and paper** | Warm white, black ink, one violet thread for the work in progress (D2 refined) | Violet = working, one colour, one meaning | Grid, Thread |
| **C2 Warm studio** | Linen and walnut in afternoon light; an ochre mark, like a workshop | Ochre `#94590d` / `#e3a85a`: mark and focus ring only | Maker's mark, Thread, North light |
| **C3 Graphite** | Cool greys and an indigo violet: a precise tool that sits next to Linear | Indigo violet = working | Grid, Thread |
| **C4 North light** | Cool, airy paper under a skylight; a slate-blue mark | Slate blue `#2f6aa8` / `#8fb3e0`: mark and focus ring only | North light |
| **C5 Gallery** | True greys and black type; nothing has colour unless it means something | None: mark and focus ring are ink | Maker's mark, Grid |

*Why the accent never touches content*: R4 gives colour only to meanings. A brand accent that isn't the working lilac (C2, C4) is limited to the mark and the focus ring, both identity and wayfinding, never state. *Why no scheme uses red, green or amber as its accent*: they would read as needs-you, done or a warning.

**Contrast (AC-13).** Every text and status pair, both themes, every scheme: 460 pairs measured by `runs/hspr/tools/contrast-schemes.mjs`, 0 below AA; the pick page measures the same 460 pairs again (46 per scheme and theme) from its computed colours as it loads (Contrast section, one table per scheme). Lowest text pairs: meta text on the selected row (C1 light 4.64, C2 light 4.69 after round B1, C4 light 4.59, C5 light 4.68), done on selected in C3 light 4.56. Non-text (3:1): the waiting ring, field borders, the focus ring / mark accent on surface and canvas, progress fill on its track.

### Layouts (Y1–Y3)

`design/brand/app/layouts.css`, switched by `html[data-layout]`. Only the shell moves; the item, the dock, the queue's contents and Flow's motion are byte-for-byte the same in all three, so the owner judges the frame, not a new design. Pick page › Layouts shows each at 1440 and 390 in L1 + C1 (shots: `design/brand/img/layout/`, made by `runs/hspr/tools/layouts.mjs`).

| | 1440 | 390 | Trade-off |
|---|---|---|---|
| **Y1 Sidebar** | 240 px sidebar (nav, projects, plan meter, settings) \| item \| queue (D2's shell unchanged) | Brand bar on top, four tabs at the bottom | Everything one glance away, at the cost of 240 px the item and queue could use |
| **Y2 Top bar** | `--size-topbar` bar: mark, four sections, "Plan 41%", "Today $52.60"; item and queue full width | Tabs under the logo, no bottom bar; the dock owns the bottom | Roomiest item and cleanest edges, but projects drop out of view and the phone tabs leave thumb reach |
| **Y3 Queue first** | 64 px icon rail \| queue \| item, like a mail client | No top bar: the item starts at the top; tabs at the bottom | Queue before decision suits a full inbox; the rail hides names behind icons, the project list leaves the screen, and the phone loses the logo |

*Why Y3 is not a "focused single column"*: one column hides the queue, and Flow's decided title then has nowhere to fly (DECISIONS). *Y3 rail foot*: "Claude plan" / "Spent today" don't fit 64 px, so the rail shows Y2's short labels "Plan" / "Today" (generated, with alt text `""`); the long label stays in the DOM, visually hidden, for screen readers.

### Recommended combinations (Combo A–D)

Pick page › Recommended combinations: each combo is the full Flow Inbox at 1440 and 390 in light and dark (`design/brand/img/combo/<a..d>-<w>-<theme>.png`, made by `runs/hspr/tools/combos.mjs`), plus a recorded demo of D3's journey (open the design item, write a note, approve, the next arrives, undo, approve, Office tab with a Working now tick, back, decide to inbox zero) on desktop in light and on the phone in dark, each with a 12-frame contact sheet (`combo-<id>-<form>-<theme>.webm`, `contact-<id>-<form>-<theme>.png`; `runs/hspr/tools/record-combos.sh`, VP9 crf 40). Flow's timings are untouched: the demo runs the same engine and `<style>` as `feel/flow/`.

| | Logo | Scheme | Layout | Why | Watch for |
|---|---|---|---|---|---|
| **A The house, refined** | L1 Lit cell | C1 Ink and paper | Y1 Sidebar | D2 with a stronger mark; the lit cell and the working violet are one idea | Safest, least personality |
| **B Warm studio** ★ | L14 Chop | C2 Warm studio | Y1 Sidebar | A workshop where things are made; ochre only on mark and focus, so content colour keeps its meaning | Warm neutrals look yellow on cool screens; serif caps wordmark must be outlined |
| **C North light** | L6 Four panes | C4 North light | Y2 Top bar | Airy and the roomiest Inbox | Projects out of view; slate nears generic tool blue |
| **D Graphite queue** | L9 Thread a | C3 Graphite | Y3 Queue first | Precise, queue first like mail | Closest to Linear, least distinctive; phone loses the logo |

*Why two combos share Y1*: the sidebar is the layout that keeps projects in view and the phone tabs in thumb reach; the other two layouts are each shown once so the owner sees them in a full look, not only in L1 + C1.

**Top pick: Combo B (L14 + C2 + Y1).** Warm studio is the only scheme that makes Atelier feel like a place where things are made while staying as quiet as Linear, and its ochre never touches content, so colour still only means working, done or needs you. The chop is one of the strongest marks at 16 px (a solid tile that doubles as the app icon), and its idea, a maker's stamp, is what the owner does on every decision. The sidebar keeps projects, plan and spend in view on desktop and the tabs under the thumb on the phone (the shell D2 proved), so what changes is identity, not the way of working. Runner-up: A.

### Hand-off: once the owner picks

Pick page: **`atelier/design/brand/index.html`**. When the owner replies (e.g. `Combo B` or `L7 + C2 + Y1`), the next task needs:
1. **Tokens**: copy the chosen scheme's two blocks from `brand/schemes.css` into `tokens.css` as the default `:root` / `[data-theme="dark"]` (the role names are D2's, so components and screens need no edits); drop the other four.
2. **Mark**: export the chosen mark from `logos.js` to `design/brand/mark.svg` (+ a 16 px cut if the favicon test listed it as busy), favicon `.ico`/`.svg`, a 512 px app icon on the ink tile; outline the wordmark to paths so it renders the same without the font.
3. **Shell**: fold the chosen layout's rules from `app/layouts.css` into `components.css` (`.shell`, `.sidebar`, `.shell-top`, `.tabbar`) and delete the `data-layout` switch.
4. **Other screens** (Office, project, task, settings) are drawn in that shell and scheme, with Flow's motion (DESIGN › Motion) unchanged: Office and project need the layout's nav state and the scheme's working colour on agent rows; settings needs a place for the plan meter if Y2 or Y3 is picked (their bars only show the short "Plan 41%").
5. **Trademark search** for the chosen mark before it is used publicly (Open questions).

### Critique log (Brand)

**Round B1** (self-review of the first render at 1440 and 390, with measured contrast; the skill-led rounds B2 and B3 follow once layouts and combinations are on the page).
- *Found*: logo cards overflowed their column (the favicon row's tab mocks were wider than a 280 px card), so the 128 px mark and the dark lockup were cut off; heading margins doubled the card head; the seal concept shown in C5 lost its accent entirely (C5's accent is ink), so L13's lit quarter and L16's dot vanished; the 1440 crop of the app was too small to read in a card; C4's slate accent (`#2c5282`) was too close to its ink to read as a colour; C2 light meta text on the selected row measured 4.48 (fail).
- *Changed*: cards and their children `min-width: 0`, favicon row wraps; heading margins reset; the seal concept is shown in C2; the 1440 crop is the sidebar head only (420 × 56); C4 accent `#2f6aa8`; C2 `--n7` `#665c4a` (now 4.69).
- *Result*: 460 / 460 pairs pass; no console errors at 390 or 1440.

**Round B2** (design-critique skill on the four combos at 1440 and 390, light and dark; accessibility-review measured with `runs/hspr/tools/a11y.mjs` on the pick page at 390).
- *First impression*: in every combo the item title is what the eye lands on first, then the dock, then the queue: right for the one job (decide). B reads warm and made-by-hand without adding a single colour to content; C and D read cooler and more generic; A is D2 with a better mark.
- *Found, usability*: (1) Y3 on the phone: with no top bar, the focus column kept Flow's height for two bars, so the dock stopped 52 px short and the first queue heading peeked between the dock and the tab bar (`d-390-light.png` before). (2) Y3's rail drops the project list entirely, which its trade-off line didn't say. (3) Y2 at 1440 says "Inbox 7" twice (the bar's tab and the page header): accepted, the tab is wayfinding and the header the page's title, as Linear does; listed in C's watch-for line instead.
- *Found, accessibility*: the combo recipe chips were 32 px tall and the "Open it live" / "Key frames" caption links 17 px on the phone (SPEC R5 asks 44); the scheme samples' "Yes, fix it" / "No, it's fine" were real focusable buttons (36 px) that do nothing, ten extra Tab stops.
- *Found, visual*: the selected queue row (n4) is the heaviest block on B and C light; kept, because it is the current item and it matches D2's selected role, which already passes 4.5:1 for meta text on it.
- *Changed*: Y3 phone `.focus` min-height drops one top bar (`layouts.css`); Y3 trade-off now says "the project list leaves the screen"; on phones, caption links are `inline-flex` 44 px tall and recipe chips `min-height: var(--size-control-lg)`; scheme samples are `inert` (a picture of the Inbox, not controls: no Tab stops, no dead buttons).
- *Changed, pick page*: the combo head first rendered as one wrapped row (name, chips and the why line side by side, watch-for below); it now stacks top to bottom (`.combo-head`).
- *Result*: a11y.mjs at 390: 0 unnamed controls, 0 images without alt, every Tab stop shows the focus ring; the only sub-44 px hits left are the inert sample buttons, which have no Tab stop (the tool doesn't skip `inert`); at 1440: 0 findings. `runs/hspr/tools/pick-check.mjs` at 1440 and 390: 54 images load, all 8 demos play (46–52 s), no console errors, no sideways scroll. Before/after: `design/review/brand/b2-before-y3-phone.png` → `b2-after-y3-phone.png`; the new sections: `b2-pick-combo-B-1440.png`, `b2-pick-top-390.png`.

**Round B3** (accessibility-review skill, WCAG 2.1 AA, on the branded app itself: `brand/app/inbox.html` in each of Combos A–D, measured, results in `runs/hspr/evidence/b3/`).
- *Checked*: names, alt text, tap targets and the first 30 Tab stops with their focus ring (`a11y.mjs`, 390 and 1440, light and dark: 16 runs); the Undo toast up after a decision at 390, 360, 768, 1280 and 1440 in both themes, with every dock button and tab hit-tested at its centre at the top, middle and end of a long next item, Escape and acting on the next item both closing the toast (`toast-hit.mjs`, 81 checks per combo); reflow at 320 px and at 1440 zoomed 200 % (720), landmarks, the toast's live region, page language (`reflow.mjs`, 16 runs). Contrast was measured in B1 (460 / 460 pairs).
- *Found*: (1) 2.5.5 target size, minor: in Y2 on the phone the "Office" tab was 38 × 44 px (the tab row sizes tabs to their word; Combo C only). (2) The first toast run reported "Escape doesn't close the toast" in every combo: a test artifact, not a bug. Flow fades the toast out over `--dur-base` and the check looked after 100 ms; at 400 ms it is gone in every case.
- *Changed*: Y2 phone tabs get `min-width: var(--size-control-lg)` and centred labels (`layouts.css`); the row looks the same, Office's hit area grows to 44. Test waits out the fade.
- *Result*: a11y.mjs: 0 unnamed controls, 0 images without alt, 0 targets under 44 px, every Tab stop ringed, in all four combos at both widths and themes. Toast: 81 / 81 per combo, no page errors. Reflow: no sideways scroll at 320 or 720, one `main`, `nav` present, one `h1`, toast in a live region, `lang="en"`. Not covered by a headless run: a real screen reader pass (NVDA/VoiceOver) on the chosen combination; listed for the next screens. Before/after: `design/review/brand/b3-before-y2-phone-tabs.png` → `b3-after-y2-phone-tabs.png`; Combo C and Y2 phone shots on the pick page re-rendered.

**Round B4** (reviewer finding, fixed: the seal marks depended on the viewer's fonts).
- *Found*: L13–L16 set their letter as SVG `<text>` in `ui-serif`. In L14 and L16 the letter carried two `style` attributes, the parser kept only the first, and the serif never applied, so the top pick's "serif a" chop rendered as a sans a (Segoe UI here, SF on an iPhone) on the pick page, in the bar crops, the Combo B screens and both Combo B demos. Even where the serif did apply (L13, L15), the letter came from whatever serif the device had (Sitka here, New York on iOS), so the owner's phone and the PNG crops on the same page showed different marks. It also broke this section's own claim that every mark is drawn.
- *Changed*: the letters are drawn as paths (`serifA`, `serifA2` in `logos.js`); construction and originality notes above updated. The first L14 a had too large a bowl and a weak hook, so it read as "ə". Bowl narrowed (rx 4.6), hook thickened to 1.9 with a 2-unit ball, the stem overlaps the hook to close a hairline seam. Pick page contrast now measures all 460 pairs (it had 370: hover for text, sunken and hover for the status colours were missing); the colour panels' `--active` code labels no longer wrap.
- *Re-rendered*: bar crops for all 16 (`bars.mjs`; only L13–L16 changed), all combo screens (`combos.mjs`; only B changed), Combo B's two demos and contact sheets (`ONLY=b record-combos.sh`, 0 page errors).
- *Before/after*: `design/review/brand/b4-before-seal-font-dependent.png`, `b4-before-L14-card.png` → `b4-after-seal-drawn.png` (L13–L16 at 128, 32 and 16 px, light and dark).

## Brand round 2 (D4b)

The owner's notes on round 1 (R-6): of the marks, L8 Line panes was nice from afar but too simple (nothing stood out) and L12 One line was the most acceptable but something was missing; the thread concept failed (it looked like a weird A); no generic grids, plain monograms or plain seals; the owner likes smooth curves against crisp edges. Of the colours, C4 North light was liked, C2's warm-brown darks looked strange, and C2 light was too bright. Y1 Sidebar is chosen. Dark is now the main mode and the default.

Pick page: **`design/brand/r2/index.html`** (dark by default; `?theme=light` shows the page in light). Round 1 stays at `brand/index.html`.

| File | What it is |
|---|---|
| `brand/r2/index.html` | The round-2 pick page: references, marks, colours, contrast, combos, top pick |
| `brand/r2/marks.js` | N1–N11 as hand-built SVG (32-unit grid) with small cuts, the six set-aside sketches, `mark2()` / `lockup2()` |
| `brand/r2/schemes-k.css` | K1–K3, dark and light; the shared role mapping is still `brand/schemes.css` |
| `brand/r2/r2.css` | The round-2 lockup and pick-page additions |
| `brand/r2/app/inbox.html` | The Flow Inbox (its `<style>` copied byte for byte) in Y1, wearing `logo=N1..N11` and `scheme=k1..k3`; dark unless `theme=light` |
| `brand/r2/img/` | Sidebar and phone-bar crops for every mark (`bar/`), combo screens and demos (`combo/`) |
| `references/brand/r2/` | The round-2 references, captured headless from public pages |

*Engine change*: `feel/shared/inbox.js` takes `window.IMG_BASE` (the r2 app sits one folder deeper, so its real images need another `../`). Nothing else in the engine or Flow's `<style>` changed.

### References (round 2)

| Reference | What works | Take | Avoid |
|---|---|---|---|
| **Arc** (`arc.png`) | One letter drawn as a soft ribbon with crisp-cut ends | Curve for warmth, a cut for precision, in the same stroke (N4, N6) | Its gradient, and an A made of loops (round 1's thread already read as a weird A) |
| **Saw-tooth roofs** (`sawtooth.png`) | The real north-light building: curved roofs that turn their glass away from the sun | A true story behind the name (N9) | The factory pictogram on the same page: flat teeth and a chimney |
| **Fanlight** (`fanlight.png`) | The arch, keystone and panes as an architect draws them | Crisp lines inside a smooth curve (N1–N3, N10) | The sunburst: small, a fanlight is a sunrise (set aside) |
| **Pen nibs** (`nib.png`) | Curved shoulders, a hard tip, a breather hole that is already an arch | N11 | Quills and ink blots |
| **Broad-pen writing** (`italic.png`) | Thick and thin in one stroke, chisel-cut ends | N4 | Swashes: noise at 16 px |
| **Linear, dark** (`linear-dark.png`) | A near-black with a trace of blue, raised surfaces one small step lighter, hairlines, white type at two weights | K1's structure | Pure-white primary buttons; ours stop at the ramp's top step |
| **Vercel, dark** (`vercel-dark.png`) | One lit mark carries a quiet black page | The mark's accent is the one brand colour on dark | Pure #000 and glow: harsh on OLED and theatrical |
| **Raycast, dark** (`raycast-dark.png`) | A deep neutral with one accent that belongs to the brand | K3's single cyan | A red brand colour (red means needs you) |

### Marks N1–N11

All drawn by hand on the 32 grid, ink in `currentColor`, the accent from `--brand-accent`, knock-outs from `--brand-knock`; no `<text>`, nothing traced, generated or outlined from a font. Marks that get busy small have a **small cut** (`small` in `marks.js`), used automatically at 20 px and under (so the 20 px sidebar mark and the 16 px tab use it): heavier strokes and fewer details. One wordmark for all (system sans 600, −0.02 em) so the owner compares marks, not type; the chosen lockup gets its wordmark outlined in the hand-off.

| | Mark | One idea | Curve / edge | Small cut |
|---|---|---|---|---|
| **From L8** | N1 Window and its light | The window and the patch of light it throws on the floor: the light is on, work is going on | Round arch over a sheared, sharp-cornered light patch | Yes: no transom, heavier line, bigger patch |
| | N2 Keystone | The arch is held by its keystone: your decision is the piece that holds the work | Solid arch, a cut wedge at the crown | Yes: no mullions |
| | N3 Window tile | L8 cut into a tile, seen from inside, one pane lit: the app icon | Soft arch in a crisp square | Yes: thicker mullions |
| **From L12** | N4 Written a | L12 written with a broad pen, chisel end, square full stop: signed by hand | Thick-thin bowl, chisel cuts, a diamond stop | No (solid shapes hold) |
| | N5 a, cut clean | L12 drawn like a typeface: flat ends, ink-trap notches, square stop | Round bowl, square cuts | Yes: no notches, heavier |
| | N6 Two-storey a | The classic a in one line; its hook curves over like the arch; the full stop becomes the ball terminal | One curve, flat-cut tail | No |
| **New** | N7 Someone at work | One line draws the arch, and its right jamb becomes the stem of an a sitting in the window | Arch and bowl, butt-cut ends | No |
| | N8 Lamp on | The studio's pendant lamp and its cone of light: your team is still working | Dome over a hard-edged cone | No |
| | N9 North-light roof | The curved saw-tooth roof that turns its glass north: even light all day | Curved roofs, vertical glass | No |
| | N10 Door ajar | The studio door left open, light down its edge: come and look | Arched frame, straight leaf and light line | No |
| | N11 Nib window | A nib whose breather hole is the arched window: the maker's hand and the studio's light | Curved shoulders, hard tip | Yes: wider slit and hole |

*Set aside* (shown on the page with the reason): North star (the stock AI-feature sparkle: the slop the owner named), Compass needle (every maps and security product), Plumb bob (upside down it's a map pin), Lancet window (reads as a church), Studio with a roof (the phone's home icon), Prism (a famous album cover; a triangle beside Vercel's), Fanlight (small, a sunrise or a gauge).

**How originality was checked.** (1) *Silhouette test*: each mark filled solid at 16 and 128 px and compared with the marks in both reference boards and the well-known software, finance, retail and architecture-practice marks I know; the near-misses were removed or changed: the first N9 (two curved sails) read as the Sydney Opera House outline, so it became three teeth on one building; the fanlight is a common sunrise; a pitched roof is the home icon. N3 and N1 avoid the four-equal-panes square (a famous four-square logo) by the round head and the single lit pane. (2) *Construction*: every shape is primitives and hand-placed Béziers in `marks.js`; the letters (N4–N7) follow the generic structure of a single- or two-storey a, not any typeface. (3) *Still needed before public use*: a trademark image search (USPTO / EUIPO) on the chosen mark by the owner or a lawyer (Open questions); outward-facing, so not done here.

### Colour schemes K1–K3 (dark first)

Same structure as C1–C5 (11-step ramp per theme on D2's roles, one accent for the mark and focus ring only, meanings retuned per ramp), so `tokens.css` takes the chosen one with no component changes. Dark is listed first everywhere and is the app's default. *Why no warm darks*: the owner found C2's walnut strange; all three darks are cool or neutral. *Why the light modes are off white*: the brightest surface is `#f6f8fa`-ish paper on an `#ecf0f4`-ish canvas, never `#fff`; C2 light read as glaring.

| | Dark | Light | Accent (dark / light) |
|---|---|---|---|
| **K1 North light, night** | C4 turned to its dark side: slate near-black `#0b0e12`, surface `#141920`, a trace of blue | C4's cool paper, softened: canvas `#edf0f3`, surface `#f7f9fa` | Moonlit slate blue `#8fb6e6` / `#2e65a1` |
| **K2 Night sky** | Cooler, deeper navy `#080b13`, surface `#111623` | Paper leaning blue, `#ecf0f6` / `#f6f8fb` | Starlight `#a9c8f5` / `#2f5ea8` |
| **K3 Slate and aurora** | Deep neutral slate, almost no blue `#0c0f11`, surface `#151a1d` | Neutral grey-green paper `#edf1f2` / `#f7f9f9` | Aurora cyan `#7fd3e3` / `#1c6c7c` |

**Contrast (AC-13)**: 276 pairs (46 per scheme and mode) measured by `runs/ysk4/tools/contrast-k.mjs`, 0 below AA, and measured again live on the pick page (Contrast section, from computed colours). Lowest text pairs: K1 light meta on selected 4.76, K2 light working on selected 4.75, K3 light meta on selected 4.73; darks all ≥ 5.1.

### Combinations (all Y1 Sidebar)

Each is the full Flow Inbox in dark at 1440 and 390 and light at 390 (`r2/img/combo/<n>-<w>-<theme>.png`, `runs/ysk4/tools/shots-r2.mjs`), plus a recorded demo of the D3 journey with a contact sheet. The top pick also has the phone in dark and light side by side at the same moment (just after a decision, Undo toast up: `1-phone-pair-{dark,light}.png`).

| | Mark | Scheme | Why | Watch for |
|---|---|---|---|---|
| **1 North light, night** ★ | N1 | K1 | Name, mark and colour tell one story; the slate-blue light is the only brand colour on a calm near-black page | The light patch is 2 px high at 16; the small cut thickens it, and N3 is the app icon |
| **2 Night sky** | N6 | K2 | The most typographic: a classic a in one line with a lit ball, on the deepest dark | A letter tells less story; the navy light mode is the most coloured |
| **3 Slate and aurora** | N11 | K3 | The maker's hand: a nib with the studio's window, lit cyan on neutral slate | Cyan is nearer the done green than slate blue is; a nib leans "writing app" |

**Top pick: Combo 1 (N1 + K1 + Y1).** N1 keeps what the owner liked in L8 from afar and adds the one thing it lacked, the patch of light on the floor, a crisp shape under a soft arch that says "the light is on, the work is going on" at a glance. K1 is C4 made dark first, so the slate-blue light is the only brand colour on a calm page and colour on content still only means working, done or needs you. Name, mark and colour tell one story, and N3 (the same window on a tile) is the app icon without a second idea. *Phone*: dark is the better default for night check-ins and OLED; light is soft enough for outdoors, so after first run the app follows the phone's setting.

### Hand-off: once the owner picks

1. **Tokens**: copy the chosen K block pair from `r2/schemes-k.css` (plus the shared mapping in `brand/schemes.css`) into `tokens.css`, with **dark as the default** `:root` and light under `[data-theme="light"]` (and `prefers-color-scheme: light` after first run, if the owner agrees).
2. **Mark**: export the chosen N mark and its small cut to `design/brand/mark.svg` and `mark-16.svg`, favicon `.svg`/`.ico` from the small cut, a 512 px app icon (N3 on the tile if N1 is chosen); outline the wordmark to paths.
3. **Shell**: fold Y1's rules from `brand/app/layouts.css` into `components.css` and drop the `data-layout` switch (Y1 is the only layout now).
4. **Other screens** (Office, project, task, settings, next task): drawn dark first in the chosen scheme, in Y1, with Flow's motion unchanged; each needs both modes shot, the sidebar's nav state for its section, and the working lilac on agent rows. Check `--surface-selected` meta text in light (the lowest pair, 4.73–4.76) wherever a row can be selected.
5. **Trademark search** on the chosen mark before public use.

### Critique log (Brand round 2)

**Round R2-1** (self-critique of the first sketches at 128 / 48 / 32 / 20 / 16 px, dark and light, `runs/ysk4/tools/mark-prev.mjs`).
- *Found*: N4 and N5 read as "d." (the stem rose above the bowl, as in L12); N7 (window with a small a and a dot) read as a camera or a washing machine; N2 (line arch, mullion, keystone) read as a bell at 16; N9 (two curved sails) read as the Sydney Opera House; the fanlight read as a sunrise.
- *Changed*: N4 and N5 stems start at the bowl's top; N5's notches made small ink traps; N7 rebuilt so the right jamb is the a's stem and the bowl is the lit thing in the window; N2 made a solid arch with a cut keystone and a sill; N9 became three teeth on one building with the glass lit; the fanlight moved to Set aside (11 marks, not 12).
- *Before/after*: `design/review/brand/r2/c1-before-marks-a.png`, `c1-before-marks-b.png` → `c1-after-marks.png`.

**Round R2-2** (first render of the pick page at 1440 and 390).
- *Found*: the page scrolled sideways at 390 (718 px): the open contrast table widened its grid track; the 1440 sidebar crop caught the edge of the main column; the top pick's mid-decision phone shot caught the cross-fade halfway (two items on top of each other); "Needs you" wrapped in the colour panels.
- *Changed*: grid children `min-width: 0` (the table scrolls in its own box); sidebar crop 248 × 108 (brand and the Inbox row); the phone pair waits 2.2 s, past the cross-fade and inside the toast's 6 s; meanings columns 170 px.
- *Result*: no sideways scroll at 390 or 1440, no console errors.

**Round R2-3** (design-critique skill on the combo screens: `r2/img/combo/*-1440-dark.png`, `*-390-*.png`, the phone pair and the sidebar crops).
- *Works*: the Y1 sidebar holds the mark at 20 px with the light patch still readable (N1 in K1); on every screen the only saturated colour is meaning (needs-you coral, working lilac, done green), so the page reads calm; the light phone is soft grey-blue, not white.
- *Found*: (1) On the phone, the budget item's amounts sat one line above their labels: the narrow-screen rule that stacks plain facts (`.facts dd + dt { margin-top }`) also hit the two-column money list. (2) On the phone, the item's meta line wrapped as "replay ·" / "25 min ago", leaving a dot dangling at the line end. (3) Combos 1 and 3 look nearly the same at 1440: by design the scheme shows only in the greys and the mark, and the owner could think they're duplicates.
- *Changed*: (1) `components.css` (the shared sheet, so it also applies to `screens/inbox.html`, where the amounts now line up with their labels too): `.facts.is-money dd + dt { margin-top: 0 }` at < 768 px. (2) `feel/shared/inbox.js` groups each separator with the item after it (`<span class="grp"><span class="sep">·</span>…</span>`), and `components.css` clips the strip left of the eyebrow (`--sep-clip`, `clip-path`), so a separator that starts a wrapped line is cut off: no line starts or ends with a dot. The clip is scoped to grouped markup only (`.eyebrow:has(> .grp)`), so it applies only to pages rendered by `feel/shared/inbox.js` (`feel/*/inbox.html`, `brand/app/inbox.html`, `brand/r2/app/inbox.html`). Eyebrows with bare `<span>` items (`screens/inbox.html`, `components.html`, round 1's `brand/index.html`) render exactly as before and still can end a wrapped line with "·"; the next screens should emit the grouped markup to get the fix. No change to Flow's motion.
- *Review fix*: the first version of the clip applied to every `.eyebrow` and cut the first 14.5 px off the first item on a wrapped line in ungrouped markup ("25 min ago" showed as "min ago" on `screens/inbox.html` at 390). Scoped as above; `runs/ysk4/tools/eyebrow-probe.mjs` checks all six pages at 320 and 390: no item starts left of its column except a separator inside a group. After: `design/review/brand/r2/c3-fix-eyebrow-screens-inbox-390.png`, `c3-fix-eyebrow-components-320.png` (full text, as on the D3 branch). (3) One sentence under Combinations on the pick page says why they look close and where to compare (sidebars, light phones).
- *Before/after*: `design/review/brand/r2/c3-before-budget-pair-light.png` → `c3-after-budget-pair-light.png`; `c3-before-eyebrow-390.png` → `c3-after-eyebrow-390.png`.

**Round R2-4** (accessibility-review skill; measured with `runs/ysk4/tools/a11y.mjs`, `reflow-r2.mjs`, `sw.mjs`, `toast-hit.mjs`).
- *Measured*: pick page at 390 and 1440 dark: no unnamed controls, no images without alt, every Tab stop shows the focus ring; the only "small" targets are the inert scheme samples (absent from the Tab order) and one inline text link (exempt as inline). Branded app in combos 1–3, dark and light, 390 and 1440: no unnamed controls, no small targets, Tab order skip link → nav → pager → details → note → decision buttons → queue, ring on every stop. Reflow at 320 and 720 (1440 at 200 %) in every combo and mode: no sideways scroll, one main, one h1, toast live region, lang set. Pick page at 320: no sideways scroll (the section nav and contrast tables scroll in their own boxes). Contrast: 276/276 pairs AA (`contrast-k.mjs`), re-measured live on the page.
- *Found*: the contrast tables' scroll boxes took keyboard focus (Chromium makes scrollers focusable) but had no name or role, so a screen reader announced a bare group of cell text.
- *Changed*: each `.contrast` box is `role="region"`, `tabindex="0"`, `aria-label="K1 contrast table, scrolls sideways"`.
- *Kept*: the "·" separators stay readable to screen readers; hiding them would run "replay" and "25 min ago" together.

## Chosen brand

**N1 Window and its light + K1 North light, night + Y1 Sidebar, dark by default** (ruling R-7, the owner's pick from round 2; it was the top pick, Combo 1). Everything from D5 on is built on it.

| Part | Choice | Where it lives |
|---|---|---|
| Mark | **N1 Window and its light**: a round arch over a sheared, sharp-cornered patch of light on the floor. Its small cut (no transom, heavier line, bigger patch) is used at 20 px and under | `brand/r2/marks.js` (`mark2('N1', size)`), crops in `brand/r2/img/bar/` |
| Colour | **K1 North light, night** (dark) and **North light, day** (light): slate near-black `#0b0e12`, surface `#141920`; cool paper `#edf0f3` / `#f7f9fa`. The slate-blue accent (`#8fb6e6` / `#2e65a1`) is only on the mark and the focus ring; on content, colour still only means working (lilac), needs you (red) or done (green) | `design/tokens.css` (now K1, dark in `:root`), source `brand/r2/schemes-k.css` |
| Layout | **Y1 Sidebar**: 240 px sidebar with the lockup, nav, projects and the plan/spend foot; phone tab bar | `brand/r2/app/inbox.html?logo=N1&scheme=k1` |
| Mode | **Dark by default.** First run is dark everywhere. After first run the phone follows the device's setting (`prefers-color-scheme`); the desktop stays dark until the owner changes it. A plain dropdown in Settings (Dark · Light · Follow the device) overrides both | Tokens: `:root` / `[data-theme="dark"]` = dark, `[data-theme="light"]` = light. The app sets `data-theme`; the tokens never guess |
| Motion | **Flow**, unchanged (R-5) | `design/feel/flow/` |

*Why* (from round 2): N1 keeps what the owner liked in L8 from afar and adds the one thing it lacked, the light on the floor: a crisp shape under a soft arch (the owner's "smooth curves against crisp edges") that says "the light is on, the work is going on". K1 is the C4 North light the owner liked, turned dark first, so the one brand colour on a calm near-black page is the light in the mark. Name, mark and colour tell one story. Dark suits night check-ins and OLED phones; the light mode is soft paper, never white, for outdoors.

Rationale, options and every render: `design/brand/r2/index.html` (the pick page), combo screens `brand/r2/img/combo/1-*.png`, demos `brand/r2/img/combo/combo-1-{desktop,phone}-dark.webm` with contact sheets `contact-1-*.png`.

**What changed in the system**: `tokens.css` colour roles are K1 (contrast measured from the file, `runs/6umt/tools/contrast-k1.mjs`: 0 text pairs under 4.5:1 in either mode; lowest light `--text-3` on `--surface-selected` 4.76, lowest dark 5.15; field borders 3.50 / 3.16, focus ring 8.41 / 5.69). New roles: `--brand-accent`, `--brand-knock`, `--wait`. The focus ring is now the brand accent, not lilac, so lilac means only working. Type, spacing, sizes, radii, motion: unchanged. Older pages that load `tokens.css` (D2 `screens/inbox.html`, `components.html`, D3 feels) now render in K1 too; their 2×2 grid mark is superseded by N1 and stays only for the record.

Still to do in the high-fi task (from the round-2 hand-off): export N1 and its small cut as `brand/mark.svg` / `mark-16.svg`, favicon and a 512 px app icon (N3 on the tile), outline the wordmark; fold Y1's rules into `components.css`; trademark search before public use (Open questions).

## UX (D5)

Ruling R-8: before any more screens, walk the owner through the whole UX, research first. **Open `design/ux/index.html`** (dark, N1 + K1, phone friendly). The owner reads it top to bottom and answers with one reply of numbered decisions (UX-1 … UX-15). Low-fi on purpose: high-fi screens come after the answers.

| File | What it is |
|---|---|
| `design/ux/index.html` | The walkthrough: research, site map, journeys, layout, information design, patterns, wireframes, decisions. `?open` opens every fold (for screenshots) |
| `design/ux/ux.css`, `ux.js` | Page styles (tokens and components only) and the renderer for the repeated parts |
| `design/ux/ia.js` | The site map's inventory table: every `inventory.md` line → its new home and what changes |
| `design/ux/refs.js` | The references board (16 cards) |
| `design/references/ux/` | The board's captures (public docs and product pages, headless) |

### Research

**Who**: a senior manager running a team of AI agents from desk and phone; reads plain summaries, decides, rarely debugs. **Jobs** (J1–J8): check in and decide; see what the team is doing; start a project; watch a task and its proof; control spend; review a design or milestone; recover when something fails; correct the lead.

**References** (captured headless from public pages, R-2; Mobbin is still paid): Linear inbox, triage, snooze, mobile and agents; GitHub Actions run graph and failed step, PR header, deployment reviews, GitHub Mobile agent sessions; Vercel status set, redeploy confirm, deployment summary; Devin progress and replay; Zapier run history; Raycast palette. Take / avoid / job per card on the page (`ux/refs.js`).

**Synthesis** (ten findings, each with what it means for us):
1. One queue, triaged by urgency, that you can empty → one Inbox, two groups, no filters, calm zero (J1).
2. Status is a dot and a word from a short fixed list → four meanings everywhere: Working (lilac), Needs you (red), Done (green), neutral for Waiting, Stopped, Off (J2, J4).
3. Progress is a shape, not a counter → a task shows its stage, the latest step and when it was last active (UX-5, J4).
4. Failures open at the failure → a failed task opens on what went wrong in one sentence and what the lead is doing about it, log under Details (J7).
5. Approving shows the thing and asks for words only to say no → as D2 (J6).
6. Confirm only what can't be undone; undo the rest (UX-10).
7. The phone is a companion → Inbox, Office, project Now and task page first-class (UX-2).
8. Agents are teammates with a place → a desk per agent, a page per task; logs only under Details (UX-8).
9. History is a list: status, one line, time → Activity as one feed, project filter and Only problems (UX-13).
10. Keyboard first on the desk → ⌘K palette, J/K, Enter, Z, G then I/O/P/A.

### Information architecture

Two levels. **Global** (all projects): Inbox (home, UX-1), Office, Projects, Activity, New project, Settings (plan limits, appearance, this device; UX-3). **Per project** `#/p/<project>`: header (name, lead menu, GitHub only when wrong), Now (needs you here, working now, phase track, next step; UX-6), Money, then tabs Overview · Tasks · Outcomes (was Criteria, UX-14) · Audits · Docs · Activity · Settings. **Task** `#/t/<task>`: status, Now, Proof, dock only when it needs you, History/Notes/Facts folded. **Around every screen**: sign in, ⌘K palette, toasts, view port, stale/offline/error.

Navigation: Y1 sidebar ≥ 1280 (240 px: lockup, Inbox/Office/Activity with counts, projects with lead dot and waiting count, New project; foot: plan, spend today, Settings), 64 px rail 768–1279 (UX-7), phone top bar (mark, today's spend as text, Settings) + tab bar Inbox · Office · Projects · Activity (UX-2).

**Coverage (R1, AC-9)**: all 95 lines of `inventory.md` are mapped in `ux/ia.js` and shown in the page's site map; `runs/6umt/tools/ia-check.mjs <worktree>` checks it line by line (95 of 95, none missing, none invented). 31 lines change where they sit or how they work; each names the decision behind it.

### Journeys (`ux/flows.js`, page §3)

Seven flows, each as screens → state → what you do → taps, with failure paths keyed to the step they branch from. Only actions that exist today (`inventory.md`).

| # | Journey | Jobs | Cost |
|---|---|---|---|
| 1 | Morning check-in on the phone | J1 J2 | 3 taps for two decisions; 1 when nothing needs you |
| 2 | Deciding a gate with its proof | J6 J1 | 2 taps and a few words |
| 3 | New project from a brief | J3 | 4 taps and the form; the rest arrives in the Inbox |
| 4 | Watching a task and its proof | J4 J2 | 2 taps from the Office |
| 5 | A task fails or pauses for the lead | J7 J8 | 1–2 taps to answer; 0 when the lead handles it |
| 6 | Budget warning and limit | J5 | 1 tap to raise; 0 to wait for midnight |
| 7 | The owner corrects the lead | J8 | 2 taps and a sentence (reject with a note → ruling); restart last |

Failure rules common to all: an action that fails keeps your choice and your text, says why in the dock, offers Try again, and the item stays; offline keeps the last screen with "Last updated hh:mm · Retrying" and disables decide buttons with the reason; "quiet for longer than usual" is neutral text, never red.

### Layout system (page §4)

One fluid reading column (content ≤ 760 `--size-focus-max`, text ≤ 62ch `--measure`) plus at most one fixed column: the Inbox queue 344 (`--size-queue`) or task facts 280. *Why*: the owner reads one thing and decides; more columns ask them to scan.

- Widths: desk ≥ 1280 (sidebar 240, panel inset 8, padding 32) · middle 768–1279 (rail 64 per UX-7, padding 24, queue beside from 1024) · phone < 768 (top bar 52, tab bar 56, padding 16).
- Density: desk rows 36 / 52 (two lines), controls 36; phone rows ≥ 44 / 60, controls 44; reading text 16/24. Gaps: blocks 24, sections 32 (phone 16 / 24).
- Five screen types: queue and item (Inbox), board (Office: desks min 280, 3 / 2 / 1 a row), list (≤ 960: Projects, Activity, Tasks, Outcomes, Audits), page with facts (project, task, Docs), form (≤ 640: New project, Settings with a 200 section list).
- List + detail only for the Inbox; everything else is a page with its own address and a back link (task peek is UX-4).
- Dock: foot of the reading column (desk, sticky 20 from the panel edge), 8 above the tab bar (phone); on a task page only while it needs you; never two. Toasts: rise out of the dock and cover only it; with no dock, bottom centre of the content column (phone: 8 above the tabs); one at a time, 6 s, paused on hover or focus.

### Decisions (numbering fixed; options and recommendations are on the page)

UX-1 what opens first · UX-2 phone tabs · UX-3 where global settings live · UX-4 opening a task (full page or a peek) · UX-5 how task progress reads · UX-6 the top of a project page · UX-7 navigation between 768 and 1279 px · UX-8 the Office layout · UX-9 where spend and plan sit · UX-10 confirm or undo · UX-11 an early budget warning · UX-12 new project: form or brief · UX-13 Activity filters · UX-14 "Criteria" becomes "Outcomes" · UX-15 notifications when the app isn't open.

## Open questions

- **D4: trademark search** for the logo the owner picks (USPTO / EUIPO image search, or a lawyer). Outward-facing, so not done by an agent.
- **D4: working stays lilac in every scheme** (SPEC R4 names lilac). If the owner wants a scheme whose accent replaces lilac as the working colour, R4 changes: lead's call.

These are for the lead. They touch what the server sends, or they add scope.

- **Mobbin** needs a paid plan, so the connector returned nothing. I used the products' public pages instead. The question is in QUESTIONS.md, with the free option as the default.
- **Pictures inside a design gate.** The hero and strip need the gate item to list a few screenshot files from the design branch (with captions), plus a count for "+10 more". Today the item only carries the link to the clickable screens. Same as D1's open question.
- **Proof inside an owner judgement.** The item needs the evidence (screenshots, recording length, run log) of the task that delivered that outcome. Today only `/api/task/<id>` has it.
- **Suggested answers to a question.** These need the agent to offer them in QUESTIONS.md. Without them, the item shows only "Write your own answer".
- **Budget breakdown.** The per-task split of today's spend ("Trim editor $18.40 …") must come from the R2 summary, not be added up on the client.
- **Undo** needs a short grace period on the server, or a reverse action for each decision. If neither is possible, the toast shows no Undo (the dock's sent state already has none). That is a behaviour change, so it is the lead's call.
- **D3: the owner picks the feel** at the gate (`design/feel/index.html`); I recommend Flow. The next screens are drawn in the chosen feel.
- **D3: Decided today in the queue.** The last three decisions now sit at the foot of the queue on every view (they were only on inbox zero). The server already returns today's decisions for the zero view; it's the same data. A small layout change, flagged so the lead can veto it.
- **D3: the dock sits at the foot of the focus column** for every item, not right under short items. Layout change in favour of "the dock never moves"; same components.
- **D3: the Undo window pauses while the toast is hovered or focused.** Needs the server's grace period (above) to allow a little longer than 6 s, or the client holds the request until the toast closes.
- **D5: no Retry on a failed task.** Today's dashboard has no retry, resume or extend action (only approve plan, answer, stop). Journey 5 shows the lead re-planning. A Retry button would be a new action: the lead's call.
- **D5: early budget warning** (UX-11) at 80 % of a project's daily budget needs the server to raise a new, low-urgency Inbox item. New behaviour: the lead's call if the owner picks it.
- **Two groups** ("Needs you now" / "When you have a minute") assume the server marks urgency (`priority ≤ 1` or a high-severity finding, as today's red rule does). That is the same rule; it is now shown as a group.
