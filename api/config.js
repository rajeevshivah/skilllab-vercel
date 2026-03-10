import { connectDB }       from '../_db.js';

import { ConfigItem }       from '../_models.js';
import { cors, getUser }    from '../_helpers.js';

// Default seed data — used only on first load if DB is empty
const DEFAULTS = [
  // Streams
  { type:'stream',  value:'AI / ML',                  order:1 },
  { type:'stream',  value:'MERN Stack',                order:2 },
  { type:'stream',  value:'Java & Backend Arch.',      order:3 },
  { type:'stream',  value:'C Programming Foundation',  order:4 },
  // Courses
  { type:'course',  value:'B.Tech', order:1 },
  { type:'course',  value:'BCA',    order:2 },
  // Sections
  { type:'section', value:'Sec A',  order:1 },
  { type:'section', value:'Sec B',  order:2 },
  { type:'section', value:'Sec C',  order:3 },
  { type:'section', value:'F104',   order:4 },
  // Semesters
  { type:'sem',     value:'2nd Sem', order:1 },
  { type:'sem',     value:'4th Sem', order:2 },
  { type:'sem',     value:'6th Sem', order:3 },
  // Years
  { type:'year',    value:'1st Year', order:1 },
  { type:'year',    value:'2nd Year', order:2 },
  { type:'year',    value:'3rd Year', order:3 },
  // Cycles
  { type:'cycle',   value:'Cycle 1', order:1 },
  { type:'cycle',   value:'Cycle 2', order:2 },
  { type:'cycle',   value:'Cycle 3', order:3 },
  { type:'cycle',   value:'Cycle 4', order:4 },
  { type:'cycle',   value:'Cycle 5', order:5 },
];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  await connectDB();

  // ── GET — public, returns all active config items grouped by type ──
  if (req.method === 'GET') {
    // Seed defaults if nothing exists yet
    const count = await ConfigItem.countDocuments();
    if (count === 0) {
      await ConfigItem.insertMany(DEFAULTS);
    }

    const includeInactive = req.query.all === '1';
    const filter = includeInactive ? {} : { isActive: true };
    const items  = await ConfigItem.find(filter).sort({ type:1, order:1, value:1 });

    // Group by type
    const grouped = {};
    items.forEach(i => {
      if (!grouped[i.type]) grouped[i.type] = [];
      grouped[i.type].push({ _id: i._id, value: i.value, label: i.label || i.value, isActive: i.isActive, order: i.order });
    });

    return res.json({ config: grouped });
  }

  // All write operations require superadmin
  const me = await getUser(req);
  if (!me) return res.status(401).json({ message: 'Unauthorized' });
  if (me.role !== 'superadmin') return res.status(403).json({ message: 'Superadmin only' });

  // ── POST — add new config item ────────────────────────────────
  if (req.method === 'POST') {
    const { type, value, label, order } = req.body;
    if (!type || !value) return res.status(400).json({ message: 'Type and value required' });

    const existing = await ConfigItem.findOne({ type, value: value.trim() });
    if (existing) {
      // If it was inactive, reactivate it
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        return res.json({ item: existing, message: 'Item reactivated' });
      }
      return res.status(400).json({ message: `"${value}" already exists in ${type}` });
    }

    const item = await ConfigItem.create({ type, value: value.trim(), label: label?.trim(), order: order || 0 });
    return res.status(201).json({ item });
  }

  // ── PATCH — edit config item ──────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, value, label, isActive, order } = req.body;
    if (!id) return res.status(400).json({ message: 'ID required' });

    const item = await ConfigItem.findByIdAndUpdate(
      id,
      { ...(value  !== undefined && { value: value.trim() }),
        ...(label  !== undefined && { label: label.trim() }),
        ...(isActive !== undefined && { isActive }),
        ...(order  !== undefined && { order }) },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    return res.json({ item });
  }

  // ── DELETE — permanently delete config item ───────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'ID required' });
    await ConfigItem.findByIdAndDelete(id);
    return res.json({ message: 'Deleted' });
  }

  res.status(405).json({ message: 'Method not allowed' });
}