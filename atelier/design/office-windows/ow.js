/* Office windows (37h3): one engine, three ways to give the D-B windows character. Grown from the vbnh engine
   (office-directions/od.js) on the same D6 shell (screens2/hf.js) and the one data model (ux/wf/wf.js), so every
   word and figure matches the other screens. Two changes from od.js:
     · cards follow audit F-3: the stage and the latest step in words ("Building · 4 min ago"), never "Try N of M";
       the light fills by stage, as app.js fillOf does (stage + 1 of 5). An audit still counts its checks.
     · the window is shared (win.js: the N1 mark at room scale); a variant (p1.js, p2.js, p3.js) only decorates it.
   A variant sets window.OW_VAR = { id, name, layers(role) → { room, dress, sill, front }, defs, legend, empty, quiet }.
   State lives on the desk's data attributes, which the variant's CSS reads:
     data-k     active (Working, lilac) · needs (Needs you, red) · '' (Waiting) · off (Off) · done (Finished just now, green)
     data-held  paused · data-quiet (working, but quiet for longer than usual) · data-lit 0…5 (how far the light has filled)
   Query: theme=light · motion=reduce · state=loading|empty|error|stale · states (every desk state on one floor) ·
   demo[=loop] (a task starts, moves on, needs you, finishes, someone goes off duty) · shot */
