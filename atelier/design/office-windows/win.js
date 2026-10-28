/* The shared window: our N1 mark at room scale (arched glass, one mullion, the transom at the springline, the patch of
   light it throws below). Drawn on a 160 × 200 grid; the glass runs x 38–122, y 32 (crown) – 74 (springline) – 166 (sill).
   Its light is the gauge (D-B, R-17): the room fills from the sill up to the task's stage (data-lit 0–5, one fifth each)
   and the rest of the room glows faintly. A variant passes four layers, back to front:
     room   what is inside, behind the glass (clipped to it): silhouettes against the light
     dress  curtains, blinds, signs: inside the glass, in front of the room, behind the glazing bars
     sill   what stands on the sill, outside, lit from the window
     front  anything in front of it all (a flag, steam, sparkles); may spill past the frame
   Fixed night palette in both themes (the light is the information and only reads against the dark). */
(() => {
  const ARCH = 'M30 170V74a50 50 0 0 1 100 0v96z';
  const GLASS = 'M38 166V74a42 42 0 0 1 84 0v92z';
  window.OW_GLASS = GLASS;
  window.OW_WIN = ({ room = '', dress = '', sill = '', front = '' }) => `<svg viewBox="8 8 144 192" preserveAspectRatio="xMidYMax meet" focusable="false">
    <ellipse class="w-halo" cx="80" cy="104" rx="76" ry="88"/><ellipse class="w-halo w-halo-done" cx="80" cy="104" rx="76" ry="88"/>
    <polygon class="w-patch" points="38,180 122,180 140,198 56,198"/><polygon class="w-patch w-patch-done" points="38,180 122,180 140,198 56,198"/>
    <path class="w-frame" d="${ARCH}"/>
    <g clip-path="url(#ow-clip)">
      <path class="w-glass" d="${GLASS}"/>
      <rect class="w-room" x="38" y="32" width="84" height="134"/>
      <rect class="w-fill" x="38" y="32" width="84" height="134"/>
      <rect class="w-fill w-fill-done" x="38" y="32" width="84" height="134"/>
      <g class="w-in">${room}</g>
      <g class="w-dress">${dress}</g>
      <rect class="w-sheen" x="38" y="20" width="84" height="40"/>
    </g>
    <path class="w-bars" d="M80 33v133M38 74h84"/>
    <path class="w-edge" d="${GLASS}"/>
    <rect class="w-sill" x="22" y="165" width="116" height="7" rx="1.5"/>
    <g class="w-out">${sill}</g>
    <g class="w-front">${front}</g>
  </svg>`;
  window.OW_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <clipPath id="ow-clip"><path d="${GLASS}"/></clipPath>
    <radialGradient id="ow-halo"><stop offset="0" stop-color="#b39cff" stop-opacity=".42"/><stop offset=".6" stop-color="#b39cff" stop-opacity=".12"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="ow-halo-done"><stop offset="0" stop-color="#5fd198" stop-opacity=".34"/><stop offset="1" stop-color="#5fd198" stop-opacity="0"/></radialGradient>
    <linearGradient id="ow-fill" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8f73f0"/><stop offset=".86" stop-color="#cbbcff"/><stop offset="1" stop-color="#cbbcff" stop-opacity="0"/></linearGradient>
    <linearGradient id="ow-fill-done" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3fae7a"/><stop offset="1" stop-color="#b8f0d3"/></linearGradient>
    <linearGradient id="ow-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="ow-red"><stop offset="0" stop-color="#ff8578" stop-opacity=".55"/><stop offset="1" stop-color="#ff8578" stop-opacity="0"/></radialGradient>
  </defs></svg>`;
})();
