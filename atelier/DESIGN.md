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
- **Office, Projects, Project page, Task page, New project, Settings, Activity**: high-fi in D6, see **Screens (D6, high-fi, PROVISIONAL)** below and `design/screens2/index.html`.

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
| `design/ux/flows.js`, `decisions.js` | The seven journeys (§3) and the fifteen decisions (§8) |
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

### Information design (page §5)

One look per thing, on every screen; every figure from the one summary (R2).
- **Project**: name, then one sentence (phase · outcomes met · what needs you); lead dot lilac when on, hollow when off. Same row in Projects, sidebar (name + waiting count), Office floor heading. Repo only when wrong.
- **Task**: its title in the owner's words, then project · stage · last active. Status = dot + one word: Working (lilac), Needs you (red), Done (green), neutral Waiting / Stopped / Off. ID, branch, files, PR under Details.
- **Decision**: eyebrow (project · kind), serif title as the question in a sentence, the thing itself, dock with result-named verbs ("Raise today to $60"). Two groups: Needs you now (red count), When you have a minute (neutral).
- **Proof**: pictures first, 16:10, captioned; recording with length; run-log tail under Details; always from the view port.
- **Money**: dollars and cents, tabular, "of" the limit; a meter only against a limit; red only at the limit; "API-equivalent, not a bill" once, in the breakdown.
- **Progress**: task = stage track (Planning · Building · Checking · Review · Done) + latest step + last active (UX-5); project = phase track + outcomes met. Quiet-too-long is neutral text.
- **Time**: "1 min ago" under an hour, "14:02" today, "Mon 14:02" this week, "12 Oct" older; exact time in the tooltip.
- **States**: four rules (skeleton on first load only, counts hidden until known; empty = one sentence + at most one action; error = what happened + what next, inside the page, neutral if it retries, red only if the owner must act; stale = "Last updated 08:12 · Retrying", decide buttons disabled with the reason) and a table of empty / loading / error for all 11 screens and regions.
- **Plain words (R3)**: eight rules with today → becomes examples (no IDs in the first line, say what it means for you, buttons say what happens, the owner's words, numbers as said, name the project, sentence case).

### Interaction patterns (page §6)

- **Motion**: Flow, unchanged; a table per pattern (decide, undo, J/K, page open, tabs, live figures, toast, folds, invalid note, inbox zero) with its token and the reduced-motion version (cross-fade or fade, hold kept).
- **Keys**: ⌘/Ctrl K palette · J/K · Enter (open; in the Inbox, to the dock) · ⌘ Enter sends the dock's main action · Z undo while the toast is up · G then I/O/P/A · Esc · ?. Single keys never act while typing; no key decides on its own.
- **Undo vs confirm** (UX-10): decisions instant with Undo (6 s, paused on hover/focus); skip a phase needs a reason in the dock; stop task, stop/restart lead, run audit confirm in one sentence with result-named buttons, the safe one focused, Esc = safe; settings save on change with Undo.
- **Live (R7)**: every 15 s and on tab return, in place; scroll, folds and typing untouched; the open Inbox item is never swapped; "You decided this on another device"; rows never reorder under the pointer.
- **Notifications**: in-app count (red only for Needs you now), tab title "(2) Atelier", favicon dot; toasts only answer the owner's own action; outside the app is UX-15.

### Wireframes (page §7, `ux/wf/`)

- One engine, one page per screen: `ux/wf/wf.js` + `wf.css` (tokens.css and D2 components for chrome, controls and dots; content is plain type on hairlines). Pages: `inbox.html` (also `?state=zero`), `office.html`, `projects.html`, `project.html`, `task.html`, `new.html`, `activity.html`, `settings.html`. They link to each other, so the owner can click through.
- Three plans per screen, from the layout system: sidebar 240 + inset panel (≥ 1280), 64 px rail + full-bleed panel (768–1279, UX-7 A), top bar 52 + tab bar 56 (< 768). The dock is sticky at the foot of the reading column and 8 above the tab bar on the phone, with a fill under it so nothing peeks out.
- Each is drawn with the recommended answers (UX-1 A Inbox first, UX-3 A global Settings, UX-5 A stage + latest step, UX-6 A "Now" first, UX-8 A floors and desks, UX-9 A money in the chrome, UX-12 B growing description, UX-13 A filters). If the owner picks differently, only `wf.js` changes.
- Dashed blue mono labels (`.wf-note`, `--brand-accent`) name each region and its size; `?clean` hides them, `?shot` puts sticky bars in flow for full-page shots.
- Real content, one data set: 7 waiting (2 now), 3 working, $52.60 today, plan 41 %, replay at its $40 limit, dodge's design gate with the lead off; proof pictures are replay's and dodge's real screens (`screens/img/`).
- Shots: `runs/6umt/tools/wf-shots.mjs <worktree> <out> [widths]` renders 1440 / 768 / 390 full page plus the phone's first screen (`-390v`), and reports console errors, sideways scroll and broken images. §7 embeds the 1440 full page and the 390 first screen from `ux/img/`. Result: 0 errors, 0 broken images, no sideways scroll (the project tabs row scrolls by itself on the phone, by design).

### Decisions (page §8, `ux/decisions.js`)

Each card: the question, why it matters, 2–3 options (schematic picture where it helps), the recommendation marked in words and with the accent border, and why. A "Your reply" block prefills the recommendations as one line with a copy button.

| # | Decision | Recommended |
|---|---|---|
| UX-1 | What opens first | A: the Inbox, always |
| UX-2 | Phone tabs | A: Inbox · Office · Projects · Activity (Settings and spend in the top bar) |
| UX-3 | Settings that cover every project | A: one global Settings + a Settings tab per project |
| UX-4 | Opening a task | A: full page with its own address (B: desk peek) |
| UX-5 | Task progress | A: stage, latest step, last active |
| UX-6 | Top of a project page | A: Now first, figures in one line |
| UX-7 | Nav at 768–1279 | A: 64 px rail |
| UX-8 | Office | A: a floor per project, a desk per agent |
| UX-9 | Spend and plan | A: quietly in the chrome (sidebar foot / phone top bar) |
| UX-10 | Confirm or undo | A: instant with Undo; confirm only the irreversible and the costly |
| UX-11 | Early budget warning | C: words on the money line at 80 %, no new Inbox item (B is new scope) |
| UX-12 | New project | B: same form, the description can grow into a brief (same field and action) |
| UX-13 | Activity filters | A: project picker + Only problems |
| UX-14 | Criteria → Outcomes | A: Outcomes |
| UX-15 | Outside the app | A: nothing for now (B push is new scope) |

### Critique log (UX)

Before / after pairs in `design/review/ux/before/` and `after/` (same file names). Renders: `runs/6umt/tools/wf-shots.mjs` (27 renders) and `el.mjs` on `index.html?open`, dark, 390 and 1440, reduced motion.

**Round U1 (design-critique on the walkthrough and the eight wireframes)**

| Found | Changed | Why |
|---|---|---|
| The walkthrough is 66 000 px tall on the phone and its first screen gives no sense of what changes or how long it takes | An "In short" box under the lede: the five biggest changes, "about 25 minutes", "all as recommended is a full answer", and **Go to the 15 decisions** (44 px on the phone). `ux-390-top.png` | The owner reads this on the phone between other things; they should be able to answer without reading it all |
| Stage and phase tracks were drawn as five outlined pills in the wireframes (the task's wrapped, "Done" alone on a second line), while §5 defines them as segments | `.wf-track` now uses the §5 specimen's segments exactly (3 px, 2 px gaps, done `--text-3`, now `--active`, ahead `--surface-selected`, labels `--text-xs`). `wf-task-390v.png`, `wf-project-390v.png` | One look per thing (R2, §5); AC-7 "no clutter of pills" |
| Office desks used words outside the fixed list: "Auditing", "On duty", "Idle" | Working, Waiting, Waiting; the lead's line says what it is waiting on ("Asked you how the toast should read · 25 min ago · in your Inbox"). `wf-office-1440.png` | §5: a status is a dot and one of four words, everywhere |
| On the phone the project's facts table (four rows) sat above "Now", against UX-6 A | Project facts are a closed **Facts** fold on the phone, as on the task page; open beside the column on the desk, one line under the header at 768–1279 | "Now" is the first thing on a project page at every width |
| Queue titles cut after one line at 344 px ("Should the toast say the time, or "j…") | Two lines before they cut, `text-wrap: pretty`; the dot and the time align with the first line. `wf-inbox-1440.png` | Queue items are questions; half a question doesn't help triage |

**Round U2 (accessibility-review, measured with `runs/6umt/tools/a11y.mjs`: names, tap targets at 390, Tab order and focus ring, alt text)**

| Found | Changed | After |
|---|---|---|
| Phone targets under 44: back links 65×20, header and Now buttons 36 tall (Lead, Review the budget, New project), the task menu 42×36, the Docs tab 31 wide, "All activity" 20 tall, inputs and the dock note 38 | Phone rules in `wf.css`: back links, `btn-sm`, section links, inputs and textareas are `--size-control-lg` (44); icon buttons 44 wide; tabs at least 44 wide and never shrink (the first try let them overlap; caught in the render, fixed with `flex-shrink: 0`) | 0 small targets on office, projects, project, task, activity |
| Journey index links in §3 were 35 tall on the phone | `#flows-index td > a` 44 tall on the phone | none left outside running text |
| Remaining small ones | Kept, on purpose: links inside sentences (UX-n references, "section 8", "Sign out") use the WCAG 2.5.8 inline exception; the Inbox eyebrow's project link (37×18) has no other target within 24 px (spacing exception); checkboxes are 18 px but their whole label is the target (≥ 44 tall) | — |
| Unnamed: the tool flagged `#n-name`, `#s-5h`, `#s-wk` | False positives: each has a `<label for>` | — |
| Focus | Every Tab stop shows the ring on all eight wireframes and the walkthrough (first 30 stops each) | 0 without a ring |
| Contrast of the region notes (`.wf-note`, `--brand-accent` 11 px mono) | Measured: 9.21 on `--bg`, 8.41 on `--surface`, 6.91 on `--surface-selected` | passes AA |
| Images | 0 without alt; 0 broken; 0 console errors on 27 renders and the walkthrough at 390 / 1440; no sideways scroll except the project tab row (scrolls by itself, by design) | — |

### Hand-off: what the high-fi task needs once the owner answers

1. The owner's reply (UX-1 … UX-15). Anything not mentioned = the recommendation. Only `ux/wf/wf.js` changes for a different pick; redraw the affected wireframe first, then go high-fi.
2. The lead's rulings on the D5 open questions below (no Retry action; early budget warning; long description at New project; push notifications), because UX-11 B, UX-12 B and UX-15 B depend on them.
3. Build on: `tokens.css` (K1 dark default), `components.css` (D2), Flow motion unchanged, the N1 mark from `brand/r2/marks.js`. Screens in the order of the journeys: Inbox (with zero, stale, offline, error, sent, undo), task page, project page, Office, Projects, Activity, New project, Settings; then palette, sign in and toasts.
4. Keep the layout system's numbers (§4) and the one-look rules (§5): status words, track, money line, time format. Every number from the D3 summary figures (F1–F6, P1–P4, T1).
5. Per screen: 390 / 768 / 1440 in dark and light, every state from the §5 table, `a11y.mjs` in every open state, toast-hit at 5 viewports, two critique rounds with before/after.

## Screens (D6, high-fi, PROVISIONAL)

**Open `design/screens2/index.html`.** Every screen high-fi in the chosen brand (N1 + K1, dark first, Y1, Flow), drawn on the **recommended** UX answers because the owner hasn't replied to UX-1 … UX-15 yet. The index lists each decision used and which screens use it; each screen carries a `PROVISIONAL · drawn on UX-n …` flag at its foot (hidden in `?shot` and `?demo`). Build order, core first: Office, Project page, Task page, Inbox, then Projects, Activity, New project, Settings. Status: **all eight screens done** (Office, Project page, Task page, Inbox, Projects, Activity, New project, Settings), plus **Sign in** and every project tab filled in (round S7). **Every one of the 95 lines of `design/inventory.md` has its high-fi home**, listed with its proof in `screens2/coverage.js` and checked by `runs/pjv7/tools/s2-cover.mjs` (95 of 95; see Inventory coverage below).

| File | What it is |
|---|---|
| `screens2/index.html` | Index: provisional decisions, every screen with links at 1440 / 768 / 390 × dark / light, demos |
| `screens2/frame.html?src=<screen>.html&w=<w>&theme=<t>&state=<s>` | Viewer: one screen at a chosen width, mode and state |
| `screens2/hf.js`, `hf.css` | The shell for every screen: Y1 sidebar ≥ 1280, 64 px rail 768–1279, top bar + tab bar < 768; live line, neutral load error, empty, figure tick |
| `screens2/<screen>.html` + `<screen>.js` / `.css` | One screen each |
| `ux/wf/wf.js` › `window.ATELIER_MODEL` | **The one data model**: UX picks, the one summary (NOW), projects, Office floors and desks. Wireframes and high-fi screens both read it, so a different answer changes here once |
| `screens2/media/` | Demo webms and contact sheets |
| `screens2/img/`, `review/screens2/` | Index thumbnails; critique before/after |

Query on every screen (mockup only): `theme=light` · `motion=reduce` · `state=loading|empty|error|stale` (`empty` = first run, no projects; the Inbox's own empty is `state=zero`) · `shot` · `demo` (`demo=loop` repeats).

### Shell (every screen)

- Chrome from the one summary: sidebar Inbox count (red), Office "3 working" (lilac), projects with lead dot and waiting count, foot: Claude plan 41 % meter + "Spent today $52.60" (UX-9 A). Rail: icons with count badges, project initials with lead dot, Settings at the foot (its label carries plan and spend). Phone: top bar (lockup, "Today $52.60", Settings), tab bar Inbox · Office · Projects · Activity (UX-2 A).
- Page head 52 (`--size-topbar`), sticky on desk and middle: title 14/600, summary 13 `--text-2`, live line at the right 12 `--text-3`: "Updated just now", or when stale "↻ Last updated 14:02 · Retrying".
- Loading and error hide every count in the chrome (`–` in the money lines); first run shows no projects and $0.00.
- Load error is **neutral** (`.hf-notice`, sunken surface, refresh icon): "The Office didn't load. Trying again in 15 s. Your agents keep working while this page is away." + **Try now** (busy: "Trying…"). Not red: the owner has nothing to do (§5).
- Live figures change in place: the new value rises 4 px over `--dur-slow` (`.is-tick`, `--ease-enter`); reduced motion: no travel.
- **Browser tab title** carries the waiting count, as today: "(7) Inbox · Atelier", "(7) replay · Atelier"; it ticks as you decide in the Inbox; no count while loading or when nothing waits.
- **Installable as a phone home-screen app**, as today: keep `manifest.webmanifest` and `apple-mobile-web-app-capable`; the icon is the N1 mark on the K1 night background. Settings › This device says how ("open it there, paste your access token once, and add it to the home screen").
- **Reload on a new version** stays silent, as today (`overview.version`); Settings › About says "The dashboard reloads itself when a new version is installed."
- **Narrowest width 360**: every screen, item kind and dock fits 360 with no sideways scroll. A dock row wraps (`.dock-row { flex-wrap: wrap }`): two long labels ("Approve the new wording" + "Open the charter") put the second button on its own line, and a dock with nothing to decide wraps its sentence (round S7).

### Office (`screens2/office.html`; UX-8 A, UX-9 A, UX-7 A, UX-2 A)

*Idea*: the N1 mark at room scale. Every desk has a small night scene: an arched window whose light is on while the agent works, the light's sharp sheared patch on the floor, a desk with a laptop, the agent behind it, and one thing on the wall that says the role (designer: a framed arch; auditor: a checklist; builder: boxes on a shelf; reviewer: books; lead: a plan board). Colour keeps its four meanings: **light on (lilac) = working**, **hand up + red dot = needs you**, **light off = waiting**, **empty desk = off**; finishing turns the window **green with a tick** for a moment. A legend says this once at the foot. *Why*: R12 asks for the office's spirit, playful and clearer; one glance across the lit windows answers "who is working" before reading a word, and it is the brand's own picture, not clip art.

- **Head**: "Office · 3 working · **2 need you** · 6 on duty" (red part only when > 0), live line right. Spend is not repeated (it's in the chrome, UX-9 A).
- **Floor** per project, busiest first (`--space-10` apart desk, `--space-8` below 1280): name 20/28 600 (link to the project; 16/24 on the phone, 44 tall target), a **window strip** (one 9 × 12 arch per desk, same four colours, `aria-hidden`), then "2 working · $12.60 today" 13 `--text-2`; at the limit "…$40.00 today, **at its limit**" (red words, UX-11 C wording on the money line).
- **Desk** card (`.desk`, a link to the task, Inbox item or project): radius `--radius-md`, hairline; scene 108 tall on `--surface-sunken` with an 18 px floor band; body padding 12 16 16: role 13/600 + status dot and word right (lilac / red / `--text-2` / green); what it's doing 16/24 500; latest step 13 `--text-2`; working desks a 3 px track (`--active` on `--active-track`) and "Step 4 of 6 · 4 min ago" 12 `--text-3`. Grid `minmax(280px, 1fr)`: 3 a row at 1440, 2 at 768. Hover: border `--border-strong`, lifts 2 px with `--shadow-2` (`--spring-snappy`); press 0.985.
- **Stuck signal**: a working desk quiet longer than usual keeps its light on but low, and its step line reads "Quiet for 38 min, longer than usual" in `--text` (neutral, never red).
- **Quiet project** (nobody working, lead off): one line under a hairline, its strip all dark: "dodge · Lead off · nothing running · the design waits for your OK in the Inbox · $0.00 today". When something there needs you now, the line says so in red after the name ("● **1 needs you now**", `.fq-needs`), so the head's "2 need you" adds up on the floors at a glance (S7).
- **Phone**: one column; a desk is a row, the scene a 96 px tile on the left (window, agent and raised hand; the wall prop is cropped), words beside it.
- **States**: loading = two floors of skeleton desks, counts hidden; first run (`empty`) = an outline of the building with dark windows, serif "No one is working yet." + "Start a project and its team moves in here: one floor for the project, one desk for each agent." + **New project**; error = the neutral notice; stale = the live line says so, lit windows dim to 40 % and no dot pulses (we don't know the lights are still on).
- **Motion** (Flow; only opacity and transform): agent starts → light fades in (`--dur-slow`, `--ease-enter`), the patch grows from the window sill (`scaleY` 0.2 → 1, `--spring-soft`), the dot starts its pulse, the words rise 4 px; finishes → green pane and tick pop (`--spring-snappy`), held ~2 s, then the light goes out over `--dur-slow`; the track springs (`--spring-soft`); a raised hand swings up from 30° (`--spring-snappy`). Counts in head, sidebar and rail tick in place. Nothing re-renders; scroll stays (R7). Reduced motion: fades only.
- **Accessibility**: each desk link has one sentence as its name ("Designer, Working. High-fi Inbox and Office screens. Drawing the Office floor at 390. Step 4 of 6, 4 min ago"); scenes and strips are `aria-hidden`; the legend is a labelled list.
- **Demo**: `media/office-{desktop,phone}-dark.webm` (12–14 s) + `contact-office-*.png`: replay's builder finishes (green tick, back to waiting), the reviewer's light comes on, the auditor's quiet spell ends, the designer moves to the next step; "3 working" → 2 → 3 everywhere.

### Project page (`screens2/project.html`; UX-6 A, UX-14 A, UX-3 A, UX-11 C)

*Idea*: the page says what is going on in a sentence before it shows a number (UX-6 A). The figures underneath confirm the sentence; the phase track shows the milestone, and the current phase is split into its outcomes, so "4 of 9 met" is something you can see fill. Variants: `?p=replay` (default: at its budget limit, one task building), `?p=atelier-ui` (two agents working, one of them quiet; a question waits), `?p=dodge` (lead off, the design waits), `?p=tidepool` (created a minute ago: the page's empty state), `?tab=tasks|outcomes|audits|docs`, `?ui=menu|stop` (lead menu, stop confirm).

- **Head** (sticky 52): "‹ Projects" (13 `--text-2`), name 14/600 (phone 20/28 on its own line), lead state "● Lead on" 13 lilac (off: hollow dot, `--text-2`), then the one lead control (R16): on → **Lead ▾** menu with *Restart the lead* ("It picks up where it left off", instant, toast) and *Stop the lead…* ("Running tasks finish first", confirms); off → **▷ Start the lead** (busy: "Starting…"). Live line at the right. *Restart has no confirm* (UX-10 A: it is undoable in effect, the lead picks up where it left off, and today's confirm guarded nothing the owner could lose); it shows a toast. Only Stop confirms. If the owner answers UX-10 "confirm each", Restart gets the shared confirm too.
- **GitHub status** (inventory: header): fine is quiet, a fact in *How it runs* ("GitHub · On GitHub"). A problem is red in the head after the name, with the blocked icon: **⊘ Not on GitHub** (13/500 `--needs`; phone: on the lead line), and its reason in *How it runs*: "Not on GitHub: the sign-in on this PC expired, so pushes fail. Atelier tries again every 10 minutes." Variant `?p=atelier-ui&gh=off`. Hidden for projects that ship to local branches only (nothing to reach), as today. The same problem is also the Inbox's *Blocked* item (no button).
- **Section tabs** under the head (44 tall, sticky under it on desk and middle; scroll sideways on the phone, never wrap, each ≥ 44 wide): Overview · Tasks 2 (open) · Outcomes 4/9 · Audits 1 (open findings) · Docs · Activity (→ Activity filtered to the project) · Settings (→ the project's settings, UX-3 A). Counts `--text-3`, hidden until known.
- **Layout** (page with facts): desk = reading column ≤ 760 (`--size-focus-max`) + facts 280, gap 48 (`--space-12`); the facts column is sticky under the tabs. Middle = one column, facts right under Now as a 2 × 2 grid between hairlines. Phone = facts fold "Money and facts · **$40.00 of $40 today**" (52 tall, closed), right under Now.
- **Now** (R13): label "Now" 12 `--text-2`; one serif sentence 30/36 (`--font-display`, phone `--text-xl-phone`), max 24ch: "Today’s $40 is used, so new work waits."; lede 16/24 `--text-2`: what it means and what happens next; at most one primary button named for what it opens ("Review the budget ›", phone full width 44). Then the **phase track**: five 6 px bars (gap 4), past `--text-3`, future `--surface-selected`, the current one 2.6× wide and split into one pip per outcome (met = `--done`, not met = `--border-strong`); labels 12 under each (current 600 `--text`; phone shows only the last past and the current). Then **figures in one line** 13 `--text-2`, values 500 `--text`, "·" separators: "1 working · **1 needs you now** · 3 waiting on you · 4 of 9 outcomes met · **$40.00 of $40 today, at its limit**" (red only for needs-you-now and the limit; at ≥ 80 % the words "most of it used", UX-11 C). Phone: a 2-up grid, no dots.
- **Needs you here** (only when > 0; count red if any needs you now): rows 52 tall (phone 60): dot, title 500 over kind 13 `--text-2`, age 12 `--text-3` right; hairlines between; each opens the Inbox at that item. The row's name is one sentence ("replay used today’s $40, so new work is paused. Needs you now, Budget, 12 min ago").
- **In progress**: a card per task (radius `--radius-md`, padding 12 16): the Office's **window as its glyph** (14 × 19; lit lilac with a soft glow while working, green with a tick when done, dark when waiting), title 16/24 500, latest step 13 `--text-2`, then a 5-segment **stage track** (14 × 3 each: Planning · Building · Checking · Review · Done; current lilac while working, green when done), "Builder · Building" and "Try 2 of 5 · 1 min ago" 12. Working card border is 35 % lilac. Next tasks use the same card, dark window, "Next". None: one sentence ("Nothing is being built yet. Tasks appear here once the lead plans them." / lead off: "Nothing running. The lead is off, so nothing new starts.").
- **Recent**: up to 4 events, time column 88 (phone 64) 12 `--text-3`, words 13 `--text-2` (good news `--text`), then "All activity for replay".
- **Facts** (R14), four groups between hairlines, labels 12: *Spent on replay* (Today meter `$40.00 of $40`, full and red at the limit with "At its limit: new work waits until midnight"; "So far $286.40"; fold "Where it went": Tasks $241.10 · Lead $38.90 · Audits $6.40, "API-equivalent cost, not a bill."), *Your Claude plan* (41 % used, "Resets in 2 h 10 min · shared by every project", the same figure as the sidebar), *Team* (one line per agent: dot, role, state word in its colour; "Open the Office"), *How it runs* (Shipping, Gating, In the Claude app “replay lead”, stacked; "Change in Settings").
- **Other tabs** (R15), each a plain list in the reading column (≤ 760), groups `--space-6` apart, group headings 13/600 `--text-2` with a `--text-3` count. Variants are on replay; `?p=tidepool&tab=…` draws each tab's empty state.
  - **Tasks** (`?tab=tasks`): "Tasks 6", one line saying which groups are hidden because they're empty ("Nothing needs you, is in review, waits for your OK, is stalled, paused or failed right now, so those groups are hidden."), then groups in today's order (Needs you · Working · In review · Queued · Waiting for your OK · Requests · Stalled · Paused · Done · Failed · Cancelled), each "Working 1". Row (`.p-row.p-trow`, 52 / phone 60): status dot, title 500, under it the role and stage or the reason ("Builder · Building · 12 of 14 checks · **about 20 min left**", the time left in `--text`), right: try dots (8 px: grey failed, green passed, lilac now with a halo), the task ID in mono 12 `--text-3` (`r4k2`), age. Empty: "**No tasks yet** / The lead plans tasks after you approve the spec. They appear here, grouped by status."
  - **Outcomes** (`?tab=outcomes`, UX-14 A): "Outcomes 4 of 9 met", "What the project must do to be finished, in the charter's words.", a ring per outcome (filled green with a tick when met): "Met 11:05 · review passed" / "Being built: …" / "Not yet: an audit found they can't" / "Not started". A draft outcome is approved in the Inbox (one place to decide, R10), so no button here. Then the fold **Team checks · 41 of 44 passing · the tests behind the outcomes** (`?open=checks`): the failing ones first with their state ("Failing on try 1 · the builder is on it"), then passing, "And 39 more passing." Empty: "**No outcomes yet** / The lead drafts them with the spec. You approve each one in the Inbox."
  - **Audits** (`?tab=audits`): "Last audit Mon 15:10, on what was built by then. Audits start on their own after 3 more finished tasks (1 so far), or when you run one." (a project in manual audit mode: "Audits run when you or the lead start one.") and **⌕ Run an audit now…** (secondary). It **confirms, because it costs money** (D5 `ux/ia.js`): "Run an audit of replay now?" / "Three checkers look over what's built so far, about 20 minutes. The last two cost $3.20 each, from today's spend. Anything they find comes to your Inbox." / **Not now** (focused, Esc) · **Run the audit** (primary) (`?ui=audit`). Running: a sunken panel at the top (`.p-audit`, `role=status`): the lit window, "**Audit running · 6 min**", "Checking: 2 of 3 checkers done · accessibility, performance, layout", a 3-step stage track (`?audit=running`); the button is disabled while it runs. Findings grouped **Your call · Being fixed · Settled**, each a fold: title, "Accessibility · important · costly to change later"; inside "If nobody fixes it" + the impact, "Your call" + your note (when decided), *Technical details* folded, and for an open one a note field (optional) with **Yes, fix it** / **No, it's fine** (`finding` action, as the Inbox); deciding moves the fold to its group in place with a toast. Then Past audits (time · kind: checks, findings · cost). Empty: "**Nothing from the auditor yet** / Audits start once there is something built to check."
  - **Docs** (`?tab=docs`, `&doc=<key>` opens one): one list of folds, each "title / status line": **Charter** ("Approved by you 18 Oct · unchanged since"): the text in a 220-tall textarea ("The charter, in your words"; help: "The team works from this. A change after you approved it asks you to approve again."), **Save changes** (secondary, enabled once edited; `charter-save`), then "You approved it 18 Oct" + your quote. After a save the status turns red "Changed just now, after you approved it · approve it again" and **Approve in your own words** + **Approve the charter** appear (`charter-approve`; an empty quote says "Say in a few words what you approve, so the team knows what you read.") (`&v=edited`). **Rulings 2** ("Your decisions the team follows, newest last"): numbered list R-1, R-2 with when and where each came from, then **Add a ruling** (textarea, help "Every agent on replay follows it from their next step.", **Add the ruling** enabled once typed; `ruling`); the new one appears at the end with a toast. **Brief**, **Spec**, **Design** and **Contracts** ("Approved by you 20 Oct · merged · 14 files"; inside "Merged into the project, 14 files · **Open the clickable screens ↗**" in a new tab on the view port, then the summary), **Lead's plan**, **Lead's ledger** (what the lead decided without you, a time list), **Team messages** ("Lead to Builder · question · 13:41" over the text). Empty project: only the Brief (your description as the brief draft) and "The charter, spec, design and contracts appear here as the lead drafts them."
- **Confirm** (UX-10, `<dialog>`, 420 max, radius `--radius-lg`, `--shadow-3`, scrim): "Stop the lead for replay?" / "Nothing new starts until you start it again. The builder finishes the try it is on." / **Keep it running** (focused, Esc) · **Stop the lead** (`.btn-danger`).
- **States**: loading = Now, facts and two sections as skeletons, tab counts and chrome figures hidden; error = the neutral notice "The replay page didn’t load. Trying again in 15 s." + Try now; stale = "↻ Last updated 14:02 · Retrying", the working window loses its glow; empty = a project created a minute ago (`?p=tidepool`): "The lead is reading your description." / "It drafts a charter next, about ten minutes. You approve it in the Inbox; nothing else to do now.", the phase track on Brief with no pips, no Needs-you section, "Nothing is being built yet…", Recent "You created tidepool".
- **Motion** (Flow; transform and opacity only): a task finishing turns its window green and the tick shows, its words rise 4 px (`hf-tick`); ~2.4 s later the card slides out (`--shift`, `--dur-base`, `--ease-exit`) and the event rises into Recent (`--dur-slow`, `--ease-enter`); a new task's card rises in; a met outcome's pip grows from the left (`scaleX`, `--spring-snappy`) and "4" ticks to "5" here, in the tab ("5/9") and in the phase track's spoken label. Counts in head, chrome and team tick in place; open folds, scroll and focus stay (R7). Menu and dialog enter with `p-in` (4 px, `--dur-base`). Reduced motion: fades only.
- **Demo**: `media/project-{desktop,phone}-dark.webm` (13 s) + contact sheets: the builder finishes Trim clips (green window), the card leaves for Recent, the reviewer starts, its checks pass, an outcome is met (4 → 5 of 9); "Where it went" stays open the whole time.

### Task page (`screens2/task.html`; UX-4 A, UX-5 A, UX-10 A)

*Idea*: the page answers "what is it doing, is it really working, and show me" in that order (R17, R18). The latest step is the headline, in the serif, because it is the one thing that changes; everything under it explains it. The proof is the largest thing on the page, because seeing the work is the point (AC-3). Variants: `?t=trim` (default: replay's builder, working, between tries), `?t=audit` (atelier-ui's auditor: the quiet signal, no proof yet), `?t=draw` (atelier-ui's designer); states of the trim task `?v=needs` (it asked a question: question, answers, dock), `?v=plan` (waits for your OK), `?v=done` (review passed); `?ui=proof[&n=i]` (viewer open), `?ui=stop` (confirm), `?ui=toast` (dock sent, toast up). Data: `ATELIER_MODEL.TASKS` in `ux/wf/wf.js`; Office desks link to their task (`task.html`, `?t=audit`, `?t=draw`).

- **Head** (sticky 52): "‹ replay" (back to the project), title 14/600 (one line, ellipsis on desk; phone 20/28 wrapping on its own line), the status word in its colour with its dot (Working lilac, Needs you red, Done green, Waiting for your OK `--text-2` with a hollow dot), then the one task action (R20): **Stop task…** (secondary, × icon) while it runs or needs you; while it waits for your OK, **Stop it**; nothing when done. Live line right. *Why one action*: approve and answer live in the dock beside the thing itself; Retry is the lead's (lead ruling, contract rule 1).
- **Layout**: the project page's grid (reading column ≤ 760 + facts 280, gap 48; middle: facts under Now as a 2 × 2 grid; phone: a "Facts · Try 2 of 5 · $6.20 of $10" fold). When it needs you, below 1280 the question and dock come **before** the facts: the decision first.
- **Now** (R17, UX-5 A): label "Builder · now" (done: "Builder · finished 2 min ago") 12 `--text-2`; the latest step as one serif sentence 30/36, max 28ch; the lede 16/24 `--text-2`: why it is doing this and what happens next, in plain words; **last active** 13 `--text-2` with the live dot: "● Last active **1 min ago** · 14 min into this try". **Stuck signal**: the line becomes a sunken neutral note with ↻: "Quiet for 38 min, longer than usual. It usually reports every few minutes." (`--text`, never red; §5). Then the **stage track**: the phase-track bars with stage names (Planning · Building · Checking · Review · Done), past `--text-3`, the current one 1.8× wide and **filling to its progress** ("12 of 14 checks" → 86 %) in the status colour; done = all green. Then the figures in one line: "Try 2 of 5 · 1 of 2 outcomes met · $6.20 of $10" (auditor: "12 of 14 checks").
- **Its question** (only when it needs you; AC-2 inside the task): heading with a red dot, the question as a `.quote` with who asked and when, suggested answers as `.choices`, then the **dock** (the Inbox's `.dock`, sticky `--space-5` from the bottom, phone above the tab bar): own-answer field + **Send answer**. Plan: "Up to 5 tries · about $10" + **Approve plan**. Empty send → "Pick an answer or write your own." in red, focus to the field. Sent → busy "Sending…", then the dock turns `--done-soft` "✓ Answered. The builder carries on." and the toast "Answered the builder. Undo" anchors **above the dock** (never over it; measured below).
- **Shown working** (R18): heading + "From the first try · 13:22" `--text-3`; the proof note 16/24 `--text` (what the pictures show); `.frames` large: 3 items = the first full width, two halves under it; 2 = two halves; the recording shows its length on a media pill (▶ 0:48); captions 13 with the kind right (Screenshot / Recording / Phone). Each frame is a button ("Trim handles on a clip. Open large"). Run log fold "Run log · last 4 lines": monospace 12 on `--surface-sunken`, passes green, failures `--text` (the words say it failed). None yet: "Nothing shown yet. The auditor shows its work when this step is done."
- **Proof viewer**: `<dialog>` up to 1200 wide (phone: full screen); bar: caption 500, "1 of 3", **Full size ↗** (from the view port), **×** (focused on open); the picture `contain` on `--surface-sunken`, the recording's pill anchored to the picture; ‹ › 44 px buttons at the sides, ← → keys, Esc or the scrim closes, focus returns to the frame that opened it. Enters with `t-zoom` (opacity + scale 0.97 → 1, `--dur-base`, `--ease-enter`).
- **Latest steps**: up to 4, time 88 + words (newest `--text`). **Review**: "Not reviewed yet. The reviewer watches the recording once the check passes." / done: "✓ **Passed** Reviewer · 14:05" and its checks as a quiet ticked list. Audits: "Audits aren’t reviewed: what it finds comes to your Inbox."
- **History and notes** (R19; all folded, 44 tall rows between hairlines, each says what is inside): History · 6 events · Progress notes · 2 · Decided without you · 2 (or "none") · The brief · Last check (`npm test -- trim` · "Last run 13:31: 37 of 38 passed").
- **Facts**: *Status* (word 16/600 in its colour; Who, Started, Project link), *Tries* (one 10 px dot per try: failed `--text-3`, passed green, now lilac with a 3 px halo, unused hollow; "2 of 5"; "Try 1 failed the check; each new try starts from what the last one learned."; the task's own spend meter "$6.20 of $10 · Its own budget · part of replay’s day"), *Outcomes · 1 of 2* (rings as on the project page), *The work* (Check, Files "7 it owns", Tests "Didn’t change existing tests" or in red "Changed an existing test: `player.spec.ts`. Look before you merge", Pull request "Draft #14 ↗").
- **States**: loading = Now, facts and two proof frames as skeletons; error = the neutral notice "This task didn’t load. Trying again in 15 s." + Try now; stale = "↻ Last updated 14:02 · Retrying", the live dot stops and the stage fill dims to 50 %.
- **Confirm** (UX-10: stopping can't be undone): "Stop “Trim clips on the timeline”?" / "The builder stops now and this try’s work is kept as it is. The lead decides what happens next." / **Keep it running** (focused) · **Stop task** (danger) → the head button busy "Stopping…". Plan: "The plan is dropped and nothing starts. The lead can plan it again later."
- **Motion** (Flow): a new step arrives → the headline and the new Latest-steps row rise 4 px (`--dur-slow`, `--ease-enter`), "Last active" ticks to "just now" (`hf-tick`); frames lift 1 px on hover (`--spring-snappy`), press 0.99; viewer `t-zoom`; dock sent → `--done-soft` in place, toast `toast-in`. Reduced motion: fades only. `?demo` plays two new steps.
- **Accessibility**: the stage track and tries are labelled ("Stage: Checking, 12 of 14 checks", "2 of 5 tries used"); dots carry their word; every frame button is named with caption and length; the viewer is a modal dialog with a named close; the dock is a labelled form; phone links in the facts are 44 × 44.
- **Demo**: `media/task-{desktop,phone}-dark.webm` (12–13 s) + contact sheets: the Office → tap the builder's desk → the task (Now, stage) → Shown working → the viewer → next to the recording → close → Latest steps.

### Inbox (`screens2/inbox.html`; UX-1 A, UX-10 A, UX-2 A, UX-7 A, UX-9 A)

*Idea*: the owner already chose this Inbox (R-1 direction B, D3 Flow, D4 N1 + K1). So D6 changes nothing that was approved: the page runs the **same engine** (`feel/shared/inbox.js`) and the **same Flow choreography** (copied unchanged into `inbox.css` part 1), and only swaps what it wears: the D6 shell, the one data model, and looks for the item kinds D2 never drew. *Why one engine*: every behaviour (decide → sent → next, the toast with Undo anchored to the dock, J / K, Ctrl + Enter, Z, the failed send, Inbox zero) is kept by construction, not by copying.

- **Engine hooks** (optional; the D3 / D4 pages that share the engine are unchanged, checked): `window.INBOX` (items, working, earlier, spent), `FEEL.chrome` (draw the chrome from the live list), `FEEL.topBars` / `FEEL.tabBar` (the bars the toast must avoid), `FEEL.headEnd` (live line), `FEEL.errorHTML`, `FEEL.firstRunHTML`, `FEEL.projectHref` (the eyebrow's project is a link), `FEEL.drawn`; an item may have no primary button (a blocker that only explains); `ghostHref`; WORKING rows may link; a `try` unit; `state=stale` shows the items, `state=empty` is first run. `hf.js` gains `HF.chrome(cur, { now, pw, known })` so the sidebar, rail and tab bar count the page's own list and tick as you decide.
- **Content = the wireframe's seven** (7 waiting, 2 need you now; replay 3, atelier-ui 2, dodge 2), the same figures as the Office, the project pages and the chrome (AC-11). Needs you now: *The design for dodge is ready for your OK* (gate: three frames, clickable screens, design document, what's in it; note required for Approve **and** Skip), *replay used today’s $40, so new work is paused* (budget: the meter, where today's $40 went: $21.70 + $6.20 + $6.20 + $5.90; **Raise today to $60** + Budget settings; "Or do nothing: work starts again at midnight"). When you have a minute: the lead's question about the toast (suggested answers + own answer), *Does a trim land on the exact frame you picked?* (judgement: the trim proof with the 0:48 recording; Reject needs a note), the auditor's keyboard finding (impact, cost to change later, Technical details folded), *The charter changed after you approved it* (**what changed**, as a diff under its section: − old line struck in `--text-2`, + new line `--text`, the + in `--done`; own words required, **Approve the new wording** + Open the charter), *Atelier closed a window an agent opened* (notice: who, what, since then; **Got it**).
- **Every other kind** (`?kind=` puts it in the notice's slot, so no count changes): outcome (Approve / Retire it), several outcomes (the list inline, **Approve all 3** / Decide each), task plan (Approve plan / Read the brief → the task's plan view), screen use (the agent's request quoted, **Allow for 10 min** / Not now), charter to approve (the text inline, own words required, Edit it), blocked: not reaching GitHub (one sentence, what to do, details; **no button**, the dock says "Nothing to decide here. This goes away by itself once a push works."), earned trust (Now / Would be / Change back, **Loosen to standard** / Keep it strict). With the seven defaults that is all 14 inventory kinds and the eight AC-15 types, each showing the thing itself.
- **Layout and measurements**: unchanged from D2/D3 (`components.css` › Inbox: focus ≤ `--size-focus-max` + queue `--size-queue` 344 from 1280, 300 at 1024–1279, the queue under the item below 1024; dock sticky `--space-5` from the bottom, on the phone above the tab bar). D6 fit: the head uses the D6 padding (`--space-8` desk, `--space-6` middle, `--space-4` phone) and ends with the live line ("Updated just now" / "↻ Last updated 14:02 · Retrying"; hidden on the phone, where the top bar's spend is the freshness cue); at 768–1279 (rail, no top bar) the head sticks at the top and the queue under it; three frames with no "+N more" tile go two columns (the first full width) so there is no hole.
- **Working now**: the agent dot becomes the Office's lit window (9 × 12, arched top, `--active` with a 6 px glow; stale: no glow, 50 %), so a working agent looks the same on the Office, the project page, the task page and here. Rows link to their task.
- **States**: zero = "All caught up / Nothing needs you." + Working now + You decided today (D3, unchanged); first run (`state=empty`) = the D6 empty: serif "Nothing needs you yet." / "Start a project, and everything that needs your say lands here: designs to approve, questions, proof to judge." + **New project**, no counts, $0.00; loading = D2 skeletons, counts hidden; error = the neutral `.hf-notice` (not D2's red banner: nothing for the owner to do, §5) + "The list comes back when the Inbox loads."; stale = items as they were + the live line; a failed send (`?fail=1`) = "Couldn’t reach Atelier. Nothing was sent." + Try again (D2).
- **Motion**: Flow, unchanged (title flies focus ↔ Decided today at ≥ 1024, the card slides below; dock sent → tick pops; toast rises out of the dock; Undo flies the title home). Counts in the head, sidebar, rail and tab badge change with the list. Reduced motion: one cross-fade.
- **Accessibility**: as D3 (skip link to the decision, the item title takes focus after each move, the toast holds while hovered or focused, Escape closes it, labels on every icon-only control); the eyebrow's project link is a 44 × 44 target on the phone (13 px padding cancelled by margin, so the line doesn't grow); the diff says "Removed:" / "Added:" to screen readers.
- **Demo**: `media/inbox-{desktop,phone}-dark.webm` (17–19 s) + contact sheets: approve the dodge design in your own words → sent → the budget item arrives, the toast says what's next → Undo (the design flies back) → approve again → raise replay's budget in one tap; 7 → 6 → 5 waiting everywhere.

### Projects (`screens2/projects.html`; UX-6 A, UX-14 A, UX-11 C)

*Idea*: the list reads as three sentences. Each project card leads with the project's own **Now sentence** (the same words as its page, UX-6 A) in the serif, so the list says what is going on before it shows a number; the Office's **window strip** sits beside the name, so who is working reads at a glance and looks the same as on the Office. Inventory: lead on/off, phase, task summary (working, need you, queued, done), how many wait on you, New button, empty "No projects yet".

- **Head**: "Projects · 3 projects · **2 need you now** · 7 waiting" (red part only when > 0), live line, **+ New project** (secondary sm; phone 44 tall, on the title's line, the summary under it, the fresh line hidden because the top bar's spend is the freshness cue; stale stays).
- **Card** (`.pj`, the whole card is one link to the project, named by one sentence): list ≤ 960, gap `--space-3`; padding 20 24 (phone 16), radius `--radius-md`, hairline. Line 1: name 20/28 600 · the lead marker (`.p-lead`: lilac dot "Lead on", or hollow "Lead off") · the strip (one 9 × 12 window per agent; lead off = one empty outline) · right: "3 waiting · **1 needs you now**" 13 (red when anything needs you now, else `--text-2`; "Nothing waits on you" at zero). Line 2: the Now sentence `--font-display` 20/28 (phone 16/24), max 52ch. Line 3, 13 `--text-2` with "·": the phase at text size (five 14 × 4 bars, past `--text-3`, current 22 wide `--text`) "**Build** · 4 of 9 outcomes met" · "1 working · 1 queued · 3 done" (or "No tasks yet") · "$40.00 of $40 today, **at its limit**" (red at the limit; "most of it used" at ≥ 80 %, UX-11 C). Phone: line 3 stacks, no dots.
- **Order**: the sidebar's order, so the two lists never disagree. Hover lifts 1 px with `--shadow-2` (`--spring-snappy`), press 0.99.
- **States**: loading = three skeleton cards, counts and money hidden; first run (`state=empty`) = serif "No projects yet." + "Describe what you want made, in a line or a whole brief. A lead reads it, drafts a charter, and asks for your OK in the Inbox." + **New project**; error = the neutral notice "Your projects didn’t load…"; stale = the live line says so and lit windows dim to 40 %.

### Activity (`screens2/activity.html`; UX-13 A)

*Idea*: one feed by day, newest first, each event a line you can read aloud: the event's name, then what happened, with the project and task under it. Red only for problems, green for good news, everything else neutral (inventory: "bad ones red, good ones green"). Filters are the two the owner asked for (UX-13 A): a project picker and **Only problems**. `?p=` arrives from a project's Activity tab (the head shows "‹ replay"), `?only=problems`, `?demo` (a new event arrives).

- **Head**: "Activity · Last 3 days · 17 events · 4 problems" (the summary is the filter's live region and changes with it), live line.
- **Filters** (reading column ≤ 760): a native select styled as `.input` (180 min, chevron, "All projects" / each project) + **● Only problems** (`.btn-secondary`, `aria-pressed`; pressed = `--surface-selected` with the red dot at full strength). Changing either redraws the feed in place (`p-in`, 4 px, `--dur-slow`) and rewrites the address (`history.replaceState`), so back and reload keep the filter. Phone: the select fills the row, the toggle beside it, both 44 tall.
- **Day group**: label 12/500 `--text-2` + count `--text-3` ("Today 11", "Yesterday 4", "Saturday 24 Oct 2"). **Row** (one link to the task, Inbox item or project): time 48 (phone 40) 12 `--text-3` · 8 px dot (red / green / `--border-strong`) · "**Check failed** First try: the sound drifts by 40 ms after a trim" (name 500, red for problems, green for good news, else `--text`) over "replay · Trim clips on the timeline" 13 `--text-2`; 52 tall (phone 60), hairlines between, hover `--surface-hover`. Named as one sentence ("13:31, replay, Trim clips on the timeline. Problem: Check failed. …").
- **Nothing matches**: "No problems in dodge in the last 3 days." / "Nothing happened in dodge in the last 3 days." + **Show everything** (clears both filters, focus back to the picker).
- **States**: loading = filter and two day groups as skeletons; first run = serif "Nothing has happened yet." + "Once a project starts, everything its team does shows up here, newest first: steps, proof, checks, reviews and what you decided." + New project; error = the neutral notice; stale = the live line, rows at 85 %.
- **Motion**: a new event rises into the top of Today (`is-entering`), the day count and the summary tick (`hf-tick`); scroll stays (R7). Reduced motion: fades only.
- Data: `ATELIER_MODEL.ACTIVITY` (17 events, the same ones the project and task pages show: 13:40 paused, 13:31 check failed, 13:22 showed its work, 11:05 review passed …).

### New project (`screens2/new.html`; UX-12 B)

*Idea*: one create field that grows with what you give it (UX-12 B). A line is enough; paste a whole brief and the same field becomes the **brief draft**, and the hint under it says so: "**Reads as your brief draft** · 125 words. The lead starts from it, in full, instead of a blank page." Same field, same action (`project-create`), per the lead's ruling. Beside it on the desk, **What happens next** updates as you choose. Variants `?v=brief` (a real brief pasted: tidepool), `?v=taken`, `?v=busy`, `?v=fail`.

- **Layout**: form ≤ 640 + aside 280 (gap 48) at ≥ 1280; below, the aside follows the form between hairlines. Labels above fields; sections `--space-8` apart (phone `--space-6`).
- **Name**: `.input` ≤ 320 (phone full width, 44): "Lowercase letters, numbers and dashes. Used for the folder and the GitHub repo." Checked on leaving the field and on Create: "Give it a name." / "Use lowercase letters, numbers and dashes." / "dodge already exists. Pick another name." (`.field-error`, `aria-invalid`, focus back to the field).
- **What it is** "(one line, or paste a whole brief)": textarea 2 lines, `field-sizing: content` up to 440 then it scrolls. Over 280 characters or more than one paragraph = brief mode: the field turns `--surface-sunken`, 16/24 reading size, the hint gains the document icon in `--done` and the word count; the hint is `aria-live="polite"` and its new words rise in (`hf-tick`). Empty: "One line is enough. Paste a whole brief if you have one."; short: "The lead turns this into a charter for you to approve."
- **Team** (3 across, phone stacked): Pair "A lead and one builder. For small things." · **Team** "Lead, designer, builders, reviewer, auditor." (default) · Game "A team with a game designer." **Shipping** (2 across): **Draft pull requests** "You merge each one." (default) · Straight to main "Reviewed work lands by itself." Choices are `.choice.is-two` (title 500 + a line `--text-2`).
- **Checkboxes** (`.f-check`, 18 px box in a 44 px row): "Make a private GitHub repo / tidepool, on your account" (the name follows what you type) · "Start the lead now / It drafts the charter first; you approve it in the Inbox."
- **What happens next** (ordered, numbered rings): "Atelier makes the folder and a private GitHub repo, tidepool. A few seconds." → "The lead reads your brief and drafts a charter. About ten minutes. You can watch it in the Office." → "You approve the charter in the Inbox. Nothing else to do until then." Lead unticked: "The project waits with the lead off. Start the lead from the project page when you’re ready."
- **Create**: **Create project** (primary) + Cancel (ghost, back to Projects); phone both 44 and full width. Busy "Creating…" (disabled, spinner), then the new project page (`project.html?p=tidepool`, the page's empty state). Failure (`?v=fail`): a `--needs-soft` box "**Couldn’t create tidepool.** Atelier didn’t answer, so nothing was made. Try again." (`role="alert"`, red because the owner must act) and the button reads **Try again**; nothing typed is lost.

### Settings (`screens2/settings.html`; UX-3 A, UX-10 A)

*Idea*: UX-3 A gives two scopes, so the page says which one you are in, in the head ("Settings · For every project" / "‹ replay  Settings · replay only"), and each links to the other. Changes **take effect at once** and say so, like every other decision (UX-10 A): a choice saves on change with the toast "Saved for replay. Gating: Standard" + **Undo**; an amount saves on Enter or leaving the field with "✓ Saved" beside it; only stopping the lead confirms. *Why no Save button*: one less step, and a forgotten Save is the classic settings bug; every dial is reversible. Variants `?p=replay|atelier-ui|dodge`, `?v=holding`, `?v=invalid`, `?ui=stop`, `?ui=toast`.

- **Layout**: section nav 200 (sticky, follows the scroll, `aria-current`) + one column ≤ 640, gap 48; sections between hairlines, `--space-8` padding (phone `--space-6`), headings 14/600, a why-line 13 `--text-2` under it where the setting isn't obvious. Below 1280 the nav goes and sections stack.
- **Every project** (inventory: the plan pacing; R14): *Claude plan* (5-hour window 41 % and This week 58 % meters, the same figures as the sidebar; status line "● Not holding: work runs as planned." or, `?v=holding`, a sunken note "**Holding new work until midnight.** Today has used more than its share of the week (58 % by Monday). Running tasks finish first."; "Pause Atelier at this much of the 5‑hour window" 85 %, "…of the week" 90 % as `.f-unit` fields; switch "Spread work evenly over the week"), *Appearance* (Dark / Light / Follow this device; a preference kept in the browser, no server action), *This device* ("Signed in on this browser since 12 Oct…"; no sign-out: that isn't an action today), *Each project* (a row per project: lead dot, "Standard gating · $40 a day · draft pull requests", ›), *About* ("Atelier 0.9 · installed today 08:02. The dashboard reloads itself when a new version is installed.").
- **One project** (inventory: project Settings tab, every line): *Lead* (state + "In the Claude app: “replay lead”"; **Restart fresh** instant with a toast, **Stop the lead…** confirms with the project page's dialog; off: **Start the lead**, busy "Starting…"), *Approvals* (checkboxes Brief · Spec · Design · Contracts: "The phases you approve yourself. The rest go ahead when the reviewer passes them."), *Gating* (Strict / Standard / Loose with one line each; earned trust as a `--done-soft` note "**The team has earned standard gating.** 9 tasks in a row passed review with no change from you." and a quiet "earned" tag on that choice), *Money* ($ per day, $ per task; "Today $40.00 of $40, at its limit. Resets at midnight." and "API-equivalent cost, not a bill."; a bad amount: "Enter an amount in dollars, like 40."), *Shipping* (Straight to main / Draft pull requests / Local branches only), *Reporting* (Everything / A daily digest / Only exceptions), *What you read* (Plain words / Technical), *Team* (table: role with its state dot, files it owns, model; phone: role and model on one line, files under), *Numbers* (your approvals, overruled by you, audit hit rate, full test suite, project folder in mono).
- **States**: loading = three skeleton blocks; error = the neutral notice "Settings for replay didn’t load…"; invalid amount = `.field-error` + `aria-invalid`, nothing saved until it reads as a number.
- **Motion**: switch knob springs (`--spring-snappy`), "Saved" fades in for 2.4 s, toast `toast-in`; reduced motion: fades only.

### Sign in (`screens2/login.html`; no open UX question)

*Idea*: the one screen without the shell, because nothing else can load before the token. Calm and short: the mark, a serif title, where the token comes from, one field, one button.

- **Layout**: a 400 card (`--surface`, hairline, `--radius-lg`, `--shadow-2`, padding 32) centred on `--bg`; phone: no card edge, top-aligned 48 from the top so the keyboard never covers the button.
- **Content**: N1 mark 40; "Sign in to Atelier" (`--font-display` `--text-2xl`); "Paste the access token that `atelier open` prints on your PC. You do this once on each device." (`--text-2`); field "Access token" (password, mono, 44 tall, `autocomplete=current-password`), help "It stays signed in on this device until you clear its data."; **Sign in** (primary, full width, 44).
- **States**: wrong token (the server returns `?login=failed`; `?v=wrong`): the field keeps what you pasted, `aria-invalid`, red border and under it (`role=alert`): "That token didn't match. Copy it again from `atelier open`." (the token lives in `~/.atelier/dashboard-token` and survives a reinstall, so the copy makes no claim about when it changes); empty submit: "Paste the token first." and focus stays; busy: "Signing in…" disabled (`?v=busy`). Success goes to the Inbox (UX-1 A).
- **Motion**: the card rises 4 px over `--dur-slow` on load; reduced motion: none.

### Inventory coverage (AC-9)

Every line of `design/inventory.md` (95) has its home in `screens2/`, written down in **`screens2/coverage.js`** as `[section, inventory line, page, proof]`. The proof is text the page shows (folds included), an element, the tab title, or, for behaviour with nothing to draw (refresh every 15 s, the three server reads), a phrase in this file. `node runs/pjv7/tools/s2-cover.mjs <worktree>` loads every page and checks every proof: **95 of 95, 0 console errors**. Nothing is left to a later task. Lines that moved: the 7-day plan bar and "last updated" live in Settings › Claude plan (the sidebar keeps the 5-hour bar, UX-9 A); Atelier's spend detail (finished cost, still in progress, tokens, "API-equivalent, not a bill") is the line under the plan meters in Settings; criteria are approved in the Inbox, not in the Outcomes list (R10, one place to decide); "after you decide, back to the list" became "the next item rises in place" (Flow, R-1 direction B).

### Sheet additions (D6)

New shared parts, all in `screens2/hf.css` and built from tokens: `.hf-notice` (neutral self-retrying error), `.hf-live` (fresh / stale line), `.hf-empty` (serif line + sentence + one action), `.is-tick` (figure changes in place), `.strip` (window strip; moved from `office.css` to `hf.css` in S5 because Projects uses it too), `.desk` (desk card with scene). Projects (`projects.css`): `.pj` (project card), `.pj-phase` (phase track at text size). Activity (`activity.css`): `.act-row`, `.act-day`, `.act-filters` (styled native select + pressed toggle). Forms (`forms.css`, New project and Settings): `.f-form`, `.f-sec`, `.choice.is-two` (a choice with a line under it), `.f-check` (checkbox), `.f-switch` (on/off that applies at once), `.f-unit` ($ / % inside the field), `.f-saved` (inline "Saved"). New project (`new.css`): `.n-next` (numbered steps), `.n-fail`. Settings (`settings.css`): `.s-nav` (section nav following the scroll), `.s-hold`, `.s-earned`, `.s-team`. Project page (`project.css`): `.p-phases` + `.pips` (phase track with outcomes), `.p-stages` (task stage track, also on the task page), `.p-win` (the window glyph at text size), `.p-task` (task card), `.p-row` (two-line link row), `.p-pop` (menu: 272 wide, items 44 tall with a one-line hint), `.p-dialog` (confirm; its `.p-dialog-act` buttons are `--size-control-lg`, 44 tall, below 768, like `.p-act`). Task page (`task.css`, loads `project.css`): `.t-stages` (stage track filling to its progress), `.t-pulse` (last active / quiet note), `.t-tries` (try dots), `.t-dock` (the Inbox dock, sticky in a page), `.t-lb` (proof viewer dialog), `.t-review`. Round S7 (`project.css`): `.p-h3` (group heading with count), `.p-trow` (task row with try dots and ID), `.t-tries` moved here from `task.css` (both pages use it), `.p-id`, `.p-eta`, `.p-audit` (audit running panel), `.p-find` (finding fold), `.p-lbl` (a label over a paragraph), `.p-act` (a row of buttons that wraps), `.p-rulings`, `.p-msgs`, `.p-chtext` (charter editor), `.p-gh` (Not on GitHub in the head), `.p-empty` (a tab's empty state), `.p-meta`. Sign in (`login.css`): `.l-card`, `.l-go`. Settings: `.s-spent`. Inbox (`inbox.css`): `.diff` (what changed in a document: section, − old, + new), `.olist` (a short numbered list read in place), `.doc` (a document excerpt on the sunken surface), the window dot in `.agent-dot`. `components.css` is unchanged.

### Endpoint needs (for frontend; read data only, no new actions)

- **Office desk** (`/api/overview` team): per agent, besides role/status/what: the latest step in plain words, progress as `[done, of, unit]` when known, time of last activity, and a "quiet longer than usual" flag (or the expected interval, so the client can compare). On-duty count in the one summary.
- **Finished events**: a desk that just finished must say so for one refresh (`finishedAt`), so the green tick plays once and only on a real finish.
- **Task page** (`/api/task/<id>`, already read): besides today's fields, per step a plain-words line and its time (the latest steps), the stage index and progress `[done, of, unit]`, last activity and the quiet flag (same as the Office desk), tries as a list of results (failed / passed / now), the proof note (the "shown working" summary), each proof file's kind and a recording's length, the review verdict with its checks, and whether existing tests changed. Nothing new to write: Stop, Answer and Approve plan are today's actions.
- **Inbox** (`/api/overview` queue): per item, besides today's fields: for a changed charter, the changed section with its old and new wording (the diff, not just "it changed"); for a screen notice, who opened the window, what it showed and for how long; for a gate, the list of screenshots (already an open question); for a budget item, today's spend per task / lead / reviews from the one summary. Read data only; the actions are today's (`charter-approve` with its quote, `gate-approve`, `gate-skip`, `dial`, `answer`, `criterion`, `finding`, `screen`, `screen-seen`, `plan-approve`, `criteria-approve-all`).
- **Project page** (`/api/project/<id>`): a "Now" sentence and its one action are derived on the client from what the page already reads (the most urgent Inbox item, else the lead's state, else the phase); no new field. Needs, per project: outcomes as a list with met / not met and a short status (`met at`, or the task building it); the phase index; per task in progress the stage, latest step, progress `[done, of, unit]` and last activity (same as the Office desk); the money split Tasks / Lead / Audits from the one summary (R2), not added up on the client; the lead's name in the Claude app.
- **Projects list** (`/api/overview`): per project the phase index, outcomes met / total, the task summary as counts (working, need you, queued, done), how many of its waiting items need you now, today's spend against its limit, the agents on duty with working / not (for the window strip), and the same Now sentence the project page derives (client-side, from fields already read).
- **Activity** (`/api/overview` events, `/api/project/<id>` events): per event its project, task title (not only the ID), a plain event name (today's `EVENT_WORD`), the message, the time, and good / bad / neutral; the client groups by day and filters. Nothing new to write.
- **New project**: nothing new; `project-create` already takes the description, which now may be a whole brief (the lead reads it in full, lead ruling).
- **Project tabs** (`/api/project/<id>`, round S7): per task in the Tasks list its status group, ID, tries as results and likely minutes left (`etaText` today); outcomes with the team checks' passing / total and the failing ones by name; audit state while running (`startedMin`, `stage`, checkers done / total and their names), the last audit's time and what it covered, and when the next starts on its own (the project's audit mode and how many finished tasks it waits for); findings with their group (your call / being fixed / settled), impact, your note and the technical details; documents with their status line (approved when, changed since, merged, file count); rulings with when and where each came from; the lead's plan and ledger; team messages (from, to, kind, text, time). GitHub status `{ ok, problem }` (today's `githubChip`). Actions are today's: `audit`, `finding`, `charter-save`, `charter-approve`, `ruling`.
- **Shell**: the overview's `atelierToday` tokens and live tokens (shown in Settings › Claude plan); nothing new.
- **Settings**: per project the earned-trust suggestion's reason in words, the roster's model per role, and the plan's "holding" reason (5-hour, week or spreading) with its until-time (`pace.holdingUntil` today). Theme is a browser preference, not stored by the server.

### If the owner answers differently

| Decision | If not the recommendation | What reworks |
|---|---|---|
| UX-8 (Office) | B: one list of agents | Office body only: `office.js` floors → rows; the scene shrinks to the phone tile; `OFFICE` in the model stays |
| UX-9 (money in chrome) | B: money on each screen | Office head gains the spend; sidebar foot loses it |
| UX-7 (middle nav) | B: top bar + tabs at 768–1279 | `hf.css` middle block and `hf.js` rail only |
| UX-2 (phone tabs) | other tabs | `hf.js` tab bar only |
| UX-6 (top of a project) | B: figures first | `project.js` `now()`: the figures line moves above the sentence as four large numbers; C: the phase track moves up and grows. Data unchanged |
| UX-14 (Outcomes) | B: keep "Criteria" | The word only: tab, figures line, Outcomes list heading (`project.js`) |
| UX-3 (settings) | B: keep everything per project | Project page: "Change in Settings" is unchanged; the plan figure in the facts links to the project's settings instead of the global page |
| UX-4 (opening a task) | B: a peek over the desk | `task.js` body moves into a side sheet opened from the Office and the project page; the page stays for links. Data unchanged |
| UX-5 (task progress) | another form | `task.js` `stageTrack()` and the figures line only |
| UX-11 (early warning) | A / B: an Inbox item | The money line loses "most of it used"; the item appears in Needs you here like any other |
| UX-1 (what opens first) | not the Inbox | Only the app's start route and the brand link; `inbox.html` is unchanged |
| UX-10 (confirm or undo) | confirm each decision | The dock's primary opens the shared confirm (`.p-dialog`) and the toast drops Undo; the engine's `decide()` gains one step. Items and layout unchanged. Settings: a choice opens the confirm before saving (or a Save button returns); the toast drops Undo |
| UX-12 (New project) | A: the form as today, fewer words | `new.js`: the description stays one line (no brief mode, no word count, the hint is fixed); "What happens next" step 2 says "your description". Everything else unchanged |
| UX-13 (Activity) | B: no filters, a search box / C: status chips | `activity.js` `filters()` only: B swaps the bar for one search field filtering on the words; C swaps it for five chips (All · Done · Problems · Decisions · Money). The feed and `ACTIVITY` are unchanged |
| UX-3 (settings), Settings page | B: keep everything per project | `settings.js`: the GLOBAL block (plan pacing, appearance, device, about) is drawn inside each project's settings and the plain `settings.html` goes; chrome links point to the current project's settings |

### Screens round S1 (Office: design-critique, accessibility-review, ux-copy)

Renders: `runs/pjv7/tools/s2-shots.mjs` (Office × 1440 / 768 / 390 × dark / light × 5 states = 30, plus phone first screens; 0 console errors, no sideways scroll). Contrast measured on the rendered page, every text run against its real background (`pcontrast.mjs`): **0 under AA** in dark and light, every state; lowest dark 6.26 (meta on the desk), lowest light 4.86 ("3 working" lilac on the selected nav). `a11y.mjs` at 390 and 1440. Before / after in `review/screens2/s1/`.

| Found | Changed | Why |
|---|---|---|
| (critique) The first scene was a window and a figure lost on a wide wall; every desk looked alike | A wall prop per role, the scene scaled up (108 tall, figure 192 wide) | Character within the calm brand: you tell the designer's desk from the auditor's without reading |
| (critique) The floor's window strip floated at the far right, away from the name it belongs to | Strip sits right after the floor name | Proximity: name, glance, figures in one reading line |
| (critique) The provisional flag was fixed over content on the phone | It sits in flow at the foot of the page | Mockup labels must never cover the product |
| (critique) First run: the sidebar still listed three projects and "$52.60" beside "No one is working yet" | First run in the shell: no projects, no counts, $0.00, "No projects yet"; the empty building's style no longer leaks into the button's icon (`office-empty-1440-dark.png`) | Every number agrees (R2), including at zero |
| (critique) Stale state lit the windows of waiting desks | Dimming applies only to working desks (`office-stale-390-light.png`) | Stale must never invent work |
| (critique) Phone tile cut the window's left edge and the raised hand's red dot | Tile shows grid x 4–126 | The two signals that matter most were clipped |
| (a11y) Desk links read "DesignerWorking High-fi…"; nav "Office3 working", "replay3" | One sentence per desk as its name; nav labels "Office, 3 working", "replay, 3 waiting, lead on" | 4.1.2 names that make sense read aloud |
| (a11y) Phone targets under 44: brand link 67×20, floor names 63×21 | Both 44 tall | 2.5.5; after: 0 small targets on the phone |
| (copy) "Idle", "On duty" on desks; "Auditing" | Only the four words: Working, Needs you, Waiting, Off (and Done for a moment) | §5: one short fixed list everywhere |

### Screens round S2 (Project page: design-critique, accessibility-review, ux-copy)

Renders: `s2-shots.mjs` (now takes `page~query`), project × 1440 / 768 / 390 × dark / light × (replay, dodge, tidepool, Outcomes, Docs, menu, stop confirm, loading, error, stale) = 60 + phone first screens; 0 console errors, no sideways scroll. `pcontrast.mjs` in dark and light on replay, dodge, Outcomes and with the menu open: **0 under AA**; lowest dark 5.15 (red count "3"), light 4.76. `a11y.mjs` at 390 and 1440 on replay and dodge: 0 small, 0 unnamed, a ring on every stop. Before / after in `review/screens2/s2/`.

| Found | Changed | Why |
|---|---|---|
| (critique) The lead menu was open on load: `.p-pop { display: grid }` beat the `hidden` attribute | `.p-pop[hidden] { display: none }` | A menu that hides the tabs is a bug, not a state |
| (critique) "3 waiting on you" was red although only one item needs the owner now | Figures say "**1 needs you now** · 3 waiting on you"; only the first is red | §5: red only when the owner must act now; seven red words would alarm (AC-1, AC-7) |
| (critique) New project (`tidepool`): a big empty band between Now and In progress, because the tall facts column stretched the first grid row | `grid-template-rows: auto 1fr` (`before/after-project-tidepool-1440-light.png`) | The empty state should read as calm, not broken |
| (critique) Middle width: facts groups stretched to each other's height, the plan meter floated mid-cell (`after-project-dodge-768-dark.png`) | Facts groups align to the top | Rhythm: labels on one line across the row |
| (critique) Phone: the figures line wrapped with a "·" at the start of a line | A 2-up grid on the phone, no dots | A stray separator reads as a typo |
| (critique) "How it runs" squeezed "Draft pull requests you merge" into a 140 px column | Stacked: label over value | The facts column is 280; two columns there only fit numbers |
| (a11y) Phone tabs 29 px wide ("Docs"); then, after a 44 px min-width, the tabs shrank and overlapped ("Tasks 2Outcomes 4/9") | `min-width: 44px; flex: none` (`before/after-project-tabs-390.png`) | 2.5.5 targets, and a scroller must not squeeze its items |
| (a11y) Row names ran together: "…pausedBudget" | Each row's name is one sentence: title, state, kind, age | 4.1.2 names that make sense read aloud |
| (copy) Checked every string against the eight plain-words rules (§5): no IDs in a first line, the project named, buttons named for what they open or do, the menu items carry a one-line consequence, the confirm names both results | No change needed | Recorded so the next round knows it was checked, not skipped |

### Screens round S3 (Task page: design-critique, accessibility-review, ux-copy)

Renders: `s2-shots.mjs` task × 1440 / 768 / 390 × dark / light × (trim, audit, draw, needs, plan, done, viewer, stop, loading, error, stale) = 66 + phone first screens; 0 console errors, no sideways scroll, no broken images. `pcontrast.mjs` dark + light on trim, needs, done and audit: **0 under AA**; lowest dark 5.15, light 4.76 (the sidebar's red count). `a11y.mjs` at 390 and 1440 on trim, needs, plan and the viewer: 0 unnamed, 0 small after the fix, a ring on every stop. **Toast-up hit test** (`runs/pjv7/tools/task-toast.mjs`): needs and plan × 390×844, 360×640, 768×1024, 1280×720, 1440×900 × dark / light × top, dock and end of the page: the toast overlaps neither the dock nor the tab bar, and every dock control and tab is the top element at its centre, **60/60**, 0 page errors. Before / after in `review/screens2/s3/`.

| Found | Changed | Why |
|---|---|---|
| (critique) Phone, needs you: the facts fold sat between Now and the question, so the decision was below the fold | Below 1280 the question and dock come before the facts (`before/after-task-needs-390-dark.png`) | The decision first (AC-2); facts are reference |
| (critique) Full-page shots: the sticky dock was pulled up over the question, leaving a hole under the answers | `?shot` puts the dock in flow (mockup only; the live page keeps it sticky) | A screenshot must show the real order |
| (critique) Three proof frames in the hero layout left an empty third column under the big one | Task proof uses two columns: the first full width, two halves under it | No holes in the page's main picture |
| (critique) Phone viewer: the recording's ▶ 0:48 pill sat at the foot of the screen, far from the picture (`before/after-task-viewer-phone.png`) | The pill anchors to the picture | A length belongs to the recording it describes |
| (critique) The viewer opened with focus, and its ring, on Full size | Focus goes to × | Closing is the likely next move; the ring shouldn't be the loudest thing on open |
| (critique) The review's checks were 500 weight, louder than the outcomes beside them | Regular weight, tighter rows (`before/after-task-done-1440-light.png`) | Hierarchy: the verdict speaks, the checks support it |
| (a11y) An empty `<img>` in the closed viewer counted as a broken image | The viewer makes its image on first open | No broken images; screen readers don't meet an unnamed picture |
| (a11y) Phone: "replay" (35 × 17) and "Draft #14" (68 × 17) links in the facts | 44 × 44 targets on the phone | 2.5.5 |
| (copy) Done said "merged into replay", but replay ships draft pull requests you merge | "Passed review; its pull request is ready for you to merge", PR "Draft #14 · ready to merge"; the project demo now says "Ready to merge" (re-recorded) | The page must not claim what the owner hasn't done |
| (copy) Done still labelled "Builder · now" | "Builder · finished 2 min ago" | Time words must be true |
| (copy) Checked the stuck signal, the stop confirm and the empty proof against the eight plain-words rules: no "iteration", no IDs first, the quiet note is neutral and says what is usual | Kept | Recorded as checked, not skipped |

### Screens round S4 (Inbox: design-critique, accessibility-review, ux-copy)

Renders: `s2-shots.mjs` inbox × 1440 / 768 / 390 × dark / light × (items, zero, empty, loading, error, stale) = 36, plus the 14 kinds and open items at 1440 and 390 + phone first screens; 0 console errors, no sideways scroll, no broken images. `pcontrast.mjs` dark + light on items, charter, budget, zero, outcomes, github and error: **0 under AA**; lowest dark 5.15, light 4.76 (the queue's red age). `a11y.mjs` at 390 and 1440 on items, charter, question, github and empty: 0 unnamed, 0 small after the fix. **Toast-up hit test** (`runs/pjv7/tools/inbox-toast.mjs`, the D2 test on the D6 bars): question → judgement and budget → question × 5 viewports × dark / light × top, middle, end; Escape closes the toast; acting on the next item closes it; a tap on Accept with the toast up decides that item: **101/101**. The D3 / D4 pages that share the engine (`feel/flow`, `brand/app`, `brand/r2/app`) load with 0 errors after the hooks. Before / after in `review/screens2/s4/`.

| Found | Changed | Why |
|---|---|---|
| (critique) The D2 items didn't match the D6 data: replay 4, atelier-ui 1, a dodge design already "approved" in the ledger, beside "dodge waits for your OK" everywhere else | The wireframe's seven items, from the one model; Working now = the Office's three working desks; Decided today has nothing that contradicts another screen | AC-11: the same figure on every screen, the same story too |
| (critique) "Does trimming keep the sound in sync?" asked the owner to judge what the task page says failed its check | The judgement is *Does a trim land on the exact frame you picked?*, the outcome the first try met (model, project page and wireframe changed together) | A screen must never ask for a judgement on something the system already knows is broken |
| (critique) Three proof frames left a hole in the third column (`before/after-inbox-frames-1440-dark.png`) | Two columns when there's no "+N more" tile | Same fix as S3; no holes in the main picture |
| (critique) First run (`state=empty`) still showed seven items beside "No projects yet" and $0.00 (`before/after-inbox-empty-1440-light.png`) | First run clears the list and shows the D6 empty with **New project** | Every number agrees, including at zero |
| (critique) Load error was D2's red banner | The neutral D6 notice with Try now | §5: red only when the owner must act |
| (critique) A working agent was a dot here and a lit window on every other D6 screen | The window glyph in Working now | One picture per meaning across screens |
| (a11y) Phone: the eyebrow's project link was 38 × 42 | 44 × 44 with padding cancelled by margin | 2.5.5, without growing the eyebrow line |
| (a11y) The charter diff relied on strike-through and colour | "Removed:" / "Added:" read out; − / + glyphs; the group is labelled with its section | 1.4.1 not colour alone |
| (copy) The changed charter needed the owner's words: the server's `charter-approve` takes a quote | Own words required, like a gate | No new action, and the dock asks for what the action needs |
| (copy) The blocker said nothing about what happens next | "Nothing to decide here. This goes away by itself once a push works." | The owner shouldn't wonder whether to do something |
| (copy) Checked every item against the eight plain-words rules: the project named in each title or eyebrow, buttons named for what they do, "Or do nothing" says what doing nothing means, no IDs in a first line | Kept | Recorded as checked, not skipped |

### Screens round S5 (Projects, Activity, New project, Settings: design-critique, accessibility-review, ux-copy)

Renders: `s2-shots.mjs` projects, activity (+ `p=replay`, `p=dodge&only=problems`), new (+ brief, taken, fail), settings (+ replay, atelier-ui invalid, dodge, holding, stop) × 1440 / 768 / 390 × dark / light, plus loading / empty / error / stale for all four = 240 renders: **0 console errors, no sideways scroll, no broken images** (`runs/pjv7/evidence/s5/`). Contrast on the rendered page (`pcontrast.mjs`, 6 views × 2 modes): **0 under AA**; lowest dark 5.15, light 4.76 (the sidebar's red count, as before). `a11y.mjs` at 390 and 1440 on five views: every Tab stop shows the ring; flagged only the known false positives (inputs named by `<label for>`, 18 px boxes inside 44 px label rows). No dock on these screens, so no toast-up hit test; the Settings toast uses the shared `.toasts` above the tab bar. Office re-rendered after `.strip` moved to `hf.css`: unchanged. Shots in `review/screens2/s5/` (after only: the before states were fixed between first renders and not kept; each is described here).

| Found | Changed | Why |
|---|---|---|
| (critique) Projects as rows of figures read like the old dashboard: you had to add up numbers to know what's going on | Each card leads with the project's Now sentence in the serif; figures move to one quiet line under it | UX-6 A's rule applies to the list too: a sentence before a number |
| (critique) Nothing on the list said who was working | The Office's window strip beside each name (one window per agent, lit while working) | One picture per meaning across screens (as S4) |
| (critique) Phone head on Projects: the summary sat above the title, the button on its own row (`project.css` phone order) | Title and **New project** on one line, the summary under it; the fresh line hidden, the stale line kept | The title first; freshness is in the top bar's spend on the phone |
| (critique) Settings' pacing variant showed the 5-hour window at 86 % beside the sidebar's 41 % | The holding reason is the week's share instead, so 41 % stays everywhere | AC-11: the same figure on every screen, in every variant |
| (critique) Settings had a Save button (wireframe) | Choices save at once with a toast and Undo; amounts on Enter / leaving the field with "✓ Saved" | UX-10 A everywhere; a forgotten Save is the classic settings bug |
| (scope) Settings drew "Sign out of this browser"; there is no sign-out action today | Removed; the device section says how to add the phone instead | No new actions (task scope) |
| (a11y) Activity's whole feed was a live region, so every filter change read out the entire list | Only the summary ("Last 3 days · 3 events · 1 problem") is `aria-live` | 4.1.3, without flooding a screen reader |
| (a11y) Row dots carried empty image labels inside named links | `aria-hidden` dots; the row's name says "Problem:" / "Good news:" | 1.1.1 and 1.4.1: the meaning is in words, not only red / green |
| (copy) "1 problems", "1 events" | Singular / plural | Small, but it's the first line on the page |
| (copy) New project's long description: what happens to it was unclear | The hint changes in place: "**Reads as your brief draft** · 125 words. The lead starts from it, in full, instead of a blank page." | Lead ruling: a long description is read in full as the brief draft; the owner should see that before pressing Create |
| (copy) Failure on Create | "**Couldn’t create tidepool.** Atelier didn’t answer, so nothing was made. Try again." | Says what happened, that nothing half-exists, and what to do |

### Screens round S6 (all eight side by side: design-critique, accessibility-review, ux-copy)

Renders: the phone's first screen of all eight screens tiled in two rows (`review/screens2/s6/s6-phone-dark-row.png`, `-row2.png`), plus `project~p=atelier-ui`, office, projects and `settings~p=atelier-ui` × 1440 / 768 / 390 × dark / light × default / loading / stale (`runs/pjv7/evidence/s6/`): **0 console errors, no sideways scroll, no broken images**. Contrast on the rendered atelier-ui page and the Projects list (`pcontrast.mjs`, 390 + 1440, both modes): **0 under AA** (lowest dark 5.15, light 4.76, the sidebar's red count as before). `a11y.mjs` on `project.html?p=atelier-ui` at 390 dark and 1440 light: 0 small, 0 unnamed, every Tab stop shows the ring.

| Found | Changed | Why |
|---|---|---|
| (critique) Projects, the Office's floor names and Activity link to atelier-ui, but `project.html?p=atelier-ui` fell back to replay's content (no page in the model) | `ATELIER_MODEL.PAGES['atelier-ui']` in `ux/wf/wf.js`: Now "The designer is drawing the Office for phones; the auditor is checking contrast.", one question waiting, two task cards (the auditor's says "quiet for 38 min" in neutral text), Recent from the same events as Activity, $12.60 of $30 | Every link lands on its own page; every figure agrees with the Office, the Inbox and the list (AC-11) |
| (critique) The Office's floor names and quiet floors all linked to replay's page | Each floor links to its own project (`HF.pHref`) | A floor name is the obvious way into a project |
| (critique) Projects card: the whole "3 waiting · 1 needs you now" line was red (before: `projects-390-darkv-before.png`) | Only "1 needs you now" is red; "3 waiting" stays secondary text, as in the page summary (after: `projects-390-darkv.png`) | Red means "needs you now" and nothing else (AC-7, §5 four meanings) |
| (consistency) Settings for atelier-ui said "Local branches only" while its task shows "Draft #31"; dodge's page said you OK "the spec, design and contracts" while its settings gate only spec and design | atelier-ui ships draft pull requests; dodge's Gating line reads "the spec and design" | One data set; a fact can't differ between two screens |
| (critique, kept) Heads differ: Inbox and Office use a compact bar (title + live summary on one line), Projects, Activity and Settings a page title | Kept, and written down as the rule: screens whose content is a live queue or floor (Inbox, Office) put the content first and keep the head to one line; collection screens (Projects, Activity, Settings) carry a title; a project or task page uses its own name as the title | The two working screens are the ones checked many times a day; their first screen is the thing itself (AC-1) |
| (a11y, kept) Project tabs run off the right edge at 390 ("Docs" cut) | Kept: the tab row scrolls sideways inside itself (44 px targets, `flex: none`), the cut-off tab is the cue that there's more; the page itself has no sideways scroll | The same scrolling tabs as the task page; 1.4.10 is about the page, not a scroller |
| (copy) "In progress 3" on atelier-ui counts the queued "Next" card | Kept, as on replay ("In progress 2" with its Next card): the section lists what's being built and what starts next | Same rule on every project page |

### Screens round S7 (review fixes: 360 px, inventory coverage; design-critique, accessibility-review, ux-copy)

The reviewer found two Inbox items wider than a 360 phone and several inventory lines with no high-fi home. Renders: `runs/pjv7/tools/s7-matrix.mjs` = every screen × every state + 35 variants (all Inbox kinds, every project tab and its states, Sign in) × **360**, 390, 768, 1440 × dark, light (`runs/pjv7/evidence/s7m/`, results in `s7-matrix.txt`): **568 renders, 0 console errors, 0 sideways scroll (360 included), 0 broken images**; the same figures on every page ($52.60 today, 41 % plan). Small targets: the new action buttons were 36 tall on the phone (Run an audit, Yes / No, Save, Approve, Add); now 44 (`.p-act .btn` at < 768), rechecked with `a11y.mjs` (0 small, 0 unnamed, a ring on every Tab stop at 390 dark and 1440 light). The matrix's "unnamed" rows are buttons inside closed folds (no rendered text yet), the known false positive. Contrast (`pcontrast.mjs`, 390, both modes) on Tasks, Audits with a finding open and an audit running, the edited charter, atelier-ui not on GitHub, Sign in with a wrong token and Settings: **0 under AA** (lowest 6.26 dark, 6.05 light). Coverage: `s2-cover.mjs` 95 of 95. Before / after: `review/screens2/s7/`; the two "before" shots are re-rendered at 360 from the pre-fix commit 8363b22 (`runs/pjv7/scratch/before.mjs`: the charter item 366 wide, the GitHub blocker 383), because round 1's review shots were overwritten by a later re-shot of the fixed pages.

| Found | Changed | Why |
|---|---|---|
| (a11y, review) At 360 the changed-charter item was 366 wide: "Approve the new wording" + "Open the charter" didn't fit one row, the note field and the tab bar's Activity were cut (before: `inbox-charter-360-before.png`) | `.dock-row` wraps; the second button takes its own line under the primary (after: `inbox-charter-360.png`) | 1.4.10 reflow; AC-12 asks 360 with no sideways scroll |
| (a11y, review) The GitHub blocker's dock sentence was one 383 px line ("…once a push w") | The sentence wraps (`white-space: normal`, no auto margin) (after: `inbox-github-360.png`) | Same |
| (review) The matrix only went down to 390, so neither showed | s7-matrix adds 360 for every screen, kind and state | Test the narrowest width the criteria name |
| (critique, review) A frontend built from DESIGN.md would drop: rulings and adding one, editing / saving / approving the charter, running an audit, audit progress and schedule, findings by group, team checks, brief / plan / ledger / messages, GitHub status, tasks grouped with counts and time left, Sign in | All drawn (Project page › Other tabs, GitHub status; Sign in); `coverage.js` + `s2-cover.mjs` prove each of the 95 lines | AC-6, AC-9: nothing today's dashboard does goes missing |
| (critique) The task row and task page had no task ID (inventory: "ID") | The ID in mono `--text-3` on the row's right and as the first fact on the task page | The ID is how the owner talks to the lead about a task |
| (critique) The proof viewer's Full size went nowhere | Opens the picture in a new tab (the real page: the view port, `/evidence/…`) | Inventory: agent-made pages open on the view port, in a new tab |
| (copy) Run an audit: no word on cost | The confirm says how long, what it cost last time, where findings go | It costs money (D5); the owner decides knowing that |
| (copy) Tasks list: missing groups could read as missing features | One line says which groups are empty and hidden | Plain sentence over empty headings (AC-7) |
| (critique, review) The Office head says "2 need you" but only one hand is raised: dodge's design gate showed only as quiet words | The quiet floor line carries "● 1 needs you now" in red after the name | A glance at the floors must match the head (AC-1) |
| (a11y, review 2) The shared confirm's buttons (Stop the lead / task, Run the audit, Keep it running, Not now) were 36 tall on the phone | `.p-dialog-act .btn` is `--size-control-lg` (44) below 768, the same rule as `.p-act`; `runs/pjv7/tools/dlg-size.mjs`: every confirm on Project (stop, audit), Task (stop) and Settings (stop) at 360 / 390, both modes, 44 tall, 0 errors | 2.5.5 target size; AC-12 |
| (copy, review 2) Sign in's wrong-token line claimed the token changes on reinstall; it lives in `~/.atelier/dashboard-token` and survives one | "That token didn't match. Copy it again from `atelier open`." | Say only what is true (AC-7: plain sentences) |
| (a11y) New buttons and folds: Run an audit, Yes / No, Save, Approve, Add | All ≥ 44 tall, named by their result, disabled until there is something to save or add; errors under their field with `aria-invalid` | Same rules as the Inbox dock |

## Office inspiration board (m87r)

**Open `design/office-inspiration/index.html`.** The owner turned down every Office character direction so far (A1–A3, and the 3e5b style families S1–S14 on branch `atelier/3e5b`), so this board goes wider. It shows 16 real, polished sources from games, products and industrial design, and 9 of them show the team **with no characters**. Each option says four things: what our Office would be in that style, why the source looks polished, what to watch out for, and the effort to build it (Light / Medium / Heavy / Very heavy, for about six roles in five states). Each is credited to its maker. The owner replies with numbers, and the next task draws 2–3 original directions from the picks.

| # | Option | Cast | Source |
|---|---|---|---|
| 1 | The tower at night | Tiny figures | Project Highrise (SomaSim) |
| 2 | Busy workshop cutaway | Characters | Oxygen Not Included (Klei) |
| 3 | Handmade miniatures | Characters | Harold Halibut (Slow Bros.) |
| 4 | Line and flat colour | Characters | Sable (Shedworks) |
| 5 | Bold graphic portraits | Characters | Persona 5 Royal (ATLUS) |
| 6 | Tabletop factory | Tiny figures | Little Big Workshop (Mirage) |
| 7 | One light per desk | Silhouettes | Control (Remedy) |
| 8 | Lit shrines | No characters | Monument Valley 3 (ustwo games) |
| 9 | Machines at work | No characters | Opus Magnum (Zachtronics) |
| 10 | Glowing flow | No characters | shapez 2 (tobspr) |
| 11 | The schematic map | No characters | Mini Metro (Dinosaur Polo Club) |
| 12 | A little town at night | No characters | Townscaper (Oskar Stålberg) |
| 13 | The desk tells the story | No characters | Unpacking (Witch Beam) |
| 14 | Rooms as tiles | No characters | Apple Home (Apple) |
| 15 | Presence, not people | No characters | FigJam (Figma) |
| 16 | An instrument panel | No characters | teenage engineering |

- **Files**: data and credits are in `insp.js` (one entry per option; the page renders from it), styles in `insp.css` (K1 dark tokens only), and images in `media/` (JPEG, ≤ 1440 px, ≤ 260 KB each, taken from Steam store screenshots and the makers' own public pages). The images are inspiration for a private decision only and never ship.
- **Views**: the board (default, 390–1440); `?n=1…16` shows one option as a 1440 × 810 poster, which is what the Inbox shows as one PNG per option; `?sheet` shows all 16 at a glance.
- **Recommendation**: **8** is our N1 window at room scale, needs no characters and is medium to build (the shrines are simple geometry we can draw in SVG, but the role emblems need an illustrator). **7** follows the same light idea and reads as calm and premium. **4** is the best fit if the owner still wants characters.
- **Why colour stays neutral**: lilac, red and green already mean working, needs you and done in the Office. The board uses only greys, so the chips (filled dot = characters, hollow dot = none) never look like a status.
- **Critique log**: round 1 found three problems. The poster image floated above a dead band, the number showed twice, and #13 showed a kitchen, not a desk. Fixes: both poster columns are now centred, the badge is hidden in the poster, and #13 is now Unpacking's desk room. Round 2 found the lede saying "eight" options with no characters when there are nine; the count now comes from the data. Measured: 207 text runs each at 390 and 1440, 0 under AA (lowest 6.86:1). Every link is named and shows a focus ring, and the skip link is 44 px. The source links are inline, 24 px tall, which meets 2.5.8. There are 0 broken images, 0 console errors and no sideways scroll. Round 3 (review plus a design-critique skill pass on the sheet and poster 8): #8 was marked Light while its own Watch out line says the emblems need an illustrator. It is now Medium, and the recommendation says so. The sheet showed no effort, although cost is part of the pick, so each name on the sheet now has its effort on the right. #7's alt now describes the actual image (a backlit silhouette among concrete blocks under stars). #16's credit names the OP–XY, which is the device shown.

## Office directions (vbnh)

**Open `design/office-directions/index.html`.** Three original Offices grown from the owner's picks (R-15, R-16): 7 One light per desk, 8 Lit shrines and 12 Town at night, with 16's idea (state readable at a glance, like a gauge) but not its look. The owner replies with one ID. Status: two critique rounds done (see Critique log below) and every direction recorded: `media/{a,b,c}.webm` (1440), `media/{a,b,c}-phone.webm` (390) and a frame-by-frame sheet `media/contact-{a,b,c}.png`, all linked from the pick page.

### References (what each direction takes, and what it avoids)
| Source (board #) | Take | Avoid |
|---|---|---|
| Control, Remedy (7) | One hard pool of light in a dark space; a figure read only as a silhouette against it | Its cold concrete gloom and scale: ours is a warm studio after hours, small and calm |
| Monument Valley 3, ustwo (8) | Arched, glowing panes with an emblem in the glass; precise geometry on dark | Its saturated multicolour glass: ours is lilac only, because colour means state |
| Townscaper, Oskar Stålberg (12) | Soft houses under a blue night, windows lit one by one; cosy without one face | Warm yellow windows (yellow means nothing here, lilac means working) and 3D render |
| teenage engineering (16) | The gauge idea: how far along, at a glance, without reading | The product-render look, keys and screens |
| D6 Office (`screens2/office.html`) | The whole screen: head, floors, desk words, quiet floor, legend, states, the live app's data | The small-window-plus-tiny-person scene, which the owner turned down with A1–A3 (R-12) |

### Frame
- **Who**: the owner, glancing at the Office between other work, often on the phone. **The moment that matters**: "is anyone stuck or waiting on me, and is work really happening?" answered before reading a word. **Success feels like**: looking into a lit studio at night, recognising who is busy by posture or light, and smiling at a small habit, never hunting for meaning.
- **Anonymity (R-15)**: no faces, no names, no fixed identities. Character comes from posture, small habits, the desk and the light. The role word is the only label.

### The three directions
All three are the real Office on the D6 shell and the one data model (`ux/wf/wf.js`): same head counts (3 working · 2 need you · 6 on duty), same floors, same desk words, same quiet floor for dodge. Only the scene and the floor layout differ. Pages: `a.html`, `b.html`, `c.html`; shared engine `od.js` + `od.css` on top of `screens2/office.css`.

- **D-A Lamplight** (from 7). *Feel*: a quiet studio after dark where each agent works under its own hanging lamp. Lamp on (lilac cone and pool) = working; lamp burned down to a glow at the shade, no light on the floor = quiet for longer than usual; lamp off = waiting; an ember in the bulb = paused; green for 2.4 s = finished. Posture says the rest: leaning in to type, head down on folded arms (quiet: a flat, low silhouette that reads apart from leaning in at tile size), leaning back with a steaming mug (waiting), arms folded (paused), standing holding up a small red lantern (needs you, the only red in the room), arms up in a stretch (finished), an empty chair with a coat over it (off). The wall prop says the role (pinned sketches, shelves of boxes, books, a clipboard, a plan board). *Build*: light; one inline SVG per desk, six poses and five props switched by CSS.
- **D-B Lit shrines** (from 8 + 16's gauge). *Feel*: a gallery of tall arched windows, the N1 mark at room scale, with no figures; the light carries everything. The glass is five bands, one per stage (the live app's Planning → Done), lit from the sill up to the task's stage, the rest glowing faintly so it reads "this far of five". Red keystone = needs you; unlit glass with the emblem still readable = waiting; bands held in grey = paused; shutters = off; green flood = finished. Each emblem has one habit while lit (the compass draws its arc, a block settles, a page turns, a tick lands, the star turns). *Build*: light to medium; emblems would gain from an illustrator's pass.
- **D-C Night street** (from 12 + 7's silhouettes + 16's gauge). *Feel*: each project is a street at night, each agent a house shaped by its role (lead: tall house with a pennant; designer: studio with a row of arched windows; builder: workshop with a wide door and chimney; reviewer: reading house with a round window; auditor: watchtower). Five windows per house light one by one with the stage; a faceless figure paces behind the first lit window, chimney smoke rises, the tower's beam sweeps. Red lantern by the door = needs you; porch light = waiting; curtains drawn, grey = paused; dark house = off; green windows = finished. *Build*: medium; five house drawings and more small habits to keep calm.

**Recommendation: D-A Lamplight.** It is the most personable without a face: six postures and one lamp tell, from across the room, who is busy, stuck (head down under a lamp burned low), idle or waiting on you. It keeps 7's calm and the brand's light-in-the-dark idea, and one light per desk is the plainest reading of state. It is the lightest to build and stays crisp on a phone, where D-B's emblems and D-C's houses get small. Its one soft spot, said plainly on the pick page too: waiting, paused and off are all unlit and differ only by a small grey pose, so on a phone tile the status word beside the scene does that telling.

### Visual system (additions; everything else is K1 tokens and the D6 sheet)
- **Scenes are night pictures in both themes.** The light is the information and a lit room only reads against the dark, so light mode frames the scene like a photograph on paper. Scene colours are fixed and named in each direction's CSS header: wall `#0a0d12 → #131922`, furniture `#222a33`/`#313b46`, lit = K1 dark `--active #b39cff` (cone/glass gradients `#8f73f0 → #d6c9ff`), needs `#ff8578`, done `#5fd198`. Words around the scene use only tokens.
- **Scene heights**: D-A 152 px, D-B 212 px, D-C 176 px; phone tiles 112 / 76 / 96 px wide, min 104–112 px tall (`--space-*` padding as D6).
- **Floor layout**: D-A keeps D6's card grid (`minmax(280px, 1fr)`). D-B and D-C draw a floor as one continuous wall or street: `repeat(--cols, minmax(0, 1fr))` with `--cols = ceil(n / ceil(n/5))` (balanced rows: 7 desks = 4 + 3), hairline between bays, focus ring drawn inside the bay on top of the scene, one radius-`--radius-md` frame.
- **The words catch the light**: a working desk's body gets a 7 % `--active` wash from the top (green when finished); needs you never gets a wash (red stays a dot and a word).
- **Paused** gets its own glyph in the status dot (two bars, `--text-2`) and the word "Paused", as the live app's F-11 rule.

### States
Every desk state is on one floor at `?states` for each direction, in the live app's own words: Working · Working but quiet for longer than usual · Needs you · Waiting · Paused · Off · Finished just now. Screen states reuse D6: `?state=loading` (skeleton floors), `?state=empty` (first run, each direction's own empty room / windows / street in outline), `?state=error` (neutral self-retrying notice), `?state=stale` (lit scenes dim to about 25–35 % and every habit freezes: we don't know the lights are still on). Desk link hover/focus/press are D6's (border `--border-strong`, lift 2 px; focus ring `--focus-ring`); D-B/D-C bays hover to `--surface-hover`.

### Motion
Live changes happen in place (R7): a desk changes its own data attributes and the CSS moves the light (`--dur-slow`, `--ease-enter`), the cone grows from the shade (`--spring-soft`), the bar springs. Habits are slow loops (2.4–14 s) that only run while working (or waiting, for D-A's steam, and needs you, for the lantern's sway and glow). `?demo` (≈13 s): the reviewer starts, the designer moves a step, the auditor needs you, the builder finishes (green, held 2.4 s) and goes back to waiting; the head's working and need-you counts tick with it. Reduced motion (`prefers-reduced-motion` or `?motion=reduce`): every habit stops; state changes become the token cross-fade. Checked (`runs/vbnh/tools/rm-probe.mjs`, animations sampled on the changing desk): normal motion runs the fade, the 4 px tick, the cone's spring and the habits; reduced motion runs only 120 ms fades, with no transform moving. Recordings: `rec.mjs` drives `?demo` headless at 1440 and 390 (the phone scrolls to each desk before it changes) and keeps a still at each moment for the contact sheet.

### What the frontend needs
Nothing new from the server: the desk model in `dashboard/app.js` (`deskOf`: k, held, quiet, stage/prog) already carries every state. The picked direction replaces `scene()` and the Office CSS; `data-lit` = the stage fill (0–5) that app.js already computes as `fillOf`. The idle habits animate inside inline SVG, which costs per-frame style work (lesson from D7): the build should measure frame cost with every desk working and fall back to fewer habits if it shows.

### Critique log (Office directions)
- **Round 1** (my own critique, not a skill pass: I read 1440/768/390 shots of all three, every state): (1) D-B and D-C used auto-fill columns, so a floor of three desks ended in empty bays and the street just stopped; now the bays always span the floor. (2) D-C houses read too small on wide plots and the sky was empty; viewBox cropped tighter, faint stars added. (3) D-A's floor band was near-black and heavy; lifted to `#0e1218`. The waiting pose's head read as a blob over the chair back; the figure now sits up a little. (4) D-B's halo didn't show behind the frame; gradient raised to 50 % at the centre. (5) D-B's bands each restarted the gradient, so the glass looked striped; one gradient now runs across the whole glass. Measured: 0 console errors, no sideways scroll at 1440, 768 and 390 for all three pages. Before/after: `review/office-directions/r1-*`.
- **Round 2** (my own critique and accessibility checks, not skill passes: fresh 1440/390 shots, dark and light, measured with scripts, not guessed):
  - *Contrast, measured* (`runs/pjv7/tools/pcontrast.mjs`, every visible text run against its real background): a, b, c × `?states`, `empty`, `error`, `stale` × dark and light, plus the pick page at 1440 dark and 390 light. 0 runs under AA. Lowest: dark 6.26 (meta lines), light 4.86 ("3 working" in `--active` on the page). State cues in the scenes are never colour alone: each desk also has its status dot and word.
  - *Keyboard* (`runs/vbnh/tools/keys.mjs`): the order is skip link → sidebar → desks in reading order → quiet floor → page tag. On the phone, every stop is at least 44 px tall. **Found**: in D-B and D-C the focused bay's ring was hidden over the scene. The floor frame clips it, and the positioned scene paints over an inset outline; pixels showed the ring only around the words. **Fixed**: the ring is drawn as a `::after` on top, inset 1 px, in `--focus-width` `--focus-ring`. It now measures all the way round (`r2-after-b-focus.png`).
  - *Rows*: a 7-desk floor in D-B/D-C broke 5 + 2, leaving a large empty stretch of frame. Floors now break into balanced rows (`--cols = ceil(n / ceil(n/5))`, so 7 = 4 + 3 and 6 = 3 + 3) and the wall reads as one run (`r2-before-b-rows` → `r2-after-b-rows`).
  - *D-C phone crop*: the SVG overhung its 96 px strip, cutting off the sides of the studio and the lead's house. It now fills the strip (`width: 100%`, 100 px tall) and every house shows whole (`r2-before-c-phone` → `r2-after-c-phone`).
  - *Reduced motion* (found while recording): D-A's lamp cone and chair still slid on a 120 ms transform under reduced motion. They now take their new place at once and only the light fades (`a.css`); the probe shows no moving transform in any direction.
  - Kept as is: the dashed mono page tag. It is the shared mock-page marker (`hf.css`), hidden in `?shot` and in demos, and never part of the product.
- **Round 3: skill passes** (after review: rounds 1 and 2 were my own checks, so this round ran the `design:design-critique` and `design:accessibility-review` skills on fresh `?states` shots of all three at 1440 and 390, dark and light).
  - *design-critique, 🔴 D-A quiet read as working* (also the reviewer's finding): "chin on hand" was nearly the silhouette of "leaning in", and the cone at 38 % was only a little dimmer. **Fixed** (`a.js`, `a.css`): the quiet pose is now head down on folded arms on the desk (a flat, low shape), the lamp burns down to a glow at the shade (cone 12 %, no pool on the floor, bulb `#8a7cc0`), the laptop is the only light on the desk and the figure goes ambient grey. It reads apart at the 112 px phone tile. Before `r3-before-a-quiet.png` → after `r3-after-a-quiet.png`, `r3-after-a-states-390.png`.
  - *design-critique, 🔴 D-C quiet read as working*: the auditor's tower kept four lit windows at 55 %, the same lilac stack as working. **Fixed** (`c.css`): quiet windows drop to 30 % (a faint violet against the house), with no beam, smoke or pacing. Before `r3-before-c-states.png` → after `r3-after-c-states.png`.
  - *design-critique, 🟡 the legends didn't name the stuck signal*: all three legends listed working, needs you, waiting and off, but not quiet. **Fixed**: each now has a quiet entry in its own words (D-A "Lamp low, head down", D-B "Glass gone dim", D-C "Lights burned low"), with a 40 % lilac swatch (`od.css`), neutral, never red.
  - *design-critique, 🟡 D-A waiting, paused and off are close on a phone tile* (all unlit; they differ by a small grey pose, mug, ember or coat). **Kept, and said plainly** in the recommendation here and on the pick page: the status word and dot sit beside every scene, and lighting a fourth colour would break "colour only where it means something". If the owner picks D-A, the build can try a brighter ember for paused.
  - *design-critique, kept*: D-B centres its words under each window while D-A/D-C left-align. Consistent within each direction (a bay is symmetric); not a cross-direction rule.
  - *accessibility-review, contrast measured* (`pcontrast.mjs`, every text run, a/b/c `?states` at 390 in dark and light, after the fixes): 54 runs each, 0 under AA; lowest 6.26 dark, 6.05 light. The new quiet art is supplementary: each desk's link label already says "Quiet for 38 min, longer than usual", and the scene is `aria-hidden`.
  - *accessibility-review, keyboard* (`keys.mjs` at 390): skip link → brand → spend → settings → seven desks in reading order → page tag → tab bar; every stop ≥ 44 px tall. The script flags the first D-B/D-C desk "no ring" because it only reads `outline`/`box-shadow` and that ring is the `::after` overlay; the shot shows the ring drawn all the way round (`r3-b-focus-first-desk.png`). No change.
  - *accessibility-review, reduced motion* (`rm-probe.mjs` on a, b, c after the fixes): reduced motion runs only 120 ms opacity/fill/stroke fades and the token tick with no offset; the new quiet cone `scaleY` snaps rather than slides. No change needed.
  - Pick page pictures (`office-directions/img/*`), the six recordings and the contact sheets re-made after the fixes.
  - *Reviewer, the Inbox pictures were desktop compositions* (1440 wide, so a phone showed 13 px text at about 3.5 px). The owner's evidence PNGs are now shot at 390 CSS px, DPR 2, so a phone shows them about 1:1: the pick page, each direction's Office, each every-state floor (full page), and D-A's demo as six phone frames in one column (`runs/vbnh/tools/phone-evidence.mjs`).

## Office windows (37h3)

**Open `design/office-windows/index.html`**: the pick page (ids P1–P3, pictures, recordings, my pick). **My pick: P3 Little lights**, then P1 Lived-in. The owner kept one idea from vbnh (R-17): every agent is a window in the shape of our N1 mark, glowing while it works, the glass filling from the sill to the task's stage (D-B). D-A's lamps and figures and D-C's houses are out. This round gives the windows character you see at a glance, in three clearly different ways, still anonymous (R-15): no names, faces or fixed identities, and nothing gloomy or burdened.

### Frame
- **Who and when**: the owner, glancing at the Office between other work, often on the phone. **The moment**: "is anything waiting on me, and is work really happening?", answered before reading. **Success feels like**: a lively, warm building at night where each window has a temperament you start to recognise, and a small moment (a curtain twitch, sparks, a cat waking) makes you smile. Calm overall.
- **Rule kept from D-B**: the light is the gauge. Lilac fill = working, to its stage (`data-lit` 0–5, app.js `fillOf`); low and still = quiet a long while; grey held = paused; green flood = finished; red only for needs you.

### References
| Source (`office-windows/refs/`) | Take | Avoid |
|---|---|---|
| Unpacking, Witch Beam | A life told only by the things someone keeps (plants, mugs, books), never a face | Its bright daytime palette and pixel art |
| Townscaper, night | Windows lit one by one across a calm blue night; cosy without anyone shown | Warm yellow light (yellow means nothing here) |
| Kind Words, popcannibal | Small anonymous presences being kind and busy at night; warm, never lonely | Its lo-fi bedroom framing and named letters |
| A Short Hike, adamgryu | Cheerful, round, upbeat creatures with tiny habits | Specific animal characters you'd get attached to (R-15) |
| D-B Lit shrines (vbnh) | The N1 arched window at room scale, the halo, the light patch, the fill by stage | Emblems as plain objects, the owner's "no personalisation" |

### The three variants (one engine: `win.js` draws the N1 window in five layers, `ow.js` the real Office with F-3 cards)
- **P1 Lived-in** (`p1.html`): what lives in and on each window says the role, as Unpacking tells a life with no one in the picture: silhouettes behind the glass, things on the sill lit by it. Designer: sketches pegged on a line, an easel, a big-leaf plant. Builder: shelves of boxes, tools. Reviewer: bookshelves, a hanging lamp, a mug. Auditor: a clock, a checklist board, a cactus, a telescope. Lead: bunting, a globe on a stand. Working = lit to its stage, things move (steam rises, leaves sway, the sketches swing, the bunting flutters, the telescope pans); quiet = light low, a cat asleep on the sill; needs you = a red flag goes up on the sill post and waves; waiting = light off, the things still there; paused = a "back soon" card hangs in the glass; off = curtains drawn; finished = green floods in, a flower opens, sparkles.
- **P2 Temperament** (`p2.html`): no one and nothing inside; the light itself has a personality, like a street at night where you know who lives behind each window by how it glows. Each role has its own warmth, dressing and way of throwing light onto the wall: designer cool and pale, orbs of light float up out of the window (scalloped blind); builder bright, sparks pop off the corners on a quick double beat (venetian slats); reviewer warm, a reading-lamp pool spills onto the sill and a page turns now and then (café curtains); auditor clear, a lighthouse beam sweeps the wall both ways (roman shade); lead warm and breathing, fairy lights strung round the arch twinkle in turn (tied-back drapes). States are how far the dressing is drawn and what the light does: half drawn and still when quiet; one tug of the dressing and a red lamp when it needs you; a night-light and its wall show dim when waiting; drawn shut after a flicker when off; snapped up with a twitch when finished.
- **P3 Little lights** (`p3.html`): a small, round, faceless helper with a leaf sprout, glimpsed busy inside, always upbeat. All the same kind, so no one is anyone in particular. Working = busy with its role's thing (designer paints a long stroke on the glass, builder carries a block to its pile, reviewer reads on a stack of books with feet swinging, auditor peers through a big magnifier, lead conducts with a baton); quiet = sitting upright on a stool, thinking, dots coming one by one (mulling, not stuck); needs you = at the glass holding up a red card, hopping; waiting = on the inner sill with a mug; paused = by a little pause sign; off = asleep in a hammock; finished = jumps for joy as green floods in.

### Shared visual rules (`ow.css`)
- **Fixed night palette in both themes** (the light only reads against the dark): wall `#0d1118 → #151b26`, frame `#1a212b`/`#3a4554`, glass `#10151d`, lit `#8f73f0 → #cbbcff` (K1 `--active` family), ink `#1c1630`, things in the dark `#2b3443`, needs `#ff8578`, done `#5fd198`. Objects are neutral ink. Lilac and green appear only as light on them, because colour means state.
- **Needs you is the same everywhere first**: a soft red glow pools along the sill (`.w-needs`, 75 %), then each variant asks in its own way on top. Added in critique round 1 (below).
- **Floor**: one continuous wall, balanced rows of at most 4 bays (`--cols`), hairline between bays, focus ring drawn inside the bay as a `::after`. Scene 288 px tall at ≥768 (was 236: the windows sat small in the 1440 bays); on the phone the window stands left of the words in a 116 px column.
- **Cards follow audit F-3**: role · status word, the task in one line, the latest step in words, then "stage · when" (e.g. "Building · 4 min ago"). Never "Try N of M".

### Motion (Office windows)
- **Demo** (`?demo`, `?demo=loop`; 16 s, loop restarts after 1.5 s): 1.2 s the replay reviewer starts · 3.6 s the atelier-ui designer moves on a stage (the light rises on `--spring-soft`) · 6.0 s the auditor needs you · 8.4 s the replay builder finishes (green flood, held 2.4 s like the live app) · 10.8 s back to waiting · 12.4 s atelier-ui's lead goes off duty.
- **Recordings** (`office-windows/media/`, headless): `p1.webm`, `p2.webm`, `p3.webm` at 1440 and `p1-phone.webm` … at 390 (the phone scrolls to each window as it changes), plus `contact-p1.png` … frame-by-frame sheets of the seven moments. Made with `runs/37h3/tools/rec.mjs` + `sheet.mjs`.
- **Reduced motion**: `prefers-reduced-motion` or `?motion=reduce` stops every loop and moment; states change by fades of opacity, fill and stroke on `--dur-fast`. Checked by `rec.mjs`: no transform or position animation runs on any of the three during the demo. (Its re-run after round 2 listed `hf-tick` on P2's changing card words: under reduce `--shift-sm` is 0 px, so that is a 120 ms fade with `translateY(0)`, not movement.)

### Critique log (Office windows)
- **Round 1: `design:design-critique` skill** on fresh 390 and 1440 shots of P1–P3 (Office and `?states`).
  - 🔴 *P2 read as objects, and its waiting/needs "moon streak" looked like cracked glass* (also my iteration-1 note). Its rhythms lived inside the glass and barely showed in a still. **Fixed** (`p2.js`, `p2.css`, new `back` layer in `win.js`): each role now throws its light out onto the wall, big enough to read in a still (orbs, sparks, beam, lamp pool, fairy lights). The moon is gone; waiting keeps a small night-light and its own wall show at 32 %, still, so a resting window is still recognisably its own. Builder and reviewer get their own fill warmth. Before `review/office-windows/r1-before-p2-states.png` → after `r1-after-p2-states.png`.
  - 🔴 *Needs you was the weakest window in P1 and P2*: a 4 px red bulb, a small flag. It is the one state that wants the owner. **Fixed**: a shared red pool along the sill in every variant, P1's flag 1.5× on a taller post, P2's lamp bulb 6 px with a wider glow. P3's red card already read. Before `r1-before-p1-states.png` → after `r1-after-p1-states.png`.
  - 🟡 *Windows sit small in wide 1440 bays* (lots of plain wall). P2 now uses the wall; P1/P3 keep it as calm night wall. **Fixed after the round**: the scene grows from 236 to 288 px at ≥768, so every window is about 22 % larger and its life reads from across the floor; the phone tile is unchanged.
  - 🟡 *P3 designer's brush reads as a stick*, and P3's ink body is dark against the dimmer half of the glass. **Fixed after the round**: a short, chunky brush with a ferrule and a light-loaded tip, a thicker stroke that ends at the tip with a dab of paint; a thin rim of light (`.gb`, lilac working, green finished) keeps the helper's outline on the dim glass above the stage line. Before `review/office-windows/r1-followup-before-p3-1440.png` → after `r1-followup-after-p3-1440.png`.
  - ✅ Works: P1's things read at the 116 px phone tile; P3's postures (busy, thinking, holding a card, mug, hammock) say the state without the word; the head counts and F-3 cards match across all three.
- **Round 2: `design:design-critique` skill** on `img/*-390.png`, `*-1440.png`, `*-states.png` after the round-1 fixes.
  - 🟡 *P3 needs you: the red card straddled the mullion*, so in a still it read as two red panes rather than one card held up. **Fixed** (`p3.js`): the helper stands in the left pane with a narrower card (26 units) that sits wholly in one pane; the red glow follows it. Before `review/office-windows/r2-before-p3-states.png` → after `r2-after-p3-states.png`.
  - 🟡 *P3 waiting: the helper on the inner sill was cut by the left jamb* (half its body hidden on the phone). **Fixed**: shelf and helper moved 10 units in, so it sits whole, mug in hand.
  - 🟡 *P2 waiting: the night-light was a 3-unit dot behind the right jamb*, so the reviewer's waiting window looked empty, not resting. **Fixed** (`p2.js`): a small dome night-light on the inner sill, its warm pool 30 units across. Before `r2-before-p2-states.png` → after `r2-after-p2-states.png`.
  - 🟢 *P3's state legend wraps to two lines at 1440* where P1/P2 fit one; left as is (it wraps cleanly, the words are worth it).
  - ✅ Works: hierarchy is right in all three: the lit windows draw the eye first, then the red, then the card words; nothing gloomy (no slumped posture, no figure under a lamp); quiet a long while reads as thinking/resting, never stuck.
- **Accessibility: `design:accessibility-review` skill**, measured by my own headless checks (`runs/37h3/tools/a11y-ow.mjs`, `keys.mjs`):
  - *1.4.3 text contrast*: every visible text node on P1–P3 `?states` (70 each), dark and light: 0 failures. Lowest dark 6.26:1 (meta lines, `--text-3` on the card), lowest light 4.86:1 (the head's "3 working", `--accent-text`).
  - *1.4.11 / 1.4.1*: state never rests on colour or glow alone: every card names its state in words beside the dot (Working, Needs you, Waiting, Paused, Off, Done), and the windows add a shape cue (flag, red lamp, card; blinds; curtains; hammock).
  - *2.1.1 / 2.4.3 / 2.4.7*: Tab order on the Office is skip link → sidebar → per floor: project link, then each desk in reading order, then the quiet-floor row. Every desk shows a 2 px `--focus-ring` inset ring (drawn on `.desk::after`; the probe's computed-outline check reports the first desk as "no ring", a false negative, confirmed in `review/office-windows/a11y-focus-p3.png`). The pick page tabs skip link → P1–P3 → pick → each variant's links, all ≥ 44 px tall.
  - *2.3.3 / reduced motion*: during the demo, 17–28 animations run in the desk scenes normally; with `prefers-reduced-motion: reduce`, 0 run in P1, P2 and P3; states change by fades only.
  - *1.1.1 / 4.1.2*: each desk is one link named "Role, state. Task. Latest step"; the scene SVGs are hidden from assistive tech (0 exposed), so a screen reader hears the words, not the drawing. Pick page images carry alt text describing each state.
  - Nothing left to fix.

## Office fresh (f2e6)

**Recommendation: O1 Panorama.** Every desk is one size, so the imbalance that sank 5cbr (big cards beside empty gaps, then a row of thin strips) cannot happen on the desk or the phone. It keeps what the owner likes in today's Office, people at desks with the window glowing while they work, and adds Townscaper's row of lights you count at a glance, with words only where there is news. O2 Desk tiles is the close second for more character per desk at the cost of a longer phone page; O3 Roster suits an owner who mostly wants a calm list.

**Status: ready for the owner's pick (iteration 5): pick page `office-fresh/index.html`, recordings, states sheets and the recommendation below; both critique rounds and the accessibility review done.** Pages: `office-fresh/o1.html`, `o2.html`, `o3.html` (`?states`, `?demo`, `?motion=reduce`, `?theme=light`, `?shot`). One drawing for all three (`desk.js` + `desk.css`): someone at a desk in front of an N1 window, one accessory per role (beanie, headphones, bun, cap, scarf) and the role's things around the desk (P1). States: working = window lit lilac, tea steaming, a typing bob; quiet = light low and a thought in the air; needs you = a hand up with the room's one red flag; paused = light left on low, laptop shut, a back-soon card; waiting = tea in hand, cat asleep on the sill; off = curtains drawn, chair tucked in; done = the window floods green with a tick, arms up. Each direction crops it differently: `wide` for O2 work tiles, `bay` for O1 bays, O2 shelf and phone tiles, and O3 rows, and `bust` for O3's round bench portraits. Rows are balanced: 12 desks on a phone sit 4 + 4 + 4, never 4 + 4 + 1. R-20 resets the Office: 5cbr (dense one-line tiles + animation) is not merged because its balance felt off on PC and phone, and P1 windows were liked as pictures but not in the app. This round starts again from the whole screen, not from any earlier pick page. Files: `design/office-fresh/` (one data set `data.js`, roughs `rough.html?f=`, then the three directions, the pick page `index.html`, shots and recordings).

### Frame
- **Who and when**: the owner, glancing at the Office between other work, about half the time on the phone. **The moment**: "does anything need me, and is work really happening?" answered before reading, then (rarely) "what is that one doing?" answered in one line.
- **What went wrong before, in one line each**: the current Office gives every desk the same tall card, so 10 idle desks take as much room as 2 working ones (lots of empty wall). 5cbr fixed density by shrinking idle desks to one-line strips, which made two sizes that don't sit together (big working cards with blank space beside them, then a row of thin tiles). P1 made the picture the whole card, so 3 desks filled a screen.
- **So the job is balance**: give room to what has news (working, needs you, paused, just finished) and keep everyone else visible as a picture, not a line of text, at one steady rhythm. Measured on real shapes: replay 2 working + 10 idle, atelier-ui 1 needs you, dodge all off.
- **Kept from taste input (not constraints)**: a figure at a desk with the N1 window behind, lit lilac while working (today's Office); role told by things on and around the desk (P1 Lived-in); one light per desk (7); lit panes in the dark (8); a small, cosy whole seen at once (12). **Avoided**: lamp-and-silhouette, buildings, anything slumped, gloomy or cheap. Anonymous but personable (R-15): no faces or names, character from posture, habits and the desk.

### References (`design/office-fresh/` reuses the m87r and 37h3 images; no new paid sources, R-2)
| Source | Take | Avoid |
|---|---|---|
| Today's Office (`dashboard/app.js` Office, main) | The figure at a desk, the arched N1 window lit lilac while working, the patch of light on the floor | One card size for every state; the 88 px scene strip over a mostly empty card |
| 37h3 P1 Lived-in (`office-windows/img/p1-*.png`) | Role told by objects: sketches and a plant, boxes and tools, books and a mug, a clock and a checklist, bunting | The window as the whole card (3 per screen); no one at home |
| Townscaper (`office-inspiration/media/12-townscaper.jpg`, #12) | Many small lit windows read as one cosy whole; you count the lit ones without reading | 3D houses and yellow light (yellow means nothing here) |
| Control (`07-control.jpg`, #7) | One pool of light marks where the work is; everything else falls back | The gloom and the lone silhouette (R-17) |
| Monument Valley 3 (`08-mv3.jpg`, #8) | Crisp flat geometry, lit panes on dark, calm | Saturated multicolour glass |
| Apple Home (`14-home.jpg`) | Tiles on one module where "on" tiles light up and "off" tiles stay quiet but present; two sizes on one grid | Glassy blur and generic device icons |
| Linear inbox/triage (`references/linear-inbox.png`) | Dense, calm rows; one line per item; detail one click away | A table with no life in it |

### Rough layouts (`office-fresh/rough.html?f=…`, shots in `office-fresh/rough/img/`, 1440 and 390, real data shapes)
Two framings per direction, greyboxes only, to settle balance before any drawing.
- **O1 Panorama** (the picture first). *o1a*: each project is one continuous room, every desk a bay at one width, with a line of words under it only for desks with news and one "at rest" line for the rest. *o1b*: the room wraps into a 6-wide block with the words in a column on the right. **Pick: o1a at 1440, the room wrapping 4 to a row at 390.** o1b's side column truncates every task at 1440 and leaves a blank column beside quiet projects; o1a's lines get the full width, and a 12-desk room reads as one row of lights (Townscaper's "count the lit windows").
- **O2 Desk tiles** (the tile first). *o2a*: a bento module where working and needs-you tiles span two cells. *o2b*: at-work tiles in one band, then a shelf of small standby tiles that are still pictures. **Pick: o2b.** o2a's dense packing scatters the news through the grid and, on the phone, gives idle tiles as much height as the words need. o2b keeps two sizes, but both are pictures on one rhythm (the shelf tile is half a work tile), which is what 5cbr's text strips lacked.
- **O3 Roster** (the words first). *o3a*: a calm row per desk with news (portrait-size scene, role, task, latest step, stage and time), then a bench of small portraits for everyone at rest. *o3b*: every agent a table row, idle rows shorter. **Pick: o3a.** o3b is the densest but reads as a spreadsheet: twelve near-identical rows, no life (R-17). o3a's bench keeps the idle team present as little people.

### Critique log (Office fresh)
**Round 1** (2026-10-29, design-critique skill, on the three directions at 1440 and 390, dark; before shots in `runs/f2e6/scratch/s3`, after in `scratch/s4`). Focus: balance.
| Found | Where | Change |
|---|---|---|
| A tile on its own in the last row left half the width empty (Tester in replay, Designer in atelier-ui): the 5cbr imbalance again | O2 at ≥ 1100 px | The work band is two columns, and when it ends on an odd tile the shelf of small pictures sits in the empty cell beside it, its top on the tile's top (`.o2-shelf.is-beside`). With an even count, or under 1100 px, the shelf is a row of its own. replay now ends level; atelier-ui is one row (the needs-you tile with its four colleagues beside it) |
| "Waiting" printed under 9 of 12 bays: a row of grey words where the picture (tea, cat) and the floor's one line already say it | O1 room captions, O2 shelf | A quiet desk's caption is its role only. A state word shows under a picture only when it differs: Paused, Off, Working, Needs you, Done. O1 keeps the empty line so the room's captions stay one height; the screen-reader label still says "Waiting" |
| Shelf captions wrapped unevenly ("Lead Off" on one line, "Designer / Off" on two; "Performance / Waiting") | O2 shelf | Captions are always role over state, one rhythm |
| Waiting windows were near-black: a 12-desk floor at rest read as lights-out, close to the "lifeless" R-17 rules out | all (desk.css) | A waiting window is evening, not black: a soft neutral sky (`--text-3` 24 % into `--surface-selected`), and the sleeping cat a step brighter. Still clearly not lit: lilac stays only for working |
| Bench names cut ("Performa…") | O3 bench at 1440 | Seats 80 px wide (was 64); the gap narrows to keep the bench one line for 9 people |
| Kept on purpose: O3's wide middle at 1440 (task left, stage and time right) | O3 rows | It is Linear's list rhythm and keeps the time in one column you scan down; capping it made the right edge ragged |
| Checked, not a bug: the sidebar "2 working" looked faded in a demo frame | demo at 10.4 s | The frame caught the count's rise-in after the done change at 9.6 s |

What works and stays: O1's room reads as one row of lights you count without reading; O2's work tiles carry the most character (the whole corner, the role's furniture); O3 is the calmest and densest. All three hold the real shapes (2 working + 10 at rest, 1 needs you, all off) with no sideways scroll and no console errors at 390 and 1440.

**Round 2** (2026-10-29, design-critique skill on fresh shots `runs/f2e6/scratch/s5`, after in `s6`/`s7`; then the accessibility-review skill with measured checks). Focus: balance, and R-17 on a floor at rest. Before/after: `office-fresh/review/r2-*`.
| Found | Where | Change |
|---|---|---|
| A small team's room (5 desks) filled the left 540 px and left the right half of the page empty, with its one news line far below: a short block over a hole | O1 at ≥ 1100 px (atelier-ui, dodge) | A team of 6 or fewer puts its words beside the room (`.o1-body.is-short`: room `auto`, words `1fr`, `--space-6` gap). Each floor is now one balanced band; replay (12) keeps the full-width room with words under it |
| Nine waiting desks in a row were the same grey figure on the same grey window: calm, but close to lifeless (R-17) | all, most in O2 shelf and O3 bench | Waiting windows show the evening: a crescent moon and three small stars (`.dk-night`, neutral `--text-2` 88 %, so colour still only means state), the stars twinkling slowly and out of step (`--lag`). Stops under reduced motion |
| O3 bench portraits were cropped to the figure only, so the room (window, cat, moon) that gives each desk its character was gone | O3 bench | Bust crop widened to `44 22 94 86`: half the window, the person and their desk |
| "Performa…" cut again on the phone (5 seats a row = 68 px each) | O3 bench at 390 | The phone bench seats up to 5 a row; a bigger bench splits into even rows of at most 4 (`--pc` from `bal(n, 4)`: 9 = 3 + 3 + 3), portraits 64 px; names now whole |
| Kept: O1's Tab order runs through the waiting bays before the news lines | O1 | It matches the visual order (room above, words below), which 2.4.3 asks for; desks with news skip their bay (`tabindex -1`) so each is one stop, on its line |

Accessibility review (skill pass, measured by `runs/f2e6/tools/a11y.mjs`, `figc.mjs`, `rm.mjs`; data in `review/r2-a11y.json`):
- **Text contrast (1.4.3)**: every text run on O1-O3 at 390 and 1440, dark and light (79-102 runs a page): 0 under AA. Lowest 6.26:1 dark, 4.86:1 light (the legend's state words on the light surface).
- **Picture contrast (1.4.11)**, the parts that carry state: lit pane vs unlit window 6.3 dark / 4.86 light; red flag 6.14 / 5.33; green flood 9.3 / 6.27; figure 6.4 / 6.12; back-soon card 10.4 / 9.6; moon on the evening sky 3.58 / 3.11 (raised from 2.53). The evening sky and the curtains are 1.8:1 against the surface on purpose: they are the absence of light, and every waiting or off desk also says so in words (caption, bench header, screen-reader label).
- **Keyboard (2.1.1, 2.4.3, 2.4.7)**: every desk and news line is a link with a full label ("Frontend, Working. Measure speed on…"); first 20 Tab stops on all 12 page × size × theme runs show a ring (0 without). Order: skip link, sidebar (or phone header), then floors top to bottom.
- **Tap targets (2.5.5)**: 0 desk links, lines or buttons under 44 × 44 at 390.
- **Reduced motion (2.3.3)**: on `?demo` after the first change, 112-173 loops run with motion on and 0 with reduced motion, on all three pages; states still read from the still picture.
- **For the build (not a defect here)**: 173 small loops on one screen is fine for a design page but costs frames in the app (lesson from D7: SVG animations restyle the whole scene). The build should pause loops for desks off screen (`content-visibility` or an IntersectionObserver) and keep the loops on HTML wrappers where it can.

### Motion (Office fresh)
One 13 s demo per direction (`?demo`, of.js `demo()`), recorded headless at 1440 and 390 dark: `office-fresh/media/{o1,o2,o3}-{1440,390}.webm`, frame-by-frame sheets `img/{o1,o2,o3}-demo.png` (desktop, phone, reduced motion). The journey: replay's Designer starts "Trim handles, round 3" (1.2 s), needs you (4 s), goes back to work after your answer (7 s), finishes (9.6 s; green held 2.4 s like the live app's HOLD) and returns to rest (12 s). A desk that moves between the news group and the rest moves with a view transition (the same desk slides to its new place); its picture changes state by cross-fade. Loops while working: tea steam, a small typing bob, the stage light; at rest: the stars twinkle slowly and out of step. **Reduced motion**: the same changes as plain cross-fades, every loop stopped (rec2.mjs: 0 moving animations at each change on all three; the states still read from the still picture).

### Pick page (Office fresh)
`office-fresh/index.html` (shares `office-directions/pick.css`): per direction a one-line feel, the build cost, the 1440 dark shot, the phone's first screen (and the whole phone page), the states sheet (1440 and 390), links to the live page with the demo, every state, light mode, reduced motion, both recordings and the frame-by-frame sheet; then the pick. Renders at 390 and 1440 with no console errors and no sideways scroll.

## Open questions

- **D6: Office desk data**: latest step, progress unit, last activity, "quiet longer than usual" and a just-finished flag per agent (see Screens (D6) › Endpoint needs). Read data only; the lead confirms the server can send it.
- **D4: trademark search** for the logo the owner picks (USPTO / EUIPO image search, or a lawyer). Outward-facing, so not done by an agent.
- **D4: working stays lilac in every scheme** (SPEC R4 names lilac). If the owner wants a scheme whose accent replaces lilac as the working colour, R4 changes: lead's call.

- **D6: Inbox urgency of a changed charter**: the server gives `charter-tampered` priority 0 (so it would be red, "Needs you now"), but the D5 wireframe and the one data model list it under "When you have a minute" (2 need you now). The high-fi Inbox follows the model; if the server's priority stands, it moves to Needs you now and the summary reads 3 need you now on every screen. Lead's call.

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
- **D5: a long description at New project** (UX-12 B): the same `project-create` field, longer. The lead confirms it reads a paragraph or pasted brief in full when drafting the brief.
- **D5: push notifications** (UX-15 B) would need a service worker and a server-side push sender: new scope, only if the owner picks it.
- **Two groups** ("Needs you now" / "When you have a minute") assume the server marks urgency (`priority ≤ 1` or a high-severity finding, as today's red rule does). That is the same rule; it is now shown as a group.