(() => {
  const { M, state, known, esc, I, dot, keep, live, loadError, mount, setCount, q } = window.HF;
  const V = window.OW_VAR;
  const N = M.NOW;
  document.documentElement.dataset.dir = 'OW';
  document.documentElement.dataset.var = V.id;

  const STAGES = ['Planning', 'Building', 'Checking', 'Review', 'Done']; // = app.js STAGES
  const roleKey = r => /lead/i.test(r) ? 'lead' : /design/i.test(r) ? 'designer' : /audit/i.test(r) ? 'auditor' : /review/i.test(r) ? 'reviewer' : 'builder'; // = app.js propOf
  const progText = p => !p ? '' : `${p[0]} of ${p[1]} ${p[2]}`; // audits only: checks done
  const fill = d => d.k === 'done' ? 1 : d.stage != null ? (d.stage + 1) / STAGES.length : d.prog ? Math.min(1, d.prog[0] / d.prog[1]) : 0;
  const lit = d => d.k === 'done' ? 5 : d.stage != null || d.prog ? Math.max(1, Math.round(fill(d) * 5)) : d.k === 'active' ? 1 : 0;
  const word = d => d.held || { active: 'Working', needs: 'Needs you', '': 'Waiting', off: 'Off', done: 'Done' }[d.k];

  /* F-3: the model's desks carry progress as steps or tries; here a task says its stage (as the live app's deskOf does) */
  const F3 = {
    'd-ui-designer': { stage: 1, prog: null },
    'd-re-builder': { stage: 1, prog: null, step: 'Fixing the trim handles' },
  };

  /* Every desk state, on one floor, in the live app's own words (app.js deskOf). */
  const STATES = [
    { id: 's-work', role: 'Designer', k: 'active', what: 'High-fi Inbox and Office screens', step: 'Drawing the Office floor at 390', stage: 1, ago: '4 min ago' },
    { id: 's-quiet', role: 'Auditor', k: 'active', what: 'Checking contrast in light and dark', step: 'Measuring text on every surface', quiet: 'Quiet for 38 min, longer than usual', prog: [12, 14, 'checks'], ago: '38 min ago' },
    { id: 's-needs', role: 'Lead', k: 'needs', what: 'Paused: today’s budget is used', step: 'Raise it or wait for midnight', ago: '12 min ago' },
    { id: 's-wait', role: 'Reviewer', k: '', what: 'Nothing to review yet', step: 'Last review 40 min ago', ago: '40 min ago' },
    { id: 's-paused', role: 'Builder', k: '', held: 'Paused', what: 'Export a trimmed clip', step: 'Paused. Today’s $40 is used. The lead decides what happens next', stage: 1, ago: '13 min ago' },
    { id: 's-off', role: 'Lead', k: 'off', what: 'The lead is off', step: 'Start it on the project page' },
    { id: 's-done', role: 'Builder', k: 'done', what: 'Trim clips on the timeline', step: 'Finished just now', stage: 4, ago: '' },
  ].map(d => ({ ...d, href: 'task.html' }));

  const floors = q.has('states')
    ? [{ p: 'Every desk state', working: 2, today: '', states: true, desks: STATES }]
    : M.OFFICE.map(f => ({ ...f, desks: f.desks.map(d => ({ ...d, ...F3[d.id] })) }));
  floors.forEach(f => f.desks.forEach(d => { d.st = word(d); }));

  const meta = d => [d.k !== 'done' && d.stage != null && STAGES[d.stage], progText(d.prog), d.ago].filter(Boolean).join(' · ');
  const label = d => `${d.role}, ${d.st}. ${d.what}. ${d.quiet || d.step}.${meta(d) ? ` ${meta(d)}.` : ''}`;
  const attrs = d => `data-id="${d.id}" data-k="${d.k}" data-role="${roleKey(d.role)}" data-lit="${lit(d)}"${d.held ? ` data-held="${d.held.toLowerCase()}"` : ''}${d.quiet ? ' data-quiet' : ''}`;
  const deskHTML = d => `
    <a class="desk" href="${keep('../screens2/' + d.href)}" ${attrs(d)} aria-label="${esc(label(d))}">
      <span class="desk-scene" aria-hidden="true">${window.OW_WIN(V.layers(roleKey(d.role)))}</span>
      <span class="desk-body">
        <span class="desk-who"><b>${esc(d.role)}</b><span class="desk-st">${dot(d.k === 'off' ? '' : d.k, d.st, true)}<span class="w">${esc(d.st)}</span></span></span>
        <span class="desk-what">${esc(d.what)}</span>
        <span class="desk-step">${esc(d.quiet || d.step)}</span>
        <span class="desk-meta num">${esc(meta(d))}</span>
      </span>
    </a>`;
  const strip = f => `<span class="strip" aria-hidden="true">${(f.desks.length ? f.desks : [{ k: 'off' }, { k: 'off' }]).map(d => `<i data-k="${d.k}"></i>`).join('')}</span>`;
  const floorSum = f => f.states ? 'Each state once, in the live Office’s own words' : `${f.working} working · ${f.today} today${f.atLimit ? ', <span class="is-needs">at its limit</span>' : ''}`;
  const fid = f => 'fl-' + f.p.replace(/\W/g, '');

  const busy = floors.filter(f => !f.quiet);
  const quiet = floors.filter(f => f.quiet);
  // rows of equal length (7 desks = 4 + 3, never 5 + 2): the wall reads as one balanced run
  const cols = n => Math.ceil(n / Math.ceil(n / 4));
  const board = () => `
    <div class="board ow-board${state === 'stale' ? ' is-stale' : ''}">
      ${busy.map(f => `
      <section class="floor" aria-labelledby="${fid(f)}" data-floor="${f.p}">
        <header class="floor-head"><h2 id="${fid(f)}">${f.states ? esc(f.p) : `<a href="${keep('../screens2/' + HF.pHref(f.p))}">${f.p}</a>`}</h2>${strip(f)}<span class="floor-sum num" data-floor-sum>${floorSum(f)}</span></header>
        <div class="desks" style="--n:${f.desks.length};--cols:${cols(f.desks.length)}">${f.desks.map(deskHTML).join('')}</div>
      </section>`).join('')}
      ${quiet.map(f => `<a class="floor-quiet" href="${keep('../screens2/' + HF.pHref(f.p))}" aria-label="${esc(`${f.p}, quiet.${f.needs ? ` ${f.needs} needs you now.` : ''} ${f.note}. ${f.today} today`)}"><span class="fq-art" aria-hidden="true">${V.quiet(f)}</span><b>${f.p}</b>${f.needs ? `<span class="fq-needs">${dot('needs', 'Needs you now')}${f.needs} needs you now</span>` : ''}<span>${esc(f.note)}</span><span class="num">${f.today} today</span></a>`).join('')}
      <ul class="legend" aria-label="How to read a window">${V.legend.map(([k, t]) => `<li><span class="strip"><i data-k="${k}"></i></span>${t}</li>`).join('')}</ul>
    </div>`;

  const skeleton = () => `<div class="board ow-board" aria-busy="true" aria-label="Loading the Office">${[3, 3].map(n => `
    <section class="floor"><span class="skeleton" style="width:160px;height:20px"></span>
      <div class="desks" style="--n:${n};--cols:${n}">${Array.from({ length: n }, () => `<span class="desk is-skeleton"><span class="desk-scene skeleton"></span><span class="desk-body"><span class="skeleton" style="width:40%;height:14px"></span><span class="skeleton" style="width:85%;height:18px;margin-top:6px"></span><span class="skeleton" style="width:60%;height:14px;margin-top:4px"></span></span></span>`).join('')}</div>
    </section>`).join('')}</div>`;
  const empty = () => `<div class="hf-empty office-empty ow-empty"><span class="ow-empty-art" aria-hidden="true">${V.empty()}</span><h2>No one is working yet.</h2><p>Start a project and its team moves in here: one floor for the project, one window for each agent.</p><a class="btn btn-primary" href="${keep('../screens2/new.html')}">${I('plus')}New project</a></div>`;

  const sum = () => known && state !== 'empty'
    ? `<span class="hf-sum num"><span data-count="working">${N.working}</span> working · <span class="is-needs"><span data-count="needs">${N.needs}</span> need you</span> · ${N.onDuty} on duty</span>`
    : '';
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError('The Office') : state === 'empty' ? empty() : board();

  mount({
    cur: 'office', title: `Office ${V.id}`, ux: ['UX-8'],
    head: `<h1>Office</h1>${sum()}<span class="end">${state === 'empty' ? '' : live()}</span>`,
    body: `${window.OW_DEFS}${V.defs || ''}<div class="hf-body">${body}</div>`,
    after: () => {
      /* The shell links to its sibling screens; from here they live one folder over, and Office stays on this variant */
      const here = location.pathname.split('/').pop();
      document.querySelectorAll('.hf a[href]').forEach(a => {
        const h = a.getAttribute('href');
        if (/^(https?:|#|\.\.\/)/.test(h)) return;
        a.setAttribute('href', h.startsWith('office.html') ? here + h.slice('office.html'.length) : '../screens2/' + h);
      });
      const flag = document.querySelector('.mock-flag');
      if (flag) { flag.textContent = `Office windows ${V.id} · ${V.name} · for the owner to pick`; flag.href = keep('index.html'); }
      if (q.has('demo')) demo(q.get('demo') === 'loop');
    },
  });

  /* ── Live changes, in place (R7): one window changes its light, its life and its words; nothing re-renders ── */
  const find = id => floors.flatMap(f => f.desks.map(d => [f, d])).find(([, d]) => d.id === id);
  const needs0 = N.needs - M.OFFICE.flatMap(x => x.desks).filter(y => y.k === 'needs').length;
  function setDesk(id, patch) {
    const [f, d] = find(id);
    Object.assign(d, patch);
    d.st = word(d);
    const el = document.querySelector(`.desk[data-id="${id}"]`);
    el.dataset.was = el.dataset.k; // a variant may play a moment on a particular change (was → k)
    el.dataset.k = d.k;
    el.dataset.lit = lit(d);
    if (d.held) el.dataset.held = d.held.toLowerCase(); else delete el.dataset.held;
    if (d.quiet) el.dataset.quiet = ''; else delete el.dataset.quiet;
    el.setAttribute('aria-label', label(d));
    el.querySelector('.desk-st').innerHTML = `${dot(d.k === 'off' ? '' : d.k, d.st, true)}<span class="w">${esc(d.st)}</span>`;
    el.querySelector('.desk-what').textContent = d.what;
    el.querySelector('.desk-step').textContent = d.quiet || d.step;
    el.querySelector('.desk-meta').textContent = meta(d);
    el.classList.remove('is-changing'); void el.offsetWidth; el.classList.add('is-changing');
    const i = [...el.closest('.floor').querySelectorAll('.desk')].indexOf(el);
    el.closest('.floor').querySelector(`.floor-head .strip i:nth-child(${i + 1})`).dataset.k = d.k;
    if (!f.states) {
      f.working = f.desks.filter(x => x.k === 'active').length;
      el.closest('.floor').querySelector('[data-floor-sum]').innerHTML = floorSum(f);
    }
    const all = floors.flatMap(x => x.desks);
    const working = all.filter(y => y.k === 'active').length;
    setCount('working', working); setCount('working-label', `${working} working`);
    setCount('needs', needs0 + all.filter(y => y.k === 'needs').length);
    const lv = document.querySelector('[data-live]'); if (lv) lv.textContent = 'Updated just now';
  }

  /* The demo (≈ 15 s): the reviewer starts a task, the designer moves on a stage, the auditor needs you, the builder
     finishes (green, held 2.4 s like the live app's HOLD) and goes back to waiting, atelier-ui's lead goes off duty. */
  const snapshot = JSON.stringify(floors);
  const T0 = Number(q.get('t0') || 1200);
  function demo(loop) {
    if (q.has('states')) return;
    const T = (ms, fn) => setTimeout(fn, T0 - 1200 + ms);
    T(1200, () => setDesk('d-re-reviewer', { k: 'active', what: 'Reviewing Trim clips on the timeline', step: 'Watching the recording', stage: 3, ago: 'just now' }));
    T(3600, () => setDesk('d-ui-designer', { step: 'Checking the floor at 390 and 1440', stage: 2, ago: 'just now' }));
    T(6000, () => setDesk('d-ui-auditor', { k: 'needs', quiet: null, what: 'Found 2 labels under AA in light mode', step: 'It asked you something. Answer it on its page', prog: null, ago: 'just now' }));
    T(8400, () => setDesk('d-re-builder', { k: 'done', what: 'Trim clips on the timeline', step: 'Finished just now', stage: 4, ago: '' }));
    T(8400 + 2400, () => setDesk('d-re-builder', { k: '', what: 'Nothing to build until the budget allows', step: 'Finished “Trim clips on the timeline”', stage: null, ago: '1 min ago' }));
    T(12400, () => setDesk('d-ui-lead', { k: 'off', what: 'The lead is off', step: 'Start it on the project page', ago: '' }));
    if (loop) T(16000, () => {
      JSON.parse(snapshot).forEach(f => f.desks.forEach(d => setDesk(d.id, { ...d, quiet: d.quiet || null, held: d.held || null, stage: d.stage ?? null, prog: d.prog || null })));
      document.querySelectorAll('.desk').forEach(el => delete el.dataset.was);
      setTimeout(() => demo(true), 1500);
    });
  }
  window.OW = { setDesk, STATES, roleKey };
})();
