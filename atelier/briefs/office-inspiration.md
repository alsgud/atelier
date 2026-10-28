# Office: a wide inspiration board for the owner to choose from (in the Inbox)

## Objective
The owner rejected every Office character direction so far: the A1-A3 sketches (task 9pfh) and the S1-S14 style board (task 3e5b). See R-11 and R-12. Now they want a broad, varied set of real inspirations, shown in their Inbox, to choose from. Your job is to find them and present them well. Do not design anything yet.

## What to gather
Collect 14-18 numbered inspirations (I1, I2, ...) from varied sources, so the set doesn't feel like one taste:
- Not only games. Also apps and tools that show live activity (status pages, multiplayer cursors, presence avatars, live dashboards), editorial and motion illustration, generative and ambient visuals, data art, isometric and architectural drawings, real studio and office photography, and product marketing pages.
- Cover the whole range of what the Office could be: from no characters at all (lit desks, abstract presence, light and motion) through simple avatars to rich characters and scenes. At least 4 options should have no characters.
- Every one must be polished and premium-looking (R-11: never cheap), and it must fit, or could be adapted to, the calm dark-first N1 + K1 look (DESIGN.md Brand).
- Read 9pfh's and 3e5b's work (git show on branches atelier/9pfh and atelier/3e5b) and do not repeat what the owner already saw and rejected.

## How to present it
- For each inspiration: one real image (a screenshot or still you captured, with the source link), a 3-6 word name, one plain sentence on what it would make the Office feel like, and one on what it would take to build (for example, whether it needs image or animation files rather than plain CSS, which would change today's CSS-only rule).
- Put one image per inspiration in evidence/ as a PNG, named like I01-name.png. These are what show inline in the owner's Inbox, so make each one readable on a phone.
- Also make a single page at atelier/design/office-inspiration/index.html that shows them all with ids, phone-friendly.
- Mark your top 3 and explain each in one sentence, but present everything evenly.
- Write a short Office inspiration section in DESIGN.md: the list, the sources, and your top 3.

## Sources
Use public pages only: product sites, Dribbble, Behance, ArtStation, press kits, Mobbin's free screens (R-2), and public game store pages. Capture with playwright, headless only, and never open windows on the owner's screen. Credit every source. These are references, never something to copy.

## Done means
`atelier verify design` passes. evidence/ has 14-18 numbered PNGs plus EVIDENCE.md listing each with its source. The page works at 390 and 1440 with no console errors. Criteria: AC-17 (process). R-1 critique applies to the presentation: one design-critique pass on the board itself.

## Out of scope
Drawing directions, any change to dashboard/ or lib/, and building anything.

## Hand-off
The lead requests the design gate with your images, so the owner can pick by number in the Inbox.
