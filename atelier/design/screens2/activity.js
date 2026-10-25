/* Activity (UX-13 A: one feed by day, a project picker and Only problems). The last 3 days across every project, newest
   first; each event in plain words: when, the event's name, the message, the project and task. Bad ones red, good ones
   green, the rest neutral (inventory: Activity). Data: ATELIER_MODEL.ACTIVITY. ?p=<project> arrives from a project's
   Activity tab; ?only=problems; filters change in place and keep the address. ?demo: a new event arrives at the top (R7). */
(() => {
  const { M, q, state, known, esc, I, keep, pHref, live, loadError, mount } = window.HF;
  const ids = M.PROJECTS.map(p => p.id);
  const f = { p: ids.includes(q.get('p')) ? q.get('p') : '', only: q.get('only') === 'problems' };
  const EV = M.ACTIVITY.map(([day, t, p, task, word, msg, k, href]) => ({ day, t, p, task, word, msg, k, href }));
  const KW = { needs: 'Problem', done: 'Good news', '': '' };

  const label = e => `${e.t}, ${e.p}${e.task ? `, ${e.task}` : ''}. ${KW[e.k] ? KW[e.k] + ': ' : ''}${e.word}. ${e.msg}`;
  const rowHTML = e => `
    <li><a class="act-row" href="${keep(e.href)}" data-k="${e.k}" aria-label="${esc(label(e))}">
      <time class="num">${esc(e.t)}</time>
      <span class="dot${e.k ? ' dot-' + e.k : ''}" aria-hidden="true"></span>
      <span class="act-t"><span class="act-l"><b>${esc(e.word)}</b> ${esc(e.msg)}</span><span class="act-s">${esc(e.p)}${e.task ? ` · ${esc(e.task)}` : ''}</span></span>
    </a></li>`;
  const shown = () => EV.filter(e => (!f.p || e.p === f.p) && (!f.only || e.k === 'needs'));
  const feed = () => {
    const list = shown();
    if (!list.length) return `<div class="act-none"><p>${f.only ? `No problems${f.p ? ` in ${f.p}` : ''} in the last 3 days.` : `Nothing happened in ${f.p} in the last 3 days.`}</p><button class="btn btn-secondary" type="button" data-all>Show everything</button></div>`;
    const days = [...new Set(list.map(e => e.day))];
    return days.map(d => { const r = list.filter(e => e.day === d); return `
      <section class="act-day" aria-labelledby="d-${d.replace(/\W/g, '')}">
        <h2 id="d-${d.replace(/\W/g, '')}">${esc(d)}<span class="n num">${r.length}</span></h2>
        <ol class="act-list"${d === 'Today' ? ' data-today' : ''}>${r.map(rowHTML).join('')}</ol>
      </section>`; }).join('');
  };
  const count = () => { const n = shown().length, pr = shown().filter(e => e.k === 'needs').length; return `Last 3 days · ${n} ${n === 1 ? 'event' : 'events'}${f.only ? '' : ` · ${pr} ${pr === 1 ? 'problem' : 'problems'}`}`; };

  const filters = () => `
    <div class="act-filters" role="group" aria-label="Filter">
      <label class="sr-only" for="a-proj">Project</label>
      <span class="act-select"><select class="input" id="a-proj">${['', ...ids].map(id => `<option value="${id}"${id === f.p ? ' selected' : ''}>${id || 'All projects'}</option>`).join('')}</select>${I('chevron-down')}</span>
      <button class="btn btn-secondary act-only" type="button" aria-pressed="${f.only}" data-only><span class="dot dot-needs" aria-hidden="true"></span>Only problems</button>
    </div>`;

  const skeleton = () => `<div class="act" aria-busy="true" aria-label="Loading activity"><span class="skeleton" style="width:240px;height:36px"></span>${[5, 3].map(n => `<section class="act-day"><span class="skeleton" style="width:80px;height:14px"></span>${Array.from({ length: n }, () => '<span class="skeleton" style="width:100%;height:44px"></span>').join('')}</section>`).join('')}</div>`;
  const empty = () => `<div class="hf-empty"><h2>Nothing has happened yet.</h2><p>Once a project starts, everything its team does shows up here, newest first: steps, proof, checks, reviews and what you decided.</p><a class="btn btn-primary" href="${keep('new.html')}">${I('plus')}New project</a></div>`;
  const page = () => `<div class="act${state === 'stale' ? ' is-stale' : ''}">${filters()}<div class="act-feed" data-feed>${feed()}</div></div>`;
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError('Activity') : state === 'empty' ? empty() : page();

  mount({
    cur: 'activity', title: f.p ? `Activity · ${f.p}` : 'Activity', ux: ['UX-13'],
    head: `${f.p ? `<a class="back" href="${keep(pHref(f.p))}" data-back>${I('chevron-left')}<span>${f.p}</span></a>` : ''}<h1>Activity</h1>${known && state !== 'empty' ? `<span class="hf-sum num" data-sum aria-live="polite">${count()}</span>` : ''}<span class="end">${state === 'empty' ? '' : live()}</span>`,
    body: `<div class="hf-body">${body}</div>`,
    after,
  });

  function redraw() {
    const box = document.querySelector('[data-feed]');
    box.innerHTML = feed();
    box.classList.remove('is-entering'); void box.offsetWidth; box.classList.add('is-entering');
    const s = document.querySelector('[data-sum]'); if (s) s.textContent = count();
    document.querySelector('[data-only]').setAttribute('aria-pressed', String(f.only));
    document.getElementById('a-proj').value = f.p;
    const u = new URL(location.href); f.p ? u.searchParams.set('p', f.p) : u.searchParams.delete('p'); f.only ? u.searchParams.set('only', 'problems') : u.searchParams.delete('only');
    history.replaceState(null, '', u);
    bindAll();
  }
  function bindAll() { document.querySelector('[data-all]')?.addEventListener('click', () => { f.p = ''; f.only = false; redraw(); document.getElementById('a-proj').focus(); }); }
  function after() {
    if (!document.querySelector('[data-feed]')) return;
    document.getElementById('a-proj').addEventListener('change', e => { f.p = e.target.value; redraw(); });
    document.querySelector('[data-only]').addEventListener('click', () => { f.only = !f.only; redraw(); });
    bindAll();
    if (q.has('demo')) setTimeout(() => {
      EV.unshift({ day: 'Today', t: '14:03', p: 'atelier-ui', task: 'Checking contrast in light and dark', word: 'Step', msg: 'Dark mode: 13 of 14 pairs pass', k: '', href: 'task.html?t=audit' });
      const ol = document.querySelector('[data-today]');
      if (ol && shown()[0] === EV[0]) { ol.insertAdjacentHTML('afterbegin', rowHTML(EV[0])); ol.firstElementChild.classList.add('is-entering'); }
      const s = document.querySelector('[data-sum]'); if (s) window.HF.tick(s, count());
      const n = document.querySelector('.act-day .n'); if (n && ol) window.HF.tick(n, ol.children.length);
    }, 1500);
  }
})();
