import { cors, getUser } from './_helpers.js'
import { connectDB }     from './_db.js'
import { SectionCycle, Student } from './_models.js'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType,
  PageBreak, Footer, PageNumber,
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
    children: [new TextRun({ text, font: FONT, size: 22, ...opts })],
  })
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 100 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  })
}
function infoTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, shading: { fill: 'EBF0F7' }, children: [new Paragraph({ children: [new TextRun({ text: label, font: FONT, bold: true, size: 22 })] })] }),
        new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(value ?? '—'), font: FONT, size: 22 })] })] }),
      ],
    })),
  })
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }) }
function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function generateDocx(report) {
  const toppers = await Student.find({
    stream: report.stream, course: report.course,
    year: report.year, sem: report.sem,
    section: report.section, cycle: report.cycle,
  }).sort({ rank: 1 }).limit(3)

  const children = []

  // Cover page
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 300 }, children: [new TextRun({ text: 'SHEAT College of Engineering', font: FONT, size: 36, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Department of Computer Science & Engineering', font: FONT, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: '— SKILL LAB PROGRAM —', font: FONT, size: 24, bold: true, italics: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Cycle Report: ${report.cycle}`, font: FONT, size: 28, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `${report.stream} · ${report.course} · ${report.year} · ${report.sem}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Section: ${report.section}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Trainer: ${report.trainer?.name || '—'}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Co-Trainer: ${report.coTrainerName || '—'}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `Report Date: ${fmt(new Date())}`, font: FONT, size: 22 })] }),
    pageBreak(),
  )

  // 1. Cycle Overview
  children.push(heading('1. Cycle Overview'))
  children.push(infoTable([
    ['Cycle', report.cycle], ['Stream', report.stream], ['Course', report.course],
    ['Year / Sem', `${report.year} · ${report.sem}`], ['Section', report.section],
    ['Start Date', fmt(report.startDate)], ['End Date', fmt(report.endDate)],
    ['Project Conducted', report.projectConducted ? 'Yes' : 'No'],
  ]))
  children.push(
    para(`This report covers the ${report.cycle} of the Skill Lab Program for ${report.stream} students of ${report.course}, ${report.year}, Section ${report.section}. The cycle ran from ${fmt(report.startDate)} to ${fmt(report.endDate)}.`),
    para(`The primary focus of this cycle was to strengthen students' practical skills. ${report.projectConducted ? 'A project component was conducted.' : 'No formal project was conducted this cycle.'}`),
    pageBreak(),
  )

  // 2. Class-wise Progress
  children.push(heading('2. Class-wise Progress'))
  children.push(para('Topics Covered:', { bold: true }))
  if (report.topicsCovered?.length) report.topicsCovered.forEach(t => children.push(bullet(t)))
  else children.push(para('No topics recorded.'))
  children.push(
    para(`Students demonstrated progressive understanding of the topics listed above. Hands-on sessions were conducted alongside theoretical instruction.`),
    para(`Skill progress was assessed as: ${report.skillProgressLevel || '—'}. Overall engagement: ${report.engagementLevel || '—'}.`),
    pageBreak(),
  )

  // 3. Attendance Analysis
  children.push(heading('3. Attendance Analysis'))
  children.push(infoTable([
    ['Total Students', report.attendance?.totalStudents ?? '—'],
    ['Average Attendance %', report.attendance?.avgPercent != null ? `${report.attendance.avgPercent}%` : '—'],
  ]))
  children.push(
    para(`The section had ${report.attendance?.totalStudents ?? '—'} enrolled students with an average attendance of ${report.attendance?.avgPercent ?? '—'}%.`),
    para('Students with attendance below 75% were individually counselled and encouraged to improve regularity.'),
    pageBreak(),
  )

  // 4. Trainer Observations
  children.push(heading('4. Trainer Observations'))
  children.push(para(`Engagement Level: ${report.engagementLevel || '—'}`, { bold: true }))
  children.push(para(report.challenges || 'No specific observations recorded.'), pageBreak())

  // 5. Challenges Faced
  children.push(heading('5. Challenges Faced'))
  children.push(para('Operational Challenges:', { bold: true }))
  if (report.operationalChallenges) report.operationalChallenges.split('\n').filter(Boolean).forEach(l => children.push(bullet(l)))
  else children.push(para('None reported.'))
  children.push(para('Academic Challenges:', { bold: true }))
  if (report.challenges) report.challenges.split('\n').filter(Boolean).forEach(l => children.push(bullet(l)))
  else children.push(para('None reported.'))
  children.push(pageBreak())

  // 6. Key Achievements
  children.push(heading('6. Key Achievements'))
  children.push(para(report.achievements || 'No achievements recorded.'), pageBreak())

  // 7. Score Distribution
  children.push(heading('7. Score Distribution'))
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: ['Score Range','Number of Students'].map(h => new TableCell({ shading: { fill: BRAND_BLUE }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 22, color: 'FFFFFF' })] })] })) }),
      ...[ ['Below 40', report.marks?.below40], ['40 – 70', report.marks?.mid], ['Above 70', report.marks?.above70] ]
        .map(([range, val]) => new TableRow({ children: [range, String(val ?? '—')].map(v => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 22 })] })] })) })),
    ],
  }))
  children.push(pageBreak())

  // 8. Top 3 Leaderboard
  children.push(heading('8. Top 3 Leaderboard'))
  if (toppers.length) {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Rank','Name','Roll No.','Project'].map(h => new TableCell({ shading: { fill: BRAND_BLUE }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 22, color: 'FFFFFF' })] })] })) }),
        ...toppers.map(s => new TableRow({ children: [String(s.rank), s.name, s.roll||'—', s.project||'—'].map(v => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 22 })] })] })) })),
      ],
    }))
  } else {
    children.push(para('No topper data found for this section and cycle.'))
  }
  children.push(pageBreak())

  // 9. Recommendations
  children.push(heading('9. Recommendations'))
  if (report.recommendations?.length) report.recommendations.forEach(r => children.push(bullet(r)))
  else children.push(para('No recommendations recorded.'))
  children.push(pageBreak())

  // 10. Overall Conclusion
  children.push(heading('10. Overall Conclusion'))
  const summaryParas = (report.summary || '').split('\n').filter(Boolean)
  if (summaryParas.length) summaryParas.forEach(p => children.push(para(p)))
  else {
    children.push(
      para(`The ${report.cycle} of the Skill Lab Program for Section ${report.section} has been completed successfully.`),
      para(`Students showed consistent improvement across assessed parameters. The trainer and co-trainer worked collaboratively to ensure learning outcomes were met.`),
      para(`The program continues to serve as a strong bridge between academic curriculum and industry-relevant skills for students of ${report.stream}, ${report.course}.`),
    )
  }

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `SHEAT SkillLab · ${report.cycle} · Section ${report.section}   |   Page `, font: FONT, size: 18 }),
              new PageNumber(),
            ],
          })],
        }),
      },
      children,
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

  // ── Route: /api/reports (no id) ────────────────────────────────
  if (!req.query.id) {

    // GET /api/reports — list
    if (req.method === 'GET') {
      let query = {}
      if (user.role === 'superadmin') {
        const { stream, course, cycle, status } = req.query
        if (stream) query.stream = stream
        if (course) query.course = course
        if (cycle)  query.cycle  = cycle
        if (status) query.status = status
      } else {
        query.trainer = user._id
        // Also allow filtering by section+cycle for loading existing report
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

    // POST /api/reports — create or upsert draft
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
      if (existing?.status === 'locked') return res.status(403).json({ error: 'Report is locked' })
      if (existing?.status === 'submitted' && user.role !== 'superadmin')
        return res.status(403).json({ error: 'Report already submitted' })

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

  // GET /api/reports/:id/download
  if (req.method === 'GET' && isDownload) {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
    const buffer   = await generateDocx(report)
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

  // PATCH /api/reports/:id
  if (req.method === 'PATCH' && !isSubmit && !isLock) {
    if (report.status === 'locked') return res.status(403).json({ error: 'Report is locked' })
    if (report.status === 'submitted' && user.role !== 'superadmin')
      return res.status(403).json({ error: 'Report already submitted' })
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id))
      return res.status(403).json({ error: 'Forbidden' })

    const allowed = ['coTrainerName','startDate','endDate','projectConducted','attendance','marks',
      'engagementLevel','skillProgressLevel','topicsCovered','challenges',
      'operationalChallenges','achievements','recommendations','summary']
    const update = {}
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key]

    const updated = await SectionCycle.findByIdAndUpdate(rawId, { $set: update }, { new: true })
      .populate('trainer', 'name email')
    return res.status(200).json(updated)
  }

  // POST /api/reports/:id/submit
  if (req.method === 'POST' && isSubmit) {
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id))
      return res.status(403).json({ error: 'Forbidden' })
    if (report.status === 'locked')    return res.status(403).json({ error: 'Report is locked' })
    if (report.status === 'submitted') return res.status(400).json({ error: 'Already submitted' })
    report.status = 'submitted'; report.submittedAt = new Date()
    await report.save()
    return res.status(200).json(report)
  }

  // POST /api/reports/:id/lock
  if (req.method === 'POST' && isLock) {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
    if (report.status !== 'submitted') return res.status(400).json({ error: 'Only submitted reports can be locked' })
    report.status = 'locked'; report.lockedAt = new Date(); report.lockedBy = user._id
    await report.save()
    return res.status(200).json(report)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}