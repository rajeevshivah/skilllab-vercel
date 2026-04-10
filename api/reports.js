import { cors, getUser } from './_helpers.js'
import { connectDB }     from './_db.js'
import { SectionCycle, Student } from './_models.js'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle,
  PageBreak, Footer,
} from 'docx'

const BRAND_BLUE = '1A3C5E'
const FONT       = 'Arial'
const PAGE_WIDTH = 9026 // A4 with 1 inch margins in DXA

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
function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: BRAND_BLUE })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE, space: 4 } },
  })
}
function tableCell(text, opts = {}) {
  const { bold = false, bg = 'FFFFFF', color = '1F2937', size = 18 } = opts
  return new TableCell({
    shading: { fill: bg },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? '—'), font: FONT, size, bold, color })] })]
  })
}
function headerCell(text) {
  return tableCell(text, { bold: true, bg: BRAND_BLUE, color: 'FFFFFF', size: 18 })
}

// ── OpenAI narrative generator ─────────────────────────────────────
async function callOpenAI(prompt) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
  } catch {
    return ''
  }
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

  c.push(heading('1. Cycle Overview'))
  c.push(infoTable([
    ['Cycle', report.cycle], ['Stream', report.stream], ['Course', report.course],
    ['Year / Sem', `${report.year} · ${report.sem}`], ['Section', report.section],
    ['Start Date', fmt(report.startDate)], ['End Date', fmt(report.endDate)],
    ['Project Conducted', report.projectConducted ? 'Yes' : 'No'],
  ]))
  c.push(
    para(`This report covers the ${report.cycle} of the Skill Lab Program for ${report.stream} students of ${report.course}, ${report.year}, Section ${report.section}. The cycle ran from ${fmt(report.startDate)} to ${fmt(report.endDate)}.`),
    para(`The primary focus of this cycle was to strengthen students' practical skills. ${report.projectConducted ? 'A project component was conducted.' : 'No formal project was conducted this cycle.'}`),
    pageBreak(),
  )

  c.push(heading('2. Class-wise Progress'))
  c.push(para('Topics Covered:', { bold: true }))
  if (report.topicsCovered?.length) report.topicsCovered.forEach(t => c.push(bullet(t)))
  else c.push(para('No topics recorded.'))
  c.push(
    para(`Students demonstrated progressive understanding of the topics listed above. Hands-on sessions were conducted alongside theoretical instruction.`),
    para(`Skill progress was assessed as: ${report.skillProgressLevel || '—'}. Overall engagement: ${report.engagementLevel || '—'}.`),
    pageBreak(),
  )

  c.push(heading('3. Attendance Analysis'))
  c.push(infoTable([
    ['Total Students', report.attendance?.totalStudents ?? '—'],
    ['Average Attendance %', report.attendance?.avgPercent != null ? `${report.attendance.avgPercent}%` : '—'],
  ]))
  c.push(
    para(`The section had ${report.attendance?.totalStudents ?? '—'} enrolled students with an average attendance of ${report.attendance?.avgPercent ?? '—'}%.`),
    para('Students with attendance below 75% were individually counselled and encouraged to improve regularity.'),
    pageBreak(),
  )

  c.push(heading('4. Trainer Observations'))
  c.push(para(`Engagement Level: ${report.engagementLevel || '—'}`, { bold: true }))
  c.push(para(report.challenges || 'No specific observations recorded.'), pageBreak())

  c.push(heading('5. Challenges Faced'))
  c.push(para('Operational Challenges:', { bold: true }))
  if (report.operationalChallenges) report.operationalChallenges.split('\n').filter(Boolean).forEach(l => c.push(bullet(l)))
  else c.push(para('None reported.'))
  c.push(para('Academic Challenges:', { bold: true }))
  if (report.challenges) report.challenges.split('\n').filter(Boolean).forEach(l => c.push(bullet(l)))
  else c.push(para('None reported.'))
  c.push(pageBreak())

  c.push(heading('6. Key Achievements'))
  c.push(para(report.achievements || 'No achievements recorded.'), pageBreak())

  c.push(heading('7. Score Distribution'))
  c.push(infoTable([['Average Marks', report.avgMarks != null ? `${report.avgMarks} / 100` : '—']]))
  c.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: ['Score Range', 'Number of Students'].map(h => new TableCell({ shading: { fill: BRAND_BLUE }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 22, color: 'FFFFFF' })] })] })) }),
      ...[ ['Below 40', report.marks?.below40], ['40 – 70', report.marks?.mid], ['Above 70', report.marks?.above70] ]
        .map(([range, val]) => new TableRow({ children: [range, String(val ?? '—')].map(v => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 22 })] })] })) })),
    ],
  }))
  c.push(pageBreak())

  c.push(heading('8. Top 3 Leaderboard'))
  if (toppers.length) {
    c.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: ['Rank', 'Name', 'Roll No.', 'Project'].map(h => new TableCell({ shading: { fill: BRAND_BLUE }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 22, color: 'FFFFFF' })] })] })) }),
        ...toppers.map(s => new TableRow({ children: [String(s.rank), s.name, s.roll || '—', s.project || '—'].map(v => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 22 })] })] })) })),
      ],
    }))
  } else {
    c.push(para('No topper data found for this section and cycle. Please upload top 3 students from the Manage page.'))
  }
  c.push(pageBreak())

  c.push(heading('9. Recommendations'))
  if (report.recommendations?.length) report.recommendations.forEach(r => c.push(bullet(r)))
  else c.push(para('No recommendations recorded.'))
  c.push(pageBreak())

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
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SHEAT SkillLab · ${report.cycle} · Section ${report.section}`, font: FONT, size: 18 })] })] }) },
      children,
    }],
  })
  return Packer.toBuffer(doc)
}

// ── Generate combined report DOCX ──────────────────────────────────
async function generateCombinedDocx(reports, cycle) {
  const coverChildren = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 300 }, children: [new TextRun({ text: 'SHEAT College of Engineering', font: FONT, size: 40, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Department of Computer Science & Engineering', font: FONT, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: '— SKILL LAB PROGRAM —', font: FONT, size: 26, bold: true, italics: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Combined Cycle Report', font: FONT, size: 32, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: cycle, font: FONT, size: 30, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Total Sections: ${reports.length}`, font: FONT, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Report Date: ${fmt(new Date())}`, font: FONT, size: 22 })] }),
    new Paragraph({ spacing: { after: 300 } }),
    infoTable([['#', 'Section Details'], ...reports.map((r, i) => [String(i + 1), `${r.section} · ${r.stream} · ${r.course} · ${r.year} — Trainer: ${r.trainer?.name || '—'}`])]),
    pageBreak(),
  ]
  const allSectionChildren = []
  for (let i = 0; i < reports.length; i++) {
    const sectionChildren = await buildSectionChildren(reports[i], i)
    allSectionChildren.push(...sectionChildren)
  }
  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SHEAT SkillLab · ${cycle} · Combined Report`, font: FONT, size: 18 })] })] }) },
      children: [...coverChildren, ...allSectionChildren],
    }],
  })
  return Packer.toBuffer(doc)
}

