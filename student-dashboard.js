/* ============================================
   STUDENT DASHBOARD JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Verify authentication
    if (!requireAuth('student')) return;

    initializeStudentDashboard();
    initializeCountdown();
});

// ============================================
// INITIALIZE DASHBOARD
// ============================================

async function initializeStudentDashboard() {
    try {
        // Get student info from storage or fetch from server
        const studentInfo = StorageManager.get('studentInfo') || await fetchStudentProfile();

        if (!studentInfo) {
            showAlert('Failed to load student information', 'error');
            return;
        }

        // Populate student information
        displayStudentInfo(studentInfo);

        // Check voting status
        await checkAndDisplayVotingStatus();

    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAlert('An error occurred. Please refresh the page.', 'error');
    }
}

// ============================================
// DISPLAY STUDENT INFORMATION
// ============================================

function displayStudentInfo(student) {
    // Update greeting
    const nameElement = document.getElementById('studentName');
    if (nameElement) {
        nameElement.textContent = student.firstName || 'Student';
    }

    // Update email
    const emailElement = document.getElementById('studentEmail');
    if (emailElement) {
        emailElement.textContent = student.email || 'N/A';
    }

    // Update info cards
    updateInfoCard('infoName', student.firstName + ' ' + student.lastName || 'N/A');
    updateInfoCard('infoIndex', student.indexNumber || 'N/A');
    updateInfoCard('infoLevel', 'Level ' + student.level || 'N/A');
    updateInfoCard('infoProgramme', student.programme || 'N/A');
    updateInfoCard('infoDepartment', student.department || 'N/A');
}

function updateInfoCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// ============================================
// CHECK AND DISPLAY VOTING STATUS
// ============================================

async function checkAndDisplayVotingStatus() {
    try {
        const hasVoted = await checkVotingStatus();

        const statusElement = document.getElementById('votingStatusText');
        const statusAlert = document.getElementById('votingStatusAlert');
        const voteBtn = document.getElementById('voteBtn');

        if (hasVoted) {
            // Student has already voted
            if (statusElement) {
                statusElement.textContent = 'VOTE SUBMITTED';
                statusElement.style.color = '#27AE60';
            }

            if (statusAlert) {
                statusAlert.className = 'voting-status voted';
                statusAlert.innerHTML = `
                    <h2>✓ Vote Submitted Successfully</h2>
                    <p>Thank you for participating in the KTU Level 400 Student Election 2026. Your vote has been securely recorded.</p>
                `;
            }

            if (voteBtn) {
                voteBtn.disabled = true;
                voteBtn.style.opacity = '0.5';
                voteBtn.style.cursor = 'not-allowed';
                voteBtn.textContent = 'You Have Already Voted';
            }
        } else {
            // Student has not voted yet
            if (statusElement) {
                statusElement.textContent = 'NOT YET VOTED';
                statusElement.style.color = '#F39C12';
            }

            if (statusAlert) {
                statusAlert.className = 'voting-status not-voted';
            }

            if (voteBtn) {
                voteBtn.disabled = false;
                voteBtn.style.opacity = '1';
                voteBtn.style.cursor = 'pointer';
                voteBtn.textContent = 'Cast Your Vote';
            }
        }
    } catch (error) {
        console.error('Error checking voting status:', error);
    }
}

// ============================================
// FAQ FUNCTIONALITY
// ============================================

function showFAQ() {
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
        faqModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeFAQ() {
    const faqModal = document.getElementById('faqModal');
    if (faqModal) {
        faqModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close FAQ when clicking outside modal
window.addEventListener('click', function(event) {
    const faqModal = document.getElementById('faqModal');
    if (event.target === faqModal) {
        closeFAQ();
    }
});

// ============================================
// COUNTDOWN TIMER
// ============================================

function initializeCountdown() {
    // Set election close time
    const electionCloseTime = new Date(2026, 1, 20, 17, 0, 0); // Feb 20, 2026, 5:00 PM

    function updateCountdown() {
        const now = new Date();
        const timeRemaining = electionCloseTime - now;

        if (timeRemaining <= 0) {
            displayCountdownClosed();
            return;
        }

        // Calculate time units
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        // Update DOM
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');

        // Check if election is about to close (less than 1 hour)
        if (timeRemaining < 3600000 && timeRemaining > 0) {
            const countdownSection = document.querySelector('.countdown-section');
            if (countdownSection) {
                countdownSection.style.backgroundColor = '#fff3cd';
                countdownSection.style.borderLeft = '5px solid var(--accent-yellow)';
            }
        }
    }

    updateCountdown(); // Initial call
    setInterval(updateCountdown, 1000);
}

function displayCountdownClosed() {
    const countdown = document.getElementById('countdown');
    if (countdown) {
        countdown.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #C41E3A; font-weight: bold; font-size: 1.5rem;">
                ELECTION CLOSED
            </div>
        `;
    }

    // Disable voting button
    const voteBtn = document.getElementById('voteBtn');
    if (voteBtn) {
        voteBtn.disabled = true;
        voteBtn.style.opacity = '0.5';
        voteBtn.textContent = 'Election Closed';
    }

    // Update status alert
    const statusAlert = document.getElementById('votingStatusAlert');
    if (statusAlert) {
        statusAlert.innerHTML = `
            <h2>Election Closed</h2>
            <p>The voting period has ended. Thank you for your participation!</p>
        `;
    }
}

// ============================================
// AUTO-REFRESH VOTING STATUS
// ============================================

// Refresh voting status every 30 seconds
setInterval(function() {
    checkAndDisplayVotingStatus();
}, 30000);

// ============================================
// SESSION TIMEOUT WARNING
// ============================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
let sessionTimer;
let sessionWarningShown = false;

function resetSessionTimer() {
    clearTimeout(sessionTimer);

    sessionTimer = setTimeout(function() {
        if (!sessionWarningShown) {
            sessionWarningShown = true;
            showSessionWarning();
        }
    }, SESSION_TIMEOUT);
}

function showSessionWarning() {
    createModal(
        'Session Timeout Warning',
        'Your session will expire in 5 minutes due to inactivity. Please save any unsaved work.',
        [
            {
                text: 'Continue Session',
                class: 'btn btn-primary',
                onClick: function() {
                    document.querySelector('.modal').remove();
                    sessionWarningShown = false;
                    resetSessionTimer();
                }
            },
            {
                text: 'Logout Now',
                class: 'btn btn-secondary',
                onClick: function() {
                    logout();
                }
            }
        ]
    );
}

// Reset timer on user activity
document.addEventListener('click', resetSessionTimer);
document.addEventListener('keypress', resetSessionTimer);
document.addEventListener('mousemove', resetSessionTimer);

// Initialize session timer on page load
resetSessionTimer();

// ============================================
// EXPORT FOR USE IN OTHER MODULES
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeStudentDashboard,
        checkAndDisplayVotingStatus,
        showFAQ,
        closeFAQ
    };
}
