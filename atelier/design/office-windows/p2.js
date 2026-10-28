/* P2 · Temperament. No objects and no one inside: the character is in the light and how the window is dressed, as a
   street at night tells you who lives behind each window by its blind and its glow. Each role has its own dressing
   and its own rhythm of light while it works:
     designer  scalloped roller blind · soft lights drifting, cool and pale      (a daydreamer)
     builder   venetian slats         · a quick double beat, like a hammer      (busy hands)
     reviewer  café curtains          · a steady reading lamp low on the left   (the patient one)
     auditor   roman shade            · a slow beam sweeping the glass          (missing nothing)
     lead      tied-back drapes       · a warm, slow breath in the whole glow   (keeping time)
   States are how far the dressing is drawn and what the light does: working = open, rhythm on · quiet a long while =
   half drawn, light low and still · needs you = open, a small red lamp on the sill blinks twice, then glows · waiting
   = open, light off, the moon on the glass · paused = half drawn, light held grey · off = drawn shut (the light
   flickers out first) · finished = the dressing snaps up with a twitch and green floods in. */
(() => {
  const slats = Array.from({ length: 15 }, (_, i) => `<rect x="38" y="${32 + i * 9}" width="84" height="7" rx="1"/>`).join('');
  const DRESS = {
    designer: `<g class="p2-blind"><path d="M38 -104h84V0${'a6 6 0 0 1-12 0'.repeat(7)}z" fill="#2c2a46"/><path d="M38 -2h84" stroke="#3b3860" stroke-width="2"/><path d="M80 0v9" stroke="#3b3860" stroke-width="1.2"/><circle cx="80" cy="12" r="3" fill="none" stroke="#575380" stroke-width="1.4"/></g>`,
    builder: `<g class="p2-slats"><g fill="#2a3240">${slats}</g><path d="M50 32v136M110 32v136" stroke="#1a212b" stroke-width="1"/></g>`,
    reviewer: `<g class="p2-cafe"><path class="p2-l" d="M38 108h43v58H38z" fill="#2f2b40"/><path class="p2-r" d="M79 108h43v58H79z" fill="#332e46"/><path d="M48 112v54M59 112v54M70 112v54M90 112v54M101 112v54M112 112v54" stroke="#262235" stroke-width="1.6" class="p2-folds"/></g><path d="M34 107h92" stroke="#55606f" stroke-width="2.4" stroke-linecap="round"/><g class="p2-cafe-top"><path d="M38 30h84v78H38z" fill="#2a2740"/></g>`,
    auditor: `<g class="p2-roman"><path d="M38 30h84v138H38z" fill="#2d2c40"/>${[60, 86, 112, 138].map(y => `<path d="M38 ${y}q42 6 84 0" fill="none" stroke="#3d3b58" stroke-width="2"/>`).join('')}</g>`,
    lead: `<g class="p2-drape-l"><path d="M36 30h46v138H36z" fill="#30294a"/><path d="M47 30v138M58 30v138M69 30v138" stroke="#251f3a" stroke-width="2"/></g><g class="p2-drape-r"><path d="M78 30h46v138H78z" fill="#30294a"/><path d="M91 30v138M102 30v138M113 30v138" stroke="#251f3a" stroke-width="2"/></g>`,
  };
  const LIGHT = {
    designer: `<g class="p2-bokeh"><circle class="pv" cx="58" cy="120" r="12"/><circle class="pv" cx="98" cy="96" r="9"/><circle class="pv" cx="74" cy="66" r="7"/><circle class="pv" cx="104" cy="140" r="6"/></g>`,
    builder: `<rect class="p2-beat" x="38" y="32" width="84" height="134"/>`,
    reviewer: `<ellipse class="p2-lamp" cx="48" cy="150" rx="40" ry="34"/>`,
    auditor: `<rect class="p2-scan" x="20" y="20" width="16" height="160" transform="rotate(14 28 100)"/>`,
    lead: `<rect class="p2-breath" x="38" y="32" width="84" height="134"/>`,
  };
  const MOON = `<path class="p2-moon" d="M96 40l-30 120h8l30-120z"/>`;
  const RED = `<g class="p2-red"><circle cx="128" cy="156" r="14" fill="url(#ow-red)"/><path d="M123 165l1.5-7h7l1.5 7z" fill="#3a4554"/><circle class="pv p2-red-bulb" cx="128" cy="154" r="4" fill="#ff8578"/></g>`;
  const TWITCH = `<g class="p2-twitch">${[[46, 24], [114, 22]].map(([x, y]) => `<path class="pv" d="M${x} ${y}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#b8f0d3"/>`).join('')}</g>`;

  const layers = role => ({ room: LIGHT[role] + MOON, dress: DRESS[role], sill: RED, front: TWITCH });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="p2-lamp"><stop offset="0" stop-color="#f1eaff" stop-opacity=".9"/><stop offset=".5" stop-color="#cbbcff" stop-opacity=".35"/><stop offset="1" stop-color="#cbbcff" stop-opacity="0"/></radialGradient>
    <radialGradient id="p2-bokeh"><stop offset="0" stop-color="#f4f0ff" stop-opacity=".8"/><stop offset="1" stop-color="#f4f0ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="p2-scan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="p2-cool" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8479f2"/><stop offset=".86" stop-color="#d4d0ff"/><stop offset="1" stop-color="#d4d0ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="p2-warm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9a6ef0"/><stop offset=".86" stop-color="#dcc2ff"/><stop offset="1" stop-color="#dcc2ff" stop-opacity="0"/></linearGradient>
  </defs></svg>`;
  const empty = () => `<svg viewBox="0 0 220 120" width="220" height="120" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    ${[36, 110, 184].map(x => `<path d="M${x - 24} 104V54a24 24 0 0 1 48 0v50z"/><path d="M${x} 31v73M${x - 24} 54h48"/>`).join('')}<path d="M86 34h48v40H86z" stroke-dasharray="3 3"/><path d="M4 106h212"/></svg>`;
  const quiet = () => `<svg viewBox="0 0 40 16" width="40" height="16" focusable="false">${[4, 16, 28].map(x => `<path d="M${x} 15V7a4 4 0 0 1 8 0v8z" fill="#2c2a46" stroke="#3a4554" stroke-width="1"/>`).join('')}</svg>`;
  window.OW_VAR = {
    id: 'P2', name: 'Temperament', layers, defs, empty, quiet,
    legend: [['active', 'Open, its light alive in its own rhythm: working'], ['quiet', 'Half drawn, light low and still: quiet a long while'], ['needs', 'Red lamp on the sill: needs you'], ['', 'Open, light off: waiting'], ['off', 'Drawn shut: off']],
  };
})();
