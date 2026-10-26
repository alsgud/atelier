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
  /* GitHub status (inventory: header). Quiet when fine (a fact); ?gh=off draws the problem in the head, with its reason in the facts */
  const GH = q.get('gh') === 'off' ? 'the sign-in on this PC expired, so pushes fail. Atelier tries again every 10 minutes.' : '';
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
            <dl class="p-dl is-stack">${P.facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}<dt>In the Claude app</dt><dd>“${esc(P.app)}”</dd><dt>GitHub</dt><dd>${GH ? `<span class="is-needs">Not on GitHub</span>: ${GH}` : 'On GitHub'}</dd></dl>
            <a class="link p-more" href="${keep(`settings.html?p=${id}`)}">Change in Settings</a>
          </section>
        </div>
      </details>
    </aside>`;
  };
  const teamRow = ([r, k, w]) => `<li data-role="${r}">${dot(k === 'off' ? '' : k, w, true)}<b>${r}</b><span class="w${k && k !== 'off' ? ' is-' + k : ''}">${w}</span></li>`;

  /* ── The other sections (R15), each a plain list. Every inventory line of today's Tasks, Criteria, Audits and Docs
     tabs has its place here (review, iteration 7). ── */
  /* Tasks: grouped by status in the inventory's order; a group with nothing in it is left out, and the line under the
     heading says so, so an absent group never reads as a missing feature */
  const TASK_GROUPS = [
    ['Working', 'active', [['Trim clips on the timeline', 'Builder · Building · 12 of 14 checks', 'f n', 'about 20 min left', '1 min ago', 'r4k2']]],
    ['Queued', '', [['Share a clip as a link', 'Starts when today’s budget allows', '', '', '', 'r5w8']]],
    ['Done', 'done', [
      ['The clip list scrolls smoothly', 'Reviewed · Draft #12 ready to merge', 'p', '', '11:05', 'r3n6'],
      ['Import from the phone’s camera roll', 'Reviewed · merged', 'f f p', '', 'Mon', 'r2c9'],
      ['Play, pause and seek from the keyboard', 'Reviewed · merged', 'p', '', 'Mon', 'r2h4']]],
    ['Cancelled', '', [['A waveform under the timeline', 'Stopped by you: “not for the first version”', 'f', '', 'Sun', 'r3x1']]],
  ];
  const TRY_WORD = { f: 'failed the check', p: 'passed', n: 'now' };
  const triesDots = s => { const t = s ? s.split(' ') : []; return !t.length ? '' : `<ol class="t-tries" aria-label="${t.filter(x => x !== 'n').length} ${t.length === 1 ? 'try' : 'tries'} so far">${t.map((x, i) => `<li data-t="${x}" title="Try ${i + 1}: ${TRY_WORD[x]}"></li>`).join('')}</ol>`; };
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
  /* Team checks: the agents' own tests behind the outcomes; folded, because the owner judges by outcomes (inventory: "folded away") */
  const CHECKS = [
    [false, 'Audio and video stay within one frame after a trim', 'Failing on try 1 · the builder is on it'],
    [false, 'Trim handles take focus with Tab', 'Failing · from Monday’s audit'],
    [false, 'Share link opens in a browser with no app', 'Not written yet'],
    [true, 'Scrolling 500 clips keeps 60 fps on a mid phone', 'Passing since 11:05'],
    [true, 'Every page fits 390 px with no sideways scroll', 'Passing since Sun'],
  ];
  const AUD = q.get('audit') === 'running';
  const FINDINGS = [
    ['call', 'The trim handles can’t be reached by keyboard', 'Accessibility · important · costly to change later',
      'Someone who can’t use a mouse can play a clip but can’t trim it, so the main job of the app is out of reach for them.', '',
      'The handles are <code>div</code>s with pointer listeners only; no <code>tabindex</code>, no key handling. WCAG 2.1.1.'],
    ['fixing', 'The seek bar’s thumb is 28 px on a phone', 'Accessibility · found Mon',
      'Easy to miss with a thumb, so people scrub to the wrong moment.', 'Yes, fix it: “make it 44 like the trim handles”',
      'Thumb 28 × 28 at 390 px; WCAG 2.5.8 asks 24 minimum, our own rule 44.'],
    ['settled', 'The export button’s text is 4.1 : 1 in light mode', 'Accessibility · fixed Mon',
      'Hard to read in sunlight.', 'Yes, fix it', 'Now 5.2 : 1 (#5b5b66 on #f7f7f8).'],
    ['settled', 'Long clip names are cut off at 320 px', 'Layout · settled Sun',
      'A name longer than 30 letters ends in “…” on the smallest phones.', 'No, it’s fine: “names from the camera roll are short”', 'Ellipsis at 320 px; full name in the clip’s title.'],
  ];
  const FIND_GROUP = [['call', 'Your call'], ['fixing', 'Being fixed'], ['settled', 'Settled']];
  const findingFold = ([k, t, s, impact, note, tech], i) => `
    <details class="details p-doc p-find" data-k="${k}"${k === 'call' && q.get('open') === 'finding' ? ' open' : ''}><summary><span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span>${I('chevron-down')}</summary>
      <div class="details-body">
        <p><span class="p-lbl">If nobody fixes it</span>${esc(impact)}</p>
        ${note ? `<p><span class="p-lbl">Your call</span>${esc(note)}</p>` : ''}
        <details class="details p-tech"><summary>${I('chevron-down')}Technical details</summary><div class="details-body"><span>${tech}</span></div></details>
        ${k === 'call' ? `<div class="field"><label class="field-label" for="fn-${i}">Note <span class="faint">(optional)</span></label><textarea class="input" id="fn-${i}" rows="2" placeholder="Why, in a few words"></textarea></div>
          <div class="p-act"><button class="btn btn-primary" type="button" data-find="confirm">Yes, fix it</button><button class="btn btn-secondary" type="button" data-find="dismiss">No, it’s fine</button></div>` : ''}
      </div></details>`;
  const auditRun = () => `<div class="p-audit" role="status" aria-label="Audit running"${AUD ? '' : ' hidden'} data-audit-run>
      <span class="p-win" data-k="active" aria-hidden="true"><svg viewBox="0 0 12 16"><path d="M1 15V6a5 5 0 0 1 10 0v9z"/></svg></span>
      <span class="t"><b>Audit running · <span data-audit-min>${AUD ? '6 min' : 'just started'}</span></b><span class="s" data-audit-stage>${AUD ? 'Checking: 2 of 3 checkers done · accessibility, performance, layout' : 'Reading what’s been built · 3 checkers'}</span></span>
      <span class="p-stages" role="img" aria-label="${AUD ? 'Stage 2 of 3' : 'Stage 1 of 3'}"><i class="past"></i><i class="${AUD ? 'past' : 'now'}"></i><i class="${AUD ? 'now' : ''}"></i></span>
    </div>`;
  /* Docs: every document today's Docs tab has, in one list of folds; ?doc=charter|rulings|messages|… opens one */
  const CHARTER = 'A small video editor for clips from your phone: trim, keep the sound in sync, share as a link.\n\nFor people who film on their phone and want one good clip out of it in a minute, not an editing project.\n\nTaste: calm and quick, like a camera app. Dark, one accent. Nothing leaves the device unless you share it.\n\nOut of bounds: accounts, effects, music libraries.';
  const RULINGS = [
    ['R-1', 'Sharing is a link, never an upload to a feed.', '18 Oct · from the charter review'],
    ['R-2', 'The waveform waits until after the first version.', 'Sun · when you stopped the waveform task'],
  ];
  const MESSAGES = [
    ['Lead', 'Builder', 'question', 'Trim on the exact frame, or the nearest keyframe? The owner’s judgement item says exact.', '13:41'],
    ['Builder', 'Lead', 'discovery', 'The player reports time in seconds as a float; frames need the clip’s rate (30 or 60).', '13:44'],
    ['Auditor', 'Lead', 'discovery', 'Trim handles have no keyboard path; filed as a finding for the owner.', 'Mon'],
  ];
  const doc = (key, t, s, body) => `<details class="details p-doc" data-doc="${key}"${q.get('doc') === key ? ' open' : ''}><summary><span class="t"><b>${t}</b><span class="s"${key === 'charter' ? ' data-charter-s' : ''}>${s}</span></span>${I('chevron-down')}</summary><div class="details-body">${body}</div></details>`;
  const read = p => p.map(x => `<p>${esc(x)}</p>`).join('');
  const open = (href, t, more) => `<p class="p-meta">${more} · <a class="link" href="${href}" target="_blank" rel="noopener">${t}${I('external')}</a></p>`;
  const sectionBody = {
    tasks: () => `<section class="p-sec"><h2 class="p-h">Tasks <span class="n">${TASK_GROUPS.reduce((a, g) => a + g[2].length, 0)}</span></h2>
      <p class="p-quiet">Grouped by status. Nothing needs you, is in review, waits for your OK, is stalled, paused or failed right now, so those groups are hidden.</p></section>
      ${TASK_GROUPS.map(([g, k, rows]) => `<section class="p-sec"><h3 class="p-h3">${g} <span class="n">${rows.length}</span></h3><div class="p-rows">${rows.map(([t, s, tr, eta, a, tid]) => `
      <a class="p-row p-trow" href="${keep('task.html')}" aria-label="${esc(`${t}. ${g}. ${s}${eta ? ', ' + eta : ''}${a ? ', ' + a : ''}`)}">${dot(k, g, true)}<span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}${eta ? ` · <span class="p-eta">${eta}</span>` : ''}</span></span><span class="m num">${triesDots(tr)}<span class="p-id">${tid}</span>${a}</span></a>`).join('')}</div></section>`).join('')}`,
    outcomes: () => `<section class="p-sec"><h2 class="p-h">Outcomes <span class="n">${P.met} of ${P.of} met</span></h2><p class="p-quiet">What the project must do to be finished, in the charter’s words.</p><ul class="p-outs">${OUTCOMES.map(([m, t, s]) => `
      <li data-met="${m}">${m ? `<span class="p-ok" role="img" aria-label="Met">${I('check')}</span>` : '<span class="p-ok" role="img" aria-label="Not met yet"></span>'}<span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span></li>`).join('')}</ul>
      <details class="details p-doc"${q.get('open') === 'checks' ? ' open' : ''}><summary><span class="t"><b>Team checks</b><span class="s num">41 of 44 passing · the tests behind the outcomes</span></span>${I('chevron-down')}</summary><div class="details-body">
        <ul class="p-outs">${CHECKS.map(([m, t, s]) => `<li data-met="${m}">${m ? `<span class="p-ok" role="img" aria-label="Passing">${I('check')}</span>` : '<span class="p-ok" role="img" aria-label="Not passing"></span>'}<span class="t"><b>${esc(t)}</b><span class="s">${esc(s)}</span></span></li>`).join('')}</ul>
        <p class="p-quiet">And 39 more passing.</p></div></details></section>`,
    audits: () => `<section class="p-sec"><h2 class="p-h">Audits</h2>
      ${auditRun()}
      <p class="p-quiet" data-audit-last>Last audit Mon 15:10, on what was built by then. Audits start on their own after 3 more finished tasks (1 so far), or when you run one.</p>
      <div class="p-act"><button class="btn btn-secondary" type="button" data-audit${AUD ? ' disabled' : ''}>${I('finding')}Run an audit now…</button></div></section>
      ${FIND_GROUP.map(([k, g]) => { const f = FINDINGS.map((x, i) => [x, i]).filter(([x]) => x[0] === k); return `<section class="p-sec" data-group="${k}"><h3 class="p-h3">${g} <span class="n">${f.length}</span></h3><div class="p-docs">${f.map(([x, i]) => findingFold(x, i)).join('')}</div></section>`; }).join('')}
      <section class="p-sec"><h3 class="p-h3">Past audits</h3><ol class="p-feed"><li><time class="num">Mon 15:10</time><span>Accessibility: 12 checks, 3 findings · $3.20</span></li><li><time class="num">Sun 10:02</time><span>Layout and performance: 8 checks, 1 finding · $3.20</span></li></ol></section>`,
    docs: () => `<section class="p-sec"><h2 class="p-h">Documents</h2><div class="p-docs">
      ${doc('charter', 'Charter', 'Approved by you 18 Oct · unchanged since', `
        <form class="p-charter" data-charter>
          <div class="field"><label class="field-label" for="ch-text">The charter, in your words</label>
            <textarea class="input p-chtext" id="ch-text" rows="9" aria-describedby="ch-h">${esc(CHARTER)}</textarea>
            <span class="field-help" id="ch-h">The team works from this. A change after you approved it asks you to approve again.</span></div>
          <div class="p-act"><button class="btn btn-secondary" type="submit" data-ch-save disabled>Save changes</button></div>
        </form>
        <div class="p-approved" data-ch-ok><span class="p-lbl">You approved it 18 Oct</span><p>“Calm and quick is right. Ship the trim first.”</p></div>
        <form class="p-chapprove" data-ch-approve hidden>
          <div class="field"><label class="field-label" for="ch-q">Approve in your own words</label><textarea class="input" id="ch-q" rows="2" placeholder="Say in a few words what you approve" aria-describedby="ch-qe"></textarea><span class="field-error" id="ch-qe" hidden>Say in a few words what you approve, so the team knows what you read.</span></div>
          <div class="p-act"><button class="btn btn-primary" type="submit">Approve the charter</button></div>
        </form>`)}
      ${doc('rulings', `Rulings <span class="n num" data-rul-n>${RULINGS.length}</span>`, 'Your decisions the team follows, newest last', `
        <ol class="p-rulings" data-rulings>${RULINGS.map(([n, t, s]) => `<li><b class="num">${n}</b><span class="t"><span>${esc(t)}</span><span class="s">${esc(s)}</span></span></li>`).join('')}</ol>
        <form class="p-ruling" data-ruling>
          <div class="field"><label class="field-label" for="r-new">Add a ruling</label><textarea class="input" id="r-new" rows="2" placeholder="For example: exports never add a watermark" aria-describedby="r-h"></textarea><span class="field-help" id="r-h">Every agent on replay follows it from their next step.</span></div>
          <div class="p-act"><button class="btn btn-secondary" type="submit" data-r-add disabled>Add the ruling</button></div>
        </form>`)}
      ${doc('brief', 'Brief', 'Written by the lead from your description · 2 min read', read(['You film on your phone and want one good clip out of it fast. replay opens a clip, trims it on the exact frame, keeps the sound in sync, and shares it as a link anyone can play.', 'First version: trim, the clip list, keyboard control, share. Later: the waveform, export presets.']))}
      ${doc('spec', 'Spec', 'Approved by you yesterday 17:20 · 6 min read', read(['9 outcomes, from trimming to export. Each one is checked by a test or a review before it counts as met.']))}
      ${doc('design', 'Design', 'Approved by you 20 Oct · merged · 14 files', open('../index.html', 'Open the clickable screens', 'Merged into the project, 14 files') + read(['The timeline, the clip list and the player, in the dark editor look. Trim handles are 44 px on a phone.']))}
      ${doc('contracts', 'Contracts', 'Approved by you 21 Oct · merged · 3 files', open('../index.html', 'Open the contracts', 'Merged into the project, 3 files') + read(['How the clip list, the player and the share link talk to each other.']))}
      ${doc('plan', 'Lead’s plan', 'Updated 13:40 by the lead', read(['Now: Trim clips on the timeline (try 2). Next: Share a clip as a link, once today’s budget allows. After that: the keyboard finding, if you say fix it.']))}
      ${doc('ledger', 'Lead’s ledger', 'What the lead decided without you · 6 entries', `<ol class="p-feed">${[['13:38', 'Kept the share task queued until midnight instead of raising the budget: that is your call.'], ['11:06', 'Merged nothing itself: replay ships draft pull requests you merge.'], ['Mon', 'Split “Trim” from “Export” so each can be checked on its own.']].map(([t, w]) => `<li><time class="num">${t}</time><span>${esc(w)}</span></li>`).join('')}</ol>`)}
      ${doc('messages', 'Team messages', `${MESSAGES.length} today and Monday`, `<ol class="p-msgs">${MESSAGES.map(([f, to, k, t, a]) => `<li><span class="p-msg-h"><b>${f}</b> to <b>${to}</b> · ${k}<time class="num">${a}</time></span><span>${esc(t)}</span></li>`).join('')}</ol>`)}
    </div></section>`,
  };

  /* Each tab's empty state, on the project created a minute ago (?p=tidepool&tab=…): what fills it, and when */
  const none = (h, t, m) => `<section class="p-sec"><h2 class="p-h">${h}</h2><p class="p-empty"><b>${t}</b><span>${m}</span></p></section>`;
  const emptyBody = {
    tasks: () => none('Tasks', 'No tasks yet', 'The lead plans tasks after you approve the spec. They appear here, grouped by status.'),
    outcomes: () => none('Outcomes', 'No outcomes yet', 'The lead drafts them with the spec. You approve each one in the Inbox.'),
    audits: () => none('Audits', 'Nothing from the auditor yet', 'Audits start once there is something built to check.'),
    docs: () => `<section class="p-sec"><h2 class="p-h">Documents</h2><div class="p-docs">${doc('brief', 'Brief', 'Your description, as the brief draft · the lead is reading it', read(['A tide-times app for the three beaches near home, readable at a glance on a phone.']))}</div><p class="p-quiet">The charter, spec, design and contracts appear here as the lead drafts them.</p></section>`,
  };

  /* ── States ── */
  const skeleton = () => `<div class="p-grid" aria-busy="true" aria-label="Loading ${id}">
      <section class="p-now"><span class="skeleton" style="width:48px;height:12px"></span><span class="skeleton" style="width:70%;height:28px"></span><span class="skeleton" style="width:90%;height:16px"></span><span class="skeleton" style="width:100%;height:28px;margin-top:8px"></span></section>
      <aside class="p-facts"><div class="p-facts-in p-skel"><span class="skeleton" style="height:120px"></span><span class="skeleton" style="height:72px"></span></div></aside>
      <div class="p-col">${[3, 2].map(n => `<section class="p-sec"><span class="skeleton" style="width:120px;height:16px"></span>${Array.from({ length: n }, () => '<span class="skeleton" style="width:100%;height:44px"></span>').join('')}</section>`).join('')}</div></div>`;

  const tabs = () => `<nav class="tabs p-tabs" aria-label="${id}" data-scrolls>${[
    ['overview', 'Overview'], ['tasks', 'Tasks', id === 'replay' ? TASK_GROUPS.filter(g => ['Working', 'Queued'].includes(g[0])).reduce((a, g) => a + g[2].length, 0) : P.tasks], ['outcomes', 'Outcomes', P.of ? `${P.met}/${P.of}` : ''], ['audits', 'Audits', P.audits || ''], ['docs', 'Docs'],
  ].map(([k, t, c]) => `<a class="tab" href="${here(k)}"${tab === k ? ' aria-current="page"' : ''}>${t}${known && c ? `<span class="count">${c}</span>` : ''}</a>`).join('')}
    <a class="tab" href="${keep(`activity.html?p=${id}`)}">Activity</a><a class="tab" href="${keep(`settings.html?p=${id}`)}">Settings</a></nav>`;

  /* Desk: Now and the rest in the reading column, facts beside them; middle and phone: facts right under Now */
  const overview = () => `<div class="p-grid${state === 'stale' ? ' is-stale' : ''}">${now()}${facts()}<div class="p-col">${needs()}${work()}${recent()}</div></div>`;
  const body = state === 'loading' ? skeleton() : state === 'error' ? loadError(`The ${id} page`)
    : tab === 'overview' || !['replay', 'tidepool'].includes(id) ? overview() : `<div class="p-col p-list">${(id === 'tidepool' ? emptyBody : sectionBody)[tab]()}</div>`;

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
    </dialog>
    <dialog class="p-dialog" data-audit-dlg aria-labelledby="adl-t" aria-describedby="adl-d">
      <h2 id="adl-t">Run an audit of ${id} now?</h2>
      <p id="adl-d">Three checkers look over what’s built so far, about 20 minutes. The last two cost $3.20 each, from today’s spend. Anything they find comes to your Inbox.</p>
      <div class="p-dialog-act"><button class="btn btn-secondary" type="button" value="keep" autofocus>Not now</button><button class="btn btn-primary" type="button" value="run">Run the audit</button></div>
    </dialog>`;

  mount({
    cur: id, title: id, ux: ['UX-6', 'UX-14', 'UX-3', 'UX-11'],
    head: `<a class="back" href="${keep('projects.html')}">${I('chevron-left')}<span>Projects</span></a><h1>${id}</h1>${GH && known ? `<span class="p-gh">${I('blocked')}Not on GitHub</span>` : ''}${state === 'loading' || state === 'error' ? '' : leadCtl()}<span class="end">${live()}</span>`,
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
    wireTabs();
    if (q.get('ui') === 'menu') btn?.click();
    if (q.get('ui') === 'stop') dlg.showModal();
    if (q.get('ui') === 'audit') document.querySelector('[data-audit-dlg]')?.showModal();
    if (q.has('demo') && tab === 'overview' && id === 'replay') demo(q.get('demo') === 'loop');
  }

  /* ── Audits, findings, charter and rulings: each acts in place with a toast, like the Inbox ── */
  function wireTabs() {
    const ab = document.querySelector('[data-audit]'), adl = document.querySelector('[data-audit-dlg]');
    ab?.addEventListener('click', () => adl.showModal());
    adl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      adl.close();
      if (b.value !== 'run') return ab?.focus();
      ab.disabled = true; document.querySelector('[data-audit-run]').hidden = false;
      toast(`Started an audit of ${id}`); document.querySelector('[data-audit-run]').classList.add('is-entering');
    }));
    document.querySelectorAll('[data-find]').forEach(b => b.addEventListener('click', () => {
      const d = b.closest('.p-find'), yes = b.dataset.find === 'confirm';
      const to = document.querySelector(`[data-group="${yes ? 'fixing' : 'settled'}"] .p-docs`);
      d.dataset.k = yes ? 'fixing' : 'settled'; d.open = false; d.querySelector('.field')?.remove(); d.querySelector('.p-act')?.remove();
      d.querySelector('.s').textContent = yes ? 'Accessibility · the lead plans the fix' : 'Accessibility · settled just now';
      to.prepend(d); d.classList.add('is-entering');
      document.querySelectorAll('[data-group]').forEach(g => { g.querySelector('.n').textContent = g.querySelectorAll('.p-find').length; });
      toast(yes ? 'Asked the team to fix it' : 'Marked it fine'); d.querySelector('summary').focus();
    }));
    const cf = document.querySelector('[data-charter]');
    if (cf) {
      const ta = cf.querySelector('textarea'), save = cf.querySelector('[data-ch-save]'), first = ta.value;
      const ok = document.querySelector('[data-ch-ok]'), ap = document.querySelector('[data-ch-approve]'), st = document.querySelector('[data-charter-s]');
      ta.addEventListener('input', () => { save.disabled = ta.value === first && !cf.dataset.saved; });
      cf.addEventListener('submit', e => {
        e.preventDefault(); save.disabled = true; cf.dataset.saved = '1';
        st.textContent = 'Changed just now, after you approved it · approve it again'; st.classList.add('is-needs');
        ok.hidden = true; ap.hidden = false; toast('Saved the charter'); ap.querySelector('textarea').focus();
      });
      ap.addEventListener('submit', e => {
        e.preventDefault(); const qt = ap.querySelector('textarea'), err = ap.querySelector('.field-error');
        if (!qt.value.trim()) { err.hidden = false; qt.setAttribute('aria-invalid', 'true'); qt.focus(); return; }
        err.hidden = true; qt.removeAttribute('aria-invalid');
        ok.querySelector('.p-lbl').textContent = 'You approved it just now'; ok.querySelector('p').textContent = `“${qt.value.trim()}”`;
        ok.hidden = false; ap.hidden = true; st.textContent = 'Approved by you just now · unchanged since'; st.classList.remove('is-needs');
        toast('Approved the charter for ' + id);
      });
      if (q.get('v') === 'edited') { ta.value = first.replace('Dark, one accent.', 'Dark, one accent, and the clip is always the brightest thing.'); cf.requestSubmit(); }
    }
    const rf = document.querySelector('[data-ruling]');
    if (rf) {
      const ta = rf.querySelector('textarea'), add = rf.querySelector('[data-r-add]');
      ta.addEventListener('input', () => { add.disabled = !ta.value.trim(); });
      rf.addEventListener('submit', e => {
        e.preventDefault(); if (!ta.value.trim()) return;
        const ol = document.querySelector('[data-rulings]'), n = ol.children.length + 1;
        ol.insertAdjacentHTML('beforeend', `<li class="is-entering"><b class="num">R-${n}</b><span class="t"><span>${esc(ta.value.trim())}</span><span class="s">Just now · added by you</span></span></li>`);
        document.querySelector('[data-rul-n]').textContent = n; ta.value = ''; add.disabled = true; toast(`Added ruling R-${n} for ${id}`);
      });
    }
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
