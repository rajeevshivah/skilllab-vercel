// Text for the "Explain this page" button. One entry per page.
// Edit the words here — no page code needs to change.
//   what  : one-line purpose          why   : why it matters
//   rules : the hidden rules          flow  : how it connects to other pages
//   steps : guided tour — el = the data-tour="..." name in the page
//   video : optional link (YouTube etc.). Leave '' to hide the button.

const HELP = {
  plan: {
    title: 'Cycle Plan — the class-by-class plan',
    what: 'Before a cycle starts, the trainer lays out every class of the cycle here: class number, topic, what will be covered, date and trainer.',
    why: 'The plan is the promise; the daily class log is what actually happened. Comparing the two is how the program runs itself — anyone (coordinator, MD, a new trainer taking over) can see whether a batch is on track without asking the trainer.',
    rules: [
      { t: 'One row = one class', d: 'Number classes continuously across cycles (Cycle 3 ends at class 41 → Cycle 4 starts at 42). Never restart at 1.' },
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
