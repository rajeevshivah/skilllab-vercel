import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

// ── User ─────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  password:        { type: String, required: true },
  role:            { type: String, enum: ['superadmin','trainer','cotrainer'], default: 'cotrainer' },
  assignedStream:  { type: String, default: null },
  assignedSection: { type: String, default: null },
  assignedCourse:  { type: String, default: null },
  isActive:        { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function(p) { return bcrypt.compare(p, this.password); };
userSchema.methods.canManageStudent = function(s) {
  if (this.role === 'superadmin') return true;
  return this.assignedStream === s.stream && this.assignedSection === s.section && this.assignedCourse === s.course;
};

// ── Student ───────────────────────────────────────────────────────
const studentSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  roll:    { type: String, default: '' },
  rank:    { type: Number, required: true, min: 1, max: 3 },
  stream:  { type: String, required: true },
  course:  { type: String, required: true },
  sem:     { type: String, required: true },
  section: { type: String, required: true },
  year:    { type: String, required: true },
  cycle:   { type: String, required: true },
  project: { type: String, default: '' },
  photo: {
    data:        { type: String, default: null },
    contentType: { type: String, default: null },
  },
  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

studentSchema.index({ stream:1, section:1, course:1, cycle:1, rank:1 }, { unique: true });

// Prevent model recompilation in serverless warm starts
export const User    = mongoose.models.User    || mongoose.model('User',    userSchema);
export const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
