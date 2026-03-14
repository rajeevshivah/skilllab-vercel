import { cors, getUser } from './_helpers.js'
import { connectDB }     from './_db.js'
import { SectionCycle, Student } from './_models.js'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType,
  PageBreak, Footer,
} from 'docx'

const BRAND_BLUE = '1A3C5E'
const FONT       = 'Arial'

// ── DOCX helpers ───────────────────────────────────────────────────
function heading(text) {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 28, bold: true, color: BRAND_BLUE })],
  })
}
function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: String(text ?? ''), font: FONT, size: 22, ...opts })],
  })
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100 },
    children: [new TextRun({ text: String(text ?? ''), font: FONT, size: 22 })],
  })
}
function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: 'EBF0F7' },
          children: [new Paragraph({ children: [new TextRun({ text: String(label ?? ''), font: FONT, bold: true, size: 22 })] })],
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: String(value ?? '—'), font: FONT, size: 22 })] })],
        }),
      ],
    })),
  })
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] })
}
function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Build children array for one section report ────────────────────
async function buildSectionChildren(report, index) {
  const toppers = await Student.find({
    stream: report.stream, course: report.course,
    year: report.year, sem: report.sem,
    section: report.section, cycle: report.cycle,
  }).sort({ rank: 1 }).limit(3)

  const c = []
  const prefix = index > 0 ? [pageBreak()] : []
  c.push(...prefix)

  // Cover / section header
  c.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 300 }, children: [new TextRun({ text: 'SHEAT College of Engineering', font: FONT, size: 36, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Department of Computer Science & Engineering', font: FONT, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: '— SKILL LAB PROGRAM —', font: FONT, size: 24, bold: true, italics: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Cycle Report: ${report.cycle}`, font: FONT, size: 28, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `${report.stream} · ${report.course} · ${report.year} · ${report.sem}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Section: ${report.section}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Trainer: ${report.trainer?.name || '—'}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Co-Trainer: ${report.coTrainerName || '—'}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `Report Date: ${fmt(new Date())}`, font: FONT, size: 22 })] }),
    pageBreak(),
  )

  // 1. Cycle Overview
  c.push(heading('1. Cycle Overview'))
  c.push(infoTable([
    ['Cycle',             report.cycle],
    ['Stream',            report.stream],
    ['Course',            report.course],
    ['Year / Sem',        `${report.year} · ${report.sem}`],
    ['Section',           report.section],
    ['Start Date',        fmt(report.startDate)],
    ['End Date',          fmt(report.endDate)],
    ['Project Conducted', report.projectConducted ? 'Yes' : 'No'],
  ]))
  c.push(
    para(`This report covers the ${report.cycle} of the Skill Lab Program for ${report.stream} students of ${report.course}, ${report.year}, Section ${report.section}. The cycle ran from ${fmt(report.startDate)} to ${fmt(report.endDate)}.`),
    para(`The primary focus of this cycle was to strengthen students' practical skills. ${report.projectConducted ? 'A project component was conducted.' : 'No formal project was conducted this cycle.'}`),
    pageBreak(),
  )

  // 2. Class-wise Progress
  c.push(heading('2. Class-wise Progress'))
  c.push(para('Topics Covered:', { bold: true }))
  if (report.topicsCovered?.length) report.topicsCovered.forEach(t => c.push(bullet(t)))
  else c.push(para('No topics recorded.'))
  c.push(
    para(`Students demonstrated progressive understanding of the topics listed above. Hands-on sessions were conducted alongside theoretical instruction.`),
    para(`Skill progress was assessed as: ${report.skillProgressLevel || '—'}. Overall engagement: ${report.engagementLevel || '—'}.`),
    pageBreak(),
  )

  // 3. Attendance Analysis
  c.push(heading('3. Attendance Analysis'))
  c.push(infoTable([
    ['Total Students',       report.attendance?.totalStudents ?? '—'],
    ['Average Attendance %', report.attendance?.avgPercent != null ? `${report.attendance.avgPercent}%` : '—'],
  ]))
  c.push(
    para(`The section had ${report.attendance?.totalStudents ?? '—'} enrolled students with an average attendance of ${report.attendance?.avgPercent ?? '—'}%.`),
    para('Students with attendance below 75% were individually counselled and encouraged to improve regularity.'),
    pageBreak(),
  )

  // 4. Trainer Observations
  c.push(heading('4. Trainer Observations'))
  c.push(para(`Engagement Level: ${report.engagementLevel || '—'}`, { bold: true }))
  c.push(para(report.challenges || 'No specific observations recorded.'), pageBreak())

  // 5. Challenges Faced
  c.push(heading('5. Challenges Faced'))
  c.push(para('Operational Challenges:', { bold: true }))
  if (report.operationalChallenges) {
    report.operationalChallenges.split('\n').filter(Boolean).forEach(l => c.push(bullet(l)))
  } else {
    c.push(para('None reported.'))
  }
  c.push(para('Academic Challenges:', { bold: true }))
  if (report.challenges) {
    report.challenges.split('\n').filter(Boolean).forEach(l => c.push(bullet(l)))
  } else {
    c.push(para('None reported.'))
  }
  c.push(pageBreak())

  // 6. Key Achievements
  c.push(heading('6. Key Achievements'))
  c.push(para(report.achievements || 'No achievements recorded.'), pageBreak())

  // 7. Score Distribution
  c.push(heading('7. Score Distribution'))
  c.push(infoTable([
    ['Average Marks', report.avgMarks != null ? `${report.avgMarks} / 100` : '—'],
  ]))
  c.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: ['Score Range', 'Number of Students'].map(h =>
          new TableCell({
            shading: { fill: BRAND_BLUE },
            children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 22, color: 'FFFFFF' })] })],
          })
        ),
      }),
      ...[ ['Below 40', report.marks?.below40], ['40 – 70', report.marks?.mid], ['Above 70', report.marks?.above70] ]
        .map(([range, val]) => new TableRow({
          children: [range, String(val ?? '—')].map(v =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 22 })] })] })
          ),
        })),
    ],
  }))
  c.push(pageBreak())

  // 8. Top 3 Leaderboard
  c.push(heading('8. Top 3 Leaderboard'))
  if (toppers.length) {
    c.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['Rank', 'Name', 'Roll No.', 'Project'].map(h =>
            new TableCell({
              shading: { fill: BRAND_BLUE },
              children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 22, color: 'FFFFFF' })] })],
            })
          ),
        }),
        ...toppers.map(s => new TableRow({
          children: [String(s.rank), s.name, s.roll || '—', s.project || '—'].map(v =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 22 })] })] })
          ),
        })),
      ],
    }))
  } else {
    c.push(para('No topper data found for this section and cycle. Please upload top 3 students from the Manage page.'))
  }
  c.push(pageBreak())

  // 9. Recommendations
  c.push(heading('9. Recommendations'))
  if (report.recommendations?.length) report.recommendations.forEach(r => c.push(bullet(r)))
  else c.push(para('No recommendations recorded.'))
  c.push(pageBreak())

  // 10. Overall Conclusion
  c.push(heading('10. Overall Conclusion'))
  const summaryParas = (report.summary || '').split('\n').filter(Boolean)
  if (summaryParas.length) {
    summaryParas.forEach(p => c.push(para(p)))
  } else {
    c.push(
      para(`The ${report.cycle} of the Skill Lab Program for Section ${report.section} has been completed successfully.`),
      para(`Students showed consistent improvement across assessed parameters. The trainer and co-trainer worked collaboratively to ensure learning outcomes were met.`),
      para(`The program continues to serve as a strong bridge between academic curriculum and industry-relevant skills for students of ${report.stream}, ${report.course}.`),
    )
  }

  return c
}

