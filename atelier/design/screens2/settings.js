/* Settings (UX-3 A: one global Settings, plus a Settings tab per project). settings.html = every project (Claude plan,
   appearance, this device, about); settings.html?p=<project> = that project (lead, approvals, gating, money, shipping,
   reporting, reading, team, numbers). Every inventory line of the project Settings tab and the plan pacing is here.
   A change takes effect at once and says so: choices with a toast and Undo (UX-10 A), amounts on Enter or leaving the
   field with "Saved" beside them. Stopping the lead confirms. ?v=holding (pacing holds work) · ?v=invalid (a bad amount) ·
   ?ui=stop (confirm) · ?ui=toast (a change just saved). */
(() => {
  const { M, q, state, known, esc, I, dot, keep, pHref, live, loadError, mount } = window.HF;
  const ids = M.PROJECTS.map(p => p.id);
  const id = ids.includes(q.get('p')) ? q.get('p') : '';
  const v = q.get('v') || '';
  const N = M.NOW;
  const P = id && M.PROJECTS.find(p => p.id === id);

  /* Per project: the dials as they are now (replay's are the inventory's real values) */
  const DIALS = {
    replay: { gates: ['spec', 'design', 'contracts'], read: 'plain', trust: 'standard', report: 'exceptions', ship: 'pr', task: '10', day: '40', earned: null },
    'atelier-ui': { gates: ['brief', 'spec', 'design', 'contracts'], read: 'plain', trust: 'strict', report: 'everything', ship: 'pr', task: '16', day: '30', earned: ['standard', '9 tasks in a row passed review with no change from you.'] },
    dodge: { gates: ['spec', 'design'], read: 'technical', trust: 'standard', report: 'digest', ship: 'pr', task: '8', day: '20', earned: null },
  };
  const ROSTER = {
    replay: [['Lead', 'atelier/ (plans, the ledger)', 'Opus 5.5', 'needs'], ['Builder', 'src/**, tests/**', 'Sonnet 5.5', 'active'], ['Reviewer', 'Reads everything, writes reviews', 'Opus 5.5', ''], ['Auditor', 'atelier/audits/**', 'Sonnet 5.5', 'off']],
    'atelier-ui': [['Lead', 'atelier/ (plans, the ledger)', 'Opus 5.5', ''], ['Designer', 'atelier/design/**', 'Opus 5.5', 'active'], ['Auditor', 'atelier/audits/**', 'Sonnet 5.5', 'active'], ['Reviewer', 'Reads everything, writes reviews', 'Opus 5.5', 'off']],
    dodge: [['Lead', 'atelier/ (plans, the ledger)', 'Opus 5.5', 'off'], ['Game designer', 'atelier/design/**', 'Opus 5.5', 'off'], ['Builder', 'src/**', 'Sonnet 5.5', 'off']],
  };
  const NUMBERS = {
    replay: [['Your approvals', '14'], ['Overruled by you', '2 of 41 decisions'], ['Audit hit rate', '3 of 4 findings fixed'], ['Full test suite', '<code>npm test</code>'], ['Project folder', '<code>~/Documents/replay</code>']],
    'atelier-ui': [['Your approvals', '22'], ['Overruled by you', '1 of 58 decisions'], ['Audit hit rate', '5 of 5 findings fixed'], ['Full test suite', '<code>atelier verify design</code>'], ['Project folder', '<code>~/Documents/atelier</code>']],
    dodge: [['Your approvals', '3'], ['Overruled by you', 'none yet'], ['Audit hit rate', 'No audits yet'], ['Full test suite', '<code>npm test</code>'], ['Project folder', '<code>~/Documents/dodge-practice</code>']],
  };

  const hd = k => `<span class="dot${k ? ' dot-' + k : ''}" aria-hidden="true"></span>`;
  const radio = (name, val, title, sub, cur, tag = '') => `<label class="choice is-two"><input type="radio" name="${name}" value="${val}"${cur === val ? ' checked' : ''} data-say="${esc(title)}"><span><b>${title}${tag ? `<span class="tag">${tag}</span>` : ''}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  const amount = (name, label, val, pre, post, help, bad) => `
    <div class="field">
      <label class="field-label" for="s-${name}">${label}</label>
      <span class="f-inline"><span class="f-unit ${pre ? 'is-pre' : 'is-post'}">${pre ? `<i>${pre}</i>` : ''}<input class="input" id="s-${name}" name="${name}" inputmode="decimal" value="${bad ? 'forty' : val}" data-amount aria-describedby="s-${name}-h${bad ? ` s-${name}-e` : ''}"${bad ? ' aria-invalid="true"' : ''}>${post ? `<i>${post}</i>` : ''}</span><span class="f-saved" aria-live="polite">${I('check')}Saved</span></span>
      ${bad ? `<span class="field-error" id="s-${name}-e">${I('alert')}<span>Enter an amount in dollars, like 40.</span></span>` : ''}
      <span class="field-help" id="s-${name}-h">${help}</span>
    </div>`;
  const sec = (key, title, body, why = '') => `<section class="f-sec s-sec" id="${key}" aria-labelledby="${key}-h"><h2 id="${key}-h">${title}</h2>${why ? `<p class="f-why">${why}</p>` : ''}${body}</section>`;
  const meter = (label, pct, foot) => `<div class="meter"><div class="meter-head"><span>${label}</span><b>${known ? pct + '%' : '–'} <small>used</small></b></div><div class="meter-track"><i style="--value:${known ? pct : 0}%"></i></div><span class="meter-foot">${foot}</span></div>`;

  /* ── Every project ── */
  const holding = v === 'holding';
  const GLOBAL = [
    ['plan', 'Claude plan', `
      <div class="s-meters">${meter('5‑hour window', N.plan, `Resets in ${N.planReset} · updated 1 min ago`)}${meter('This week', 58, 'Resets Thu 09:00')}</div>
      <p class="field-help s-spent">Atelier spent <b class="num">${N.today}</b> today on finished work; ${N.working} agents are still working, so it will rise. 4.2 M tokens. API-equivalent cost, not a bill.</p>
      <p class="s-hold${holding ? ' is-holding' : ''}" role="status">${holding ? `${I('refresh')}<span><b>Holding new work until midnight.</b> Today has used more than its share of the week (58 % by Monday). Running tasks finish first.</span>` : `${hd('done')}<span>Not holding: work runs as planned.</span>`}</p>
      ${amount('five', 'Pause Atelier at this much of the 5‑hour window', '85', '', '%', 'New work waits until the window resets. Running tasks finish.')}
      ${amount('week', 'Pause Atelier at this much of the week', '90', '', '%', 'Leaves the rest of the week for you.')}
      <label class="f-switch"><span>Spread work evenly over the week<small>Holds work when today has used more than its share.</small></span><input type="checkbox" name="spread" checked data-say="Spread work evenly"></label>`,
      'Shared by every project. Atelier paces itself so the plan lasts.'],
    ['look', 'Appearance', `<fieldset class="f-sec"><legend class="sr-only">Theme</legend><div class="f-row3">
      ${radio('theme', 'dark', 'Dark', '', document.documentElement.dataset.theme === 'dark' ? 'dark' : '')}${radio('theme', 'light', 'Light', '', document.documentElement.dataset.theme === 'light' ? 'light' : '')}${radio('theme', 'system', 'Follow this device', '', '')}</div></fieldset>`],
    ['device', 'This device', `<p class="s-p">Signed in on this browser since 12 Oct. To use Atelier on your phone, open it there, paste your access token once, and add it to the home screen.</p>`],
    ['projects', 'Each project', `<div class="p-rows">${M.PROJECTS.map(p => `<a class="p-row" href="${keep('settings.html?p=' + p.id)}">${dot(p.lead ? 'active' : '', p.lead ? 'Lead on' : 'Lead off')}<span class="t"><b>${p.id}</b><span class="s">${DIALS[p.id].trust[0].toUpperCase() + DIALS[p.id].trust.slice(1)} gating · ${p.limit} a day · ${({ pr: 'draft pull requests', main: 'straight to main', local: 'local branches only' })[DIALS[p.id].ship]}</span></span><span class="m">${I('chevron-right')}</span></a>`).join('')}</div>`,
      'Approvals, gating, money, shipping and the team are set per project.'],
    ['about', 'About', `<p class="s-p">Atelier 0.9 · installed today 08:02. The dashboard reloads itself when a new version is installed.</p>`],
  ];

  /* ── One project ── */
  const D = id && DIALS[id];
  const PHASE_GATES = [['brief', 'Brief'], ['spec', 'Spec'], ['design', 'Design'], ['contracts', 'Contracts']];
  const PROJECT = id && [
    ['lead', 'Lead', `<div class="s-lead"><span class="p-lead${P.lead ? '' : ' is-off'}">${dot(P.lead ? 'active' : '', P.lead ? 'Lead on' : 'Lead off', true)}<span>${P.lead ? 'Lead on' : 'Lead off'}</span></span><span class="s-app">In the Claude app: “${id} lead”</span></div>
      <div class="f-actions">${P.lead ? `<button class="btn btn-secondary" type="button" data-restart>${I('refresh')}Restart fresh</button><button class="btn btn-secondary" type="button" data-stop>${I('x')}Stop the lead…</button>` : `<button class="btn btn-primary" type="button" data-start>${I('play')}Start the lead</button>`}</div>`],
    ['gates', 'Approvals', `<div class="f-checks">${PHASE_GATES.map(([k, t]) => `<label class="f-check"><input type="checkbox" name="gate" value="${k}"${D.gates.includes(k) ? ' checked' : ''} data-say="You approve the ${t.toLowerCase()}"><span>${t}</span></label>`).join('')}</div>`,
      'The phases you approve yourself. The rest go ahead when the reviewer passes them.'],
    ['trust', 'Gating', `${D.earned ? `<p class="s-earned">${I('outcome')}<span><b>The team has earned ${D.earned[0]} gating.</b> ${esc(D.earned[1])}</span></p>` : ''}<div class="choices">
      ${radio('trust', 'strict', 'Strict', 'You OK every task’s plan before it starts.', D.trust)}
      ${radio('trust', 'standard', 'Standard', 'You OK the spec, design and contracts; tasks start by themselves.', D.trust, D.earned && D.earned[0] === 'standard' ? 'earned' : '')}
      ${radio('trust', 'loose', 'Loose', 'You see results; only problems and money stop for you.', D.trust)}</div>`],
    ['money', 'Money', `<div class="s-money">${amount('day', 'Spend per day', D.day, '$', '', id === 'replay' ? 'Today $40.00 of $40, at its limit. Resets at midnight.' : `Today ${P.today} of ${P.limit}. Resets at midnight.`, v === 'invalid')}${amount('task', 'Spend per task', D.task, '$', '', 'A task stops and asks when it reaches this.')}</div>`,
      'API-equivalent cost, not a bill. Your Claude plan is in Settings for every project.'],
    ['ship', 'Shipping', `<div class="choices">${radio('ship', 'main', 'Straight to main', 'Reviewed work lands by itself.', D.ship)}${radio('ship', 'pr', 'Draft pull requests', 'You merge each one.', D.ship)}${radio('ship', 'local', 'Local branches only', 'Nothing leaves this computer.', D.ship)}</div>`],
    ['report', 'Reporting', `<div class="choices">${radio('report', 'everything', 'Everything', 'Every event reaches the Inbox’s Earlier list.', D.report)}${radio('report', 'digest', 'A daily digest', 'One summary each evening.', D.report)}${radio('report', 'exceptions', 'Only exceptions', 'Only what needs you and what went wrong.', D.report)}</div>`],
    ['read', 'What you read', `<div class="f-row2">${radio('read', 'plain', 'Plain words', 'What it means for the product.', D.read)}${radio('read', 'technical', 'Technical', 'File names, tests and diffs up front.', D.read)}</div>`],
    ['team', 'Team', `<table class="s-team"><thead><tr><th scope="col">Role</th><th scope="col">Files it owns</th><th scope="col">Model</th></tr></thead><tbody>${ROSTER[id].map(([r, f, m, k]) => `<tr><th scope="row">${hd(k === 'off' ? '' : k)}${r}</th><td>${esc(f)}</td><td>${m}</td></tr>`).join('')}</tbody></table>`],
    ['numbers', 'Numbers', `<dl class="p-dl s-dl">${NUMBERS[id].map(([k, x]) => `<dt>${k}</dt><dd>${x}</dd>`).join('')}</dl>`],
  ];

  const S = id ? PROJECT : GLOBAL;
  const nav = `<nav class="s-nav" aria-label="Settings sections">${S.map(([k, t], i) => `<a class="nav-item" href="#${k}"${i === 0 ? ' aria-current="true"' : ''}>${t}</a>`).join('')}
    ${id ? `<a class="nav-item s-other" href="${keep('settings.html')}">${I('settings')}Every project</a>` : ''}</nav>`;
  const page = `<div class="s-grid">${nav}<form class="f-form s-form" novalidate onsubmit="return false">${S.map(x => sec(...x)).join('')}</form></div>`;
  const skeleton = `<div class="s-grid" aria-busy="true" aria-label="Loading settings"><span></span><div class="f-form">${[120, 96, 140].map(h => `<span class="skeleton" style="display:block;height:${h}px"></span>`).join('')}</div></div>`;
  const body = state === 'loading' ? skeleton : state === 'error' ? loadError(id ? `Settings for ${id}` : 'Settings') : page;

  const dialog = `<dialog class="p-dialog" aria-labelledby="dlg-t" aria-describedby="dlg-d">
      <h2 id="dlg-t">Stop the lead for ${id}?</h2>
      <p id="dlg-d">Nothing new starts until you start it again. Running tasks finish the try they are on.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Keep it running</button><button class="btn btn-danger" type="button" value="stop">Stop the lead</button></div>
    </dialog>`;

  mount({
    cur: id || 'settings', title: id ? `Settings · ${id}` : 'Settings', ux: ['UX-3', 'UX-10'],
    head: `${id ? `<a class="back" href="${keep(pHref(id))}">${I('chevron-left')}<span>${id}</span></a>` : ''}<h1>Settings</h1><span class="hf-sum">${id ? `${id} only` : 'For every project'}</span>`,
    body: `<div class="hf-body">${body}</div>${id ? dialog : ''}`,
    after,
  });

  function toast(text, undo) {
    const box = document.querySelector('.toasts');
    box.innerHTML = `<div class="toast toast-success" role="status">${I('check')}<span class="toast-text">${esc(text)}</span>${undo ? '<button class="toast-action" type="button">Undo</button>' : ''}</div>`;
    const u = box.querySelector('.toast-action');
    u && u.addEventListener('click', () => { undo(); box.innerHTML = ''; });
    clearTimeout(toast.t); toast.t = setTimeout(() => { box.innerHTML = ''; }, 6000);
  }
  function after() {
    const form = document.querySelector('.s-form');
    if (!form) return;
    const where = id ? ` for ${id}` : '';
    /* Choices save at once; Undo puts the last one back */
    form.addEventListener('focusin', e => { if (e.target.type === 'radio' || e.target.type === 'checkbox') e.target.dataset.was = e.target.type === 'radio' ? form.querySelector(`input[name="${e.target.name}"]:checked`)?.value || '' : String(e.target.checked); });
    form.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.amount !== undefined) return;
      if (t.name === 'theme') { document.documentElement.dataset.theme = t.value === 'light' ? 'light' : 'dark'; }
      const prev = form.querySelector(`input[name="${t.name}"][value="${t.dataset.was}"]`);
      const said = t.type === 'radio' ? `${t.closest('.s-sec').querySelector('h2').textContent}: ${t.dataset.say}` : `${t.dataset.say}: ${t.checked ? 'on' : 'off'}`;
      toast(`Saved${where}. ${said}`, () => { if (t.type === 'radio' && prev) { prev.checked = true; if (t.name === 'theme') document.documentElement.dataset.theme = prev.value === 'light' ? 'light' : 'dark'; } else if (t.type === 'checkbox') t.checked = !t.checked; });
    });
    /* Amounts save on Enter or leaving the field, if they read as a number */
    form.querySelectorAll('[data-amount]').forEach(inp => {
      const save = () => {
        const ok = /^\d+(\.\d{1,2})?$/.test(inp.value.trim());
        const fld = inp.closest('.field'); fld.querySelector('.field-error')?.remove();
        if (!ok) { inp.setAttribute('aria-invalid', 'true'); inp.closest('.f-inline').insertAdjacentHTML('afterend', `<span class="field-error" id="${inp.id}-e">${I('alert')}<span>${inp.closest('.f-unit').classList.contains('is-pre') ? 'Enter an amount in dollars, like 40.' : 'Enter a percentage from 1 to 100.'}</span></span>`); inp.setAttribute('aria-describedby', `${inp.id}-h ${inp.id}-e`); return; }
        inp.removeAttribute('aria-invalid'); inp.setAttribute('aria-describedby', `${inp.id}-h`);
        const s = fld.querySelector('.f-saved'); s.classList.add('is-on'); clearTimeout(s.t); s.t = setTimeout(() => s.classList.remove('is-on'), 2400);
      };
      inp.addEventListener('change', save);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    });
    /* The section nav follows the scroll on the desk */
    const links = [...document.querySelectorAll('.s-nav a[href^="#"]')];
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.toggleAttribute('aria-current', a.hash === '#' + en.target.id)); }), { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('.s-sec').forEach(s => io.observe(s));
    links.forEach(a => a.addEventListener('click', () => links.forEach(b => b.toggleAttribute('aria-current', b === a))));
    /* Lead (R16): restart is instant, stop confirms */
    const dlg = document.querySelector('.p-dialog'), stop = document.querySelector('[data-stop]');
    document.querySelector('[data-restart]')?.addEventListener('click', () => toast(`Restarting the lead for ${id} with a fresh start`));
    stop?.addEventListener('click', () => dlg.showModal());
    dlg?.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { dlg.close(); if (b.value === 'stop') toast(`Stopped the lead for ${id}`); stop.focus(); }));
    document.querySelector('[data-start]')?.addEventListener('click', e => { e.currentTarget.setAttribute('aria-busy', 'true'); e.currentTarget.innerHTML = `${I('refresh')}Starting…`; });
    if (q.get('ui') === 'stop' && dlg) dlg.showModal();
    if (q.get('ui') === 'toast') toast(id ? `Saved for ${id}. Gating: Standard` : 'Saved. Spread work evenly: on', () => {});
  }
})();
