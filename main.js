const getApiBase = () => {
  const override =
    window.__API_BASE__ ||
    window.APP_CONFIG?.apiBase ||
    localStorage.getItem('apiBase') ||
    `${window.location.origin}/api`;

  return override.endsWith('/api') ? override : `${override.replace(/\/$/, '')}/api`;
};

const API_BASE = getApiBase();
let siteVotingOpen = true;

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (target) {
    window.location.hash = id;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 0);
  }
}

function showMessage(elementId, message, type = 'info') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  if (type === 'error') {
    el.style.background = '#fef2f2';
    el.style.borderColor = '#fecaca';
    el.style.color = '#991b1b';
  } else if (type === 'success') {
    el.style.background = '#ecfdf5';
    el.style.borderColor = '#bbf7d0';
    el.style.color = '#166534';
  } else {
    el.style.background = '#ecfeff';
    el.style.borderColor = '#a5f3fc';
    el.style.color = '#0f172a';
  }
}

function hideMessage(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('hidden');
}

function getStoredToken(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function setStoredToken(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function resizeNomineePhoto(file, maxSize = 500) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMockState() {
  const saved = localStorage.getItem('mockVotingState');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      localStorage.removeItem('mockVotingState');
    }
  }

  const state = {
    votingOpen: true,
    maxVoters: 400,
    nominees: [
      { id: 1, fullName: 'Samuel Osei', portfolio: 'Portfolio Secretary', bio: 'Aspiring student leader focused on transparency and student welfare.', voteCount: 12, votePercentage: 30, programme: 'BTECH', level: '400', photoUrl: '' },
      { id: 2, fullName: 'Martha Mensah', portfolio: 'Academic Representative', bio: 'Committed to academic advocacy and student support networks.', voteCount: 8, votePercentage: 20, programme: 'BTECH', level: '400', photoUrl: '' }
    ],
    students: [],
    approvedStudents: [
      { id: 1, firstName: 'Ama', lastName: 'Boateng', email: 'ama1@ktu.edu.gh', programme: 'BTECH', level: '400', hasVoted: 0 },
      { id: 2, firstName: 'Kojo', lastName: 'Asare', email: 'kojo1@ktu.edu.gh', programme: 'BTECH', level: '400', hasVoted: 0 },
      { id: 3, firstName: 'Efua', lastName: 'Owusu', email: 'efua1@ktu.edu.gh', programme: 'BTECH', level: '400', hasVoted: 0 },
      { id: 4, firstName: 'Daniel', lastName: 'Nkrumah', email: 'daniel1@ktu.edu.gh', programme: 'BTECH', level: '400', hasVoted: 0 }
    ],
    votes: []
  };

  localStorage.setItem('mockVotingState', JSON.stringify(state));
  return state;
}

function saveMockState(nextState) {
  localStorage.setItem('mockVotingState', JSON.stringify(nextState));
}

