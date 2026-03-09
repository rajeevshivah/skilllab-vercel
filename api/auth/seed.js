import { connectDB } from '../_db.js';
import { User }       from '../_models.js';
import { cors }       from '../_helpers.js';

// ONE-TIME USE: Visit /api/auth/seed to create the superadmin
// Delete this file after first login!
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectDB();

    const existing = await User.findOne({ email: 'admin@sheat.ac.in' });
    if (existing) {
      await User.deleteOne({ email: 'admin@sheat.ac.in' });
    }

    const admin = await User.create({
      name:     'Super Admin',
      email:    'admin@sheat.ac.in',
      password: 'sheat2026',
      role:     'superadmin',
      isActive: true,
    });

    res.json({
      success: true,
      message: 'Superadmin created! Login with admin@sheat.ac.in / sheat2026',
      id: admin._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}