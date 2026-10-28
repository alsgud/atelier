/* P1 · Lived-in. Character from what lives in and on each window, as Unpacking tells a life with no one in the
   picture. Each role keeps its own things (behind the glass as silhouettes against the light, on the sill lit by
   it), and they come alive while the light is on: steam rises, leaves sway, the sketches on the line swing, the
   bunting flutters, the telescope pans. The states are things anyone reads from the street:
     working   room lit to its stage, everything moving       quiet a long while   light low, the house cat asleep on the sill
     needs you a red flag up on the sill post, waving         waiting              light off, the things still there
     paused    a "back soon" card hung in the glass           off                  curtains drawn
     finished  green floods up, a flower opens on the sill, three sparks */
(() => {
  const steam = (x, y) => `<g class="hab-steam"><path class="obj-l st1" d="M${x} ${y}q-3-4 0-8t0-8"/><path class="obj-l st2" d="M${x + 5} ${y - 1}q-3-4 0-8t0-8"/></g>`;
  const ROLE = {
    designer: {
      room: `<path class="ink-l" d="M38 52q42 14 84 0" stroke-width="1.2"/>
        <g class="hab-swing"><rect class="ink" x="48" y="55" width="12" height="15" rx="1" transform="rotate(-6 54 55)"/><rect class="ink" x="70" y="58" width="13" height="17" rx="1"/><rect class="ink" x="96" y="56" width="12" height="15" rx="1" transform="rotate(6 102 56)"/></g>
        <path class="ink-l" d="M92 166l12-58 12 58M104 108v58"/><rect class="ink" x="91" y="98" width="27" height="24" rx="1.5"/>`,
      sill: `<g class="hab-sway"><path class="obj" d="M54 152c-11-5-19-19-11-29 8-6 14 9 11 29z"/><path class="obj" d="M54 152c3-16 15-26 21-20 4 8-9 18-21 20z"/><path class="obj" d="M54 152c-4-16-2-34 6-42 6 8 2 28-6 42z"/></g>
        <path class="obj" d="M42 165l3-14h18l3 14z"/>
        <rect class="obj" x="103" y="152" width="11" height="13" rx="1.5"/><path class="obj-l" d="M106 152l-2-10M109 152v-12M112 152l3-9"/>`,
    },
    builder: {
      room: `<path class="ink-l" d="M38 124h84" stroke-width="2.6"/><rect class="ink" x="44" y="106" width="17" height="18" rx="1"/><rect class="ink" x="63" y="113" width="12" height="11" rx="1"/><rect class="ink" x="96" y="102" width="21" height="22" rx="1"/>
        <rect class="ink" x="88" y="82" width="3" height="20" rx="1"/><rect class="ink" x="82" y="79" width="15" height="6" rx="1"/>
        <path class="ink-l" d="M106 80v14m-4-14a4 4 0 0 0 8 0" stroke-width="2.4"/>
        <path class="ink-l" d="M58 34v12" stroke-width="1"/><path class="ink" d="M51 54l3-8h8l3 8z"/>`,
      sill: `<rect class="obj" x="44" y="155" width="20" height="10" rx="1"/><rect class="obj" x="47" y="145" width="14" height="10" rx="1"/><rect class="obj hab-settle" x="50" y="137" width="8" height="8" rx="1"/>
        <path class="obj" d="M97 150h14v12a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z"/><path class="obj-l" d="M111 153h2a3 3 0 0 1 0 6h-2"/>`,
      front: steam(101, 146),
    },
    reviewer: {
      room: `<path class="ink-l" d="M38 122h84M38 148h84" stroke-width="2.4"/>
        ${[[42, 104], [48, 100], [54, 106], [60, 102], [66, 108], [86, 101], [92, 105], [98, 99], [104, 104], [110, 100]].map(([x, y]) => `<rect class="ink" x="${x}" y="${y}" width="5" height="${122 - y}" rx=".8"/>`).join('')}
        ${[[44, 130], [50, 128], [56, 132], [92, 129], [98, 131], [104, 127], [110, 130]].map(([x, y]) => `<rect class="ink" x="${x}" y="${y}" width="5" height="${148 - y}" rx=".8"/>`).join('')}
        <path class="ink-l" d="M60 33v24" stroke-width="1"/><path class="ink hab-lamp" d="M51 65l4-8h10l4 8z"/>`,
      sill: `<rect class="obj" x="45" y="158" width="30" height="7" rx="1"/><rect class="obj" x="48" y="151" width="25" height="7" rx="1"/>
        <path class="obj" d="M55 144h11v4a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z"/><path class="obj-l" d="M66 145.5h1.5a2 2 0 0 1 0 4H66"/>
        <path class="obj" d="M104 165l1-9h12l1 9z"/><circle class="obj hab-sway" cx="111" cy="150" r="7"/>`,
      front: steam(58, 141),
    },
    auditor: {
      room: `<circle class="ink" cx="59" cy="54" r="10"/><path class="hab-hand" d="M59 54v-7" stroke="#10151d" stroke-width="1.6" stroke-linecap="round"/><path d="M59 54h5" stroke="#10151d" stroke-width="1.6" stroke-linecap="round"/>
        <rect class="ink" x="40" y="118" width="24" height="48" rx="1"/><path d="M40 134h24M40 150h24" stroke="#10151d" stroke-width="1.4"/>
        <rect class="ink" x="94" y="90" width="20" height="26" rx="1.5"/><path d="M98 98h12M98 104h12M98 110h8" stroke="#10151d" stroke-width="1.6" stroke-linecap="round"/>`,
      sill: `<path class="obj" d="M44 165l1-9h14l1 9z"/><path class="obj" d="M49 156v-18a3 3 0 0 1 6 0v18z"/><path class="obj" d="M55 147h3a2 2 0 0 0 2-2v-4a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-3z"/>
        <path class="obj-l" d="M108 150l-8 15M108 150l8 15M108 150v15"/>
        <g class="hab-pan"><rect class="obj" x="94" y="141" width="28" height="7" rx="2" transform="rotate(-24 108 147)"/><rect class="obj" x="88" y="145" width="8" height="5" rx="1.5" transform="rotate(-24 108 147)"/></g>`,
    },
    lead: {
      room: `<path class="ink-l" d="M38 70q42 16 84 0" stroke-width="1.2"/>
        <g class="hab-flutter">${[[46, 72], [59, 76.5], [72, 78.5], [86, 78.5], [99, 76.5], [112, 72]].map(([x, y]) => `<path class="ink" d="M${x - 5} ${y}h10l-5 10z"/>`).join('')}</g>
        <path class="ink-l" d="M90 140h30M94 140l-3 26M116 140l3 26" stroke-width="2.4"/><path class="ink-l" d="M104 140v-6" stroke-width="2.4"/>
        <circle class="ink" cx="104" cy="120" r="12"/><ellipse class="hab-globe" cx="104" cy="120" rx="5" ry="12" fill="none" stroke="#10151d" stroke-width="1.4"/>`,
      sill: `<path class="obj" d="M44 165l2-11h18l2 11z"/><g class="hab-sway"><circle class="obj" cx="55" cy="143" r="10"/><circle class="obj" cx="47" cy="148" r="6"/><circle class="obj" cx="63" cy="148" r="6"/></g>
        <circle class="p1-bud" cx="51" cy="140" r="1.6"/><circle class="p1-bud" cx="59" cy="137" r="1.6"/><circle class="p1-bud" cx="62" cy="146" r="1.6"/>`,
    },
  };
  /* What every window can show, by state */
  /* the house cat: curled up asleep, head on its paws, tail round the front */
  const CAT = `<g class="p1-cat"><path class="obj hab-breathe" d="M76 165c0-8 6-13 13-13s12 5 12 13z"/><path class="obj" d="M70 165c0-4 3-7 7-7s6 3 6 7z"/><path class="obj" d="M71.5 160l.5-6 4 3.5zM78.5 157.5l3-4.5 1 5.5z"/><path class="obj-l hab-tail" d="M100 164c3 0 5-3 3-6"/><path class="obj-l" d="M84 164.5h12" style="stroke-width:1.2"/></g>`;
  const ZZ = `<g class="p1-zz"><path d="M104 140h5l-5 5h5M111 131h4l-4 4h4" fill="none" stroke="#8a94a6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const FLAG = `<g class="p1-flag"><circle cx="138" cy="138" r="16" fill="url(#ow-red)"/><path class="obj-l" d="M134 165v-36" style="stroke:#55606f"/><path class="hab-wave" d="M134 129h15l-4 5.5 4 5.5h-15z" fill="#ff8578"/></g>`;
  const CARD = `<g class="p1-card"><path d="M80 75l-9 10M80 75l9 10" fill="none" stroke="#8a94a6" stroke-width="1"/><g class="hab-card"><rect x="66" y="85" width="28" height="19" rx="2" fill="#c9d0da"/><rect x="75" y="89.5" width="3.2" height="10" rx="1" fill="#3c4553"/><rect x="81.8" y="89.5" width="3.2" height="10" rx="1" fill="#3c4553"/></g></g>`;
  const fold = (x0, x1) => { const w = (x1 - x0) / 4; return Array.from({ length: 3 }, (_, i) => `M${x0 + w * (i + 1)} 34v132`).join(''); };
  const CURTAINS = `<g class="p1-curtains"><path d="M36 30h45v136H36z" fill="#262a3c"/><path d="M79 30h45v136H79z" fill="#2a2e42"/><path d="${fold(36, 81)}${fold(79, 124)}" stroke="#1d2030" stroke-width="2" fill="none"/><path d="M36 162h88" stroke="#1d2030" stroke-width="3"/></g>`;
  const SPARKS = `<g class="p1-sparks">${[[48, 26, 1], [112, 20, 1.3], [134, 50, .9]].map(([x, y, s]) => `<path class="pv" d="M${x} ${y - 6 * s}q${s} ${5 * s} ${6 * s} ${6 * s}q${-5 * s} ${s} ${-6 * s} ${6 * s}q${-s} ${-5 * s} ${-6 * s} ${-6 * s}q${5 * s} ${-s} ${6 * s} ${-6 * s}z" fill="#b8f0d3"/>`).join('')}</g>`;
  const BLOOM = `<g class="p1-bloom"><path class="obj-l" d="M126 165v-14" style="stroke:#5fd198"/><g class="pv">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="126" cy="145" rx="2.6" ry="5" fill="#b8f0d3" transform="rotate(${a} 126 149) translate(0 -1)"/>`).join('')}<circle cx="126" cy="149" r="2.2" fill="#3fae7a"/></g></g>`;

  const layers = role => {
    const r = ROLE[role];
    return { room: r.room, dress: CARD + CURTAINS, sill: r.sill + CAT + BLOOM, front: (r.front || '') + FLAG + ZZ + SPARKS };
  };
  const defs = '';
  const empty = () => `<svg viewBox="0 0 220 120" width="220" height="120" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    ${[36, 110, 184].map(x => `<path d="M${x - 24} 104V54a24 24 0 0 1 48 0v50z"/><path d="M${x} 31v73M${x - 24} 54h48"/>`).join('')}<path d="M4 106h212"/><path d="M28 104l2-8h10l2 8z"/></svg>`;
  /* A quiet floor: its windows in a row, curtains drawn */
  const quiet = () => `<svg viewBox="0 0 40 16" width="40" height="16" focusable="false">${[4, 16, 28].map(x => `<path d="M${x} 15V7a4 4 0 0 1 8 0v8z" fill="#262a3c" stroke="#3a4554" stroke-width="1"/>`).join('')}</svg>`;
  window.OW_VAR = {
    id: 'P1', name: 'Lived-in', layers, defs, empty, quiet,
    legend: [['active', 'Lit to its stage, everything moving: working'], ['quiet', 'Light low, the cat asleep on the sill: quiet a long while'], ['needs', 'Red flag up: needs you'], ['', 'Light off, things still there: waiting'], ['off', 'Curtains drawn: off']],
  };
})();
