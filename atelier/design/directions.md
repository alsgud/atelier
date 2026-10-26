# Two directions for the Inbox

Both use the same content (from the real projects replay, dodge and atelier-ui), the same colour rules
(lilac = working, red = needs you, green = done, everything else grey) and the same decisions. They differ
in how the Inbox is laid out and how you move through it.

Open the mockups in a browser: `direction-a/inbox.html`, `direction-b/inbox.html`. Narrow the window
below 640 px (A) or 720 px (B) to see the phone layout. A small switcher in the corner flips light/dark and
the empty state; `?theme=dark`, `?state=empty` and `?open=<item>` do the same in the address.

## A · The list

The Inbox is one calm list of plain sentences, most urgent first, like Linear's inbox: you see everything
that waits on you at a glance, and an item opens in place inside the list, showing the thing itself (the
design, the question, the proof, the finding) with its buttons right under it. It is the most familiar
pattern and the fastest to scan, and on the phone it stays one list you scroll, with the decision buttons
full width inside the opened item. The trade-off: the thing you're judging gets the width of a list row, so
big work (a design, a recording) is shown smaller, and a long list pushes the open item down the page.

| | Light | Dark |
|---|---|---|
| Desktop, with items (design gate opened) | `shots/a-desktop-light.png` | `shots/a-desktop-dark.png` |
| Phone 360 px, with items (proof opened) | `shots/a-phone-light.png` | `shots/a-phone-dark.png` |
| Desktop, nothing needs you | `shots/a-desktop-light-empty.png` | `shots/a-desktop-dark-empty.png` |
| Phone 360 px, nothing needs you | `shots/a-phone-light-empty.png` | `shots/a-phone-dark-empty.png` |

## B · One at a time

The Inbox is a queue you work through: the top decision fills the page with the work shown large, the
decision sits in a dock under your thumb, and the rest of the queue, who is working now and today's spend
wait in a quiet column beside it. It makes each decision feel deliberate and gives the work room (designs
and proof read like the real thing), and on the phone it is one item per screen with next and previous,
with Accept and Reject always within reach. The trade-off: you see one item in full and the others only as
a one-line list (on the phone, only as "5 of 7"), so it is less of a glance and more of a session, and it
is a less familiar pattern than a mail-style list.

| | Light | Dark |
|---|---|---|
| Desktop, with items (design gate opened) | `shots/b-desktop-light.png` | `shots/b-desktop-dark.png` |
| Phone 360 px, with items (proof opened) | `shots/b-phone-light.png` | `shots/b-phone-dark.png` |
| Desktop, nothing needs you | `shots/b-desktop-light-empty.png` | `shots/b-desktop-dark-empty.png` |
| Phone 360 px, nothing needs you | `shots/b-phone-light-empty.png` | `shots/b-phone-dark-empty.png` |

## What I recommend

**A, with one thing borrowed from B.** The brief's main moment is a one-minute glance between other
things, and the owner likes familiar patterns: A answers "does anything need me?" in one look and
decides in place without leaving the list. From B I'd keep the larger preview of the work when the item is
a design or proof (the opened item can widen to the full column), and on the phone, the decision buttons
pinned at the bottom of the screen while an item is open.

## Notes for the gate

- Both pass WCAG AA for text in light and dark (measured: secondary text 4.5–5.4:1, lilac 5.0–9.8:1,
  red 5.0–7.8:1, green 4.6–9.7:1 against every surface it sits on). Phone tap targets are at least 44 px.
  Neither scrolls sideways at 360 px (checked in the screenshot run).
- Fonts are the system's own (Segoe UI Variable on Windows, San Francisco on the phone), so nothing loads
  from the internet and nothing needs a licence.
- The design previews and clip pictures inside the items are drawn stand-ins; the real Inbox shows the
  real screenshots from the view port.

## Open questions (for the lead; they touch what the server sends)

- **Proof inside an outcome to judge.** Showing a task's screenshots and recording right in "Try the shorts
  feed…" needs the Inbox item to carry the evidence of the task that delivered that outcome. Today only the
  task page has it (`/api/task/<id>` → `evidence`).
- **Pictures of a design inside a gate.** The two previews need the gate item to list a few screenshot
  files from the design branch; today it only has the link to the clickable screens.
- **Suggested answers to a question** ("Yes, keep them out" / "No, include them") just fill the answer box;
  they'd need the agent to offer them in QUESTIONS.md. Without them the item still works with a typed answer.
- **"Later" in B** only moves to the next item; nothing is sent to the server.