// ── Generate executive summary DOCX ────────────────────────────────
async function generateExecutiveSummary(reports, cycle) {
  const sectionData = await Promise.all(reports.map(async r => {
    const toppers = await Student.find({ stream: r.stream, course: r.course, year: r.year, sem: r.sem, section: r.section, cycle: r.cycle }).sort({ rank: 1 }).limit(1)
    return { report: r, rank1: toppers[0] || null }
  }))

  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
  const borders = { top: border, bottom: border, left: border, right: border }
  const children = []

  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 160 }, children: [new TextRun({ text: 'SHEAT College of Engineering', font: FONT, size: 32, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'Skill Lab Program — Executive Summary', font: FONT, size: 26, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `${cycle}   |   Date: ${fmt(new Date())}   |   Total Sections: ${reports.length}`, font: FONT, size: 20, color: '666666' })] }),
    new Paragraph({ spacing: { before: 160, after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND_BLUE, space: 1 } }, children: [new TextRun('')] }),
  )

  children.push(new Paragraph({ spacing: { before: 0, after: 160 }, children: [new TextRun({ text: 'Section-wise Performance Overview', font: FONT, size: 24, bold: true, color: BRAND_BLUE })] }))

  const colW = [Math.round(PAGE_WIDTH*0.12), Math.round(PAGE_WIDTH*0.20), Math.round(PAGE_WIDTH*0.16), Math.round(PAGE_WIDTH*0.09), Math.round(PAGE_WIDTH*0.09), Math.round(PAGE_WIDTH*0.09), Math.round(PAGE_WIDTH*0.12), Math.round(PAGE_WIDTH*0.13)]
  children.push(new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: colW,
    rows: [
      new TableRow({ tableHeader: true, children: ['Section','Stream / Course','Trainer','Students','Attend%','Avg Marks','Engagement','Rank 1'].map((h,i) => new TableCell({ width:{size:colW[i],type:WidthType.DXA}, shading:{fill:BRAND_BLUE}, margins:{top:80,bottom:80,left:80,right:80}, children:[new Paragraph({children:[new TextRun({text:h,font:FONT,bold:true,size:16,color:'FFFFFF'})]})] })) }),
      ...sectionData.map(({report:r,rank1}) => new TableRow({ children: [r.section,`${r.stream}/${r.course}`,r.trainer?.name||'—',r.attendance?.totalStudents!=null?String(r.attendance.totalStudents):'—',r.attendance?.avgPercent!=null?`${r.attendance.avgPercent}%`:'—',r.avgMarks!=null?`${r.avgMarks}/100`:'—',r.engagementLevel||'—',rank1?.name||'—'].map((v,i) => new TableCell({width:{size:colW[i],type:WidthType.DXA},borders,margins:{top:70,bottom:70,left:80,right:80},children:[new Paragraph({children:[new TextRun({text:String(v),font:FONT,size:17})]})]}))}))
    ]
  }))

  const scoreColW = [Math.round(PAGE_WIDTH*0.18),Math.round(PAGE_WIDTH*0.22),Math.round(PAGE_WIDTH*0.15),Math.round(PAGE_WIDTH*0.15),Math.round(PAGE_WIDTH*0.15),Math.round(PAGE_WIDTH*0.15)]
  children.push(new Paragraph({ spacing:{before:280,after:160}, children:[new TextRun({text:'Score Distribution',font:FONT,size:24,bold:true,color:BRAND_BLUE})] }))
  children.push(new Table({
    width:{size:PAGE_WIDTH,type:WidthType.DXA}, columnWidths:scoreColW,
    rows:[
      new TableRow({tableHeader:true, children:['Section','Stream / Course','Below 40','40 – 70','Above 70','Avg Marks'].map((h,i)=>new TableCell({width:{size:scoreColW[i],type:WidthType.DXA},shading:{fill:BRAND_BLUE},margins:{top:80,bottom:80,left:80,right:80},children:[new Paragraph({children:[new TextRun({text:h,font:FONT,bold:true,size:16,color:'FFFFFF'})]})]}))}),
      ...reports.map(r=>new TableRow({children:[r.section,`${r.course}·${r.year}`,r.marks?.below40!=null?String(r.marks.below40):'—',r.marks?.mid!=null?String(r.marks.mid):'—',r.marks?.above70!=null?String(r.marks.above70):'—',r.avgMarks!=null?`${r.avgMarks}/100`:'—'].map((v,i)=>new TableCell({width:{size:scoreColW[i],type:WidthType.DXA},borders,margins:{top:70,bottom:70,left:80,right:80},children:[new Paragraph({children:[new TextRun({text:v,font:FONT,size:17})]})]}))}))
    ]
  }))

  const allAchievements = reports.map(r=>r.achievements).filter(Boolean)
  if (allAchievements.length) {
    children.push(new Paragraph({spacing:{before:280,after:120},children:[new TextRun({text:'Key Highlights',font:FONT,size:24,bold:true,color:BRAND_BLUE})]}))
    allAchievements.flatMap(a=>a.split('\n').filter(Boolean)).slice(0,4).forEach(line=>children.push(new Paragraph({bullet:{level:0},spacing:{after:80},children:[new TextRun({text:line,font:FONT,size:20})]})))
  }
  const allChallenges = reports.flatMap(r=>[r.challenges,r.operationalChallenges]).filter(Boolean)
  if (allChallenges.length) {
    children.push(new Paragraph({spacing:{before:240,after:120},children:[new TextRun({text:'Challenges & Areas for Improvement',font:FONT,size:24,bold:true,color:BRAND_BLUE})]}))
    allChallenges.flatMap(c=>c.split('\n').filter(Boolean)).slice(0,4).forEach(line=>children.push(new Paragraph({bullet:{level:0},spacing:{after:80},children:[new TextRun({text:line,font:FONT,size:20})]})))
  }
  const allRecs = [...new Set(reports.flatMap(r=>r.recommendations||[]).filter(Boolean))].slice(0,4)
  if (allRecs.length) {
    children.push(new Paragraph({spacing:{before:240,after:120},children:[new TextRun({text:'Recommendations',font:FONT,size:24,bold:true,color:BRAND_BLUE})]}))
    allRecs.forEach(rec=>children.push(new Paragraph({bullet:{level:0},spacing:{after:80},children:[new TextRun({text:rec,font:FONT,size:20})]})))
  }
  children.push(
    new Paragraph({spacing:{before:280,after:0},border:{top:{style:BorderStyle.SINGLE,size:4,color:BRAND_BLUE,space:1}},children:[new TextRun('')]}),
    new Paragraph({spacing:{before:140,after:0},children:[new TextRun({text:`This summary covers ${reports.length} section(s) for ${cycle}. Detailed section-wise reports are available separately.`,font:FONT,size:18,italics:true,color:'777777'})]})
  )

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SHEAT SkillLab · ${cycle} · Executive Summary · Confidential`, font: FONT, size: 16, color: '888888' })] })] }) },
      children,
    }],
  })
  return Packer.toBuffer(doc)
}

// ── Generate consolidated master report (matches Cycle 2 format) ───
async function generateConsolidatedDocx(reports, reportingPeriod) {
  // Pull all toppers for all reports
  const allToppers = await Promise.all(reports.map(async r => {
    const toppers = await Student.find({ stream: r.stream, course: r.course, year: r.year, sem: r.sem, section: r.section, cycle: r.cycle }).sort({ rank: 1 }).limit(3)
    return { report: r, toppers }
  }))

  // Group reports by stream for stream-wise sections
  const streamGroups = {}
  allToppers.forEach(({ report: r, toppers }) => {
    if (!streamGroups[r.stream]) streamGroups[r.stream] = []
    streamGroups[r.stream].push({ report: r, toppers })
  })

  // Collect unique streams, trainers, cycles, programs
  const streams     = [...new Set(reports.map(r => r.stream))]
  const trainerNames = [...new Set(reports.map(r => r.trainer?.name).filter(Boolean))]
  const cycles      = [...new Set(reports.map(r => r.cycle))]
  const programs    = [...new Set(reports.map(r => `${r.course} (${r.sem})`))]
  const totalToppers = allToppers.reduce((sum, { toppers }) => sum + toppers.length, 0)

  // Data summary for OpenAI prompts
  const dataSummary = reports.map(r =>
    `Section: ${r.section} | Stream: ${r.stream} | Course: ${r.course} | Year: ${r.year} | Trainer: ${r.trainer?.name || '—'} | Attendance: ${r.attendance?.avgPercent ?? 'N/R'}% | Avg Marks: ${r.avgMarks ?? 'N/R'}/100 | Below 40: ${r.marks?.below40 ?? 'N/R'} | 40-70: ${r.marks?.mid ?? 'N/R'} | Above 70: ${r.marks?.above70 ?? 'N/R'} | Engagement: ${r.engagementLevel || 'N/R'} | Skill Progress: ${r.skillProgressLevel || 'N/R'} | Achievements: ${r.achievements || 'None'} | Challenges: ${r.challenges || 'None'} | Operational Issues: ${r.operationalChallenges || 'None'}`
  ).join('\n')

  // Call OpenAI for narrative sections in parallel
  const [execSummaryText, progOverviewText, achievementsText, conclusionText] = await Promise.all([
    callOpenAI(`You are writing the Executive Summary section of a Skill Lab program report for college management (MD/Dean/Director). Write 2 concise paragraphs (total ~120 words) summarizing program health and key findings. Be specific, professional, and direct. Data:\n${dataSummary}\nReporting period: ${reportingPeriod}\nTotal sections: ${reports.length}, Streams: ${streams.join(', ')}`),
    callOpenAI(`Write 2 short paragraphs (~80 words) describing the Skill Lab Program at SHEAT College — what it is, its purpose, and scope for this reporting period. Reporting period: ${reportingPeriod}. Sections covered: ${reports.length}. Streams: ${streams.join(', ')}. Programs: ${programs.join(', ')}. Keep it formal and concise.`),
    callOpenAI(`Write a "Key Achievements" section as 5-6 bullet points for a college management report. Be specific and positive. Data:\n${dataSummary}\nFormat: just the bullet text, one per line, no bullet symbols.`),
    callOpenAI(`Write the "Overall Conclusion" section of a Skill Lab program report for college management. Write exactly 3 paragraphs (~50 words each). Be analytical, professional, and end on a forward-looking note. Data:\n${dataSummary}\nReporting period: ${reportingPeriod}`),
  ])

  // Stream-wise observations from OpenAI
  const streamObservations = {}
  for (const stream of streams) {
    const streamReports = streamGroups[stream]
    const streamData = streamReports.map(({ report: r }) =>
      `Section: ${r.section} | Attendance: ${r.attendance?.avgPercent ?? 'N/R'}% | Avg Marks: ${r.avgMarks ?? 'N/R'} | Below 40: ${r.marks?.below40 ?? 'N/R'} | Above 70: ${r.marks?.above70 ?? 'N/R'} | Engagement: ${r.engagementLevel || 'N/R'} | Challenges: ${r.challenges || 'None'} | Achievements: ${r.achievements || 'None'}`
    ).join('\n')
    streamObservations[stream] = await callOpenAI(`Write 4-5 bullet point observations for the "${stream}" stream in a Skill Lab program report. Be specific and analytical. Each bullet should be one sentence. Data:\n${streamData}\nFormat: just the observation text, one per line, no bullet symbols.`)
  }

  // Recommendations from OpenAI
  const recsText = await callOpenAI(`Write recommendations split into two groups for a Skill Lab program report:\n1. "Administrative / Institutional Actions" — 3-4 bullet points\n2. "Curriculum / Academic Actions" — 3-4 bullet points\nBe specific and actionable. Data:\n${dataSummary}\nFormat:\nADMINISTRATIVE:\n[bullets]\nCURRICULUM:\n[bullets]`)

  // Parse recommendations
  const adminRecs = []
  const curriculumRecs = []
  let currentSection = null
  recsText.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    if (trimmed.toUpperCase().includes('ADMINISTRATIVE')) { currentSection = 'admin'; return }
    if (trimmed.toUpperCase().includes('CURRICULUM')) { currentSection = 'curriculum'; return }
    const clean = trimmed.replace(/^[-•*]\s*/, '')
    if (clean && currentSection === 'admin') adminRecs.push(clean)
    if (clean && currentSection === 'curriculum') curriculumRecs.push(clean)
  })

  const children = []

  // ── COVER PAGE ──────────────────────────────────────────────────
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 200 }, children: [new TextRun({ text: 'SHEAT COLLEGE', font: FONT, size: 48, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: 'Department of Computer Science & Engineering', font: FONT, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: 'SKILL LAB PROGRAM', font: FONT, size: 28, bold: true, color: BRAND_BLUE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'MASTER CONSOLIDATED REPORT', font: FONT, size: 32, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: reportingPeriod, font: FONT, size: 24, color: '555555' })] }),
  )

  // Stats boxes row
const statsColW = Math.round(PAGE_WIDTH / 4)
  const statsData = [
    [String(reports.length), 'Sections Covered'],
    [String(streams.length), 'Skill Lab Streams'],
    [String(trainerNames.length), 'Trainers Reporting'],
    [String(totalToppers), 'Top Performers'],
  ]
  const statsCells = statsData.map(([num, label]) => new TableCell({
    shading: { fill: BRAND_BLUE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.SINGLE, size: 2, color: '2D5A8E' }, right: { style: BorderStyle.SINGLE, size: 2, color: '2D5A8E' } },
    margins: { top: 200, bottom: 200, left: 100, right: 100 },
    width: { size: statsColW, type: WidthType.DXA },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: FONT, size: 48, bold: true, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label, font: FONT, size: 18, color: 'BFD9F2' })] }),
    ]
  }))
  children.push(new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [statsColW, statsColW, statsColW, statsColW],
    rows: [new TableRow({ children: statsCells })]
  }))

  children.push(new Paragraph({ spacing: { after: 300 } }))

  // Metadata table
  children.push(infoTable([
    ['Report Type',         'Master Consolidated Cycle Report — For Management'],
    ['Intended Audience',   'MD / Dean / Director — SHEAT College'],
    ['Reporting Period',    reportingPeriod],
    ['Report Date',         fmt(new Date())],
    ['Cycles Covered',      cycles.join(', ')],
    ['Programs Covered',    programs.join(' | ')],
    ['Skill Lab Streams',   streams.join(' | ')],
  ]))

  children.push(
    new Paragraph({ spacing: { before: 300, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'STRICTLY CONFIDENTIAL — FOR SENIOR MANAGEMENT USE ONLY', font: FONT, size: 18, bold: true, color: 'C0392B' })] }),
    pageBreak(),
  )

  // ── SECTION 1: EXECUTIVE SUMMARY ───────────────────────────────
  children.push(sectionHeading('Section 1: Executive Summary'))
  execSummaryText.split('\n').filter(Boolean).forEach(p => children.push(para(p)))

  children.push(new Paragraph({ spacing: { before: 240, after: 160 }, children: [new TextRun({ text: 'Programme-wide Snapshot', font: FONT, size: 22, bold: true })] }))

  // Snapshot table
  const snapColW = [Math.round(PAGE_WIDTH*0.22), Math.round(PAGE_WIDTH*0.14), Math.round(PAGE_WIDTH*0.14), Math.round(PAGE_WIDTH*0.12), Math.round(PAGE_WIDTH*0.12), Math.round(PAGE_WIDTH*0.26)]
  children.push(new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: snapColW,
    rows: [
      new TableRow({ tableHeader: true, children: ['Skill Lab / Section', 'Year / Sem', 'Trainer', 'Attendance', 'Avg Marks', 'Top Metric'].map((h, i) => new TableCell({ width: { size: snapColW[i], type: WidthType.DXA }, shading: { fill: BRAND_BLUE }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 17, color: 'FFFFFF' })] })] })) }),
      ...reports.map(r => {
        const above70count = r.marks?.above70 ?? 0
        const total = (r.marks?.below40 ?? 0) + (r.marks?.mid ?? 0) + (r.marks?.above70 ?? 0)
        const above70pct = total > 0 ? Math.round((above70count / total) * 100) : 0
        return new TableRow({ children: [
          `${r.section} — ${r.course} ${r.year}`,
          `${r.year} / ${r.sem}`,
          r.trainer?.name || '—',
          r.attendance?.avgPercent != null ? `${r.attendance.avgPercent}%` : 'N/R',
          r.avgMarks != null ? `${r.avgMarks}/100` : 'N/R',
          `${above70pct}% above 70`,
        ].map((v, i) => new TableCell({ width: { size: snapColW[i], type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 17 })] })] })) })
      }),
    ]
  }))

  // Key highlights bullets
  children.push(new Paragraph({ spacing: { before: 300, after: 160 }, children: [new TextRun({ text: 'Key Highlights at a Glance', font: FONT, size: 22, bold: true })] }))
  achievementsText.split('\n').filter(l => l.trim()).slice(0, 6).forEach(line =>
    children.push(bullet(line.replace(/^[-•*]\s*/, '')))
  )
  children.push(pageBreak())

  // ── SECTION 2: PROGRAMME OVERVIEW ──────────────────────────────
  children.push(sectionHeading('Section 2: Programme Overview'))
  children.push(new Paragraph({ spacing: { before: 0, after: 120 }, children: [new TextRun({ text: 'About the Skill Lab Program', font: FONT, size: 22, bold: true })] }))
  progOverviewText.split('\n').filter(Boolean).forEach(p => children.push(para(p)))

  children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: `Reporting Period — Scope & Coverage`, font: FONT, size: 22, bold: true })] }))
  children.push(infoTable([
    ['Reporting Period',  reportingPeriod],
    ['Total Sections',    String(reports.length)],
    ['Cycles Covered',    cycles.join(', ')],
    ['Total Trainers',    String(trainerNames.length)],
    ['Streams',           streams.join(', ')],
    ['Leaderboard Entries', String(totalToppers)],
  ]))

  // Technology streams table
  children.push(new Paragraph({ spacing: { before: 300, after: 160 }, children: [new TextRun({ text: 'Technology Streams This Period', font: FONT, size: 22, bold: true })] }))
  const streamColW = [Math.round(PAGE_WIDTH*0.22), Math.round(PAGE_WIDTH*0.18), Math.round(PAGE_WIDTH*0.18), Math.round(PAGE_WIDTH*0.42)]
  children.push(new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: streamColW,
    rows: [
      new TableRow({ tableHeader: true, children: ['Stream', 'Year / Sem', 'Sections', 'Core Topics'].map((h, i) => new TableCell({ width: { size: streamColW[i], type: WidthType.DXA }, shading: { fill: BRAND_BLUE }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 17, color: 'FFFFFF' })] })] })) }),
      ...streams.map(stream => {
        const streamReps = streamGroups[stream]
        const years = [...new Set(streamReps.map(({ report: r }) => `${r.year} / ${r.sem}`))].join(', ')
        const sections = streamReps.map(({ report: r }) => r.section).join(', ')
        const topics = [...new Set(streamReps.flatMap(({ report: r }) => r.topicsCovered || []))].slice(0, 4).join(', ') || '—'
        return new TableRow({ children: [stream, years, sections, topics].map((v, i) => new TableCell({ width: { size: streamColW[i], type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 17 })] })] })) })
      })
    ]
  }))
  children.push(pageBreak())

  // ── SECTIONS 3+: ONE PER STREAM ────────────────────────────────
  let streamIndex = 3
  for (const stream of streams) {
    const streamReps = streamGroups[stream]
    const trainerName = streamReps[0]?.report?.trainer?.name || '—'
    const coTrainer = streamReps[0]?.report?.coTrainerName || '—'
    const startDate = streamReps.map(({ report: r }) => r.startDate).filter(Boolean).sort()[0]
    const endDate = streamReps.map(({ report: r }) => r.endDate).filter(Boolean).sort().reverse()[0]

    children.push(sectionHeading(`Section ${streamIndex}: ${stream}`))
   const streamSubtitle = [...new Set(streamReps.map(({ report: r }) => `${r.course} ${r.year}`))].join(' & ')
    children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: streamSubtitle, font: FONT, size: 22 })] }))
    children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Trainer: ${trainerName}${coTrainer !== '—' ? ` | Co-Trainer: ${coTrainer}` : ''} | Period: ${fmt(startDate)} – ${fmt(endDate)}`, font: FONT, size: 20, color: '555555' })] }))

    // Overview paragraph
    const streamTopics = [...new Set(streamReps.flatMap(({ report: r }) => r.topicsCovered || []))].slice(0, 5).join(', ')
    children.push(new Paragraph({ spacing: { before: 0, after: 120 }, children: [new TextRun({ text: 'Overview', font: FONT, size: 20, bold: true })] }))
