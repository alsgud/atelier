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
| `--spring-soft` (+ `-dur` 660 ms) | stiffness 160, damping 20, ratio 0.79 | long flights (Flow's title to Decided today) |
| `--spring-glide` (+ `-dur` 700 ms) | stiffness 170, damping 26, critically damped | big surfaces arriving, no bounce |
| `--shift-sm` / `--shift` / `--shift-lg` | 4 / 8 / 24 px | quiet / default / spatial travel |
| `--press-scale` / `--press-depth` | 0.97 / 1 px | pressed controls |

D2's `--ease-out` and `--ease-in-out` stay for components that already use them. Springs are CSS `linear()` curves generated from the physics (`runs/57cv/tools/spring.py`), so frontend needs no animation library; the duration is part of the spring and always travels with it.

### What moves and what never moves

| Moves | Never moves |
|---|---|
| The item in focus, when it changes (leave, arrive) | The item while you read it; the text you type |
| Queue rows closing a gap or making room (≥ 1024 px only, where the queue is beside the item) | The dock's position; the sidebar, top bar, tab bar |
| A title flying between queue, focus and Decided today (Flow, ≥ 1024 px) | Counts: they change in place (Crisp rolls the digit within its own box) |
| The toast (rises from the dock it anchors to) | The scroll position, except to the top when the next item opens |
| Ticks (stamp, pop or fade), progress bars and figures | Anything when nothing happened |

### Choreography of one decision (all feels)

`press` (`--dur-instant`) → **Sending…** on the button pressed (latency) → **sent, held in place**: the dock turns green with what happens next, the queue row turns green, the tick appears (`--dur-hold`) → **one transition**: the old item leaves (`--dur-fast`), queue rows close the gap, the decision lands in **Decided today** (new at the foot of the queue, above Working now), the next item arrives (eyebrow + title, then body, `--stagger` apart), the dock's words cross-fade → **toast** with Undo (`Z`), focus on the new title. Undo is the same transition in reverse. Leader: the thing you touched; followers: the queue, then the next item; last: the toast.

*Why Decided today moved into the queue*: a decision needs somewhere to go. D2 only showed the ledger at inbox zero; now the last three sit under the waiting items ("Decided today 2"), so the eye (and Flow's title) has a destination, and zero no longer introduces a new list.

### The three feels (`design/feel/`)

Same layout, content and journey; they differ in feel. Each refines D2's finish the same way (`feel/shared/feel.css`): icon stroke 1.75 on the 24 grid (1.17 px at 16, the stem of 14/500 text; D2's 1.6 read thin); typographic quotes, apostrophes and non-breaking hyphens in all copy; the serif title pulled back 0.03 em so its stem lines up with the eyebrow; the queue glyph centred on the title's first line; tabular figures everywhere a number changes; a focus ring plus a soft 16 % halo; preview frames with an inner 7 % hairline and concentric corners; a filled green tick in the sent dock and on zero; a toast with a visible Undo countdown (2 px life bar) and a `Z` key hint; inbox zero with more air, the line a third of the way down, Working now under a hairline.

| | **Calm** | **Flow** (recommended) | **Crisp** |
|---|---|---|---|
| In a sentence | Things stay where they are; what changes, fades | Every item is a thing with a place | Every action clicks |
| Next item | Old fades `--dur-fast`; new rises `--shift-sm` over `--dur-slow`, 80 ms later, body `--stagger` after | Desktop: the decided title flies into Decided today (`--spring-soft`) while the next title rises from its queue row into the focus; the rest slides in `--shift-lg` from the side you're going (`--spring-glide`). < 1024: the item slides like a card, out left, in right | Old out `--dur-fast`; new in `--shift` over `--dur-base`, no stagger; J/K slide 8 px in their direction |
| Queue rows | Close the gap over `--dur-slow`, `--ease-move` | `--spring-snappy`; removed rows shrink to 0.96 | `--spring-snappy` with overshoot; removed rows slip right 8 px |
| Press / hover | Colour only; hover eases `--dur-base` | Scale 0.97, springs back; frames lift 2 px on hover | 1 px depth and the shadow closes; hover in `--dur-instant`; ink edge on the current row |
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

- **Only `transform` and `opacity` animate**, on our elements and on the view-transition images. Measured (`runs/57cv/tools/motion-audit.mjs`, all animations sampled every frame during a decision): our elements animate only transform and opacity (plus a 120 ms background-colour transition on button hover).
- **The one exception, by design:** view-transition *groups* interpolate their box (width, height) to morph. For rows the size doesn't change; Flow's title flight does change size. Measured with a Chromium trace of one decision at 1440: Calm 13 layouts (9 ms in total), Crisp 13 (9 ms), Flow 159 (18 ms in total, ~0.12 ms per frame): well inside a 16.7 ms frame.
- **60 fps:** with no recorder running, rAF frame times during transitions: Flow 2 of 2,563 frames over 25 ms, Crisp 1 of 1,200; worst 33 ms, the one snapshot frame at the start of a transition. Each decision has two main-thread tasks of 19–28 ms (re-render + snapshot), both before the animation starts. Frontend should update the DOM in place (not re-render the page) to bring those under 10 ms.
- No `filter`, `backdrop-filter` (except the static play pill), `box-shadow`, `width`, `height`, `top` or `left` animation on our elements; no layout reads inside animation frames; images decode async.

### For frontend

The mockup uses the browser's **View Transitions API** (same-document; Chromium 111+, Safari 18+, Firefox 144+); where it's missing, changes apply instantly (still correct, just not animated). Name the parts as `feel/shared/inbox.js` does: `ih` (eyebrow + title), `ib` (body), `dock`, `head`, `page` (Office), `empty`, `zero-work`, rows `q-<id>`/`l-<id>`/`h-*` with class `row` (≥ 1024 only), titles `t-<id>` with class `title` (Flow, ≥ 1024 only); set `data-vt=<open|next|prev|decide|undo|tab|zero|retry>` and `data-dir=<fwd|back>` on `<html>` for the duration. The chosen feel's `<style>` block is then the whole motion spec.

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

## Open questions

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
- **Two groups** ("Needs you now" / "When you have a minute") assume the server marks urgency (`priority ≤ 1` or a high-severity finding, as today's red rule does). That is the same rule; it is now shown as a group.