function mockApiRequest(endpoint, method = 'GET', body = null, token = null) {
  const state = getMockState();

  if (endpoint === '/settings') {
    return Promise.resolve({
      success: true,
      maxVoters: state.maxVoters,
      votingOpen: state.votingOpen,
      eligibleStudentCount: state.approvedStudents.length,
      votesCast: state.votes.length,
      nomineeCount: state.nominees.length,
      turnout: state.votes.length ? Number(((state.votes.length / state.approvedStudents.length) * 100).toFixed(2)) : 0
    });
  }

  if (endpoint === '/nominees') {
    const totalVotes = state.votes.length || 1;
    const nominees = state.nominees.map((nominee) => ({
      ...nominee,
      votePercentage: totalVotes === 0 ? 0 : Number(((nominee.voteCount / totalVotes) * 100).toFixed(2))
    }));
    return Promise.resolve({ success: true, nominees, totalVotes: state.votes.length });
  }

  if (endpoint === '/student/register') {
    const payload = body || {};
    const email = String(payload.email || '').trim();
    const approved = state.approvedStudents.find((student) => student.email.toLowerCase() === email.toLowerCase());
    if (!approved) {
      return Promise.reject(new Error('This email is not on the eligible student list. Please use an approved student email.'));
    }
    if (state.students.some((student) => student.email.toLowerCase() === email.toLowerCase())) {
      return Promise.reject(new Error('A student with this email already exists. Please log in instead.'));
    }

    const student = {
      id: Date.now(),
      firstName: payload.firstName,
      lastName: payload.lastName,
      email,
      indexNumber: payload.level || '400',
      level: payload.level || '400',
      programme: payload.programme || 'BTECH',
      department: 'Not set',
      hasVoted: false
    };
    state.students.push(student);
    saveMockState(state);
    return Promise.resolve({ success: true, token: 'mock-student-token', student, message: 'Student registered successfully.' });
  }

  if (endpoint === '/student/login') {
    const payload = body || {};
    const email = String(payload.email || '').trim();
    const approved = state.approvedStudents.find((student) => student.email.toLowerCase() === email.toLowerCase());
    if (!approved) {
      return Promise.reject(new Error('This email is not on the eligible student list.'));
    }
    const student = state.students.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!student) {
      return Promise.reject(new Error('Student account not found. Please register first.'));
    }
    return Promise.resolve({ success: true, token: 'mock-student-token', student: { ...student, hasVoted: student.hasVoted || false } });
  }

  if (endpoint === '/student/me') {
    return Promise.resolve({ success: true, student: { ...state.students[0], hasVoted: state.students[0]?.hasVoted || false } });
  }

  if (endpoint === '/vote') {
    const payload = body || {};
    const student = state.students[0];
    if (!student) {
      return Promise.reject(new Error('Student account not found.'));
    }
    if (!state.votingOpen) {
      return Promise.reject(new Error('Voting is currently closed.'));
    }
    if (student.hasVoted) {
      return Promise.reject(new Error('You have already voted.'));
    }
    const nominee = state.nominees.find((entry) => Number(entry.id) === Number(payload.nomineeId));
    if (!nominee) {
      return Promise.reject(new Error('Selected nominee was not found.'));
    }
    state.votes.push({ id: Date.now(), studentId: student.id, nomineeId: nominee.id, submittedAt: new Date().toISOString() });
    student.hasVoted = true;
    nominee.voteCount = (nominee.voteCount || 0) + 1;
    saveMockState(state);
    return Promise.resolve({ success: true, message: 'Vote recorded successfully.', student: { id: student.id, fullName: `${student.firstName} ${student.lastName}`, votedFor: nominee.fullName } });
  }

  if (endpoint === '/admin/login') {
    const payload = body || {};
    if (payload.username === 'admin' && payload.password === 'admin123') {
      return Promise.resolve({ success: true, token: 'mock-admin-token', admin: { id: 1, username: 'admin', fullName: 'Election Administrator' } });
    }
    return Promise.reject(new Error('Invalid admin login.'));
  }

  if (endpoint === '/admin/dashboard') {
    const totalVotes = state.votes.length;
    const winner = state.nominees.length ? state.nominees.reduce((best, nominee) => (nominee.voteCount > best.voteCount ? nominee : best), state.nominees[0]) : null;
    return Promise.resolve({
      success: true,
      stats: {
        totalVotes,
        totalStudents: state.approvedStudents.length,
        totalNominees: state.nominees.length,
        turnout: state.approvedStudents.length ? Number(((totalVotes / state.approvedStudents.length) * 100).toFixed(2)) : 0,
        votingOpen: state.votingOpen,
        maxVoters: state.maxVoters,
        winner,
        recordsByLevel: [{ level: '400', total: state.approvedStudents.length }]
      }
    });
  }

  if (endpoint === '/admin/records') {
    return Promise.resolve({
      success: true,
      records: state.votes.map((vote) => {
        const student = state.students.find((entry) => entry.id === vote.studentId) || state.approvedStudents[0];
        const nominee = state.nominees.find((entry) => Number(entry.id) === Number(vote.nomineeId)) || state.nominees[0];
        return {
          id: vote.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          indexNumber: student.indexNumber,
          level: student.level,
          programme: student.programme,
          nomineeName: nominee.fullName,
          submittedAt: vote.submittedAt
        };
      })
    });
  }

  if (endpoint === '/admin/approved-students') {
    return Promise.resolve({ success: true, students: state.approvedStudents.map((student) => ({ ...student, hasVoted: student.hasVoted || 0 })) });
  }

  if (endpoint === '/admin/nominees') {
    return Promise.resolve({ success: true, nominees: state.nominees });
  }

  if (endpoint === '/admin/sync-class-list') {
    return Promise.resolve({ success: true, message: 'Eligible student list refreshed from the Desktop class list.', total: state.approvedStudents.length });
  }

  if (endpoint === '/admin/toggle-voting') {
    const payload = body || {};
    state.votingOpen = Boolean(payload.open);
    saveMockState(state);
    return Promise.resolve({ success: true, message: `Voting ${payload.open ? 'opened' : 'closed'} successfully.`, votingOpen: Boolean(payload.open) });
  }

  if (endpoint === '/admin/votes/1' && method === 'DELETE') {
    state.votes = [];
    state.students = state.students.map((student) => ({ ...student, hasVoted: false }));
    saveMockState(state);
    return Promise.resolve({ success: true, message: 'Vote deleted successfully.' });
  }

  return Promise.reject(new Error('Mock endpoint not implemented for this request.'));
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const url = `${API_BASE}${endpoint}`;

  if (typeof fetch !== 'function') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        const text = xhr.responseText || '';
        let result = {};
        if (text) {
          try {
            result = JSON.parse(text);
          } catch (error) {
            return reject(new Error('The server returned an unexpected response. Please make sure the voting app is running and reload the page.'));
          }
        }
        if (xhr.status >= 400) {
          return reject(new Error(result.message || `Request failed (${xhr.status})`));
        }
        resolve(result);
      };
      xhr.onerror = function () {
        reject(new Error('Failed to fetch. Please make sure the voting app is running.'));
      };
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await response.text();

    let result = {};
    if (text) {
      try {
        result = JSON.parse(text);
      } catch (error) {
        if (localStorage.getItem('mockMode') === 'true') {
          return mockApiRequest(endpoint, method, body, token);
        }
        throw new Error('The server returned an unexpected response. Please make sure the voting app is running and reload the page.');
      }
    }

    if (!response.ok) {
      if (localStorage.getItem('mockMode') === 'true') {
        return mockApiRequest(endpoint, method, body, token);
      }
      throw new Error(result.message || `Request failed (${response.status})`);
    }

    return result;
  } catch (error) {
    if (localStorage.getItem('mockMode') === 'true') {
      return mockApiRequest(endpoint, method, body, token);
    }
    throw error;
  }
}

