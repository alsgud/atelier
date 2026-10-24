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

## Flows

1. **Glance (desktop)**: open → sidebar shows Inbox `7` in red (some need you now) → page head says "7 waiting · 2 need you now" → the top item is already open. If the count is grey, nothing is urgent; if it is absent, inbox zero.
2. **Decide one item**: read the eyebrow (kind · project · age), the title, one sentence, see the work (pictures, question, finding) → act in the dock (primary, secondary, optional note) → the dock shows **Sending…** → **sent** (green wash, what happens next, Undo) → the queue row turns green, collapses out → the next item opens, focus moves to its title, a toast says "Done. Next: …" with Undo (6 s).
3. **Clear a session**: J/K or the pager move through items without deciding (this replaces "Later"; nothing is sent). Clicking any queue row opens it. Ctrl+Enter sends from the note field.
4. **Decide on the phone**: Inbox tab (red badge with the count) → the top item fills the screen, dock under the thumb above the tab bar, 44 px buttons → after a decision the next item opens at the top of the page → "Also waiting" is the queue below the item.
5. **First run / zero**: "All caught up · Nothing needs you." with who is working and what you decided today. Nothing red anywhere (R8).
6. **Errors and recovery**:
   - Validation: approving a design or rejecting proof with an empty note → the field turns red with one plain line ("Say what's wrong so the team can fix it."), focus goes to the field. Nothing is sent.
   - Send fails → dock shows "Couldn't reach Atelier. Nothing was sent." in red; the primary becomes **Try again**; your words stay in the field.
   - Undo → the item comes back where it was, open.
   - The Inbox itself fails to load → banner "The Inbox didn't load. Trying again in 15 s." with **Try now**, and a calm line that agents keep working. Counts in the chrome are hidden until data arrives (never show stale numbers as fact).
   - Live refresh (R7) never replaces the open item, the note being typed or the scroll position; new items join the queue quietly.

## Directions

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
| Toast | `.toasts`, `.toast`, `.toast-success`, `.toast-error`, `.toast-action` | Inverse surface, min 44 tall, radius 10, bottom centre 24 px up, max 440 wide; 6 s, with Undo or Retry |
| Banner | `.banner` | Red wash, icon, one sentence, one action |
| Empty | `.empty`, `.empty-title`, `.empty-mark`, `.ledger`, `.ledger-row` | Serif line + one sentence; ledger of today's decisions with green ticks |
| Shell | `.shell`, `.shell-side`, `.shell-top`, `.shell-main`, `.shell-tabs`, `.page-head`, `.inbox`, `.focus`, `.queue`, `.skip` | See Responsive |

## Screens

- **Inbox**: `design/screens/inbox.html`. Specified here and below.
  - Page head (52): "Inbox" 14/600 · summary 13 "7 waiting · **2 need you now**" (red part only when > 0) · pager at the right "3 of 7 ‹ ›  J K to move".
  - Focus column, top to bottom with `--space-6` between blocks: eyebrow 13 ("● Needs you now" in red when so · glyph + kind 500 · project · age); title in display serif; one `.lede` sentence; the thing itself (hero frames, quote, facts, choices, meter); Details (closed) for anything technical; links (Open all screens, Read the design notes, Run log); the dock.
  - Queue column: Needs you now, When you have a minute, Working now. On inbox zero: You decided today, Spent today.
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
| Dock, sent | — | — | — | — | — | — | green wash, what happens next, Undo |
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
- **Reduced motion**: `prefers-reduced-motion` sets every duration to 0–1 ms and `--shift` to 0: no slides, no pulse, no shimmer, spinner becomes a static ring.
- **Zoom**: at 200 % a 1440 window is 720 CSS px wide, so the phone layout applies (the breakpoints are in CSS px); not yet checked by render.

## Motion

| What | Duration | Easing | Reduced |
|---|---|---|---|
| Hover, colour | `--dur-fast` 120 ms | linear | instant |
| Press | `--dur-instant` 80 ms, 1 px down | — | none |
| Toast in, Details chevron, next item | `--dur-base` 200 ms, rise `--shift` 8 px | `--ease-out` | fade only (1 ms) |
| Decided row: green wash 700 ms, then collapse out | `--dur-slow` 320 ms, slide `--shift` | `--ease-in-out` | instant |
| Live dot ring | `--dur-pulse` 2.4 s loop | `--ease-out` | off |
| Skeleton shimmer, spinner | 1.4 s / 0.7 s loop | linear | static |

*Why*: motion only confirms what you just did (sent, gone, next) or shows life (working). Nothing moves on its own otherwise.

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

## Open questions

These are for the lead. They touch what the server sends, or they add scope.

- **Mobbin** needs a paid plan, so the connector returned nothing. I used the products' public pages instead. The question is in QUESTIONS.md, with the free option as the default.
- **Pictures inside a design gate.** The hero and strip need the gate item to list a few screenshot files from the design branch (with captions), plus a count for "+10 more". Today the item only carries the link to the clickable screens. Same as D1's open question.
- **Proof inside an owner judgement.** The item needs the evidence (screenshots, recording length, run log) of the task that delivered that outcome. Today only `/api/task/<id>` has it.
- **Suggested answers to a question.** These need the agent to offer them in QUESTIONS.md. Without them, the item shows only "Write your own answer".
- **Budget breakdown.** The per-task split of today's spend ("Trim editor $18.40 …") must come from the R2 summary, not be added up on the client.
- **Undo** needs a short grace period on the server, or a reverse action for each decision. If neither is possible, the toast shows no Undo and the dock's sent state shows no Undo either. That is a behaviour change, so it is the lead's call.
- **Two groups** ("Needs you now" / "When you have a minute") assume the server marks urgency (`priority ≤ 1` or a high-severity finding, as today's red rule does). That is the same rule; it is now shown as a group.
