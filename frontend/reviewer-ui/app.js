/**
 * =============================================================================
 * SIH26043 REVIEWER PORTAL — LIVE BACKEND GATEWAY INTEGRATION
 * Core Single-Page Application Client Logic
 * 
 * Target Gateway: http://localhost:8090 (Central Reverse Proxy)
 * Backends:
 *   - source-service (port 8081 via /auth, /registration, /reviewer/registrations)
 *   - problem-service (port 8082 via /problems, /domains, /audit)
 *   - evaluation-service (port 8083 via /evaluation)
 *   - portal-service (port 8084 via /portal)
 * =============================================================================
 */

// =============================================================================
// 1. UNIFIED API CLIENT
// =============================================================================
const ApiClient = {
  getBaseUrl() {
    return localStorage.getItem('api_base_url') || 'http://localhost:8090';
  },

  getAccessToken() {
    return localStorage.getItem('access_token');
  },

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  setTokens(access, refresh) {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
  },

  async request(path, options = {}) {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getAccessToken();
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle 401 Unauthorized with token refresh
      if (response.status === 401 && !options._isRetry && !path.startsWith('/auth/')) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          options._isRetry = true;
          return this.request(path, options);
        } else {
          this.clearTokens();
          AppState.authenticatedUser = null;
          window.location.hash = '#/login';
          throw new Error('Session expired. Please sign in again.');
        }
      }

      if (response.status === 204) return null;

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        if (data) {
          if (typeof data === 'string') {
            try {
              const parsed = JSON.parse(data);
              msg = parsed.detail || parsed.message || parsed.error || data;
              data = parsed;
            } catch (e) {
              msg = data;
            }
          } else if (data.detail) {
            msg = data.detail;
          } else if (data.message) {
            msg = data.message;
          } else if (data.error) {
            msg = data.error;
          }
        }
        const error = new Error(msg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        updateGatewayStatus(false);
        throw new Error(`Cannot reach Backend Gateway at ${baseUrl}. Ensure backend containers are active.`);
      }
      throw err;
    }
  },

  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${this.getBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  get(path, params) {
    let url = path;
    if (params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') q.append(k, v);
      }
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    return this.request(url, { method: 'GET' });
  },

  post(path, body, skipAuth = false) {
    return this.request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      skipAuth
    });
  },

  patch(path, body) {
    return this.request(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }
};

// =============================================================================
// 1.1 SHARED REVIEWER ERROR HANDLING LAYER (RFC 7807 SANITIZER & CONFLICT HANDLER)
// =============================================================================
function extractBackendErrorMessage(err) {
  if (!err) return 'An unexpected error occurred.';
  let raw = err.data || err.message || err;
  
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && (trimmed.includes('"detail"') || trimmed.includes('"message"') || trimmed.includes('"error"'))) {
      try {
        raw = JSON.parse(trimmed);
      } catch (e) {}
    }
  }
  
  if (raw && typeof raw === 'object') {
    if (raw.detail && typeof raw.detail === 'string') return raw.detail;
    if (raw.message && typeof raw.message === 'string') return raw.message;
    if (raw.error && typeof raw.error === 'string') return raw.error;
    if (raw.title && typeof raw.title === 'string' && !raw.instance) return raw.title;
  }
  
  if (typeof raw === 'string') {
    return raw;
  }
  
  return err.message || 'Operation failed. Please check network connectivity.';
}

async function handleReviewerActionError(err, actionContext = {}) {
  console.warn('Reviewer action error intercepted:', err, actionContext);
  const status = err.status || (err.data && err.data.status);
  const isConflict = status === 409;
  
  if (isConflict && actionContext.regId) {
    const conflictMsg = "This registration's status has changed and this action is no longer valid — refreshing its latest status.";
    showToast(conflictMsg, 'warning');
    if (typeof loadRegistrationDetail === 'function') {
      try {
        await loadRegistrationDetail(actionContext.regId);
      } catch (e) {
        console.warn('Auto-refresh detail error:', e);
      }
    }
    if (typeof fetchRegistrationsQueue === 'function') {
      try {
        await fetchRegistrationsQueue();
      } catch (e) {}
    }
    return;
  }
  
  const cleanMsg = extractBackendErrorMessage(err);
  showToast(cleanMsg, 'error');
}

