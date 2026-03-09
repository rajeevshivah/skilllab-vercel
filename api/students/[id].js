import { connectDB }    from '../_db.js';
import { Student }       from '../_models.js';
import { cors, getUser } from '../_helpers.js';

const MAX = 2 * 1024 * 1024;

function parsePhoto(photoData) {
  if (!photoData) return { data: null, contentType: null };
  const match = photoData.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return { data: null, contentType: null };
  if (Buffer.from(match[2], 'base64').length > MAX) return null;
  return { data: match[2], contentType: match[1] };
}

function fmt(s) {
  return { _id: s._id, name: s.name, roll: s.roll, rank: s.rank, stream: s.stream, course: s.course, sem: s.sem, section: s.section, year: s.year, cycle: s.cycle, project: s.project, photo: s.photo?.data ? `data:${s.photo.contentType};base64,${s.photo.data}` : null };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();

  const { id } = req.query;

  // ── GET photo (/api/students/[id]?photo=1) ────────────────────
  if (req.method === 'GET' && req.query.photo) {
    const s = await Student.findById(id).select('photo');
    if (!s?.photo?.data) return res.status(404).json({ message: 'No photo' });
    return res.json({ photo: `data:${s.photo.contentType};base64,${s.photo.data}` });
  }

  // ── PUT (edit) ─────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await Student.findById(id);
    if (!existing) return res.status(404).json({ message: 'Student not found' });

    if (me.role !== 'superadmin' && !me.canManageStudent(existing))
      return res.status(403).json({ message: 'You can only edit students in your section' });

    const { name, roll, rank, stream, course, sem, section, year, cycle, project, photo } = req.body;

    let photoDoc = existing.photo;
    if (photo !== undefined) {
      if (!photo) { photoDoc = { data: null, contentType: null }; }
      else {
        const p = parsePhoto(photo);
        if (p === null) return res.status(400).json({ message: 'Photo too large.' });
        photoDoc = p;
      }
    }

    try {
      const updated = await Student.findByIdAndUpdate(id,
        { name, roll, rank: parseInt(rank), stream, course, sem, section, year, cycle, project, photo: photoDoc, updatedBy: me._id },
        { new: true, runValidators: true }
      );
      return res.json({ student: fmt(updated) });
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: 'That rank already exists for this section & cycle.' });
      return res.status(500).json({ message: err.message });
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const me = await getUser(req);
    if (!me) return res.status(401).json({ message: 'Unauthorized' });
    if (me.role === 'cotrainer') return res.status(403).json({ message: 'Co-trainers cannot delete' });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (me.role === 'trainer' && !me.canManageStudent(student))
      return res.status(403).json({ message: 'You can only delete students in your section' });

    await Student.findByIdAndDelete(id);
    return res.json({ message: 'Deleted' });
  }

  res.status(405).json({ message: 'Method not allowed' });
}
