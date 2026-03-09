import { connectDB } from '../_db.js';
import { Student }   from '../_models.js';
import { cors }      from '../_helpers.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();
  const cycles = await Student.distinct('cycle');
  res.json({ cycles: cycles.sort() });
}