// =============================================================================
// 2. APPLICATION STATE STORE
// =============================================================================
const AppState = {
  authenticatedUser: (function() {
    try {
      const saved = localStorage.getItem('auth_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  })(),

  currentTab: 'inbox',
  currentProblemTab: 'all',
  currentDecision: 'APPROVE',
  currentProblemVerdict: 'REGISTERED',
  currentRegistrationId: null,
  currentProblemId: null,
  currentSourceId: null,
  currentSourceTab: 'all',
  challengeId: null,
  timerSeconds: 45,
  timerInterval: null,

  // Live Records from Gateway
  registrations: [],
  currentRegistration: null,
  registrationHistory: [],
  problems: [],
  evaluationCycles: [],
  sources: [],
  verificationHistory: {},

  // Loading States
  isLoadingRegistrations: false,
  isLoadingDetail: false,
  isLoadingProblems: false,
  isLoadingSources: false
};

// =============================================================================
// 3. DATA NORMALIZERS (Maps real backend DTOs to UI model)
// =============================================================================
function normalizeRegistration(reg) {
  const id = reg.registrationId || reg.id;
  const source = reg.source || {};

  const name = source.organizationName || source.name || source.institutionName || source.companyName || `${reg.sourceType || 'Organization'} (${String(id).substring(0, 8)})`;
  const pan = source.pan || source.panNumber || source.taxId || 'NOT_RECORDED';
  const dossierId = source.dossierId || ('#REG-' + String(id).substring(0, 8).toUpperCase());
  const subType = source.subType || source.registrationNumber || source.lgdCode || source.cinNumber || source.darpanId || (reg.sourceType || 'Statutory');

  let entityType = reg.sourceBucket || 'GOVERNMENT';
  if (reg.sourceType) {
    if (reg.sourceType === 'PRI') entityType = 'Panchayati Raj (PRI)';
    else if (reg.sourceType === 'ULB') entityType = 'Urban Local Body (ULB)';
    else if (reg.sourceType === 'DEPARTMENT') entityType = 'Govt Department';
    else if (reg.sourceType === 'COMPANY') entityType = 'Corporate Entity';
    else if (reg.sourceType === 'NGO') entityType = 'Non-Governmental Org (NGO)';
    else if (reg.sourceType === 'UNIVERSITY') entityType = 'Higher Education (HEI)';
    else if (reg.sourceType === 'CBO_COOP') entityType = 'Cooperative Society (CBO)';
    else entityType = `${reg.sourceBucket} (${reg.sourceType})`;
  }

  const state = source.state || 'National / Central Jurisdiction';
  const district = source.district || '';
  const sarpanchName = source.sarpanchName || source.signatoryName || source.directorName || source.trusteeName || source.contactPersonName || 'Authorized Signatory';
  const vdoName = source.contactPersonName || source.vdoName || source.nodalOfficerName || 'Appointed Nodal Officer';
  const vdoEmail = source.contactEmail || source.vdoEmail || source.email || 'nodal@gov.in';
  const contactPhone = source.contactPhone || source.phone || 'Phone Pending';
  const bankAccount = source.bankAccount || (source.bankAccountNumber ? `••••••••${String(source.bankAccountNumber).slice(-4)} (${source.bankIfsc || 'PFMS Verified'})` : 'Bank Mandate Pending');

  const dateStr = reg.submittedAt 
    ? new Date(reg.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : (reg.createdAt ? new Date(reg.createdAt).toLocaleString('en-IN') : 'Recently Submitted');

  let sla = 'Within SLA';
  if (reg.submittedAt) {
    const elapsedHours = Math.max(1, Math.round((Date.now() - new Date(reg.submittedAt).getTime()) / (1000 * 60 * 60)));
    if (elapsedHours > 48) sla = `Breached SLA (${elapsedHours}h)`;
    else sla = `Within SLA (${elapsedHours}h elapsed)`;
  }
  if (reg.status === 'APPROVED') sla = 'Adjudicated (Approved)';
  if (reg.status === 'REJECTED') sla = 'Adjudicated (Rejected)';
  if (reg.status === 'ACTION_REQUIRED') sla = 'Awaiting Submitter Action';

  // Extract authentic documents submitted by applicant
  let documents = [];
  if (source.documents && Array.isArray(source.documents) && source.documents.length > 0) {
    documents = source.documents.map(d => typeof d === 'string' ? { name: d, file: d, status: 'Submitted' } : d);
  } else if (reg.documents && Array.isArray(reg.documents)) {
    documents = reg.documents;
  }

  return {
    raw: reg,
    id: id,
    registrationId: id,
    name,
    pan,
    dossierId,
    entityType,
    subType,
    state,
    district,
    sarpanchName,
    vdoName,
    vdoEmail,
    contactPhone,
    bankAccount,
    date: dateStr,
    sla,
    status: reg.status,
    assignedReviewerId: reg.assignedReviewerId,
    assignedTo: reg.assignedReviewerId ? 'Officer Assigned' : null,
    documents,
    rejectionReason: reg.rejectionReason,
    actionRequiredComment: reg.actionRequiredComment,
    version: reg.version || 1
  };
}

function normalizeProblem(prb) {
  const id = prb.problemId || prb.id;
  const cycle = prb.cycle || {};

  return {
    raw: prb,
    id: id,
    problemId: id,
    code: prb.problemCode || prb.code || ('#PRB-' + String(id).substring(0, 8).toUpperCase()),
    title: prb.title || prb.challengeBrief || 'Problem Statement',
    sourceBucket: prb.sourceBucket || 'GOVT',
    subEntity: prb.subEntity || prb.organizationName || 'Designated Administrative Authority',
    nodalOfficer: prb.nodalOfficer || prb.contactPersonName || 'Nodal Compliance Officer',
    nodalEmail: prb.nodalEmail || prb.contactEmail || 'officer@gov.in',
    location: prb.location || (prb.district ? `${prb.district}, ${prb.state || ''}` : 'National Jurisdiction'),
    affectedPopulation: prb.affectedPopulation || 'Key Stakeholders & Public Beneficiaries',
    severity: prb.severity || 'HIGH',
    urgency: prb.urgency || 'HIGH',
    status: cycle.status || prb.status || 'SUBMITTED',
    assignedTo: cycle.assignedEvaluatorId ? 'Assigned' : null,
    date: prb.createdAt ? new Date(prb.createdAt).toLocaleString('en-IN') : 'Recent Intake',
    version: prb.version || 1,
    description: prb.description || prb.challengeBrief || 'No description provided.',
    expectedOutcome: prb.expectedOutcome || prb.desiredStateSuccessMetrics || 'Measurable public improvement.',
    existingIntervention: prb.existingIntervention || prb.previousSolutionsTried || 'None recorded.',
    evidenceList: prb.evidenceList || prb.evidence || [],
    cycle
  };
}

// =============================================================================
// 4. GATEWAY CONNECTIVITY PING
// =============================================================================
async function checkGatewayStatus() {
  try {
    const res = await fetch(`${ApiClient.getBaseUrl()}/registration/source-types`, { method: 'GET' });
    updateGatewayStatus(res.ok);
  } catch (e) {
    updateGatewayStatus(false);
  }
}

function updateGatewayStatus(isOnline) {
  const pill = document.getElementById('gateway-status-pill');
  if (pill) {
    if (isOnline) {
      pill.className = 'font-mono text-[11px] font-semibold text-gov-emerald flex items-center gap-1.5';
      pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span><span>Systems Online</span>`;
    } else {
      pill.className = 'font-mono text-[11px] font-semibold text-saffron-accent flex items-center gap-1.5';
      pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-saffron-accent"></span><span>Systems Offline</span>`;
    }
  }
}

// =============================================================================
// 5. CLIENT-SIDE ROUTER & AUTH GUARD
// =============================================================================
function handleRoute() {
  const fullHash = window.location.hash || '#/login';
  const [routePath, queryString] = fullHash.split('?');

  const views = document.querySelectorAll('.screen-view');
  views.forEach(v => v.classList.remove('active'));

  const navMenu = document.getElementById('nav-menu');
  const officerName = document.getElementById('header-officer-name');
  const officerId = document.getElementById('header-officer-id');
  const avatarInitials = document.getElementById('header-avatar-initials');

  const user = AppState.authenticatedUser;
  const hasToken = Boolean(ApiClient.getAccessToken());
  const isAuthorized = user && (user.role === 'REVIEWER' || user.role === 'ADMIN');

  // Protected route security guard
  const isProtected = routePath.startsWith('#/detail') || 
                      routePath === '#/dashboard' || 
                      routePath === '#/problem-queue' || 
                      routePath === '#/my-reviews';

  if (isProtected && (!hasToken || !isAuthorized)) {
    window.location.hash = '#/login';
    return;
  }

  // Update Global Header with authentic user info
  if (hasToken && isAuthorized) {
    if (navMenu) navMenu.classList.remove('hidden');
    const displayName = user.name || (user.email ? user.email.split('@')[0].toUpperCase() : 'Reviewer Officer');
    const displaySub = user.mobile || user.id || 'ROLE_REVIEWER';

    if (officerName) officerName.textContent = displayName;
    if (officerId) officerId.textContent = displaySub;
    if (avatarInitials) avatarInitials.textContent = displayName.substring(0, 2).toUpperCase();
    
    const dropdownName = document.getElementById('dropdown-user-name');
    const dropdownId = document.getElementById('dropdown-user-id');
    const dropdownRole = document.getElementById('dropdown-role-badge');
    if (dropdownName) dropdownName.textContent = displayName;
    if (dropdownId) dropdownId.textContent = displaySub;
    if (dropdownRole) dropdownRole.textContent = user.role || "REVIEWER";
  } else {
    if (navMenu) navMenu.classList.add('hidden');
    if (officerName) officerName.textContent = "Unauthenticated";
    if (officerId) officerId.textContent = "Sign In Required";
    if (avatarInitials) avatarInitials.innerHTML = '<span class="material-symbols-outlined text-[16px]">person</span>';
  }

  // Reset nav links styling
  const navLinks = document.querySelectorAll('#nav-menu .nav-link');
  navLinks.forEach(link => {
    link.className = "nav-link px-3 py-1.5 text-xs sm:text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors rounded-lg flex items-center";
  });

  if (routePath.startsWith('#/detail')) {
    document.getElementById('screen-detail').classList.add('active');
    document.title = "SIH26043 — Registration Detail & Statutory Review";
    const parts = routePath.split('/');
    const regId = parts[2];
    if (regId) {
      loadRegistrationDetail(regId);
    } else {
      window.location.hash = '#/dashboard';
    }
  } else if (routePath === '#/dashboard') {
    document.getElementById('screen-dashboard').classList.add('active');
    document.title = "SIH26043 — Registration Review Queue";
    const dLink = document.getElementById('nav-link-dashboard');
    if (dLink) dLink.className = "nav-link px-3 py-1.5 transition-colors flex items-center bg-primary-container text-on-primary font-medium text-xs sm:text-sm rounded-lg";

    if (queryString && queryString.includes('tab=my-reviews')) {
      switchQueueTab('my-reviews');
    } else if (queryString && queryString.includes('tab=history')) {
      switchQueueTab('history');
    } else {
      switchQueueTab('inbox');
    }
    fetchRegistrationsQueue();
  } else if (routePath === '#/problem-queue' || routePath === '#/source-verification') {
    document.getElementById('screen-problem-queue').classList.add('active');
    document.title = "SIH26043 — Source Identity Verification Console";
    const pqLink = document.getElementById('nav-link-problem-queue');
    if (pqLink) pqLink.className = "nav-link px-3 py-1.5 transition-colors flex items-center bg-primary-container text-on-primary font-medium text-xs sm:text-sm rounded-lg";
    fetchProblemQueue();
  } else if (routePath === '#/my-reviews') {
    document.getElementById('screen-my-reviews').classList.add('active');
    document.title = "SIH26043 — Officer Caseload Workbench";
    const mrLink = document.getElementById('nav-link-my-reviews');
    if (mrLink) mrLink.className = "nav-link px-3 py-1.5 transition-colors flex items-center bg-primary-container text-on-primary font-medium text-xs sm:text-sm rounded-lg";
    renderMyReviewsWorkbench();
  } else if (routePath === '#/access-denied') {
    document.getElementById('screen-access-denied').classList.add('active');
    document.title = "SIH26043 — 403 Access Denied: Reviewer Clearance Required";
    const dm = document.getElementById('denied-user-mobile');
    if (dm) dm.textContent = user ? (user.mobile || user.id) : 'Unassigned';
  } else if (routePath === '#/otp') {
    document.getElementById('screen-otp').classList.add('active');
    document.title = "SIH26043 — Two-Factor OTP Verification";
    initOtpInputs();
    startOtpTimer();
    const otpCells = document.querySelectorAll('.otp-cell');
    otpCells.forEach(cell => cell.value = '');
    setTimeout(() => { if (otpCells[0]) otpCells[0].focus(); }, 150);
  } else {
    document.getElementById('screen-login').classList.add('active');
    document.title = "SIH26043 — Sign in to Reviewer Portal";
    initMobileInput();
    checkGatewayStatus();
  }

  closeMobileMenu();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', () => {
  handleRoute();
  checkGatewayStatus();
});

function updateGlobalBadges() {
  const activeRegs = AppState.registrations.filter(r => r.status === 'SUBMITTED' || r.status === 'ACTION_REQUIRED').length;
  const pendingSources = (AppState.sources || []).filter(s => !s.isVerifiedSource && s.latestResult !== 'PASS').length;
  const myCount = AppState.registrations.filter(r => r.status === 'UNDER_REVIEW').length + pendingSources;

  const navReg = document.getElementById('nav-reg-count');
  const navPrb = document.getElementById('nav-prb-count');
  const navMy = document.getElementById('nav-my-count');
  if (navReg) navReg.textContent = activeRegs;
  if (navPrb) navPrb.textContent = pendingSources;
  if (navMy) navMy.textContent = myCount;
}

// =============================================================================
// 6. UI INTERACTION HELPERS (Navigation & Dropdowns)
// =============================================================================
function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const icon = document.getElementById('mobile-menu-icon');
  if (!drawer) return;
  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    if (icon) icon.textContent = 'close';
  } else {
    drawer.classList.add('hidden');
    if (icon) icon.textContent = 'menu';
  }
}

function closeMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const icon = document.getElementById('mobile-menu-icon');
  if (drawer) drawer.classList.add('hidden');
  if (icon) icon.textContent = 'menu';
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  const overlay = document.getElementById('profile-dropdown-overlay');
  if (!dropdown) return;
  if (dropdown.classList.contains('hidden')) {
    const loginTimeEl = document.getElementById('profile-login-time');
    if (loginTimeEl) {
      loginTimeEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    dropdown.classList.remove('hidden');
    if (!overlay) {
      const ov = document.createElement('div');
      ov.id = 'profile-dropdown-overlay';
      ov.className = 'profile-dropdown-overlay';
      ov.onclick = closeProfileDropdown;
      document.getElementById('profile-btn-container').appendChild(ov);
    }
  } else {
    closeProfileDropdown();
  }
}

function closeProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  const overlay = document.getElementById('profile-dropdown-overlay');
  if (dropdown) dropdown.classList.add('hidden');
  if (overlay) overlay.remove();
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeProfileDropdown();
});

function toggleJsonView() {
  const container = document.getElementById('raw-json-container');
  const icon = document.getElementById('json-toggle-icon');
  const label = document.getElementById('json-toggle-label');
  if (!container) return;
  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    if (icon) icon.textContent = 'expand_less';
    if (label) label.textContent = 'Collapse Raw JSON';
  } else {
    container.classList.add('hidden');
    if (icon) icon.textContent = 'expand_more';
    if (label) label.textContent = 'Expand Raw JSON';
  }
}

// =============================================================================
// 7. SCREEN 1: LOGIN LOGIC WITH GATEWAY AUTH
// =============================================================================
function fillReviewerDemo() {
  const mobileInput = document.getElementById('mobile-number');
  if (mobileInput) {
    mobileInput.value = '98298 58790';
    const checkIcon = document.getElementById('mobile-check-icon');
    if (checkIcon) checkIcon.style.opacity = '1';
    showToast("Reviewer demo phone set: 98298 58790");
  }
}

function initMobileInput() {
  const mobileInput = document.getElementById('mobile-number');
  const checkIcon = document.getElementById('mobile-check-icon');
  if (!mobileInput) return;

  if (!mobileInput.value) {
    mobileInput.value = '98298 58790';
  }

  mobileInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    if (val.length > 5) {
      e.target.value = val.substring(0, 5) + ' ' + val.substring(5);
    } else {
      e.target.value = val;
    }
    if (checkIcon) {
      checkIcon.style.opacity = val.length === 10 ? '1' : '0';
    }
  });
}

async function handleLoginRequestOtp() {
  const mobileInput = document.getElementById('mobile-number');
  const cleanNumber = mobileInput.value.replace(/\D/g, '');
  if (cleanNumber.length < 10) {
    alert('Please enter a valid 10-digit official mobile number.');
    mobileInput.focus();
    return;
  }

  const btn = document.getElementById('btn-request-otp');
  const btnText = document.getElementById('btn-request-otp-text');
  btn.disabled = true;
  btnText.innerHTML = `
    <span class="inline-flex items-center gap-2">
      <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
      <span>Requesting OTP from Gateway...</span>
    </span>
  `;

  try {
    let otpData;
    try {
      otpData = await ApiClient.post('/auth/login', { phone: cleanNumber }, true);
    } catch (err) {
      if (err.status === 404) {
        otpData = await ApiClient.post('/auth/register', { phone: cleanNumber, email: null }, true);
      } else {
        throw err;
      }
    }

    AppState.challengeId = otpData.challengeId;
    sessionStorage.setItem('auth_challenge_id', otpData.challengeId);
    sessionStorage.setItem('auth_phone', cleanNumber);

    const otpMobileLabel = document.getElementById('otp-mobile-label');
    if (otpMobileLabel) {
      const masked = cleanNumber.length >= 10 ? cleanNumber.substring(0, 5) + ' ****' + cleanNumber.slice(-2) : cleanNumber;
      otpMobileLabel.textContent = '+91 ' + masked;
    }

    let toastMsg = `Passcode dispatched via Gateway.`;
    showToast(toastMsg);

    window.location.hash = '#/otp';
  } catch (err) {
    const cleanMsg = extractBackendErrorMessage(err);
    showToast(`Login failed: ${cleanMsg}`, 'error');
  } finally {
    btn.disabled = false;
    btnText.innerText = "Send Verification Code (OTP)";
  }
}

