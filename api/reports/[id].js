import { cors, getUser } from '../_helpers.js'
import { connectDB }     from '../_db.js'
import { SectionCycle }  from '../_models.js'

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  await connectDB()
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorised' })

  // Co-trainers cannot access reports at all
  if (user.role === 'cotrainer') return res.status(403).json({ error: 'Forbidden' })

  // ── GET /api/reports ──────────────────────────────────────────
  if (req.method === 'GET') {
    let query = {}

    if (user.role === 'superadmin') {
      // Superadmin sees all reports, optionally filtered
      const { stream, course, cycle, status } = req.query
      if (stream) query.stream = stream
      if (course) query.course = course
      if (cycle)  query.cycle  = cycle
      if (status) query.status = status
    } else {
      // Trainer sees only their own reports
      query.trainer = user._id
    }

    const reports = await SectionCycle.find(query)
      .populate('trainer', 'name email')
      .populate('lockedBy', 'name')
      .sort({ updatedAt: -1 })

    return res.status(200).json(reports)
  }

  // ── POST /api/reports — create or update draft (upsert) ───────
  if (req.method === 'POST') {
    const {
      stream, course, year, sem, section, cycle,
      coTrainerName, startDate, endDate, projectConducted,
      attendance, marks,
      engagementLevel, skillProgressLevel,
      topicsCovered, challenges, operationalChallenges,
      achievements, recommendations, summary,
    } = req.body

    if (!stream || !course || !year || !sem || !section || !cycle) {
      return res.status(400).json({ error: 'stream, course, year, sem, section, cycle are required' })
    }

    // Trainers can only save reports for their own assigned sections
    if (user.role !== 'superadmin') {
      const allowed = user.assignedSections?.some(a =>
        a.stream === stream && a.course === course &&
        a.sections?.includes(section) &&
        a.year === year && a.sem === sem
      )
      if (!allowed) return res.status(403).json({ error: 'You are not assigned to this section' })
    }

    // Upsert — find existing draft or create new
    const identity = { stream, course, year, sem, section, cycle }
    const existing = await SectionCycle.findOne(identity)

    if (existing) {
      // Cannot edit a locked report
      if (existing.status === 'locked') {
        return res.status(403).json({ error: 'This report is locked and cannot be edited' })
      }
      // Trainer cannot edit submitted report (only superadmin can unlock)
      if (existing.status === 'submitted' && user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Report already submitted. Contact superadmin to unlock.' })
      }
    }

    const data = {
      trainer: existing?.trainer || user._id,
      coTrainerName, startDate, endDate, projectConducted,
      attendance, marks,
      engagementLevel, skillProgressLevel,
      topicsCovered, challenges, operationalChallenges,
      achievements, recommendations, summary,
    }

    const report = await SectionCycle.findOneAndUpdate(
      identity,
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('trainer', 'name email')

    return res.status(200).json(report)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}