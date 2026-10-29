/* Office fresh (f2e6): the one desk drawing every direction uses. One scene, cropped per direction:
     wide  0 4 200 116   the whole corner: plant, N1 window, the desk, the role's furniture (O2 work tiles)
     bay   28 8 120 112  window + someone at the desk + one desk object (O1 bays, O2 shelf and phone tiles, O3 rows)
     bust  66 32 76 72   the window's edge, someone, their desk (O3 bench portraits)
   Everything a state shows is in the drawing at once; desk.css shows the parts for the desk's data-k / data-held /
   data-quiet (the same attributes as the live app's .desk), so a state change is a cross-fade, never a re-render.
   Anonymous but personable (R-15): no face, no name. Character comes from posture (typing, leaning back with a mug,
   arms up), one small accessory per role (beanie, headphones, bun, cap, scarf) and the things around the desk (P1).
   Nothing slumped (R-17): waiting is a sip of tea and a cat asleep on the sill; off is curtains drawn, chair tucked in. */
(() => {
  const ROLE = r => /lead/i.test(r) ? 'lead' : /design/i.test(r) ? 'designer' : /audit/i.test(r) ? 'auditor'
    : /review|writ/i.test(r) ? 'reviewer' : 'builder'; // five looks, like app.js propOf; writer reads, tester builds
  const arch = 'M36 76V37a20 20 0 0 1 40 0V76z';

  // One accessory on the head (head centre 112,58 r 7.5). Shapes, never a face.
  const HAT = {
    designer: '<path class="dk-acc" d="M104.4 57a7.6 7.6 0 0 1 15.2 0z"/><circle class="dk-acc" cx="112" cy="48.6" r="1.9"/>',
    builder: '<path class="dk-acc-l" d="M103.6 59a8.4 8.4 0 0 1 16.8 0"/><rect class="dk-acc" x="101.8" y="57" width="3.6" height="6" rx="1.6"/><rect class="dk-acc" x="118.6" y="57" width="3.6" height="6" rx="1.6"/>',
    reviewer: '<circle class="dk-acc" cx="112" cy="49.2" r="3.3"/>',
    auditor: '<path class="dk-acc" d="M104.4 57.4a7.6 7.6 0 0 1 15.2 0z"/><path class="dk-acc-l" d="M118.5 57.4h5.5"/>',
    lead: '<path class="dk-acc" d="M104.6 65.6h14.8l-1.6 3h-11.6z"/><path class="dk-acc" d="M115 68l2.4 6h-3l-.8-6z"/>',
  };
  // One thing on the desk, left of the laptop (inside the bay crop).
  const ON_DESK = {
    designer: '<rect x="86" y="80" width="12" height="4" rx="1"/><path d="M89 80l6-9" class="dk-l"/>',
    builder: '<rect x="86.5" y="76" width="10" height="8" rx="1"/><path d="M86.5 79h10" class="dk-l"/>',
    reviewer: '<rect x="86" y="80.5" width="12" height="3.5" rx=".8"/><rect x="87" y="77" width="10" height="3.5" rx=".8"/><rect x="86.5" y="73.5" width="11" height="3.5" rx=".8"/>',
    auditor: '<rect x="87" y="72" width="9" height="12" rx="1"/><path d="M89 76h5M89 79h5" class="dk-l"/>',
    lead: '<circle cx="92" cy="77.5" r="4.5"/><path d="M88 77.5h8M92 73v9" class="dk-l"/><rect x="90.6" y="82" width="2.8" height="2" rx=".5"/>',
  };
  // The role's corner of the room, right of the desk (wide crop only): P1's things that tell the role.
  const ROOM = {
    designer: `<path class="dk-l" d="M168 100l9-46 9 46M177 54v46"/><rect class="dk-canvas" x="163" y="56" width="28" height="24" rx="1.5"/>
      <path class="dk-sketch" d="M168 75c4-8 8-12 11-6s6-2 8-8"/><path class="dk-l" d="M162 80h30"/>`,
    builder: `<rect x="154" y="86" width="20" height="14" rx="1.5"/><rect x="176" y="90" width="14" height="10" rx="1.5"/><rect x="159" y="74" width="12" height="12" rx="1.5"/>
      <path class="dk-l" d="M154 92h20M159 79h12"/><rect class="dk-board" x="156" y="40" width="34" height="24" rx="1.5"/>
      <path class="dk-l dk-tool" d="M163 46v12M160 46h6M180 45v13M177.5 45.5l2.5 3 2.5-3"/>`,
    reviewer: `<rect class="dk-board" x="154" y="42" width="38" height="58" rx="1.5"/><path class="dk-l" d="M154 62h38M154 82h38"/>
      <rect x="158" y="49" width="4" height="13"/><rect x="163" y="46" width="4" height="16"/><rect x="168" y="51" width="4" height="11"/><path d="M174 62l4-14 3.5 1-4 13z"/>
      <rect x="158" y="70" width="4" height="12"/><rect x="163" y="72" width="5" height="10"/><rect x="176" y="68" width="4" height="14"/><rect x="181" y="71" width="4" height="11"/>
      <rect x="160" y="90" width="9" height="10" rx="1"/><rect x="172" y="88" width="14" height="12" rx="1"/>`,
    auditor: `<circle class="dk-board" cx="172" cy="36" r="9"/><path class="dk-l dk-hand-m" d="M172 36v-6"/><path class="dk-l dk-hand-h" d="M172 36h4"/>
      <path class="dk-l" d="M164 100l8-22 8 22M172 78v22"/><rect x="164" y="64" width="22" height="7" rx="3.5" transform="rotate(-24 175 67.5)"/>`,
    lead: `<path class="dk-bunting" d="M30 14q46 12 92 0"/><path class="dk-flags" d="M38 16.2l3 6 3-5.2zM52 19.5l3 6 3-4.8zM66 21.3l3 5.8 3-5.8zM80 21.3l3 5.8 3-5.8zM94 19.6l3 5.8 3-6zM108 16.6l3 5.6 3-6.4z"/>
      <circle class="dk-board" cx="173" cy="74" r="12"/><path class="dk-l" d="M161 74h24M173 62v24M164 66q9 6 18 0M164 82q9-6 18 0M173 86v8M165 100h16l-2-6h-12z"/>`,
  };

  function scene(role, crop, i = 0) {
    const r = ROLE(role);
    const vb = { wide: '0 4 200 116', bay: '28 8 120 112', bust: '66 32 76 72' }[crop];
    return `<svg class="dk-svg" viewBox="${vb}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" style="--i:${i % 7}">
  <rect class="dk-floor" x="-40" y="100" width="280" height="30"/>
  <circle class="dk-glow" cx="56" cy="48" r="50"/>
  <polygon class="dk-patch" points="40,100 74,100 100,124 52,124"/>
  <g class="dk-room">${ROOM[r]}</g>
  <g class="dk-tree"><path class="dk-l" d="M17 100V70"/><path class="dk-leaf" d="M17 72c-9-2-12-10-9-16 6 2 9 8 9 16zM17 80c8-1 12-8 10-15-6 2-10 7-10 15zM17 64c-4-6-2-12 3-15 3 5 1 11-3 15z"/><path d="M10 100l2-12h10l2 12z"/></g>
  <path class="dk-wall-win" d="${arch}"/>
  <path class="dk-pane" d="${arch}"/>
  <path class="dk-pane-done" d="${arch}"/>
  <path class="dk-bars" d="M56 17V76M36 48H76"/>
  <g class="dk-curtain"><path d="M36.5 76V37A19.5 19.5 0 0 1 54 17.6V76c-2-3-4-3-6 0-2-3-4-3-6 0-2-3-4-3-5.5 0z"/><path d="M75.5 76V37A19.5 19.5 0 0 0 58 17.6V76c2-3 4-3 6 0 2-3 4-3 6 0 2-3 4-3 5.5 0z"/><path class="dk-l" d="M42 22v52M48 18.5v55M64 18.5v55M70 22v52"/></g>
  <path class="dk-tick" d="M47 47l6 6 12-13"/>
  <g class="dk-spark"><path d="M32 22l1.4 3.6L37 27l-3.6 1.4L32 32l-1.4-3.6L27 27l3.6-1.4z"/><path d="M82 30l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/><path d="M78 12l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"/></g>
  <rect class="dk-sill" x="32" y="75.5" width="48" height="3.5" rx="1.75"/>
  <g class="dk-pot"><path d="M67 75.5l1-6h7l1 6z"/><path class="dk-leaf" d="M71.5 69.5c-4-1-6-5-4-8 3 1 4 4 4 8zM71.5 69.5c4-1 6-4 4.5-8-3 1-4.5 4-4.5 8z"/></g>
  <g class="dk-cat"><path d="M40 75.5c0-5 4-7.5 9-7.5s8 2.5 8 7.5z"/><path d="M53 70l1.4-3.4 1.8 3zM50 69.2l1.6-3.2 1.4 3.2z"/><path class="dk-l" d="M40.5 75c-3 0-4-2-2.6-3.4"/><path class="dk-z" d="M57.5 61.5h4l-4 4.5h4"/></g>
  <g class="dk-chair"><rect x="99" y="58" width="26" height="30" rx="6"/></g>
  <g class="dk-who">
    <g class="dk-body"><path d="M96 88c0-12.5 7-19 16-19s16 6.5 16 19z"/><circle cx="112" cy="58" r="7.5"/>${HAT[r]}
      <path class="dk-rim" d="M105.4 54.5a7.5 7.5 0 0 0 0 7M97.6 84c.4-6 2.2-10 5.4-12.4"/></g>
    <g class="dk-sip"><path class="dk-arm" d="M124 76l4-6"/><rect class="dk-mug-held" x="125.5" y="62" width="6" height="7" rx="1.2"/></g>
    <g class="dk-wave"><path class="dk-arm" d="M124 74l7-16"/><circle class="dk-handc" cx="131.6" cy="56.2" r="2.8"/><path class="dk-pole" d="M131.6 54V40"/><path class="dk-flag" d="M132 40.5l10 3.5-10 3.5z"/></g>
    <g class="dk-cheer"><path class="dk-arm" d="M100 74l-7-15M124 74l7-15"/><circle class="dk-handc" cx="92.6" cy="57.4" r="2.8"/><circle class="dk-handc" cx="131.4" cy="57.4" r="2.8"/></g>
  </g>
  <g class="dk-think"><circle cx="128" cy="47" r="1.5"/><circle cx="133" cy="47" r="1.5"/><circle cx="138" cy="47" r="1.5"/></g>
  <path class="dk-lid" d="M100 84l2-13h20l2 13z"/><path class="dk-lid-mark" d="M110 80v-3.4a2 2 0 0 1 4 0V80z"/>
  <rect class="dk-lid-shut" x="100" y="81.5" width="24" height="2.5" rx="1"/>
  <g class="dk-card"><path d="M104 84l3-9h10l3 9z"/><path class="dk-card-ii" d="M110 78.4v3M114 78.4v3"/></g>
  <g class="dk-mug"><rect x="130" y="77.5" width="6.5" height="6.5" rx="1.2"/><path class="dk-l" d="M136.5 79.2h1.4a1.6 1.6 0 0 1 0 3.2h-1.4"/></g>
  <g class="dk-steam"><path d="M131.6 75c-1.5-2 1.5-3 0-5"/><path d="M134.8 75c-1.5-2 1.5-3 0-5"/></g>
  <g class="dk-thing">${ON_DESK[r]}</g>
  <rect class="dk-desk" x="83" y="84" width="62" height="3.5" rx="1.75"/><rect class="dk-desk" x="87" y="87.5" width="2.6" height="12.5"/><rect class="dk-desk" x="138.4" y="87.5" width="2.6" height="12.5"/>
</svg>`;
  }

  const defs = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
    + '<radialGradient id="dk-glow"><stop offset="0" style="stop-color:var(--active);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--active);stop-opacity:0"/></radialGradient>'
    + '<radialGradient id="dk-glow-done"><stop offset="0" style="stop-color:var(--done);stop-opacity:.5"/><stop offset="1" style="stop-color:var(--done);stop-opacity:0"/></radialGradient>'
    + '<linearGradient id="dk-pane" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--active)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--active) 62%, var(--surface))"/></linearGradient>'
    + '</defs></svg>';

  window.OF_DESK = { scene, defs, ROLE };
})();
