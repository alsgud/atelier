/* P2 · Temperament. No one inside: the character is the light itself, as a street at night tells you who lives behind
   each window by how it glows. Each role has its own warmth, its own dressing and its own way of throwing light out
   onto the wall while it works, big enough to read in a still frame:
     designer  cool, pale light · scalloped roller blind · soft orbs of light float up out of the window   (a daydreamer)
     builder   bright light      · venetian slats         · sparks pop off the corners on a quick beat     (busy hands)
     reviewer  warm reading glow · café curtains          · a lamp pool spills onto the sill; a page turns (the patient one)
     auditor   clear light       · roman shade            · a lighthouse beam sweeps the wall both ways   (missing nothing)
     lead      warm, breathing   · tied-back drapes       · fairy lights strung round the arch, in turn   (keeping time)
   States are how far the dressing is drawn and what the light does: working = open, everything alive · quiet a long
   while = half drawn, light low, the wall show still · needs you = open, a small red lamp on the sill blinks twice then
   glows, and the dressing gives one tug · waiting = open, light off, a night-light on · paused = half drawn, light held
   grey · off = drawn shut (the light flickers out first) · finished = the dressing snaps up with a twitch, green
   floods in and the wall show turns green for a moment. */
(() => {
  const slats = Array.from({ length: 15 }, (_, i) => `<rect x="38" y="${32 + i * 9}" width="84" height="7" rx="1"/>`).join('');
  const DRESS = {
    designer: `<g class="p2-blind"><path d="M38 -104h84V0${'a6 6 0 0 1-12 0'.repeat(7)}z" fill="#2c2a46"/><path d="M38 -2h84" stroke="#3b3860" stroke-width="2"/><path d="M80 0v9" stroke="#3b3860" stroke-width="1.2"/><circle cx="80" cy="12" r="3" fill="none" stroke="#575380" stroke-width="1.4"/></g>`,
    builder: `<g class="p2-slats"><g fill="#2a3240">${slats}</g><path d="M50 32v136M110 32v136" stroke="#1a212b" stroke-width="1"/></g>`,
    reviewer: `<g class="p2-cafe"><path class="p2-l" d="M38 108h43v58H38z" fill="#2f2b40"/><path class="p2-r" d="M79 108h43v58H79z" fill="#332e46"/><path d="M48 112v54M59 112v54M70 112v54M90 112v54M101 112v54M112 112v54" stroke="#262235" stroke-width="1.6" class="p2-folds"/></g><path d="M34 107h92" stroke="#55606f" stroke-width="2.4" stroke-linecap="round"/><g class="p2-cafe-top"><path d="M38 30h84v78H38z" fill="#2a2740"/></g>`,
    auditor: `<g class="p2-roman"><path d="M38 30h84v138H38z" fill="#2d2c40"/>${[60, 86, 112, 138].map(y => `<path d="M38 ${y}q42 6 84 0" fill="none" stroke="#3d3b58" stroke-width="2"/>`).join('')}</g>`,
    lead: `<g class="p2-drape-l"><path d="M36 30h46v138H36z" fill="#30294a"/><path d="M47 30v138M58 30v138M69 30v138" stroke="#251f3a" stroke-width="2"/></g><g class="p2-drape-r"><path d="M78 30h46v138H78z" fill="#30294a"/><path d="M91 30v138M102 30v138M113 30v138" stroke="#251f3a" stroke-width="2"/></g>`,
  };
  // Inside the glass: each role's own light
  const ROOM = {
    designer: `<g class="p2-in"><circle class="pv" cx="58" cy="128" r="12" fill="url(#p2-orb)"/><circle class="pv" cx="100" cy="100" r="9" fill="url(#p2-orb)"/></g>`,
    builder: `<rect class="p2-in p2-beat" x="38" y="32" width="84" height="134"/>`,
    reviewer: `<g class="p2-in"><ellipse class="p2-lamp" cx="52" cy="150" rx="46" ry="40"/><path class="p2-page" d="M52 118l22 0 -10 44h-22z"/></g>`,
    auditor: `<circle class="p2-in p2-eye" cx="80" cy="96" r="22" fill="url(#p2-orb)"/>`,
    lead: `<rect class="p2-in p2-breath" x="38" y="32" width="84" height="134"/>`,
  };
  // On the wall, behind the frame: the light the window throws out
  const BEAM = '-70,40 80,96 -70,152 230,40 80,96 230,152';
  const BACK = {
    reviewer: `<g class="p2-out p2-spill"><path d="M34 172L-20 204h150l-12-32z" fill="url(#p2-spill)"/><ellipse cx="44" cy="176" rx="40" ry="8" fill="#e2c4ff" opacity=".22"/></g>`,
    auditor: `<g class="p2-out"><polygon class="p2-beam" points="${BEAM}" fill="url(#p2-beam)"/></g>`,
  };
  // In front: what flies, floats or hangs outside the window
  const star = (x, y, s = 1) => `<path class="pv" d="M${x} ${y - 5 * s}l${1.4 * s} ${3.6 * s} ${3.6 * s} ${1.4 * s}-${3.6 * s} ${1.4 * s}-${1.4 * s} ${3.6 * s}-${1.4 * s}-${3.6 * s}-${3.6 * s}-${1.4 * s} ${3.6 * s}-${1.4 * s}z"/>`;
  const bulbs = (() => {
    const pts = [176, 196, 216, 236, 256, 270, 284, 304, 324, 344, 4].map(a => [80 + 62 * Math.cos(a * Math.PI / 180), 76 + 62 * Math.sin(a * Math.PI / 180)]);
    const wire = pts.slice(1).map(([x, y], i) => { const [px, py] = pts[i]; return `Q${((px + x) / 2).toFixed(1)} ${((py + y) / 2 + 6).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`; }).join('');
    return `<path class="p2-wire" d="M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}${wire}"/>${pts.map(([x, y]) => `<g class="pv p2-bulb"><circle cx="${x.toFixed(1)}" cy="${(y + 3).toFixed(1)}" r="10" fill="url(#p2-orb)"/><circle cx="${x.toFixed(1)}" cy="${(y + 3).toFixed(1)}" r="3.2"/></g>`).join('')}`;
  })();
  const FRONT = {
    designer: `<g class="p2-out p2-orbs">${[[20, 60, 11], [142, 44, 9], [2, 116, 8], [160, 106, 13], [50, 14, 8], [116, 10, 7], [-14, 40, 6], [178, 150, 7]].map(([x, y, r]) => `<circle class="pv" cx="${x}" cy="${y}" r="${r}" fill="url(#p2-orb)"/>`).join('')}</g>`,
    builder: `<g class="p2-out p2-sparks">${star(26, 44, 1.6)}${star(136, 38, 1.9)}${star(44, 16, 1.2)}${star(118, 14, 1.5)}${star(4, 80, 1.1)}${star(158, 74, 1.3)}${star(-8, 30, 0.9)}${star(170, 24, 1)}</g>`,
    lead: `<g class="p2-out p2-lights">${bulbs}</g>`,
  };
  const PILOT = `<g class="p2-pilot"><circle cx="100" cy="152" r="30" fill="url(#p2-pilot)"/><path d="M95 166v-3h10v3z" fill="#3c4553"/><path d="M93 163c0-7 3-11 7-11s7 4 7 11z" fill="#e8dcc8"/></g>`;
  const RED = `<g class="p2-red"><circle cx="130" cy="150" r="22" fill="url(#ow-red)"/><path d="M123 165l2-9h10l2 9z" fill="#3a4554"/><circle class="pv p2-red-bulb" cx="130" cy="150" r="6" fill="#ff8578"/></g>`;
  const TWITCH = `<g class="p2-twitch">${[[46, 24], [114, 22]].map(([x, y]) => `<path class="pv" d="M${x} ${y}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#b8f0d3"/>`).join('')}</g>`;

  const layers = role => ({ back: BACK[role] || '', room: ROOM[role] + PILOT, dress: DRESS[role], sill: RED, front: (FRONT[role] || '') + TWITCH });
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <radialGradient id="p2-lamp"><stop offset="0" stop-color="#fbeeff" stop-opacity=".95"/><stop offset=".45" stop-color="#e2c4ff" stop-opacity=".5"/><stop offset="1" stop-color="#e2c4ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="p2-orb"><stop offset="0" stop-color="#f6f2ff" stop-opacity=".95"/><stop offset=".35" stop-color="#d9ceff" stop-opacity=".6"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="p2-pilot"><stop offset="0" stop-color="#e8dcc8" stop-opacity=".45"/><stop offset="1" stop-color="#e8dcc8" stop-opacity="0"/></radialGradient>
    <radialGradient id="p2-beam" gradientUnits="userSpaceOnUse" cx="80" cy="96" r="150"><stop offset=".25" stop-color="#d9ceff" stop-opacity=".4"/><stop offset="1" stop-color="#b39cff" stop-opacity="0"/></radialGradient>
    <linearGradient id="p2-spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c4ff" stop-opacity=".42"/><stop offset="1" stop-color="#e2c4ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="p2-cool" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7d7cf4"/><stop offset=".86" stop-color="#d4d6ff"/><stop offset="1" stop-color="#d4d6ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="p2-warm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#a06cec"/><stop offset=".86" stop-color="#e6c6ff"/><stop offset="1" stop-color="#e6c6ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="p2-bright" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9478ff"/><stop offset=".86" stop-color="#ece6ff"/><stop offset="1" stop-color="#ece6ff" stop-opacity="0"/></linearGradient>
  </defs></svg>`;
  const empty = () => `<svg viewBox="0 0 220 120" width="220" height="120" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    ${[36, 110, 184].map(x => `<path d="M${x - 24} 104V54a24 24 0 0 1 48 0v50z"/><path d="M${x} 31v73M${x - 24} 54h48"/>`).join('')}<path d="M86 34h48v40H86z" stroke-dasharray="3 3"/><path d="M4 106h212"/></svg>`;
  const quiet = () => `<svg viewBox="0 0 40 16" width="40" height="16" focusable="false">${[4, 16, 28].map(x => `<path d="M${x} 15V7a4 4 0 0 1 8 0v8z" fill="#2c2a46" stroke="#3a4554" stroke-width="1"/>`).join('')}</svg>`;
  window.OW_VAR = {
    id: 'P2', name: 'Temperament', layers, defs, empty, quiet,
    legend: [['active', 'Open, its light out on the wall in its own way: working'], ['quiet', 'Half drawn, light low and still: quiet a long while'], ['needs', 'Red lamp on the sill: needs you'], ['', 'Open, a night-light on: waiting'], ['off', 'Drawn shut: off']],
  };
})();
