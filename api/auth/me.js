import { connectDB } from '../_db.js';
import { cors, getUser } from '../_helpers.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();
  const user = await getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  res.json({ user });
}
