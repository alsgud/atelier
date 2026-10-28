/* D-C · Night street (from inspiration 12, A little town at night, with 7's silhouettes and 16's gauge idea).
   Each project is a street at night, each agent a small house whose shape says its role: the lead's tall house with
   a pennant, the designer's studio with a row of arched windows, the builder's workshop with a chimney, the
   reviewer's reading house with a round window, the auditor's watchtower. Five windows per house are the gauge:
   they light (lilac) one by one as the task moves through its five stages, and behind the first lit window a figure
   with no face goes about its work. Needs you = a red lantern by the door; waiting = a small porch light; paused =
   curtains drawn, grey; off = dark; finished = every window green for a moment. 160 × 130 grid, ground at y 118. */
(() => {
  const r = (x, y, w = 10, h = 12) => ({ d: `M${x} ${y + h}V${y + 3}a3 3 0 0 1 3-3h${w - 6}a3 3 0 0 1 3 3v${h - 3}z`, x, y, w, h });
  const a = (x, y, w = 10, h = 16) => ({ d: `M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0v${h - w / 2}z`, x, y, w, h });
  const o = (cx, cy, rr = 5.5) => ({ d: `M${cx - rr} ${cy}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0`, x: cx - rr, y: cy - rr, w: rr * 2, h: rr * 2 });
  /* Windows are listed stage 1 → 5 (bottom first, so the house fills like a gauge). door: [x, w]; chim: chimney x. */
  const HOUSES = {
    lead: { body: 'M56 118V46h48v72z', roof: '52,47 80,22 108,47', win: [r(62, 98), r(62, 79), r(88, 79), r(62, 60), r(88, 60)], door: [86, 12], extra: '<path class="c-pole" d="M80 22V8"/><path class="c-flag" d="M80 9h13l-4 4 4 4H80z"/>' },
    designer: { body: 'M28 118V68h104v50z', roof: '24,69 80,44 136,69', win: [a(34, 80), a(50, 80), a(66, 80), a(104, 80), a(120, 80)], door: [84, 14], chim: 112 },
    builder: { body: 'M32 118V72h96v46z', roof: '28,73 80,48 132,73', win: [r(38, 92), r(108, 92), r(38, 78), r(108, 78), o(80, 62, 5)], door: [64, 32], chim: 106, wide: true },
    reviewer: { body: 'M50 118V54h60v64z', roof: '46,55 80,26 114,55', win: [r(57, 84), r(93, 84), r(57, 64), r(93, 64), o(80, 42, 6)], door: [74, 12], chim: 98 },
    auditor: { body: 'M66 118 70 50h20l4 68z', roof: '62,35 80,20 98,35', win: [r(75, 88, 10, 9), r(75, 76, 10, 9), r(75, 64, 10, 9), r(75, 52, 10, 9), r(68, 37, 24, 11)], door: [74, 12], tower: true },
  };
  const scene = (d, role) => {
    const H = HOUSES[role];
    const win = H.win.filter(w => w.w);
    const first = H.win[0];
    return `<svg viewBox="14 4 132 126" preserveAspectRatio="xMidYMax meet" focusable="false">
      <defs><clipPath id="cw-${d.id}"><path d="${first.d}"/></clipPath></defs>
      ${H.tower ? '<path class="c-beam" d="M80 42 160 22V60z"/>' : ''}
      ${H.chim ? `<rect class="c-roof" x="${H.chim}" y="44" width="8" height="22"/><g class="c-smoke"><circle cx="${H.chim + 4}" cy="38" r="3"/><circle cx="${H.chim + 6}" cy="30" r="4"/><circle cx="${H.chim + 9}" cy="21" r="5"/></g>` : ''}
      <path class="c-wall" d="${H.body}"/><polygon class="c-roof" points="${H.roof}"/>${H.tower ? '<rect class="c-roof" x="66" y="35" width="28" height="15"/>' : ''}
      ${H.extra || ''}
      <g class="c-wins">${H.win.map((w, i) => w.w ? `<path class="c-win" data-i="${i + 1}" d="${w.d}"/>` : '').join('')}</g>
      <g class="c-who" clip-path="url(#cw-${d.id})"><g class="c-who-in"><circle cx="${first.x + first.w / 2}" cy="${first.y + first.h - 7}" r="2.4"/><path d="M${first.x + first.w / 2 - 4} ${first.y + first.h}a4 4.5 0 0 1 8 0z"/></g></g>
      <g class="c-curtains">${win.map(w => `<path d="M${w.x + w.w / 2} ${w.y + 1}v${w.h - 1}"/>`).join('')}</g>
      <rect class="c-door" x="${H.door[0]}" y="${118 - (H.wide ? 26 : 18)}" width="${H.door[1]}" height="${H.wide ? 26 : 18}" rx="1.5"/>
      <circle class="c-porch" cx="${H.door[0] - 4}" cy="${118 - (H.wide ? 26 : 18) + 3}" r="1.6"/><circle class="c-porch-glow" cx="${H.door[0] - 4}" cy="${118 - (H.wide ? 26 : 18) + 3}" r="7"/>
      <g class="c-lantern"><path class="c-bracket" d="M${H.door[0] - 1} ${118 - (H.wide ? 26 : 18) - 1}h-7v3"/><circle class="c-lan-glow" cx="${H.door[0] - 8}" cy="${118 - (H.wide ? 26 : 18) + 7}" r="12"/><rect class="c-lan" x="${H.door[0] - 10.5}" y="${118 - (H.wide ? 26 : 18) + 2}" width="5" height="8" rx="1.5"/></g>
      <path class="c-ground" d="M0 118h160"/>
    </svg>`;
  };
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="c-lan"><stop offset="0" stop-color="#ff8578" stop-opacity=".6"/><stop offset="1" stop-color="#ff8578" stop-opacity="0"/></radialGradient>
    <radialGradient id="c-porch"><stop offset="0" stop-color="#e9edf1" stop-opacity=".35"/><stop offset="1" stop-color="#e9edf1" stop-opacity="0"/></radialGradient>
    <linearGradient id="c-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6c9ff" stop-opacity=".35"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></linearGradient>
    <linearGradient id="c-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3848"/><stop offset="1" stop-color="#202a37"/></linearGradient>
  </defs></svg>`;
  const empty = () => `<svg viewBox="0 0 200 110" width="200" height="110" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    <path d="M20 104V64h40v40M16 65l24-20 24 20M80 104V52h36v52M76 53l22-22 22 22M140 104V70h44v34M136 71l26-20 26 20M0 104h200"/></svg>`;
  const quiet = () => `<svg viewBox="0 0 44 18" width="44" height="18" focusable="false"><path d="M3 17V9l6-5 6 5v8zM17 17V7l6-5 6 5v10zM31 17V10l5-4 5 4v7z" fill="#202a37" stroke="#313b46" stroke-width="1"/></svg>`;
  window.OD_DIR = {
    id: 'D-C', name: 'Night street', scene, defs, empty, quiet,
    legend: [['active', 'Windows lit to its stage: working'], ['quiet', 'Lights burned low: quiet a long while'], ['needs', 'Red lantern: needs you'], ['', 'Porch light: waiting'], ['off', 'Dark house: off']],
  };
})();
