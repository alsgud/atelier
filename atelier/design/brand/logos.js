/* Atelier marks, D4. Hand-built SVG on a 32-unit grid (3-unit strokes, so a 16 px favicon still has 1.5 px lines).
   Four concepts, four executions each. Colours come from the page: ink is currentColor, the accent is
   --brand-accent, knock-outs are --brand-knock (the surface the mark sits on). Nothing here is traced or stock.
   window.LOGOS: [{ id, concept, name, idea, svg(size) }] · window.lockup(id, markSize) · window.markSVG(id, size) */
(() => {
  const K = 'fill="currentColor"';
  const A = 'style="fill:var(--brand-accent)"';
  const B = 'style="fill:var(--brand-knock)"';
  const SK = (w = 3) => `fill="none" stroke="currentColor" stroke-width="${w}"`;
  const SA = (w = 3) => `fill="none" style="stroke:var(--brand-accent)" stroke-width="${w}"`;
  const SB = (w = 3) => `fill="none" style="stroke:var(--brand-knock)" stroke-width="${w}"`;
  const R = 'stroke-linecap="round" stroke-linejoin="round"';
  /* The Maker's-mark letters are drawn, not set, so they look the same on every device.
     serifA: a cap A with a thin left stroke, a thick right stroke, a thin bar and slab feet; drawn at cap height 10
     around the baseline centre, then scaled to H. All polygons run clockwise so overlaps union. */
  const SERIF_A = [
    [[-1, -10], [0, -10], [-3.4, 0], [-4.4, 0]],      // thin left stroke
    [[-0.9, -10], [1.1, -10], [4.7, 0], [2.7, 0]],    // thick right stroke
    [[-2.6, -3.9], [1.9, -3.9], [1.9, -3], [-2.6, -3]], // bar
    [[-5.6, -0.8], [-2.4, -0.8], [-2.4, 0], [-5.6, 0]], // left foot
    [[1.4, -0.8], [6, -0.8], [6, 0], [1.4, 0]],        // right foot
  ];
  const serifA = (cx, base, H, fill) => {
    const s = H / 10, f = n => +n.toFixed(2);
    const d = SERIF_A.map(p => 'M' + p.map(([x, y]) => `${f(cx - 0.2 * s + x * s)} ${f(base + y * s)}`).join('L') + 'Z').join('');
    return `<path d="${d}" ${fill}/>`;
  };
  /* serifA2: a double-storey a (bowl heavier on the left, hooked top with a ball terminal, stem with a tail),
     drawn for the L14 chop at x-height 12 on baseline 23. */
  const serifA2 = fill => `<g transform="translate(-0.6 0)">`
    + `<path fill-rule="evenodd" d="M11 19.6a4.6 3.5 0 1 0 9.2 0a4.6 3.5 0 1 0-9.2 0ZM13.7 19.9a2.6 2.1 0 1 0 5.2 0a2.6 2.1 0 1 0-5.2 0Z" ${fill}/>`
    + `<path d="M21.6 15.4C21.6 12.4 19.4 11 16.2 11C13.8 11 12 11.8 11.3 13.1L13.6 14C14.1 13.3 15 12.9 16.2 12.9C18 12.9 18.8 13.8 18.8 15.4Z" ${fill}/>`
    + `<circle cx="12.4" cy="14" r="2" ${fill}/>`
    + `<path d="M18.8 14.6H21.6V21.1C21.6 21.9 22 22.2 22.6 22.2H23.6V23H21.4C19.8 23 18.8 22.3 18.8 21.1Z" ${fill}/></g>`;
  let uid = 0;
  const clip = (d, body) => { const id = `lc${++uid}`; return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${body}</g>`; };

  const CONCEPTS = {
    grid: { name: 'Studio grid', word: 'Atelier', idea: 'The team as cells of one studio; the coloured cell is the one at work. Grows out of D2’s mark, but no longer a four-pane window (too close to a well-known four-square logo).' },
    arch: { name: 'North light', word: 'Atelier', idea: 'A studio is a room with a big window. The arch is the place your team works in, and the light in it is the work going on.' },
    thread: { name: 'Thread', word: 'atelier', idea: 'Craft as one continuous line: a lowercase a drawn like a stitch. Quiet, personal, closest to the wordmark.' },
    seal: { name: 'Maker’s mark', word: 'ATELIER', idea: 'The stamp a maker puts on finished work, and the owner’s sign-off. You decide; the mark is your approval.' },
  };

  const ARCH6 = 'M5 29V15a11 11 0 0 1 22 0v14z';
  const ARCH8 = 'M7.25 27.75V15.5a8.75 8.75 0 0 1 17.5 0v12.25z';
  const BOWL = (c = 'currentColor', extra = '') => `<circle cx="14.25" cy="18.5" r="7.25" fill="none" stroke="${c}" stroke-width="3" ${extra}/>`;

  const L = [
    /* ── Studio grid ── */
    { id: 'L1', concept: 'grid', name: 'Lit cell', idea: 'Three square cells and one round one: the round one is working.',
      body: () => `<rect x="3" y="3" width="12" height="12" rx="3" ${K}/><rect x="3" y="17" width="12" height="12" rx="3" ${K}/><rect x="17" y="17" width="12" height="12" rx="3" ${K}/><circle cx="23" cy="9" r="6" ${A}/>` },
    { id: 'L2', concept: 'grid', name: 'Open seat', idea: 'Three cells filled, one left open: the owner’s seat at the table.',
      body: () => `<rect x="3" y="3" width="12" height="12" rx="3" ${K}/><rect x="3" y="17" width="12" height="12" rx="3" ${K}/><rect x="17" y="17" width="12" height="12" rx="3" ${K}/><rect x="18.5" y="4.5" width="9" height="9" rx="2" ${SA(3)}/>` },
    { id: 'L3', concept: 'grid', name: 'Rising cell', idea: 'One cell steps up out of the grid: work coming up to you.',
      body: () => `<rect x="4.5" y="8" width="10" height="10" rx="2.5" ${K}/><rect x="4.5" y="21" width="10" height="10" rx="2.5" ${K}/><rect x="17.5" y="21" width="10" height="10" rx="2.5" ${K}/><rect x="17.5" y="3" width="10" height="10" rx="2.5" ${A}/>` },
    { id: 'L4', concept: 'grid', name: 'Grid tile', idea: 'The lit cell on an ink tile: the app-icon execution, strongest at 16 px.',
      body: () => `<rect x="1" y="1" width="30" height="30" rx="8" ${K}/><rect x="7" y="7" width="8" height="8" rx="2" ${B}/><rect x="7" y="17" width="8" height="8" rx="2" ${B}/><rect x="17" y="17" width="8" height="8" rx="2" ${B}/><circle cx="21" cy="11" r="4" ${A}/>` },
    /* ── North light ── */
    { id: 'L5', concept: 'arch', name: 'Window and light', idea: 'An arched window on its sill, with the light in it.',
      body: () => `<path d="M8 27.5V15a8 8 0 0 1 16 0v12.5" ${SK(3)} ${R}/><path d="M4.5 27.5h23" ${SK(3)} ${R}/><circle cx="16" cy="16.5" r="3.5" ${A}/>` },
    { id: 'L6', concept: 'arch', name: 'Four panes', idea: 'A solid arch window in four panes, one lit. The grid idea, housed.',
      body: () => `<path d="${ARCH6}" ${K}/>${clip(ARCH6, '<rect x="16" y="0" width="12" height="17" ' + A + '/>')}<path d="M16 3v26M5 17h22" ${SB(2.5)}/>` },
    { id: 'L7', concept: 'arch', name: 'Arch A', idea: 'The arch with a crossbar reads as an A: the studio and the initial in one line.',
      body: () => `<path d="M8 29V14a8 8 0 0 1 16 0v15" ${SK(3)} stroke-linecap="round"/><path d="M8 20.5h16" ${SA(3)}/>` },
    { id: 'L8', concept: 'arch', name: 'Line panes', idea: 'The four-pane window drawn in line, the lit pane filled. Lightest of the four.',
      body: () => `${clip(ARCH8, '<rect x="16" y="0" width="12" height="17.25" ' + A + '/>')}<path d="${ARCH8}" ${SK(2.5)} stroke-linejoin="round"/><path d="M16 6.75v21M7.25 17.25h17.5" ${SK(2)}/>` },
    /* ── Thread ── */
    { id: 'L9', concept: 'thread', name: 'Thread a', idea: 'A single-storey a: the bowl in ink, the stem and its tail as the thread.',
      body: () => `${BOWL()}<path d="M21.5 10.5v13.5q0 4 4 4" ${SA(3)} stroke-linecap="round"/>` },
    { id: 'L10', concept: 'thread', name: 'Stitched a', idea: 'The bowl as a running stitch, the stem pulled tight: work in progress.',
      body: () => `${BOWL('currentColor', 'stroke-dasharray="4.1 3.5" transform="rotate(-90 14.25 18.5)"')}<path d="M21.5 10.5v13.5q0 4 4 4" ${SA(3)} stroke-linecap="round"/>` },
    { id: 'L11', concept: 'thread', name: 'a tile', idea: 'The thread a knocked out of an ink tile, for icons and favicons.',
      body: () => `<rect x="1" y="1" width="30" height="30" rx="8" ${K}/><circle cx="14" cy="17.5" r="5.75" fill="none" style="stroke:var(--brand-knock)" stroke-width="2.75"/><path d="M19.75 10.5v11.5q0 3 3 3" ${SA(2.75)} stroke-linecap="round"/>` },
    { id: 'L12', concept: 'thread', name: 'One line, full stop', idea: 'The a in one unbroken line, then a full stop: finished, nothing loose.',
      body: () => `<path d="M21 9.5v9a7.25 7.25 0 1 0 0 .01V26" ${SK(3)} ${R}/><circle cx="26.75" cy="25" r="2.5" ${A}/>` },
    /* ── Maker's mark ── */
    { id: 'L13', concept: 'seal', name: 'Seal ring', idea: 'A serif A in a ring; a quarter of the ring is lit, the work under way.',
      body: () => `<circle cx="16" cy="16" r="13.5" ${SK(2.5)}/><path d="M16 2.5a13.5 13.5 0 0 1 13.5 13.5" ${SA(2.5)}/>${serifA(16, 21.5, 11, K)}` },
    { id: 'L14', concept: 'seal', name: 'Chop', idea: 'A square chop with a serif a cut out of it, like a studio’s stamp. Ink only.',
      body: () => `<rect x="1" y="1" width="30" height="30" rx="7" ${K}/>${serifA2(B)}` },
    { id: 'L15', concept: 'seal', name: 'Hallmark', idea: 'A cut-corner hallmark with the A and the line under it: signed off.',
      body: () => `<path d="M9 3h14l6 6v14l-6 6H9l-6-6V9z" ${SK(2.5)} stroke-linejoin="round"/>${serifA(16, 20, 9.5, K)}<path d="M11.5 23.25h9" ${SA(2.5)} stroke-linecap="round"/>` },
    { id: 'L16', concept: 'seal', name: 'Signet', idea: 'A solid signet with the A cut in, and a lit dot on its rim: you, present.',
      body: () => `<circle cx="16" cy="16" r="14" ${K}/>${serifA(15.5, 21.5, 11, B)}<circle cx="25.5" cy="25.5" r="5" ${B}/><circle cx="25.5" cy="25.5" r="3" ${A}/>` },
  ];

  const markSVG = (id, size = 32, label = '') => {
    const l = L.find(x => x.id === id);
    return `<svg class="lg" width="${size}" height="${size}" viewBox="0 0 32 32" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>${l.body()}</svg>`;
  };
  const lockup = (id, size = 20) => {
    const l = L.find(x => x.id === id);
    return `<span class="lockup lockup-${l.concept}">${markSVG(id, size)}<span class="wm">${CONCEPTS[l.concept].word}</span></span>`;
  };
  window.LOGOS = L.map(l => ({ ...l, conceptName: CONCEPTS[l.concept].name }));
  window.CONCEPTS = CONCEPTS;
  window.markSVG = markSVG;
  window.lockup = lockup;
})();
