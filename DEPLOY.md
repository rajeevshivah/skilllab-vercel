# SHEAT Skill Lab — Vercel-Only Deployment Guide
## Frontend + Backend on Vercel, Database on MongoDB Atlas. Total cost: 0 rupees.

---

## STEP 1 — MongoDB Atlas (2 minutes)
1. Go to cloud.mongodb.com → sign up free
2. Create cluster → M0 Free Tier → Mumbai region
3. Database Access → add user: skilllab_user / (your password)
4. Network Access → Add IP → 0.0.0.0/0 (allow anywhere)
5. Connect → Drivers → copy your connection string:
   mongodb+srv://skilllab_user:YOURPASSWORD@cluster0.xxxxx.mongodb.net/skilllab
   SAVE THIS.

---

## STEP 2 — Push to GitHub
Upload all files from this ZIP to a new GitHub repo called "skilllab".

---

## STEP 3 — Deploy on Vercel
1. vercel.com → Add New Project → import your skilllab repo
2. Framework: Vite | Root: . | Build: vite build | Output: dist
3. Add Environment Variables:
   MONGODB_URI  = (your Atlas string from Step 1)
   JWT_SECRET   = sheatSkillLab2026xK9mP3  (change this to anything random)
   FRONTEND_URL = https://skilllab.sheat.ac.in
4. Click Deploy. Done.

---

## STEP 4 — Connect Domain skilllab.sheat.ac.in
Vercel → Settings → Domains → add skilllab.sheat.ac.in
Give your IT person: CNAME  skilllab  cname.vercel-dns.com

---

## STEP 5 — First Login
Email:    admin@sheat.ac.in
Password: sheat@admin2026
CHANGE THIS IMMEDIATELY after logging in.

---

## STEP 6 — Create Trainer Accounts
Go to Users tab → create accounts and assign each trainer to their section.
Co-trainers: can add/edit. Trainers: can add/edit/delete. Superadmin: everything.

---

## HOW IT WORKS (structure)
api/           → Vercel Serverless Functions (your backend)
src/           → React frontend (Vite)
vercel.json    → Routes /api/* to functions, everything else to React

---

## NEW CYCLE?
Just select Cycle 3 / Cycle 4 in the form. Old data stays. Nothing deleted.
