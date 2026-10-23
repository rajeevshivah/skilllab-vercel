// Text for the "Explain this page" button. One entry per page.
// Edit the words here — no page code needs to change.
//   what  : one-line purpose          why   : why it matters
//   rules : the hidden rules          flow  : how it connects to other pages
//   steps : guided tour — el = the data-tour="..." name in the page
//   video : optional link (YouTube etc.). Leave '' to hide the button.

const HELP = {
  performance: {
    title: 'Trainer Performance — how it works',
    what: 'One page that shows, for every cycle and every batch, whether the trainer finished the cycle work on time, who actually did it, and a score out of 100. Trainers see exactly what management sees.',
    why: 'The program should run without anyone chasing people. Every save is time-stamped automatically, so nobody has to argue about who did what and when — the page simply shows it.',
    rules: [
      { t: 'Deadline', d: 'Each batch has a project day (its cycle evaluation day). The cycle form, marks and Top 3 are due by the Saturday after the project day, 7 PM India time. The admin can change the project day or deadline for a batch, or for all batches of a cycle.' },
      { t: 'When is it "done"?', d: 'Cycle form: when the report is saved. Marks: when EVERY student has an entry (evaluated or not evaluated). Top 3: when it is saved. The time recorded is the first time each was completed — later edits never change it.' },
      { t: 'On time · Late · Done by admin', d: 'On time = finished by the trainer before the deadline. Late = finished by the trainer after it (shows by how many days). Done by admin = the trainer did not do it and an admin filled it in — the trainer gets 0 for that part. Not done = still missing after the deadline.' },
      { t: 'Score out of 100', d: 'Daily log saved the same day 35 · Cycle form 10 · Marks 10 · Top 3 10 · Cycle plan ready before the cycle starts 15 · Attendance taken in each log 10 · Students at Moderate or above 10. Late work gets part credit; work done by an admin gets none. Only parts already due are counted.' },
      { t: 'Cycle plan made by the admin', d: 'Planning is a two-way job: the admin may design a cycle plan himself. Such a plan shows “Made by admin · not counted” — the trainer gets no credit and no penalty, and the score is out of the remaining parts.' },
      { t: 'Daily logs (the log rule)', d: 'Every class day counts: a day with a planned class or a log. From 26 Oct a log is complete when it names the planned class, says how it went (done / partly / not done), answers “did students push to GitHub?”, and — if not done as planned — says what was taught. Complete on the class day = full credit · completed later = half · saved on the day but incomplete = half · saved later and incomplete = quarter · created by admin or missing = 0. Days the admin marks “No class” (holiday, exam, cancelled) are not counted.' },
      { t: 'Excused', d: 'For a genuine reason (exam duty, illness) the admin can excuse a batch\'s cycle. Lateness is then not penalised, and the reason is shown to everyone.' },
      { t: 'Tracked cycles only', d: 'Cycles that ended before tracking started show information but no score. Every new cycle is tracked automatically.' },
      { t: 'Grouped by deadline, not cycle number', d: 'Batches that finish together are shown together — e.g. 1st year\'s Cycle 1 and 3rd sem\'s Cycle 3 were both due 17 Oct, so they appear in the same view.' },
      { t: 'Two or more trainers on one batch', d: 'Each cycle has a lead trainer (★) and an owner for each task — cycle form, marks, Top 3, cycle plan (by default the lead owns everything). Only the owner is scored for a task, so one trainer\'s delay never lowers the other\'s score.' },
      { t: 'Class days belong to whoever teaches them', d: 'Each class day counts for the trainer set on that class in the cycle plan (or, if none is set, whoever logged it). If one trainer doesn\'t log or cover his classes, only his score drops.' },
      { t: '“Waiting on” another trainer', d: 'If you own a task but cannot finish because another trainer has not done his part, open Details and send “waiting on” to the admin. Nothing changes until the admin approves. After approval, any lateness from that moment counts against the trainer you were waiting on, not you.' },
    ],
    flow: [
      'Before the cycle: fill the Cycle Plan.',
      'Every class: fill the daily log the same day, with attendance.',
      'After the project day: cycle form + marks for every student + Top 3 — before Saturday 7 PM.',
      'This page updates by itself. Each trainer\'s score counts only the parts he owns or taught; the semester average is across all tracked cycles.',
    ],
    steps: [
      { el: 'perf-cycle', title: 'Pick a deadline', text: 'Batches are grouped by the date their cycle work was due, so batches that finished together show together. “Not tracked” = no score.' },
      { el: 'perf-summary', title: 'The cycle at a glance', text: 'How many batches finished on time, late, were completed by admin, or are still not done.' },
      { el: 'perf-trainers', title: 'Trainer scores', text: 'Each trainer’s score for this cycle and the semester average. Your own row is highlighted.' },
      { el: 'perf-batches', title: 'Every batch', text: 'Project day, deadline, when the work was completed, and the status. Red-edged rows are late or not done.' },
      { el: 'perf-details', title: 'See exactly what happened', text: '“Details” shows who did each item and when (including “Updated by admin”), who owns each task, each trainer\'s own score, and “waiting on” requests. “Report” opens the full cycle report.' },
    ],
    video: '',
  },

  board: {
    title: 'All class plans — every batch, day by day',
    what: 'One page with the class plan of every batch for the selected cycle period. See what each batch is doing on each day, edit when allowed, and see whether every past class was logged properly.',
    why: 'Planning together is faster when everyone sees the whole picture. And because the plan is locked, the plan everyone agreed on is the plan that is followed — any change is visible with the name of who made it.',
    rules: [
      { t: 'Who can edit', d: 'The admin always can. Trainers can edit only while the admin has clicked “Let trainers edit” (for planning meetings). Locked again with one click. Every change is saved with the name and time.' },
      { t: 'Class moved or cancelled?', d: 'Tell the admin. The admin moves the class to its new date (or marks the day “No class” in the batch log), so nobody is marked as missing a log.' },
      { t: 'Log status under each past class', d: 'Green = logged and complete. Yellow = logged but missing something (planned class, GitHub push, or what was taught). Red = not logged. Blue = no class that day.' },
      { t: 'The log rule', d: 'Log on the class day, before midnight, by the trainer who taught: which planned class, done / partly / not done, did students push to GitHub, and attendance. Not done as planned → write what was taught.' },
    ],
    flow: [
      'Planning meeting: admin opens editing → everyone fills or fixes their batch plans here → admin locks.',
      'Every class day: trainer logs the class on the Batch page, choosing the planned class.',
      'This page and the Performance page show who followed the plan and logged on time.',
    ],
    steps: [
      { el: 'board-controls', title: 'Pick the cycle period', text: 'Batches that run on the same dates are shown together. Switch between “Day by day” and “By batch”.' },
      { el: 'board-lock', title: 'Locked or open', text: 'Shows whether trainers can edit right now. The admin opens and locks editing here.' },
      { el: 'board-days', title: 'Each day, every batch', text: 'Every class planned for the day. Past classes show whether the log was saved and complete.' },
      { el: 'board-help', title: 'Help anytime', text: 'Click “Explain this page” to see this again.' },
    ],
    video: '',
  },

  dashboard: {
    title: 'Today — your daily starting point',
    what: 'Every batch you train, with one question answered for each: did today\'s class get logged, and is the batch on track with its syllabus?',
    why: 'This page is how the program runs without anyone chasing trainers. A batch that hasn\'t logged, or has fallen behind its syllabus, is flagged here automatically — for the trainer, the coordinator and the MD alike.',
    rules: [
      { t: 'Log every class, the same day', d: 'Open the batch → log today\'s class before midnight: which planned class it was, done / partly / not done, did students push to GitHub, and attendance. No log = the class did not happen, as far as the system (and reports) know.' },
      { t: 'When a batch is flagged', d: 'Once a batch has syllabus topics, it is flagged in red if it has not logged today or has covered under 40% of its syllabus.' },
      { t: 'Plan progress comes from the syllabus', d: 'It counts topics in Batch → Plan tab that daily logs have marked as covered. “0 of 0” means no syllabus topics were added yet — add them, or the batch can never show as behind.' },
      { t: 'Next topic', d: 'The first syllabus topic not yet covered — what the next class should teach.' },
    ],
    flow: [
      'Batch → Plan tab: add the syllabus topics once per batch.',
      'Cycles → Plan: lay out the classes of each cycle.',
      'After every class: Batch → daily log (topics covered + attendance).',
      'End of cycle: Marks → cycle report → Top 3.',
    ],
    steps: [
      { el: 'dash-summary', title: 'Today at a glance', text: 'Green means every batch logged today and nobody is behind. Otherwise it names who hasn’t logged.' },
      { el: 'dash-status', title: 'Logged today?', text: '“Logged” once today’s class log is saved. Log every class the same day — attendance and reports are built from it.' },
      { el: 'dash-plan', title: 'Syllabus progress', text: 'Topics covered out of the batch syllabus (Batch → Plan tab). “0 of 0” means the syllabus hasn’t been added yet.' },
      { el: 'dash-next', title: 'What to teach next', text: 'The next uncovered syllabus topic. Click “Open” on a row to log today’s class.' },
      { el: 'dash-help', title: 'Help on every page', text: 'Look for “Explain this page” — it explains the page and replays this tour anytime.' },
    ],
    video: '',
  },

  plan: {
    title: 'Cycle Plan — the class-by-class plan',
    what: 'Before a cycle starts, the trainer lays out every class of the cycle here: class number, topic, what will be covered, date and trainer.',
    why: 'The plan is the promise; the daily class log is what actually happened. Comparing the two is how the program runs itself — anyone (coordinator, MD, a new trainer taking over) can see whether a batch is on track without asking the trainer.',
    rules: [
      { t: 'One row = one class', d: 'Number classes continuously across cycles (Cycle 3 ends at class 41 → Cycle 4 starts at 42). Never restart at 1.' },
      { t: 'Plans are locked once made', d: 'A trainer can fill an empty plan. After that, only the admin can change it — or trainers while the admin has opened editing (e.g. in the planning meeting). Every change is recorded: who, when and what.' },
      { t: 'Plan first, log daily', d: 'Plan is filled in the planning meeting before the cycle. Each day after class, the trainer fills the daily class log on the Batch page — what was taught + attendance.' },
      { t: 'Behind plan gets flagged', d: 'The Dashboard flags batches that have not logged today or have covered under 40% of their syllabus (Batch → Plan tab). No log = it did not happen, as far as the system knows.' },
      { t: 'Dates decide the cycle', d: 'A class belongs to the cycle whose start–end dates include its date. Attendance and marks for a cycle only count classes inside those dates.' },
    ],
    flow: [
      'Cycles page → open the cycle → Plan (this page): plan all classes.',
      'Batch page → daily class log: after each class, log topic + attendance.',
      'Dashboard: shows who has not logged and who is behind plan.',
      'End of cycle → Marks page → Cycle report → Top 3.',
    ],
    steps: [
      { el: 'plan-title', title: 'Which cycle this is', text: 'Every cycle of every batch has its own plan. Check the batch and cycle number before editing.' },
      { el: 'plan-classes', title: 'The classes', text: 'One card per class: number, topic, what will be covered, date/time and trainer. Keep class numbers continuous across cycles.' },
      { el: 'plan-actions', title: 'Add, save, share', text: '“+ Add class” adds a row, “Save plan” stores it. “Export / print” makes a clean copy you can share with students.' },
      { el: 'plan-help', title: 'Reopen this guide anytime', text: 'Click “Explain this page” whenever you need this again. The daily log (what actually happened) is on the Batch page.' },
    ],
    video: '',
  },

  marks: {
    title: 'Cycle Marks — scores and student categories',
    what: 'At the end of each cycle, every student gets a project mark (and an MCQ assessment mark if one was held). The system turns the score into a category.',
    why: 'Categories decide who needs help and who can lead. Excellent students feed Top 3 and placement; Basic and Zero students are the ones trainers must pull up next cycle. This is what makes progress visible across cycles without anyone keeping a separate sheet.',
    rules: [
      { t: 'Score', d: 'Assessment held: (assessment + project) out of 200. Assessment not held: project out of 100. Untick “Assessment was held” for project-only cycles.' },
      { t: 'Category from score %', d: 'Excellent ≥ 75% · Moderate 50–74% · Basic 1–49% · Zero = 0. A trainer may override the category; the override is remembered.' },
      { t: 'Not evaluated ≠ zero', d: 'Absent on evaluation day or joined late → “Not evaluated”. Such students get no marks, no category, and are NOT counted in averages. Zero means they were evaluated and scored 0 (e.g. no project submitted).' },
      { t: 'Attendance % is per cycle', d: 'Counted only over classes logged inside this cycle’s dates. It stays provisional until the roster is locked on the Batch page.' },
    ],
    flow: [
      'Daily class logs (Batch page) → attendance % here.',
      'Marks (this page) → categories → filters and counts at the top.',
      'Go to cycle report → pick Top 3 → Hall of Fame and placement view.',
    ],
    steps: [
      { el: 'marks-held', title: 'Was an MCQ held?', text: 'Assessment is optional. Untick this when only the project was evaluated — scores then become project /100.' },
      { el: 'marks-filters', title: 'Categories at a glance', text: 'Counts per category. Click one to see only those students — e.g. “Basic” to plan extra help.' },
      { el: 'marks-table', title: 'Enter marks', text: 'Set Status, then marks. Category fills itself from the score; change it only with a reason. Use Remark for anything the next trainer should know.' },
      { el: 'marks-save', title: 'Save, then Top 3', text: 'Save marks, then open the cycle report to confirm Top 3. Nothing is saved until you click Save.' },
    ],
    video: '',
  },
}

export default HELP
