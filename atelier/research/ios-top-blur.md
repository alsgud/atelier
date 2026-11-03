# What blurs the top of the iPhone screen, and how our dashboard removes it

Research for task 98vq, 2026-11-03 (copied to main by the lead; the original is on branch atelier/98vq). Question from the owner: iOS added something that makes the top of the screen blurry, it can apparently be removed, find it and say how.

## Recommendation

**What it is.** There are two related things, and only the second is new.

1. **iOS 26 (Sept 2025), Safari tabs: the "scroll edge effect".** In Safari's Liquid Glass design, a soft frosted fade sits under the status bar and under the floating toolbar, so page content blurs as it scrolls beneath them. Safari also stopped using `<meta name="theme-color">` to colour those areas. WebKit's own rule, from its engineers and code: when a page has a **fixed or sticky element with a solid background along the top edge**, Safari paints the status bar area solid in that colour (a "fixed color extension") and hides the blur on that edge. Without such an element there is no solid colour, only the blur over the page.
2. **iOS 27 (Sept 2026), home-screen web apps: a heavier system blur ("scrim").** Installed web apps now get a frosted band that reaches below the status bar and washes over the top of the app (developers report about 40 px; nobody has measured it exactly). It is open WebKit bug [325807](https://bugs.webkit.org/show_bug.cgi?id=325807) (filed 2026-09-30, in Apple's internal tracker as rdar 189415153, no Apple fix or statement yet). This is almost certainly what the owner heard about. In Safari tabs, the iOS 27 blur is only about status-bar high.

**What it means for us.** Our dashboard already does the right thing for Safari tabs: on a phone, `.hf-top` is a sticky, full-width bar with an opaque `var(--bg)` background, so Safari should paint the status bar solid. The likely problem is the installed app. We ship `apple-mobile-web-app-status-bar-style = black-translucent`, which asks iOS to draw our page under a see-through status bar. On iOS 27 that is exactly where the system blur appears. In 2026 a WebKit commenter wrote that this setting "has been deprecated for multiple releases" and that we should "remove this key, and the status bar should automatically appear in the same color as the webpage". Their Apple affiliation is not shown.

**The minimal change (one line, no new code):** delete this line from `dashboard/index.html`:

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

After that, iOS puts the app below a normal status bar. `env(safe-area-inset-top)` becomes 0 in the installed app, and our existing CSS (`--size-topbar: calc(52px + env(safe-area-inset-top))`, `.hf-top { padding-top: env(safe-area-inset-top) }`) collapses the extra height on its own. Keep `theme-color` and the manifest as they are. They no longer colour Safari's bars on iOS 26+, but they are harmless and still used by Android and older iOS. The owner must **delete the home-screen icon and add it again**, because iOS reads this tag only when the app is installed.

**If the blur is still there after re-adding (step 2, an experiment):** one tester on iOS 27.2 reports that the scrim appears with every status-bar style and goes away only without `viewport-fit=cover`. So, for the installed app only, drop `viewport-fit=cover` (snippet under Options compared, B). If that also fails, the fallback is the one other projects shipped: leave the blur and move nothing important into the top ~40 px (option D).

**Confidence:**
- Safari tabs: high. We already meet WebKit's documented rule; it only needs checking on the device.
- Step 1 in the installed app: medium. The advice comes from a WebKit-tracker comment, but one iOS 27.2 tester says it is not enough on its own.
- Step 2: low to medium. One tester's report.

There is no supported switch from Apple yet. Nothing here is new work beyond deleting one line, plus an optional four-line script. Testing has to happen on the owner's iPhone, because no Windows tool renders iOS's status bar or blur (see What's still unknown).

## The best that exists

Who has actually solved this, and what they found, newest first. "Device-verified" means the source says it was checked on a real iPhone.

| Date | Who | What they achieved / found | Evidence level |
|---|---|---|---|
| 2026-10-29 | WebKit bug 325807, comment by "Dirk" (iOS 27.2 public, viewport-fit=cover, DPR 3) | In the installed app, the system blur covers the status bar area **and extends below it**, sits above all page content, and appears **with `black-translucent`, `black`, `default` and with no status-bar tag**. `display: fullscreen` does not hide the status bar. An opaque fixed white element of height `env(safe-area-inset-top)` was covered by the blur even at z-index 99999. **Removing `viewport-fit=cover` removed the blur**, but also stopped full-bleed content. The blur once vanished after sleep/wake and came back on relaunch. | Device-verified, one tester, on WebKit's bug tracker |
| 2026-10-29 | Flixarr issue #177 | Added a solid strip behind the status bar, then gave up and pushed the top bar down by **15 px** in the home-screen app so the logo clears the blur. Filed with WebKit, kept open. | Device-tested by the maintainer; no other way out found |
| 2026-10-22 | trailhead PRs #118–#121 | Tried a solid top strip, then `default`/`black` status-bar style plus a matching `theme-color`. **All three reverted the same day**: "on an iPhone, none of them worked". Final approach: move the search bar **32 px** lower on iOS and accept the blur. | Device-tested negative result |
| 2026-10-02 | WebKit bug 325807, reporter "DougS" (iPhone 16 Pro Max, iOS 27.0.1) | With `black-translucent`, content under the status bar is "obscured by a system blur". A ~12 px fixed element at the top was the only way to change the bar colour at runtime. Two test pages are attached. | Device-verified, reporter |
| 2026-09-30 | Danny Moerkerke, *Modern Web Weekly* #80 (long-time PWA writer) | iOS 27 blur is small in Safari and much taller in installed PWAs. `theme-color` and `apple-mobile-web-app-status-bar-style` "have no effect". Only fix found: a **`position: fixed` element with a solid background, ≥ 6 px tall, ≥ 80 % of the width, within 4 px of the top**. The status bar takes its colour and stays solid with no blur. No transparent-without-blur option exists. | The author's own testing; thresholds not cited |
| 2026-09-27 → 10 | simple-liturgy #12/#14, TorrServer #41, Premium-Daily-Tracker #312 and others | Same recipe in many repos: drop `black-translucent` for a solid status bar and add an 11–12 px fixed strip in the header colour. Explanation offered: "under a translucent bar WebKit reports no top inset, so the blur never stands down". | **Not device-verified** in any of them. Several read as AI-agent-written. Treat as hypotheses. |
| 2026-06 → 10 | WebKit bug 317153, comment by "The Florist" | "The black-translucent status bar mode has been deprecated for multiple releases… Please remove this key, and the status bar should automatically appear in the same color as the webpage. Home Screen web apps does not support drawing arbitrary content below the status bar." | The closest thing to an official statement; the commenter's Apple affiliation is not shown |
| 2025-11-07 | Wenson Hsieh (WebKit engineer, author of the feature), bug 301756 | A solid "top bar tint" is only used when there is a **fixed or sticky element near a viewport edge** that borders an obscured inset. Otherwise Safari shows the soft blur over the page background. | Primary, from the engineer who wrote it |
| 2025-07-13 | WebKit PR #47943 (Hsieh) | Code: Safari **hides the top scroll edge effect** (`UIScrollEdgeEffect`, the "scroll pocket") **on sides where it found a fixed colour edge**. Apps embedding WebKit can also hide it themselves. A web page cannot touch this API directly, only through the fixed/sticky element rule. | Primary (code) |
| 2025-02-14 | WebKit bug 287690 (Hsieh) | Origin of the heuristic: "detect and sample colors in fixed-position elements at the edges of the viewport" (290411@main). | Primary (code) |
| 2025-09-15 | WebKit blog, Safari 26.0 | From iOS 26, **every site added to the Home Screen opens as a web app** by default; manifest and `apple-mobile-web-app-capable` are no longer required. | Primary |

The peak today: nobody has a reliable, supported way to remove the iOS 27 home-screen blur. Best known results:

- **Moerkerke** (solid fixed edge element) and the **reporter of bug 325807** say the blur goes away.
- **Dirk** (bug 325807) and **trailhead** say it does not, under conditions that differ in ways nobody has isolated.
- **Dirk's `viewport-fit=cover` removal** is the one lever that removed it outright in a device test.

The WebKit 27.0 release notes (2026-09-17), the WWDC26 WebKit session and the Safari 26.4 notes say nothing about this blur, `theme-color` or the status bar. Apple has not documented the change.

## Options compared

Our starting point (verified in the files):

- `index.html` has `viewport-fit=cover`, `theme-color #0b0e12` (app.js:196 swaps it to `#edf0f3` in light mode), `apple-mobile-web-app-capable`, and `apple-mobile-web-app-status-bar-style = black-translucent`.
- The manifest has `display: standalone`.
- `html, body { background: var(--bg) }`.
- Below 768 px, `.hf-top` is `position: sticky; top: 0`, full width, opaque `background: var(--bg)`, with `padding-top: env(safe-area-inset-top)`.

| Option | Safari tab | Installed app | Cost | Risks / side effects |
|---|---|---|---|---|
| **A. Delete the `black-translucent` tag** (recommended first) | No change. The tag only affects home-screen apps. | iOS draws a normal status bar in the page colour; the page starts below it. Per the WebKit comment, this is the supported setup. One iOS 27.2 tester saw the blur persist anyway. | 1 line. Owner re-adds the icon. | The page no longer runs under the status bar, which we don't need. iOS may letterbox differently (bug 317153 saw a 62 pt gap on betas, fixed by beta 4). Our CSS already handles an inset of 0. Re-adding the icon loses nothing for us: the dashboard keeps no data on the phone that matters, and the login cookie may need re-entering. |
| **B. Drop `viewport-fit=cover` in the installed app only** (step 2 if A isn't enough) | Unchanged (the script only runs in standalone). | One device report: the blur goes away. | 4 lines in `index.html` head, before `app.js`. | Unverified beyond one tester. `env(safe-area-inset-bottom)` becomes 0, so the tab bar no longer extends under the home indicator; iOS paints that strip itself, probably in the page background colour (check on device). Whether WebKit honours a viewport change made by script this early is my inference; it normally re-reads the viewport meta when it changes. If not, the alternative is to drop `viewport-fit=cover` for everyone and check Safari tabs again (1ar.io reports a solid bar in the bottom gap then, which suits our solid tab bar). |
| **C. Fixed solid strip at the top edge** (Moerkerke's recipe) | Our sticky `.hf-top` already meets the rule: opaque, full width, at the edge. A separate strip adds nothing. | Works for Moerkerke; failed for Dirk (27.2) and trailhead. | ~6 lines CSS + 1 element. | Duplicates what `.hf-top` already does. 1ar.io reports that hidden fixed overlays (opacity 0) are still sampled and can take over the colour. Our toasts/sheets would need checking. Only worth trying as a diagnostic. |
| **D. Accept the blur, keep content out of it** (Flixarr, trailhead) | n/a | The blur stays, but nothing important sits under it. | ~3 lines CSS: extra top padding in standalone. | Costs ~15–40 px of phone height. A fallback, not a fix. |
| E. `theme-color` / manifest `theme_color` / `display: fullscreen` | Ignored by Safari 26+ for the bars (Apple forum, Ben Frain, bugs 301756/305546). | `fullscreen` does not hide the status bar on iOS 26.1+/27 (bugs 301994, 317153; 325807 comment 5). | — | Keep `theme-color` for Android/older iOS. Do not rely on it for iPhone. |
| F. Owner-side setting | Safari › Tabs › "Show Color in Tab Bar", and the Liquid Glass Clear/Tinted choice (26.1+), change tinting. | No setting found that removes the web-app blur. | — | I could not confirm that any iOS setting turns this off (see What's still unknown). |

**Snippets.**

Step 1, `dashboard/index.html`, delete:

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Step 2, only if the blur survives step 1 after the icon is re-added. Put this in `dashboard/index.html` right after the viewport meta:

```html
<script>
  // iOS 27 home-screen apps: the system blur over the top goes away without viewport-fit=cover (WebKit bug 325807, c5).
  if (navigator.standalone || matchMedia('(display-mode: standalone)').matches)
    document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1';
</script>
```

Fallback D, `dashboard/shell.css`, inside the `max-width: 767px` block. This is only if neither works, and the 24 px is a starting guess to tune on the device:

```css
@media (display-mode: standalone) { .hf-top { padding-top: calc(env(safe-area-inset-top) + 24px); } :root { --size-topbar: calc(76px + env(safe-area-inset-top)); } }
```

**What would change my mind:**
- If Apple documents an opt-out (an obvious candidate is the `theme-color` meta coming back for the status bar in standalone), use it instead.
- If the owner's device test shows step 1 alone fixes it, stop there.

## What failed

- **`theme-color` to colour the top.** Ignored for Safari's bars since iOS 26 (Apple forum 801239, Sept 2025; Ben Frain, Nov 2025; WebKit bug 305546, Jan 2026: "Setting theme-color has no effect"). Moerkerke (Sept 2026) confirms it on iOS 27.
- **`black-translucent` to put the page under a clear status bar.** This was the classic home-screen trick and is what we ship. On iOS 27 the system blurs exactly that region. A WebKit-tracker comment calls the setting deprecated "for multiple releases".
- **Our own blur overlay above the viewport** (muffinman.io, April 2025: a fixed `backdrop-filter` strip at `top: -80px`). The author's Aug 2026 update says it "no longer works on recent iOS versions".
- **`display: fullscreen`** to hide the status bar: the status bar stays (bugs 301994 reopened Aug 2026, 317153; 325807 c5).
- **A raised z-index on an opaque element**: the system blur sits above all web content (325807 c5).
- **Solid top strip plus `default`/`black` status bar**: reverted after it failed on an iPhone (trailhead #121, 2026-10-22).
- **Traps.**
  - `opacity: 0` or `pointer-events: none` fixed overlays are still sampled for the tint, so a hidden modal backdrop can recolour the bars. Use `display: none` (1ar.io, May 2026).
  - A fixed `dialog`/popover with a different colour takes over the bars (Ben Frain).
  - Safari 26.2 soft navigation swaps the solid bar for a shadow when a fixed header differs from the body colour (bug 305546, open, fix PR #60377 unmerged).
  - **iOS caches the status-bar style at install**: changing the tag does nothing until the icon is removed and re-added (bug 317153 c5; simple-liturgy, trailhead).
  - Many of the GitHub "fixes" found were merged without a device test.

## What's still unknown

1. **Does step 1 (removing `black-translucent`) remove the blur on the owner's iPhone?** The sources conflict: the WebKit comment and the simple-liturgy reasoning say yes, Dirk on 27.2 says no. *Cheapest experiment:* deploy step 1 on the owner's try-out port, delete and re-add the icon, open the Inbox, scroll it under the top, take a screenshot. About 5 minutes.
2. **Does dropping `viewport-fit=cover` (step 2) work, and does setting it from script count?** One report says it works; that the script route is equivalent is my inference. *Experiment:* same as 1, with the step 2 snippet; if the blur stays, hard-code the viewport without `cover` and retry.
3. **The exact rule for which elements Safari samples.** The figures of 4 px from the top, ≥ 80 % width and ≥ 6 px tall come from reverse-engineering (Moerkerke, 1ar.io). WebKit's code (`FixedContainerEdges`, bug 287690) is the authority, but I did not read the constants. `.hf-top` is 100 % wide, sits at 0 px and is ≥ 52 px tall, so it should qualify whatever the exact numbers are. *Experiment:* look at the top of the Safari tab on the device while scrolling; solid means it qualifies.
4. **Is there an owner-side iOS setting that removes it?** The owner "learnt it can be removed". I found no user setting for the web-app blur. Reduce Transparency and the Clear/Tinted Liquid Glass choice are candidates I could not verify. *Experiment:* toggle Settings › Accessibility › Display & Text Size › Reduce Transparency and reopen the app. This is worth asking the owner where they read it.
5. **Will Apple change this in 27.x?** Bug 325807 is unassigned, though it is in Apple's internal tracker. *Experiment:* re-check the bug after each iOS update and remove workaround D if we used it.
6. **Testing without an iPhone is not possible for this effect.**
   - Playwright's WebKit on Windows has no iOS browser bars, status bar, scroll edge effect or standalone mode.
   - The iOS Simulator needs a Mac (Xcode); we have none.
   - What can be checked headless: that the tag is gone; that `.hf-top` is sticky, opaque and full width at 390 px; that `env(safe-area-inset-top)` = 0 leaves a 52 px bar; and that `matchMedia('(display-mode: standalone)')` is false in a normal page. Use `runs/66eq/tools` style scripts, phone width 390, light and dark.
   - The real check is the owner's iPhone. Run it in the Safari tab and in the re-added home-screen app, light and dark, at rest and scrolled, with a screenshot of each. Compare with a screenshot taken before the change.

## Sources

Primary sources (WebKit, Apple) first, then reports from developers. Every link was opened and read on 2026-11-03 unless noted.

1. https://bugs.webkit.org/show_bug.cgi?id=325807 (2026-09-30, updated 2026-10-29): "REGRESSION (iOS 27): Home Screen web apps can no longer draw under the status bar". Establishes the iOS 27 system blur in installed apps; in Apple's tracker (rdar 189415153); iOS 27.2 test matrix (any status-bar style, fullscreen and z-index fail; removing viewport-fit=cover removes it).
2. https://bugs.webkit.org/show_bug.cgi?id=301756 (2025-10-31, Apple engineer reply 2025-11-07): Wenson Hsieh explains that the solid "top bar tint" is used only with a fixed or sticky element near the edge; otherwise the soft blur shows.
3. https://github.com/WebKit/WebKit/pull/47943 (2025-07-13, bug 295843): WebKit hides the top scroll edge effect (`UIScrollEdgeEffect`, "pocket") on sides with a fixed colour edge; apps embedding WebKit can hide it too.
4. https://bugs.webkit.org/show_bug.cgi?id=287690 (2025-02-14): origin of the heuristic that samples fixed-position elements at the viewport edges (290411@main).
5. https://bugs.webkit.org/show_bug.cgi?id=317153 (2026-06-15 → 2026-10-15): "black-translucent… deprecated for multiple releases… remove this key"; the style is fixed at install; the 62 pt letterbox on betas, fixed by beta 4.
6. https://bugs.webkit.org/show_bug.cgi?id=301994 (2025-11-04, reopened 2026-08-04 by Apple's Marcos Caceres): the status bar stays visible in `display: fullscreen` web apps on iOS 26.1+ and iOS 27.
7. https://bugs.webkit.org/show_bug.cgi?id=305546 (2026-01-15, open): Safari 26.2 replaces the solid status bar with a shadow on soft navigation; theme-color has no effect.
8. https://bugs.webkit.org/show_bug.cgi?id=300965 (2025-10-17, fixed 2025-10-21): dialog backdrop did not extend under Safari 26's bars; shows how fixed overlays interact with the bars.
9. https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ (2025-09-15): every site added to the Home Screen opens as a web app; no manifest needed.
10. https://webkit.org/blog/18325/webkit-features-for-safari-27-0/ (2026-09-17) and https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/ (2026-06-08): read in full; **no mention** of the blur, theme-color or the status bar, so the change is undocumented.
11. https://webkit.org/blog/17862/webkit-features-for-safari-26-4/ (2026-03-24): the only scroll-edge item is a fix for apps embedding WebKit, not for web pages.
12. https://developer.apple.com/videos/play/wwdc2025/233/ (June 2025) and https://developer.apple.com/videos/play/wwdc2026/204/ (June 2026): the WWDC WebKit sessions; neither covers the bar tint or the blur.
13. https://developer.apple.com/forums/thread/801239 (Sept 2025): a developer's theme-color stopped working on Safari 26; the accepted community answer says the colour now comes from the html/body background (not an Apple answer).
14. https://developer.apple.com/forums/thread/845732 (Sept 2026): developers complain that iOS 27's top blur is heavier than iOS 26's; no Apple answer and no opt-out for the web.
15. https://modernwebweekly.substack.com/p/so-whats-up-with-the-ios27-blur (Danny Moerkerke, 2026-09-30): iOS 27 blur is taller in installed PWAs; theme-color and status-bar-style have no effect; the fixed-solid-element recipe (≥ 6 px, ≥ 80 %, ≤ 4 px).
16. https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/ (2025-11-16): on iOS 26.1 the tint comes from the body, or from a fixed element when one is shown; theme-color broken.
17. https://1ar.io/updates/safari-26-liquid-glass-web/ (Pavel Larionov, 2026-05-13): reverse-engineered tint rules (fixed/sticky only, ~4 px top / 80 % width, hidden overlays still sampled); viewport-fit=cover and root background advice.
18. https://muffinman.io/blog/pwa-ios-status-bar-blur/ (2025-04-11, updated Aug 2026): the old "own blur strip" trick for black-translucent; the update says it no longer works on recent iOS.
19. https://github.com/YuzhouTian/trailhead/pull/121 (2026-10-22): device-tested failure of the solid strip and solid status-bar workarounds; reverted; search bar moved 32 px down instead.
20. https://github.com/Flixarr/flixarr/issues/177 (2026-10-27 → 29): the blur over the logo and bell in a home-screen app; final workaround is a 15 px offset; issue kept open upstream.
21. https://github.com/parksmithh/simple-liturgy/pull/12 (2026-09-27): typical community fix (solid `black` status bar plus an 11 px fixed strip). Not device-verified; included as an example of unverified advice.
22. https://github.com/water-rs/waterui/issues/2727 (2026-10-16): measured on Safari 27 in the iOS 27 simulator: the band behind the status bar takes the colour of an opaque fixed element along the top edge; theme-color ignored; Safari tab safe-area insets are 0.

Could not load: Apple's `UIScrollEdgeEffect` documentation page (it rendered only its title), so the API is cited from WebKit's PR instead. I did not read the attachments to bug 325807 (the iOS 27.0.1 result tables). I did not read WebKit's `FixedContainerEdges` sampling constants.
