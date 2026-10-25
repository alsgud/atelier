/* Office (UX-8 A). Floors and desks from ATELIER_MODEL.OFFICE; counts from the one summary (NOW).
   ?demo plays the live changes in place (R7): the replay builder finishes, the reviewer starts, the auditor's
   quiet spell ends. Nothing re-renders; each desk changes its own words, light and track. */
(() => {
  const { M, state, known, esc, I, dot, keep, live, loadError, mount, tick, setCount, q } = window.HF;
  const N = M.NOW;
  const floors = M.OFFICE.map(f => ({ ...f, desks: f.desks.map(d => ({ ...d })) }));

  const progText = p => !p ? '' : p[2] === 'step' ? `Step ${p[0]} of ${p[1]}` : p[2] === 'try' ? `Try ${p[0]} of ${p[1]}` : `${p[0]} of ${p[1]} ${p[2]}`;

  /* The scene on a 160 × 88 grid: window (arch, x 14–46), its patch of light on the floor, a desk with a laptop,
     someone behind it, and one thing on the wall that says the role. Lights, hand and tick follow the desk's data-k. */
  const arch = 'M14 64V30a16 16 0 0 1 32 0V64z';
  const PROPS = {
    Designer: '<rect x="130" y="16" width="24" height="26" rx="1.5"/><path d="M136 37v-9a6 6 0 0 1 12 0v9z"/>',
    Auditor: '<rect x="132" y="14" width="20" height="28" rx="1.5"/><path d="M138 14v-2h8v2M136 22l2 2 3-3M143 23h5M136 30l2 2 3-3M143 31h5M136 37h12"/>',
    Builder: '<path d="M126 42h30"/><rect x="128" y="30" width="10" height="12" rx="1"/><rect x="140" y="34" width="8" height="8" rx="1"/><rect x="130" y="22" width="7" height="8" rx="1"/>',
    Reviewer: '<path d="M126 42h30"/><rect x="129" y="26" width="4" height="16" rx=".8"/><rect x="134" y="22" width="4" height="20" rx=".8"/><rect x="139" y="28" width="4" height="14" rx=".8"/><path d="m145 42 5-17 3.6 1-5 17"/>',
    Lead: '<rect x="128" y="16" width="28" height="24" rx="1.5"/><path d="M133 23h12M133 28h18M133 33h9"/><circle cx="142" cy="16" r="1.6"/>',
  };
  const scene = role => `<svg viewBox="0 0 160 88" aria-hidden="true" focusable="false">
    <g class="sc-prop">${PROPS[role] || ''}</g>
    <circle class="sc-glow" cx="30" cy="42" r="40"/>
    <path class="sc-wallwin" d="${arch}"/>
    <path class="sc-pane" d="${arch}"/>
    <path class="sc-done" d="${arch}"/>
    <path class="sc-bars" d="M30 14V64M14 40H46"/>
    <path class="sc-tick" d="M22.5 40.5l5 5 10-11"/>
    <polygon class="sc-patch" points="14,72 46,72 66,88 34,88"/>
    <g class="sc-who"><circle cx="95" cy="36" r="7"/><path d="M80 58c0-10 6.5-14 15-14s15 4 15 14z"/></g>
    <g class="sc-hand"><path d="M106 49 113 31"/><circle cx="113.5" cy="28.5" r="3"/></g>
    <circle class="sc-flag" cx="121" cy="20" r="3.5"/>
    <ellipse class="sc-screen" cx="95" cy="41" rx="12" ry="7"/>
    <path class="sc-lid" d="M85 47h20l-1.5 11h-17z"/>
    <rect class="sc-lid-shut" x="85" y="56" width="20" height="2" rx="1"/>
    <rect class="sc-desk" x="70" y="58" width="50" height="3" rx="1.5"/>
    <rect class="sc-desk" x="73" y="61" width="2.5" height="11"/><rect class="sc-desk" x="114.5" y="61" width="2.5" height="11"/>
  </svg>`;
  const defs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><radialGradient id="hf-glow"><stop offset="0" style="stop-color:var(--active);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--active);stop-opacity:0"/></radialGradient></defs></svg>`;

  /* One sentence per desk for screen readers: "Designer, Working. High-fi … . Drawing … . Step 4 of 6, 4 min ago" */
  const label = d => `${d.role}, ${d.st}. ${d.what}. ${d.quiet || d.step}. ${[progText(d.prog), d.ago].filter(Boolean).join(', ')}`;
  const deskHTML = d => `
    <a class="desk" href="${keep(d.href)}" data-id="${d.id}" data-k="${d.k}"${d.quiet ? ' data-quiet' : ''} aria-label="${esc(label(d))}">
      <span class="desk-scene">${scene(d.role)}</span>
      <span class="desk-body">
        <span class="desk-who"><b>${esc(d.role)}</b><span class="desk-st">${dot(d.k === 'off' ? '' : d.k, d.st, true)}<span class="w">${esc(d.st)}</span></span></span>
        <span class="desk-what">${esc(d.what)}</span>
        <span class="desk-step">${esc(d.quiet || d.step)}</span>
        <span class="desk-prog"><span class="desk-track"><i style="--p:${d.prog ? d.prog[0] / d.prog[1] : 0}"></i></span><span class="desk-meta num">${esc([progText(d.prog), d.ago].filter(Boolean).join(' · '))}</span></span>
      </span>
    </a>`;
  const strip = f => `<span class="strip" aria-hidden="true">${(f.desks.length ? f.desks : [{ k: 'off' }, { k: 'off' }]).map(d => `<i data-k="${d.k}"></i>`).join('')}</span>`;
  const floorSum = f => `${f.working} working · ${f.today} today${f.atLimit ? ', <span class="is-needs">at its limit</span>' : ''}`;

  const busy = floors.filter(f => !f.quiet);
  const quiet = floors.filter(f => f.quiet);
  const board = () => `
    <div class="board${state === 'stale' ? ' is-stale' : ''}">
      ${busy.map(f => `
      <section class="floor" aria-labelledby="fl-${f.p}" data-floor="${f.p}">
        <header class="floor-head"><h2 id="fl-${f.p}"><a href="${keep(HF.pHref(f.p))}">${f.p}</a></h2>${strip(f)}<span class="floor-sum num" data-floor-sum>${floorSum(f)}</span></header>
        <div class="desks">${f.desks.map(deskHTML).join('')}</div>
      </section>`).join('')}
      ${quiet.map(f => `<a class="floor-quiet" href="${keep(HF.pHref(f.p))}" aria-label="${esc(`${f.p}, quiet.${f.needs ? ` ${f.needs} needs you now.` : ''} ${f.note}. ${f.today} today`)}">${strip(f)}<b>${f.p}</b>${f.needs ? `<span class="fq-needs">${dot('needs', 'Needs you now')}${f.needs} needs you now</span>` : ''}<span>${esc(f.note)}</span><span class="num">${f.today} today</span></a>`).join('')}
      <ul class="legend" aria-label="How to read a desk">
        <li><span class="strip"><i data-k="active"></i></span>Light on: working</li>
        <li><span class="strip"><i data-k="needs"></i></span>Hand up: needs you</li>
        <li><span class="strip"><i data-k=""></i></span>Light off: waiting</li>
        <li><span class="strip"><i data-k="off"></i></span>Empty desk: off</li>
      </ul>
    </div>`;

  const skeleton = () => `<div class="board" aria-busy="true" aria-label="Loading the Office">${[3, 3].map(n => `
    <section class="floor"><span class="skeleton" style="width:160px;height:20px"></span>
      <div class="desks">${Array.from({ length: n }, () => `<span class="desk is-skeleton"><span class="desk-scene skeleton"></span><span class="desk-body"><span class="skeleton" style="width:40%;height:14px"></span><span class="skeleton" style="width:85%;height:18px;margin-top:6px"></span><span class="skeleton" style="width:60%;height:14px;margin-top:4px"></span></span></span>`).join('')}</div>
    </section>`).join('')}</div>`;

  const emptyBuilding = `<svg viewBox="0 0 120 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M18 94V28a42 22 0 0 1 84 0v66"/><path d="M8 94h104"/>
    ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<path d="M${33 + c * 20} ${50 + r * 16}v-5a5 5 0 0 1 10 0v5z"/>`).join('')).join('')}</svg>`;
  const empty = () => `<div class="hf-empty office-empty">${emptyBuilding}<h2>No one is working yet.</h2><p>Start a project and its team moves in here: one floor for the project, one desk for each agent.</p><a class="btn btn-primary" href="${keep('new.html')}">${I('plus')}New project</a></div>`;

  const sum = () => known && state !== 'empty'
    ? `<span class="hf-sum num"><span data-count="working">${N.working}</span> working · <span class="is-needs">${N.needs} need you</span> · ${N.onDuty} on duty</span>`
    : '';
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError('The Office') : state === 'empty' ? empty() : board();

  mount({
    cur: 'office', title: 'Office', ux: ['UX-8', 'UX-9'],
    head: `<h1>Office</h1>${sum()}<span class="end">${state === 'empty' ? '' : live()}</span>`,
    body: `${defs}<div class="hf-body">${body}</div>`,
    after: () => { if (q.has('demo')) demo(q.get('demo') === 'loop'); },
  });

  /* ── Live changes, in place ── */
  const find = id => floors.flatMap(f => f.desks.map(d => [f, d])).find(([, d]) => d.id === id);
  function setDesk(id, patch) {
    const [f, d] = find(id);
    Object.assign(d, patch);
    const el = document.querySelector(`.desk[data-id="${id}"]`);
    el.dataset.k = d.k;
    el.setAttribute('aria-label', label(d));
    if (d.quiet) el.dataset.quiet = ''; else delete el.dataset.quiet;
    el.querySelector('.desk-st').innerHTML = `${dot(d.k, d.st, true)}<span class="w">${esc(d.st)}</span>`;
    el.querySelector('.desk-what').textContent = d.what;
    el.querySelector('.desk-step').textContent = d.quiet || d.step;
    el.querySelector('.desk-track i').style.setProperty('--p', d.prog ? d.prog[0] / d.prog[1] : 0);
    el.querySelector('.desk-meta').textContent = [progText(d.prog), d.ago].filter(Boolean).join(' · ');
    el.classList.remove('is-changing'); void el.offsetWidth; el.classList.add('is-changing');
    const i = [...el.closest('.floor').querySelectorAll('.desk')].indexOf(el);
    el.closest('.floor').querySelector(`.floor-head .strip i:nth-child(${i + 1})`).dataset.k = d.k;
    f.working = f.desks.filter(x => x.k === 'active').length;
    el.closest('.floor').querySelector('[data-floor-sum]').innerHTML = floorSum(f);
    const working = floors.reduce((n, x) => n + x.desks.filter(y => y.k === 'active').length, 0);
    setCount('working', working); setCount('working-label', `${working} working`);
    const lv = document.querySelector('[data-live]'); if (lv) lv.textContent = 'Updated just now';
  }
  const snapshot = JSON.stringify(floors);
  function demo(loop) {
    const T = (ms, fn) => setTimeout(fn, ms);
    T(1400, () => setDesk('d-re-builder', { k: 'done', st: 'Done', what: 'Trim clips on the timeline', step: 'Showed its work: 2 screenshots and a recording', prog: [5, 5, 'step'], ago: 'just now', quiet: null }));
    T(1400 + 2200, () => setDesk('d-re-builder', { k: '', st: 'Waiting', what: 'Nothing to build until the budget allows', step: 'Finished Trim clips on the timeline', prog: null, ago: '1 min ago' }));
    T(5000, () => setDesk('d-re-reviewer', { k: 'active', st: 'Working', what: 'Reviewing Trim clips on the timeline', step: 'Watching the recording', prog: [1, 3, 'checks'], ago: 'just now' }));
    T(7400, () => setDesk('d-ui-auditor', { quiet: null, step: 'Measured text on the dock and toasts', prog: [13, 14, 'checks'], ago: 'just now' }));
    T(9400, () => setDesk('d-ui-designer', { step: 'Drawing the project page', prog: [5, 6, 'step'], ago: 'just now' }));
    if (loop) T(12500, () => {
      JSON.parse(snapshot).forEach((f, fi) => f.desks.forEach(d => setDesk(d.id, { ...d, quiet: d.quiet || null })));
      setTimeout(() => demo(true), 1500);
    });
  }
  window.OFFICE_DEMO = { setDesk };
})();
