/* D-B · Lit shrines (from inspiration 8, with 16's idea: state readable at a glance, like a gauge). No figures at all:
   every agent is a tall arched window (the N1 mark at room scale) with its role set in the glass as a quiet emblem.
   The glass is a gauge: five bands, one per stage, light from the sill up as the task moves on (lilac). Waiting =
   unlit glass you can still read; paused = the bands hold where they stopped, grey; needs you = the keystone burns
   red; off = shutters closed; finished = the whole window floods green for a moment. Character comes from each
   emblem's one small habit while its window is lit (the compass draws, a block settles, a page turns, a tick lands,
   the star turns). Drawn on a 120 × 176 grid, sill at y 160. */
(() => {
  const ARCH = 'M24 160V64a36 36 0 0 1 72 0v96z';
  const GLASS = 'M31 154V64a29 29 0 0 1 58 0v90z';
  /* Bands (stage 1 at the sill → 5 at the crown): 5 equal slices of the glass from y 154 up to y 35 */
  const band = i => { const h = 23.8, y = 154 - h * (i + 1); return `<rect class="b-band" data-i="${i + 1}" x="31" y="${y.toFixed(1)}" width="58" height="${h.toFixed(1)}"/>`; };
  const EMBLEM = {
    designer: '<g class="em"><circle cx="60" cy="96" r="17"/><path class="em-hab" d="M43 96a17 17 0 0 1 34 0"/><path d="M60 66 50 118M60 66 70 118M53 104h14"/><circle cx="60" cy="66" r="3"/></g>',
    builder: '<g class="em"><rect x="43" y="112" width="34" height="14" rx="1"/><rect x="47" y="96" width="26" height="14" rx="1"/><rect class="em-hab" x="52" y="78" width="16" height="14" rx="1"/></g>',
    reviewer: '<g class="em"><path d="M60 82v40M60 82c-6-5-14-6-20-4v40c6-2 14-1 20 4M60 82c6-5 14-6 20-4v40c-6-2-14-1-20 4"/><path class="em-hab" d="M60 82c4-7 11-9 17-8v40c-6-1-13 1-17 8"/></g>',
    auditor: '<g class="em"><path d="M60 72 80 98 60 124 40 98z"/><path class="em-hab" d="M50 99l7 7 13-15"/></g>',
    lead: '<g class="em"><g class="em-hab"><path d="M60 72 64 94 82 98 64 102 60 124 56 102 38 98 56 94z"/><path d="M60 98m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"/></g></g>',
  };
  const scene = (d, role) => `<svg viewBox="8 12 104 164" preserveAspectRatio="xMidYMax meet" focusable="false">
    <ellipse class="b-halo" cx="60" cy="100" rx="58" ry="74"/><ellipse class="b-halo b-halo-done" cx="60" cy="100" rx="58" ry="74"/>
    <polygon class="b-patch" points="24,166 96,166 112,176 40,176"/><polygon class="b-patch b-patch-done" points="24,166 96,166 112,176 40,176"/>
    <path class="b-frame" d="${ARCH}"/>
    <g clip-path="url(#b-clip)"><path class="b-glass" d="${GLASS}"/>${[0, 1, 2, 3, 4].map(band).join('')}
      <path class="b-flood" d="${GLASS}"/><rect class="b-sheen" x="31" y="30" width="58" height="30"/>
      <g class="b-shut"><path d="${GLASS}"/><path class="b-seam" d="M60 35v119M31 94h58"/></g></g>
    <g class="b-lead">${EMBLEM[role]}<path d="M31 130.2h58M31 106.4h58M31 82.6h58M31 58.8h58" class="b-bars"/></g>
    <path class="b-glass-edge" d="${GLASS}"/>
    <path class="b-sill" d="M18 160h84"/>
    <path class="b-key" d="M60 22 65 28 60 34 55 28z"/><circle class="b-key-glow" cx="60" cy="28" r="14"/>
  </svg>`;
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <clipPath id="b-clip"><path d="${GLASS}"/></clipPath>
    <radialGradient id="b-halo"><stop offset="0" stop-color="#b39cff" stop-opacity=".5"/><stop offset=".62" stop-color="#b39cff" stop-opacity=".16"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="b-halo-done"><stop offset="0" stop-color="#5fd198" stop-opacity=".3"/><stop offset="1" stop-color="#5fd198" stop-opacity="0"/></radialGradient>
    <radialGradient id="b-key"><stop offset="0" stop-color="#ff8578" stop-opacity=".6"/><stop offset="1" stop-color="#ff8578" stop-opacity="0"/></radialGradient>
    <linearGradient id="b-lit" gradientUnits="userSpaceOnUse" x1="0" y1="154" x2="0" y2="35"><stop offset="0" stop-color="#8f73f0"/><stop offset="1" stop-color="#d6c9ff"/></linearGradient>
    <linearGradient id="b-flood" gradientUnits="userSpaceOnUse" x1="0" y1="154" x2="0" y2="35"><stop offset="0" stop-color="#3fae7a"/><stop offset="1" stop-color="#b8f0d3"/></linearGradient>
    <linearGradient id="b-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="b-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0d12"/><stop offset="1" stop-color="#121821"/></linearGradient>
  </defs></svg>`;
  const empty = () => `<svg viewBox="0 0 200 120" width="200" height="120" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    ${[30, 100, 170].map(x => `<path d="M${x - 22} 112V52a22 22 0 0 1 44 0v60z"/>`).join('')}<path d="M0 112h200"/></svg>`;
  /* A quiet floor: its windows in a row, shuttered */
  const quiet = f => `<svg viewBox="0 0 40 16" width="40" height="16" focusable="false">${[4, 16, 28].map(x => `<path d="M${x} 15V7a4 4 0 0 1 8 0v8z" fill="#222a33" stroke="#313b46" stroke-width="1"/>`).join('')}</svg>`;
  window.OD_DIR = {
    id: 'D-B', name: 'Lit shrines', scene, defs, empty, quiet,
    legend: [['active', 'Window lit to its stage: working'], ['quiet', 'Glass gone dim: quiet a long while'], ['needs', 'Red keystone: needs you'], ['', 'Unlit glass: waiting'], ['off', 'Shutters closed: off']],
  };
})();
