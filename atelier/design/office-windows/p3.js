/* P3 · Little lights. In every window lives one small, round, faceless helper with a sprout of light on its head:
   all the same kind, so no one is anyone in particular (R-15), and its whole mood is in what its body does. It is
   only ever upbeat. Working, it is busy with its role's tool; in every other state it is doing something cheerful:
     designer  paints a long stroke on the glass       builder   carries a block up to its pile
     reviewer  reads on a stack of books, feet swinging auditor   peers through a big magnifier, side to side
     lead      conducts with a baton
     quiet a long while  sits upright on a stool, thinking (three dots come one by one): it is mulling, not stuck
     needs you  stands at the glass holding up a red card, hopping
     waiting    sits on the inner sill with a mug, feet swinging        paused  waits by a little pause sign
     off        asleep in a hammock, lights out                         finished  jumps for joy, green floods in
   The creature is ink against the light and a soft grey in the dark, so it is always there to see. */
(() => {
  const body = `<path class="ink gb" d="M0-31c7.5 0 12.5 6 12.5 14.5S7.5-2 0-2s-12.5-6-12.5-14.5S-7.5-31 0-31z"/><path class="gs" d="M0-30.5c-1-5-5-8-9.5-7.5 1 4.5 5 7.5 9.5 7.5zM0-30.5c1-6 5-9.5 10-8.5-1 4.5-4.5 8.5-10 8.5z"/>`;
  const STAND = '<path class="ink-l" d="M-4.5-4v4.5M4.5-4v4.5" stroke-width="3.4"/>';
  const SIT = '<path class="ink-l hab-legs" d="M-4.5-3l-1 7M4.5-3l1 7" stroke-width="3.4"/>';
  const glim = (x, y, s, { arms = '', legs = STAND, cls = '', lift = 0, extra = '' } = {}) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g class="glim ${cls}"><g transform="translate(0 ${-lift})">${legs}${body}${arms}${extra}</g></g></g>`;
  const arm = d => `<path class="ink-l" d="${d}" stroke-width="3"/>`;

  const WORK = {
    designer: `<path class="p3-stroke" d="M52 92c14-14 34-16 52-6" pathLength="100"/><circle class="p3-blob" cx="104" cy="86" r="3"/>
      ${glim(62, 164, 1.35, { cls: 'p3-work', extra: `<g class="hab-paint">${arm('M10-18l10-14')}<path class="ink-l" d="M19-31l9-14" stroke-width="3.2"/><path class="ink" d="M26-46l4 2.6 1.6-2.4-4-2.6z"/><path class="p3-tip" d="M27.6-48.4c1-4 4-7 7-8 0.6 3.4-1.4 7-4.4 9.6z"/></g>${arm('M-10-16l-6 6')}` })}`,
    builder: `<rect class="ink" x="96" y="150" width="22" height="14" rx="1"/><rect class="ink" x="99" y="138" width="16" height="12" rx="1"/>
      ${glim(70, 164, 1.35, { cls: 'p3-work hab-hop', extra: `${arm('M-10-20l-4-14M10-20l4-14')}<rect class="ink" x="-11" y="-46" width="22" height="13" rx="1.5"/>` })}`,
    reviewer: `<rect class="ink" x="44" y="154" width="34" height="10" rx="1"/><rect class="ink" x="47" y="145" width="28" height="9" rx="1"/><rect class="ink" x="45" y="137" width="31" height="8" rx="1"/>
      ${glim(61, 137, 1.3, { legs: SIT, cls: 'p3-work', extra: `${arm('M-10-16l8-6M10-16l-6-6')}<g class="hab-page"><path class="ink" d="M0-21l-11-5v12l11 5z"/><path class="ink" d="M0-21l11-5v12l-11 5z"/></g>` })}`,
    auditor: `${glim(70, 164, 1.35, { cls: 'p3-work hab-peer', extra: `${arm('M10-18l10-6')}${arm('M-10-16l-5 7')}<path class="ink-l" d="M20-24l5-3" stroke-width="2.4"/><circle cx="31" cy="-30" r="8" class="p3-lens"/>` })}`,
    lead: `<rect class="ink" x="60" y="150" width="30" height="14" rx="1.5"/>
      ${glim(75, 150, 1.3, { cls: 'p3-work', extra: `<g class="hab-baton">${arm('M10-19l10-12')}<path class="ink-l" d="M20-31l7-12" stroke-width="1.6"/></g>${arm('M-10-18l-10-8')}` })}`,
  };
  const QUIET = `<path class="ink-l" d="M60 164v-14M76 164v-14M57 150h22" stroke-width="2.6"/>
    ${glim(68, 150, 1.3, { legs: SIT, cls: 'p3-quiet', extra: `${arm('M-10-14l5 6M10-14l-5 6')}` })}
    <g class="p3-think"><circle cx="90" cy="104" r="2.2"/><circle cx="96" cy="96" r="3"/><path class="p3-cloud" d="M96 72c0-6 6-9 11-7 2-5 10-5 12 0 5-1 9 4 6 8 3 4-1 9-6 8-2 4-10 4-12 0-5 2-11-2-11-9z"/><circle class="pv" cx="104" cy="74" r="1.8"/><circle class="pv" cx="111" cy="74" r="1.8"/><circle class="pv" cx="118" cy="74" r="1.8"/></g>`;
  const NEEDS = glim(59, 164, 1.45, { cls: 'p3-needs hab-hop', extra: `${arm('M-10-20l-3-15M10-20l3-15')}<rect class="p3-card" x="-13" y="-52" width="26" height="18" rx="2.5"/>` });
  const WAIT = `<path class="ink-l" d="M44 140h34" stroke-width="2.4"/>${glim(60, 140, 1.25, { legs: SIT, cls: 'p3-wait', extra: `${arm('M10-15l6 2')}<path class="ink" d="M15-17h6v6a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>${arm('M-10-14l-4 6')}` })}`;
  const PAUSED = `<g class="p3-paused"><path class="ink-l" d="M100 164v-30" stroke-width="2"/><rect x="88" y="116" width="24" height="18" rx="2" fill="#c9d0da"/><rect x="96" y="120" width="3" height="10" rx="1" fill="#3c4553"/><rect x="101" y="120" width="3" height="10" rx="1" fill="#3c4553"/></g>
    ${glim(66, 164, 1.3, { cls: 'p3-pause', extra: `${arm('M-10-14l-3 9M10-14l3 9')}` })}`;
  const OFF = `<g class="p3-off"><path class="ink-l" d="M40 108l14 26q26 14 52 0l14-26" stroke-width="1.6"/><path class="ink" d="M54 134q26 14 52 0l-2 4q-24 14-48 0z"/><path class="ink hab-breathe" d="M66 136c0-8 6-13 14-13s14 5 14 13q-14 6-28 0z"/><path class="gs" d="M80 123c-1-4-4-6-8-6 1 4 4 6 8 6z"/>
    <path class="p3-z" d="M96 112h5l-5 5h5M104 102h4l-4 4h4" fill="none" stroke="#8a94a6" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const DONE = glim(80, 164, 1.45, { cls: 'p3-done', extra: `${arm('M-10-20l-9-14M10-20l9-14')}` });
  const SPARKS = `<g class="p3-sparks">${[[50, 30, 1], [112, 26, 1.3], [134, 56, .9]].map(([x, y, s]) => `<path class="pv" d="M${x} ${y - 6 * s}q${s} ${5 * s} ${6 * s} ${6 * s}q${-5 * s} ${s} ${-6 * s} ${6 * s}q${-s} ${-5 * s} ${-6 * s} ${-6 * s}q${5 * s} ${-s} ${6 * s} ${-6 * s}z" fill="#b8f0d3"/>`).join('')}</g>`;
  const RED = `<g class="p3-red"><circle cx="62" cy="118" r="30" fill="url(#ow-red)"/></g>`;

  const layers = role => ({
    room: `${RED}<g class="pose pose-work">${WORK[role]}</g><g class="pose pose-quiet">${QUIET}</g><g class="pose pose-needs">${NEEDS}</g><g class="pose pose-wait">${WAIT}</g><g class="pose pose-paused">${PAUSED}</g><g class="pose pose-off">${OFF}</g><g class="pose pose-done">${DONE}</g>`,
    front: SPARKS,
  });
  const defs = '';
  const empty = () => `<svg viewBox="0 0 220 120" width="220" height="120" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">
    ${[36, 110, 184].map(x => `<path d="M${x - 24} 104V54a24 24 0 0 1 48 0v50z"/><path d="M${x} 31v73M${x - 24} 54h48"/>`).join('')}<path d="M4 106h212"/><path d="M110 104c-6 0-9-4-9-9s3-9 9-9 9 4 9 9-3 9-9 9zM110 86c0-3-3-5-6-5 1 3 3 5 6 5z"/></svg>`;
  const quiet = () => `<svg viewBox="0 0 40 16" width="40" height="16" focusable="false">${[4, 16, 28].map(x => `<path d="M${x} 15V7a4 4 0 0 1 8 0v8z" fill="#141a23" stroke="#3a4554" stroke-width="1"/>`).join('')}</svg>`;
  window.OW_VAR = {
    id: 'P3', name: 'Little lights', layers, defs, empty, quiet,
    legend: [['active', 'Lit to its stage, its helper busy: working'], ['quiet', 'Light low, the helper sitting and thinking: quiet a long while'], ['needs', 'Holding up a red card: needs you'], ['', 'Light off, sitting with a mug: waiting'], ['off', 'Asleep in a hammock: off']],
  };
})();
