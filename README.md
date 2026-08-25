# 🎓 KTU LEVEL 400 STUDENT ELECTION PLATFORM

## 📋 Overview

A secure, professional, and fully responsive **Online Student Voting & Election Management System** for Koforidua Technical University (KTU), specifically designed for Level 400 Student Elections.

**Features:**
- ✅ Secure student authentication (Email + Index Number + Level verification)
- ✅ Real-time voting with one-vote-per-student guarantee
- ✅ Candidate profile management with unique codes
- ✅ Admin dashboard with live statistics
- ✅ Automatic vote calculation and results display
- ✅ Download voting records and reports
- ✅ Professional UI with high-tech design
- ✅ Mobile-responsive design
- ✅ Complete audit trail

---

## 🏗️ Project Structure

```
ktu-election/
├── index.html                      # Home/Landing page
├── package.json                    # Node dependencies
├── .env.example                    # Environment config template
│
├── pages/                          # HTML pages
│   ├── student-login.html         # Student login
│   ├── student-dashboard.html     # Student dashboard
│   ├── candidates.html            # Candidates gallery
│   ├── voting.html                # Voting page
│   ├── vote-review.html           # Vote confirmation
│   ├── confirmation.html          # Vote submitted confirmation
│   ├── admin-login.html           # Admin login
│   ├── admin-dashboard.html       # Admin statistics
│   ├── student-management.html    # Student management
│   ├── candidate-management.html  # Candidate management
│   ├── results.html               # Results display
│   └── reports.html               # Reports generation
│
├── css/                            # Stylesheets
│   ├── main.css                   # Main styles + color scheme
│   ├── responsive.css             # Mobile/Tablet responsive
│   ├── auth.css                   # Login/Auth styles
│   └── dashboard.css              # Dashboard styles
│
├── js/                             # JavaScript
│   ├── main.js                    # Core functionality
│   ├── auth.js                    # Authentication logic
│   ├── student-dashboard.js       # Student dashboard
│   ├── voting.js                  # Voting system
│   ├── admin-dashboard.js         # Admin functions
│   └── charts.js                  # Chart generation
│
├── assets/
│   └── branding/
│       └── ktu-logo.png           # KTU Logo placeholder
│
└── backend/
    ├── server.js                  # Express.js server
    ├── config/
    │   └── database.js            # Database configuration
    ├── routes/
    │   ├── auth.js                # Authentication routes
    │   ├── students.js            # Student routes
    │   ├── candidates.js          # Candidate routes
    │   ├── voting.js              # Voting routes
    │   ├── admin.js               # Admin routes
    │   └── results.js             # Results routes
    ├── controllers/
    │   ├── authController.js
    │   ├── votingController.js
    │   └── adminController.js
    ├── middleware/
    │   ├── auth.js                # Authentication middleware
    │   ├── validation.js          # Input validation
    │   └── errorHandler.js        # Error handling
    └── database/
        ├── schema.sql             # Database structure
        ├── seed.js                # Sample data
        └── migrate.js             # Database migrations
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14+) - [Download](https://nodejs.org/)
- **MySQL** (v5.7+) - [Download](https://www.mysql.com/downloads/)
- **Git** - [Download](https://git-scm.com/)
- Modern web browser

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/ktu-election.git
cd ktu-election
```

### 2. Setup Frontend

The frontend is already set up. Just serve it:

```bash
# Using Python
python -m http.server 8080

# Or using Node.js
npx http-server -p 8080

# Or using Live Server (VS Code extension)
# Install "Live Server" extension and right-click index.html → Open with Live Server
```

Access at: `http://localhost:8080`

### 3. Setup Backend

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 4. Setup Database

```bash
# Access MySQL
mysql -u root -p

# Run the schema
source backend/database/schema.sql

# Create election admin user
# (Update password in database after first login)
```

### 5. Start Backend Server

```bash
# Development with auto-reload
npm run dev

# Or production
npm start
```

Backend runs at: `http://localhost:3000`

---

## 🔐 Authentication & Security

### Student Login
- **Email**: KTU email address (e.g., `name@ktu.edu.gh`)
- **Index Number**: 10-digit student ID (e.g., `KTU/20/001`)
- **Level**: Must select "400"

**System verifies:**
- ✅ Email exists in student database
- ✅ Index number matches student record
- ✅ Student is Level 400
- ✅ Student hasn't already voted

### Admin Login
- **Username**: Admin account
- **Password**: Hashed and verified securely

**Admin can access:**
- Student management
- Candidate management
- Vote records
- Results and reports
- Election settings

---

## 📊 Key Features Explained

### 1. Student Voting Flow
```
Login → View Profile → Review Candidates → Select Votes → Confirm → Submit → Confirmation
```

### 2. Vote Uniqueness
- Database constraint prevents duplicate votes
- Server-side verification required
- Frontend can only display "Already Voted" message

### 3. Candidate System
- Each candidate gets unique code (A01, B01, etc.)
- Requires admin approval
- Stores: Bio, Manifesto, Vision, Mission, Photo

### 4. Results Calculation
- Automatic vote counting
- Percentage calculations
- Winner determination
- Tie detection

### 5. Admin Dashboard
- Live vote statistics
- Voter turnout percentage
- Candidate vote breakdown
- Voting activity timeline

---

## 🎨 Design & Branding

### Color Scheme
- **Primary Navy**: `#1E3A5F` (KTU institutional)
- **Gold Accent**: `#D4AF37` (Premium look)
- **Primary Red**: `#C41E3A` (Alert/CTA)
- **Light Gray**: `#F5F7FA` (Backgrounds)

