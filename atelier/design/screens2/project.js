/* Project page (UX-6 A: Now first, figures in one line under it). Data from ATELIER_MODEL.PAGES[p]; counts from the
   one summary. ?p=replay (default) · atelier-ui (two working, a quiet one) · dodge (lead off) · tidepool (created a minute ago: the page's empty state).
   ?tab=tasks|outcomes|audits|docs draws that section; Activity and Settings are their own screens, filtered to the project.
   ?demo plays a live refresh in place (R7): the builder finishes, the reviewer starts, the review passes and an outcome is
   met. Nothing re-renders; open folds and scroll stay. */
(() => {
  const { M, q, state, known, esc, I, dot, keep, live, loadError, mount, tick, setCount } = window.HF;
  const id = M.PAGES[q.get('p')] ? q.get('p') : 'replay';
  const P = JSON.parse(JSON.stringify(M.PAGES[id]));
  const row = M.PROJECTS.find(p => p.id === id) || { waiting: 0 };
  const tab = ['tasks', 'outcomes', 'audits', 'docs'].includes(q.get('tab')) ? q.get('tab') : 'overview';
  const STAGES = ['Planning', 'Building', 'Checking', 'Review', 'Done'];
  const here = (t, more = '') => keep(`project.html?${id === 'replay' ? '' : `p=${id}&`}tab=${t}${more}`).replace('?tab=overview', '').replace('&tab=overview', '');
  const working = () => P.work.filter(w => w.k === 'active').length;

  /* ── The small parts ── */
  /* The status glyph is the Office's window at text size: lit lilac while working, a tick when done (aria-hidden; words carry it) */
  const win = k => `<span class="p-win" data-k="${k}" aria-hidden="true"><svg viewBox="0 0 12 16"><path d="M1 15V6a5 5 0 0 1 10 0v9z"/><path class="t" d="M3.4 9.6 5.3 11.5 8.8 7.6"/></svg></span>`;
  const phaseTrack = () => `
    <ol class="p-phases" aria-label="Phase: ${M.PHASES[P.phase]}${P.of ? `, ${P.met} of ${P.of} outcomes met` : ''}">
      ${M.PHASES.map((n, i) => `<li class="${i < P.phase ? 'past' : i === P.phase ? 'now' : ''}"${i === P.phase ? ' aria-current="step"' : ''}>
        <span class="bar">${i === P.phase && P.of ? `<span class="pips" data-pips>${Array.from({ length: P.of }, (_, j) => `<i${j < P.met ? ' class="met"' : ''}></i>`).join('')}</span>` : ''}</span>
        <span class="n">${n}</span></li>`).join('')}
    </ol>`;
  const stageTrack = s => `<span class="p-stages" role="img" aria-label="Stage: ${STAGES[s]}">${STAGES.map((n, i) => `<i class="${i < s ? 'past' : i === s ? 'now' : ''}"></i>`).join('')}</span>`;
  const figs = () => {
    const at = P.money.pct >= 100, near = P.money.pct >= 80 && !at, now1 = P.needs.filter(n => n[0] === 'needs').length;
    return `<p class="p-figs num" data-figs>
      <span><b data-p="working">${working()}</b> working</span>
      ${now1 ? `<span class="is-needs"><b>${now1}</b> ${now1 > 1 ? 'need' : 'needs'} you now</span>` : ''}
      <span><b>${P.needs.length}</b> waiting on you</span>
      ${P.of ? `<span><b data-p="met">${P.met}</b> of ${P.of} outcomes met</span>` : ''}
      <span${at ? ' class="is-needs"' : ''}><b>${P.money.today}</b> of ${P.money.limit} today${at ? ', at its limit' : near ? ', most of it used' : ''}</span>
    </p>`;
  };

  /* ── Now (R13) ── */
  const now = () => `
    <section class="p-now" aria-labelledby="now-h">
      <h2 class="section-label" id="now-h">Now</h2>
      <p class="p-now-t">${esc(P.now)}</p>
      <p class="lede">${esc(P.nowMore)}</p>
      ${P.act ? `<div class="p-now-act"><a class="btn btn-primary" href="${keep(P.act[1])}">${esc(P.act[0])}${I('chevron-right')}</a></div>` : ''}
      ${phaseTrack()}
      ${figs()}
    </section>`;

  const needs = () => !P.needs.length ? '' : `
    <section class="p-sec" aria-labelledby="needs-h">
      <h2 class="p-h" id="needs-h">Needs you here <span class="n${P.needs.some(n => n[0] === 'needs') ? ' is-needs' : ''}">${P.needs.length}</span></h2>
      <div class="p-rows">${P.needs.map(([k, t, kind, age]) => `
        <a class="p-row" href="${keep('inbox.html')}" aria-label="${esc(`${t}. ${k === 'needs' ? 'Needs you now' : 'Waiting'}, ${kind}, ${age} ago`)}">${dot(k, k === 'needs' ? 'Needs you now' : 'Waiting')}<span class="t"><b>${esc(t)}</b><span class="s">${esc(kind)}</span></span><span class="m num">${esc(age)}</span></a>`).join('')}
      </div>
    </section>`;

  const card = w => `
    <a class="p-task" href="${keep(w.href)}" data-id="${w.id}" data-k="${w.k}" aria-label="${esc(taskLabel(w))}">
      ${win(w.k)}
      <span class="p-task-b">
        <span class="p-task-t">${esc(w.title)}</span>
        <span class="p-task-s">${esc(w.step)}</span>
        <span class="p-task-m">${stageTrack(w.stage)}<span class="w">${esc(w.who === 'Next' ? 'Next' : `${w.who} · ${STAGES[w.stage]}`)}</span><span class="num">${esc([w.prog, w.ago].filter(Boolean).join(' · '))}</span></span>
      </span>
    </a>`;
  const taskLabel = w => `${w.title}. ${w.k === 'active' ? 'Working' : w.k === 'done' ? 'Done' : w.who === 'Next' ? 'Next' : 'Waiting'}. ${w.step}. ${[w.who !== 'Next' && `${w.who}, ${STAGES[w.stage]}`, w.prog, w.ago].filter(Boolean).join(', ')}`;
  const work = () => `
    <section class="p-sec" aria-labelledby="work-h">
      <h2 class="p-h" id="work-h">In progress <span class="n" data-p="work-n">${P.work.length || ''}</span></h2>
      ${P.work.length ? `<div class="p-tasks" data-work>${P.work.map(card).join('')}</div>`
        : `<p class="p-quiet">${P.lead ? 'Nothing is being built yet. Tasks appear here once the lead plans them.' : 'Nothing running. The lead is off, so nothing new starts.'}</p>`}
    </section>`;

  const recent = () => `
    <section class="p-sec" aria-labelledby="rec-h">
      <h2 class="p-h" id="rec-h">Recent</h2>
      <ol class="p-feed" data-feed>${P.recent.map(feedRow).join('')}</ol>
      <a class="link p-more" href="${keep(`activity.html?p=${id}`)}">All activity for ${id}</a>
    </section>`;
  const feedRow = ([t, w, k]) => `<li${k ? ` data-k="${k}"` : ''}><time class="num">${esc(t)}</time><span>${esc(w)}</span></li>`;

  /* ── Facts (R14): money, plan, team, the rest. Desk: a column; middle: under Now; phone: one fold. ── */
  const facts = () => {
    const at = P.money.pct >= 100;
    return `
    <aside class="p-facts" aria-label="Money and facts">
      <details class="p-factsfold" data-facts>
        <summary><span>Money and facts</span><span class="num${at ? ' is-needs' : ''}">${P.money.today} of ${P.money.limit} today</span>${I('chevron-down')}</summary>
        <div class="p-facts-in">
          <section class="p-fact" aria-labelledby="f-money">
            <h3 class="section-label" id="f-money">Spent on ${id}</h3>
            <div class="meter"><div class="meter-head"><span>Today</span><b>${P.money.today} <small>of ${P.money.limit}</small></b></div>
              <div class="meter-track${at ? ' is-full' : ''}"><i style="--value:${P.money.pct}%"></i></div>
              <span class="meter-foot${at ? ' is-needs' : ''}">${at ? 'At its limit: new work waits until midnight' : 'Daily limit · resets at midnight'}</span></div>
            <div class="meter-head p-total"><span>So far</span><b class="num">${P.money.total}</b></div>
            <details class="details p-split"><summary>Where it went${I('chevron-down')}</summary><div class="details-body">
              <dl class="p-dl num">${P.money.split.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
              <span>API-equivalent cost, not a bill.</span></div></details>
          </section>
          <section class="p-fact" aria-labelledby="f-plan">
            <h3 class="section-label" id="f-plan">Your Claude plan</h3>
            <div class="meter"><div class="meter-head"><span>5‑hour window</span><b>${known ? M.NOW.plan + '%' : '–'} <small>used</small></b></div><div class="meter-track"><i style="--value:${known ? M.NOW.plan : 0}%"></i></div><span class="meter-foot">Resets in ${M.NOW.planReset} · shared by every project</span></div>
          </section>
          <section class="p-fact" aria-labelledby="f-team">
            <h3 class="section-label" id="f-team">Team</h3>
            <ul class="p-team" data-team>${P.team.map(teamRow).join('')}</ul>
            <a class="link p-more" href="${keep('office.html')}">Open the Office</a>
          </section>
          <section class="p-fact" aria-labelledby="f-how">
            <h3 class="section-label" id="f-how">How it runs</h3>
            <dl class="p-dl is-stack">${P.facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}<dt>In the Claude app</dt><dd>“${esc(P.app)}”</dd></dl>
            <a class="link p-more" href="${keep(`settings.html?p=${id}`)}">Change in Settings</a>
          </section>
        </div>
      </details>
    </aside>`;
  };
  const teamRow = ([r, k, w]) => `<li data-role="${r}">${dot(k === 'off' ? '' : k, w, true)}<b>${r}</b><span class="w${k && k !== 'off' ? ' is-' + k : ''}">${w}</span></li>`;

  /* ── The other sections (R15), each a plain list ── */
  const TASKS = [
    ['active', 'Trim clips on the timeline', 'Working · Builder · Building · try 2 of 5', '1 min ago'],
    ['', 'Share a clip as a link', 'Next · starts when the budget allows', ''],
    ['done', 'The clip list scrolls smoothly', 'Done · reviewed and merged', '11:05'],
    ['done', 'Import from the phone’s camera roll', 'Done · reviewed and merged', 'Mon'],
    ['done', 'Play, pause and seek from the keyboard', 'Done · reviewed and merged', 'Mon'],
    ['', 'A waveform under the timeline', 'Stopped by you: “not for the first version”', 'Sun'],
  ];
  const OUTCOMES = [
    [false, 'Trimming a clip keeps the sound in sync', 'Being built: Trim clips on the timeline'],
    [true, 'The clip list scrolls smoothly with 500 clips', 'Met 11:05 · review passed'],
    [true, 'Clips import from the phone’s camera roll', 'Met Mon'],
    [true, 'Play, pause and seek work from the keyboard', 'Met Mon'],
    [false, 'A clip shared as a link plays in any browser', 'Next: Share a clip as a link'],
    [true, 'Every screen works on a 390 px phone', 'Met Sun'],
    [false, 'The trim handles can be reached by keyboard', 'Not yet: an audit found they can’t'],
    [false, 'A one-minute clip exports at 1080p in under a minute', 'Not started'],
    [false, 'Nothing leaves the device unless you share it', 'Not started'],
  ];
  const sectionBody = {
    tasks: () => `<section class="p-sec"><h2 class="p-h">Tasks <span class="n">${TASKS.length}</span></h2><div class="p-rows">${TASKS.map(([k, t, s, a]) => `
      <a class="p-row" href="${keep('task.html')}" aria-label="${esc(`${t}. ${s}${a ? ', ' + a : ''}`)}">${dot(k, k === 'active' ? 'Working' : k === 'done' ? 'Done' : 'Waiting', true)}<span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span><span class="m num">${a}</span></a>`).join('')}</div></section>`,
    outcomes: () => `<section class="p-sec"><h2 class="p-h">Outcomes <span class="n">${P.met} of ${P.of} met</span></h2><p class="p-quiet">What the project must do to be finished, in the charter’s words.</p><ul class="p-outs">${OUTCOMES.map(([m, t, s]) => `
      <li data-met="${m}">${m ? `<span class="p-ok" role="img" aria-label="Met">${I('check')}</span>` : '<span class="p-ok" role="img" aria-label="Not met yet"></span>'}<span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span></li>`).join('')}</ul></section>`,
    audits: () => `<section class="p-sec"><h2 class="p-h">Open findings <span class="n">1</span></h2><div class="p-rows">
      <a class="p-row" href="${keep('inbox.html')}" aria-label="The trim handles can’t be reached by keyboard. Accessibility finding, waiting for your call in the Inbox">${dot('', 'Waiting')}<span class="t"><b>The trim handles can’t be reached by keyboard</b><span class="s">Accessibility · found Mon · waiting for your call in the Inbox</span></span><span class="m num">3 h</span></a></div></section>
      <section class="p-sec"><h2 class="p-h">Past audits</h2><ol class="p-feed"><li><time class="num">Mon 15:10</time><span>Accessibility: 12 checks, 1 finding · $3.20</span></li><li><time class="num">Sun 10:02</time><span>Performance: 8 checks, nothing found · $3.20</span></li></ol></section>`,
    docs: () => `<section class="p-sec"><h2 class="p-h">Documents</h2><div class="p-docs">${[
      ['Charter', 'Approved by you 18 Oct · 1 min read', 'A small video editor for clips from your phone: trim, keep the sound in sync, share as a link. Fast on a phone, nothing leaves the device unless you share it.'],
      ['Spec', 'Approved by you yesterday 17:20 · 6 min read', '9 outcomes, from trimming to export. Each one is checked by a test or a review before it counts as met.'],
      ['Design', 'Approved by you 20 Oct · 4 min read', 'The timeline, the clip list and the player, in the dark editor look. Trim handles are 44 px on a phone.'],
      ['Contracts', 'Approved by you 21 Oct · 3 min read', 'How the clip list, the player and the share link talk to each other.'],
    ].map(([t, s, b]) => `<details class="details p-doc"><summary><span class="t"><b>${t}</b><span class="s">${s}</span></span>${I('chevron-down')}</summary><div class="details-body"><p>${b}</p></div></details>`).join('')}</div></section>`,
  };

  /* ── States ── */
  const skeleton = () => `<div class="p-grid" aria-busy="true" aria-label="Loading ${id}">
      <section class="p-now"><span class="skeleton" style="width:48px;height:12px"></span><span class="skeleton" style="width:70%;height:28px"></span><span class="skeleton" style="width:90%;height:16px"></span><span class="skeleton" style="width:100%;height:28px;margin-top:8px"></span></section>
      <aside class="p-facts"><div class="p-facts-in p-skel"><span class="skeleton" style="height:120px"></span><span class="skeleton" style="height:72px"></span></div></aside>
      <div class="p-col">${[3, 2].map(n => `<section class="p-sec"><span class="skeleton" style="width:120px;height:16px"></span>${Array.from({ length: n }, () => '<span class="skeleton" style="width:100%;height:44px"></span>').join('')}</section>`).join('')}</div></div>`;

  const tabs = () => `<nav class="tabs p-tabs" aria-label="${id}" data-scrolls>${[
    ['overview', 'Overview'], ['tasks', 'Tasks', id === 'replay' ? TASKS.filter(t => t[0] !== 'done' && !t[2].startsWith('Stopped')).length : P.tasks], ['outcomes', 'Outcomes', P.of ? `${P.met}/${P.of}` : ''], ['audits', 'Audits', P.audits || ''], ['docs', 'Docs'],
  ].map(([k, t, c]) => `<a class="tab" href="${here(k)}"${tab === k ? ' aria-current="page"' : ''}>${t}${known && c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}
    <a class="tab" href="${keep(`activity.html?p=${id}`)}">Activity</a><a class="tab" href="${keep(`settings.html?p=${id}`)}">Settings</a></nav>`;

  /* Desk: Now and the rest in the reading column, facts beside them; middle and phone: facts right under Now */
  const overview = () => `<div class="p-grid${state === 'stale' ? ' is-stale' : ''}">${now()}${facts()}<div class="p-col">${needs()}${work()}${recent()}</div></div>`;
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError(`The ${id} page`)
    : tab === 'overview' || id !== 'replay' ? overview() : `<div class="p-col p-list">${sectionBody[tab]()}</div>`;

  /* Lead control (R16): one place, in the head. On: a menu with Restart and Stop (Stop asks first). Off: Start. */
  const leadCtl = () => P.lead
    ? `<span class="p-lead">${dot('active', 'Lead on', true)}<span>Lead on</span></span>
       <div class="p-menu"><button class="btn btn-secondary" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="lead-menu" data-menu>Lead${I('chevron-down')}</button>
         <div class="p-pop" id="lead-menu" hidden><button type="button" data-restart>${I('refresh')}<span>Restart the lead<small>It picks up where it left off</small></span></button><button type="button" data-stop>${I('x')}<span>Stop the lead…<small>Running tasks finish first</small></span></button></div></div>`
    : `<span class="p-lead is-off">${dot('', 'Lead off')}<span>Lead off</span></span><button class="btn btn-secondary" type="button" data-start>${I('play')}Start the lead</button>`;

  const dialog = `<dialog class="p-dialog" aria-labelledby="dlg-t" aria-describedby="dlg-d">
      <h2 id="dlg-t">Stop the lead for ${id}?</h2>
      <p id="dlg-d">Nothing new starts until you start it again. The builder finishes the try it is on.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Keep it running</button><button class="btn btn-danger" type="button" value="stop">Stop the lead</button></div>
    </dialog>`;

  mount({
    cur: id, title: id, ux: ['UX-6', 'UX-14', 'UX-3', 'UX-11'],
    head: `<a class="back" href="${keep('projects.html')}">${I('chevron-left')}<span>Projects</span></a><h1>${id}</h1>${state === 'loading' || state === 'error' ? '' : leadCtl()}<span class="end">${live()}</span>`,
    tabs: tabs(),
    body: `<div class="hf-body">${body}</div>${dialog}`,
    after,
  });

  function toast(text, undo) {
    const box = document.querySelector('.toasts');
    box.innerHTML = `<div class="toast toast-success" role="status">${I('check')}<span class="toast-text">${esc(text)}</span>${undo ? '<button class="toast-action" type="button">Undo</button>' : ''}</div>`;
    clearTimeout(toast.t); toast.t = setTimeout(() => { box.innerHTML = ''; }, 6000);
  }
  function after() {
    /* Facts open as a column on desk and middle, closed as a fold on the phone */
    const f = document.querySelector('[data-facts]');
    if (f) { f.open = innerWidth >= 768; addEventListener('resize', () => { if (innerWidth >= 768) f.open = true; }); }
    const btn = document.querySelector('[data-menu]'), pop = document.getElementById('lead-menu');
    const close = () => { if (!pop || pop.hidden) return; pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn && btn.addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute('aria-expanded', String(!pop.hidden)); if (!pop.hidden) pop.querySelector('button').focus(); });
    document.addEventListener('click', e => { if (pop && !pop.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop && !pop.hidden) { close(); btn.focus(); } });
    const dlg = document.querySelector('.p-dialog');
    document.querySelector('[data-restart]')?.addEventListener('click', () => { close(); toast('Restarting the lead for ' + id); });
    document.querySelector('[data-stop]')?.addEventListener('click', () => { close(); dlg.showModal(); });
    dlg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { dlg.close(); if (b.value === 'stop') toast('Stopped the lead for ' + id); btn.focus(); }));
    document.querySelector('[data-start]')?.addEventListener('click', e => { e.currentTarget.setAttribute('aria-busy', 'true'); e.currentTarget.innerHTML = `${I('refresh')}Starting…`; });
    if (q.get('ui') === 'menu') btn?.click();
    if (q.get('ui') === 'stop') dlg.showModal();
    if (q.has('demo') && tab === 'overview' && id === 'replay') demo(q.get('demo') === 'loop');
  }

  /* ── Live refresh, in place (R7) ── */
  function setWork(wid, patch) {
    const w = P.work.find(x => x.id === wid);
    if (!w) { P.work.unshift(patch); const box = document.querySelector('[data-work]'); box.insertAdjacentHTML('afterbegin', card(patch)); box.firstElementChild.classList.add('is-entering'); }
    else {
      Object.assign(w, patch);
      const el = document.querySelector(`.p-task[data-id="${wid}"]`);
      el.outerHTML = card(w);
      document.querySelector(`.p-task[data-id="${wid}"]`).classList.add('is-changing');
    }
    sync();
  }
  function dropWork(wid) {
    const el = document.querySelector(`.p-task[data-id="${wid}"]`);
    el.classList.add('is-leaving');
    setTimeout(() => { el.remove(); P.work = P.work.filter(x => x.id !== wid); sync(); }, 320);
  }
  function addFeed(r) { const ol = document.querySelector('[data-feed]'); ol.insertAdjacentHTML('afterbegin', feedRow(r)); ol.firstElementChild.classList.add('is-entering'); }
  function setTeam(role, k, w) { const li = document.querySelector(`[data-team] li[data-role="${role}"]`); li.outerHTML = teamRow([role, k, w]); document.querySelector(`[data-team] li[data-role="${role}"]`).classList.add('is-changing'); }
  function meet() { P.met += 1; const pip = document.querySelectorAll('[data-pips] i')[P.met - 1]; pip.classList.add('met', 'is-pop'); tick(document.querySelector('[data-p="met"]'), P.met); document.querySelector('.p-phases').setAttribute('aria-label', `Phase: Build, ${P.met} of ${P.of} outcomes met`); const tc = [...document.querySelectorAll('.p-tabs .tab .count')].find(c => c.textContent.includes('/')); if (tc) tick(tc, `${P.met}/${P.of}`); }
  function sync() {
    tick(document.querySelector('[data-p="working"]'), working());
    tick(document.querySelector('[data-p="work-n"]'), P.work.length || '');
    const all = M.NOW.working - 1 + working();
    setCount('working', all); setCount('working-label', `${all} working`);
    const lv = document.querySelector('[data-live]'); if (lv) lv.textContent = 'Updated just now';
  }
  function demo(loop) {
    const T = (ms, fn) => setTimeout(fn, ms);
    T(1600, () => { setWork('t-trim', { k: 'done', step: 'Showed its work: 2 screenshots and a recording', stage: 3, prog: 'Ready for review', ago: 'just now' }); setTeam('Builder', '', 'Waiting'); });
    T(1600 + 2400, () => { dropWork('t-trim'); addFeed(['14:03', 'Trim clips on the timeline is ready for review', 'done']); });
    T(5400, () => { setWork('t-review', { id: 't-review', k: 'active', title: 'Review: Trim clips on the timeline', who: 'Reviewer', stage: 3, step: 'Watching the recording of a trim', prog: '1 of 3 checks', ago: 'just now', href: 'task.html' }); setTeam('Reviewer', 'active', 'Working'); });
    T(8600, () => { setWork('t-review', { step: 'Checked the sound stays in sync after a trim', prog: '3 of 3 checks' }); });
    T(10200, () => { setWork('t-review', { k: 'done', step: 'Passed: trimming keeps the sound in sync', prog: 'Ready to merge', ago: 'just now' }); setTeam('Reviewer', '', 'Waiting'); addFeed(['14:05', 'Review passed: trimming keeps the sound in sync', 'done']); meet(); });
    if (loop) T(13500, () => { location.reload(); });
  }
})();
