import { connectDB }       from '../../_db.js';
import { User }             from '../../_models.js';
import { cors, getUser }    from '../../_helpers.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();

  const me = await getUser(req);
  if (!me) return res.status(401).json({ message: 'Unauthorized' });
  if (me.role !== 'superadmin') return res.status(403).json({ message: 'Superadmin only' });

  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { name, role, assignedSections, isActive, password } = req.body;
    const updateData = {
      ...(name     !== undefined && { name }),
      ...(role     !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(assignedSections !== undefined && { assignedSections }),
    };
    // Allow password update too
    if (password) {
      const user = await User.findById(id);
      if (user) { user.password = password; await user.save(); }
    }
    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  }

  if (req.method === 'DELETE') {
    if (id === me._id.toString()) return res.status(400).json({ message: 'Cannot delete yourself' });
    await User.findByIdAndDelete(id);
    return res.json({ message: 'User deleted' });
  }

  res.status(405).json({ message: 'Method not allowed' });
}