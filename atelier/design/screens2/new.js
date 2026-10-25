/* New project (UX-12 B: the same create field, growing into a brief; inventory: New project). Name, then "What it is":
   one line is enough, and a long paste reads in full as the brief draft (lead ruling on the D5 open question): same
   field, same action (project-create), the hint under it says which it has become. Team, shipping, repo, start the lead;
   Create or Cancel; goes to the new project. ?v=brief (a whole brief pasted) · ?v=taken (name in use) · ?v=fail (create
   fails once) · ?v=busy (Creating…). Beside the form on the desk: what happens next, updated as you choose. */
(() => {
  const { q, state, esc, I, keep, mount } = window.HF;
  const v = q.get('v') || '';
  const BRIEF = `Tide times for the three beaches near home (Porthmeor, Gwithian and Sennen), readable at a glance on a phone at 6 am with salt on the screen.

Who it's for: me and my two kids, who surf before school. We check the tide, the wind and the sunrise, in that order.

Must do:
- Today's high and low for each beach, big enough to read at arm's length
- One line that says whether it's a good morning: a rising tide after 6, offshore wind
- Works offline on the beach and refreshes when there's signal
- Nothing to sign in to

Not now: surf forecasts, a map, accounts, notifications.

Feel: like a tide table pinned up in a beach hut, not a weather app.`;
  const desc0 = v === 'brief' ? BRIEF : 'A tide-times app for the three beaches near home, readable at a glance on a phone.';
  const name0 = v === 'taken' ? 'dodge' : 'tidepool';

  const isBrief = s => s.length > 280 || /\n/.test(s.trim());
  const words = s => (s.trim().match(/\S+/g) || []).length;
  const hint = s => !s.trim() ? 'One line is enough. Paste a whole brief if you have one.'
    : isBrief(s) ? `<b>Reads as your brief draft</b> · ${words(s)} words. The lead starts from it, in full, instead of a blank page.`
    : 'The lead turns this into a charter for you to approve.';

  const choice = (name, val, title, sub, on) => `<label class="choice is-two"><input type="radio" name="${name}" value="${val}"${on ? ' checked' : ''}><span><b>${title}</b><small>${sub}</small></span></label>`;
  const next = o => `
    <ol class="n-next">
      <li><b>Atelier makes the folder${o.repo ? ` and a private GitHub repo, <span class="num">${esc(o.name || 'tidepool')}</span>` : ''}.</b><span>A few seconds.</span></li>
      ${o.lead ? `<li><b>The lead reads your ${o.brief ? 'brief' : 'description'} and drafts a charter.</b><span>About ten minutes. You can watch it in the Office.</span></li>
      <li><b>You approve the charter in the Inbox.</b><span>Nothing else to do until then.</span></li>`
      : `<li><b>The project waits with the lead off.</b><span>Start the lead from the project page when you’re ready.</span></li>`}
    </ol>`;

  const form = `
    <form class="f-form n-form" novalidate data-form>
      <div class="field">
        <label class="field-label" for="n-name">Name</label>
        <input class="input n-name" id="n-name" name="name" value="${name0}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="n-name-help${v === 'taken' ? ' n-name-err' : ''}"${v === 'taken' ? ' aria-invalid="true"' : ''}>
        ${v === 'taken' ? '<span class="field-error" id="n-name-err">' + I('alert') + '<span>dodge already exists. Pick another name.</span></span>' : ''}
        <span class="field-help" id="n-name-help">Lowercase letters, numbers and dashes. Used for the folder and the GitHub repo.</span>
      </div>
      <div class="field n-desc${isBrief(desc0) ? ' is-brief' : ''}" data-desc>
        <label class="field-label" for="n-desc">What it is <span class="faint">(one line, or paste a whole brief)</span></label>
        <textarea class="input" id="n-desc" name="desc" rows="2" aria-describedby="n-desc-hint" placeholder="A tide-times app for the three beaches near home…">${esc(desc0)}</textarea>
        <span class="field-help n-hint" id="n-desc-hint" aria-live="polite">${I('plan')}<span>${hint(desc0)}</span></span>
      </div>
      <fieldset class="f-sec"><legend>Team</legend>
        <div class="f-row3">
          ${choice('team', 'pair', 'Pair', 'A lead and one builder. For small things.')}
          ${choice('team', 'team', 'Team', 'Lead, designer, builders, reviewer, auditor.', true)}
          ${choice('team', 'game', 'Game', 'A team with a game designer.')}
        </div>
      </fieldset>
      <fieldset class="f-sec"><legend>Shipping</legend>
        <div class="f-row2">
          ${choice('ship', 'pr', 'Draft pull requests', 'You merge each one.', true)}
          ${choice('ship', 'main', 'Straight to main', 'Reviewed work lands by itself.')}
        </div>
      </fieldset>
      <div class="f-checks">
        <label class="f-check"><input type="checkbox" name="repo" checked><span>Make a private GitHub repo<small data-repo-name>${esc(name0)}, on your account</small></span></label>
        <label class="f-check"><input type="checkbox" name="lead" checked><span>Start the lead now<small>It drafts the charter first; you approve it in the Inbox.</small></span></label>
      </div>
      <div class="n-fail" data-fail hidden role="alert">${I('alert')}<span><b>Couldn’t create tidepool.</b> Atelier didn’t answer, so nothing was made. Try again.</span></div>
      <div class="f-actions"><button class="btn btn-primary" type="submit" data-create${v === 'busy' ? ' aria-busy="true" disabled' : ''}>${v === 'busy' ? 'Creating…' : 'Create project'}</button><a class="btn btn-ghost" href="${keep('projects.html')}">Cancel</a></div>
    </form>`;
  const aside = `<aside class="n-aside" aria-labelledby="n-next-h"><h2 class="section-label" id="n-next-h">What happens next</h2><div data-next>${next({ repo: true, lead: true, name: name0, brief: isBrief(desc0) })}</div></aside>`;

  mount({
    cur: 'new', title: 'New project', ux: ['UX-12'],
    head: `<a class="back" href="${keep('projects.html')}">${I('chevron-left')}<span>Projects</span></a><h1>New project</h1>`,
    body: `<div class="hf-body"><div class="n-grid">${form}${aside}</div></div>`,
    after,
  });

  function after() {
    const f = document.querySelector('[data-form]'), ta = f.desc, nm = f.name;
    const sync = () => {
      const s = ta.value;
      document.querySelector('[data-desc]').classList.toggle('is-brief', isBrief(s));
      document.querySelector('.n-hint > span').innerHTML = hint(s);
      document.querySelector('[data-repo-name]').textContent = `${nm.value || 'tidepool'}, on your account`;
      document.querySelector('[data-next]').innerHTML = next({ repo: f.repo.checked, lead: f.lead.checked, name: nm.value, brief: isBrief(s) });
    };
    f.addEventListener('input', sync); f.addEventListener('change', sync);
    const err = (msg) => {
      document.getElementById('n-name-err')?.remove();
      if (!msg) { nm.removeAttribute('aria-invalid'); nm.setAttribute('aria-describedby', 'n-name-help'); return true; }
      nm.setAttribute('aria-invalid', 'true'); nm.setAttribute('aria-describedby', 'n-name-help n-name-err');
      nm.insertAdjacentHTML('afterend', `<span class="field-error" id="n-name-err">${I('alert')}<span>${msg}</span></span>`);
      return false;
    };
    const check = () => { const s = nm.value.trim(); return err(!s ? 'Give it a name.' : !/^[a-z0-9][a-z0-9-]*$/.test(s) ? 'Use lowercase letters, numbers and dashes.' : ['replay', 'atelier-ui', 'dodge'].includes(s) ? `${esc(s)} already exists. Pick another name.` : ''); };
    nm.addEventListener('blur', () => { if (nm.value || nm.hasAttribute('aria-invalid')) check(); });
    let failed = false;
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (!check()) { nm.focus(); return; }
      const b = f.querySelector('[data-create]');
      b.setAttribute('aria-busy', 'true'); b.disabled = true; b.textContent = 'Creating…';
      setTimeout(() => {
        if (v === 'fail' && !failed) { failed = true; b.removeAttribute('aria-busy'); b.disabled = false; b.textContent = 'Try again'; const x = f.querySelector('[data-fail]'); x.hidden = false; return; }
        location.href = keep(`project.html?p=tidepool`);
      }, 900);
    });
    /* ?v=fail&shot: draw the failed state at once (the shot can't wait for the click) */
    if (v === 'fail' && q.has('shot')) { failed = true; f.querySelector('[data-create]').textContent = 'Try again'; f.querySelector('[data-fail]').hidden = false; }
  }
})();