async function loadSiteStatus() {
  const maxVotersStat = document.getElementById('maxVotersStat');
  const votesCastStat = document.getElementById('votesCastStat');
  const nomineeCountStat = document.getElementById('nomineeCountStat');
  const turnoutStat = document.getElementById('turnoutStat');
  const badge = document.getElementById('siteStatusBadge');

  if (!maxVotersStat && !votesCastStat && !nomineeCountStat && !turnoutStat && !badge) {
    return;
  }

  try {
    const data = await apiRequest('/settings');
    siteVotingOpen = Boolean(data.votingOpen);

    if (maxVotersStat) maxVotersStat.textContent = data.maxVoters ?? 400;
    if (votesCastStat) votesCastStat.textContent = data.votesCast || 0;
    if (nomineeCountStat) nomineeCountStat.textContent = data.nomineeCount || 0;
    if (turnoutStat) turnoutStat.textContent = `${data.turnout || 0}%`;

    if (badge) {
      if (siteVotingOpen) {
        badge.textContent = 'Voting Open';
        badge.className = 'badge open';
      } else {
        badge.textContent = 'Voting Closed';
        badge.className = 'badge closed';
      }
    }
  } catch (error) {
    console.error('Failed to load site status', error);
  }
}

async function loadNomineesList() {
  const nomineeCards = document.getElementById('nomineeCards');
  if (!nomineeCards) return;

  try {
    const data = await apiRequest('/nominees');

    if (!data.nominees || data.nominees.length === 0) {
      nomineeCards.innerHTML = '<div class="card">No nominees available yet.</div>';
      return;
    }

    const studentToken = getStoredToken('studentToken');
    const studentInfo = getStoredToken('studentInfo');
    const hasVoted = studentInfo?.hasVoted || false;
    const votingDisabled = !studentToken || hasVoted || !siteVotingOpen;

    const portfolioOrder = ['President', 'General Secretary', 'Public Relations Officer', 'Financial Officer', 'Organizer', 'Women Commissioner'];
    const groupedNominees = data.nominees.reduce((groups, nominee) => {
      const portfolio = nominee.portfolio || 'Other';
      (groups[portfolio] ||= []).push(nominee);
      return groups;
    }, {});
    const orderedPortfolios = [...new Set([...portfolioOrder, ...Object.keys(groupedNominees)])].filter((portfolio) => groupedNominees[portfolio]);

    nomineeCards.innerHTML = `<form id="studentBallotForm">${orderedPortfolios.map((portfolio) => `<section class="card" style="border:2px solid #dbe3ef;"><h3>${portfolio}</h3>${groupedNominees[portfolio].map((nominee) => {
      const photoHtml = nominee.photoUrl
        ? `<img src="${nominee.photoUrl}" alt="${nominee.fullName}" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:2px solid #dbe3ef;margin-bottom:12px;" />`
        : `<div style="width:84px;height:84px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-weight:700;color:#475569;">${(nominee.fullName || 'N').charAt(0).toUpperCase()}</div>`;

      return `
        <div class="card">
          <div>
            <div style="display:flex;align-items:center;gap:12px;">
              ${photoHtml}
              <div>
                <h4>${nominee.fullName}</h4>
                <div class="muted">${nominee.portfolio || 'Portfolio'}${nominee.portfolio === 'President' ? ' - choose one candidate' : ' - approve this nominee'}</div>
              </div>
            </div>
          </div>
          <p>${nominee.bio || 'No profile information set yet.'}</p>
          ${nominee.portfolio === 'President'
            ? `<label><input type="radio" name="president" value="${nominee.id}" data-choice="YES" ${votingDisabled ? 'disabled' : ''} required /> Select this President</label>`
            : `<div style="display:flex;gap:18px;"><label><input type="radio" name="nominee-${nominee.id}" value="${nominee.id}" data-choice="YES" ${votingDisabled ? 'disabled' : ''} required /> Yes</label><label><input type="radio" name="nominee-${nominee.id}" value="${nominee.id}" data-choice="NO" ${votingDisabled ? 'disabled' : ''} required /> No</label></div>`}
        </div>
      `;
    }).join('')}</section>`).join('')}<button class="btn vote-btn" type="submit" ${votingDisabled ? 'disabled' : ''}>Submit Ballot</button></form>`;

    const ballotForm = document.getElementById('studentBallotForm');
    if (ballotForm) ballotForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!siteVotingOpen) return;
      const selections = [...ballotForm.querySelectorAll('input[type="radio"]:checked')].map((input) => ({ nomineeId: Number(input.value), choice: input.dataset.choice }));
      try {
        const result = await apiRequest('/vote', 'POST', { selections }, studentToken);
        showMessage('studentMessage', result.message, 'success');
        const currentStudentInfo = getStoredToken('studentInfo');
        if (currentStudentInfo) { currentStudentInfo.hasVoted = true; setStoredToken('studentInfo', currentStudentInfo); }
        const status = document.getElementById('studentStatus');
        if (status) status.textContent = 'Voted';
        await loadNomineesList();
      } catch (error) { showMessage('studentMessage', error.message, 'error'); }
    });
  } catch (error) {
    console.error('Failed to load nominees', error);
  }
}