// ── Generate single report DOCX ────────────────────────────────────
async function generateSingleDocx(report) {
  const children = await buildSectionChildren(report, 0)
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `SHEAT SkillLab · ${report.cycle} · Section ${report.section}`, font: FONT, size: 18 })],
          })],
        }),
      },
      children,
    }],
  })
  return Packer.toBuffer(doc)
}

// ── Generate combined report DOCX (all sections for a cycle) ───────
async function generateCombinedDocx(reports, cycle) {
  // Cover page for the combined report
  const coverChildren = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 300 }, children: [new TextRun({ text: 'SHEAT College of Engineering', font: FONT, size: 40, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Department of Computer Science & Engineering', font: FONT, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: '— SKILL LAB PROGRAM —', font: FONT, size: 26, bold: true, italics: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `Combined Cycle Report`, font: FONT, size: 32, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: cycle, font: FONT, size: 30, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Total Sections: ${reports.length}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Report Date: ${fmt(new Date())}`, font: FONT, size: 22 })] }),
    new Paragraph({ spacing: { after: 300 } }),
    // Table of contents — list all sections
    infoTable([
      ['#', 'Section Details'],
      ...reports.map((r, i) => [
        String(i + 1),
        `${r.section} · ${r.stream} · ${r.course} · ${r.year} — Trainer: ${r.trainer?.name || '—'}`,
      ]),
    ]),
    pageBreak(),
  ]

  // Build each section's content
  const allSectionChildren = []
  for (let i = 0; i < reports.length; i++) {
    const sectionChildren = await buildSectionChildren(reports[i], i)
    allSectionChildren.push(...sectionChildren)
  }

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `SHEAT SkillLab · ${cycle} · Combined Report`, font: FONT, size: 18 })],
          })],
        }),
      },
      children: [...coverChildren, ...allSectionChildren],
    }],
  })
  return Packer.toBuffer(doc)
}

