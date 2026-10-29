/* Office fresh (f2e6): the one data set every direction, rough and state sheet draws from.
   The brief's three shapes: a busy project with 2 working and 10 idle (replay), one with 1 needs you (atelier-ui),
   and one with everything off (dodge). Words are the live app's own (dashboard/app.js deskOf), cards follow audit F-3:
   stage and latest step in words, never "Try N of M".
   Loaded after ux/wf/wf.js and before screens2/hf.js, so the shell's sidebar and tab counts are these figures too. */
(() => {
  const M = window.ATELIER_MODEL;
  if (M) {
    M.NOW = { ...M.NOW, waiting: 4, needs: 1, working: 2, onDuty: 2, today: '$49.91', plan: 41, planReset: '2 h 10 min' };
    M.PROJECTS = [
      { id: 'replay', lead: true, waiting: 2, today: '$22.38', limit: '$40', line: 'Building · 2 working' },
      { id: 'atelier-ui', lead: true, waiting: 2, today: '$27.53', limit: '$30', line: 'Design · 1 needs you' },
      { id: 'dodge', lead: false, waiting: 0, today: '$0.00', limit: '$20', line: 'Lead off · nothing running' },
    ];
  }

  const STAGES = ['Planning', 'Building', 'Checking', 'Review', 'Done']; // = app.js STAGES
  const W = { active: 'Working', needs: 'Needs you', '': 'Waiting', off: 'Off', done: 'Done' };
  const desk = d => ({ k: '', step: '', stage: null, ago: '', ...d, word: d.held || W[d.k || ''] });

  const FLOORS = [
    { p: 'replay', working: 2, needs: 0, today: '$22.38', desks: [
      desk({ id: 're-fe', role: 'Frontend', k: 'active', what: 'Measure speed on a 20,000-clip library on the HDD', step: 'Fixing the broken newlines by hand', stage: 1, ago: '1 min ago' }),
      desk({ id: 're-be', role: 'Backend', k: 'active', what: 'Build the installer automatically on GitHub', step: 'That failure is the shell, not the run', stage: 2, ago: 'just now' }),
      desk({ id: 're-lead', role: 'Lead', what: 'Watching for your decisions', step: 'In the Claude app as “replay lead”' }),
      desk({ id: 're-des', role: 'Designer', what: 'No task right now', step: 'Finished “Trim handles, round 2”' }),
      desk({ id: 're-rev', role: 'Reviewer', what: 'Waiting for finished work', step: 'Checks every task before it ships' }),
      desk({ id: 're-aud', role: 'Auditor', what: 'Between audits', step: 'Last audit yesterday' }),
      desk({ id: 're-test', role: 'Tester', held: 'Paused', what: 'Replay a 3-hour session end to end', step: 'Paused. Today’s plan window is used. The lead decides what happens next', stage: 1, ago: '13 min ago' }),
      desk({ id: 're-docs', role: 'Writer', what: 'No task right now', step: 'Finished “Keyboard shortcuts page”' }),
      desk({ id: 're-data', role: 'Data', what: 'No task right now', step: 'Starts when the lead hands it a task' }),
      desk({ id: 're-plat', role: 'Platform', what: 'No task right now', step: 'Finished “Nightly build on Windows”' }),
      desk({ id: 're-perf', role: 'Performance', what: 'No task right now', step: 'Starts when the lead hands it a task' }),
      desk({ id: 're-sec', role: 'Security', what: 'No task right now', step: 'Finished “Sign the installer”' }),
    ] },
    { p: 'atelier-ui', working: 0, needs: 1, today: '$27.53', desks: [
      desk({ id: 'ui-des', role: 'Designer', k: 'needs', what: 'Office: fresh directions for you to pick', step: 'It asked you something. Answer it on its page', ago: '6 min ago' }),
      desk({ id: 'ui-lead', role: 'Lead', what: 'Watching for your decisions', step: 'In the Claude app as “atelier-ui lead”' }),
      desk({ id: 'ui-fe', role: 'Frontend', what: 'No task right now', step: 'Finished “Screen switch fixes”' }),
      desk({ id: 'ui-rev', role: 'Reviewer', what: 'Waiting for finished work', step: 'Checks every task before it ships' }),
      desk({ id: 'ui-aud', role: 'Auditor', what: 'Between audits', step: 'Last audit 2 h ago' }),
    ] },
    { p: 'dodge', working: 0, needs: 0, today: '$0.00', off: true, desks: [
      desk({ id: 'do-lead', role: 'Lead', k: 'off', what: 'The lead is off', step: 'Start it on the project page' }),
      desk({ id: 'do-des', role: 'Designer', k: 'off', what: 'Off', step: '' }),
      desk({ id: 'do-fe', role: 'Frontend', k: 'off', what: 'Off', step: '' }),
      desk({ id: 'do-rev', role: 'Reviewer', k: 'off', what: 'Off', step: '' }),
      desk({ id: 'do-aud', role: 'Auditor', k: 'off', what: 'Off', step: '' }),
    ] },
  ];

  /* Every desk state once, in the live app's words (the states sheet). */
  const STATES = [
    desk({ id: 's-work', role: 'Designer', k: 'active', what: 'High-fi Inbox and Office screens', step: 'Drawing the Office floor at 390', stage: 1, ago: '4 min ago' }),
    desk({ id: 's-quiet', role: 'Auditor', k: 'active', quiet: true, what: 'Checking contrast in light and dark', step: 'Quiet for 38 min, longer than usual', ago: '38 min in' }),
    desk({ id: 's-needs', role: 'Builder', k: 'needs', what: 'Export a trimmed clip', step: 'It asked you something. Answer it on its page', ago: '12 min ago' }),
    desk({ id: 's-paused', role: 'Tester', held: 'Paused', what: 'Replay a 3-hour session end to end', step: 'Paused. Today’s plan window is used. The lead decides what happens next', stage: 1, ago: '13 min ago' }),
    desk({ id: 's-wait', role: 'Reviewer', what: 'Waiting for finished work', step: 'Checks every task before it ships' }),
    desk({ id: 's-off', role: 'Lead', k: 'off', what: 'The lead is off', step: 'Start it on the project page' }),
    desk({ id: 's-done', role: 'Frontend', k: 'done', what: 'Trim clips on the timeline', step: 'Finished just now', stage: 4 }),
  ];

  const roleKey = r => /lead/i.test(r) ? 'lead' : /design/i.test(r) ? 'designer' : /audit/i.test(r) ? 'auditor' : /review/i.test(r) ? 'reviewer' : /test/i.test(r) ? 'tester' : /writ/i.test(r) ? 'writer' : 'builder';
  const meta = d => [d.k !== 'done' && d.stage != null && STAGES[d.stage], d.ago].filter(Boolean).join(' · ');
  const news = d => d.k === 'active' || d.k === 'needs' || d.k === 'done' || d.held === 'Paused';

  window.OF_DATA = { FLOORS, STATES, STAGES, roleKey, meta, news, head: { working: 2, needs: 1, onDuty: 2 } };
})();