async function handleStudentRegister(event) {
  event.preventDefault();
  const firstName = document.getElementById('registerStudentFirstName').value.trim();
  const lastName = document.getElementById('registerStudentLastName').value.trim();
  const email = document.getElementById('registerStudentEmail').value.trim();

  if (!firstName || !lastName || !email) {
    showMessage('studentMessage', 'Please complete all student registration fields.', 'error');
    return;
  }

  try {
    const result = await apiRequest('/student/register', 'POST', {
      firstName,
      lastName,
      email
    });

    setStoredToken('studentToken', result.token);
    setStoredToken('studentInfo', result.student);
    showMessage('studentMessage', result.message || 'Student registered successfully.', 'success');
    setTimeout(() => {
      window.location.href = 'voting.html';
    }, 700);
  } catch (error) {
    showMessage('studentMessage', error.message, 'error');
  }
}

async function handleStudentLogin(event) {
  event.preventDefault();
  const firstName = document.getElementById('studentFirstName').value.trim();
  const lastName = document.getElementById('studentLastName').value.trim();
  const email = document.getElementById('studentEmail').value.trim();

  if (!firstName || !lastName || !email) {
    showMessage('studentMessage', 'Please enter your full name and personal email.', 'error');
    return;
  }

  try {
    const result = await apiRequest('/student/login', 'POST', {
      firstName,
      lastName,
      email
    });
    setStoredToken('studentToken', result.token);
    setStoredToken('studentInfo', result.student);
    showMessage('studentMessage', 'Login successful. Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = 'voting.html';
    }, 600);
  } catch (error) {
    showMessage('studentMessage', error.message, 'error');
  }
}

async function showStudentDashboard() {
  const token = getStoredToken('studentToken');
  if (!token) return;

  try {
    const result = await apiRequest('/student/me', 'GET', null, token);
    const student = result.student;
    setStoredToken('studentInfo', student);
    const dashboard = document.getElementById('studentDashboard');
    const greeting = document.getElementById('studentGreeting');
    const name = document.getElementById('studentName');
    const indexDisplay = document.getElementById('studentIndexDisplay');
    const programme = document.getElementById('studentProgramme');
    const status = document.getElementById('studentStatus');

    if (dashboard) dashboard.classList.add('active');
    if (greeting) greeting.textContent = `Welcome, ${student.firstName || 'Student'}!`;
    if (name) name.textContent = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    if (indexDisplay) indexDisplay.textContent = student.level || student.indexNumber || '-';
    if (programme) programme.textContent = student.programme || 'Not set';
    if (status) status.textContent = student.hasVoted ? 'Voted' : 'Not Voted';
    await loadNomineesList();
  } catch (error) {
    console.error(error);
    logoutStudent();
  }
}

function logoutStudent() {
  localStorage.removeItem('studentToken');
  localStorage.removeItem('studentInfo');
  const dashboard = document.getElementById('studentDashboard');
  if (dashboard) dashboard.classList.remove('active');
  const message = document.getElementById('studentMessage');
  if (message) message.classList.add('hidden');
  window.location.href = 'index.html';
}

