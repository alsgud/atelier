/* Atelier marks, brand round 2 (D4b). Eleven marks grown from the two the owner liked in round 1:
   L8 Line panes (the north-light window) and L12 One line (the a in one stroke, with a full stop).
   The owner asked for smooth curves against crisp edges, one readable idea per mark, and craft that holds at 16 px.
   Hand-built SVG on a 32-unit grid. Ink is currentColor, the accent is --brand-accent, knock-outs are --brand-knock
   (the surface the mark sits on). Where a mark gets busy small, it has its own small cut (`small`), used at 20 px and under.
   Nothing here is traced, generated or set from a font.
   window.MARKS: [{ id, family, name, idea, body(), small?() }] · window.SKETCHES (set aside, with why)
   window.mark2(id, size, label) · window.lockup2(id, markSize) */
(() => {
  const K = 'fill="currentColor"';
  const A = 'style="fill:var(--brand-accent)"';
  const B = 'style="fill:var(--brand-knock)"';
  const SK = (w = 2.5) => `fill="none" stroke="currentColor" stroke-width="${w}"`;
  const SA = (w = 2.5) => `fill="none" style="stroke:var(--brand-accent)" stroke-width="${w}"`;
  const SB = (w = 2.5) => `fill="none" style="stroke:var(--brand-knock)" stroke-width="${w}"`;
  let uid = 0;
  const clip = (d, body) => { const id = `m2c${++uid}`; return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${body}</g>`; };

  /* An arch window: jambs from (x0, bottom) up to the springline, a half-circle head. */
  const arch = (x0, x1, spring, bottom) => { const r = (x1 - x0) / 2; return `M${x0} ${bottom}V${spring}a${r} ${r} 0 0 1 ${x1 - x0} 0V${bottom}z`; };

  const FAMILIES = {
    window: { name: 'North light, refined (from L8)', note: 'L8 read well from afar but nothing in it stood out. Each refinement gives the window one thing to look at.' },
    line: { name: 'One line, refined (from L12)', note: 'L12 was the most acceptable but something was missing: weight, and a detail you remember. Each refinement adds one.' },
    new: { name: 'New, in the same spirit', note: 'New ideas from the same two roots: the light in the studio, and the maker’s hand.' },
  };

  const W1 = arch(8.5, 23.5, 11.5, 22);
  const W3 = arch(9.5, 22.5, 13, 25);
  const M = [
    /* ── From L8: the north-light window ── */
    { id: 'N1', family: 'window', name: 'Window and its light',
      idea: 'The studio window and the patch of light it throws on the floor: the light is on, work is going on.',
      body: () => `<path d="${W1}" ${SK(2.25)} stroke-linejoin="round"/><path d="M16 4v18M8.5 13.5h15" ${SK(1.5)}/><path d="M8.5 24.5h15l5 6h-15z" ${A}/>`,
      small: () => `<path d="${W1}" ${SK(3)} stroke-linejoin="round"/><path d="M16 4v18" ${SK(2.5)}/><path d="M7 24.5h17l5 6.5H12z" ${A}/>` },
    { id: 'N2', family: 'window', name: 'Keystone',
      idea: 'An arched window held by its keystone, the one cut stone at the top: your decision is the piece that holds the work.',
      body: () => `<path d="M5 27V15.5a11 11 0 0 1 22 0V27z" ${K}/><path d="M9.5 27V16a6.5 6.5 0 0 1 13 0v11z" ${B}/><path d="M16 11v16M9.5 19h13" ${SK(1.5)}/><path d="M12.6 3.2h6.8l-1.5 8.3h-3.8z" ${A}/><path d="M12.6 3.2h6.8l-1.5 8.3h-3.8z" ${SB(1.3)}/><path d="M2 28.75h28" ${SK(2.5)}/>`,
      small: () => `<path d="M4.5 27V15.5a11.5 11.5 0 0 1 23 0V27z" ${K}/><path d="M10.5 27V16.5a5.5 5.5 0 0 1 11 0V27z" ${B}/><path d="M12.2 2.5h7.6l-1.7 9.5h-4.2z" ${A}/><path d="M12.2 2.5h7.6l-1.7 9.5h-4.2z" ${SB(1.6)}/><path d="M1.5 29h29" ${SK(3)}/>` },
    { id: 'N3', family: 'window', name: 'Window tile',
      idea: 'L8 cut into a square tile, as if seen from inside the room: one pane lit. The app-icon cut, strongest small.',
      body: () => `<rect x="1" y="1" width="30" height="30" rx="7" ${K}/><path d="${W3}" ${B}/>${clip(W3, `<rect x="16" y="0" width="8" height="15" ${A}/>`)}<path d="M16 6v19M9.5 15h13" ${SK(1.75)}/>`,
      small: () => `<rect x="1" y="1" width="30" height="30" rx="7" ${K}/><path d="${arch(8.5, 23.5, 13, 25.5)}" ${B}/>${clip(arch(8.5, 23.5, 13, 25.5), `<rect x="16" y="0" width="8" height="15" ${A}/>`)}<path d="M16 5v21M8 15h16" ${SK(2.5)}/>` },

    /* ── From L12: the a in one line ── */
    { id: 'N4', family: 'line', name: 'Written a',
      idea: 'L12’s a written with a broad pen: thick and thin in one stroke, a chisel-cut end and a square full stop. Signed by hand.',
      body: () => `<path fill-rule="evenodd" d="M14.3 11.2c4.4 0 7.4 3.3 7.4 7.5s-3 7.6-7.6 7.6c-4.3 0-7.3-3.3-7.3-7.4 0-4.3 3.1-7.7 7.5-7.7zM14.6 13.6c-2.2.3-3.9 2.6-3.6 5.6.3 2.8 1.9 4.9 3.8 4.8 2.3-.3 3.6-2.6 3.4-5.6-.3-2.9-1.6-5-3.6-4.8z" ${K}/><path d="M19.6 12.4l3.8-1.5V24.2c0 .8.5 1.3 1.2 1.3h.6v1.1h-2.5c-1.9 0-3.1-1-3.1-2.9z" ${K}/><path d="M26 22.6l2.3-2.3 2.3 2.3-2.3 2.3z" ${A}/>` },
    { id: 'N5', family: 'line', name: 'a, cut clean',
      idea: 'L12 drawn like a typeface: flat cut ends, a small notch where the bowl meets the stem so it stays open at 16 px, a square full stop.',
      body: () => `<path d="M21.25 12.1v14.65" ${SK(3.25)}/><circle cx="14.6" cy="18.75" r="6.4" ${SK(3.25)}/><path d="M19.1 14.3l1.3 1.3M19.1 23.2l1.3-1.3" ${SB(0.9)}/><rect x="25.25" y="23.25" width="3.5" height="3.5" ${A}/>`,
      small: () => `<path d="M22 12v15.5" ${SK(4)}/><circle cx="14.25" cy="18.5" r="6.25" ${SK(4)}/><rect x="25.5" y="23.25" width="4.25" height="4.25" ${A}/>` },
    { id: 'N6', family: 'line', name: 'Two-storey a',
      idea: 'The classic two-storey a in one line: its hook curves over like the studio’s arch, and the full stop becomes the ball at its tip.',
      body: () => `<path d="M11.6 11.4c.9-2.6 2.9-3.9 5.2-3.9 3.5 0 5.7 2.2 5.7 5.7V24.4c0 1.4.6 2.1 2 2.1" ${SK(2.75)} stroke-linecap="butt"/><path d="M22.5 17.6h-6.4a4.5 4.5 0 0 0 0 9h6.4" ${SK(2.75)}/><circle cx="11.4" cy="11.6" r="2.7" ${A}/>` },

    /* ── New ── */
    { id: 'N7', family: 'new', name: 'Someone at work',
      idea: 'One line draws the arched window and the a sitting in it: the studio, and the work inside, together.',
      body: () => `<path d="M5 29V14a10 10 0 0 1 20 0v12q0 2.6 2.6 2.6h1.4" ${SK(2.75)} stroke-linecap="butt"/><circle cx="18.6" cy="22.75" r="5" ${SA(2.75)}/>` },
    { id: 'N8', family: 'new', name: 'Lamp on',
      idea: 'The studio’s pendant lamp with its cone of light: someone left it on, your team is still working.',
      body: () => `<path d="M16 1v6" ${SK(1.5)}/><path d="M7 15a9 9 0 0 1 18 0z" ${K}/><path d="M9.5 17h13L29 30.5H3z" ${A} opacity=".9"/><path d="M12.8 15a3.2 3.2 0 0 0 6.4 0z" ${B}/>` },
    { id: 'N9', family: 'new', name: 'North-light roof',
      idea: 'The curved saw-tooth roof studios were built with: each curve turns its glass to the north for an even light all day.',
      body: () => `<path d="M1.5 28V18.5C1.5 13 5.5 8.5 11 7.5V17C11.5 12.5 15.5 8.5 20.75 7.5V17C21.25 12.5 25.25 8.5 30.5 7.5V28z" ${K}/><path d="M10 8.25v8.5M19.75 8.25v8.5M29.5 8.25v8.5" ${SA(2)}/>` },
    { id: 'N10', family: 'new', name: 'Door ajar',
      idea: 'The studio door left ajar, a line of light down its edge: the studio is open, come and look.',
      body: () => `<path d="M7 29V15a9 9 0 0 1 18 0v14" ${SK(2.5)}/><path d="M9.6 29V15.4a6.4 6.4 0 0 1 9.4-5.7L19 29z" ${K}/><path d="M20.4 10.6a6.4 6.4 0 0 1 2 4.8V29h-2z" ${A}/><path d="M4 29h24" ${SK(2.5)} stroke-linecap="round"/>` },
    { id: 'N11', family: 'new', name: 'Nib window',
      idea: 'A pen nib whose breather hole is an arched window: the maker’s hand and the studio’s light in one shape.',
      body: () => `<path d="M16 31L7 18.5C6.4 17.6 6.3 16.6 6.6 15.6L9.5 3h13l2.9 12.6c.3 1-.2 2-.6 2.9z" ${K}/><path d="M13.5 15.5v-2.75a2.5 2.5 0 0 1 5 0v2.75z" ${A}/><path d="M16 17.25V28.5" ${SB(1.5)}/>`,
      small: () => `<path d="M16 31.5L6.5 18.5C6 17.7 5.9 16.8 6.1 15.9L9 2.5h14l2.9 13.4c.2.9-.1 1.8-.6 2.6z" ${K}/><path d="M12.75 16v-3.25a3.25 3.25 0 0 1 6.5 0V16z" ${A}/><path d="M16 17.5V29" ${SB(2)}/>` },
  ];

  /* Sketched, looked at, and set aside before refining (shown on the pick page so the owner sees the range). */
  const SKETCHES = [
    { name: 'Fanlight', why: 'The half-round window over a studio door, bars spread like a fan: at 32 px it is a sunrise or a speed gauge.',
      body: () => `${clip('M3 21a13 13 0 0 1 26 0z', `<path d="M16 21V6l4.5.8 1.9 2.1L29 21z" ${A}/>`)}<path d="M3.5 21a12.5 12.5 0 0 1 25 0" ${SK(2.25)}/><path d="M16 21L5.2 14.8M16 21L9.8 10.2M16 21V8.5M16 21l6.2-10.8M16 21l10.8-6.2" ${SK(1.5)}/><path d="M2 22.5h28" ${SK(2.5)}/>` },
    { name: 'North star', why: 'A four-point sparkle: it is now the stock icon for AI features. Exactly the slop the owner named.',
      body: () => `<path d="M16 2c1 8 3 11 12 14-9 3-11 6-12 14-1-8-3-11-12-14 9-3 11-6 12-14z" ${K}/>` },
    { name: 'Compass needle', why: '“North” as a compass: every maps, travel and security product has one.',
      body: () => `<circle cx="16" cy="16" r="13" ${SK(2.25)}/><path d="M16 5l4 11h-8z" ${A}/><path d="M16 27l-4-11h8z" ${K}/>` },
    { name: 'Plumb bob', why: 'True, checked work; but upside down it is a map pin, and that is what people saw first.',
      body: () => `<path d="M16 2v6" ${SK(1.5)}/><path d="M10 12h12l-6 18z" ${K}/><path d="M10 12a6 4 0 0 1 12 0z" ${A}/>` },
    { name: 'Lancet window', why: 'Two curves meeting at a point is the curve-and-edge idea exactly, but the pointed arch reads as a church.',
      body: () => `<path d="M8 29V16C8 9 12 5 16 2c4 3 8 7 8 14v13z" ${SK(2.5)} stroke-linejoin="miter"/><path d="M16 6v23" ${SK(1.5)}/><path d="M16.75 6.5c2.5 2.5 6.5 5 6.5 10.5v1h-6.5z" ${A}/>` },
    { name: 'Studio with a roof', why: 'A pitched roof and a lit window: it is the home icon of every phone.',
      body: () => `<path d="M4 15L16 4l12 11v14H4z" ${K}/><path d="M13 29v-6a3 3 0 0 1 6 0v6z" ${A}/>` },
    { name: 'Prism', why: 'Light through a triangle splits into a band: too close to a famous album cover, and a triangle sits beside Vercel’s.',
      body: () => `<path d="M16 4l11 22H5z" ${SK(2.5)} stroke-linejoin="round"/><path d="M2 18l11-1M19.5 16.5L30 13v5z" ${A}/>` },
  ];

  const pick = (id, size) => { const m = M.find(x => x.id === id); return size <= 20 && m.small ? m.small() : m.body(); };
  const mark2 = (id, size = 32, label = '') => `<svg class="lg" width="${size}" height="${size}" viewBox="0 0 32 32" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>${pick(id, size)}</svg>`;
  /* Wordmark: one quiet face for all twelve, so the marks are compared, not the type. */
  const lockup2 = (id, size = 20) => `<span class="lockup lockup-r2">${mark2(id, size)}<span class="wm">Atelier</span></span>`;
  const sketchSVG = (i, size = 48) => `<svg class="lg" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${SKETCHES[i].body()}</svg>`;

  window.MARKS = M;
  window.MARK_FAMILIES = FAMILIES;
  window.SKETCHES = SKETCHES;
  window.mark2 = mark2;
  window.lockup2 = lockup2;
  window.sketchSVG = sketchSVG;
})();
