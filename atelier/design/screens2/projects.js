/* Projects list (inventory: Projects list; UX-14 A words). One card per project, in the sidebar's order: name and lead,
   its windows (the Office strip: one per agent, lit while working), what waits on you, the project's Now sentence (the same
   words as its page, UX-6 A), then the phase, the task summary and today's money in one quiet line. Data: ATELIER_MODEL.PROJECTS. */
(() => {
  const { M, state, known, esc, I, keep, pHref, live, loadError, mount } = window.HF;
  const N = M.NOW;
  const P = M.PROJECTS;
  const desks = id => { const f = M.OFFICE.find(x => x.p === id); return f && f.desks.length ? f.desks.map(d => d.k) : ['off']; };

  const tasksLine = t => {
    const [w, nd, qd, dn] = t;
    if (!(w + nd + qd + dn)) return 'No tasks yet';
    return [w && `${w} working`, nd && `${nd} ${nd > 1 ? 'need' : 'needs'} you`, qd && `${qd} queued`, dn && `${dn} done`].filter(Boolean).join(' · ');
  };
  const money = p => `${p.today} of ${p.limit} today${p.pct >= 100 ? ', at its limit' : p.pct >= 80 ? ', most of it used' : ''}`;
  const waitWords = p => !p.waiting ? 'Nothing waits on you' : `${p.waiting} waiting${p.needsNow ? ` · ${p.needsNow} ${p.needsNow > 1 ? 'need' : 'needs'} you now` : ''}`;
  const phase = p => `<span class="pj-phase" aria-hidden="true">${M.PHASES.map((n, i) => `<i class="${i < p.phase ? 'past' : i === p.phase ? 'now' : ''}"></i>`).join('')}</span>`;
  const label = p => `${p.id}, lead ${p.lead ? 'on' : 'off'}. ${p.now} ${waitWords(p)}. Phase ${M.PHASES[p.phase]}, ${p.met} of ${p.of} outcomes met. ${tasksLine(p.tasks)}. ${money(p)}.`;

  const card = p => `
    <a class="pj" href="${keep(pHref(p.id))}" data-id="${p.id}" aria-label="${esc(label(p))}">
      <span class="pj-top">
        <span class="pj-name"><b>${esc(p.id)}</b><span class="p-lead${p.lead ? '' : ' is-off'}"><span class="dot${p.lead ? ' dot-active' : ''}" aria-hidden="true"></span>${p.lead ? 'Lead on' : 'Lead off'}</span></span>
        <span class="strip" aria-hidden="true">${desks(p.id).map(k => `<i data-k="${k}"></i>`).join('')}</span>
        <span class="pj-wait num${p.needsNow ? ' is-needs' : ''}">${known ? waitWords(p) : ''}</span>
      </span>
      <span class="pj-now">${esc(p.now)}</span>
      <span class="pj-foot num">
        <span class="pj-ph">${phase(p)}<span><b>${M.PHASES[p.phase]}</b> · ${p.met} of ${p.of} outcomes met</span></span>
        <span>${tasksLine(p.tasks)}</span>
        <span class="pj-money${p.pct >= 100 ? ' is-needs' : ''}">${known ? money(p) : ''}</span>
      </span>
    </a>`;

  const skeleton = () => `<div class="pj-list" aria-busy="true" aria-label="Loading projects">${P.map(() => `<span class="pj is-skeleton"><span class="skeleton" style="width:30%;height:20px"></span><span class="skeleton" style="width:80%;height:24px"></span><span class="skeleton" style="width:60%;height:14px"></span></span>`).join('')}</div>`;
  const empty = () => `<div class="hf-empty"><h2>No projects yet.</h2><p>Describe what you want made, in a line or a whole brief. A lead reads it, drafts a charter, and asks for your OK in the Inbox.</p><a class="btn btn-primary" href="${keep('new.html')}">${I('plus')}New project</a></div>`;
  const list = () => `<div class="pj-list${state === 'stale' ? ' is-stale' : ''}">${P.map(card).join('')}</div>`;
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError('Your projects') : state === 'empty' ? empty() : list();

  const sum = known && state !== 'empty'
    ? `<span class="hf-sum num">${P.length} projects · <span class="is-needs">${N.needs} need you now</span> · ${N.waiting} waiting</span>` : '';
  mount({
    cur: 'projects', title: 'Projects', ux: ['UX-6', 'UX-14', 'UX-11'],
    head: `<h1>Projects</h1>${sum}<span class="end">${state === 'empty' ? '' : live()}${state === 'empty' ? '' : `<a class="btn btn-secondary btn-sm pj-new" href="${keep('new.html')}">${I('plus')}New project</a>`}</span>`,
    body: `<div class="hf-body">${body}</div>`,
  });
})();
