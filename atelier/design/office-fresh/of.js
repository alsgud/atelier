/* Office fresh (f2e6): one engine, three directions. The page sets window.OF_DIR = { id: 'o1'|'o2'|'o3', name, line }
   and loads desk.css + its own oN.css. Same shell (screens2/hf.js) and one data set (data.js), so every word and
   count matches the other screens. Desks carry the live app's attributes (data-k, data-held, data-quiet), so the
   drawing (desk.js/desk.css) is shared and a direction only decides what fills a desk and how the floor is laid out:
     o1 Panorama   the picture first: each project one room of bays; words only for desks with news
     o2 Desk tiles the tile first: news gets a tile with the whole corner; everyone else a small picture on a shelf
     o3 Roster     the words first: a calm row per desk with news; the rest on a bench of small portraits
   Query: theme=light · motion=reduce · state=loading|empty|error|stale · states · demo[=loop] · shot */
(() => {
  const { M, state, known, esc, I, dot, keep, live, loadError, mount, setCount, q } = window.HF;
  const { FLOORS, STATES, STAGES, meta, news } = window.OF_DATA;
  const { scene, defs } = window.OF_DESK;
  const DIR = window.OF_DIR;
  const N = M.NOW;
  document.documentElement.dataset.dir = DIR.id;

  const floors = q.has('states')
    ? [{ p: 'Every desk state', states: true, desks: STATES.map(d => ({ ...d })) }]
    : FLOORS.map(f => ({ ...f, desks: f.desks.map(d => ({ ...d })) }));
  let n = 0;
  floors.forEach(f => f.desks.forEach(d => { d.i = n++; }));

  const word = d => d.held || { active: 'Working', needs: 'Needs you', '': 'Waiting', off: 'Off', done: 'Done' }[d.k];
  const href = (f, d) => keep(news(d) ? '../screens2/task.html' : '../screens2/' + HF.pHref(f.p));
  const label = d => [`${d.role}, ${word(d)}.`, d.what && `${d.what}.`, d.step && `${d.step}.`, meta(d) && `${meta(d)}.`].filter(Boolean).join(' ');
  const attrs = d => `data-id="${d.id}" data-k="${d.k}"${d.held ? ` data-held="${d.held.toLowerCase()}"` : ''}${d.quiet ? ' data-quiet' : ''}`;
  const st = d => `<span class="of-st">${dot(d.k === 'off' ? '' : d.k, word(d), true)}<span class="w">${esc(word(d))}</span></span>`;
  const pic = (d, crop) => `<span class="dk-scene">${scene(d.role, crop, d.i)}</span>`;
  // the stage as five small lights (R-16: readable at a glance like a gauge, not its look). Stage only, never tries (F-3)
  const gauge = d => d.stage == null ? '' : `<span class="of-gauge" role="img" aria-label="Stage ${d.stage + 1} of 5, ${STAGES[d.stage]}">${STAGES.map((_, i) => `<i${i <= d.stage ? ' class="on"' : ''}></i>`).join('')}</span>`;
  const sum = f => f.states ? 'Each state once, in the live Office’s own words'
    : f.off ? `Lead off · nothing running · ${f.today} today`
    : [`${f.desks.filter(d => d.k === 'active').length} working`, f.desks.some(d => d.k === 'needs') && `<span class="is-needs">${f.desks.filter(d => d.k === 'needs').length} needs you</span>`, `${f.today} today`].filter(Boolean).join(' · ');
  const restLine = (f, rest) => f.off ? 'Everyone is off. Start the lead on the project page and the team comes back in.'
    : rest.length ? `${rest.length} at their desks, ready for the lead’s next task` : '';
  // rows of equal length: 12 desks at most 5 a row = 4 + 4 + 4, 9 = 5 + 4, never 4 + 4 + 1
  const bal = (k, max) => Math.ceil(k / Math.ceil(k / max));
  const fid = f => 'fl-' + f.p.replace(/\W/g, '');
  const head = f => `<header class="floor-head"><h2 id="${fid(f)}">${f.states ? esc(f.p) : `<a href="${keep('../screens2/' + HF.pHref(f.p))}">${esc(f.p)}</a>`}</h2><span class="floor-sum num" data-floor-sum>${sum(f)}</span></header>`;

  /* ── O1 Panorama: one room per project; a bay per desk at one width; a line of words only for news ── */
  const o1 = {
    floor: f => {
      const nw = f.desks.filter(news), rest = f.desks.filter(d => !news(d));
      return `${head(f)}
        <div class="o1-body${f.desks.length <= 6 ? ' is-short' : ''}"><div class="o1-room${f.off ? ' is-off' : ''}" style="--dc:${bal(f.desks.length, 12)};--pc:${bal(f.desks.length, 5)}">${f.desks.map(d => `
          <a class="dk o1-bay" href="${href(f, d)}" ${attrs(d)} aria-label="${esc(label(d))}"${news(d) ? ' tabindex="-1"' : ''}>${pic(d, 'bay')}
            <span class="dk-words o1-cap"><b>${esc(d.role)}</b>${st(d)}</span></a>`).join('')}</div>
        <div class="o1-lines" data-lines>${o1.lines(f, nw, rest)}</div></div>`;
    },
    lines: (f, nw, rest) => `${nw.length ? `<ul class="o1-news">${nw.map(d => `<li><a class="o1-line" href="${href(f, d)}" data-line="${d.id}" data-k="${d.k}" aria-label="${esc(label(d))}">
        <span class="o1-who"><b>${esc(d.role)}</b>${st(d)}</span><span class="o1-what">${esc(d.what)}<span class="o1-step">${esc(d.step)}</span></span><span class="o1-meta num">${gauge(d)}${esc(d.ago)}</span></a></li>`).join('')}</ul>` : ''}
      ${restLine(f, rest) ? `<p class="of-rest">${restLine(f, rest)}</p>` : ''}`,
    group: () => 'room',
  };

  /* ── O2 Desk tiles: a tile with the whole corner for news; a shelf of small pictures for everyone else ── */
  const o2tile = (f, d) => `<a class="dk o2-tile" href="${href(f, d)}" ${attrs(d)} aria-label="${esc(label(d))}">${pic(d, 'wide').replace('dk-scene', 'dk-scene is-wide')}${pic(d, 'bay').replace('dk-scene', 'dk-scene is-bay')}
      <span class="dk-words o2-body"><span class="o2-who"><b>${esc(d.role)}</b>${st(d)}</span><span class="o2-what">${esc(d.what)}</span><span class="o2-step">${esc(d.step)}</span>
      <span class="o2-meta num">${gauge(d)}<span>${esc(meta(d))}</span></span></span></a>`;
  const o2mini = (f, d) => `<a class="dk o2-mini" href="${href(f, d)}" ${attrs(d)} aria-label="${esc(label(d))}">${pic(d, 'bay')}
      <span class="dk-words o2-cap"><b>${esc(d.role)}</b>${st(d)}</span></a>`;
  const o2 = {
    floor: f => {
      const nw = f.desks.filter(news), rest = f.desks.filter(d => !news(d));
      // an odd last tile would leave half a row empty on a wide screen: the shelf takes that cell instead
      const shelf = rest.length ? `<div class="o2-shelf${f.off ? ' is-off' : ''}${nw.length % 2 ? ' is-beside' : ''}" style="--pc:${bal(rest.length, 5)}">${rest.map(d => o2mini(f, d)).join('')}</div>` : '';
      return `${head(f)}
        ${nw.length ? `<div class="o2-work">${nw.map(d => o2tile(f, d)).join('')}${shelf}</div>` : shelf}
        ${f.off ? `<p class="of-rest">${restLine(f, rest)}</p>` : ''}`;
    },
    words: (f, d) => news(d) ? o2tile(f, d) : o2mini(f, d),
    group: d => news(d) ? 'work' : 'shelf',
  };

  /* ── O3 Roster: a calm row per desk with news; the rest on a bench of small portraits ── */
  const o3row = (f, d) => `<a class="dk o3-row" href="${href(f, d)}" ${attrs(d)} aria-label="${esc(label(d))}">${pic(d, 'bay')}
      <span class="dk-words o3-words"><span class="o3-who"><b>${esc(d.role)}</b>${st(d)}</span><span class="o3-what">${esc(d.what)}</span><span class="o3-step">${esc(d.step)}</span>
      <span class="o3-meta num">${gauge(d)}<span>${esc(meta(d))}</span></span></span></a>`;
  const o3seat = (f, d) => `<a class="dk o3-seat" href="${href(f, d)}" ${attrs(d)} aria-label="${esc(label(d))}">${pic(d, 'bust')}
      <span class="dk-words o3-cap"><b>${esc(d.role)}</b></span></a>`;
  const o3 = {
    floor: f => {
      const nw = f.desks.filter(news), rest = f.desks.filter(d => !news(d));
      return `${head(f)}
        ${nw.length ? `<div class="o3-rows">${nw.map(d => o3row(f, d)).join('')}</div>` : ''}
        ${rest.length ? `<div class="o3-bench${f.off ? ' is-off' : ''}"><p class="o3-bench-h">${f.off ? `${st({ k: 'off' })}<span>Everyone is off. Start the lead on the project page.</span>` : `${st({ k: '' })}<span>${restLine(f, rest)}</span>`}</p>
          <div class="o3-seats" style="--pc:${rest.length > 5 ? bal(rest.length, 4) : rest.length}">${rest.map(d => o3seat(f, d)).join('')}</div></div>` : ''}`;
    },
    words: (f, d) => news(d) ? o3row(f, d) : o3seat(f, d),
    group: d => news(d) ? 'rows' : 'bench',
  };

  const L = { o1, o2, o3 }[DIR.id];
  const board = () => `
    <div class="board of-board of-${DIR.id}${state === 'stale' ? ' is-stale' : ''}">
      ${floors.map(f => `<section class="floor of-floor" aria-labelledby="${fid(f)}" data-floor="${esc(f.p)}">${L.floor(f)}</section>`).join('')}
      <ul class="of-legend" aria-label="How to read a desk">${DIR.legend.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>`;
  const skeleton = () => `<div class="board of-board of-${DIR.id}" aria-busy="true" aria-label="Loading the Office">${[5, 3].map(k => `
    <section class="floor"><span class="skeleton" style="width:160px;height:20px"></span>
      <div class="of-skel">${Array.from({ length: k }, () => '<span class="skeleton"></span>').join('')}</div></section>`).join('')}</div>`;
  const empty = () => `<div class="hf-empty office-empty of-empty"><span class="of-empty-art dk" data-k="off" aria-hidden="true">${pic({ role: 'Lead', i: 0 }, 'wide')}</span><h2>No one is in yet.</h2><p>Start a project and its team moves in here: a room for the project, a desk for each agent.</p><a class="btn btn-primary" href="${keep('../screens2/new.html')}">${I('plus')}New project</a></div>`;
  const headSum = () => known && state !== 'empty'
    ? `<span class="hf-sum num"><span data-count="working">${N.working}</span> working · <span class="is-needs"><span data-count="needs">${N.needs}</span> needs you</span> · ${N.onDuty} on duty</span>` : '';
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError('The Office') : state === 'empty' ? empty() : board();

  mount({
    cur: 'office', title: `Office ${DIR.id.toUpperCase()}`, ux: ['UX-8'],
    head: `<h1>Office</h1>${headSum()}<span class="end">${state === 'empty' ? '' : live()}</span>`,
    body: `${defs}<div class="hf-body">${body}</div>`,
    after: () => {
      const here = location.pathname.split('/').pop();
      document.querySelectorAll('.hf a[href]').forEach(a => {
        const h = a.getAttribute('href');
        if (/^(https?:|#|\.\.\/)/.test(h)) return;
        a.setAttribute('href', h.startsWith('office.html') ? here + h.slice('office.html'.length) : '../screens2/' + h);
      });
      const flag = document.querySelector('.mock-flag');
      if (flag) { flag.textContent = `Office fresh ${DIR.id.toUpperCase()} · ${DIR.name} · for the owner to pick`; flag.href = keep('index.html'); }
      if (q.has('demo')) queueMicrotask(() => demo(q.get('demo') === 'loop'));
    },
  });

  /* ── Live changes (R7): a desk changes in place; it only moves when it joins or leaves the news group ── */
  const find = id => floors.flatMap(f => f.desks.map(d => [f, d])).find(([, d]) => d.id === id);
  const needs0 = N.needs - FLOORS.flatMap(f => f.desks).filter(d => d.k === 'needs').length;
  const work0 = N.working - FLOORS.flatMap(f => f.desks).filter(d => d.k === 'active').length;
  const reduce = () => document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setAttrs(el, d) {
    el.dataset.k = d.k;
    if (d.held) el.dataset.held = d.held.toLowerCase(); else delete el.dataset.held;
    if (d.quiet) el.dataset.quiet = ''; else delete el.dataset.quiet;
    el.setAttribute('aria-label', label(d));
  }
  function pulse(el) { el.classList.remove('is-changing'); void el.offsetWidth; el.classList.add('is-changing'); }
  function setDesk(id, patch) {
    const [f, d] = find(id);
    const before = L.group(d);
    Object.assign(d, { held: null, quiet: null }, patch);
    const sec = document.querySelector(`.of-floor[data-floor="${CSS.escape(f.p)}"]`);
    const el = sec.querySelector(`.dk[data-id="${id}"]`);
    if (L === o1) {
      setAttrs(el, d);
      el.querySelector('.o1-cap').innerHTML = `<b>${esc(d.role)}</b>${st(d)}`;
      el.setAttribute('href', href(f, d));
      if (news(d)) el.setAttribute('tabindex', '-1'); else el.removeAttribute('tabindex');
      sec.querySelector('[data-lines]').innerHTML = o1.lines(f, f.desks.filter(news), f.desks.filter(x => !news(x)));
      pulse(el);
    } else if (L.group(d) === before) {
      // same place: swap the words, keep the drawing so its state cross-fades
      const fresh = document.createElement('div');
      fresh.innerHTML = L.words(f, d);
      const n2 = fresh.firstElementChild;
      setAttrs(el, d);
      el.setAttribute('href', n2.getAttribute('href'));
      el.querySelector('.dk-words').replaceWith(n2.querySelector('.dk-words'));
      pulse(el);
    } else {
      // it joins or leaves the news group: the floor re-lays out, and the desk glides to its new place
      const go = () => { sec.innerHTML = L.floor(f); pulse(sec.querySelector(`.dk[data-id="${id}"]`)); };
      if (document.startViewTransition && !reduce()) {
        sec.querySelectorAll('.dk').forEach(x => { x.style.viewTransitionName = 'dk-' + x.dataset.id; });
        const vt = document.startViewTransition(() => { go(); sec.querySelectorAll('.dk').forEach(x => { x.style.viewTransitionName = 'dk-' + x.dataset.id; }); });
        vt.finished.finally(() => sec.querySelectorAll('.dk').forEach(x => { x.style.viewTransitionName = ''; }));
      } else go();
    }
    if (!f.states) sec.querySelector('[data-floor-sum]').innerHTML = sum(f);
    const all = floors.flatMap(x => x.desks);
    const working = work0 + all.filter(y => y.k === 'active').length;
    setCount('working', working); setCount('working-label', `${working} working`);
    setCount('needs', needs0 + all.filter(y => y.k === 'needs').length);
    const lv = document.querySelector('[data-live]'); if (lv) lv.textContent = 'Updated just now';
  }

  /* The demo (≈ 13 s, the brief's journey): replay's designer starts a task, needs you, gets back to it after your
     answer, finishes (green, held 2.4 s like the live app's HOLD) and goes back to waiting. */
  const snapshot = JSON.stringify(floors);
  const DEMO_ID = q.get('desk') || 're-des';
  function demo(loop) {
    if (q.has('states')) return;
    const T = (ms, fn) => setTimeout(fn, ms);
    const what = 'Trim handles, round 3';
    T(1200, () => setDesk(DEMO_ID, { k: 'active', what, step: 'Reading the brief and the last round’s notes', stage: 0, ago: 'just now' }));
    T(4000, () => setDesk(DEMO_ID, { k: 'needs', what, step: 'It asked you something. Answer it on its page', stage: 1, ago: 'just now' }));
    T(7000, () => setDesk(DEMO_ID, { k: 'active', what, step: 'You answered. Drawing the handles at 390', stage: 2, ago: 'just now' }));
    T(9600, () => setDesk(DEMO_ID, { k: 'done', what, step: 'Finished just now', stage: 4, ago: '' }));
    T(9600 + 2400, () => setDesk(DEMO_ID, { k: '', what: 'No task right now', step: `Finished “${what}”`, stage: null, ago: '' }));
    if (loop) T(15000, () => {
      const s = JSON.parse(snapshot).flatMap(f => f.desks).find(d => d.id === DEMO_ID);
      setDesk(DEMO_ID, s);
      setTimeout(() => demo(true), 1200);
    });
  }
  window.OF = { setDesk, floors };
})();
