/* ============================================
   AUTHENTICATION JAVASCRIPT
   Student & Admin Login Handling
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    initializeAuthPages();
});

function initializeAuthPages() {
    const studentLoginForm = document.getElementById('studentLoginForm');
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', handleStudentLogin);
    }
}

// ============================================
// STUDENT LOGIN HANDLER
// ============================================

async function handleStudentLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const indexNumber = document.getElementById('indexNumber').value.trim();
    const level = document.getElementById('level').value;

    // Validate form
    if (!email || !indexNumber || !level) {
        showAlert('All fields are required', 'error');
        return;
    }

    // Validate email format
    if (!validateEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
    }

    // Validate that only Level 400 can vote
    if (level !== '400') {
        showAlert('Voting is restricted to eligible Level 400 KTU students.', 'error');
        return;
    }

    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';

    try {
        // Call backend authentication API
        const response = await API.post('/auth/student-login', {
            email: email,
            indexNumber: indexNumber,
            level: level
        });

        if (response.success) {
            // Store authentication token
            StorageManager.set('authToken', response.token);
            StorageManager.set('studentInfo', response.student);

            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to student dashboard
            setTimeout(() => {
                window.location.href = 'student-dashboard.html';
            }, 1500);
        } else {
            showAlert(response.message || 'Login failed. Please check your details.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred. Please try again later.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ============================================
// ADMIN LOGIN HANDLER
// ============================================

async function handleAdminLogin(e) {
    e.preventDefault();

    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (!username || !password) {
        showAlert('Username and password are required', 'error');
        return;
    }

    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await API.post('/admin/login', {
            username: username,
            password: password
        });

        if (response.success) {
            StorageManager.set('adminToken', response.token);
            StorageManager.set('adminInfo', response.admin);

            showAlert('Admin login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
        } else {
            showAlert(response.message || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showAlert('An error occurred. Please try again later.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ============================================
// CANDIDATE LOGIN HANDLER
// ============================================

async function handleCandidateLogin(e) {
    e.preventDefault();

    const email = document.getElementById('candidateEmail').value.trim();
    const password = document.getElementById('candidatePassword').value.trim();

    if (!email || !password) {
        showAlert('Email and password are required', 'error');
        return;
    }

    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await API.post('/auth/candidate-login', {
            email: email,
            password: password
        });

        if (response.success) {
            StorageManager.set('candidateToken', response.token);
            StorageManager.set('candidateInfo', response.candidate);

            showAlert('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'candidate-dashboard.html';
            }, 1500);
        } else {
            showAlert(response.message || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Candidate login error:', error);
        showAlert('An error occurred. Please try again later.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// ============================================
// ALERT DISPLAY FUNCTION
// ============================================

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    alertContainer.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
}

// ============================================
// SESSION VALIDATION
// ============================================

function validateSession() {
    // Check which type of user is logged in
    const studentToken = StorageManager.get('authToken');
    const adminToken = StorageManager.get('adminToken');
    const candidateToken = StorageManager.get('candidateToken');

    return {
        isStudent: studentToken !== null,
        isAdmin: adminToken !== null,
        isCandidate: candidateToken !== null,
        currentToken: studentToken || adminToken || candidateToken
    };
}

// ============================================
// REDIRECT IF ALREADY LOGGED IN
// ============================================

function redirectIfLoggedIn(allowedRoles = []) {
    const session = validateSession();

    if (session.isStudent && allowedRoles.includes('student')) {
        window.location.href = 'student-dashboard.html';
    } else if (session.isAdmin && allowedRoles.includes('admin')) {
        window.location.href = 'admin-dashboard.html';
    } else if (session.isCandidate && allowedRoles.includes('candidate')) {
        window.location.href = 'candidate-dashboard.html';
    }

    // If user is logged in as different role, clear session
    if (session.currentToken) {
        logout();
    }
}

// ============================================
// VERIFY USER ON PROTECTED PAGES
// ============================================

function requireAuth(requiredRole) {
    const session = validateSession();
    let authorized = false;

    if (requiredRole === 'student' && session.isStudent) {
        authorized = true;
    } else if (requiredRole === 'admin' && session.isAdmin) {
        authorized = true;
    } else if (requiredRole === 'candidate' && session.isCandidate) {
        authorized = true;
    }

    if (!authorized) {
        showAlert('Unauthorized access. Please log in.', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
        return false;
    }

    return true;
}

// ============================================
// CHECK VOTING STATUS
// ============================================

async function checkVotingStatus() {
    try {
        const response = await API.get('/student/voting-status');
        return response.hasVoted || false;
    } catch (error) {
        console.error('Error checking voting status:', error);
        return false;
    }
}

// ============================================
// FETCH STUDENT PROFILE
// ============================================

async function fetchStudentProfile() {
    try {
        const response = await API.get('/student/profile');
        if (response.success) {
            return response.student;
        }
    } catch (error) {
        console.error('Error fetching student profile:', error);
        return null;
    }
}

// ============================================
// FETCH ADMIN INFO
// ============================================

async function fetchAdminInfo() {
    try {
        const response = await API.get('/admin/profile');
        if (response.success) {
            return response.admin;
        }
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        return null;
    }
}

// ============================================
// PASSWORD STRENGTH VALIDATOR
// ============================================

function validatePasswordStrength(password) {
    const strength = {
        isStrong: false,
        score: 0,
        feedback: []
    };

    if (password.length >= 8) strength.score++;
    else strength.feedback.push('Password should be at least 8 characters');

    if (/[a-z]/.test(password)) strength.score++;
    else strength.feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) strength.score++;
    else strength.feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) strength.score++;
    else strength.feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) strength.score++;
    else strength.feedback.push('Add special characters');

    strength.isStrong = strength.score >= 4;

    return strength;
}

// ============================================
// REMEMBER ME FUNCTIONALITY
// ============================================

function enableRememberMe(emailId) {
    const emailInput = document.getElementById(emailId);
    if (!emailInput) return;

    // Load saved email if exists
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
        emailInput.value = savedEmail;
    }

    // Save email on input change
    emailInput.addEventListener('change', function() {
        if (this.value) {
            localStorage.setItem('remembered_email', this.value);
        }
    });
}

// ============================================
// LOGOUT OVERRIDE
// ============================================

const originalLogout = logout;

logout = function() {
    StorageManager.remove('authToken');
    StorageManager.remove('adminToken');
    StorageManager.remove('candidateToken');
    StorageManager.remove('studentInfo');
    StorageManager.remove('adminInfo');
    StorageManager.remove('candidateInfo');

    showAlert('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1000);
};
