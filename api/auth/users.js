import { connectDB }       from '../_db.js';
import { User }             from '../_models.js';
import { cors, getUser }    from '../_helpers.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();

  const me = await getUser(req);
  if (!me) return res.status(401).json({ message: 'Unauthorized' });
  if (me.role !== 'superadmin') return res.status(403).json({ message: 'Superadmin only' });

  // GET — list all users
  if (req.method === 'GET') {
    const users = await User.find().select('-password').sort('-createdAt');
    return res.json({ users });
  }

  // POST — create user
  if (req.method === 'POST') {
    const { name, email, password, role, assignedSections } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    const user = await User.create({
      name, email, password, role,
      assignedSections: role !== 'superadmin' ? (assignedSections || []) : [],
    });
    return res.status(201).json({
      message: 'User created',
      user: { id: user._id, name: user.name, email: user.email, role: user.role, assignedSections: user.assignedSections }
    });
  }

  res.status(405).json({ message: 'Method not allowed' });
}