// ── Main handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  await connectDB()
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })
  if (user.role === 'cotrainer') return res.status(403).json({ error: 'Forbidden' })

  const url = req.url || ''

  // ── Routes without :id ─────────────────────────────────────────
  if (!req.query.id) {

    // GET /api/reports — list
    if (req.method === 'GET') {

      // Combined download: /api/reports?combined=1&cycle=Cycle+3
      if (req.query.combined === '1') {
        if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
        const { cycle } = req.query
        if (!cycle) return res.status(400).json({ error: 'cycle required' })
        const reports = await SectionCycle.find({ cycle, status: { $in: ['submitted', 'locked'] } })
          .populate('trainer', 'name')
          .sort({ stream: 1, course: 1, section: 1 })
        if (reports.length === 0) return res.status(404).json({ error: 'No submitted reports found for this cycle' })
        const buffer   = await generateCombinedDocx(reports, cycle)
        const filename = `SkillLab_${cycle}_Combined_Report.docx`.replace(/\s+/g, '_')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        return res.send(buffer)
      }

      let query = {}
      if (user.role === 'superadmin') {
        const { stream, course, cycle, status } = req.query
        if (stream) query.stream = stream
        if (course) query.course = course
        if (cycle)  query.cycle  = cycle
        if (status) query.status = status
      } else {
        query.trainer = user._id
        const { stream, course, year, sem, section, cycle } = req.query
        if (stream)  query.stream  = stream
        if (course)  query.course  = course
        if (year)    query.year    = year
        if (sem)     query.sem     = sem
        if (section) query.section = section
        if (cycle)   query.cycle   = cycle
      }
      const reports = await SectionCycle.find(query)
        .populate('trainer', 'name email')
        .populate('lockedBy', 'name')
        .sort({ updatedAt: -1 })
      return res.status(200).json(reports)
    }

    // POST /api/reports — create or upsert
    if (req.method === 'POST') {
      const { stream, course, year, sem, section, cycle, ...rest } = req.body
      if (!stream || !course || !year || !sem || !section || !cycle)
        return res.status(400).json({ error: 'stream, course, year, sem, section, cycle are required' })

      if (user.role !== 'superadmin') {
        const allowed = user.assignedSections?.some(a =>
          a.stream === stream && a.course === course &&
          a.sections?.includes(section) && a.year === year && a.sem === sem
        )
        if (!allowed) return res.status(403).json({ error: 'You are not assigned to this section' })
      }

      const identity = { stream, course, year, sem, section, cycle }
      const existing = await SectionCycle.findOne(identity)
      if (existing?.status === 'locked')
        return res.status(403).json({ error: 'Report is locked by superadmin' })

      const report = await SectionCycle.findOneAndUpdate(
        identity,
        { $set: { trainer: existing?.trainer || user._id, ...rest } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).populate('trainer', 'name email')

      return res.status(200).json(report)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Routes with :id ────────────────────────────────────────────
  const isDownload = url.includes('/download')
  const isSubmit   = url.includes('/submit')
  const isLock     = url.includes('/lock')
  const rawId      = String(req.query.id)

  const report = await SectionCycle.findById(rawId)
    .populate('trainer', 'name email role assignedSections')
    .populate('lockedBy', 'name')
  if (!report) return res.status(404).json({ error: 'Report not found' })

  // GET /api/reports/:id/download — single report
  if (req.method === 'GET' && isDownload) {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
    const buffer   = await generateSingleDocx(report)
    const filename = `SkillLab_${report.cycle}_${report.section}_Report.docx`.replace(/\s+/g, '_')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(buffer)
  }

  // GET /api/reports/:id
  if (req.method === 'GET') {
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id))
      return res.status(403).json({ error: 'Forbidden' })
    return res.status(200).json(report)
  }

  // PATCH /api/reports/:id — trainer can edit draft OR submitted (not locked)
  if (req.method === 'PATCH' && !isSubmit && !isLock) {
    if (report.status === 'locked')
      return res.status(403).json({ error: 'Report is locked by superadmin' })
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id))
      return res.status(403).json({ error: 'Forbidden' })

    const allowed = [
      'coTrainerName','startDate','endDate','projectConducted',
      'attendance','marks','avgMarks',
      'engagementLevel','skillProgressLevel','topicsCovered',
      'challenges','operationalChallenges','achievements',
      'recommendations','summary',
    ]
    const update = {}
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key]
    const updated = await SectionCycle.findByIdAndUpdate(rawId, { $set: update }, { new: true })
      .populate('trainer', 'name email')
    return res.status(200).json(updated)
  }

  // POST /api/reports/:id/submit
  if (req.method === 'POST' && isSubmit) {
    if (report.status === 'locked')
      return res.status(403).json({ error: 'Report is locked' })
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id))
      return res.status(403).json({ error: 'Forbidden' })
    report.status = 'submitted'
    report.submittedAt = new Date()
    await report.save()
    return res.status(200).json(report)
  }

  // POST /api/reports/:id/lock
  if (req.method === 'POST' && isLock) {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
    if (report.status === 'locked') return res.status(400).json({ error: 'Already locked' })
    report.status   = 'locked'
    report.lockedAt = new Date()
    report.lockedBy = user._id
    await report.save()
    return res.status(200).json(report)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}