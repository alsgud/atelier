/* Task page (UX-4 A: a full page with its own address; UX-5 A: stage, latest step, last active). Data from
   ATELIER_MODEL.TASKS[t]; counts from the one summary. ?t=trim (default: replay's builder, working, between tries) ·
   audit (atelier-ui's auditor: the stuck signal, no proof yet) · draw (atelier-ui's designer). States of the trim task:
   ?v=needs (it asked a question: the question, an answer box and the dock) · plan (waits for your OK) · done (passed review).
   ?ui=stop (confirm) · ui=proof (the proof viewer open) · demo (live: a new step arrives, last active ticks). */
(() => {
  const { M, q, state, known, esc, I, dot, keep, pHref, live, loadError, mount, tick } = window.HF;
  const tid = M.TASKS[q.get('t')] ? q.get('t') : 'trim';
  const T = JSON.parse(JSON.stringify(M.TASKS[tid]));
  const v = tid === 'trim' ? q.get('v') : null;
  const STAGES = ['Planning', 'Building', 'Checking', 'Review', 'Done'];
  const img = f => (f.startsWith('../') ? f : `../screens/img/${f}`);

  /* The trim task in its other states (same task, same figures; only what the state changes) */
  if (v === 'needs') Object.assign(T, {
    k: 'needs', word: 'Needs you', step: 'Asked you how a cut should snap', ago: '6 min ago',
    why: 'It stopped before choosing, because either answer changes how a trim feels. Nothing else on replay waits for this.',
    ask: { q: 'When you trim, should the cut snap to the nearest sound frame? The sound then never drifts, but a cut can move by up to 20 ms from where you let go.', who: 'Builder, second try of Trim clips on the timeline', a: ['Yes, snap to the sound', 'No, keep the exact frame I chose'] },
    steps: [['14:03', 'Asked you how a cut should snap'], ...T.steps.slice(1)], decisions: T.decisions.slice(1) });
  if (v === 'plan') Object.assign(T, {
    k: '', word: 'Waiting for your OK', stage: 0, step: 'Planned, and waits for your OK to start', ago: '20 min ago', into: '', started: '',
    why: 'Up to 5 tries, about $10. It owns the timeline and the trim handles. Approve it here or in the Inbox.',
    tries: ['', '', '', '', ''], spend: ['$0.00', '$10', 0], files: 0, pr: '', proof: [], proofAt: '', log: [],
    steps: [['13:05', 'The lead planned it from the spec']], outs: T.outs.map(o => [false, o[1], 'Not started']), check: [T.check[0], 'Not run yet'],
    review: 'Not started.', decisions: [], notes: [], history: [['13:05', 'Planned by the lead · waits for your OK']] });
  if (v === 'done') Object.assign(T, {
    k: 'done', word: 'Done', stage: 4, step: 'Passed review; its pull request is ready for you to merge', ago: '2 min ago', into: '',
    why: 'The reviewer watched the recording and checked that the sound stays in sync. replay ships draft pull requests, so it reaches the app when you merge #14.',
    tries: ['f', 'p', '', '', ''], spend: ['$8.90', '$10', 89], pr: 'Draft #14 · ready to merge', tests: 'player.spec.ts',
    steps: [['14:05', 'Passed review; the pull request is ready to merge'], ['14:03', 'Showed its work: 2 screenshots and a recording'], ['14:02', 'The check passed: drift 2 ms'], ...T.steps.slice(0, 1)],
    proofAt: 'From the second try · 14:03', proofNote: 'The handles trim to the exact frame and the recording shows the sound in sync after five trims in a row.',
    log: ['✓ 38 tests passed', '✓ trim.spec.ts › keeps the sound in sync after a trim (drift 2 ms)', 'npm test exited with 0'],
    outs: T.outs.map(o => [true, o[1], 'Met 14:05 · review passed']), check: [T.check[0], 'Last run 14:02: 38 of 38 passed'],
    review: { by: 'Reviewer · 14:05', verdict: 'Passed', lines: ['A trim lands on the exact frame', 'The sound stays in sync after five trims (2 ms)', 'The handles are 44 px on a phone'] },
    history: [...T.history, ['14:02', 'The check passed'], ['14:03', 'Showed its work: 2 screenshots and a recording'], ['14:05', 'Review passed · pull request ready to merge']] });

  const running = T.k === 'active' || T.k === 'needs';
  const hasDock = v === 'needs' || v === 'plan';

  /* ── The small parts ── */
  const stageTrack = () => {
    const f = T.prog ? Math.round(100 * T.prog[0] / T.prog[1]) : 100;
    return `<ol class="p-phases t-stages" data-k="${T.k}" aria-label="Stage: ${STAGES[T.stage]}${T.prog ? `, ${T.prog[0]} of ${T.prog[1]} ${T.prog[2]}` : ''}">
      ${STAGES.map((n, i) => `<li class="${i < T.stage || (T.k === 'done' && i === T.stage) ? 'past' : i === T.stage ? 'now' : ''}"${i === T.stage ? ' aria-current="step"' : ''}>
        <span class="bar">${i === T.stage && T.k !== 'done' ? `<span class="fill" style="--f:${f}%"></span>` : ''}</span><span class="n">${n}</span></li>`).join('')}
    </ol>`;
  };
  /* Last active: the live dot while working; the stuck signal is neutral words, never red (§5) */
  const pulse = () => T.quiet
    ? `<p class="t-pulse is-quiet" data-pulse>${I('refresh')}<span>${esc(T.quiet)}</span></p>`
    : T.k === 'done' || !T.ago ? '' : `<p class="t-pulse" data-pulse>${T.k === 'active' ? dot('active', 'Working', true) : ''}<span>Last active <b class="num" data-ago>${esc(T.ago)}</b>${T.into ? ` · ${esc(T.into)}` : ''}</span></p>`;
  const tries = () => `<ol class="t-tries" aria-label="${T.tries.filter(Boolean).length} of ${T.tries.length} tries used">${T.tries.map((t, i) => `<li data-t="${t}" title="Try ${i + 1}${{ f: ': failed the check', p: ': passed', n: ': now' }[t] || ''}"></li>`).join('')}</ol>`;
  const figs = () => `<p class="p-figs num">
      ${T.prog ? `<span><b>${T.prog[0]}</b> of ${T.prog[1]} ${T.prog[2]}</span>` : ''}
      ${T.tries.length > 1 ? `<span>Try <b>${Math.max(1, T.tries.filter(Boolean).length)}</b> of ${T.tries.length}</span>` : ''}
      <span><b>${T.outs.filter(o => o[0]).length}</b> of ${T.outs.length} outcomes met</span>
      <span><b>${T.spend[0]}</b> of ${T.spend[1]}</span>
    </p>`;

  /* ── Now (R17): the latest step is the headline; why and what next under it; then the stage track ── */
  const now = () => `
    <section class="p-now t-now" aria-labelledby="now-h">
      <h2 class="section-label" id="now-h">${esc(T.role)} · ${T.k === 'done' ? 'finished ' + esc(T.ago) : 'now'}</h2>
      <p class="p-now-t" data-step>${esc(T.step)}.</p>
      <p class="lede">${esc(T.why)}</p>
      ${pulse()}
      ${stageTrack()}
      ${figs()}
    </section>`;

  /* It needs you: the question itself, suggested answers, then the dock (the same as the Inbox's) */
  const ask = () => !T.ask ? '' : `
    <section class="p-sec t-ask" aria-labelledby="ask-h">
      <h2 class="p-h" id="ask-h">${dot('needs', 'Needs you')}Its question</h2>
      <blockquote class="quote">${esc(T.ask.q)}<footer>${esc(T.ask.who)} · ${esc(T.ago)}</footer></blockquote>
      <fieldset class="choices"><legend class="section-label">Suggested answers</legend>
        ${T.ask.a.map(a => `<label class="choice"><input type="radio" name="ans" value="${esc(a)}"> ${esc(a)}</label>`).join('')}
      </fieldset>
    </section>`;
  const dock = () => !hasDock ? '' : v === 'needs' ? `
    <form class="dock t-dock" aria-label="Answer the builder" data-dock>
      <label class="sr-only" for="ans-own">Or write your own answer</label>
      <textarea class="input" id="ans-own" rows="1" placeholder="Or write your own answer"></textarea>
      <div class="dock-row"><span class="dock-msg" data-msg hidden></span><span class="spacer"></span>
        <button class="btn btn-primary" type="submit" data-go>Send answer</button></div>
    </form>` : `
    <form class="dock t-dock" aria-label="Approve the plan" data-dock>
      <div class="dock-row"><span class="dock-msg" data-msg>Up to 5 tries · about $10</span><span class="spacer"></span>
        <button class="btn btn-primary" type="submit" data-go>Approve plan</button></div>
    </form>`;

  /* ── Proof (R18): pictures first, large; the recording with its length; the run log under it ── */
  const proof = () => `
    <section class="p-sec t-proof" aria-labelledby="proof-h">
      <h2 class="p-h" id="proof-h">Shown working ${T.proofAt ? `<span class="n">${esc(T.proofAt)}</span>` : ''}</h2>
      ${T.proof.length ? `
        <p class="t-note">${esc(T.proofNote)}</p>
        <div class="frames ${T.proof.length > 2 ? 'is-hero' : 't-two'}">${T.proof.map(([f, cap, kind, len], i) => `
          <button class="frame${kind === 'phone' ? ' is-phone' : ''}" type="button" data-shot="${i}" aria-label="${esc(cap)}${kind === 'rec' ? `, recording ${len}` : ''}. Open large">
            <span class="frame-img"><img src="${img(f)}" alt="">${kind === 'rec' ? `<span class="play">${I('play')}${len}</span>` : ''}</span>
            <span class="frame-cap"><b>${esc(cap)}</b><span>${kind === 'rec' ? 'Recording' : kind === 'phone' ? 'Phone' : 'Screenshot'}</span></span>
          </button>`).join('')}
        </div>
        <details class="details t-log"><summary>${I('log')}Run log · last ${T.log.length} lines${I('chevron-down')}</summary><div class="details-body"><pre>${T.log.map(l => `<span${l.startsWith('✗') ? ' class="bad"' : l.startsWith('✓') ? ' class="ok"' : ''}>${esc(l)}</span>`).join('\n')}</pre></div></details>`
      : `<p class="p-quiet">${T.k === 'active' ? `Nothing shown yet. The ${T.role.toLowerCase()} shows its work when this step is done.` : 'Nothing shown yet. Screenshots and recordings appear here once it starts.'}</p>`}
    </section>`;

  const review = () => `
    <section class="p-sec" aria-labelledby="rev-h">
      <h2 class="p-h" id="rev-h">Review</h2>
      ${typeof T.review === 'string' ? `<p class="p-quiet">${esc(T.review)}</p>` : `
        <div class="t-review"><p><span class="t-verdict">${I('check')}${esc(T.review.verdict)}</span><span class="p-quiet">${esc(T.review.by)}</span></p>
        <ul class="p-outs">${T.review.lines.map(l => `<li data-met="true"><span class="p-ok" role="img" aria-label="Passed">${I('check')}</span><span class="t"><b>${esc(l)}</b></span></li>`).join('')}</ul></div>`}
    </section>`;

  const steps = () => `
    <section class="p-sec" aria-labelledby="steps-h">
      <h2 class="p-h" id="steps-h">Latest steps</h2>
      <ol class="p-feed" data-steps>${T.steps.map(stepRow).join('')}</ol>
    </section>`;
  const stepRow = ([t, w], i) => `<li${i === 0 ? ' data-k="done"' : ''}><time class="num">${esc(t)}</time><span>${esc(w)}</span></li>`;

  /* History and notes (R19): folded; each says how much is inside */
  const folds = () => `
    <section class="p-sec t-folds" aria-label="History and notes">
      <details class="details"><summary>History · ${T.history.length} events${I('chevron-down')}</summary><div class="details-body"><ol class="p-feed">${[...T.history].reverse().map(([t, w]) => `<li><time class="num">${esc(t)}</time><span>${esc(w)}</span></li>`).join('')}</ol></div></details>
      ${T.notes.length ? `<details class="details"><summary>Progress notes · ${T.notes.length}${I('chevron-down')}</summary><div class="details-body"><ol class="p-feed">${T.notes.map(([t, w]) => `<li><time class="num">${esc(t)}</time><span>${esc(w)}</span></li>`).join('')}</ol></div></details>` : ''}
      <details class="details"><summary>Decided without you · ${T.decisions.length || 'none'}${I('chevron-down')}</summary><div class="details-body">${T.decisions.length ? `<dl class="p-dl is-stack">${T.decisions.map(([d, w]) => `<dt>${esc(d)}</dt><dd>${esc(w)}</dd>`).join('')}</dl>` : '<span>Nothing so far.</span>'}</div></details>
      <details class="details"><summary>The brief${I('chevron-down')}</summary><div class="details-body"><p>${esc(T.brief)}</p></div></details>
      <details class="details"><summary>Last check${I('chevron-down')}</summary><div class="details-body"><p><code>${esc(T.check[0])}</code> · ${esc(T.check[1])}</p></div></details>
    </section>`;

  /* ── Facts (side panel): status and reason, tries, spend of its budget, outcomes, check, files, tests, pull request ── */
  const facts = () => `
    <aside class="p-facts" aria-label="Facts">
      <details class="p-factsfold" data-facts>
        <summary><span>Facts</span><span class="num">${T.tries.length > 1 ? `Try ${Math.max(1, T.tries.filter(Boolean).length)} of ${T.tries.length} · ` : ''}${T.spend[0]} of ${T.spend[1]}</span>${I('chevron-down')}</summary>
        <div class="p-facts-in">
          <section class="p-fact" aria-labelledby="f-st">
            <h3 class="section-label" id="f-st">Status</h3>
            <p class="t-st" data-k="${T.k}">${dot(T.k === 'active' || T.k === 'needs' || T.k === 'done' ? T.k : '', T.word, true)}<b>${esc(T.word)}</b></p>
            <dl class="p-dl"><dt>ID</dt><dd class="num">${{ trim: 'r4k2', audit: 'u7m1', draw: 'pjv7' }[tid] || 'r4k2'}</dd><dt>Who</dt><dd>${esc(T.role)}</dd>${T.started ? `<dt>Started</dt><dd>${esc(T.started)}</dd>` : ''}<dt>Project</dt><dd><a class="link" href="${keep(pHref(T.p))}">${esc(T.p)}</a></dd></dl>
          </section>
          <section class="p-fact" aria-labelledby="f-try">
            <h3 class="section-label" id="f-try">${T.tries.length > 1 ? 'Tries' : 'Run'}</h3>
            ${T.tries.length > 1 ? `<div class="t-tryrow">${tries()}<span class="num">${T.tries.filter(Boolean).length} of ${T.tries.length}</span></div>
            <p class="p-quiet">${T.tries.includes('f') ? 'Try 1 failed the check; ' : ''}${T.tries.includes('p') ? 'try 2 passed.' : T.tries.includes('n') ? 'each new try starts from what the last one learned.' : 'It may use up to five.'}</p>` : `<p class="p-quiet">One run, ${T.prog ? `${T.prog[0]} of ${T.prog[1]} ${T.prog[2]} done` : 'starting'}.</p>`}
            <div class="meter"><div class="meter-head"><span>Spent on this task</span><b>${T.spend[0]} <small>of ${T.spend[1]}</small></b></div><div class="meter-track"><i style="--value:${T.spend[2]}%"></i></div><span class="meter-foot">Its own budget · part of ${esc(T.p)}’s day</span></div>
          </section>
          <section class="p-fact" aria-labelledby="f-out">
            <h3 class="section-label" id="f-out">Outcomes · ${T.outs.filter(o => o[0]).length} of ${T.outs.length}</h3>
            <ul class="p-outs t-outs">${T.outs.map(([m, t, s]) => `<li data-met="${m}">${m ? `<span class="p-ok" role="img" aria-label="Met">${I('check')}</span>` : '<span class="p-ok" role="img" aria-label="Not met yet"></span>'}<span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span></li>`).join('')}</ul>
          </section>
          <section class="p-fact" aria-labelledby="f-code">
            <h3 class="section-label" id="f-code">The work</h3>
            <dl class="p-dl">
              <dt>Check</dt><dd>${esc(T.check[1])}</dd>
              ${T.files ? `<dt>Files</dt><dd>${T.files} it owns</dd>` : ''}
              ${T.tests ? `<dt class="is-needs">Tests</dt><dd class="is-needs">Changed an existing test: <code>${esc(T.tests)}</code>. Look before you merge</dd>` : T.files ? '<dt>Tests</dt><dd>Didn’t change existing tests</dd>' : ''}
              ${T.pr ? `<dt>Pull request</dt><dd><a class="link" href="#" data-ext>${esc(T.pr)}${I('external')}</a></dd>` : ''}
            </dl>
          </section>
        </div>
      </details>
    </aside>`;

  /* ── States ── */
  const skeleton = () => `<div class="p-grid" aria-busy="true" aria-label="Loading the task">
      <section class="p-now"><span class="skeleton" style="width:96px;height:12px"></span><span class="skeleton" style="width:80%;height:28px"></span><span class="skeleton" style="width:95%;height:16px"></span><span class="skeleton" style="width:100%;height:28px;margin-top:8px"></span></section>
      <aside class="p-facts"><div class="p-facts-in p-skel"><span class="skeleton" style="height:96px"></span><span class="skeleton" style="height:120px"></span></div></aside>
      <div class="p-col"><section class="p-sec"><span class="skeleton" style="width:140px;height:16px"></span><div class="frames t-two"><span class="skeleton" style="aspect-ratio:16/10"></span><span class="skeleton" style="aspect-ratio:16/10"></span></div></section></div></div>`;

  const page = () => `<div class="p-grid t-grid${state === 'stale' ? ' is-stale' : ''}${hasDock ? ' has-dock' : ''}">${now()}${facts()}<div class="p-col">${ask()}${dock()}${proof()}${steps()}${review()}${folds()}</div></div>`;
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError('This task') : page();

  /* Head: back to the project, the title, its status, and the one task action (R20): Stop while it runs or waits; Approve plan while it waits for your OK */
  const act = state === 'loading' || state === 'error' ? ''
    : v === 'plan' ? `<button class="btn btn-secondary" type="button" data-stop>Stop it</button>`
    : running ? `<button class="btn btn-secondary" type="button" data-stop>${I('x')}Stop task…</button>` : '';
  const status = state === 'loading' || state === 'error' ? '' : `<span class="p-lead t-status" data-k="${T.k}">${dot(['active', 'needs', 'done'].includes(T.k) ? T.k : '', T.word, true)}<span>${esc(T.word)}</span></span>`;

  const dialog = `<dialog class="p-dialog" aria-labelledby="dlg-t" aria-describedby="dlg-d">
      <h2 id="dlg-t">Stop “${esc(T.title)}”?</h2>
      <p id="dlg-d">${v === 'plan' ? 'The plan is dropped and nothing starts. The lead can plan it again later.' : `The ${T.role.toLowerCase()} stops now and this try’s work is kept as it is. The lead decides what happens next.`}</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Keep it running</button><button class="btn btn-danger" type="button" value="stop">Stop the task</button></div>
    </dialog>`;
  /* The proof viewer: one picture large, its caption, previous / next, open full size from the view port */
  const viewer = `<dialog class="t-lb" aria-labelledby="lb-cap">
      <div class="t-lb-bar"><span id="lb-cap" class="t-lb-cap"></span><span class="t-lb-n num" data-n></span>
        <a class="btn btn-ghost btn-sm" href="#" target="_blank" rel="noopener" data-full>${I('external')}Full size</a>
        <button class="btn btn-ghost btn-icon" type="button" data-close aria-label="Close" autofocus>${I('x')}</button></div>
      <figure class="t-lb-fig"><span class="t-lb-media"><span class="play" data-play hidden>${I('play')}<span></span></span></span></figure>
      <button class="btn btn-secondary btn-icon t-lb-prev" type="button" data-prev aria-label="Previous picture">${I('chevron-left')}</button>
      <button class="btn btn-secondary btn-icon t-lb-next" type="button" data-next aria-label="Next picture">${I('chevron-right')}</button>
    </dialog>`;

  mount({
    cur: T.p, title: T.title, ux: ['UX-4', 'UX-5', 'UX-10'],
    head: `<a class="back" href="${keep(pHref(T.p))}">${I('chevron-left')}<span>${esc(T.p)}</span></a><h1>${esc(T.title)}</h1>${status}${act}<span class="end">${live()}</span>`,
    body: `<div class="hf-body">${body}</div>${dialog}${viewer}`,
    after,
  });

  function toast(text, undo) {
    const box = document.querySelector('.toasts');
    box.innerHTML = `<div class="toast toast-success" role="status">${I('check')}<span class="toast-text">${esc(text)}</span>${undo ? '<button class="toast-action" type="button" data-undo>Undo</button>' : ''}</div>`;
    place();
    clearTimeout(toast.t); toast.t = setTimeout(() => { box.innerHTML = ''; }, 6000);
  }
  /* With a dock on screen the toast anchors above it (components.css › Toast), so it never covers a dock button */
  function place() {
    const box = document.querySelector('.toasts'), d = document.querySelector('[data-dock]');
    if (!d) { box.removeAttribute('data-anchor'); return; }
    const r = d.getBoundingClientRect(), h = 52, gap = 8;
    box.dataset.anchor = '';
    box.style.setProperty('--toast-x', `${r.left + r.width / 2}px`);
    box.style.setProperty('--toast-w', `${r.width}px`);
    box.style.setProperty('--toast-top', `${r.top - h - gap > 60 ? r.top - h - gap : r.bottom + gap}px`);
  }

  function after() {
    const f = document.querySelector('[data-facts]');
    if (f) { f.open = innerWidth >= 768; addEventListener('resize', () => { if (innerWidth >= 768) f.open = true; }); }
    addEventListener('scroll', () => { if (document.querySelector('.toast')) place(); }, { passive: true });
    addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.toast') && !document.querySelector('dialog[open]')) document.querySelector('.toasts').innerHTML = ''; });

    /* Stop asks first (UX-10: it can't be undone) */
    const dlg = document.querySelector('.p-dialog'), stop = document.querySelector('[data-stop]');
    stop?.addEventListener('click', () => dlg.showModal());
    dlg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { dlg.close(); if (b.value === 'stop') { stop.setAttribute('aria-busy', 'true'); stop.textContent = 'Stopping…'; } else stop.focus(); }));

    /* The dock: answer or approve, instant with Undo (UX-10) */
    const form = document.querySelector('[data-dock]');
    form?.addEventListener('submit', e => {
      e.preventDefault();
      const own = form.querySelector('textarea'), pick = document.querySelector('input[name="ans"]:checked'), msg = form.querySelector('[data-msg]');
      if (v === 'needs' && !pick && !own.value.trim()) { msg.hidden = false; msg.className = 'dock-msg is-error'; msg.textContent = 'Pick an answer or write your own.'; own.setAttribute('aria-invalid', 'true'); own.focus(); return; }
      const go = form.querySelector('[data-go]');
      go.setAttribute('aria-busy', 'true'); go.textContent = v === 'needs' ? 'Sending…' : 'Approving…';
      setTimeout(() => {
        form.classList.add('is-sent'); go.removeAttribute('aria-busy'); go.hidden = true;
        msg.hidden = false; msg.className = 'dock-msg is-done'; msg.innerHTML = `${I('check')}${v === 'needs' ? 'Answered. The builder carries on.' : 'Approved. The builder starts within a minute.'}`;
        own?.setAttribute('disabled', '');
        toast(v === 'needs' ? 'Answered the builder.' : 'Approved the plan.', true);
        document.querySelector('[data-undo]')?.addEventListener('click', () => location.reload());
      }, 500);
    });

    /* Proof viewer */
    const lb = document.querySelector('.t-lb'), shots = T.proof;
    let at = 0, opener = null;
    const show = i => {
      at = (i + shots.length) % shots.length;
      const [file, cap, kind, len] = shots[at];
      if (!lb.querySelector("img")) lb.querySelector(".t-lb-media").insertAdjacentHTML("afterbegin", "<img alt=\"\">"); /* made on first open: an empty img would count as broken */
      lb.querySelector("img").src = img(file); lb.querySelector("img").alt = cap;
      lb.querySelector('[data-full]').href = img(file); /* the real page links to the view port (/evidence/…, port + 1), in a new tab */
      lb.querySelector('.t-lb-cap').textContent = cap;
      lb.querySelector('[data-n]').textContent = `${at + 1} of ${shots.length}`;
      lb.classList.toggle('is-phone', kind === 'phone');
      const play = lb.querySelector('[data-play]'); play.hidden = kind !== 'rec'; play.lastElementChild.textContent = len || '';
      lb.querySelectorAll('[data-prev],[data-next]').forEach(b => { b.hidden = shots.length < 2; });
    };
    document.querySelectorAll('[data-shot]').forEach(b => b.addEventListener('click', () => { opener = b; show(+b.dataset.shot); lb.showModal(); }));
    lb.querySelector('[data-close]').addEventListener('click', () => lb.close());
    lb.querySelector('[data-prev]').addEventListener('click', () => show(at - 1));
    lb.querySelector('[data-next]').addEventListener('click', () => show(at + 1));
    lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', () => opener?.focus());

    if (q.get('ui') === 'stop' && stop) dlg.showModal();
    if (q.get('ui') === 'proof' && shots.length) { show(+(q.get('n') || 0)); lb.showModal(); }
    if (q.get('ui') === 'toast' && form) { const a = document.querySelector('input[name="ans"]'); if (a) a.checked = true; form.requestSubmit(); }
    if (q.has('demo') && tid === 'trim' && !v && state !== 'stale') demo(q.get('demo') === 'loop');
  }

  /* ── Live refresh, in place (R7): a new step arrives, last active resets, then ticks ── */
  function demo(loop) {
    const S = (ms, fn) => setTimeout(fn, ms);
    const step = (t, w) => {
      const h = document.querySelector('[data-step]'); h.classList.remove('is-entering'); void h.offsetWidth; h.textContent = w + '.'; h.classList.add('is-entering');
      const ol = document.querySelector('[data-steps]'); ol.querySelector('[data-k]')?.removeAttribute('data-k');
      ol.insertAdjacentHTML('afterbegin', stepRow([t, w], 0)); ol.firstElementChild.classList.add('is-entering');
      tick(document.querySelector('[data-ago]'), 'just now');
    };
    S(2600, () => step('14:03', 'Giving the trim handles keyboard steps'));
    S(6000, () => tick(document.querySelector('[data-ago]'), '1 min ago'));
    S(8200, () => step('14:05', 'Running the check on its second try'));
    if (loop) S(12000, () => location.reload());
  }
})();
