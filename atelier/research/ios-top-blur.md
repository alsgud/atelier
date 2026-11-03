# What blurs the top of the iPhone screen, and how our dashboard removes it

Research task 98vq, 2026-11-03. This is the lead's condensed copy for main. The full report, with every source and the full comparison table, is on branch `atelier/98vq` at the same path (`git show atelier/98vq:atelier/research/ios-top-blur.md`).

## Recommendation

**What it is.**
- **iOS 26, Safari tabs:** a soft "scroll edge effect" blur sits under the status bar. Safari paints the bar solid when a fixed or sticky element with a solid background sits along the top edge (WebKit engineer Wenson Hsieh, bug 301756; PR 47943). Our phone top bar `.hf-top` is sticky, opaque and full width, so Safari tabs should already be solid.
- **iOS 27 (Sept 2026), home-screen web apps:** a heavier system blur ("scrim", about 40 px) washes over the top of installed apps. This is open WebKit bug 325807, with no fix or statement from Apple. It is almost certainly what the owner heard about.

**Our likely trigger.** We ship `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, which draws our page under a see-through status bar, exactly where iOS 27 blurs. A comment on the WebKit tracker (bug 317153) calls this "deprecated for multiple releases… remove this key".

**The change:**
1. Delete the `black-translucent` meta from `dashboard/index.html`. Our CSS already collapses to an inset of 0.
2. Because one iOS 27.2 device test (bug 325807 c5) saw the blur stay with every status-bar style, and go away only without `viewport-fit=cover`, also drop `viewport-fit=cover` in the installed app only, with a small script run before `app.js`:
   ```html
   <script>
     if (navigator.standalone || matchMedia('(display-mode: standalone)').matches)
       document.querySelector('meta[name="viewport"]').content = 'width=device-width, initial-scale=1';
   </script>
   ```
   Side effect: `env(safe-area-inset-bottom)` becomes 0 in the app, and iOS paints the home-indicator strip itself. Check the tab bar on the device.
3. Fallback if the blur stays anyway: in standalone mode, push the top bar's content down (about 24 px, tune on the device) so nothing important sits under the blur. Flixarr and trailhead shipped this.

Keep `theme-color` and the manifest; they're harmless. **The owner must delete the home-screen icon and add it again**, because iOS caches the status-bar style when the app is installed.

**Confidence:** Safari tabs high. Step 1 medium. Step 2 low to medium (one tester). Apple offers no supported opt-out.

## What failed elsewhere
`theme-color` (ignored since iOS 26), `display: fullscreen` (the status bar stays), a high z-index opaque strip (the system blur sits above all web content), a solid strip plus the `default`/`black` style (trailhead reverted it after a device test), and an own `backdrop-filter` strip (no longer works). Traps: hidden fixed overlays with `opacity: 0` are still sampled for the bar colour, so use `display: none`.

## Still unknown
- Whether steps 1 and 2 remove the blur on the owner's iPhone. Only the device can tell: no Windows tool renders the iOS status bar or blur, and the Simulator needs a Mac.
- Whether an iOS setting removes it. Reduce Transparency is a candidate; ask the owner where they read it.
- Whether Apple changes it in 27.x. Re-check bug 325807.

## Key sources
- WebKit bugs 325807, 301756, 317153, 301994 and 305546, and PR 47943 (bugs.webkit.org, github.com/WebKit).
- WebKit blog, Safari 26.0 and 27.0.
- Danny Moerkerke, Modern Web Weekly #80 (2026-09-30).
- Ben Frain (2025-11-16); 1ar.io (2026-05-13).
- trailhead PR 121; Flixarr issue 177.
