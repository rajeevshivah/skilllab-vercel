import { connectDB }       from '../_db.js';
import { Student }          from '../_models.js';
import { cors, getUser }    from '../_helpers.js';

const MAX = 2 * 1024 * 1024;

function parsePhoto(photoData) {
  if (!photoData) return { data: null, contentType: null };
  const match = photoData.match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/);
  if (!match) return { data: null, contentType: null };
  if (Buffer.from(match[2], 'base64').length > MAX) return null;
  return { data: match[2].trim(), contentType: match[1] };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();

  // ── GET (public) ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const filter = {};
    const q = req.query;
    if (q.stream)  filter.stream  = q.stream;
    if (q.cycle)   filter.cycle   = q.cycle;
    if (q.year)    filter.year    = q.year;
    if (q.course)  filter.course  = q.course;
    if (q.section) filter.section = q.section;

    const students = await Student.find(filter)
      .select('-photo.data')
      .sort({ stream:1, cycle:1, course:1, section:1, rank:1 });

    return res.json({
      students: students.map(s => ({
        _id: s._id, name: s.name, roll: s.roll, rank: s.rank,
        stream: s.stream, course: s.course, sem: s.sem,
        section: s.section, year: s.year, cycle: s.cycle,
        project: s.project, hasPhoto: !!s.photo?.contentType,
        createdAt: s.createdAt,
      })),
      total: students.length,
    });
  }

  // ── POST (auth required) ───────────────────────────────────────
  if (req.method === 'POST') {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ message: 'Unauthorized' });

    const { name, roll, rank, stream, course, sem, section, year, cycle, project, photo } = req.body;

    if (me.role !== 'superadmin') {
      const allowed = me.assignedSections?.some(a =>
        a.stream === stream && a.course === course &&
        (a.sections?.includes(section) || a.sections?.length === 0) &&
        (!a.year || a.year === year) && (!a.sem || a.sem === sem)
      ) || (me.assignedStream === stream && me.assignedCourse === course && me.assignedSection === section);
      if (!allowed) return res.status(403).json({ message: 'You can only add students to your assigned sections' });
    }

    let photoDoc = { data: null, contentType: null };
    if (photo) {
      const p = parsePhoto(photo);
      if (p === null) return res.status(400).json({ message: 'Photo too large. Max 2MB.' });
      photoDoc = p;
    }

    try {
      const student = await Student.create({ name, roll, rank: parseInt(rank), stream, course, sem, section, year, cycle, project, photo: photoDoc, addedBy: me._id });
      return res.status(201).json({ student: fmt(student) });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: `Rank ${rank} already exists for this section & cycle.` });
      return res.status(500).json({ message: err.message });
    }
  }

  res.status(405).json({ message: 'Method not allowed' });
}

function fmt(s) {
  return { _id: s._id, name: s.name, roll: s.roll, rank: s.rank, stream: s.stream, course: s.course, sem: s.sem, section: s.section, year: s.year, cycle: s.cycle, project: s.project, photo: s.photo?.data ? `data:${s.photo.contentType};base64,${s.photo.data}` : null };
}
