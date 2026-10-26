/* D5 §3 journeys. Each flow: steps (screen, state it is in, what you do, taps it costs) and failure paths
   (which step they branch from, what you see, where it leads). Only actions that exist today (inventory.md);
   figures are the D3 mockup's: 7 waiting, 2 need you now, 3 working, $52.60 today, replay at its $40 limit, plan 41 %. */
window.FLOWS = [
  {
    id: 'checkin', title: 'Morning check-in on the phone', jobs: 'J1 J2', where: 'Phone, 390 px, two minutes over coffee',
    total: '3 taps to clear two decisions; 0 when nothing needs you',
    steps: [
      { screen: 'Home screen', state: 'App icon', do: 'Open Atelier from the home screen.', taps: 1 },
      { screen: 'Inbox', state: 'Loaded · 2 need you now, 5 when you have a minute', do: 'The top item is already open: “Replay has used today’s $40, so new work is paused”. The answer sits in the dock above the tabs.', taps: 0 },
      { screen: 'Inbox item: budget', state: 'Dock: Raise today to $60', do: 'Tap Raise. The item shows done in place, then the next one slides up.', taps: 1 },
      { screen: 'Inbox item: finding', state: 'Next item open', do: 'Read what happens if nobody fixes it; tap Yes, fix it.', taps: 1 },
      { screen: 'Inbox', state: '5 left, none urgent', do: 'The red count is gone. Glance at the Office tab’s “3 working” and put the phone away.', taps: 0 },
    ],
    fails: [
      { at: 0, if: 'Signed out on this device', then: 'Sign in: paste the token once. You land back on the Inbox, not on a blank page.' },
      { at: 1, if: 'Nothing needs you', then: 'One quiet line, “Nothing needs you. 3 agents working.”, and the last three things you decided. No red anywhere (R8). End: 1 tap.' },
      { at: 1, if: 'Offline or the server is down', then: 'The last Inbox stays on screen with “Last updated 08:12 · Retrying”. Decide buttons are disabled and say why; nothing is lost.' },
      { at: 2, if: 'The action fails', then: 'The dock keeps your choice and says what went wrong in one line, with Try again. The item does not leave the list.' },
      { at: 2, if: 'Tapped the wrong answer', then: 'Undo in the toast for 6 s puts the item back as it was. UX-10' },
    ],
  },
  {
    id: 'gate', title: 'Deciding a gate with its proof', jobs: 'J6 J1', where: 'Desk, 1440 px, or phone',
    total: '2 taps and a few words to approve; 3 to send it back',
    steps: [
      { screen: 'Inbox', state: 'Gate: “The design for replay is ready for you”', do: 'Select it (or it is already on top). Key: J / K, then Enter.', taps: 1 },
      { screen: 'Inbox item: gate', state: 'The thing itself: three screens large, “+10 more”', do: 'Look at the screens in the item. Open the clickable screens in a new tab (the view port) if you want to click around.', taps: 0 },
      { screen: 'View port (new tab)', state: 'Agent-made pages, separate origin', do: 'Optional: try the screens, close the tab, you are back where you were.', taps: 1, optional: true },
      { screen: 'Inbox item: gate', state: 'Dock: a line for your words, Approve', do: 'Type why you approve (it goes to the designer as a ruling’s context) and tap Approve.', taps: 1 },
      { screen: 'Inbox', state: 'Next item, toast “Approved the design for replay” · Undo', do: 'The lead moves the project to Contracts; the phase track on the project page moves on.', taps: 0 },
    ],
    fails: [
      { at: 1, if: 'The pictures are missing (the gate lists no screenshots)', then: 'The item says “No pictures came with this gate” and shows the Open screens button large. Open question for the lead.' },
      { at: 3, if: 'You don’t approve yet', then: 'Leave it waiting and tell the lead what to change (a ruling, flow 7), or Skip this phase with a reason; the reason is required. Same dock, the second button.' },
      { at: 3, if: 'You send it without words', then: 'Approve stays disabled with “A few words, so the designer knows why” under the line. No modal.' },
    ],
  },
  {
    id: 'new', title: 'Starting a new project from a brief', jobs: 'J3', where: 'Desk, then the phone for the first gate',
    total: '4 taps and typing (form); the rest arrives in the Inbox',
    steps: [
      { screen: 'Sidebar or Projects', state: 'New project', do: 'Press New project (or ⌘K “new”).', taps: 1 },
      { screen: 'New project', state: 'One short form', do: 'Name and a line on what it is. Team and shipping are set to the usual (Team, Draft PRs); change them only if you want to.', taps: 0 },
      { screen: 'New project', state: 'Options', do: 'Private GitHub repo and Start the lead now, both on. UX-12', taps: 0 },
      { screen: 'New project', state: 'Creating…', do: 'Create. The button says Creating… and the form stays filled until the server answers.', taps: 1 },
      { screen: 'Project page: Now', state: 'Lead starting · phase Brief', do: '“The lead is reading your description and will draft a charter.” Nothing else to do.', taps: 0 },
      { screen: 'Inbox item: charter', state: 'Charter to approve, minutes later', do: 'Open the charter, edit any line in your words, approve. Then the brief gate comes the same way.', taps: 2 },
    ],
    fails: [
      { at: 3, if: 'The name is taken or not allowed', then: 'The field says so under itself (“There is already a project called replay”), focus goes there, nothing else is cleared.' },
      { at: 3, if: 'GitHub could not make the repo', then: 'The project is still made; its header says “Not on GitHub” in red with the reason, and an Inbox item explains it. No button: the lead retries.' },
      { at: 4, if: 'The lead did not start', then: 'Now says “The lead is off” with Start the lead (one tap, no confirm: starting is safe).' },
    ],
  },
  {
    id: 'watch', title: 'Watching a running task and reading its proof', jobs: 'J4 J2', where: 'Desk or phone',
    total: '2 taps from the Office; proof is on the page, not in a file',
    steps: [
      { screen: 'Office', state: 'replay floor · 3 working', do: 'Find the desk “Building the trim editor · frontend”. It shows a lilac dot, its stage and “finishing its step”.', taps: 0 },
      { screen: 'Office desk', state: 'Working', do: 'Tap the desk. UX-4 decides whether this is a full page or a peek beside the Office.', taps: 1 },
      { screen: 'Task page', state: 'Working · Building · step 4 of 6', do: 'Status in one sentence; the latest step in plain words; “last active 1 min ago”; $18.40 spent today. UX-5', taps: 0 },
      { screen: 'Task page: Proof', state: 'Shown working', do: 'Screenshots large, the recording plays inline, the run log tail under Details. Tap a picture to see it full size (view port).', taps: 1 },
      { screen: 'Task page', state: 'Live', do: 'It refreshes by itself; your scroll and open folds stay put (R7). When it passes, the dot turns green and Review shows the reviewer’s result.', taps: 0 },
    ],
    fails: [
      { at: 2, if: 'Quiet for longer than usual', then: '“Nothing for 14 min, longer than its usual 5” in neutral text, not red: it is a hint, not an alarm. Stop sits in the page menu (confirms).' },
      { at: 3, if: 'No proof yet', then: '“No proof yet. It arrives when the check runs.” One line, no empty boxes.' },
      { at: 3, if: 'The view port is down', then: 'Pictures show their caption and “Couldn’t load from the view port”, with Try again. The rest of the page works.' },
    ],
  },
  {
    id: 'fail', title: 'A task fails or pauses for the lead', jobs: 'J7 J8', where: 'Phone or desk, usually from the Inbox',
    total: '1–2 taps to answer; 0 when the lead handles it',
    steps: [
      { screen: 'Inbox', state: 'Question: “Should a clip under 2 s still get a thumbnail?”', do: 'The question is the item, with who asked (backend, Indexing clip thumbnails).', taps: 1 },
      { screen: 'Inbox item: question', state: 'Dock: answer line, suggested answers when the agent gave them', do: 'Tap a suggested answer or type your own; Send.', taps: 1 },
      { screen: 'Task page', state: 'Paused for you → Working', do: 'The task goes back to work; the toast says “Sent to backend”.', taps: 0 },
      { screen: 'Task page', state: 'Failed', do: 'If a task fails outright, its page opens on what went wrong in one sentence and what the lead is doing about it; the log tail is under Details.', taps: 0 },
    ],
    fails: [
      { at: 3, if: 'Failed and the lead can’t fix it alone', then: 'It reaches the Inbox as a blocker with the one thing to do (answer, raise a budget, approve a plan). There is no Retry button today; the lead re-plans. A Retry would be a new action: the lead’s call.' },
      { at: 3, if: 'Push to GitHub failed', then: 'An Inbox item “Work isn’t reaching GitHub” with the reason, no button (as today); the project header turns red until it is fixed.' },
      { at: 1, if: 'Your answer can’t be sent', then: 'The text stays in the box (never lost), the dock says why, Try again.' },
    ],
  },
  {
    id: 'budget', title: 'Budget warning and limit', jobs: 'J5', where: 'Phone, from the Inbox',
    total: '1 tap to raise; 0 to wait for tomorrow',
    steps: [
      { screen: 'Sidebar foot / phone top bar', state: 'Spent today $52.60', do: 'Spend is always one figure in one place: the sidebar foot on the desk, the top bar on the phone.', taps: 0 },
      { screen: 'Inbox (optional, new)', state: 'At 80 %: “replay has used most of today’s $40”', do: 'An early warning in “When you have a minute”, so the limit is no surprise. UX-11', taps: 0, optional: true },
      { screen: 'Inbox item: budget', state: 'At 100 %: needs you now', do: '“Replay has used today’s $40, so new work is paused.” The meter is full; the dock offers Raise today to $60.', taps: 0 },
      { screen: 'Inbox item: budget', state: 'Dock', do: 'Raise (one tap, undo in the toast), or Budget settings, or do nothing: work resumes at midnight.', taps: 1 },
      { screen: 'Project page: Money', state: '$40.00 of $60', do: 'The same figures as the sidebar, from the one summary (R2).', taps: 0 },
    ],
    fails: [
      { at: 0, if: 'Your Claude plan is near its pause point', then: 'The plan meter in the sidebar foot reads “Holding until 14:10” in plain text; Settings › Plan holds the pause levels. It is global, not per project.' },
      { at: 3, if: 'The raise fails', then: 'The dock says so and keeps the item; the limit is unchanged.' },
    ],
  },
  {
    id: 'correct', title: 'The owner corrects the lead', jobs: 'J8', where: 'Desk',
    total: '2 taps and a sentence; restart is the last resort',
    steps: [
      { screen: 'Inbox item: owner judgement', state: 'Outcome to judge', do: 'Reject with a note: the note becomes a ruling every agent follows. This is the usual way to correct.', taps: 2 },
      { screen: 'Project › Docs › Rulings', state: 'List of rulings', do: 'Or write a ruling directly: Add a ruling, one sentence, Save.', taps: 2, optional: true },
      { screen: 'Project › Docs › Charter', state: 'Edit', do: 'Or change the charter itself in your words; it says when you last approved it.', taps: 2, optional: true },
      { screen: 'Project header: lead menu', state: 'Lead on', do: 'If the lead has drifted: Restart fresh. It asks first, in one sentence (“The lead starts over from the charter and rulings; work in progress is kept”).', taps: 2, optional: true },
    ],
    fails: [
      { at: 0, if: 'Reject without a note', then: 'Reject stays disabled until there are words: a ruling needs a sentence.' },
      { at: 3, if: 'Restart does not take', then: 'The header shows “Lead off” with Start the lead, and Activity logs why.' },
    ],
  },
];
