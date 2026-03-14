import jwt      from 'jsonwebtoken';
import { connectDB }  from '../_db.js';
import { User }       from '../_models.js';
import { cors }       from '../_helpers.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await connectDB();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    // Auto-create superadmin if no users exist yet (first time setup)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        name:     'Super Admin',
        email:    'admin@sheat.ac.in',
        password: 'sheat@admin2026',
        role:     'superadmin',
      });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(401).json({ message: 'Account deactivated' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role,
        assignedSections: user.assignedSections || [],
        assignedStream: user.assignedStream, assignedSection: user.assignedSection, assignedCourse: user.assignedCourse }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}