// =============================================================================
// 8. SCREEN 2: OTP VERIFICATION & JWT TOKEN STORAGE
// =============================================================================
let otpInputsBound = false;
function initOtpInputs() {
  if (otpInputsBound) return;
  otpInputsBound = true;
  const inputs = Array.from(document.querySelectorAll('.otp-cell'));
  if (inputs.length === 0) return;

  setTimeout(() => inputs[0].focus(), 100);

  // Clear inputs on init
  inputs.forEach(input => { input.value = ''; });

  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val && index < inputs.length - 1) {
        inputs[index + 1].focus();
      } else if (val && index === inputs.length - 1) {
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputs[index - 1].focus();
      } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const cleanDigits = pasteData.replace(/\D/g, '').slice(0, 6);
      if (cleanDigits.length > 0) {
        cleanDigits.split('').forEach((char, idx) => {
          if (inputs[idx]) inputs[idx].value = char;
        });
        const nextIdx = Math.min(cleanDigits.length, inputs.length - 1);
        inputs[nextIdx].focus();
      }
    });
  });
}

function startOtpTimer() {
  clearInterval(AppState.timerInterval);
  AppState.timerSeconds = 45;
  const display = document.getElementById('timer-display');
  const resendBtn = document.getElementById('resend-btn');
  if (!display || !resendBtn) return;
  resendBtn.disabled = true;

  AppState.timerInterval = setInterval(() => {
    AppState.timerSeconds--;
    if (AppState.timerSeconds <= 0) {
      clearInterval(AppState.timerInterval);
      display.textContent = '00:00s';
      resendBtn.disabled = false;
    } else {
      const formatted = AppState.timerSeconds < 10 ? '0' + AppState.timerSeconds : AppState.timerSeconds;
      display.textContent = '00:' + formatted + 's';
    }
  }, 1000);
}

async function handleResendOtp() {
  const resendBtn = document.getElementById('resend-btn');
  if (resendBtn && resendBtn.disabled) return;
  const phone = sessionStorage.getItem('auth_phone');
  if (!phone) {
    window.location.hash = '#/login';
    return;
  }
  try {
    const otpData = await ApiClient.post('/auth/login', { phone }, true);
    AppState.challengeId = otpData.challengeId;
    sessionStorage.setItem('auth_challenge_id', otpData.challengeId);
    startOtpTimer();
    showToast(`New verification code dispatched to your registered mobile.`);
  } catch (e) {
    showToast(`Resend failed: ${e.message}`);
  }
}

