// Atelier icon set: 24 px grid, 1.6 px stroke, round caps, currentColor. Injected once as an inline sprite
// so pages opened from disk can use <svg class="icon"><use href="#i-name"/></svg>.
// Icons are always aria-hidden; the control around them carries the label.
(() => {
  const P = {
    inbox: '<path d="M3.5 13h4.2l1.6 2.6h5.4l1.6-2.6h4.2"/><path d="M5.8 5.6h12.4l2.3 7.4v5.2a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3V13z"/>',
    office: '<path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M9.5 20v-5.5h5V20"/><path d="M3 20h18"/>',
    projects: '<path d="M3.5 7.2c0-.9.7-1.7 1.7-1.7h4l2 2.2h7.6c.9 0 1.7.7 1.7 1.7v8.4c0 .9-.7 1.7-1.7 1.7H5.2c-.9 0-1.7-.7-1.7-1.7z"/>',
    activity: '<path d="M3 12h4l2.5-6.5 5 13 2.5-6.5h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
    'chevron-left': '<path d="M14.5 6 8.5 12l6 6"/>',
    'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
    'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
    external: '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M17.5 14v4.2c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3V7.8c0-.7.6-1.3 1.3-1.3H10"/>',
    play: '<path d="M8 5.8v12.4c0 .6.7 1 1.2.7l9.6-6.2c.5-.3.5-1 0-1.3L9.2 5.1c-.5-.3-1.2.1-1.2.7z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    alert: '<path d="M12 4.2 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17h.01"/>',
    design: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17M9 9v10.5"/>',
    question: '<path d="M5.5 18.5 4 21l3.6-1.6c1.3.6 2.8 1 4.4 1 4.7 0 8.5-3.4 8.5-7.7S16.7 5 12 5 3.5 8.4 3.5 12.7c0 2.2 1 4.2 2 5.8z"/><path d="M10 10.6a2 2 0 1 1 2.9 1.8c-.6.3-.9.8-.9 1.4v.3M12 16.6h.01"/>',
    proof: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
    finding: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/><path d="M10.5 7.8v3M10.5 13.2h.01"/>',
    budget: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.2c-.4-.9-1.4-1.4-2.6-1.4-1.6 0-2.7.8-2.7 2s1 1.7 2.7 2.1c1.8.4 2.8 1 2.8 2.2s-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.8-1.6M12 6.2v1.6M12 16.2v1.6"/>',
    plan: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="m4 6.5 1.2 1.2L7.4 5.4M4 12l1.2 1.2 2.2-2.3"/><circle cx="5.5" cy="17.5" r="1.2"/>',
    outcome: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    screen: '<rect x="3" y="4.5" width="18" height="12" rx="1.6"/><path d="M9 20h6M12 16.5V20"/>',
    blocked: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    undo: '<path d="M8.5 5.5 4.5 9.5l4 4"/><path d="M4.5 9.5h9.2a5.8 5.8 0 0 1 0 11.6H9"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-4.5-4.5-8.5 8"/>',
    log: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5M9 12h7M9 15.5h7M9 19h4"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 4.5v4.2h-4.2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  };
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${Object.entries(P).map(([k, v]) =>
    `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('')}</svg>`;
  document.body.insertAdjacentHTML('afterbegin', sprite);
  window.icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
})();