async function handleNomineeRegister(event) {
  event.preventDefault();
  const fullName = document.getElementById('registerNomineeName').value.trim();
  const email = document.getElementById('registerNomineeEmail').value.trim();
  const password = document.getElementById('registerNomineePassword').value.trim();
  const portfolio = document.getElementById('registerNomineePortfolio').value.trim();
  const bio = document.getElementById('registerNomineeBio').value.trim();
  const programme = document.getElementById('registerNomineeProgramme').value.trim();
  const level = document.getElementById('registerNomineeLevel').value.trim();
  const photoInput = document.getElementById('registerNomineePhoto');

  if (!fullName || !email || !password || !portfolio || !programme || !level) {
    showMessage('nomineeMessage', 'Please complete all nominee registration fields.', 'error');
    return;
  }

  const payload = { fullName, email, password, portfolio, bio, programme, level, photoUrl: null };

  if (photoInput && photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      showMessage('nomineeMessage', 'Photo must be smaller than 2MB.', 'error');
      return;
    }
    resizeNomineePhoto(file).then(async (photoUrl) => {
      payload.photoUrl = photoUrl;
      try {
        const result = await apiRequest('/nominee/register', 'POST', payload);
        setStoredToken('nomineeToken', result.token);
        setStoredToken('nomineeInfo', result.nominee);
        showMessage('nomineeMessage', result.message || 'Nominee registered successfully.', 'success');
        setTimeout(() => window.location.href = 'nominee-dashboard.html', 700);
      } catch (error) {
        showMessage('nomineeMessage', error.message, 'error');
      }
    }).catch(() => showMessage('nomineeMessage', 'Unable to process the selected photo.', 'error'));
    return;
  }

  try {
    const result = await apiRequest('/nominee/register', 'POST', payload);
    setStoredToken('nomineeToken', result.token);
    setStoredToken('nomineeInfo', result.nominee);
    showMessage('nomineeMessage', result.message || 'Nominee registered successfully.', 'success');
    setTimeout(() => window.location.href = 'nominee-dashboard.html', 700);
  } catch (error) {
    showMessage('nomineeMessage', error.message, 'error');
  }
}

async function handleNomineeLogin(event) {
  event.preventDefault();
  const email = document.getElementById('nomineeEmail').value.trim();
  const password = document.getElementById('nomineePassword').value.trim();

  if (!email || !password) {
    showMessage('nomineeMessage', 'Please enter your email and password.', 'error');
    return;
  }

  try {
    const result = await apiRequest('/nominee/login', 'POST', { email, password });
    setStoredToken('nomineeToken', result.token);
    setStoredToken('nomineeInfo', result.nominee);
    showMessage('nomineeMessage', 'Nominee login successful.', 'success');
    setTimeout(() => {
      window.location.href = 'nominee-dashboard.html';
    }, 600);
  } catch (error) {
    showMessage('nomineeMessage', error.message, 'error');
  }
}