const uniqueSections = [...new Map(streamReps.map(({ report: r }) => [`${r.course}-${r.year}-${r.section}`, `${r.course} ${r.year} Section ${r.section}`])).values()]
    children.push(para(`The ${stream} stream covers ${uniqueSections.join(' and ')}. Topics covered this cycle include: ${streamTopics || 'various practical topics'}. ${streamReps[0]?.report?.projectConducted ? 'A project was conducted this cycle.' : 'No project was conducted this cycle.'}`))
    // Section-wise comparison table
    if (streamReps.length > 0) {
      children.push(new Paragraph({ spacing: { before: 200, after: 120 }, children: [new TextRun({ text: 'Section-wise Summary', font: FONT, size: 20, bold: true })] }))
      const metrics = ['Progress Status', 'Attendance', 'Engagement', 'Skill Progress', 'Below 40', '40 – 70', 'Above 70', 'Avg Marks']
      const metricColW = Math.round(PAGE_WIDTH * 0.25)
      const sectionColW = Math.round((PAGE_WIDTH * 0.75) / streamReps.length)
      children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: [metricColW, ...streamReps.map(() => sectionColW)],
        rows: [
          // Header
          new TableRow({ tableHeader: true, children: [
            new TableCell({ width: { size: metricColW, type: WidthType.DXA }, shading: { fill: BRAND_BLUE }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: 'Metric', font: FONT, bold: true, size: 17, color: 'FFFFFF' })] })] }),
            ...streamReps.map(({ report: r }) => new TableCell({ width: { size: sectionColW, type: WidthType.DXA }, shading: { fill: BRAND_BLUE }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: `${r.section} (${r.course})`, font: FONT, bold: true, size: 17, color: 'FFFFFF' })] })] }))
          ]}),
          // Data rows
          ...metrics.map((metric, mi) => new TableRow({ children: [
            new TableCell({ width: { size: metricColW, type: WidthType.DXA }, shading: { fill: 'EBF0F7' }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: metric, font: FONT, bold: true, size: 17 })] })] }),
            ...streamReps.map(({ report: r }) => {
              const val = [
                r.skillProgressLevel || '—',
                r.attendance?.avgPercent != null ? `${r.attendance.avgPercent}%` : 'N/R',
                r.engagementLevel || '—',
                r.skillProgressLevel || '—',
                r.marks?.below40 != null ? String(r.marks.below40) : 'N/R',
                r.marks?.mid != null ? String(r.marks.mid) : 'N/R',
                r.marks?.above70 != null ? String(r.marks.above70) : 'N/R',
                r.avgMarks != null ? `${r.avgMarks}/100` : 'N/R',
              ][mi]
              return new TableCell({ width: { size: sectionColW, type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: val, font: FONT, size: 17 })] })] })
            })
          ]}))
        ]
      }))
    }

    // Trainer observations (AI generated)
    children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: 'Trainer Observations', font: FONT, size: 20, bold: true })] }))
    const obsText = streamObservations[stream] || ''
    obsText.split('\n').filter(l => l.trim()).forEach(line =>
      children.push(bullet(line.replace(/^[-•*]\s*/, '')))
    )

    // Top performers table for this stream
    const streamToppers = streamReps.flatMap(({ report: r, toppers }) =>
      toppers.map(t => ({ section: r.section, course: r.course, rank: t.rank, name: t.name }))
    )
    if (streamToppers.length > 0) {
      children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: `Top Performers — ${stream}`, font: FONT, size: 20, bold: true })] }))
      const tpColW = [Math.round(PAGE_WIDTH*0.30), Math.round(PAGE_WIDTH*0.20), Math.round(PAGE_WIDTH*0.50)]
      children.push(new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: tpColW,
        rows: [
          new TableRow({ tableHeader: true, children: ['Section', 'Rank', 'Student Name'].map((h, i) => new TableCell({ width: { size: tpColW[i], type: WidthType.DXA }, shading: { fill: BRAND_BLUE }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 17, color: 'FFFFFF' })] })] })) }),
          ...streamToppers.map(t => new TableRow({ children: [`${t.section} (${t.course})`, `Rank ${t.rank}`, t.name].map((v, i) => new TableCell({ width: { size: tpColW[i], type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 17 })] })] })) }))
        ]
      }))
    }

    children.push(pageBreak())
    streamIndex++
  }

  // ── KEY ACHIEVEMENTS ────────────────────────────────────────────
  children.push(sectionHeading(`Section ${streamIndex}: Key Achievements`))
  children.push(para('Despite the challenges documented above, the programme delivered several meaningful achievements that management should recognise and build upon:'))
  children.push(new Paragraph({ spacing: { before: 160, after: 120 }, children: [new TextRun({ text: 'Programme-level Achievements', font: FONT, size: 20, bold: true })] }))
  achievementsText.split('\n').filter(l => l.trim()).slice(0, 6).forEach(line =>
    children.push(bullet(line.replace(/^[-•*]\s*/, '')))
  )
  children.push(pageBreak())
  streamIndex++

  // ── RECOMMENDATIONS ─────────────────────────────────────────────
  children.push(sectionHeading(`Section ${streamIndex}: Recommendations`))
  children.push(new Paragraph({ spacing: { before: 0, after: 120 }, children: [new TextRun({ text: 'Administrative / Institutional Actions', font: FONT, size: 20, bold: true })] }))
  adminRecs.forEach(r => children.push(bullet(r)))
  children.push(new Paragraph({ spacing: { before: 200, after: 120 }, children: [new TextRun({ text: 'Curriculum / Academic Actions', font: FONT, size: 20, bold: true })] }))
  curriculumRecs.forEach(r => children.push(bullet(r)))
  children.push(pageBreak())
  streamIndex++

  // ── LEADERBOARD ─────────────────────────────────────────────────
  children.push(sectionHeading(`Section ${streamIndex}: Skill Lab Leaderboard`))
  children.push(para(`The following ${totalToppers} students have been selected as the Top 3 performers from each section based on their project day performance. These students are formally recognised on the programme leaderboard.`))
  const lbColW = [Math.round(PAGE_WIDTH*0.28), Math.round(PAGE_WIDTH*0.18), Math.round(PAGE_WIDTH*0.18), Math.round(PAGE_WIDTH*0.36)]
  children.push(new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: lbColW,
    rows: [
      new TableRow({ tableHeader: true, children: ['Stream / Section', 'Programme', 'Rank', 'Student Name'].map((h, i) => new TableCell({ width: { size: lbColW[i], type: WidthType.DXA }, shading: { fill: BRAND_BLUE }, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, bold: true, size: 17, color: 'FFFFFF' })] })] })) }),
      ...allToppers.flatMap(({ report: r, toppers }) =>
        toppers.map(t => new TableRow({ children: [
          `${r.stream} — ${r.section}`,
          `${r.course} ${r.sem}`,
          `Rank ${t.rank}`,
          t.name + (t.roll ? ` (Roll No. ${t.roll})` : ''),
        ].map((v, i) => new TableCell({ width: { size: lbColW[i], type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, margins: { top: 70, bottom: 70, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text: v, font: FONT, size: 17 })] })] })) }))
      )
    ]
  }))
  children.push(pageBreak())
  streamIndex++

  // ── OVERALL CONCLUSION ──────────────────────────────────────────
  children.push(sectionHeading(`Section ${streamIndex}: Overall Conclusion`))
  conclusionText.split('\n').filter(Boolean).forEach(p => children.push(para(p)))

  children.push(
    new Paragraph({ spacing: { before: 400, after: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Report Prepared By: Skill Lab Coordinator | SHEAT College`, font: FONT, size: 18, color: '666666' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${reportingPeriod} | Prepared: ${fmt(new Date())} | Strictly Confidential`, font: FONT, size: 18, color: '666666' })] }),
  )

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `SHEAT College Skill Lab · Master Consolidated Report · ${reportingPeriod} · Strictly Confidential`, font: FONT, size: 16, color: '888888' })] })] }) },
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

  if (!req.query.id) {
    if (req.method === 'GET') {

      if (req.query.executive === '1') {
        if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
        const { cycle } = req.query
        if (!cycle) return res.status(400).json({ error: 'cycle required' })
        const reports = await SectionCycle.find({ cycle, status: { $in: ['submitted', 'locked'] } }).populate('trainer', 'name').sort({ stream: 1, course: 1, section: 1 })
        if (reports.length === 0) return res.status(404).json({ error: 'No submitted reports found for this cycle' })
        const buffer = await generateExecutiveSummary(reports, cycle)
        const filename = `SkillLab_${cycle}_Executive_Summary.docx`.replace(/\s+/g, '_')
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        return res.send(buffer)
      }

      if (req.query.combined === '1') {
        if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
        const { cycle } = req.query
        if (!cycle) return res.status(400).json({ error: 'cycle required' })
        const reports = await SectionCycle.find({ cycle, status: { $in: ['submitted', 'locked'] } }).populate('trainer', 'name').sort({ stream: 1, course: 1, section: 1 })
        if (reports.length === 0) return res.status(404).json({ error: 'No submitted reports found for this cycle' })
        const buffer = await generateCombinedDocx(reports, cycle)
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
      const reports = await SectionCycle.find(query).populate('trainer', 'name email').populate('lockedBy', 'name').sort({ updatedAt: -1 })
      return res.status(200).json(reports)
    }

    if (req.method === 'POST') {
      // Consolidated report: POST /api/reports?consolidated=1
      if (req.query.consolidated === '1') {
        if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
        const { reportIds, reportingPeriod } = req.body
        if (!reportIds?.length) return res.status(400).json({ error: 'reportIds array required' })
        if (!reportingPeriod)   return res.status(400).json({ error: 'reportingPeriod required' })
        const reports = await SectionCycle.find({ _id: { $in: reportIds } }).populate('trainer', 'name').sort({ stream: 1, course: 1, section: 1 })
        if (reports.length === 0) return res.status(404).json({ error: 'No reports found' })
        const buffer = await generateConsolidatedDocx(reports, reportingPeriod)
        const filename = `SkillLab_Master_Consolidated_Report_${reportingPeriod.replace(/\s+/g, '_')}.docx`
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        return res.send(buffer)
      }

      const { stream, course, year, sem, section, cycle, ...rest } = req.body
      if (!stream || !course || !year || !sem || !section || !cycle)
        return res.status(400).json({ error: 'stream, course, year, sem, section, cycle are required' })
      if (user.role !== 'superadmin') {
        const allowed = user.assignedSections?.some(a => a.stream === stream && a.course === course && a.sections?.includes(section) && a.year === year && a.sem === sem)
        if (!allowed) return res.status(403).json({ error: 'You are not assigned to this section' })
      }
      const identity = { stream, course, year, sem, section, cycle }
      const existing = await SectionCycle.findOne(identity)
      if (existing?.status === 'locked') return res.status(403).json({ error: 'Report is locked by superadmin' })
      const report = await SectionCycle.findOneAndUpdate(identity, { $set: { trainer: existing?.trainer || user._id, ...rest } }, { upsert: true, new: true, setDefaultsOnInsert: true }).populate('trainer', 'name email')
      return res.status(200).json(report)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isDownload = url.includes('/download')
  const isSubmit   = url.includes('/submit')
  const isLock     = url.includes('/lock')
  const rawId      = String(req.query.id)

  const report = await SectionCycle.findById(rawId).populate('trainer', 'name email role assignedSections').populate('lockedBy', 'name')
  if (!report) return res.status(404).json({ error: 'Report not found' })

  if (req.method === 'GET' && isDownload) {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
    const buffer = await generateSingleDocx(report)
    const filename = `SkillLab_${report.cycle}_${report.section}_Report.docx`.replace(/\s+/g, '_')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(buffer)
  }

  if (req.method === 'GET') {
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id)) return res.status(403).json({ error: 'Forbidden' })
    return res.status(200).json(report)
  }

  if (req.method === 'PATCH' && !isSubmit && !isLock) {
    if (report.status === 'locked') return res.status(403).json({ error: 'Report is locked by superadmin' })
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id)) return res.status(403).json({ error: 'Forbidden' })
    const allowed = ['coTrainerName','startDate','endDate','projectConducted','attendance','marks','avgMarks','engagementLevel','skillProgressLevel','topicsCovered','challenges','operationalChallenges','achievements','recommendations','summary']
    const update = {}
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key]
    const updated = await SectionCycle.findByIdAndUpdate(rawId, { $set: update }, { new: true }).populate('trainer', 'name email')
    return res.status(200).json(updated)
  }

  if (req.method === 'POST' && isSubmit) {
    if (report.status === 'locked') return res.status(403).json({ error: 'Report is locked' })
    if (user.role !== 'superadmin' && String(report.trainer._id) !== String(user._id)) return res.status(403).json({ error: 'Forbidden' })
    report.status = 'submitted'; report.submittedAt = new Date()
    await report.save()
    return res.status(200).json(report)
  }

  if (req.method === 'POST' && isLock) {
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' })
    if (report.status === 'locked') return res.status(400).json({ error: 'Already locked' })
    report.status = 'locked'; report.lockedAt = new Date(); report.lockedBy = user._id
    await report.save()
    return res.status(200).json(report)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}