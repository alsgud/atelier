/* D-A · Lamplight (from inspiration 7, One light per desk). A dark room; every agent has a desk under one hanging
   lamp. The lamp is the state: on (lilac) = working, low = quiet for longer than usual, ember = paused, off = waiting,
   green for a moment = finished. The figure is a silhouette with no face and no name; posture says the rest:
   leaning in to type, chin on hand, leaning back with a mug, arms folded, standing with a small red lantern held up
   (needs you), arms up in a stretch (done). An empty chair with a coat over it is off. Role = what is on the wall.
   Drawn on a 240 × 120 grid, floor at y 104. Everything here is static SVG; CSS picks the pose and the light. */
(() => {
  const ink = (d, w) => `<path d="${d}" stroke-width="${w}"/>`;
  const POSES = {
    // leaning in, hands on the keys
    work: `<g class="fig p-work"><g class="hd"><circle cx="97" cy="56" r="6.5"/></g>${ink('M77 84 90 65', 11)}${ink('M90 67 100 76 113 78', 4.5)}${ink('M77 86H96L98 102H103', 7)}</g>`,
    // head down on folded arms on the desk: still at it, but quiet for a long while (a flat, low silhouette)
    chin: `<g class="fig p-chin"><circle cx="103" cy="71" r="6.5"/>${ink('M77 84 95 72', 11)}${ink('M95 74 112 77.5 98 77.5', 4.5)}${ink('M77 86H96L98 102H103', 7)}</g>`,
    // leaning back, hands behind the head: waiting
    lean: `<g class="fig p-lean"><circle cx="69" cy="55" r="6.5"/>${ink('M77 84 71 66', 11)}${ink('M72 66 79 59 74 53', 4)}${ink('M77 86 97 89 111 101H116', 7)}</g>`,
    // upright, arms folded: paused
    fold: `<g class="fig p-fold"><circle cx="79" cy="55" r="6.5"/>${ink('M77 84 78 64', 11)}${ink('M78 67 87 74 76 75', 4.5)}${ink('M77 86H95L97 102H102', 7)}</g>`,
    // standing, a small red lantern held up: needs you
    raise: `<g class="fig p-raise"><circle cx="77" cy="56" r="6.5"/>${ink('M75 86 76 64', 11)}${ink('M73 67 70 84', 4)}${ink('M79 67 86 57 88 47', 4)}${ink('M73 86 72 103M78 86 79 103', 5.5)}
      <g class="lantern"><circle class="lan-glow" cx="89" cy="39" r="18"/><path class="lan-hook" d="M89 31v-3"/><rect class="lan" x="85" y="32" width="8" height="10" rx="2.2"/></g></g>`,
    // arms up in a stretch: just finished
    stretch: `<g class="fig p-stretch"><circle cx="78" cy="55" r="6.5"/>${ink('M77 84 77 64', 11)}${ink('M76 67 69 55 67 45M79 67 88 55 90 45', 4)}${ink('M77 86H95L97 102H102', 7)}</g>`,
  };
  /* One thing on the right-hand wall says the role (never a face or a name) */
  const PROPS = {
    designer: '<rect x="188" y="34" width="18" height="24" rx="1"/><path d="M193 54v-8a4 4 0 0 1 8 0v8"/><rect x="211" y="40" width="18" height="24" rx="1"/><path d="M215 58l5-10 5 10z"/>',
    builder: '<path d="M186 62h46"/><rect x="190" y="50" width="12" height="12" rx="1"/><rect x="205" y="54" width="9" height="8" rx="1"/><rect x="198" y="88" width="16" height="16" rx="1"/><rect x="215" y="94" width="12" height="10" rx="1"/><rect x="203" y="77" width="10" height="11" rx="1"/>',
    reviewer: '<path d="M186 76h46M186 50h46"/><rect x="190" y="58" width="4" height="18" rx=".8"/><rect x="195" y="61" width="4" height="15" rx=".8"/><rect x="200" y="56" width="4" height="20" rx=".8"/><path d="m206 76 5-17 3.6 1-5 17"/><rect x="194" y="34" width="4" height="16" rx=".8"/><rect x="199" y="37" width="4" height="13" rx=".8"/>',
    auditor: '<rect x="196" y="30" width="24" height="32" rx="1.5"/><path d="M203 30v-2h10v2M201 38l2 2 3-3M209 39h7M201 46l2 2 3-3M209 47h7M201 54l2 2 3-3M209 55h7"/>',
    lead: '<rect x="186" y="28" width="46" height="34" rx="1.5"/><rect x="190" y="32" width="12" height="9" rx=".5"/><rect x="207" y="34" width="12" height="9" rx=".5"/><rect x="196" y="48" width="12" height="9" rx=".5"/><rect x="216" y="47" width="11" height="9" rx=".5"/><path d="M196 41 202 48M213 43l-7 5M213 43l9 4"/>',
  };
  const scene = (d, role) => `<svg viewBox="0 0 240 120" preserveAspectRatio="xMidYMax slice" focusable="false">
    <rect class="a-wall" width="240" height="104"/><rect class="a-floor" y="104" width="240" height="16"/>
    <g class="a-prop">${PROPS[role]}</g>
    <polygon class="a-cone" points="110,31 126,31 178,104 58,104"/><polygon class="a-cone a-cone-done" points="110,31 126,31 178,104 58,104"/>
    <ellipse class="a-pool" cx="118" cy="104" rx="60" ry="5"/><ellipse class="a-pool a-pool-done" cx="118" cy="104" rx="60" ry="5"/>
    <g class="a-motes"><circle cx="112" cy="50" r=".9"/><circle cx="131" cy="68" r=".7"/><circle cx="121" cy="86" r=".8"/></g>
    <path class="a-cord" d="M118 0v22"/><path class="a-shade" d="M108 31h20l-4.5-9h-11z"/><ellipse class="a-bulb" cx="118" cy="31.5" rx="5.5" ry="1.8"/>
    <g class="a-chair"><path d="M65 86 61 62M64 86h24M76 87v14M66 103h20" /></g>
    <path class="a-coat" d="M58 61c3-3 7-3 9 0l2 24c-5 3-10 3-14 0z"/>
    <g class="a-desk"><path class="a-top" d="M96 80h80"/><path d="M100 81v23M172 81v23"/></g>
    <g class="a-laptop"><path class="a-lid" d="M131 79 125 63"/><path d="M108 79h24"/></g>
    <path class="a-lid-shut" d="M108 78.5h22"/>
    <polygon class="a-spill" points="125,64 128,78 101,62 99,52"/>
    <g class="a-mug"><path d="M154 73h7v6.5a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z"/><path class="a-steam" d="M156 70c-1.5-2 1.5-3 0-5M159 70c-1.5-2 1.5-3 0-5"/></g>
    <g class="a-figs">${Object.values(POSES).join('')}</g>
  </svg>`;
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="a-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ccff" stop-opacity=".62"/><stop offset=".55" stop-color="#b39cff" stop-opacity=".2"/><stop offset="1" stop-color="#b39cff" stop-opacity=".06"/></linearGradient>
    <linearGradient id="a-cone-done" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff0d6" stop-opacity=".6"/><stop offset=".55" stop-color="#5fd198" stop-opacity=".2"/><stop offset="1" stop-color="#5fd198" stop-opacity=".06"/></linearGradient>
    <radialGradient id="a-pool"><stop offset="0" stop-color="#cbb9ff" stop-opacity=".55"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="a-pool-done"><stop offset="0" stop-color="#9fe6c2" stop-opacity=".5"/><stop offset="1" stop-color="#5fd198" stop-opacity="0"/></radialGradient>
    <radialGradient id="a-lan"><stop offset="0" stop-color="#ff8578" stop-opacity=".55"/><stop offset="1" stop-color="#ff8578" stop-opacity="0"/></radialGradient>
    <linearGradient id="a-spill" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#b39cff" stop-opacity=".35"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></linearGradient>
    <linearGradient id="a-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0d12"/><stop offset="1" stop-color="#131922"/></linearGradient>
  </defs></svg>`;
  /* First run: the room with one lamp off and no one in it */
  const empty = () => `<svg viewBox="40 0 180 112" width="180" height="112" focusable="false">${''}
    <path d="M118 0v22" stroke="currentColor" stroke-width="1.5"/><path d="M108 31h20l-4.5-9h-11z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M96 80h80M100 81v23M172 81v23M65 86 61 62M64 86h24M76 87v14M66 103h20M48 104h168" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  window.OD_DIR = {
    id: 'D-A', name: 'Lamplight', scene, defs, empty,
    legend: [['active', 'Lamp on: working'], ['quiet', 'Lamp low, head down: quiet a long while'], ['needs', 'Red lantern: needs you'], ['', 'Lamp off: waiting'], ['off', 'Empty chair: off']],
  };
})();