### Typography
- **Display Font**: Georgia/Garamond (Professional)
- **Body Font**: Segoe UI/Sans-serif (Readable)
- **Mono Font**: Courier New (Data/Code)

### Responsive Design
- ✅ Mobile (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1200px+)
- ✅ Touch-friendly buttons
- ✅ Accessible (WCAG 2.1)

---

## 📱 API Endpoints

### Authentication
```
POST /api/auth/student-login
POST /api/auth/candidate-login
POST /api/admin/login
```

### Student Routes
```
GET /api/student/profile
GET /api/student/voting-status
POST /api/vote
GET /api/candidates
GET /api/candidates/:id
GET /api/election
```

### Admin Routes
```
GET /api/admin/dashboard
GET /api/admin/students
GET /api/admin/candidates
POST /api/admin/candidates
GET /api/admin/votes
GET /api/admin/results
GET /api/admin/reports
POST /api/admin/election/open
POST /api/admin/election/close
```

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `elections` | Election details & settings |
| `positions` | Vote positions (President, VP, etc.) |
| `students` | Level 400 students |
| `candidates` | Approved candidates |
| `votes` | Vote records |
| `voteItems` | Individual vote selections |
| `admins` | Admin accounts |
| `auditLogs` | Action audit trail |
| `resultCache` | Vote tallies (performance) |

---

## 🧪 Testing

### Test Credentials

**Student Account:**
- Email: `student@ktu.edu.gh`
- Index: `KTU/20/001`
- Level: `400`

**Admin Account:**
- Username: `admin`
- Password: `admin` (Change immediately in production!)

### Create Test Data
```bash
npm run seed
```

---

## 📁 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment (Heroku)

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create ktu-election

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret_key
heroku config:set DB_HOST=your_db_host
# ... set other env vars

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Production Deployment (VPS/Shared Hosting)

```bash
# 1. SSH into server
ssh user@server.com

# 2. Clone repository
git clone https://github.com/yourusername/ktu-election.git
cd ktu-election

# 3. Install dependencies
npm install

# 4. Setup environment
cp .env.example .env
nano .env  # Edit with server details

# 5. Run with PM2 (process manager)
npm install -g pm2
pm2 start backend/server.js --name "ktu-election"
pm2 startup
pm2 save

# 6. Setup reverse proxy (Nginx)
# Configure nginx to proxy to localhost:3000
```

### Production Checklist
- [ ] Change default admin password
- [ ] Update JWT secret
- [ ] Use HTTPS (SSL certificate)
- [ ] Enable CORS properly
- [ ] Setup database backups
- [ ] Enable logging
- [ ] Setup monitoring
- [ ] Use environment variables
- [ ] Disable debug mode
- [ ] Rate limiting enabled

---

## 📝 Documentation

### For Students
- [How to Vote](index.html#how-to-vote)
- [Election Rules](index.html#rules)
- [FAQ](pages/student-dashboard.html)

### For Admins
- [Admin Guide](docs/admin-guide.md)
- [Report Generation](docs/reports.md)
- [Candidate Management](docs/candidates.md)

### For Developers
- [API Documentation](docs/api.md)
- [Database Schema](backend/database/schema.sql)
- [Architecture](docs/architecture.md)

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL is running
mysql -u root -p

# Verify database created
SHOW DATABASES;

# Check .env file has correct credentials
cat .env | grep DB_
```

### Port Already in Use
```bash
# Change port in .env or find process
lsof -i :3000
kill -9 <PID>
```

### CORS Errors
- Check `FRONTEND_URL` in .env matches frontend origin
- Verify backend running on correct port
- Check `Access-Control-Allow-Origin` header

### Votes Not Saving
- Verify `votes` table exists: `SHOW TABLES;`
- Check backend logs: `npm run dev`
- Verify auth token valid in browser console

---

## 📞 Support

**For Issues:**
1. Check troubleshooting section
2. Review backend logs
3. Check browser console
4. Contact: `elections@ktu.edu.gh`

**For Development:**
- Create issues on GitHub
- Submit pull requests
- Document changes clearly

---

## 📜 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

- Development Team
- KTU Election Commission
- System Administrator

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Feb 2026 | Initial release |
| 0.9.0 | Jan 2026 | Beta testing |
| 0.8.0 | Dec 2025 | Development |

---

## ⚠️ Important Notes

### Security Reminders
1. **Change default passwords** before going live
2. **Use HTTPS** in production
3. **Regular database backups** required
4. **Monitor audit logs** for suspicious activity
5. **Update dependencies** regularly

### Election Integrity
1. Votes are **immutable** once submitted
2. **One vote per student** enforced at database level
3. **Audit trail** logs all admin actions
4. **Results locked** after election closes
5. **Vote tallies verified** automatically

### Data Protection
- Student passwords hashed with bcrypt
- JWT tokens expire after 4 hours
- Session timeout after 30 minutes of inactivity
- Sensitive data encrypted in transit (HTTPS)

---

## 📄 Files Included

- ✅ **Frontend**: HTML, CSS, JavaScript (fully responsive)
- ✅ **Backend**: Node.js/Express.js API
- ✅ **Database**: MySQL schema with sample data
- ✅ **Configuration**: Environment file template
- ✅ **Documentation**: Setup and API guides

---

**Made with ❤️ for KTU**

*Your Voice. Your Choice. Your Future.*
