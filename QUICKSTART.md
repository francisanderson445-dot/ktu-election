# 🚀 QUICK START GUIDE - KTU ELECTION SYSTEM

## 5-MINUTE SETUP

### Step 1: Frontend Setup (2 minutes)
```bash
# All frontend files are ready!
# Open Terminal/CMD in the ktu-election folder

# Option A: Using Python (easiest)
python -m http.server 8080

# Option B: Using Node
npx http-server -p 8080

# Option C: VS Code Live Server
# Install "Live Server" extension
# Right-click index.html → Open with Live Server
```
✅ Frontend ready at: `http://localhost:8080`

---

### Step 2: Backend Setup (3 minutes)

```bash
# 1. Install Node.js dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env (update database credentials)
# - DB_HOST: localhost (default)
# - DB_USER: root (your MySQL user)
# - DB_PASSWORD: your_password
# - DB_NAME: ktu_election (will be created)

# 4. Create database
mysql -u root -p < backend/database/schema.sql
# (Enter your MySQL password when prompted)

# 5. Start backend server
npm run dev
```
✅ Backend ready at: `http://localhost:3000`

---

## 📱 TEST THE SYSTEM

### Login as Student
1. Go to: `http://localhost:8080/pages/student-login.html`
2. Enter test credentials:
   - Email: `student@ktu.edu.gh`
   - Index: `KTU/20/001`
   - Level: `400`
3. ✅ Click "Login to Vote"

### View Dashboard
- See your profile info
- View countdown timer
- Access candidates list
- Cast your vote

---

## 🎨 CUSTOMIZATION

### Change School/Election Details
Edit these files:
```
index.html                  → Title, tagline, dates
css/main.css               → Colors (#1E3A5F, #D4AF37, #C41E3A)
backend/server.js          → API endpoints
backend/database/schema.sql → Election info insert
```

### Upload KTU Logo
1. Get KTU logo image (PNG preferred, 200x200px)
2. Save as: `assets/branding/ktu-logo.png`
3. Logo appears everywhere automatically!

### Change Colors
Edit `css/main.css`:
```css
:root {
    --primary-navy: #1E3A5F;        /* Main color */
    --primary-gold: #D4AF37;        /* Accent */
    --primary-red: #C41E3A;         /* CTA/Alert */
    --secondary-light-gray: #F5F7FA;
}
```

---

## 🗂️ KEY FILES YOU'LL NEED

### Frontend Files
```
✅ index.html                → Landing page (home)
✅ pages/student-login.html  → Student login
✅ pages/student-dashboard.html → Dashboard
✅ pages/candidates.html     → Candidate list
✅ pages/voting.html         → Vote page (create!)
✅ css/main.css             → Main styles
✅ css/responsive.css       → Mobile styles
✅ css/auth.css             → Login styles
✅ css/dashboard.css        → Dashboard styles
✅ js/main.js               → Core functions
✅ js/auth.js               → Login logic
✅ js/student-dashboard.js  → Dashboard logic
```

### Backend Files
```
✅ backend/server.js        → Express API
✅ backend/database/schema.sql → Database
✅ package.json             → Dependencies
✅ .env.example             → Config template
```

---

## 📊 SAMPLE DATA

Database automatically includes:
- ✅ 1 Sample Election (Level 400, 2026)
- ✅ 6 Positions (President, VP, Secretary, Treasurer, etc.)
- ✅ 1 Admin Account (username: `admin`)

### Add More Test Students
```bash
# Edit backend/database/schema.sql
# Add INSERT statements in SAMPLE DATA section
# Rerun: mysql -u root -p < backend/database/schema.sql
```

---

## ✨ WHAT'S INCLUDED

### Pages Built
✅ Home/Landing  
✅ Student Login  
✅ Student Dashboard  
✅ Candidate List (scaffold)  

### Pages You Need to Create
- Candidates Details Page
- Voting Page (main voting interface)
- Vote Review Page
- Confirmation Page
- Admin Dashboard (basic structure)

---

## 🔒 SECURITY SETUP

### Change Admin Password
```bash
# Connect to MySQL
mysql -u root -p ktu_election

# Update admin password (hashed with bcrypt)
UPDATE admins SET password = 'your_new_hash' WHERE username = 'admin';
```

### Change JWT Secret
In `.env`:
```
JWT_SECRET=change_this_to_random_string_minimum_32_characters
```

---

## 🐛 COMMON ISSUES

### "Cannot GET /api/..."
- ❌ Backend not running
- ✅ Run `npm run dev`

### "CORS Error"
- ❌ Backend CORS not configured
- ✅ Check `.env` FRONTEND_URL matches

### Database "Connection Refused"
- ❌ MySQL not running
- ✅ Start MySQL: `mysql.server start` or Services in Windows

### Port 3000 Already in Use
- ✅ Change in `.env`: `PORT=3001`
- ✅ Or kill process: `lsof -i :3000 | kill -9`

---

## 📞 SUPPORT

Need help? Check:
1. `README.md` - Full documentation
2. Backend logs: `npm run dev` shows errors
3. Browser Console: `F12` → Console tab
4. Database: `mysql ktu_election` then `SHOW TABLES;`

---

## 🎯 NEXT STEPS

1. ✅ Get frontend running
2. ✅ Get backend running  
3. ✅ Test student login
4. ⏭️ Create remaining pages (voting, candidates, admin)
5. ⏭️ Add more test students
6. ⏭️ Test complete voting flow
7. ⏭️ Deploy to temporary hosting

---

## 📋 FOLDER STRUCTURE CREATED

```
ktu-election/
├── index.html (DONE ✅)
├── package.json (DONE ✅)
├── .env.example (DONE ✅)
├── README.md (DONE ✅)
│
├── pages/
│   ├── student-login.html (DONE ✅)
│   ├── student-dashboard.html (DONE ✅)
│   └── [voting.html, candidates.html, etc. - CREATE NEXT]
│
├── css/
│   ├── main.css (DONE ✅)
│   ├── responsive.css (DONE ✅)
│   ├── auth.css (DONE ✅)
│   └── dashboard.css (DONE ✅)
│
├── js/
│   ├── main.js (DONE ✅)
│   ├── auth.js (DONE ✅)
│   └── student-dashboard.js (DONE ✅)
│
├── assets/branding/
│   └── ktu-logo.png (ADD YOUR LOGO)
│
└── backend/
    ├── server.js (DONE ✅)
    ├── database/
    │   └── schema.sql (DONE ✅)
    └── [Additional routes - CREATE NEXT]
```

---

## ⚡ EXPRESS SETUP (No Installation)

If you just want to test without installing:

### Option 1: Run Frontend Only
```bash
# Terminal 1 - Frontend
python -m http.server 8080

# Visit: http://localhost:8080
# Will show login pages (won't authenticate without backend)
```

### Option 2: Run with Mock Data
```bash
# Edit js/main.js to use localStorage instead of API
# Modify loginHandler to store mock data
# Can then test UI/UX without backend
```

---

**You're all set! Start with Step 1 & 2 above. Happy coding! 🎉**

---

*For detailed setup: Read `README.md`*  
*For technical details: Check backend/server.js*  
*For styling: Edit css/main.css*