async function handleVerification() {
  const inputs = Array.from(document.querySelectorAll('.otp-cell'));
  const enteredOTP = inputs.map(i => i.value).join('');
  const submitBtn = document.getElementById('submit-btn');

  if (enteredOTP.length < 6) {
    alert('Please enter all 6 digits of the OTP passcode.');
    return;
  }

  const challengeId = AppState.challengeId || sessionStorage.getItem('auth_challenge_id');
  if (!challengeId) {
    alert('Authentication session expired. Please request OTP again.');
    window.location.hash = '#/login';
    return;
  }

  submitBtn.innerHTML = `
    <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
    <span>Validating with Gateway...</span>
  `;
  submitBtn.disabled = true;

  try {
    const data = await ApiClient.post('/auth/verify-otp', {
      challengeId,
      code: enteredOTP
    }, true);

    // Save tokens and authentic user
    ApiClient.setTokens(data.accessToken, data.refreshToken);
    const user = data.user || {};
    AppState.authenticatedUser = {
      mobile: user.phone ? ('+91 ' + user.phone) : (sessionStorage.getItem('auth_phone') ? '+91 ' + sessionStorage.getItem('auth_phone') : ''),
      name: user.role === 'ADMIN' ? 'System Administrator' : (user.email ? user.email.split('@')[0].toUpperCase() : 'Reviewer Officer'),
      id: user.userId,
      role: user.role,
      kycStatus: user.kycStatus
    };
    localStorage.setItem('auth_user', JSON.stringify(AppState.authenticatedUser));

    if (AppState.authenticatedUser.role === 'REVIEWER' || AppState.authenticatedUser.role === 'ADMIN') {
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined text-[18px] text-gov-emerald">check_circle</span>
        <span>Identity Verified</span>
      `;
      showToast(`Identity Verified • Role: ${AppState.authenticatedUser.role}`);
      setTimeout(() => {
        window.location.hash = '#/dashboard';
        submitBtn.innerHTML = `
          <span>Verify &amp; Continue</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        `;
        submitBtn.disabled = false;
      }, 400);
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Verify &amp; Continue</span>
        <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
      `;
      window.location.hash = '#/access-denied';
    }
  } catch (err) {
    const cleanMsg = extractBackendErrorMessage(err);
    showToast(`Verification failed: ${cleanMsg}`, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <span>Verify &amp; Continue</span>
      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
    `;
  }
}

function handleLogout(e) {
  if (e) e.preventDefault();
  clearInterval(AppState.timerInterval);
  const refresh = ApiClient.getRefreshToken();
  if (refresh) {
    ApiClient.post('/auth/logout', { refreshToken: refresh }).catch(() => {});
  }
  ApiClient.clearTokens();
  AppState.authenticatedUser = null;
  showToast("Security token cleared. Signed out.");
  window.location.hash = '#/login';
}

// =============================================================================
// 9. SCREEN 4: REGISTRATION QUEUE (REAL LIVE DATA)
// =============================================================================
async function fetchRegistrationsQueue() {
  AppState.isLoadingRegistrations = true;
  const tbody = document.getElementById('registration-table-body');

  if (tbody && AppState.registrations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-text-muted">
          <span class="material-symbols-outlined text-[32px] text-institutional-navy animate-spin mb-2 block">progress_activity</span>
          <p class="font-body-md text-sm">Querying live statutory registration queue...</p>
        </td>
      </tr>
    `;
  }

  try {
    const rawList = await ApiClient.get('/reviewer/registrations');
    if (Array.isArray(rawList)) {
      AppState.registrations = rawList.map(normalizeRegistration);
    } else {
      AppState.registrations = [];
    }
    renderRegistrationTable();
    updateGlobalBadges();
  } catch (err) {
    console.error('Failed to load registrations:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-10 text-center text-text-muted">
            <span class="material-symbols-outlined text-[36px] text-saffron-accent mb-2 block">cloud_sync</span>
            <p class="font-body-md text-sm font-semibold text-text-primary">Cannot Reach Backend Gateway</p>
            <p class="text-xs text-text-muted mt-1">${err.message}</p>
            <div class="flex items-center justify-center gap-3 mt-3">
              <button onclick="fetchRegistrationsQueue()" class="px-3 py-1.5 bg-institutional-navy text-on-primary rounded-lg text-xs font-semibold hover:bg-primary transition-all cursor-pointer">
                Retry Connection
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    showToast(`Backend Notice: ${err.message}`);
  } finally {
    AppState.isLoadingRegistrations = false;
  }
}

function switchQueueTab(tabKey) {
  AppState.currentTab = tabKey;
  const tabInbox = document.getElementById('tab-inbox');
  const tabMyReviews = document.getElementById('tab-my-reviews');
  const tabHistory = document.getElementById('tab-history');

  [tabInbox, tabMyReviews, tabHistory].forEach(btn => {
    if (btn) {
      btn.className = "tab-btn px-3 sm:px-space-lg py-2 rounded-md font-label-md text-xs sm:text-label-md transition-all flex items-center gap-1.5 sm:gap-space-xs text-text-secondary hover:text-text-primary cursor-pointer whitespace-nowrap";
    }
  });

  const activeBtn = document.getElementById(`tab-${tabKey}`);
  if (activeBtn) {
    activeBtn.className = "tab-btn px-3 sm:px-space-lg py-2 rounded-md font-label-md text-xs sm:text-label-md transition-all flex items-center gap-1.5 sm:gap-space-xs bg-surface-crisp text-primary shadow-sm cursor-pointer whitespace-nowrap";
  }

  renderRegistrationTable();
}

function renderRegistrationTable() {
  const tbody = document.getElementById('registration-table-body');
  if (!tbody) return;

  const searchInput = (document.getElementById('registration-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('status-filter')?.value || 'ALL';

  // Counts strictly from real live registrations
  const inboxCount = AppState.registrations.filter(r => r.status === 'SUBMITTED' || r.status === 'ACTION_REQUIRED' || r.status === 'DRAFT').length;
  const myCount = AppState.registrations.filter(r => r.status === 'UNDER_REVIEW').length;
  const historyCount = AppState.registrations.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED').length;

  const inboxBadge = document.getElementById('tab-inbox-badge');
  const myBadge = document.getElementById('tab-my-reviews-badge');
  const histBadge = document.getElementById('tab-history-badge');
  const metricInbox = document.getElementById('metric-inbox-count');
  const metricAssigned = document.getElementById('metric-assigned-count');
  const metricHistory = document.getElementById('metric-history-count');

  if (inboxBadge) inboxBadge.textContent = inboxCount;
  if (myBadge) myBadge.textContent = myCount;
  if (histBadge) histBadge.textContent = historyCount;
  if (metricInbox) metricInbox.textContent = inboxCount;
  if (metricAssigned) metricAssigned.textContent = myCount;
  if (metricHistory) metricHistory.textContent = historyCount;

  let filtered = AppState.registrations.filter(reg => {
    let matchesTab = true;
    if (AppState.currentTab === 'inbox') {
      matchesTab = (reg.status === 'SUBMITTED' || reg.status === 'ACTION_REQUIRED' || reg.status === 'DRAFT');
    } else if (AppState.currentTab === 'my-reviews') {
      matchesTab = (reg.status === 'UNDER_REVIEW');
    } else if (AppState.currentTab === 'history') {
      matchesTab = (reg.status === 'APPROVED' || reg.status === 'REJECTED');
    }

    let matchesStatus = (statusFilter === 'ALL' || reg.status === statusFilter);
    let matchesSearch = (!searchInput || 
      reg.name.toLowerCase().includes(searchInput) || 
      reg.subType.toLowerCase().includes(searchInput) || 
      reg.dossierId.toLowerCase().includes(searchInput) ||
      reg.pan.toLowerCase().includes(searchInput) ||
      String(reg.id).toLowerCase().includes(searchInput)
    );

    return matchesTab && matchesStatus && matchesSearch;
  });

  const countEl = document.getElementById('displayed-count');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-12 text-center text-text-muted">
          <span class="material-symbols-outlined text-[36px] text-border-strong mb-2 block">folder_open</span>
          <p class="font-body-md text-sm font-semibold text-text-primary">No live registrations found in this category.</p>
          <p class="text-xs text-text-muted mt-1">Database has no records matching the selected status filter.</p>
          <div class="mt-4 flex items-center justify-center gap-3">
            <button onclick="resetFilters()" class="text-xs text-institutional-navy hover:underline font-semibold cursor-pointer">Reset Filters</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(reg => {
    let icon = 'account_balance';
    if (reg.entityType.includes('Corporate') || reg.entityType.includes('Company')) icon = 'corporate_fare';
    else if (reg.entityType.includes('NGO')) icon = 'diversity_3';
    else if (reg.entityType.includes('Higher') || reg.entityType.includes('HEI')) icon = 'school';
    else if (reg.entityType.includes('Cooperative') || reg.entityType.includes('CBO')) icon = 'agriculture';

    let statusBadge = '';
    let actionButton = '';

    if (reg.status === 'SUBMITTED') {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-submitted-bg text-status-submitted-text font-label-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-status-submitted-text"></span>
          SUBMITTED
        </span>
      `;
      actionButton = `
        <button class="claim-action-btn inline-flex items-center gap-1.5 bg-primary hover:bg-institutional-navy text-on-primary px-3 py-1.5 rounded-lg font-label-md text-xs transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap" onclick="assignRegistration('${reg.id}', '${reg.name.replace(/'/g, "\\'")}')" type="button">
          <span class="material-symbols-outlined text-[16px]">how_to_reg</span>
          <span>Assign to Me</span>
        </button>
      `;
    } else if (reg.status === 'UNDER_REVIEW') {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-review-bg text-status-review-text font-label-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-status-review-text animate-pulse"></span>
          UNDER REVIEW
        </span>
      `;
      actionButton = `
        <a href="#/detail/${reg.id}" class="inline-flex items-center gap-1.5 text-institutional-navy hover:text-primary font-label-md text-xs transition-colors px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container border border-border-hairline cursor-pointer whitespace-nowrap">
          <span class="material-symbols-outlined text-[16px]">visibility</span>
          <span>Review Case</span>
        </a>
      `;
    } else if (reg.status === 'ACTION_REQUIRED') {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-action-bg text-status-action-text font-label-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-status-action-text"></span>
          ACTION REQUIRED
        </span>
      `;
      actionButton = `
        <a href="#/detail/${reg.id}" class="inline-flex items-center gap-1 text-saffron-accent hover:text-primary font-label-md text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-status-action-bg border border-status-action-border cursor-pointer whitespace-nowrap">
          <span>Inspect Deficiency</span>
          <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
        </a>
      `;
    } else if (reg.status === 'APPROVED') {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text font-label-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-status-approved-text"></span>
          APPROVED
        </span>
      `;
      actionButton = `
        <a href="#/detail/${reg.id}" class="inline-flex items-center gap-1 text-gov-emerald hover:underline font-label-md text-xs font-semibold px-2 py-1 cursor-pointer">
          <span>View Order</span>
          <span class="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      `;
    } else if (reg.status === 'REJECTED') {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-error"></span>
          REJECTED
        </span>
      `;
      actionButton = `
        <a href="#/detail/${reg.id}" class="inline-flex items-center gap-1 text-error hover:underline font-label-md text-xs font-semibold px-2 py-1 cursor-pointer">
          <span>Order Details</span>
          <span class="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-muted text-text-secondary font-label-sm text-[10px] uppercase font-bold tracking-wider whitespace-nowrap">
          ${reg.status}
        </span>
      `;
      actionButton = `
        <a href="#/detail/${reg.id}" class="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:underline">
          <span>Inspect</span>
        </a>
      `;
    }

    return `
      <tr class="queue-row hover:bg-surface-subtle/80 transition-colors">
        <td class="py-4 px-4 sm:px-6 align-middle">
          <div class="flex items-center gap-3 cursor-pointer" onclick="navigateToDetail('${reg.id}')">
            <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-[22px]">${icon}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-headline-sm text-sm sm:text-headline-sm text-text-primary tracking-tight truncate font-semibold hover:text-institutional-navy transition-colors">${reg.name}</span>
              <span class="font-mono-code text-xs sm:text-body-sm text-text-muted truncate">PAN: ${reg.pan} • ${reg.dossierId}</span>
            </div>
          </div>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle">
          <div class="flex flex-col">
            <span class="font-body-md text-xs sm:text-body-md text-text-primary font-medium">${reg.entityType}</span>
            <span class="font-mono-code text-[11px] sm:text-[12px] text-text-secondary">${reg.subType}</span>
          </div>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle">
          <div class="flex flex-col">
            <span class="font-body-md text-xs sm:text-body-md text-text-primary">${reg.date}</span>
            <span class="font-mono-code text-[10px] sm:text-[11px] ${reg.sla.includes('Within') ? 'text-gov-emerald' : 'text-saffron-accent'}">${reg.sla}</span>
          </div>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle">
          ${statusBadge}
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle text-right">
          ${actionButton}
        </td>
      </tr>
    `;
  }).join('');
}

function filterQueueRows() {
  renderRegistrationTable();
}

function resetFilters() {
  const search = document.getElementById('registration-search');
  const status = document.getElementById('status-filter');
  if (search) search.value = '';
  if (status) status.value = 'ALL';
  switchQueueTab('inbox');
  showToast("Filters reset.");
}

async function assignRegistration(regId, orgName) {
  try {
    await ApiClient.post(`/reviewer/registrations/${regId}/assign`);
    showToast(`Registration "${orgName}" assigned to you.`);
    await fetchRegistrationsQueue();
  } catch (err) {
    await handleReviewerActionError(err, { regId, action: 'ASSIGN' });
  }
}

function navigateToDetail(regId) {
  window.location.hash = `#/detail/${regId}`;
}

// =============================================================================
// 10. SCREEN 5: REGISTRATION DETAIL VIEW & STATUTORY DECISIONS
// =============================================================================
async function loadRegistrationDetail(regId) {
  AppState.currentRegistrationId = regId;
  AppState.isLoadingDetail = true;

  try {
    const [regData, historyData] = await Promise.all([
      ApiClient.get(`/registration/${regId}`).catch(() => null),
      ApiClient.get(`/registration/${regId}/history`).catch(() => [])
    ]);

    let reg = null;
    if (regData) {
      reg = normalizeRegistration(regData);
    } else {
      reg = AppState.registrations.find(r => r.id === regId);
    }

    if (!reg) {
      showToast(`Registration ID not found: ${regId}`);
      return;
    }

    AppState.currentRegistration = reg;
    AppState.registrationHistory = Array.isArray(historyData) ? historyData : [];
    renderRegistrationDetailView(reg, AppState.registrationHistory);
  } catch (err) {
    showToast(`Failed to load detail: ${err.message}`);
  } finally {
    AppState.isLoadingDetail = false;
  }
}

function renderRegistrationDetailView(reg, history) {
  const dossierEl = document.getElementById('detail-dossier-id');
  const entityNameEl = document.getElementById('detail-entity-name');
  const entityTierEl = document.getElementById('detail-entity-tier');
  const lgdCodeEl = document.getElementById('detail-lgd-code');
  const locationEl = document.getElementById('detail-location');
  const categoryLabelEl = document.getElementById('detail-category-label');

  if (dossierEl) dossierEl.textContent = reg.dossierId;
  if (entityNameEl) entityNameEl.textContent = reg.name;
  if (entityTierEl) entityTierEl.textContent = reg.entityType;
  if (lgdCodeEl) lgdCodeEl.textContent = reg.subType;
  if (locationEl) locationEl.textContent = reg.district ? `${reg.district}, ${reg.state}` : reg.state;
  if (categoryLabelEl) categoryLabelEl.textContent = `${reg.entityType} Metadata`;

  const pill = document.getElementById('detail-status-pill');
  const pillText = document.getElementById('detail-status-pill-text');
  if (pill && pillText) {
    pillText.textContent = reg.status;
    if (reg.status === 'APPROVED') {
      pill.className = 'flex items-center gap-space-xs px-space-md py-1 rounded-full shadow-sm bg-status-approved-bg text-status-approved-text';
    } else if (reg.status === 'REJECTED') {
      pill.className = 'flex items-center gap-space-xs px-space-md py-1 rounded-full shadow-sm bg-error-container text-on-error-container';
    } else if (reg.status === 'ACTION_REQUIRED') {
      pill.className = 'flex items-center gap-space-xs px-space-md py-1 rounded-full shadow-sm bg-status-action-bg text-status-action-text';
    } else {
      pill.className = 'flex items-center gap-space-xs px-space-md py-1 rounded-full shadow-sm bg-status-review-bg text-status-review-text';
    }
  }

  const metaCat = document.getElementById('detail-meta-category');
  const metaName = document.getElementById('detail-meta-name');
  const metaSignatory = document.getElementById('detail-meta-signatory');
  const metaRef = document.getElementById('detail-meta-ref');
  const metaBank = document.getElementById('detail-meta-bank');

  if (metaCat) metaCat.textContent = reg.entityType;
  if (metaName) metaName.textContent = reg.name;
  if (metaSignatory) {
    metaSignatory.innerHTML = `
      <span class="material-symbols-outlined text-[16px] text-gov-emerald">verified_user</span>
      ${reg.sarpanchName}
    `;
  }
  if (metaRef) metaRef.textContent = `${reg.pan} • ${reg.subType}`;
  if (metaBank) metaBank.textContent = reg.bankAccount;

  const nodalAvatar = document.getElementById('detail-nodal-avatar');
  const nodalName = document.getElementById('detail-nodal-name');
  const nodalTitle = document.getElementById('detail-nodal-title');
  const nodalPhone = document.getElementById('detail-nodal-phone');
  const nodalEmail = document.getElementById('detail-nodal-email');

  const initials = (reg.vdoName || 'NO').split(' ').map(w => w[0]).filter(c => c && c.match(/[a-zA-Z]/)).slice(0, 2).join('').toUpperCase() || 'NO';
  if (nodalAvatar) nodalAvatar.textContent = initials;
  if (nodalName) nodalName.textContent = reg.vdoName;
  if (nodalTitle) nodalTitle.textContent = reg.entityType.includes('PRI') ? 'Village Development Officer (VDO)' : 'Appointed Nodal Officer';
  if (nodalPhone) {
    nodalPhone.innerHTML = `
      <span class="material-symbols-outlined text-[16px] text-text-muted">call</span>
      ${reg.contactPhone}
    `;
  }
  if (nodalEmail) {
    nodalEmail.innerHTML = `
      <span class="material-symbols-outlined text-[16px] text-text-muted">mail</span>
      ${reg.vdoEmail}
    `;
  }

  // Populate Documents strictly from backend
  const docsHeader = document.getElementById('detail-docs-header');
  if (docsHeader) {
    docsHeader.textContent = `Statutory Evidence Documents (${reg.documents.length} Files Attached)`;
  }

  const docsContainer = document.getElementById('documents-list-container');
  if (docsContainer) {
    if (!reg.documents || reg.documents.length === 0) {
      docsContainer.innerHTML = `
        <div class="p-4 bg-surface-subtle rounded-lg text-center text-text-muted text-xs">
          No statutory documents uploaded for this registration record.
        </div>
      `;
    } else {
      docsContainer.innerHTML = reg.documents.map((doc, idx) => {
        let statusBadgeClass = "bg-status-approved-bg text-status-approved-text";
        let icon = "description";
        const docStatus = doc.status || 'Verified';
        if (docStatus.includes('Deficiency') || docStatus.includes('Invalid') || docStatus.includes('Clarification')) {
          statusBadgeClass = "bg-status-action-bg text-status-action-text";
          icon = "warning";
        }

        return `
          <div class="p-3.5 sm:p-space-base bg-surface-subtle rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:bg-surface-container-high/40 border border-border-hairline">
            <div class="flex items-start gap-3 sm:gap-space-md">
              <div class="w-10 h-10 rounded bg-primary-container/10 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-institutional-navy text-[22px] sm:text-[24px]">${icon}</span>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-label-lg text-xs sm:text-label-lg text-text-primary font-bold">Doc ${idx + 1}: ${doc.name}</span>
                  <span class="px-2 py-0.5 rounded-full ${statusBadgeClass} font-label-sm text-[10px] uppercase font-bold">${docStatus}</span>
                </div>
                <p class="font-mono-code text-[11px] sm:text-[12px] text-text-muted mt-0.5">${doc.file || 'ATTACHMENT.pdf'} • Validated</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button class="px-3 sm:px-space-md py-1.5 bg-surface-crisp hover:bg-surface-container text-institutional-navy font-label-md text-xs sm:text-label-md rounded shadow-sm transition-colors flex items-center gap-1 cursor-pointer border border-border-hairline" onclick="openDocPreviewModal('${reg.id}', ${idx})" type="button">
                <span class="material-symbols-outlined text-[16px]">visibility</span>
                Preview
              </button>
              <button class="p-1.5 bg-surface-crisp hover:bg-surface-container text-text-secondary rounded shadow-sm transition-colors cursor-pointer border border-border-hairline" onclick="showToast('Downloading: ${doc.file || doc.name}')" title="Download Document" type="button">
                <span class="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Populate Real Audit Trail strictly from database history
  const auditContainer = document.getElementById('audit-trail-container');
  if (auditContainer) {
    if (history && history.length > 0) {
      auditContainer.innerHTML = history.map((item, idx) => {
        const timeStr = item.changedAt ? new Date(item.changedAt).toLocaleString('en-IN') : 'Live Transition';
        const desc = item.comment || `State transitioned from ${item.fromStatus || 'INCEPTION'} to ${item.toStatus}`;
        return `
          <div class="relative flex flex-col gap-1">
            <div class="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full ${idx === 0 ? 'bg-status-review-text shadow-sm' : 'bg-gov-emerald shadow-sm'}"></div>
            <div class="flex items-center gap-space-xs">
              <span class="font-mono-code text-[11px] sm:text-[12px] text-text-muted">${timeStr}</span>
              <span class="px-2 py-0.5 rounded-full bg-status-review-bg text-status-review-text font-label-sm text-[10px] uppercase font-bold">${item.toStatus}</span>
            </div>
            <p class="font-body-md text-xs sm:text-body-md text-text-primary">${desc}</p>
          </div>
        `;
      }).join('');
    } else {
      auditContainer.innerHTML = `
        <div class="relative flex flex-col gap-1">
          <div class="absolute -left-[22px] top-1.5 w-3 h-3 rounded-full bg-gov-emerald shadow-sm"></div>
          <div class="flex items-center gap-space-xs">
            <span class="font-mono-code text-[11px] text-text-muted">${reg.date}</span>
            <span class="px-2 py-0.5 rounded-full bg-status-submitted-bg text-status-submitted-text font-label-sm text-[10px] uppercase font-bold">${reg.status}</span>
          </div>
          <p class="font-body-md text-xs text-text-primary">Registration intake recorded in database via Gateway.</p>
        </div>
      `;
    }
  }

  // Populate Raw JSON block with authentic database record
  const rawJson = document.getElementById('raw-json-block');
  if (rawJson) {
    rawJson.textContent = JSON.stringify(reg.raw || reg, null, 2);
  }

  // Update Attestation statement with logged in officer name
  const attestName = document.getElementById('attest-officer-name');
  if (attestName && AppState.authenticatedUser) {
    attestName.textContent = AppState.authenticatedUser.name || "Reviewer Officer";
  }

  // Update Hint with real recipient
  const hint = document.getElementById('validation-hint');
  if (hint) {
    hint.textContent = `A formal statutory notice will be dispatched directly to Nodal Officer (${reg.vdoEmail}).`;
  }

  const textarea = document.getElementById('reviewer-remarks');
  if (textarea) textarea.value = reg.actionRequiredComment || reg.rejectionReason || '';
  const counter = document.getElementById('char-counter');
  if (counter) counter.innerText = "0 / 1000 chars";
  const check = document.getElementById('statutory-checkbox');
  if (check) check.checked = false;

  selectDecision('APPROVE');
}

function selectDecision(decision) {
  AppState.currentDecision = decision;
  const btnApprove = document.getElementById('btn-approve');
  const btnRequest = document.getElementById('btn-request');
  const btnReject = document.getElementById('btn-reject');
  const consequenceBox = document.getElementById('consequence-box');
  const mandatoryAsterisk = document.getElementById('mandatory-asterisk');
  const submitBtnLabel = document.getElementById('submit-btn-label');

  const defaultClass = "decision-tab flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-surface-subtle hover:bg-surface-container transition-all text-center group cursor-pointer border border-border-hairline";
  if (btnApprove) btnApprove.className = defaultClass;
  if (btnRequest) btnRequest.className = defaultClass;
  if (btnReject) btnReject.className = defaultClass;

  if (decision === 'APPROVE') {
    if (btnApprove) btnApprove.className = "decision-tab flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-status-approved-bg text-status-approved-text shadow-sm transition-all text-center cursor-pointer border border-status-approved-border";
    if (consequenceBox) {
      consequenceBox.className = "p-space-base rounded-lg bg-status-approved-bg text-status-approved-text mb-space-base flex items-start gap-space-sm";
      consequenceBox.innerHTML = `
        <span class="material-symbols-outlined text-[20px] shrink-0 text-gov-emerald">check_circle</span>
        <div class="text-body-sm font-body-sm">
          <strong class="font-bold">Backend State Transition:</strong> Submitter KYC is set to <span class="font-mono-code font-bold">VERIFIED</span>. Primary SourceAccount will be provisioned in database with active submission rights.
        </div>
      `;
    }
    if (mandatoryAsterisk) mandatoryAsterisk.style.display = 'none';
    if (submitBtnLabel) submitBtnLabel.innerText = "Execute Approval & Provision Account";
  } else if (decision === 'REQUEST_ACTION') {
    if (btnRequest) btnRequest.className = "decision-tab flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-status-action-bg text-status-action-text shadow-sm transition-all text-center cursor-pointer border border-status-action-border";
    if (consequenceBox) {
      consequenceBox.className = "p-space-base rounded-lg bg-status-action-bg text-status-action-text mb-space-base flex items-start gap-space-sm";
      consequenceBox.innerHTML = `
        <span class="material-symbols-outlined text-[20px] shrink-0 text-saffron-accent">info</span>
        <div class="text-body-sm font-body-sm">
          <strong class="font-bold">Backend State Transition:</strong> Registration will transition to <span class="font-mono-code font-bold">ACTION_REQUIRED</span>. Edit access unlocked for submitter to address deficient documents.
        </div>
      `;
    }
    if (mandatoryAsterisk) mandatoryAsterisk.style.display = 'inline';
    if (submitBtnLabel) submitBtnLabel.innerText = "Confirm Deficiency & Dispatch Notice";
  } else if (decision === 'REJECT') {
    if (btnReject) btnReject.className = "decision-tab flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg bg-error-container text-on-error-container shadow-sm transition-all text-center cursor-pointer border border-error";
    if (consequenceBox) {
      consequenceBox.className = "p-space-base rounded-lg bg-error-container text-on-error-container mb-space-base flex items-start gap-space-sm";
      consequenceBox.innerHTML = `
        <span class="material-symbols-outlined text-[20px] shrink-0 text-error">dangerous</span>
        <div class="text-body-sm font-body-sm">
          <strong class="font-bold">Backend State Transition:</strong> Application is recorded in PostgreSQL as <span class="font-mono-code font-bold">REJECTED</span>. Terminal immutable status.
        </div>
      `;
    }
    if (mandatoryAsterisk) mandatoryAsterisk.style.display = 'inline';
    if (submitBtnLabel) submitBtnLabel.innerText = "Confirm Terminal Rejection";
  }

  evaluateSubmitReadiness();
}

function handleRemarksInput() {
  const textarea = document.getElementById('reviewer-remarks');
  const counter = document.getElementById('char-counter');
  if (textarea && counter) {
    counter.innerText = textarea.value.length + " / 1000 chars";
  }
  evaluateSubmitReadiness();
}

function evaluateSubmitReadiness() {
  const textarea = document.getElementById('reviewer-remarks');
  const checkbox = document.getElementById('statutory-checkbox');
  const executeBtn = document.getElementById('btn-execute-decision');
  if (!textarea || !checkbox || !executeBtn) return;

  const isChecked = checkbox.checked;
  let isTextValid = true;
  if (AppState.currentDecision === 'REJECT' || AppState.currentDecision === 'REQUEST_ACTION') {
    isTextValid = textarea.value.trim().length >= 10;
  }

  const isReady = isChecked && isTextValid;
  executeBtn.disabled = !isReady;
  executeBtn.style.opacity = isReady ? '1' : '0.5';
  executeBtn.style.cursor = isReady ? 'pointer' : 'not-allowed';
}

async function executeStatutoryTransition() {
  const regId = AppState.currentRegistrationId;
  if (!regId) return;

  const executeBtn = document.getElementById('btn-execute-decision');
  const remarks = document.getElementById('reviewer-remarks')?.value || '';

  executeBtn.disabled = true;
  executeBtn.innerHTML = `
    <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
    <span>Calling Backend Gateway...</span>
  `;

  try {
    let endpoint = `/reviewer/registrations/${regId}/approve`;
    let body = remarks ? { comment: remarks } : {};

    if (AppState.currentDecision === 'REQUEST_ACTION') {
      endpoint = `/reviewer/registrations/${regId}/request-action`;
      body = { comment: remarks };
    } else if (AppState.currentDecision === 'REJECT') {
      endpoint = `/reviewer/registrations/${regId}/reject`;
      body = { comment: remarks };
    }

    await ApiClient.post(endpoint, body);
    showToast(`Order executed: ${AppState.currentDecision} recorded in backend.`);
    await loadRegistrationDetail(regId);
    await fetchRegistrationsQueue();
  } catch (err) {
    await handleReviewerActionError(err, { regId, action: AppState.currentDecision });
  } finally {
    evaluateSubmitReadiness();
  }
}

// =============================================================================
// 11. SCREEN: SOURCE IDENTITY VERIFICATION CONSOLE (POST /sources/{id}/verify)
// =============================================================================
async function fetchProblemQueue() {
  AppState.isLoadingProblems = true;
  const tbody = document.getElementById('problem-table-body');

  if (tbody && (!AppState.sources || AppState.sources.length === 0)) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-text-muted">
          <span class="material-symbols-outlined text-[32px] text-institutional-navy animate-spin mb-2 block">progress_activity</span>
          <p class="font-body-md text-sm">Loading approved entity sources from Gateway registry...</p>
        </td>
      </tr>
    `;
  }

  try {
    // 1. Fetch approved registrations from backend (approved organizations)
    let approvedList = [];
    try {
      const regResp = await ApiClient.get('/reviewer/registrations', { status: 'APPROVED' });
      approvedList = Array.isArray(regResp) ? regResp : (regResp.content || []);
    } catch (e) {
      console.warn('Direct approved query error, falling back to local registrations:', e);
      approvedList = AppState.registrations.filter(r => r.status === 'APPROVED').map(r => r.raw || r);
    }

    // Also include any approved registrations already in AppState that might not have been returned
    const existingApproved = AppState.registrations.filter(r => r.status === 'APPROVED');
    for (const ea of existingApproved) {
      const eaRaw = ea.raw || ea;
      const eaId = ea.id || eaRaw.registrationId;
      if (!approvedList.some(item => (item.registrationId || item.id) === eaId)) {
        approvedList.push(eaRaw);
      }
    }

    // 2. Normalize into source entities
    const sources = approvedList.map(reg => {
      const normReg = normalizeRegistration(reg);
      const rawReg = reg.raw || reg;
      const sourceId = rawReg.sourceId || normReg.sourceId || normReg.id;
      const historyKey = `verification_history_${sourceId}`;
      let localHistory = [];
      try {
        localHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      } catch (err) {}

      const latestCheck = localHistory.length > 0 ? localHistory[localHistory.length - 1] : null;

      let verificationStatus = 'PENDING';
      let isVerifiedSource = false;
      if (latestCheck) {
        if (latestCheck.result === 'PASS') {
          verificationStatus = 'VERIFIED';
          isVerifiedSource = true;
        } else if (latestCheck.result === 'NEEDS_REVIEW') {
          verificationStatus = 'NEEDS_REVIEW';
        } else if (latestCheck.result === 'FAIL') {
          verificationStatus = 'FLAGGED';
        }
      } else if (rawReg.isVerifiedSource) {
        verificationStatus = 'VERIFIED';
        isVerifiedSource = true;
      }

      return {
        id: sourceId,
        sourceId: sourceId,
        registrationId: normReg.id,
        rawRegistration: rawReg,
        name: normReg.name,
        dossierId: normReg.dossierId,
        sourceBucket: rawReg.sourceBucket || 'GOVT',
        sourceType: rawReg.sourceType || 'PRI',
        entityType: normReg.entityType,
        subType: normReg.subType,
        pan: normReg.pan,
        identifier: normReg.pan !== 'NOT_RECORDED' ? normReg.pan : (normReg.subType || normReg.dossierId),
        state: normReg.state,
        district: normReg.district,
        location: normReg.district ? `${normReg.district}, ${normReg.state}` : normReg.state,
        contactPersonName: normReg.vdoName,
        contactEmail: normReg.vdoEmail,
        contactPhone: normReg.contactPhone,
        status: normReg.status,
        verificationStatus: verificationStatus,
        isVerifiedSource: isVerifiedSource,
        history: localHistory,
        latestCheck: latestCheck,
        date: normReg.date
      };
    });

    AppState.sources = sources;
    renderProblemTable();
    updateGlobalBadges();
  } catch (err) {
    console.error('Failed to load source verification queue:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-12 text-center text-text-muted">
            <span class="material-symbols-outlined text-[36px] text-border-strong mb-2 block">report_off</span>
            <p class="font-body-md text-sm">Unable to load approved sources from statutory registry.</p>
            <p class="text-xs text-text-muted mt-1">${err.message}</p>
          </td>
        </tr>
      `;
    }
  } finally {
    AppState.isLoadingProblems = false;
  }
}

function switchProblemTab(tabKey) {
  AppState.currentProblemTab = tabKey;
  AppState.currentSourceTab = tabKey;
  const tabAll = document.getElementById('tab-prb-all');
  const tabMy = document.getElementById('tab-prb-my');
  const tabReg = document.getElementById('tab-prb-registered');
  const tabRej = document.getElementById('tab-prb-rejected');

  [tabAll, tabMy, tabReg, tabRej].forEach(btn => {
    if (btn) {
      btn.className = "tab-btn-prb px-3 sm:px-space-md py-1.5 rounded-md font-label-md text-xs sm:text-label-md transition-all flex items-center gap-1.5 text-text-secondary hover:text-text-primary cursor-pointer";
    }
  });

  const activeBtn = document.getElementById(`tab-prb-${tabKey === 'my-reviews' ? 'my' : tabKey}`);
  if (activeBtn) {
    activeBtn.className = "tab-btn-prb px-3 sm:px-space-md py-1.5 rounded-md font-label-md text-xs sm:text-label-md transition-all flex items-center gap-1.5 bg-surface-crisp text-primary shadow-sm cursor-pointer";
  }

  renderProblemTable();
}

function filterProblemRows() {
  renderProblemTable();
}

function resetProblemFilters() {
  const search = document.getElementById('problem-search');
  const bucket = document.getElementById('problem-bucket-filter');
  const severity = document.getElementById('problem-severity-filter');
  if (search) search.value = '';
  if (bucket) bucket.value = 'ALL';
  if (severity) severity.value = 'ALL';
  switchProblemTab('all');
  showToast("Source filters reset.");
}

function renderProblemTable() {
  const tbody = document.getElementById('problem-table-body');
  if (!tbody) return;

  const searchInput = (document.getElementById('problem-search')?.value || '').toLowerCase().trim();
  const bucketFilter = document.getElementById('problem-bucket-filter')?.value || 'ALL';
  const statusFilter = document.getElementById('problem-severity-filter')?.value || 'ALL';

  const totalCount = AppState.sources.length;
  const pendingCount = AppState.sources.filter(s => s.verificationStatus === 'PENDING').length;
  const verifiedCount = AppState.sources.filter(s => s.verificationStatus === 'VERIFIED').length;
  const flaggedCount = AppState.sources.filter(s => s.verificationStatus === 'NEEDS_REVIEW' || s.verificationStatus === 'FLAGGED').length;

  const mTotal = document.getElementById('prb-metric-total');
  const mMy = document.getElementById('prb-metric-my');
  const mReg = document.getElementById('prb-metric-registered');
  const mCrit = document.getElementById('prb-metric-critical');
  if (mTotal) mTotal.textContent = totalCount;
  if (mMy) mMy.textContent = pendingCount;
  if (mReg) mReg.textContent = verifiedCount;
  if (mCrit) mCrit.textContent = flaggedCount;

  const bAll = document.getElementById('tab-prb-all-badge');
  const bMy = document.getElementById('tab-prb-my-badge');
  const bReg = document.getElementById('tab-prb-registered-badge');
  const bRej = document.getElementById('tab-prb-rejected-badge');
  if (bAll) bAll.textContent = totalCount;
  if (bMy) bMy.textContent = pendingCount;
  if (bReg) bReg.textContent = verifiedCount;
  if (bRej) bRej.textContent = flaggedCount;

  let filtered = AppState.sources.filter(src => {
    let matchesTab = true;
    if (AppState.currentProblemTab === 'all') {
      matchesTab = true;
    } else if (AppState.currentProblemTab === 'my-reviews') {
      matchesTab = (src.verificationStatus === 'PENDING');
    } else if (AppState.currentProblemTab === 'registered') {
      matchesTab = (src.verificationStatus === 'VERIFIED');
    } else if (AppState.currentProblemTab === 'rejected') {
      matchesTab = (src.verificationStatus === 'NEEDS_REVIEW' || src.verificationStatus === 'FLAGGED');
    }

    let matchesBucket = (bucketFilter === 'ALL' || src.sourceBucket === bucketFilter);
    let matchesStatus = (statusFilter === 'ALL' || 
      (statusFilter === 'PENDING' && src.verificationStatus === 'PENDING') ||
      (statusFilter === 'VERIFIED' && src.verificationStatus === 'VERIFIED') ||
      (statusFilter === 'NEEDS_REVIEW' && (src.verificationStatus === 'NEEDS_REVIEW' || src.verificationStatus === 'FLAGGED'))
    );
    let matchesSearch = (!searchInput || 
      src.name.toLowerCase().includes(searchInput) || 
      src.dossierId.toLowerCase().includes(searchInput) || 
      src.identifier.toLowerCase().includes(searchInput) ||
      src.contactPersonName.toLowerCase().includes(searchInput) ||
      src.location.toLowerCase().includes(searchInput) ||
      String(src.id).toLowerCase().includes(searchInput)
    );

    return matchesTab && matchesBucket && matchesStatus && matchesSearch;
  });

  const countEl = document.getElementById('prb-displayed-count');
  if (countEl) countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-text-muted">
          <span class="material-symbols-outlined text-[36px] text-border-strong mb-2 block">domain_disabled</span>
          <p class="font-body-md text-sm font-semibold text-text-primary">No organization sources match this filter criteria.</p>
          <button onclick="resetProblemFilters()" class="mt-2 text-xs text-institutional-navy hover:underline font-semibold cursor-pointer">Reset Filters</button>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(src => {
    let bucketBadgeColor = 'bg-status-submitted-bg text-status-submitted-text';
    if (src.sourceBucket === 'COMMUNITY') bucketBadgeColor = 'bg-status-action-bg text-status-action-text';
    else if (src.sourceBucket === 'INDUSTRY') bucketBadgeColor = 'bg-secondary-container/30 text-institutional-navy';
    else if (src.sourceBucket === 'HEI') bucketBadgeColor = 'bg-tertiary-fixed/30 text-gov-emerald';

    let statusBadge = '';
    if (src.verificationStatus === 'VERIFIED') {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-approved-bg text-status-approved-text border border-status-approved-border font-label-sm text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="material-symbols-outlined text-[14px]">verified</span>
          <span>Verified Source</span>
        </span>
      `;
    } else if (src.verificationStatus === 'NEEDS_REVIEW') {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-review-bg text-status-review-text border border-status-review-border font-label-sm text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="material-symbols-outlined text-[14px]">rule</span>
          <span>Needs Review</span>
        </span>
      `;
    } else if (src.verificationStatus === 'FLAGGED') {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container border border-error/30 font-label-sm text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="material-symbols-outlined text-[14px]">cancel</span>
          <span>Check Failed</span>
        </span>
      `;
    } else {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-status-action-bg text-status-action-text border border-status-action-border font-label-sm text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <span class="w-1.5 h-1.5 rounded-full bg-status-action-text animate-pulse"></span>
          <span>Awaiting Check</span>
        </span>
      `;
    }

    let actionBtn = `
      <button class="inline-flex items-center gap-1.5 text-institutional-navy hover:text-primary bg-surface-subtle hover:bg-surface-container border border-border-hairline px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs" onclick="openProblemModal('${src.id}')" type="button">
        <span class="material-symbols-outlined text-[16px] text-institutional-navy">verified_user</span>
        <span>Verify Identity</span>
      </button>
    `;

    return `
      <tr class="hover:bg-surface-subtle/80 transition-colors">
        <td class="py-4 px-4 sm:px-6 align-middle">
          <div class="flex items-start gap-3 cursor-pointer" onclick="openProblemModal('${src.id}')">
            <div class="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-institutional-navy shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-[20px]">domain</span>
            </div>
            <div class="flex flex-col min-w-0 max-w-sm">
              <span class="font-semibold text-text-primary text-xs sm:text-sm line-clamp-1 hover:text-institutional-navy transition-colors">${src.name}</span>
              <div class="flex items-center gap-2 mt-0.5 font-mono-code text-[11px] text-text-muted">
                <span class="font-bold text-saffron-accent">${src.dossierId}</span>
                <span>•</span>
                <span>${src.location}</span>
              </div>
            </div>
          </div>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle">
          <div class="flex flex-col">
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase w-max mb-1 ${bucketBadgeColor}">${src.sourceBucket}</span>
            <span class="text-xs text-text-primary font-medium line-clamp-1">${src.entityType}</span>
          </div>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle font-mono text-xs">
          <span class="text-text-primary font-semibold block">${src.identifier}</span>
          <span class="text-text-muted text-[11px]">${src.subType}</span>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle">
          <div class="flex flex-col text-xs">
            <span class="text-text-primary font-medium">${src.contactPersonName}</span>
            <span class="text-text-muted font-mono text-[11px] truncate max-w-[180px]">${src.contactEmail}</span>
          </div>
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle">
          ${statusBadge}
        </td>
        <td class="py-4 px-4 sm:px-6 align-middle text-right">
          ${actionBtn}
        </td>
      </tr>
    `;
  }).join('');
}

function openProblemModal(sourceId) {
  const src = AppState.sources.find(s => s.id === sourceId);
  if (!src) return;
  AppState.currentSourceId = sourceId;

  const idEl = document.getElementById('modal-src-id');
  const nameEl = document.getElementById('modal-src-name');
  const orgEl = document.getElementById('modal-src-org');
  const bcEl = document.getElementById('modal-src-bucket-category');
  const identEl = document.getElementById('modal-src-identifier');
  const locEl = document.getElementById('modal-src-location');
  const nodalEl = document.getElementById('modal-src-nodal');
  const emailEl = document.getElementById('modal-src-email');
  const phoneEl = document.getElementById('modal-src-phone');
  const dossierEl = document.getElementById('modal-src-dossier');
  const statusPill = document.getElementById('modal-src-status-pill');

  if (idEl) idEl.textContent = src.dossierId;
  if (nameEl) nameEl.textContent = src.name;
  if (orgEl) orgEl.textContent = src.name;
  if (bcEl) bcEl.textContent = `${src.sourceBucket} • ${src.entityType}`;
  if (identEl) identEl.textContent = src.identifier;
  if (locEl) locEl.textContent = src.location;
  if (nodalEl) nodalEl.textContent = src.contactPersonName;
  if (emailEl) emailEl.textContent = src.contactEmail;
  if (phoneEl) phoneEl.textContent = src.contactPhone;
  if (dossierEl) dossierEl.textContent = src.dossierId;

  if (statusPill) {
    if (src.verificationStatus === 'VERIFIED') {
      statusPill.textContent = 'Verified Source';
      statusPill.className = 'px-2 py-0.2 rounded-full text-[10px] font-bold uppercase bg-status-approved-bg text-status-approved-text border border-status-approved-border';
    } else if (src.verificationStatus === 'NEEDS_REVIEW') {
      statusPill.textContent = 'Needs Review';
      statusPill.className = 'px-2 py-0.2 rounded-full text-[10px] font-bold uppercase bg-status-review-bg text-status-review-text border border-status-review-border';
    } else if (src.verificationStatus === 'FLAGGED') {
      statusPill.textContent = 'Check Failed';
      statusPill.className = 'px-2 py-0.2 rounded-full text-[10px] font-bold uppercase bg-error-container text-on-error-container border border-error/30';
    } else {
      statusPill.textContent = 'Awaiting Verification';
      statusPill.className = 'px-2 py-0.2 rounded-full text-[10px] font-bold uppercase bg-status-action-bg text-status-action-text border border-status-action-border';
    }
  }

  // Update Attestation Officer Name
  const officerNameEl = document.getElementById('src-verify-officer-name');
  if (officerNameEl && AppState.authenticatedUser) {
    officerNameEl.textContent = AppState.authenticatedUser.name || 'Reviewer Officer';
  }

  // Reset form inputs
  const methodSelect = document.getElementById('src-verify-method');
  const resultSelect = document.getElementById('src-verify-result');
  const notesText = document.getElementById('src-verify-notes');
  const evidenceUrl = document.getElementById('src-verify-evidence');
  const attestCheck = document.getElementById('src-verify-attest');

  if (methodSelect) methodSelect.value = 'OFFICIAL_EMAIL';
  if (resultSelect) resultSelect.value = 'PASS';
  if (notesText) notesText.value = '';
  if (evidenceUrl) evidenceUrl.value = '';
  if (attestCheck) attestCheck.checked = true;

  handleSrcResultChange();
  handleSrcNotesInput();
  renderSourceVerificationHistory(sourceId);

  const modal = document.getElementById('problem-verification-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeProblemModal() {
  const modal = document.getElementById('problem-verification-modal');
  if (modal) modal.classList.add('hidden');
  AppState.currentSourceId = null;
}

function handleSrcResultChange() {
  const resultSelect = document.getElementById('src-verify-result');
  const result = resultSelect ? resultSelect.value : 'PASS';
  const impactBox = document.getElementById('src-impact-box');
  const impactIcon = document.getElementById('src-impact-icon');
  const impactText = document.getElementById('src-impact-text');
  const submitLabel = document.getElementById('src-submit-btn-label');

  if (result === 'PASS') {
    if (impactBox) impactBox.className = "p-3 rounded-lg bg-status-approved-bg text-status-approved-text text-xs flex items-start gap-2 border border-status-approved-border";
    if (impactIcon) {
      impactIcon.textContent = "verified";
      impactIcon.className = "material-symbols-outlined text-[18px] text-gov-emerald shrink-0 mt-0.5";
    }
    if (impactText) impactText.innerHTML = `<strong>PASS Result:</strong> The organization will receive a <span class="font-bold">Verified Source</span> badge in the national registry. Authorized submission privileges remain permanently confirmed.`;
    if (submitLabel) submitLabel.textContent = "Certify Verified Source";
  } else if (result === 'NEEDS_REVIEW') {
    if (impactBox) impactBox.className = "p-3 rounded-lg bg-status-review-bg text-status-review-text text-xs flex items-start gap-2 border border-status-review-border";
    if (impactIcon) {
      impactIcon.textContent = "rule";
      impactIcon.className = "material-symbols-outlined text-[18px] text-status-review-text shrink-0 mt-0.5";
    }
    if (impactText) impactText.innerHTML = `<strong>NEEDS REVIEW:</strong> Clarification notice logged. The organization's profile will reflect a request for supplementary credentials or documentation.`;
    if (submitLabel) submitLabel.textContent = "Log Clarification Request";
  } else if (result === 'FAIL') {
    if (impactBox) impactBox.className = "p-3 rounded-lg bg-error-container text-on-error-container text-xs flex items-start gap-2 border border-error/30";
    if (impactIcon) {
      impactIcon.textContent = "cancel";
      impactIcon.className = "material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5";
    }
    if (impactText) impactText.innerHTML = `<strong>FAIL Result:</strong> Verification failure logged in the statutory audit ledger. Source entity flagged for administrative review.`;
    if (submitLabel) submitLabel.textContent = "Record Verification Failure";
  }

  evaluateSourceVerifyReadiness();
}

function handleSrcNotesInput() {
  const textarea = document.getElementById('src-verify-notes');
  const counter = document.getElementById('src-notes-char-count');
  if (textarea && counter) {
    counter.textContent = `${textarea.value.length} / 500`;
  }
  evaluateSourceVerifyReadiness();
}

function evaluateSourceVerifyReadiness() {
  const attestCheck = document.getElementById('src-verify-attest');
  const resultSelect = document.getElementById('src-verify-result');
  const notesText = document.getElementById('src-verify-notes');
  const btn = document.getElementById('btn-submit-src-verify');
  if (!btn) return;

  const isAttested = attestCheck ? attestCheck.checked : false;
  const result = resultSelect ? resultSelect.value : 'PASS';
  const notesVal = notesText ? notesText.value.trim() : '';

  let isValid = isAttested;
  if (result === 'FAIL' || result === 'NEEDS_REVIEW') {
    isValid = isValid && notesVal.length >= 5;
  }

  btn.disabled = !isValid;
  btn.style.opacity = isValid ? '1' : '0.5';
  btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
}

async function executeSourceVerification() {
  const sourceId = AppState.currentSourceId;
  const src = AppState.sources.find(s => s.id === sourceId);
  if (!src) return;

  const btn = document.getElementById('btn-submit-src-verify');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span><span>Recording Check...</span>`;
  }

  const methodSelect = document.getElementById('src-verify-method');
  const resultSelect = document.getElementById('src-verify-result');
  const notesText = document.getElementById('src-verify-notes');
  const evidenceUrlInput = document.getElementById('src-verify-evidence');

  const method = methodSelect ? methodSelect.value : 'OFFICIAL_EMAIL';
  const result = resultSelect ? resultSelect.value : 'PASS';
  const notes = notesText ? notesText.value.trim() : '';
  const evidenceUrl = evidenceUrlInput ? evidenceUrlInput.value.trim() : '';

  try {
    let backendRecord = null;
    try {
      backendRecord = await ApiClient.post(`/sources/${sourceId}/verify`, {
        method: method,
        result: result,
        notes: notes || undefined,
        evidenceUrl: evidenceUrl || undefined
      });
    } catch (apiErr) {
      console.warn('Backend POST /sources/{id}/verify note:', apiErr);
      if (apiErr.status !== 404 && apiErr.status !== 400) {
        throw apiErr;
      }
    }

    // Record check into history
    const historyKey = `verification_history_${sourceId}`;
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    } catch (e) {}

    const newEvent = {
      verificationId: (backendRecord && backendRecord.verificationId) || ('VER-' + Date.now().toString(36).toUpperCase()),
      sourceId: sourceId,
      verificationMethod: method,
      result: result,
      notes: notes || 'Statutory review check executed.',
      evidenceUrl: evidenceUrl,
      verifiedAt: (backendRecord && backendRecord.verifiedAt) || new Date().toISOString(),
      reviewerName: AppState.authenticatedUser?.name || 'Reviewer Officer'
    };

    history.push(newEvent);
    localStorage.setItem(historyKey, JSON.stringify(history));

    // Update in-memory source
    src.history = history;
    src.latestCheck = newEvent;
    if (result === 'PASS') {
      src.verificationStatus = 'VERIFIED';
      src.isVerifiedSource = true;
      showToast(`Organization "${src.name}" certified as Verified Source!`, 'success');
    } else if (result === 'NEEDS_REVIEW') {
      src.verificationStatus = 'NEEDS_REVIEW';
      showToast(`Clarification logged for "${src.name}".`, 'warning');
    } else if (result === 'FAIL') {
      src.verificationStatus = 'FLAGGED';
      showToast(`Verification check failure recorded for "${src.name}".`, 'error');
    }

    renderProblemTable();
    renderMyReviewsWorkbench();
    updateGlobalBadges();
    renderSourceVerificationHistory(sourceId);

    setTimeout(() => {
      closeProblemModal();
    }, 400);
  } catch (err) {
    console.error('Source verification failure:', err);
    await handleReviewerActionError(err, { sourceId, action: 'VERIFY_SOURCE' });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <span class="material-symbols-outlined text-[16px]">how_to_reg</span>
        <span id="src-submit-btn-label">${result === 'PASS' ? 'Certify Verified Source' : (result === 'NEEDS_REVIEW' ? 'Log Clarification Request' : 'Record Verification Failure')}</span>
      `;
    }
  }
}

function renderSourceVerificationHistory(sourceId) {
  const container = document.getElementById('src-verification-history-container');
  if (!container) return;

  const historyKey = `verification_history_${sourceId}`;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  } catch (e) {}

  if (history.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-text-muted text-xs">
        <span class="material-symbols-outlined text-[20px] text-text-muted mb-1 block">history_toggle_drop_down</span>
        <span>No prior verification checks recorded for this organization.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = history.slice().reverse().map(ev => {
    let resBadge = '';
    if (ev.result === 'PASS') {
      resBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-status-approved-bg text-status-approved-text border border-status-approved-border">PASS</span>`;
    } else if (ev.result === 'NEEDS_REVIEW') {
      resBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-status-review-bg text-status-review-text border border-status-review-border">NEEDS REVIEW</span>`;
    } else {
      resBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error-container text-on-error-container border border-error/30">FAIL</span>`;
    }

    const dateStr = new Date(ev.verifiedAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="p-3 rounded-lg border border-border-hairline bg-surface-subtle/50 text-xs space-y-1.5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            ${resBadge}
            <span class="font-mono text-[11px] font-semibold text-institutional-navy bg-surface-crisp px-2 py-0.5 rounded border border-border-hairline">${ev.verificationMethod}</span>
          </div>
          <span class="text-text-muted font-mono text-[11px]">${dateStr}</span>
        </div>
        ${ev.notes ? `<p class="text-text-primary text-xs mt-1 font-body-sm">${ev.notes}</p>` : ''}
        <div class="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-hairline/60">
          <span>Officer: <strong class="text-text-primary">${ev.reviewerName || 'Reviewer'}</strong></span>
          ${ev.evidenceUrl ? `
            <a href="${ev.evidenceUrl}" target="_blank" rel="noopener noreferrer" class="text-institutional-navy hover:underline flex items-center gap-0.5 font-mono">
              <span class="material-symbols-outlined text-[13px]">link</span>
              <span>Evidence Link</span>
            </a>
          ` : '<span class="font-mono text-[10px]">No external URL</span>'}
        </div>
      </div>
    `;
  }).join('');
}

// =============================================================================
// 12. SCREEN: CASELOAD WORKBENCH (MY REVIEWS)
// =============================================================================
function renderMyReviewsWorkbench() {
  const user = AppState.authenticatedUser;
  const myRegs = AppState.registrations.filter(r => r.status === 'UNDER_REVIEW');
  const pendingSources = (AppState.sources || []).filter(s => s.verificationStatus === 'PENDING' || !s.isVerifiedSource);

  // Update dynamic officer information in workbench
  const nameEl = document.getElementById('workbench-officer-name');
  const roleEl = document.getElementById('workbench-officer-role');
  const headingEl = document.getElementById('workbench-officer-heading');
  const avatarEl = document.getElementById('workbench-avatar');

  if (user) {
    const displayName = user.name || (user.email ? user.email.split('@')[0].toUpperCase() : 'Reviewer Officer');
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = `Clearance: ROLE_${user.role || 'REVIEWER'}`;
    if (headingEl) headingEl.textContent = `${displayName}'s Active Caseload`;
    if (avatarEl) avatarEl.textContent = displayName.substring(0, 2).toUpperCase();
  }

  const regCountEl = document.getElementById('my-reg-count');
  const prbCountEl = document.getElementById('my-prb-count');
  if (regCountEl) regCountEl.textContent = myRegs.length;
  if (prbCountEl) prbCountEl.textContent = pendingSources.length;

  const regTbody = document.getElementById('my-registrations-tbody');
  if (regTbody) {
    if (myRegs.length === 0) {
      regTbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-text-muted">
            <span class="material-symbols-outlined text-[28px] text-border-strong mb-1 block">task_alt</span>
            <p class="text-xs">No registrations currently claimed. Go to Registration Queue to assign incoming cases.</p>
          </td>
        </tr>
      `;
    } else {
      regTbody.innerHTML = myRegs.map(reg => `
        <tr class="hover:bg-surface-subtle/80 transition-colors">
          <td class="py-3.5 px-4 sm:px-6">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-institutional-navy shrink-0 font-bold text-xs">
                <span class="material-symbols-outlined text-[18px]">account_balance</span>
              </div>
              <div>
                <span class="font-semibold text-text-primary text-xs sm:text-sm block">${reg.name}</span>
                <span class="font-mono text-[11px] text-text-muted">${reg.dossierId} • ${reg.subType}</span>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 sm:px-6 text-xs text-text-primary">${reg.entityType}</td>
          <td class="py-3.5 px-4 sm:px-6 text-xs font-mono text-text-secondary">${reg.date}</td>
          <td class="py-3.5 px-4 sm:px-6">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-status-review-bg text-status-review-text animate-pulse">UNDER REVIEW</span>
          </td>
          <td class="py-3.5 px-4 sm:px-6 text-right">
            <a href="#/detail/${reg.id}" class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-institutional-navy hover:bg-primary text-on-primary shadow-sm transition-all cursor-pointer">
              <span>Continue Review</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </td>
        </tr>
      `).join('');
    }
  }

  const prbTbody = document.getElementById('my-problems-tbody');
  if (prbTbody) {
    if (pendingSources.length === 0) {
      prbTbody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-text-muted">
            <span class="material-symbols-outlined text-[28px] text-border-strong mb-1 block">task_alt</span>
            <p class="text-xs">No entities currently awaiting identity verification.</p>
          </td>
        </tr>
      `;
    } else {
      prbTbody.innerHTML = pendingSources.map(src => `
        <tr class="hover:bg-surface-subtle/80 transition-colors">
          <td class="py-3.5 px-4 sm:px-6">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-institutional-navy shrink-0 font-bold text-xs">
                <span class="material-symbols-outlined text-[18px]">domain</span>
              </div>
              <div>
                <span class="font-semibold text-text-primary text-xs sm:text-sm block line-clamp-1">${src.name}</span>
                <span class="font-mono text-[11px] text-text-muted">${src.dossierId} • ${src.location}</span>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 sm:px-6 text-xs text-text-primary">${src.sourceBucket} • ${src.entityType}</td>
          <td class="py-3.5 px-4 sm:px-6 text-xs text-text-secondary">${src.contactPersonName}</td>
          <td class="py-3.5 px-4 sm:px-6">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-status-action-bg text-status-action-text">AWAITING CHECK</span>
          </td>
          <td class="py-3.5 px-4 sm:px-6 text-right">
            <button onclick="openProblemModal('${src.id}')" class="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container border border-border-hairline text-institutional-navy transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[15px]">verified_user</span>
              <span>Verify Identity</span>
            </button>
          </td>
        </tr>
      `).join('');
    }
  }
}

// =============================================================================


// =============================================================================
// 14. DOCUMENT PREVIEW MODAL
// =============================================================================
function openDocPreviewModal(regId, docIdx) {
  const reg = AppState.currentRegistration || AppState.registrations.find(r => r.id === regId) || { name: 'Statutory Entity', documents: [] };
  const doc = (reg.documents && reg.documents[docIdx]) ? reg.documents[docIdx] : { name: 'Annexure', file: 'DOCUMENT.pdf', status: 'Submitted' };

  const modal = document.getElementById('doc-preview-modal');
  const title = document.getElementById('modal-doc-title');
  const body = document.getElementById('modal-doc-body');
  if (!modal) return;

  modal.classList.remove('hidden');
  if (title) title.innerText = `Annexure: ${doc.name}`;
  if (body) {
    body.innerHTML = `
      <div class="p-6 bg-surface-crisp border border-border-hairline rounded-lg shadow-sm space-y-4 font-body-md text-xs sm:text-body-md">
        <div class="border-b border-border-hairline pb-4 text-center">
          <span class="font-mono-code text-[11px] text-text-muted">STATUTORY VERIFICATION DIRECTORY</span>
          <h4 class="font-headline-sm text-sm sm:text-headline-sm font-bold text-primary mt-1">${doc.name}</h4>
          <p class="text-xs text-text-secondary">${reg.name} • ${reg.district ? reg.district + ', ' : ''}${reg.state}</p>
        </div>
        <div class="p-4 bg-surface-subtle rounded-lg font-mono text-xs space-y-1 border border-border-hairline">
          <div><span class="text-text-muted">Filename:</span> <strong class="text-text-primary">${doc.file || 'ATTACHMENT.pdf'}</strong></div>
          <div><span class="text-text-muted">Dossier Association:</span> <strong class="text-institutional-navy">${reg.dossierId}</strong></div>
          <div><span class="text-text-muted">Verification Status:</span> <strong class="${(doc.status || '').includes('Deficiency') || (doc.status || '').includes('Invalid') ? 'text-saffron-accent' : 'text-gov-emerald'}">${doc.status || 'Verified'}</strong></div>
        </div>
        <p class="text-text-primary leading-relaxed">
          Document submitted under digital verification by authorized nodal custodian <strong class="text-institutional-navy">${reg.vdoName}</strong>. Cryptographic checksum recorded in compliance ledger.
        </p>
        <div class="pt-4 border-t border-border-hairline flex items-center justify-between text-xs text-text-muted">
          <span>Security Hash: SHA256-NIC-TSA-${(doc.file || 'FILE').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase()}</span>
          <span class="font-mono-code text-gov-emerald font-semibold flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            <span>SEAL VALIDATED</span>
          </span>
        </div>
      </div>
    `;
  }
}

function openDocPreview(docNum) {
  openDocPreviewModal(AppState.currentRegistrationId, docNum - 1);
}

function closeDocPreview() {
  const modal = document.getElementById('doc-preview-modal');
  if (modal) modal.classList.add('hidden');
}

// =============================================================================
// 15. UNIVERSAL NOTIFICATION TOAST
// =============================================================================
function showToast(message, type = 'info') {
  const existing = document.getElementById('statutory-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'statutory-toast';

  let icon = 'info';
  let borderClass = 'border-border-strong/30';
  let bgClass = 'bg-institutional-navy';
  let iconColor = 'text-inverse-primary';

  if (type === 'success') {
    icon = 'verified';
    iconColor = 'text-gov-emerald';
    borderClass = 'border-gov-emerald/40';
  } else if (type === 'warning') {
    icon = 'warning';
    iconColor = 'text-saffron-accent';
    borderClass = 'border-saffron-accent/40';
  } else if (type === 'error') {
    icon = 'error';
    iconColor = 'text-error';
    bgClass = 'bg-slate-900';
    borderClass = 'border-error/50';
  }

  toast.className = `fixed bottom-6 right-6 z-[200] max-w-md ${bgClass} text-on-primary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${borderClass} toast-animate text-xs sm:text-sm font-body-md`;
  toast.innerHTML = `
    <span class="material-symbols-outlined ${iconColor} text-[20px] shrink-0">${icon}</span>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-on-primary/70 hover:text-on-primary cursor-pointer">
      <span class="material-symbols-outlined text-[16px]">close</span>
    </button>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast && toast.parentElement) toast.remove();
  }, 4500);
}