async function showNomineeDashboard() {
  const token = getStoredToken('nomineeToken');
  if (!token) return;

  try {
    const result = await apiRequest('/nominee/me', 'GET', null, token);
    const nominee = result.nominee;
    setStoredToken('nomineeInfo', nominee);
    document.getElementById('nomineeDashboard').classList.add('active');
    document.getElementById('nomineeProfileSummary').textContent = `${nominee.fullName} • ${nominee.portfolio}`;
    document.getElementById('profileName').value = nominee.fullName || '';
    document.getElementById('profilePortfolio').value = nominee.portfolio || '';
    document.getElementById('profileBio').value = nominee.bio || '';
    document.getElementById('profileProgramme').value = nominee.programme || 'BTECH';
    document.getElementById('profileLevel').value = nominee.level || '400';
    const profilePhoto = document.getElementById('profilePhotoPreview');
    if (profilePhoto) {
      if (nominee.photoUrl) {
        profilePhoto.src = nominee.photoUrl;
        profilePhoto.classList.remove('hidden');
      } else {
        profilePhoto.removeAttribute('src');
        profilePhoto.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error(error);
    logoutNominee();
  }
}

function logoutNominee() {
  localStorage.removeItem('nomineeToken');
  localStorage.removeItem('nomineeInfo');
  document.getElementById('nomineeDashboard').classList.remove('active');
  document.getElementById('nomineeMessage').classList.add('hidden');
  window.location.href = 'index.html';
}

async function handleNomineeProfileForm(event) {
  event.preventDefault();
  const token = getStoredToken('nomineeToken');
  if (!token) return;

  const photoInput = document.getElementById('profilePhotoInput');
  const payload = {
    fullName: document.getElementById('profileName').value.trim(),
    portfolio: document.getElementById('profilePortfolio').value.trim(),
    bio: document.getElementById('profileBio').value.trim(),
    programme: document.getElementById('profileProgramme').value.trim(),
    level: document.getElementById('profileLevel').value.trim(),
    photoUrl: null
  };

  if (photoInput && photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      showMessage('nomineeMessage', 'Photo must be less than 2MB.', 'error');
      return;
    }
    resizeNomineePhoto(file).then(async (photoUrl) => {
      payload.photoUrl = photoUrl;
      try {
        const result = await apiRequest('/nominee/profile', 'PUT', payload, token);
        showMessage('nomineeMessage', result.message, 'success');
        await showNomineeDashboard();
      } catch (error) {
        showMessage('nomineeMessage', error.message, 'error');
      }
    }).catch(() => showMessage('nomineeMessage', 'Unable to process the selected photo.', 'error'));
    return;
  }

  try {
    const result = await apiRequest('/nominee/profile', 'PUT', payload, token);
    showMessage('nomineeMessage', result.message, 'success');
    await showNomineeDashboard();
  } catch (error) {
    showMessage('nomineeMessage', error.message, 'error');
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById('adminUser').value.trim();
  const password = document.getElementById('adminPass').value.trim();

  try {
    const result = await apiRequest('/admin/login', 'POST', { username, password });
    setStoredToken('adminToken', result.token);
    showMessage('adminMessage', 'Admin login successful.', 'success');
    await showAdminDashboard();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

async function handleAdminPasswordChange(event) {
  event.preventDefault();
  const token = getStoredToken('adminToken');
  if (!token) return;

  const currentPassword = document.getElementById('currentAdminPassword').value;
  const newPassword = document.getElementById('newAdminPassword').value;
  if (!currentPassword || newPassword.length < 8) {
    showMessage('adminMessage', 'Enter your current password and a new password of at least 8 characters.', 'error');
    return;
  }

  try {
    const result = await apiRequest('/admin/password', 'PUT', { currentPassword, newPassword }, token);
    showMessage('adminMessage', result.message, 'success');
    document.getElementById('adminPasswordForm').reset();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

async function showAdminDashboard() {
  const token = getStoredToken('adminToken');
  if (!token) return;

  try {
    const dashboard = await apiRequest('/admin/dashboard', 'GET', null, token);
    const records = await apiRequest('/admin/records', 'GET', null, token);
    const approvedStudents = await apiRequest('/admin/approved-students', 'GET', null, token);
    const nomineesData = await apiRequest('/admin/nominees', 'GET', null, token);
    const stats = dashboard.stats;

    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) adminDashboard.classList.add('active');

    const totalStudents = document.getElementById('adminTotalStudents');
    if (totalStudents) totalStudents.textContent = stats.totalStudents || 0;

    const votesCast = document.getElementById('adminVotesCast');
    if (votesCast) votesCast.textContent = stats.totalVotes || 0;

    const adminNominees = document.getElementById('adminNominees');
    if (adminNominees) adminNominees.textContent = stats.totalNominees || 0;

    const adminTurnout = document.getElementById('adminTurnout');
    if (adminTurnout) adminTurnout.textContent = `${stats.turnout || 0}%`;

    const adminVotingStatus = document.getElementById('adminVotingStatus');
    if (adminVotingStatus) adminVotingStatus.textContent = `Voting status: ${stats.votingOpen ? 'Open' : 'Closed'}`;

    const adminGreeting = document.getElementById('adminGreeting');
    if (adminGreeting) adminGreeting.textContent = `Winner: ${stats.winner ? stats.winner.fullName : 'Pending'}`;

    const winnerDisplay = document.getElementById('winnerDisplay');
    if (winnerDisplay) winnerDisplay.textContent = stats.winner ? `${stats.winner.fullName} leads with ${stats.winner.voteCount} votes` : 'No winner declared yet.';

    const openBtn = document.getElementById('openVotingBtn');
    const closeBtn = document.getElementById('closeVotingBtn');
    if (openBtn) openBtn.disabled = stats.votingOpen;
    if (closeBtn) closeBtn.disabled = !stats.votingOpen;

    const tableBody = document.getElementById('recordsTableBody');
    if (tableBody) {
      tableBody.innerHTML = (records.records || []).map((row) => `
        <tr>
          <td>${row.firstName} ${row.lastName}</td>
          <td>${row.email}</td>
          <td>${row.programme || 'N/A'}</td>
          <td>${row.level || row.indexNumber || 'N/A'}</td>
          <td>${row.nomineeName}</td>
          <td>${new Date(row.submittedAt).toLocaleString()}</td>
          <td><button class="btn danger" type="button" data-delete-vote="${row.id}">Delete</button></td>
        </tr>
      `).join('') || '<tr><td colspan="7">No voting records yet.</td></tr>';

      tableBody.querySelectorAll('[data-delete-vote]').forEach((button) => {
        button.addEventListener('click', async () => {
          const voteId = Number(button.dataset.deleteVote);
          if (!voteId) return;
          try {
            const result = await apiRequest(`/admin/votes/${voteId}`, 'DELETE', null, token);
            showMessage('adminMessage', result.message, 'success');
            await showAdminDashboard();
          } catch (error) {
            showMessage('adminMessage', error.message, 'error');
          }
        });
      });
    }

    const approvedStudentsTableBody = document.getElementById('approvedStudentsTableBody');
    if (approvedStudentsTableBody) {
      approvedStudentsTableBody.innerHTML = (approvedStudents.students || []).map((student) => `
        <tr>
          <td>${student.firstName || ''} ${student.lastName || ''}</td>
          <td>${student.email || 'N/A'}</td>
          <td>${student.programme || 'N/A'}</td>
          <td>${student.level || 'N/A'}</td>
          <td>${Number(student.hasVoted) === 1 ? '✔' : '—'}</td>
        </tr>
      `).join('') || '<tr><td colspan="5">No approved students loaded yet.</td></tr>';
    }

    const nomineeTableBody = document.getElementById('adminNomineeTableBody');
    if (nomineeTableBody) {
      nomineeTableBody.innerHTML = (nomineesData.nominees || []).map((nominee) => `
        <tr>
          <td>${nominee.fullName}</td>
          <td>${nominee.portfolio || 'N/A'}</td>
          <td>${nominee.programme || 'N/A'}</td>
          <td>${nominee.level || 'N/A'}</td>
          <td>${nominee.yesVotes ?? nominee.voteCount ?? 0}</td>
          <td>${nominee.noVotes || 0}</td>
          <td><button class="btn danger" type="button" data-delete-nominee="${nominee.id}">Remove</button></td>
        </tr>
      `).join('') || '<tr><td colspan="7">No nominees added yet.</td></tr>';

      nomineeTableBody.querySelectorAll('[data-delete-nominee]').forEach((button) => {
        button.addEventListener('click', async () => {
          const nomineeId = Number(button.dataset.deleteNominee);
          if (!nomineeId) return;
          try {
            const result = await apiRequest(`/admin/nominees/${nomineeId}`, 'DELETE', null, token);
            showMessage('adminMessage', result.message, 'success');
            await showAdminDashboard();
          } catch (error) {
            showMessage('adminMessage', error.message, 'error');
          }
        });
      });
    }
  } catch (error) {
    console.error(error);
    logoutAdmin();
  }
}

async function handleAdminAddNominee(event) {
  event.preventDefault();
  const token = getStoredToken('adminToken');
  if (!token) return;

  const fullName = document.getElementById('adminNomineeName').value.trim();
  const email = document.getElementById('adminNomineeEmail').value.trim();
  const password = document.getElementById('adminNomineePassword').value.trim();
  const portfolio = document.getElementById('adminNomineePortfolio').value.trim();
  const bio = document.getElementById('adminNomineeBio').value.trim();
  const programme = document.getElementById('adminNomineeProgramme').value.trim();
  const level = document.getElementById('adminNomineeLevel').value.trim();
  const photoInput = document.getElementById('adminNomineePhoto');

  if (!fullName || !email || !portfolio || !programme || !level) {
    showMessage('adminMessage', 'Please complete the nominee details.', 'error');
    return;
  }

  const payload = {
    fullName,
    email,
    password: password || 'nominee123',
    portfolio,
    bio,
    programme,
    level,
    photoUrl: null
  };

  if (photoInput && photoInput.files && photoInput.files[0]) {
    const file = photoInput.files[0];
    if (file.size > 2 * 1024 * 1024) {
      showMessage('adminMessage', 'Photo must be smaller than 2MB.', 'error');
      return;
    }

    resizeNomineePhoto(file).then(async (photoUrl) => {
      payload.photoUrl = photoUrl;
      try {
        const result = await apiRequest('/admin/nominees', 'POST', payload, token);
        showMessage('adminMessage', result.message, 'success');
        const form = document.getElementById('adminNomineeForm');
        if (form) form.reset();
        await showAdminDashboard();
      } catch (error) {
        showMessage('adminMessage', error.message, 'error');
      }
    }).catch(() => showMessage('adminMessage', 'Unable to process the selected photo.', 'error'));
    return;
  }

  try {
    const result = await apiRequest('/admin/nominees', 'POST', payload, token);
    showMessage('adminMessage', result.message, 'success');
    const form = document.getElementById('adminNomineeForm');
    if (form) form.reset();
    await showAdminDashboard();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

async function handleBulkApprovedStudents(event) {
  event.preventDefault();
  const token = getStoredToken('adminToken');
  if (!token) return;

  const listText = document.getElementById('bulkApprovedStudentsInput').value.trim();
  if (!listText) {
    showMessage('adminMessage', 'Paste one student per line before adding the approved list.', 'error');
    return;
  }

  try {
    const result = await apiRequest('/admin/approved-students/bulk', 'POST', { text: listText }, token);
    showMessage('adminMessage', result.message, 'success');
    const form = document.getElementById('bulkApprovedStudentsForm');
    if (form) form.reset();
    await showAdminDashboard();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

function logoutAdmin() {
  localStorage.removeItem('adminToken');
  const adminDashboard = document.getElementById('adminDashboard');
  if (adminDashboard) adminDashboard.classList.remove('active');
  const adminMessage = document.getElementById('adminMessage');
  if (adminMessage) adminMessage.classList.add('hidden');
  window.location.href = 'index.html';
}

async function toggleVoting(open) {
  const token = getStoredToken('adminToken');
  if (!token) return;

  try {
    const result = await apiRequest('/admin/toggle-voting', 'POST', { open }, token);
    showMessage('adminMessage', result.message, 'success');
    await showAdminDashboard();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

async function syncClassList() {
  const token = getStoredToken('adminToken');
  if (!token) return;

  try {
    const result = await apiRequest('/admin/sync-class-list', 'POST', {}, token);
    showMessage('adminMessage', result.message, 'success');
    await showAdminDashboard();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

async function exportRecords() {
  const token = getStoredToken('adminToken');
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/admin/export`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ktu-voting-records.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showMessage('adminMessage', 'CSV export failed.', 'error');
  }
}

async function clearAllVotes() {
  const token = getStoredToken('adminToken');
  if (!token || !window.confirm('Clear all vote records and reset all nominee totals?')) return;

  try {
    const result = await apiRequest('/admin/votes', 'DELETE', null, token);
    showMessage('adminMessage', result.message, 'success');
    await showAdminDashboard();
  } catch (error) {
    showMessage('adminMessage', error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const studentLoginForm = document.getElementById('studentLoginForm');
  if (studentLoginForm) studentLoginForm.addEventListener('submit', handleStudentLogin);

  const studentRegisterForm = document.getElementById('studentRegisterForm');
  if (studentRegisterForm) studentRegisterForm.addEventListener('submit', handleStudentRegister);

  const nomineeLoginForm = document.getElementById('nomineeLoginForm');
  if (nomineeLoginForm) nomineeLoginForm.addEventListener('submit', handleNomineeLogin);

  const nomineeRegisterForm = document.getElementById('nomineeRegisterForm');
  if (nomineeRegisterForm) nomineeRegisterForm.addEventListener('submit', handleNomineeRegister);

  const nomineeProfileForm = document.getElementById('nomineeProfileForm');
  if (nomineeProfileForm) nomineeProfileForm.addEventListener('submit', handleNomineeProfileForm);

  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);

  const adminNomineeForm = document.getElementById('adminNomineeForm');
  if (adminNomineeForm) adminNomineeForm.addEventListener('submit', handleAdminAddNominee);

  const adminPasswordForm = document.getElementById('adminPasswordForm');
  if (adminPasswordForm) adminPasswordForm.addEventListener('submit', handleAdminPasswordChange);

  const bulkApprovedStudentsForm = document.getElementById('bulkApprovedStudentsForm');
  if (bulkApprovedStudentsForm) bulkApprovedStudentsForm.addEventListener('submit', handleBulkApprovedStudents);

  const exportVotesBtn = document.getElementById('exportVotesBtn');
  if (exportVotesBtn) exportVotesBtn.addEventListener('click', exportRecords);

  const clearAllVotesBtn = document.getElementById('clearAllVotesBtn');
  if (clearAllVotesBtn) clearAllVotesBtn.addEventListener('click', clearAllVotes);

  const syncClassListBtn = document.getElementById('syncClassListBtn');
  if (syncClassListBtn) syncClassListBtn.addEventListener('click', syncClassList);

  const openVotingBtn = document.getElementById('openVotingBtn');
  if (openVotingBtn) openVotingBtn.addEventListener('click', () => toggleVoting(true));

  const closeVotingBtn = document.getElementById('closeVotingBtn');
  if (closeVotingBtn) closeVotingBtn.addEventListener('click', () => toggleVoting(false));

  const studentToken = getStoredToken('studentToken');
  if (studentToken) {
    showStudentDashboard();
  }

  const nomineeToken = getStoredToken('nomineeToken');
  if (nomineeToken) {
    showNomineeDashboard();
  }

  await loadSiteStatus();
  await loadNomineesList();
});
// LOGOUT FUNCTION
// ============================================

function logout() {
    StorageManager.remove('authToken');
    StorageManager.remove('studentInfo');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 1000);
}

// ============================================
// AUTHENTICATION CHECK
// ============================================

function isAuthenticated() {
    return StorageManager.get('authToken') !== null;
}

function getAuthToken() {
    return StorageManager.get('authToken');
}

function getStudentInfo() {
    return StorageManager.get('studentInfo');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', function(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }
});

// ============================================
// PERFORMANCE OPTIMIZATION
// ============================================

// Debounce function for scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for resize events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// EXPORT FOR USE IN OTHER MODULES
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateEmail,
        validateForm,
        showToast,
        StorageManager,
        API,
        createModal,
        isAuthenticated,
        logout
    };
}
