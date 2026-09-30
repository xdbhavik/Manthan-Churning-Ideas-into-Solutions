import { TYPES } from './field-schemas.js';

/* ============================================================
 * Problem Source Portal — Core Client Controller
 * Integrates Stitch Screens 1–6 with Spring Boot REST Backend
 * ============================================================ */
'use strict';

// Ensure TYPES is available from field-schemas.js
const TYPE_SCHEMAS = (typeof TYPES !== 'undefined') ? TYPES : {};

const DOC_TYPE_LABELS = {
  AUTHORIZATION_LETTER: 'Authorization Letter',
  GRAM_SABHA_RESOLUTION: 'Gram Sabha Resolution',
  REGISTRATION_CERTIFICATE: 'Registration Certificate',
  GOVERNMENT_ID: 'Government ID / Nodal Order',
  AUDIT_REPORT: 'Statutory Audit Report'
};

export const ENUM_LABELS = {
  // PRI
  GRAM_PANCHAYAT: 'Gram Panchayat',
  BLOCK_PANCHAYAT: 'Block Panchayat',
  ZILLA_PARISHAD: 'Zilla Parishad',
  GRAM_SABHA: 'Gram Sabha',
  WARD_SABHA: 'Ward Sabha',
  MAHILA_SABHA: 'Mahila Sabha',
  STANDING_COMMITTEE: 'Standing Committee',

  // ULB
  MUNICIPAL_CORPORATION: 'Municipal Corporation',
  MUNICIPALITY: 'Municipality',
  NAGAR_PANCHAYAT: 'Nagar Panchayat',

  // Language
  English: 'English',
  Hindi: 'Hindi',
  en: 'English',
  hi: 'Hindi',

  // Company Size
  LARGE: 'Large (500+ employees)',
  MID: 'Mid-sized (50–500 employees)',
  SMALL: 'Small (<50 employees)',

  // Startup Stages & Funding
  IDEA: 'Idea Stage',
  MVP: 'Minimum Viable Product (MVP)',
  EARLY_REVENUE: 'Early Revenue',
  GROWTH: 'Growth Stage',
  SCALE: 'Scale-Up',
  BOOTSTRAPPED: 'Bootstrapped (Self-Funded)',
  ANGEL: 'Angel Round',
  SEED: 'Seed Round',
  SERIES_A: 'Series A',
  SERIES_B_PLUS: 'Series B+',

  // MSME
  MICRO: 'Micro Enterprise',
  MEDIUM: 'Medium Enterprise',

  // NGO / CBO
  TRUST: 'Trust',
  SOCIETY: 'Society',
  SEC_: 'Section 8 Company',
  COOPERATIVE: 'Cooperative',
  CBO: 'Community-Based Organisation (CBO)',
  FPO: 'Farmer Producer Organisation (FPO)',
  OTHER: 'Other',

  // SHG
  BANK: 'Bank Promoted',
  NGO: 'NGO Promoted',
  GOVT_PROGRAM: 'Government Program (NRLM/SGSY)',
  SAVINGS_ONLY: 'Savings Account Only',
  LOAN_TAKEN: 'Credit Linked (Loan Taken)',
  LOAN_REPAID: 'Loan Fully Repaid',
  NO_ACCOUNT: 'No Bank Account Yet',

  // CBO / Cooperative
  COOPERATIVE_SOCIETY: 'Cooperative Society',
  FARMERS: 'Farmers',
  ARTISANS: 'Artisans / Craftspeople',
  WOMEN: 'Women Members',
  MIXED: 'Mixed Community',

  // Higher Education & Research
  CENTRAL_UNIV: 'Central University',
  STATE_UNIV: 'State University',
  DEEMED: 'Deemed-to-be University',
  PRIVATE: 'Private University',
  AUTONOMOUS_COLLEGE: 'Autonomous College',
  RESEARCH_INSTITUTE: 'National Research Institute',

  // Document Types
  AUTHORIZATION_LETTER: 'Authorization Letter',
  GRAM_SABHA_RESOLUTION: 'Gram Sabha Resolution',
  REGISTRATION_CERTIFICATE: 'Registration Certificate',
  GOVERNMENT_ID: 'Government ID / Nodal Order',
  AUDIT_REPORT: 'Statutory Audit Report',

  // Problem Severity & Urgency
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MODERATE: 'Moderate',
  MINOR: 'Minor',
  IMMEDIATE: 'Immediate (0–3 months)',
  SHORT_TERM: 'Short Term (3–6 months)',
  LONG_TERM: 'Long Term (6–12 months)',
};

/**
 * Format any enum code, boolean, or raw string into human-friendly Title Case
 */
export function formatEnumValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return '';
  const str = String(val).trim();
  if (!str) return '—';
  if (ENUM_LABELS[str]) return ENUM_LABELS[str];

  // Specific common abbreviations
  const acronyms = new Set(['ID', 'PRI', 'ULB', 'NGO', 'CBO', 'FPO', 'MSME', 'CSR', 'SHG', 'CEO', 'CIN', 'NIC', 'GPDP', 'NAAC', 'NIRF', 'UGC', 'AICTE']);

  // If ALL_CAPS or contains underscores
  if (/^[A-Z0-9_]+$/.test(str)) {
    return str
      .split('_')
      .filter(Boolean)
      .map(part => {
        if (acronyms.has(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // If camelCase, convert to Title Case
  if (/^[a-z]+[A-Z0-9]/.test(str)) {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  }

  return str;
}

/**
 * Formats field camelCase/raw key into readable label if schema label is missing
 */
export function formatFieldLabel(key, schema) {
  if (!key) return '';
  if (schema && schema.fields) {
    const found = schema.fields.find(f => f.key === key);
    if (found && found.label) return found.label;
  }
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

const STATUS_LABELS = {
  DRAFT: 'Draft Saved',
  SUBMITTED: 'Submitted — Awaiting Review',
  UNDER_REVIEW: 'Under Review',
  ACTION_REQUIRED: 'Changes Requested',
  APPROVED: 'Approved ✓',
  REJECTED: 'Application Rejected'
};

window.goToWizardStep = function(target) {
  // If moving backwards or staying, allow it
  if (target <= state.wizard.step) {
    if (state.wizard.step === 2) collectStep2Data();
    state.wizard.step = target;
    renderWizardStep();
    return;
  }

  // Moving forward: validate current step
  if (state.wizard.step === 1) {
    if (!state.wizard.type) {
      toast('Please select an entity sub-type first', 'error');
      return;
    }
    // Allow advancing only 1 step at a time for validation
    if (target > 2) target = 2; 
  } else if (state.wizard.step === 2) {
    collectStep2Data();
    const schema = TYPE_SCHEMAS[state.wizard.type];
    if (!schema) return;
    
    let isValid = true;
    let missingFields = [];
    
    document.querySelectorAll('#dynamic-fields-container input, #dynamic-fields-container select, #dynamic-fields-container textarea').forEach(el => {
      el.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
    });
    document.querySelectorAll('.custom-select-wrapper').forEach(w => {
      w.classList.remove('has-error');
    });

    (schema.fields || []).forEach(f => {
      if (f.required) {
        const val = state.wizard.formData[f.key];
        if (!val || String(val).trim() === '') {
          isValid = false;
          missingFields.push(f.label);
          const el = document.querySelector(`[name="${f.key}"]`);
          if (el) {
            el.classList.add('border-red-500', 'ring-1', 'ring-red-500');
            const wrap = el.closest('.custom-select-wrapper');
            if (wrap) wrap.classList.add('has-error');
          }
        }
      }
    });

    if (!isValid) {
      toast(`Please fill required fields: ${missingFields.join(', ')}`, 'error');
      return;
    }
    if (target > 3) target = 3;
  } else if (state.wizard.step === 3) {
    // Basic validation for documents if needed
    if (target > 4) target = 4;
  }

  state.wizard.step = target;
  renderWizardStep();
};

window.validateAndGoStep3 = function() {
  window.goToWizardStep(3);
};

window.validateAndGoStep2 = function() {
  window.goToWizardStep(2);
};


const state = {
  baseUrl: localStorage.getItem('sih_portal_base') || 'http://localhost:8090',
  token: localStorage.getItem('sih_portal_token') || '',
  refresh: localStorage.getItem('sih_portal_refresh') || '',
  user: JSON.parse(localStorage.getItem('sih_portal_user') || 'null'),
  otpChallenge: null,
  otpPhone: '',
  devOtp: '',
  activeView: 'view-auth',
  sourceTypes: null,
  domains: [],
  wizard: {
    step: 1, // 1: Bucket/Type, 2: Details, 3: Docs, 4: Review, 5: Submit
    bucket: 'GOVT',
    type: 'PRI',
    formData: {},
    documents: [],
    draftId: null
  },
  activeRegistration: null,
  activeSourceAccount: null,
  history: [],
  pollingTimer: null,
  availableUniversities: [],
  selectedUniversities: [],
  selectedDomainIds: [],
  activeAccessRule: 'OPEN_TO_ALL',
  myProblems: [],
  activeModalProblemId: null
};

/* ---------------- API Helper ---------------- */
async function api(method, path, { body, auth = true } = {}) {
  const url = state.baseUrl.replace(/\/+$/, '') + path;
  const headers = {};
  let payload;
  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      payload = body;
    } else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }
  if (auth && state.token) {
    headers['Authorization'] = 'Bearer ' + state.token;
  }
  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch (err) {
    return { ok: false, status: 0, data: { detail: 'Network error or backend unreachable at ' + state.baseUrl } };
  }

  // Silent auto-refresh on 401
  if (res.status === 401 && state.refresh && path !== '/auth/refresh') {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers['Authorization'] = 'Bearer ' + state.token;
      try {
        res = await fetch(url, { method, headers, body: payload });
      } catch (err) {
        return { ok: false, status: 0, data: null };
      }
    }
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function refreshToken() {
  try {
    const res = await fetch(state.baseUrl.replace(/\/+$/, '') + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: state.refresh })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const d = await res.json();
    setSession(d.accessToken, d.refreshToken, d.user);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

function setSession(token, refresh, user) {
  state.token = token || '';
  if (refresh) state.refresh = refresh;
  if (user) state.user = user;
  localStorage.setItem('sih_portal_token', state.token);
  localStorage.setItem('sih_portal_refresh', state.refresh);
  localStorage.setItem('sih_portal_user', JSON.stringify(state.user));
  updateHeaderUser();
}

function clearSession() {
  state.token = '';
  state.refresh = '';
  state.user = null;
  state.activeRegistration = null;
  state.activeSourceAccount = null;
  localStorage.removeItem('sih_portal_token');
  localStorage.removeItem('sih_portal_refresh');
  localStorage.removeItem('sih_portal_user');
  updateHeaderUser();
  showView('view-auth');
}

/* ---------------- View Management ---------------- */
let previousViewBeforeProfile = 'view-tracking';

function showView(viewId) {
  // Fix 1: Guard against re-entry into view-wizard when registration is already submitted or locked
  if (viewId === 'view-wizard') {
    const regStatus = state.activeRegistration?.status;
    const isSubmittedOrLocked = regStatus && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(regStatus);
    const hasVerifiedAccount = Boolean(state.activeSourceAccount);

    if (isSubmittedOrLocked || hasVerifiedAccount) {
      toast("Your application has already been submitted and is under review — here's its current status.", 'info');
      if (state.activeRegistration) {
        renderTrackingScreen(state.activeRegistration);
      }
      return showView('view-tracking');
    }
  }

  if (state.activeView && state.activeView !== 'view-profile') {
    previousViewBeforeProfile = state.activeView;
  }
  state.activeView = viewId;
  closeProfileDropdown();

  // Push browser history state for seamless back-navigation
  if (window.history && window.history.pushState && window.history.state?.viewId !== viewId) {
    try {
      window.history.pushState({ viewId }, '', '#' + viewId);
    } catch (e) {
      // Ignore security origin restrictions in some environments
    }
  }

  const views = [
    'view-auth', 'view-otp', 'view-wizard', 'view-tracking',
    'view-deficiency', 'view-completed', 'view-profile',
    'view-problem-form', 'view-my-problems'
  ];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== viewId);
  });

  updateNavTabs(viewId);

  if (viewId === 'view-profile') renderProfilePage();
  if (viewId === 'view-tracking' && state.activeRegistration) renderTrackingScreen(state.activeRegistration);
  if (viewId === 'view-wizard') bootWizardTimeline();
  if (viewId === 'view-problem-form') renderProblemFilingScreen();
  if (viewId === 'view-my-problems') loadMyProblems();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavTabs(viewId) {
  const kycBtn = document.getElementById('nav-btn-kyc');
  const fileBtn = document.getElementById('nav-btn-file-problem');
  const myProbBtn = document.getElementById('nav-btn-my-problems');

  const activeClass = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container text-ashoka-blue shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors';
  const inactiveClass = 'px-3 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-ashoka-blue hover:bg-surface-muted flex items-center gap-1.5 cursor-pointer transition-colors';

  const isKyc = ['view-wizard', 'view-tracking', 'view-deficiency', 'view-completed'].includes(viewId);
  const isFile = viewId === 'view-problem-form';
  const isMyProb = viewId === 'view-my-problems';

  if (kycBtn) kycBtn.className = isKyc ? activeClass : inactiveClass;
  if (fileBtn) fileBtn.className = isFile ? activeClass : inactiveClass;
  if (myProbBtn) myProbBtn.className = isMyProb ? activeClass : inactiveClass;
}

function goToKycAction() {
  if (!state.token) {
    return showView('view-auth');
  }
  if (state.activeSourceAccount) {
    renderCompletedScreen(state.activeSourceAccount);
    return showView('view-completed');
  }
  if (state.activeRegistration) {
    const status = state.activeRegistration.status;
    if (status === 'DRAFT') {
      state.wizard.step = 4;
      populateWizardFromDraft(state.activeRegistration);
      renderWizardStep();
      return showView('view-wizard');
    }
    if (status === 'ACTION_REQUIRED') {
      renderDeficiencyScreen(state.activeRegistration);
      return showView('view-deficiency');
    }
    renderTrackingScreen(state.activeRegistration);
    return showView('view-tracking');
  }
  state.wizard.step = 1;
  renderWizardStep();
  showView('view-wizard');
}

function goToFileProblem() {
  if (!state.token) {
    return showView('view-auth');
  }
  showView('view-problem-form');
}

function goToMyProblems() {
  if (!state.token) {
    return showView('view-auth');
  }
  showView('view-my-problems');
}

function goBackFromProfile() {
  if (previousViewBeforeProfile && previousViewBeforeProfile !== 'view-profile') {
    showView(previousViewBeforeProfile);
  } else {
    syncPortalState();
  }
}

/* ---------------- Toast Notification ---------------- */
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  const bg = type === 'error' ? 'bg-error text-on-error' :
             type === 'success' ? 'bg-gov-emerald text-surface-crisp' :
             type === 'warn' ? 'bg-saffron-accent text-surface-crisp' : 'bg-ashoka-blue text-surface-crisp';
  t.className = `${bg} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-body-sm transition-all transform duration-300 opacity-0 translate-y-2`;
  t.innerHTML = `<span class="material-symbols-outlined text-[20px]">${type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info'}</span>
                 <span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.classList.remove('opacity-0', 'translate-y-2'); }, 20);
  setTimeout(() => {
    t.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

/* ---------------- Synchronize State & Routing ---------------- */
async function syncPortalState() {
  if (!state.token) {
    showView('view-auth');
    return;
  }

  updateHeaderUser();
  stopTrackingPolling();

  // Always check for existing source accounts first (backend is the single source of truth)
  const accRes = await api('GET', '/source/accounts');
  if (accRes.ok && Array.isArray(accRes.data) && accRes.data.length > 0) {
    // User has an active, verified source account → approved KYC
    state.activeSourceAccount = accRes.data[0];
    // Update cached user kycStatus to match backend reality
    if (state.user) state.user.kycStatus = 'VERIFIED';
    localStorage.setItem('sih_portal_user', JSON.stringify(state.user));
    updateHeaderUser();
    renderCompletedScreen(state.activeSourceAccount);
    showView('view-completed');
    return;
  }

  // No source account yet → check existing registrations
  const mineRes = await api('GET', '/registration/mine');
  if (mineRes.ok && Array.isArray(mineRes.data) && mineRes.data.length > 0) {
    // Pick the most recent registration
    const reg = mineRes.data[0];
    state.activeRegistration = reg;
    state.wizard.draftId = reg.registrationId;

    switch (reg.status) {
      case 'DRAFT':
        state.wizard.step = 4;
        populateWizardFromDraft(reg);
        renderWizardStep();
        showView('view-wizard');
        break;
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        await renderTrackingScreen(reg);
        showView('view-tracking');
        startTrackingPolling(reg.registrationId);
        break;
      case 'REJECTED':
        await renderTrackingScreen(reg);
        showView('view-tracking');
        break;
      case 'ACTION_REQUIRED':
        await renderDeficiencyScreen(reg);
        showView('view-deficiency');
        break;
      case 'APPROVED':
        // Registration approved but source account not yet visible (race condition)
        // Re-check source accounts
        const accRes2 = await api('GET', '/source/accounts');
        if (accRes2.ok && Array.isArray(accRes2.data) && accRes2.data.length > 0) {
          state.activeSourceAccount = accRes2.data[0];
          if (state.user) state.user.kycStatus = 'VERIFIED';
          localStorage.setItem('sih_portal_user', JSON.stringify(state.user));
          updateHeaderUser();
        }
        renderCompletedScreen(state.activeSourceAccount || { displayName: reg.source?.organizationName || 'Verified Source', sourceAccountId: reg.registrationId });
        showView('view-completed');
        break;
      default:
        // Unknown status → start fresh wizard
        state.wizard.step = 1;
        renderWizardStep();
        showView('view-wizard');
    }
  } else {
    // No registration found → user must complete KYC first
    state.wizard.step = 1;
    renderWizardStep();
    showView('view-wizard');
  }
}

/* ---------- Tracking Polling: auto-refresh status every 15s ---------- */
function startTrackingPolling(regId) {
  stopTrackingPolling();
  state.pollingTimer = setInterval(async () => {
    const res = await api('GET', `/registration/${regId}/status`);
    if (res.ok && res.data) {
      const newStatus = res.data.status;
      const oldStatus = state.activeRegistration?.status;
      if (newStatus !== oldStatus) {
        toast(`Your application status has been updated.`, 'info');
        await syncPortalState();
      }
    }
  }, 15000);
}

function stopTrackingPolling() {
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
}

/* ---------------- Screen 1: Auth Handlers ---------------- */
async function handleSendOtp(phone, email) {
  phone = phone.replace(/\D/g, '');
  if (phone.length !== 10) {
    toast('Please enter a valid 10-digit mobile number', 'error');
    return;
  }
  state.otpPhone = phone;

  // Smart Flow: try login, fallback to register if 404
  let res = await api('POST', '/auth/login', { body: { phone }, auth: false });
  if (!res.ok && res.status === 404) {
    res = await api('POST', '/auth/register', { body: { phone, email: email || null }, auth: false });
  }

  if (res.ok && res.data && res.data.challengeId) {
    state.otpChallenge = res.data.challengeId;
    state.devOtp = res.data.devOtp || '123456';
    setupOtpScreen();
    showView('view-otp');
    toast('Verification code sent successfully!', 'success');
  } else {
    toast((res.data && res.data.detail) || 'Failed to send OTP. Please check your number.', 'error');
  }
}

/* ---------------- Screen 2: OTP Handlers ---------------- */
function setupOtpScreen() {
  const displayPhone = document.getElementById('otp-display-phone');
  if (displayPhone) displayPhone.textContent = `+91 ${state.otpPhone.slice(0, 5)} ${state.otpPhone.slice(5)}`;

  const devBadge = document.getElementById('dev-otp-code');
  if (devBadge) devBadge.textContent = state.devOtp || '123456';

  const cells = document.querySelectorAll('.otp-cell');
  cells.forEach(c => (c.value = ''));
  if (cells[0]) cells[0].focus();
}

async function handleVerifyOtp(code) {
  if (!state.otpChallenge) {
    toast('No active OTP challenge found. Please re-enter phone.', 'error');
    showView('view-auth');
    return;
  }
  if (!code || code.length !== 6) {
    toast('Please enter the full 6-digit OTP', 'error');
    return;
  }

  const res = await api('POST', '/auth/verify-otp', {
    body: { challengeId: state.otpChallenge, code },
    auth: false
  });

  if (res.ok && res.data && res.data.accessToken) {
    setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
    toast('Authentication successful!', 'success');
    await syncPortalState();
  } else {
    toast((res.data && res.data.detail) || 'Invalid or expired OTP code', 'error');
  }
}

/* ---------------- Screen 3: Wizard Logic ---------------- */
function setWizardBucket(bucket) {
  state.wizard.bucket = bucket;
  // Pick first subtype for this bucket
  const firstType = Object.keys(TYPE_SCHEMAS).find(k => TYPE_SCHEMAS[k].bucket === bucket) || 'PRI';
  setWizardType(firstType);
}

function setWizardType(type) {
  state.wizard.type = type;
  renderWizardStep();
}

/* ------------------------------------------------------------
 * Wizard timeline (presentation only — reads state, never writes)
 * ------------------------------------------------------------ */
const WIZARD_TOTAL_STEPS = 5;
const WIZARD_STAGE_NAMES = ['Category', 'Details', 'Documents', 'Review', 'Confirm'];
const WIZARD_STATE_WORDS = { done: 'completed', active: 'current', upcoming: 'not started' };
let wizardPrevStep = 0;

function clampWizardStep(value) {
  const n = parseInt(value, 10) || 1;
  return Math.min(Math.max(n, 1), WIZARD_TOTAL_STEPS);
}

// Restart a one-shot keyframe by dropping the class, forcing reflow, re-adding.
function pulseWizardNode(el) {
  el.classList.remove('wz-pop');
  void el.offsetWidth;
  el.classList.add('wz-pop');
  setTimeout(() => el.classList.remove('wz-pop'), 800);
}

function bootWizardTimeline() {
  const tl = document.getElementById('wizard-timeline');
  if (!tl) return;
  // Re-sync the rail to the live step: showView() can reveal the wizard without
  // a renderWizardStep() call, and the markup's static state only covers step 1.
  paintWizardTimeline(clampWizardStep(state.wizard.step), 'fwd', true);
  tl.classList.remove('wz-boot');
  void tl.offsetWidth;
  tl.classList.add('wz-boot');
  setTimeout(() => tl.classList.remove('wz-boot'), 1400);
}

function paintWizardTimeline(step, dir, isFirstPaint) {
  const tl = document.getElementById('wizard-timeline');
  if (!tl) return;

  tl.dataset.step = String(step);
  tl.dataset.dir = dir;
  // rail fill stops on the active node's centre → (step - 1) / (count - 1)
  tl.style.setProperty('--wz-p', ((step - 1) / (WIZARD_TOTAL_STEPS - 1)).toFixed(4));

  tl.querySelectorAll('.wz-step').forEach(el => {
    const st = parseInt(el.dataset.step, 10);
    const nextState = st < step ? 'done' : st === step ? 'active' : 'upcoming';
    const changed = el.dataset.state !== nextState;
    el.dataset.state = nextState;

    const btn = el.querySelector('.wz-node');
    if (btn) {
      if (nextState === 'active') btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
      btn.setAttribute('aria-label', `Step ${st}: ${el.dataset.label} — ${WIZARD_STATE_WORDS[nextState]}`);
    }
    if (changed && !isFirstPaint && nextState !== 'upcoming') pulseWizardNode(el);
  });

  // Completion dial + stage caption
  const pct = Math.round((step / WIZARD_TOTAL_STEPS) * 100);
  const dial = document.querySelector('.wz-dial');
  if (dial) {
    dial.style.setProperty('--wz-pct', (step / WIZARD_TOTAL_STEPS).toFixed(3));
    dial.dataset.complete = step === WIZARD_TOTAL_STEPS ? 'true' : 'false';
    dial.setAttribute('aria-label', `Registration ${pct} percent complete`);
  }
  const pctEl = document.getElementById('wizard-dial-pct');
  if (pctEl) pctEl.textContent = `${pct}%`;
  const stageEl = document.getElementById('wizard-stage-label');
  if (stageEl) stageEl.textContent = `Step ${step} of ${WIZARD_TOTAL_STEPS} · ${WIZARD_STAGE_NAMES[step - 1] || ''}`;
}

function renderWizardStep() {
  // Fix 1: Guard against re-entry into wizard when registration is already submitted/locked
  const regStatus = state.activeRegistration?.status;
  if ((regStatus && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(regStatus)) || state.activeSourceAccount) {
    toast("Your application has already been submitted and is under review — here's its current status.", 'info');
    if (state.activeRegistration) renderTrackingScreen(state.activeRegistration);
    return showView('view-tracking');
  }

  const step = clampWizardStep(state.wizard.step);
  const isFirstPaint = wizardPrevStep === 0;
  const dir = step < wizardPrevStep ? 'back' : 'fwd';

  paintWizardTimeline(step, dir, isFirstPaint);
  if (isFirstPaint) bootWizardTimeline();

  // Toggle step panels with a direction-aware entrance
  for (let s = 1; s <= WIZARD_TOTAL_STEPS; s++) {
    const p = document.getElementById(`wizard-panel-${s}`);
    if (!p) continue;
    const isCurrent = s === step;
    p.classList.toggle('hidden', !isCurrent);
    p.classList.remove('wz-in-fwd', 'wz-in-back');
    if (isCurrent) {
      void p.offsetWidth;
      p.classList.add(dir === 'back' ? 'wz-in-back' : 'wz-in-fwd');
    }
  }

  wizardPrevStep = step;

  if (step === 1) renderStep1Types();
  if (step === 2) renderStep2Form();
  if (step === 3) renderStep3Docs();
  if (step === 4) renderStep4Review();
  if (step === 5) renderStep5Submit();
}

function renderStep1Types() {
  const bucket = state.wizard.bucket;
  document.querySelectorAll('.category-btn').forEach(btn => {
    const b = btn.dataset.bucket;
    const isSelected = b === bucket;
    btn.className = `category-btn flex flex-col items-center text-center p-3 rounded-xl border transition-all text-left relative ${
      isSelected ? 'bg-surface-container border-ashoka-blue text-ashoka-blue shadow-sm' : 'bg-surface-crisp border-border-hairline hover:bg-surface-muted text-text-secondary'
    }`;
    const chk = btn.querySelector('.check-badge');
    if (chk) chk.classList.toggle('hidden', !isSelected);
  });

  // Render subtype tiles
  const typeContainer = document.getElementById('subtype-container');
  if (!typeContainer) return;
  typeContainer.innerHTML = '';
  const matching = Object.entries(TYPE_SCHEMAS).filter(([_, s]) => s.bucket === bucket);
  matching.forEach(([code, s]) => {
    const isSel = code === state.wizard.type;
    const div = document.createElement('div');
    div.className = `p-4 rounded-lg border cursor-pointer transition-all ${
      isSel ? 'border-ashoka-blue bg-surface-subtle shadow-sm ring-1 ring-ashoka-blue' : 'border-border-hairline bg-surface-crisp hover:bg-surface-muted'
    }`;
    div.onclick = () => {
      if (state.wizard.type !== code) {
        state.wizard.type = code;
        const newSchema = TYPE_SCHEMAS[code] || {};
        const allowedKeys = new Set((newSchema.fields || []).map(f => f.key));
        const cleaned = {};
        for (const [k, v] of Object.entries(state.wizard.formData)) {
          if (allowedKeys.has(k) || ['contactEmail', 'contactPhone', 'contactPersonName', 'officialEmailDomain'].includes(k)) {
            cleaned[k] = v;
          }
        }
        state.wizard.formData = cleaned;
      }
      renderStep1Types();
    };
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${s.icon || '🏛️'}</span>
          <div>
            <h4 class="font-headline-sm text-ashoka-blue">${s.name}</h4>
            
          </div>
        </div>
        ${isSel ? '<span class="material-symbols-outlined text-gov-emerald text-[22px]">check_circle</span>' : ''}
      </div>
      <p class="font-body-sm text-text-secondary mt-2">${s.tagline || ''}</p>
    `;
    typeContainer.appendChild(div);
  });
}

function renderStep2Form() {
  const schema = TYPE_SCHEMAS[state.wizard.type];
  const container = document.getElementById('dynamic-fields-container');
  const titleEl = document.getElementById('step2-type-title');
  if (titleEl && schema) titleEl.textContent = `${schema.icon || ''} ${schema.name}`;
  if (!container || !schema) return;

  container.innerHTML = '';
  // Group fields by their group attribute
  const groups = {};
  (schema.fields || []).forEach(field => {
    const grp = field.group || 'Details';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(field);
  });

  Object.entries(groups).forEach(([grpName, fields]) => {
    const grpDiv = document.createElement('div');
    grpDiv.className = 'flex flex-col gap-3 pb-4 border-b border-border-hairline last:border-b-0';
    grpDiv.innerHTML = `<h3 class="font-label-lg text-ashoka-blue font-bold uppercase tracking-wider text-[12px]">${grpName}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

    fields.forEach(f => {
      const fieldWrap = document.createElement('div');
      fieldWrap.className = f.type === 'textarea' ? 'sm:col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1';
      const val = state.wizard.formData[f.key] || '';
      const isReq = f.required;

      let inputHtml = '';
      if (f.type === 'select') {
        const rawOptions = f.options || [];
        const normalizedOptions = rawOptions.map(o => {
          const valStr = typeof o === 'object' && o !== null ? o.value : o;
          const labelStr = (typeof o === 'object' && o !== null && o.label)
            ? o.label
            : (ENUM_LABELS[valStr] || formatEnumValue(valStr));
          return { value: valStr, label: labelStr };
        });

        // Determine currently selected value (preserve language en/hi compatibility)
        let selectedVal = val;
        if (!selectedVal && normalizedOptions.length > 0) {
          selectedVal = normalizedOptions[0].value;
          state.wizard.formData[f.key] = selectedVal;
        } else if (f.key === 'preferredLanguage') {
          if (selectedVal === 'en') selectedVal = 'English';
          if (selectedVal === 'hi') selectedVal = 'Hindi';
        }

        const currentOpt = normalizedOptions.find(o => o.value === selectedVal) || normalizedOptions[0] || { value: '', label: 'Select option' };

        inputHtml = `
          <div class="custom-select-wrapper" data-field-key="${f.key}">
            <button type="button" class="custom-select-trigger" data-select-trigger="${f.key}" aria-haspopup="listbox" aria-expanded="false">
              <span class="custom-select-label truncate">${currentOpt.label}</span>
              <span class="custom-select-chevron material-symbols-outlined">expand_more</span>
            </button>
            <div class="custom-select-menu" role="listbox">
              <div class="custom-select-options">
                ${normalizedOptions.map(opt => {
                  const isSel = opt.value === selectedVal;
                  return `
                    <div class="custom-select-option ${isSel ? 'is-selected' : ''}" 
                         role="option" 
                         aria-selected="${isSel}" 
                         data-value="${opt.value}" 
                         data-label="${opt.label}">
                      <span class="truncate">${opt.label}</span>
                      ${isSel ? '<span class="material-symbols-outlined text-[17px] text-ashoka-blue checkmark shrink-0">check</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
            <input type="hidden" name="${f.key}" value="${selectedVal}" />
          </div>
        `;
      } else if (f.type === 'textarea') {
        inputHtml = `<textarea name="${f.key}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}" class="w-full p-3 rounded-lg border border-border-strong bg-surface-crisp font-body-md focus:outline-none focus:ring-2 focus:ring-ashoka-blue">${val}</textarea>`;
      } else {
        inputHtml = `<input type="${f.type === 'date' ? 'date' : f.type === 'number' || f.type === 'money' ? 'number' : 'text'}" name="${f.key}" value="${val}" placeholder="${f.placeholder || ''}" class="w-full h-10 px-3 rounded-lg border border-border-strong bg-surface-crisp font-body-md focus:outline-none focus:ring-2 focus:ring-ashoka-blue"/>`;
      }

      fieldWrap.innerHTML = `
        <label class="font-label-sm text-ashoka-blue flex items-center justify-between">
          <span>${f.label} ${isReq ? '<span class="text-saffron-accent font-bold">*</span>' : ''}</span>
          ${f.hint ? `<span class="text-[11px] text-text-muted">${f.hint}</span>` : ''}
        </label>
        ${inputHtml}
      `;
      grid.appendChild(fieldWrap);
    });

    grpDiv.appendChild(grid);
    container.appendChild(grpDiv);
  });
}

function collectStep2Data() {
  const form = document.getElementById('step2-form');
  if (!form) return;
  const formData = new FormData(form);
  for (const [k, v] of formData.entries()) {
    if (v !== '') state.wizard.formData[k] = v;
  }
}

function attachFiles(files) {
  if (!files || files.length === 0) return;
  const currentDocType = document.getElementById('doc-type-input')?.value || 'AUTHORIZATION_LETTER';
  let attachedCount = 0;

  Array.from(files).forEach(file => {
    // Check file size (5MB limit)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast(`"${file.name}" exceeds the 5MB size limit`, 'error');
      return;
    }

    // Infer document type from file name if possible, or fallback to selected type
    let docType = currentDocType;
    const lower = file.name.toLowerCase();
    if (lower.includes('resolution') || lower.includes('sabha')) {
      docType = 'GRAM_SABHA_RESOLUTION';
    } else if (lower.includes('certificate') || lower.includes('cert') || lower.includes('reg')) {
      docType = 'REGISTRATION_CERTIFICATE';
    } else if (lower.includes('audit') || lower.includes('report') || lower.includes('fin')) {
      docType = 'AUDIT_REPORT';
    } else if (lower.includes('order') || lower.includes('nodal') || lower.includes('govt') || lower.includes('id')) {
      docType = 'GOVERNMENT_ID';
    }

    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    state.wizard.documents.push({
      documentType: docType,
      documentId: file.name,
      fileSize: sizeStr
    });
    attachedCount++;
  });

  if (attachedCount > 0) {
    renderStep3Docs();
    toast(attachedCount === 1 ? `Document attached: ${files[0].name}` : `${attachedCount} documents attached`, 'success');
  }
}

let dropzoneInitialized = false;
function initDocumentDropzone() {
  const dropzone = document.getElementById('docs-dropzone');
  const fileInput = document.getElementById('doc-file-input');
  if (!dropzone || dropzoneInitialized) return;
  dropzoneInitialized = true;

  // Click to browse
  dropzone.addEventListener('click', (e) => {
    if (fileInput && e.target !== fileInput) {
      fileInput.click();
    }
  });

  // Drag visual highlight
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('border-ashoka-blue', 'bg-ashoka-blue/10', 'ring-2', 'ring-ashoka-blue/20');
      dropzone.classList.remove('border-border-strong', 'bg-surface-subtle/50');
    });
  });

  ['dragleave', 'dragend'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('border-ashoka-blue', 'bg-ashoka-blue/10', 'ring-2', 'ring-ashoka-blue/20');
      dropzone.classList.add('border-border-strong', 'bg-surface-subtle/50');
    });
  });

  // Drop files
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('border-ashoka-blue', 'bg-ashoka-blue/10', 'ring-2', 'ring-ashoka-blue/20');
    dropzone.classList.add('border-border-strong', 'bg-surface-subtle/50');
    if (e.dataTransfer && e.dataTransfer.files) {
      attachFiles(e.dataTransfer.files);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files) {
        attachFiles(e.target.files);
        e.target.value = '';
      }
    });
  }
}

function renderStep3Docs() {
  initDocumentDropzone();
  const container = document.getElementById('docs-list-container');
  if (!container) return;
  container.innerHTML = '';

  if (state.wizard.documents.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-text-muted text-xs bg-surface-subtle rounded-lg border border-border-hairline">
        No documents attached yet. Drop files in the box above or use the manual reference form below.
      </div>
    `;
    return;
  }

  state.wizard.documents.forEach((doc, idx) => {
    const card = document.createElement('div');
    card.className = 'flex items-center justify-between p-3.5 rounded-xl border border-border-hairline bg-surface-subtle hover:bg-surface-crisp hover:shadow-sm transition-all';
    card.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-ashoka-blue/10 text-ashoka-blue flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-[20px]">description</span>
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="font-label-sm font-bold text-ashoka-blue uppercase text-xs">${DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</span>
            ${doc.fileSize ? `<span class="text-[10px] font-mono-code text-text-muted bg-surface-muted px-2 py-0.5 rounded">${doc.fileSize}</span>` : ''}
          </div>
          <p class="font-mono-code text-xs text-text-secondary truncate max-w-xs sm:max-w-md" title="${doc.documentId}">${doc.documentId || 'FILE-ATTACHMENT'}</p>
        </div>
      </div>
      <button type="button" class="text-error hover:bg-error/10 p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold" onclick="removeDoc(${idx})" title="Remove document">
        <span class="material-symbols-outlined text-[18px]">delete</span>
        <span class="hidden sm:inline text-[11px]">Remove</span>
      </button>
    `;
    container.appendChild(card);
  });
}

function addDoc(type, id) {
  state.wizard.documents.push({ documentType: type, documentId: id || `DOC-${Date.now().toString().slice(-6)}` });
  renderStep3Docs();
  toast('Document reference added', 'success');
}

function removeDoc(idx) {
  state.wizard.documents.splice(idx, 1);
  renderStep3Docs();
  toast('Document removed', 'info');
}

function renderStep4Review() {
  const schema = TYPE_SCHEMAS[state.wizard.type] || {};
  const typeTitle = document.getElementById('review-type-name');
  if (typeTitle) typeTitle.textContent = `${schema.icon || ''} ${schema.name || state.wizard.type}`;

  const summary = document.getElementById('review-fields-summary');
  if (summary) {
    const schemaFields = schema.fields || [];
    const schemaKeys = new Set(schemaFields.map(f => f.key));

    const items = [];
    // Priority 1: Current schema fields that have entered values
    schemaFields.forEach(f => {
      const rawVal = state.wizard.formData[f.key];
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
        items.push({
          label: f.label,
          value: formatEnumValue(rawVal)
        });
      }
    });

    // Priority 2: Any extra entered primitive fields not in schema, excluding documents and objects
    Object.entries(state.wizard.formData).forEach(([k, v]) => {
      if (k === 'documents' || schemaKeys.has(k) || typeof v === 'object' || v === '' || v === null || v === undefined) {
        return;
      }
      items.push({
        label: formatFieldLabel(k, schema),
        value: formatEnumValue(v)
      });
    });

    if (items.length === 0) {
      summary.innerHTML = '<span class="text-text-muted text-sm col-span-2">No details entered yet.</span>';
    } else {
      summary.innerHTML = items.map(item => `
        <div class="flex flex-col p-2.5 rounded-lg bg-surface-subtle border border-border-hairline hover:bg-surface-crisp hover:shadow-xs transition-all">
          <span class="font-label-sm text-text-muted text-[11px] font-semibold tracking-wide">${item.label}</span>
          <span class="font-body-md text-ashoka-blue font-medium truncate mt-0.5" title="${item.value}">${item.value}</span>
        </div>
      `).join('');
    }
  }

  const docsSummary = document.getElementById('review-docs-summary');
  if (docsSummary) {
    docsSummary.innerHTML = state.wizard.documents.map(d => `
      <span class="px-3 py-1 rounded-full bg-surface-container text-ashoka-blue text-[12px] font-semibold border border-border-hairline shadow-xs">
        ${DOC_TYPE_LABELS[d.documentType] || formatEnumValue(d.documentType)}: <span class="font-mono-code font-normal">${d.documentId}</span>
      </span>
    `).join(' ') || '<span class="text-text-muted text-body-sm">No documents attached</span>';
  }
}

async function handleSaveDraft() {
  collectStep2Data();
  const payload = {
    sourceType: state.wizard.type,
    account: {
      phone: state.user?.phone || state.otpPhone || '9876543210',
      email: state.user?.email || null
    },
    source: {
      ...state.wizard.formData,
      organizationName: state.wizard.formData.priName || state.wizard.formData.departmentFullName || state.wizard.formData.companyName || state.wizard.formData.organizationName || 'Source Org'
    },
    documents: state.wizard.documents
  };

  // POST /registration is public per SecurityConfig, but we send the token if we have one
  // so the backend can link the registration to the logged-in user
  const res = await api('POST', '/registration', { body: payload, auth: !!state.token });
  if (res.ok && res.data) {
    state.activeRegistration = res.data;
    state.wizard.draftId = res.data.registrationId;
    toast('Your details have been saved. Proceed to submit for review.', 'success');
    state.wizard.step = 5;
    renderWizardStep();
  } else {
    toast((res.data && res.data.detail) || 'Could not save your details. Please try again.', 'error');
  }
}

function renderStep5Submit() {
  const regId = state.wizard.draftId || state.activeRegistration?.registrationId;
  const regIdDisplay = document.getElementById('submit-gate-reg-id');
  if (regIdDisplay) regIdDisplay.textContent = regId || 'Pending';
}

async function handleSubmitRegistration() {
  const regStatus = state.activeRegistration?.status;
  if ((regStatus && ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(regStatus)) || state.activeSourceAccount) {
    toast("Your application has already been submitted and is under review — here's its current status.", 'info');
    if (state.activeRegistration) renderTrackingScreen(state.activeRegistration);
    return showView('view-tracking');
  }

  const regId = state.wizard.draftId || state.activeRegistration?.registrationId;
  if (!regId) {
    toast('Please save your details first before submitting.', 'error');
    return;
  }

  const res = await api('POST', `/registration/${regId}/submit`);
  if (res.ok && res.data) {
    state.activeRegistration = res.data;
    toast('Successfully Submitted! Your application is now in review.', 'success');
    await renderTrackingScreen(res.data);
    showView('view-tracking');
  } else {
    toast((res.data && res.data.detail) || 'Validation failed. Mandatory fields missing for this source type.', 'error');
  }
}

function populateWizardFromDraft(reg) {
  if (!reg) return;
  state.wizard.type = reg.sourceType;
  state.wizard.bucket = TYPE_SCHEMAS[reg.sourceType]?.bucket || 'GOVT';
  state.wizard.formData = reg.source || {};
  state.wizard.documents = reg.documents || [];
}

/* ---------------- Screen 4: Application Tracking ---------------- */
async function renderTrackingScreen(reg) {
  if (!reg) return;
  const idEl = document.getElementById('tracking-uuid');
  if (idEl) idEl.textContent = `Application No: ${reg.registrationId.slice(0,8)}`;

  const entityEl = document.getElementById('tracking-entity-name');
  if (entityEl) entityEl.textContent = reg.source?.organizationName || reg.source?.priName || reg.source?.companyName || reg.sourceType;

  const dateEl = document.getElementById('tracking-lodged-date');
  if (dateEl) dateEl.textContent = new Date(reg.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Status Badge
  const statusBox = document.getElementById('tracking-status-box');
  const statusIcon = document.getElementById('tracking-status-icon');
  const statusText = document.getElementById('tracking-status-text');
  const statusDesc = document.getElementById('tracking-status-desc');

  const statusMap = {
    DRAFT: { bg: 'bg-surface-container', text: 'text-ashoka-blue', icon: 'edit_note', title: 'Draft Saved', desc: 'Saved locally; click Submit to begin statutory review.' },
    SUBMITTED: { bg: 'bg-status-submitted-bg', text: 'text-status-submitted-text', icon: 'schedule', title: 'Submitted — Awaiting Review', desc: 'Received by National Portal. Awaiting reviewer queue assignment.' },
    UNDER_REVIEW: { bg: 'bg-status-review-bg', text: 'text-status-review-text', icon: 'manage_search', title: 'UNDER REVIEW', desc: 'Assigned to nodal verification officer for desk scrutiny.' },
    ACTION_REQUIRED: { bg: 'bg-status-action-bg', text: 'text-status-action-text', icon: 'report_problem', title: 'ACTION REQUIRED', desc: 'Reviewer flagged deficiencies. Please amend details and resubmit.' },
    APPROVED: { bg: 'bg-status-approved-bg', text: 'text-status-approved-text', icon: 'verified', title: 'Approved ✓', desc: 'Statutory verification complete. Problem submission rights unlocked.' },
    REJECTED: { bg: 'bg-error/10', text: 'text-error', icon: 'cancel', title: 'Application Rejected', desc: reg.rejectionReason || 'Application rejected by reviewer.' }
  };

  const st = statusMap[reg.status] || statusMap.SUBMITTED;
  if (statusBox) statusBox.className = `p-space-md rounded-lg ${st.bg} ${st.text} flex flex-col gap-1 transition-all`;
  if (statusIcon) statusIcon.textContent = st.icon;
  if (statusText) statusText.textContent = st.title;
  if (statusDesc) statusDesc.textContent = st.desc;

  // Action required banner on tracking screen if applicable
  const actionBtn = document.getElementById('tracking-action-btn');
  if (actionBtn) {
    actionBtn.classList.toggle('hidden', reg.status !== 'ACTION_REQUIRED');
  }

  // Timeline History
  await loadTimelineHistory(reg.registrationId);
}

function toggleHistoryItem(index) {
  const detail = document.getElementById(`history-detail-${index}`);
  const arrow = document.getElementById(`history-arrow-${index}`);
  if (!detail) return;
  const isHidden = detail.classList.toggle('hidden');
  if (arrow) {
    arrow.style.transform = isHidden ? '' : 'rotate(180deg)';
  }
}

function copyHistoryEventDetails(index) {
  const h = state.history?.[index];
  const reg = state.activeRegistration;
  if (!h) return;
  const fromLabel = h.fromStatus ? (STATUS_LABELS[h.fromStatus] || h.fromStatus) : null;
  const toLabel = STATUS_LABELS[h.toStatus] || h.toStatus;
  const statusStr = fromLabel ? `${fromLabel} → ${toLabel}` : toLabel;
  const text = `Application ID: ${reg?.registrationId || '—'}
Organization: ${reg?.source?.organizationName || reg?.sourceType || '—'}
Event: ${statusStr}
Date/Time: ${new Date(h.changedAt).toLocaleString('en-IN')}
Actor: ${h.changedByPhone ? `+91 ${h.changedByPhone}` : 'System'}
Note: ${h.comment || 'None'}`;

  navigator.clipboard.writeText(text).then(() => {
    toast('Event record copied to clipboard', 'info');
  }).catch(() => {
    toast('Copied', 'info');
  });
}

function resumeDraftFromHistory() {
  if (state.activeRegistration) {
    populateWizardFromDraft(state.activeRegistration);
    state.wizard.step = 2;
    renderWizardStep();
    showView('view-wizard');
    toast('Draft loaded into wizard', 'info');
  }
}

function openApplicationSnapshotModal() {
  const modal = document.getElementById('application-snapshot-modal');
  const reg = state.activeRegistration;
  if (!modal) return;
  if (!reg) {
    toast('No application details available', 'warn');
    return;
  }

  const titleEl = document.getElementById('snapshot-modal-title');
  const badgeEl = document.getElementById('snapshot-modal-status-badge');
  const regIdEl = document.getElementById('snapshot-modal-reg-id');
  const contentEl = document.getElementById('snapshot-modal-content');

  const orgName = reg.source?.organizationName || reg.source?.priName || reg.source?.departmentFullName || reg.source?.companyName || reg.sourceType || 'Source Organization';
  const status = reg.status || 'SUBMITTED';
  const statusLabel = STATUS_LABELS[status] || status;

  if (titleEl) titleEl.textContent = orgName;
  if (regIdEl) regIdEl.textContent = `Application ID: ${reg.registrationId} · Lodged on ${new Date(reg.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (badgeEl) {
    badgeEl.textContent = statusLabel;
    const isApproved = status === 'APPROVED';
    const isAction = status === 'ACTION_REQUIRED' || status === 'REJECTED';
    badgeEl.className = `text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
      isApproved ? 'bg-status-approved-bg text-status-approved-text' :
      isAction ? 'bg-status-action-bg text-status-action-text' :
      'bg-status-submitted-bg text-status-submitted-text'
    }`;
  }

  // Schema & Fields
  const schema = TYPE_SCHEMAS[reg.sourceType] || {};
  const fields = schema.fields || [];
  const sourceData = reg.source || {};

  const fieldsHtml = fields.length > 0 ? fields.map(f => {
    let rawVal = sourceData[f.key];
    if (rawVal === undefined || rawVal === null || rawVal === '') rawVal = '—';
    if (f.key === 'preferredLanguage') {
      if (rawVal === 'en') rawVal = 'English';
      else if (rawVal === 'hi') rawVal = 'Hindi';
    }
    return `
      <div class="flex flex-col p-3 rounded-lg bg-surface-subtle border border-border-hairline">
        <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">${f.label}</span>
        <span class="text-sm font-medium text-text-primary mt-0.5 break-words">${rawVal}</span>
      </div>
    `;
  }).join('') : Object.entries(sourceData).map(([k, v]) => `
    <div class="flex flex-col p-3 rounded-lg bg-surface-subtle border border-border-hairline">
      <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">${k}</span>
      <span class="text-sm font-medium text-text-primary mt-0.5 break-words">${v || '—'}</span>
    </div>
  `).join('');

  // Documents
  const docs = reg.documents || [];
  const docsHtml = docs.length > 0 ? docs.map(d => `
    <div class="flex items-center justify-between p-3 rounded-lg bg-surface-subtle border border-border-hairline">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-ashoka-blue text-2xl">description</span>
        <div>
          <span class="text-xs font-bold text-ashoka-blue uppercase">${DOC_TYPE_LABELS[d.documentType] || d.documentType}</span>
          <p class="font-mono-code text-xs text-text-secondary">${d.documentId}</p>
        </div>
      </div>
      <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-status-approved-bg text-status-approved-text">Attached File</span>
    </div>
  `).join('') : `
    <div class="p-4 text-center text-text-muted text-xs bg-surface-subtle rounded-lg border border-dashed border-border-strong">
      No attached documents on record.
    </div>
  `;

  if (contentEl) {
    contentEl.innerHTML = `
      <!-- Entity & Overview Card -->
      <div class="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-border-hairline">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <span class="text-3xl">${schema.icon || '🏛️'}</span>
            <div>
              <h4 class="font-bold text-base text-ashoka-blue">${schema.name || reg.sourceType}</h4>
              <p class="text-xs text-text-secondary">${schema.tagline || 'Source Organization Registration'}</p>
            </div>
          </div>
          <span class="text-xs font-mono-code font-bold bg-surface-crisp px-3 py-1 rounded-lg border border-border-hairline text-ashoka-blue">
            Category: ${schema.bucket || 'GOVT'}
          </span>
        </div>
      </div>

      <!-- Data Attributes -->
      <div class="flex flex-col gap-2">
        <h4 class="font-bold text-sm text-ashoka-blue flex items-center gap-2">
          <span class="material-symbols-outlined text-base">badge</span>
          <span>Submitted Registration Details</span>
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${fieldsHtml}
        </div>
      </div>

      <!-- Supporting Documents -->
      <div class="flex flex-col gap-2">
        <h4 class="font-bold text-sm text-ashoka-blue flex items-center gap-2">
          <span class="material-symbols-outlined text-base">attachment</span>
          <span>Attached Documents (${docs.length})</span>
        </h4>
        <div class="flex flex-col gap-2">
          ${docsHtml}
        </div>
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function closeApplicationSnapshotModal() {
  const modal = document.getElementById('application-snapshot-modal');
  if (modal) modal.classList.add('hidden');
}

async function loadTimelineHistory(id) {
  const historyContainer = document.getElementById('tracking-timeline-history');
  if (!historyContainer) return;

  const res = await api('GET', `/registration/${id}/history`);
  let historyList = [];
  if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
    historyList = res.data;
  } else if (state.activeRegistration) {
    // Fallback initial event
    historyList = [{
      fromStatus: null,
      toStatus: state.activeRegistration.status || 'SUBMITTED',
      changedAt: state.activeRegistration.createdAt || Date.now(),
      changedByPhone: null,
      comment: 'Application submitted for KYC review'
    }];
  }

  state.history = historyList;

  const statusIcons = {
    DRAFT: { icon: 'edit_note', bg: 'bg-surface-container', text: 'text-ashoka-blue' },
    SUBMITTED: { icon: 'schedule', bg: 'bg-status-submitted-bg', text: 'text-status-submitted-text' },
    UNDER_REVIEW: { icon: 'manage_search', bg: 'bg-status-review-bg', text: 'text-status-review-text' },
    ACTION_REQUIRED: { icon: 'report_problem', bg: 'bg-status-action-bg', text: 'text-status-action-text' },
    APPROVED: { icon: 'verified', bg: 'bg-status-approved-bg', text: 'text-status-approved-text' },
    REJECTED: { icon: 'cancel', bg: 'bg-error/10', text: 'text-error' }
  };

  historyContainer.innerHTML = historyList.map((h, idx) => {
    const isExpanded = idx === 0;
    const st = statusIcons[h.toStatus] || statusIcons.SUBMITTED;
    const fromLabel = h.fromStatus ? (STATUS_LABELS[h.fromStatus] || h.fromStatus) : null;
    const toLabel = STATUS_LABELS[h.toStatus] || h.toStatus;
    const statusTitle = fromLabel ? `${fromLabel} → ${toLabel}` : toLabel;
    const timeStr = new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDateStr = new Date(h.changedAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const actor = h.changedByPhone ? `+91 ${h.changedByPhone.slice(0,5)} ${h.changedByPhone.slice(5)}` : 'System / Portal Automation';

    return `
      <div class="flex gap-4 items-start relative pb-6 last:pb-0">
        <!-- Connecting Vertical Line -->
        <div class="absolute left-4 top-8 bottom-0 w-0.5 bg-border-hairline -ml-[1px]"></div>

        <!-- Status Circle Icon -->
        <div class="w-8 h-8 rounded-full ${st.bg} ${st.text} flex items-center justify-center shrink-0 z-10 shadow-sm border border-border-hairline">
          <span class="material-symbols-outlined text-[18px]">${st.icon}</span>
        </div>

        <!-- Interactive History Card -->
        <div class="flex flex-col bg-surface-crisp p-4 rounded-xl border border-border-hairline hover:border-ashoka-blue/60 hover:shadow-md transition-all w-full cursor-pointer group" onclick="toggleHistoryItem(${idx})">
          
          <!-- Card Header (Always visible) -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-label-sm font-bold text-ashoka-blue uppercase text-xs sm:text-sm">
                ${statusTitle}
              </span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text} uppercase">
                ${h.toStatus}
              </span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="font-mono-code text-[11px] text-text-muted">
                ${timeStr}
              </span>
              <span id="history-arrow-${idx}" class="material-symbols-outlined text-text-muted group-hover:text-ashoka-blue text-[18px] transition-transform duration-200" style="${isExpanded ? 'transform: rotate(180deg);' : ''}">
                expand_more
              </span>
            </div>
          </div>

          <!-- Comment preview snippet when collapsed -->
          ${h.comment ? `<p class="font-body-sm text-text-secondary mt-1.5 line-clamp-1">${h.comment}</p>` : ''}
          
          <div class="flex items-center justify-between mt-1 text-[10px] text-text-muted font-mono-code">
            <span>Updated by: ${actor}</span>
            <span class="text-ashoka-blue font-semibold group-hover:underline flex items-center gap-0.5">
              <span>Click to view details</span>
            </span>
          </div>

          <!-- Expandable Details Panel -->
          <div id="history-detail-${idx}" class="history-detail-panel ${isExpanded ? '' : 'hidden'} mt-3 pt-3 border-t border-border-hairline flex flex-col gap-3" onclick="event.stopPropagation()">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-surface-subtle p-3 rounded-lg border border-border-hairline">
              <div>
                <span class="text-[10px] text-text-muted uppercase font-bold block">Event Timestamp</span>
                <span class="font-mono-code text-text-primary font-medium">${fullDateStr}</span>
              </div>
              <div>
                <span class="text-[10px] text-text-muted uppercase font-bold block">Triggered By</span>
                <span class="font-medium text-text-primary">${actor}</span>
              </div>
              ${h.fromStatus ? `
              <div class="sm:col-span-2 pt-1 border-t border-border-hairline">
                <span class="text-[10px] text-text-muted uppercase font-bold block">Transition</span>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-2 py-0.5 rounded bg-surface-muted text-text-muted font-bold text-[11px]">${fromLabel}</span>
                  <span class="material-symbols-outlined text-[14px] text-text-muted">arrow_forward</span>
                  <span class="px-2 py-0.5 rounded ${st.bg} ${st.text} font-bold text-[11px]">${toLabel}</span>
                </div>
              </div>` : ''}
            </div>

            ${h.comment ? `
            <div class="p-3 rounded-lg bg-surface-subtle border border-border-hairline flex flex-col gap-0.5">
              <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Remarks / Notes</span>
              <p class="text-xs text-text-secondary leading-relaxed">${h.comment}</p>
            </div>` : ''}

            <!-- Action buttons inside the card -->
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" onclick="openApplicationSnapshotModal()"
                      class="px-3.5 py-1.5 rounded-lg bg-ashoka-blue text-surface-crisp hover:bg-institutional-navy text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm">
                <span class="material-symbols-outlined text-[16px]">visibility</span>
                <span>View Application Details</span>
              </button>
              ${h.toStatus === 'DRAFT' ? `
              <button type="button" onclick="resumeDraftFromHistory()"
                      class="px-3.5 py-1.5 rounded-lg border border-border-strong hover:bg-surface-muted text-ashoka-blue text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">edit</span>
                <span>Resume Draft</span>
              </button>` : ''}
              ${h.toStatus === 'ACTION_REQUIRED' ? `
              <button type="button" onclick="showView('view-deficiency')"
                      class="px-3.5 py-1.5 rounded-lg bg-saffron-accent text-surface-crisp hover:bg-orange-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm">
                <span class="material-symbols-outlined text-[16px]">warning</span>
                <span>Open Deficiency Notice</span>
              </button>` : ''}
              <button type="button" onclick="copyHistoryEventDetails(${idx})"
                      class="px-3 py-1.5 rounded-lg border border-border-hairline hover:bg-surface-muted text-text-secondary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ml-auto">
                <span class="material-symbols-outlined text-[16px]">content_copy</span>
                <span>Copy Event</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    `;
  }).join('');
}

/* ---------------- Screen 5: Deficiency & Resubmission ---------------- */
async function renderDeficiencyScreen(reg) {
  if (!reg) return;
  const commentEl = document.getElementById('deficiency-comment-text');
  if (commentEl) commentEl.textContent = reg.actionRequiredComment || 'Please review and update missing details.';

  const formContainer = document.getElementById('deficiency-fields-container');
  if (!formContainer) return;
  formContainer.innerHTML = '';

  const schema = TYPE_SCHEMAS[reg.sourceType] || {};
  (schema.fields || []).forEach(f => {
    const val = reg.source?.[f.key] || '';
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle border border-border-hairline';
    div.innerHTML = `
      <label class="font-label-sm text-ashoka-blue font-bold">${f.label}</label>
      <input type="text" name="${f.key}" value="${val}" class="w-full h-9 px-3 rounded bg-surface-crisp border border-border-strong text-body-sm focus:outline-none focus:ring-2 focus:ring-ashoka-blue"/>
    `;
    formContainer.appendChild(div);
  });
}

async function handlePatchDeficiency() {
  const regId = state.activeRegistration?.registrationId;
  if (!regId) return;

  const form = document.getElementById('deficiency-form');
  const formData = {};
  if (form) {
    const d = new FormData(form);
    for (const [k, v] of d.entries()) {
      if (v !== '') formData[k] = v;
    }
  }

  const res = await api('PATCH', `/registration/${regId}`, {
    body: { source: formData }
  });

  if (res.ok) {
    toast('Changes saved successfully!', 'success');
  } else {
    toast((res.data && res.data.detail) || 'Failed to save changes', 'error');
  }
}

async function handleResubmit() {
  const regId = state.activeRegistration?.registrationId;
  if (!regId) return;

  // First save any amendments
  await handlePatchDeficiency();

  const res = await api('POST', `/registration/${regId}/submit`);
  if (res.ok && res.data) {
    state.activeRegistration = res.data;
    toast('Your application has been resubmitted. The reviewer will check your changes.', 'success');
    await renderTrackingScreen(res.data);
    showView('view-tracking');
  } else {
    toast((res.data && res.data.detail) || 'Resubmission failed', 'error');
  }
}

/* ---------------- Screen 6: Verification Completed & Problem Submission ---------------- */
function renderCompletedScreen(acc) {
  const nameEl = document.getElementById('completed-org-name');
  if (nameEl) nameEl.textContent = acc?.sourceName || state.activeRegistration?.source?.organizationName || 'Gram Panchayat / Entity';

  const accIdEl = document.getElementById('completed-acc-id');
  if (accIdEl) accIdEl.textContent = acc?.sourceAccountId || 'ACTIVE';

  loadProblemDomains();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------------- Problem Filing Screen (Fix 2) ---------------- */
async function renderProblemFilingScreen() {
  const isVerified = Boolean(state.activeSourceAccount) || state.user?.kycStatus === 'VERIFIED';
  const lockedEl = document.getElementById('problem-form-locked');
  const containerEl = document.getElementById('problem-form-container');

  if (!isVerified) {
    if (lockedEl) lockedEl.classList.remove('hidden');
    if (containerEl) containerEl.classList.add('hidden');
    const statusTxt = document.getElementById('locked-kyc-status-text');
    if (statusTxt) {
      const st = state.activeRegistration?.status || state.user?.kycStatus || 'UNVERIFIED';
      statusTxt.textContent = `KYC Status: ${st.replace(/_/g, ' ')}`;
    }
    return;
  }

  if (lockedEl) lockedEl.classList.add('hidden');
  if (containerEl) containerEl.classList.remove('hidden');

  // Display verified organisation name
  const orgNameEl = document.getElementById('form-verified-org-name');
  if (orgNameEl) {
    orgNameEl.textContent = state.activeSourceAccount?.displayName || state.activeSourceAccount?.sourceName || state.activeRegistration?.source?.organizationName || 'Verified Source';
  }

  // Load Domains taxonomy
  await loadProblemDomainsForFiling();
  
  // Auto-fill location if not already filled
  fillDefaultLocation();

  // Load Universities list for Access Rule
  await loadUniversitiesForFiling();

  // Ensure default access rule card is marked
  if (!state.activeAccessRule) {
    handleAccessRuleChange('OPEN_TO_ALL');
  }
}

async function loadProblemDomainsForFiling() {
  if (!state.domains || state.domains.length === 0) {
    const res = await api('GET', '/domains');
    if (res.ok && Array.isArray(res.data)) {
      state.domains = res.data;
    }
  }

  const container = document.getElementById('pf-domains-container');
  if (!container) return;

  if (!state.domains || state.domains.length === 0) {
    container.innerHTML = '<span class="text-xs text-text-muted">No domains available.</span>';
    return;
  }

  container.innerHTML = state.domains.map(d => {
    const isSelected = state.selectedDomainIds && state.selectedDomainIds.includes(d.domainId);
    const activeStyle = 'bg-ashoka-blue text-surface-crisp border-ashoka-blue shadow-sm';
    const inactiveStyle = 'bg-surface-subtle text-text-secondary border-border-hairline hover:border-ashoka-blue hover:text-ashoka-blue';
    return `
      <button type="button" onclick="toggleDomainSelection('${d.domainId}')"
              class="domain-tag-btn px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${isSelected ? activeStyle : inactiveStyle}">
        <span class="material-symbols-outlined text-[14px]">${isSelected ? 'check' : 'add'}</span>
        <span>${escapeHtml(d.domainName)}</span>
      </button>
    `;
  }).join('');

  const countEl = document.getElementById('pf-domains-selected-count');
  if (countEl) countEl.textContent = `${state.selectedDomainIds ? state.selectedDomainIds.length : 0} selected`;
}

function toggleDomainSelection(domainId) {
  if (!state.selectedDomainIds) state.selectedDomainIds = [];
  const idx = state.selectedDomainIds.indexOf(domainId);
  if (idx >= 0) {
    state.selectedDomainIds.splice(idx, 1);
  } else {
    state.selectedDomainIds.push(domainId);
  }
  loadProblemDomainsForFiling();
}

async function loadUniversitiesForFiling() {
  if (!state.availableUniversities || state.availableUniversities.length === 0) {
    const res = await api('GET', '/problems/universities');
    if (res.ok && Array.isArray(res.data)) {
      state.availableUniversities = res.data;
    }
  }
  renderUniversityListBox('');
}

function filterUniversitiesList(query) {
  renderUniversityListBox(query);
}

function renderUniversityListBox(query = '') {
  const box = document.getElementById('pf-univ-list-box');
  if (!box) return;

  const universities = state.availableUniversities || [];
  const filtered = query.trim()
    ? universities.filter(u => u.toLowerCase().includes(query.trim().toLowerCase()))
    : universities;

  if (filtered.length === 0) {
    box.innerHTML = '<span class="p-3 text-xs text-text-muted block text-center">No matching universities found</span>';
    return;
  }

  box.innerHTML = filtered.map(u => {
    const isSelected = state.selectedUniversities && state.selectedUniversities.includes(u);
    return `
      <div onclick="selectUniversity('${escapeHtml(u)}')" class="px-3.5 py-2 text-xs flex items-center justify-between hover:bg-surface-muted cursor-pointer transition-colors ${isSelected ? 'bg-surface-container font-bold text-ashoka-blue' : 'text-text-primary'}">
        <span>${escapeHtml(u)}</span>
        <span class="material-symbols-outlined text-[16px] text-ashoka-blue">${isSelected ? 'check' : 'add'}</span>
      </div>
    `;
  }).join('');
}

function selectUniversity(univName) {
  if (!state.selectedUniversities) state.selectedUniversities = [];
  if (!state.selectedUniversities.includes(univName)) {
    state.selectedUniversities.push(univName);
    renderSelectedUniversityChips();
    renderUniversityListBox(document.getElementById('pf-univ-search')?.value || '');
    const errEl = document.getElementById('pf-univ-error-msg');
    if (errEl) errEl.classList.add('hidden');
  }
}

function removeSelectedUniversity(univName) {
  if (!state.selectedUniversities) return;
  state.selectedUniversities = state.selectedUniversities.filter(u => u !== univName);
  renderSelectedUniversityChips();
  renderUniversityListBox(document.getElementById('pf-univ-search')?.value || '');
}

function renderSelectedUniversityChips() {
  const chipsContainer = document.getElementById('pf-selected-univ-chips');
  const countBadge = document.getElementById('selected-univ-count-badge');
  const count = state.selectedUniversities ? state.selectedUniversities.length : 0;
  if (countBadge) countBadge.textContent = `${count} selected`;

  if (!chipsContainer) return;

  if (!state.selectedUniversities || state.selectedUniversities.length === 0) {
    chipsContainer.innerHTML = '<span class="text-xs text-text-muted italic" id="pf-no-univ-selected-msg">No universities selected yet. Click from the list below to add.</span>';
    return;
  }

  chipsContainer.innerHTML = state.selectedUniversities.map(u => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-ashoka-blue font-bold text-xs border border-ashoka-blue/30">
      <span>${escapeHtml(u)}</span>
      <button type="button" onclick="removeSelectedUniversity('${escapeHtml(u)}')" class="hover:text-error cursor-pointer">
        <span class="material-symbols-outlined text-[14px]">close</span>
      </button>
    </span>
  `).join('');
}

function handleAccessRuleChange(rule) {
  state.activeAccessRule = rule;

  // Update card styles
  document.querySelectorAll('.access-rule-card').forEach(card => {
    const cardRule = card.dataset.rule;
    const isSelected = cardRule === rule;
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = isSelected;

    if (isSelected) {
      card.className = 'access-rule-card relative flex flex-col p-4 rounded-xl border-2 border-ashoka-blue bg-surface-container-low cursor-pointer transition-all shadow-sm';
    } else {
      card.className = 'access-rule-card relative flex flex-col p-4 rounded-xl border border-border-hairline bg-surface-crisp hover:bg-surface-subtle cursor-pointer transition-all';
    }
  });

  const selectedContainer = document.getElementById('pf-selected-universities-container');
  const autoWarning = document.getElementById('pf-auto-universities-warning');

  if (selectedContainer) {
    selectedContainer.classList.toggle('hidden', rule !== 'SELECTED_UNIVERSITIES');
    if (rule === 'SELECTED_UNIVERSITIES') {
      renderSelectedUniversityChips();
      renderUniversityListBox('');
    }
  }

  if (autoWarning) {
    autoWarning.classList.toggle('hidden', rule !== 'AUTO_SELECTED_UNIVERSITIES');
  }
}

function fillDefaultLocation() {
  const stateInput = document.getElementById('pf-state');
  const distInput = document.getElementById('pf-district');
  const latInput = document.getElementById('pf-latitude');
  const lngInput = document.getElementById('pf-longitude');
  const blockInput = document.getElementById('pf-block');
  const villageInput = document.getElementById('pf-village');
  const pincodeInput = document.getElementById('pf-pincode');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latInput && !latInput.value) latInput.value = pos.coords.latitude.toFixed(6);
        if (lngInput && !lngInput.value) lngInput.value = pos.coords.longitude.toFixed(6);
        toast('Detected device GPS coordinates!', 'success');
      },
      () => {
        toast('Could not detect location. Please enter manually.', 'warning');
      }
    );
  } else {
    toast('Geolocation is not supported by this browser.', 'error');
  }
}

async function handlePostProblem() {
  const isVerified = Boolean(state.activeSourceAccount) || state.user?.kycStatus === 'VERIFIED';
  if (!isVerified || !state.activeSourceAccount?.sourceAccountId) {
    toast('Only verified submitters with an active source account can file problems.', 'error');
    return;
  }

  const title = document.getElementById('pf-title')?.value.trim();
  const desc = document.getElementById('pf-description')?.value.trim();
  const urgency = document.getElementById('pf-urgency')?.value;
  const severity = document.getElementById('pf-severity')?.value;
  const affectedPop = document.getElementById('pf-affected-population')?.value;
  const expectedOutcome = document.getElementById('pf-expected-outcome')?.value.trim();
  const existingIntervention = document.getElementById('pf-existing-intervention')?.value.trim();

  // Location inputs
  const stateVal = document.getElementById('pf-state')?.value.trim();
  const districtVal = document.getElementById('pf-district')?.value.trim();
  const blockVal = document.getElementById('pf-block')?.value.trim();
  const villageVal = document.getElementById('pf-village')?.value.trim();
  const pincodeVal = document.getElementById('pf-pincode')?.value.trim();
  const latVal = document.getElementById('pf-latitude')?.value;
  const lngVal = document.getElementById('pf-longitude')?.value;
  const landmarkVal = document.getElementById('pf-landmark')?.value.trim();
  const lgdVal = document.getElementById('pf-lgd-code')?.value.trim();

  if (!title || !desc || !urgency || !severity || !affectedPop || !expectedOutcome || !stateVal || !districtVal || !latVal || !lngVal) {
    toast('Please fill in all mandatory problem details (*).', 'error');
    return;
  }

  const accessRule = state.activeAccessRule || 'OPEN_TO_ALL';

  // Fix 2: Client-side block if SELECTED_UNIVERSITIES has 0 universities selected
  if (accessRule === 'SELECTED_UNIVERSITIES') {
    if (!state.selectedUniversities || state.selectedUniversities.length === 0) {
      const errEl = document.getElementById('pf-univ-error-msg');
      if (errEl) errEl.classList.remove('hidden');
      toast('Please select at least one university for SELECTED_UNIVERSITIES access rule.', 'error');
      document.getElementById('pf-univ-search')?.focus();
      return;
    }
  }

  const submitBtn = document.getElementById('pf-submit-btn');
  const btnText = document.getElementById('pf-submit-btn-text');
  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = 'Lodging Problem...';

  const payload = {
    title,
    description: desc,
    urgency,
    severity,
    affectedPopulation: parseInt(affectedPop, 10),
    expectedOutcome,
    existingIntervention: existingIntervention || null,
    sourceAccountId: state.activeSourceAccount.sourceAccountId,
    location: {
      state: stateVal,
      district: districtVal,
      blockTehsil: blockVal || null,
      villageWard: villageVal || null,
      pincode: pincodeVal || null,
      latitude: parseFloat(latVal),
      longitude: parseFloat(lngVal),
      landmark: landmarkVal || null,
      lgdCode: lgdVal || null
    },
    domainIds: state.selectedDomainIds && state.selectedDomainIds.length > 0 ? state.selectedDomainIds : null,
    accessRule: accessRule,
    accessUniversities: accessRule === 'SELECTED_UNIVERSITIES' ? state.selectedUniversities : null
  };

  const res = await api('POST', '/problems', { body: payload });

  if (submitBtn) submitBtn.disabled = false;
  if (btnText) btnText.textContent = 'Submit Problem Statement to National Repository';

  if (!res.ok || !res.data) {
    const errorMsg = (res.data && (res.data.detail || res.data.message)) || 'Submission failed. Please verify all inputs.';
    toast(errorMsg, 'error');
    return;
  }

  const createdProblem = res.data;
  toast('Problem statement lodged successfully!', 'success');

  // Handle optional initial evidence file upload
  const fileInput = document.getElementById('pf-evidence-file');
  const evidenceType = document.getElementById('pf-evidence-type')?.value || 'DOCUMENT';
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    fd.append('evidenceType', evidenceType);
    await api('POST', `/problems/${createdProblem.problemId}/evidence`, { body: fd });
  }

  // Reset form
  document.getElementById('problem-filing-form')?.reset();
  state.selectedDomainIds = [];
  state.selectedUniversities = [];
  loadProblemDomainsForFiling();
  renderSelectedUniversityChips();

  // Show celebratory success modal
  const successModal = document.getElementById('problem-success-modal');
  const idEl = document.getElementById('success-problem-id');
  const ruleEl = document.getElementById('success-access-rule');
  if (idEl) idEl.textContent = createdProblem.problemId;
  if (ruleEl) ruleEl.textContent = createdProblem.accessRule || accessRule;
  if (successModal) successModal.classList.remove('hidden');

  // Update problems list in background
  loadMyProblems();
}

/* ---------------- My Problems Screen (Fix 3) ---------------- */
async function loadMyProblems() {
  const container = document.getElementById('my-problems-list-container');
  if (!container) return;

  const res = await api('GET', '/problems');
  if (!res.ok || !Array.isArray(res.data)) {
    container.innerHTML = `
      <div class="p-8 text-center text-xs text-error border border-error/20 bg-rose-50 rounded-xl">
        Failed to load filed problems. Please check your network connection.
      </div>
    `;
    return;
  }

  state.myProblems = res.data;

  // Update nav badge count
  const navBadge = document.getElementById('nav-my-problems-count');
  if (navBadge) {
    navBadge.textContent = state.myProblems.length;
    navBadge.classList.toggle('hidden', state.myProblems.length === 0);
  }

  // Compute KPI counts
  let verifying = 0;
  let registered = 0;
  let rejected = 0;

  state.myProblems.forEach(p => {
    if (['SUBMITTED', 'SOURCE_VERIFYING'].includes(p.status)) verifying++;
    else if (['SOURCE_VERIFIED', 'REGISTERED'].includes(p.status)) registered++;
    else if (['REJECTED', 'ARCHIVED'].includes(p.status)) rejected++;
  });

  const totalEl = document.getElementById('stat-problems-total');
  const verifyingEl = document.getElementById('stat-problems-verifying');
  const registeredEl = document.getElementById('stat-problems-registered');
  const rejectedEl = document.getElementById('stat-problems-rejected');

  if (totalEl) totalEl.textContent = state.myProblems.length;
  if (verifyingEl) verifyingEl.textContent = verifying;
  if (registeredEl) registeredEl.textContent = registered;
  if (rejectedEl) rejectedEl.textContent = rejected;

  renderProblemsList(state.myProblems);
}

function handleFilterProblemsList() {
  if (!state.myProblems) return;
  const search = document.getElementById('my-problems-search-input')?.value.trim().toLowerCase() || '';
  const statusFilter = document.getElementById('my-problems-status-filter')?.value || 'ALL';

  const filtered = state.myProblems.filter(p => {
    const matchesSearch = !search || p.title?.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  renderProblemsList(filtered);
}

function getProblemStatusBadge(status) {
  switch (status) {
    case 'SUBMITTED':
      return {
        bg: 'bg-amber-50 text-amber-800 border border-amber-300',
        icon: 'check_circle',
        label: 'SUBMITTED'
      };
    case 'SOURCE_VERIFYING':
      return {
        bg: 'bg-blue-50 text-blue-800 border border-blue-300',
        icon: 'hourglass_empty',
        label: 'SOURCE_VERIFYING'
      };
    case 'SOURCE_VERIFIED':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
        icon: 'verified',
        label: 'SOURCE_VERIFIED'
      };
    case 'REGISTERED':
      return {
        bg: 'bg-indigo-50 text-indigo-800 border border-indigo-300',
        icon: 'menu_book',
        label: 'REGISTERED'
      };
    case 'REJECTED':
      return {
        bg: 'bg-rose-50 text-rose-800 border border-rose-300',
        icon: 'cancel',
        label: 'REJECTED'
      };
    case 'ARCHIVED':
      return {
        bg: 'bg-slate-100 text-slate-700 border border-slate-300',
        icon: 'archive',
        label: 'ARCHIVED'
      };
    default:
      return {
        bg: 'bg-surface-muted text-text-secondary border border-border-hairline',
        icon: 'help',
        label: status || 'UNKNOWN'
      };
  }
}

function renderProblemsList(problems) {
  const container = document.getElementById('my-problems-list-container');
  if (!container) return;

  if (!problems || problems.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-text-muted border border-dashed border-border-strong rounded-xl bg-surface-crisp flex flex-col items-center">
        <span class="material-symbols-outlined text-4xl text-text-muted mb-2">inbox</span>
        <h3 class="font-bold text-base text-ashoka-blue mb-1">No Problem Statements Found</h3>
        <p class="text-xs text-text-secondary max-w-sm mb-4">No problems match your filter or you have not yet filed any problem statements.</p>
        <button type="button" onclick="goToFileProblem()" class="px-5 py-2.5 rounded-lg bg-ashoka-blue text-surface-crisp font-bold text-xs flex items-center gap-1.5 cursor-pointer">
          <span class="material-symbols-outlined text-[16px]">add_circle</span>
          <span>File a Problem Now</span>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = problems.map(p => {
    const badge = getProblemStatusBadge(p.status);
    const dateStr = p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';

    const accessScopeLabel = p.accessRule === 'SELECTED_UNIVERSITIES'
      ? `${(p.accessUniversities && p.accessUniversities.length) || 0} Universities Whitelisted`
      : p.accessRule === 'AUTO_SELECTED_UNIVERSITIES'
      ? 'AI Matched Universities'
      : p.accessRule === 'UNIVERSITY_ONLY'
      ? 'Universities Only'
      : 'Open to All';

    return `
      <div class="p-5 sm:p-6 bg-surface-crisp rounded-xl border border-border-hairline shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${badge.bg}">
              <span class="material-symbols-outlined text-[15px]">${badge.icon}</span>
              <span>${badge.label}</span>
            </span>
            <span class="text-xs text-text-muted font-mono-code">ID: ${p.problemId.slice(0, 8)}...</span>
            <span class="text-xs text-text-muted">·</span>
            <span class="text-xs text-text-muted">Filed: ${dateStr}</span>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" onclick="openProblemDetailModal('${p.problemId}')"
                    class="px-4 py-2 rounded-lg bg-surface-subtle hover:bg-surface-container text-ashoka-blue font-bold text-xs border border-border-hairline flex items-center gap-1.5 transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">visibility</span>
              <span>View Details &amp; Evidence</span>
            </button>
          </div>
        </div>

        <div>
          <h3 class="font-bold text-base text-ashoka-blue mb-1">${escapeHtml(p.title)}</h3>
          <p class="text-xs text-text-secondary line-clamp-2 leading-relaxed">${escapeHtml(p.description || '')}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-border-hairline text-xs">
          <span class="px-2.5 py-1 rounded bg-surface-muted text-text-secondary font-medium flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">speed</span>
            <span>Urgency: <strong>${p.urgency || '—'}</strong></span>
          </span>
          <span class="px-2.5 py-1 rounded bg-surface-muted text-text-secondary font-medium flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">report</span>
            <span>Severity: <strong>${p.severity || '—'}</strong></span>
          </span>
          <span class="px-2.5 py-1 rounded bg-surface-muted text-text-secondary font-medium flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">groups</span>
            <span>Impact: <strong>${p.affectedPopulation ? p.affectedPopulation.toLocaleString('en-IN') : '—'} citizens</strong></span>
          </span>
          <span class="px-2.5 py-1 rounded bg-surface-container text-ashoka-blue font-medium flex items-center gap-1 ml-auto">
            <span class="material-symbols-outlined text-[14px]">shield</span>
            <span>${accessScopeLabel}</span>
          </span>
        </div>

      </div>
    `;
  }).join('');
}

async function openProblemDetailModal(problemId) {
  let problem = state.myProblems?.find(p => p.problemId === problemId);
  if (!problem) {
    const res = await api('GET', `/problems/${problemId}`);
    if (res.ok && res.data) {
      problem = res.data;
    }
  }

  if (!problem) {
    toast('Could not find problem details.', 'error');
    return;
  }

  state.activeModalProblemId = problemId;

  // Header info
  const titleEl = document.getElementById('detail-modal-title');
  const badgeEl = document.getElementById('detail-modal-status-badge');
  const idEl = document.getElementById('detail-modal-problem-id');
  const dateEl = document.getElementById('detail-modal-submitted-at');

  if (titleEl) titleEl.textContent = problem.title;
  if (idEl) idEl.textContent = `ID: ${problem.problemId}`;
  if (dateEl) {
    dateEl.textContent = problem.submittedAt ? `Filed: ${new Date(problem.submittedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })}` : 'Filed: —';
  }

  const badge = getProblemStatusBadge(problem.status);
  if (badgeEl) {
    badgeEl.className = `text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${badge.bg}`;
    badgeEl.textContent = badge.label;
  }

  // Lifecycle Steps: SUBMITTED -> SOURCE_VERIFYING -> SOURCE_VERIFIED -> REGISTERED
  const stepSubmitted = document.getElementById('step-submitted');
  const stepVerifying = document.getElementById('step-verifying');
  const stepVerified = document.getElementById('step-verified');
  const stepRegistered = document.getElementById('step-registered');
  const terminalAlert = document.getElementById('detail-modal-terminal-alert');

  const activeBox = 'step-box p-2 rounded-lg bg-surface-container border border-ashoka-blue flex flex-col items-center shadow-xs';
  const doneBox = 'step-box p-2 rounded-lg bg-status-approved-bg border border-status-approved-border flex flex-col items-center';
  const pendingBox = 'step-box p-2 rounded-lg bg-surface-crisp border border-border-hairline flex flex-col items-center opacity-60';

  if (stepSubmitted) stepSubmitted.className = doneBox;
  if (stepVerifying) stepVerifying.className = pendingBox;
  if (stepVerified) stepVerified.className = pendingBox;
  if (stepRegistered) stepRegistered.className = pendingBox;
  if (terminalAlert) terminalAlert.classList.add('hidden');

  if (problem.status === 'SOURCE_VERIFYING') {
    if (stepVerifying) stepVerifying.className = activeBox;
  } else if (problem.status === 'SOURCE_VERIFIED') {
    if (stepVerifying) stepVerifying.className = doneBox;
    if (stepVerified) stepVerified.className = activeBox;
  } else if (problem.status === 'REGISTERED') {
    if (stepVerifying) stepVerifying.className = doneBox;
    if (stepVerified) stepVerified.className = doneBox;
    if (stepRegistered) stepRegistered.className = doneBox;
  } else if (problem.status === 'REJECTED' || problem.status === 'ARCHIVED') {
    if (terminalAlert) {
      terminalAlert.textContent = `Current Problem Lifecycle Status: ${problem.status}. Official review is complete.`;
      terminalAlert.classList.remove('hidden');
    }
  }

  // Detail content
  const descEl = document.getElementById('detail-modal-description');
  const outcomeEl = document.getElementById('detail-modal-outcome');
  const interventionEl = document.getElementById('detail-modal-intervention');
  const urgencyEl = document.getElementById('detail-modal-urgency');
  const severityEl = document.getElementById('detail-modal-severity');
  const popEl = document.getElementById('detail-modal-population');
  const bucketEl = document.getElementById('detail-modal-bucket');
  const accessRuleEl = document.getElementById('detail-modal-access-rule');

  if (descEl) descEl.textContent = problem.description || '—';
  if (outcomeEl) outcomeEl.textContent = problem.expectedOutcome || '—';
  if (interventionEl) interventionEl.textContent = problem.existingIntervention || 'None specified';
  if (urgencyEl) urgencyEl.textContent = problem.urgency || '—';
  if (severityEl) severityEl.textContent = problem.severity || '—';
  if (popEl) popEl.textContent = problem.affectedPopulation ? problem.affectedPopulation.toLocaleString('en-IN') : '—';
  if (bucketEl) bucketEl.textContent = problem.sourceBucket || '—';
  if (accessRuleEl) accessRuleEl.textContent = problem.accessRule || 'OPEN_TO_ALL';

  const univWrap = document.getElementById('detail-modal-universities-wrap');
  const univList = document.getElementById('detail-modal-universities-list');
  if (problem.accessRule === 'SELECTED_UNIVERSITIES' && Array.isArray(problem.accessUniversities) && problem.accessUniversities.length > 0) {
    if (univWrap) univWrap.classList.remove('hidden');
    if (univList) {
      univList.innerHTML = problem.accessUniversities.map(u => `
        <span class="px-2 py-0.5 rounded bg-surface-container text-ashoka-blue text-[11px] font-bold border border-ashoka-blue/20">
          ${escapeHtml(u)}
        </span>
      `).join('');
    }
  } else {
    if (univWrap) univWrap.classList.add('hidden');
  }

  // Load Evidence list
  await loadProblemModalEvidence(problemId);

  // Show modal
  const modal = document.getElementById('problem-detail-modal');
  if (modal) modal.classList.remove('hidden');
}

async function loadProblemModalEvidence(problemId) {
  const evidenceListEl = document.getElementById('detail-modal-evidence-list');
  const countEl = document.getElementById('detail-modal-evidence-count');
  if (!evidenceListEl) return;

  const res = await api('GET', `/problems/${problemId}/evidence`);
  const evidenceItems = (res.ok && Array.isArray(res.data)) ? res.data : [];

  if (countEl) countEl.textContent = `${evidenceItems.length} files`;

  if (evidenceItems.length === 0) {
    evidenceListEl.innerHTML = `
      <div class="p-4 text-center text-xs text-text-muted bg-surface-subtle rounded-lg border border-dashed border-border-hairline">
        No evidence files attached to this problem yet.
      </div>
    `;
    return;
  }

  evidenceListEl.innerHTML = evidenceItems.map(ev => {
    const type = ev.evidenceType || 'DOCUMENT';
    const uploadTime = ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';
    const fileName = ev.fileUrl ? ev.fileUrl.split('/').pop() : 'Evidence File';

    return `
      <div class="p-3 bg-surface-subtle rounded-lg border border-border-hairline flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <span class="material-symbols-outlined text-ashoka-blue text-lg shrink-0">attach_file</span>
          <div class="flex flex-col truncate">
            <span class="font-bold text-ashoka-blue truncate">${escapeHtml(fileName)}</span>
            <span class="text-[10px] text-text-muted font-mono-code">${uploadTime}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="px-2 py-0.5 rounded bg-surface-muted text-text-secondary font-mono-code text-[10px] font-bold uppercase">
            ${type}
          </span>
          ${ev.fileUrl ? `
            <a href="${ev.fileUrl}" target="_blank" rel="noopener noreferrer" class="p-1 rounded hover:bg-surface-container text-ashoka-blue cursor-pointer">
              <span class="material-symbols-outlined text-base">download</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function handleAddProblemEvidence() {
  const problemId = state.activeModalProblemId;
  if (!problemId) {
    toast('No active problem selected to attach evidence.', 'error');
    return;
  }

  const fileInput = document.getElementById('detail-evidence-file');
  const typeSelect = document.getElementById('detail-evidence-type');
  const uploadBtn = document.getElementById('detail-evidence-upload-btn');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    toast('Please select a file to upload.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const evidenceType = typeSelect?.value || 'DOCUMENT';

  if (uploadBtn) uploadBtn.disabled = true;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('evidenceType', evidenceType);

  const res = await api('POST', `/problems/${problemId}/evidence`, { body: fd });

  if (uploadBtn) uploadBtn.disabled = false;

  if (res.ok) {
    toast('Evidence attached successfully!', 'success');
    fileInput.value = '';
    await loadProblemModalEvidence(problemId);
  } else {
    toast((res.data && res.data.detail) || 'Failed to upload evidence file.', 'error');
  }
}

function closeProblemDetailModal() {
  const modal = document.getElementById('problem-detail-modal');
  if (modal) modal.classList.add('hidden');
}

function closeProblemSuccessModal() {
  const modal = document.getElementById('problem-success-modal');
  if (modal) modal.classList.add('hidden');
}

function copyModalProblemId() {
  if (state.activeModalProblemId) {
    navigator.clipboard?.writeText(state.activeModalProblemId);
    toast('Problem ID copied to clipboard!', 'info');
  }
}

function copySuccessProblemId() {
  const id = document.getElementById('success-problem-id')?.textContent;
  if (id && id !== '—') {
    navigator.clipboard?.writeText(id);
    toast('Problem ID copied to clipboard!', 'info');
  }
}

/* ---------------- Profile Dropdown ---------------- */
function toggleProfileDropdown() {
  const dd = document.getElementById('profile-dropdown');
  const arrow = document.getElementById('header-dropdown-arrow');
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  if (!isOpen) {
    dd.classList.remove('hidden');
    void dd.offsetWidth; // force reflow for CSS transition
    dd.classList.add('open');
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  } else {
    dd.classList.remove('open');
    if (arrow) arrow.style.transform = '';
    setTimeout(() => {
      if (!dd.classList.contains('open')) dd.classList.add('hidden');
    }, 220);
  }
}

function closeProfileDropdown() {
  const dd = document.getElementById('profile-dropdown');
  const arrow = document.getElementById('header-dropdown-arrow');
  if (dd && dd.classList.contains('open')) {
    dd.classList.remove('open');
    if (arrow) arrow.style.transform = '';
    setTimeout(() => {
      if (!dd.classList.contains('open')) dd.classList.add('hidden');
    }, 220);
  }
}

/* ---------------- Header & Avatar ---------------- */
function updateHeaderUser() {
  const userRole = document.getElementById('header-user-role');
  const userPhone = document.getElementById('header-user-phone');
  const userKyc = document.getElementById('header-user-kyc');
  const avatarEl = document.getElementById('header-avatar-initials');
  const ddName = document.getElementById('dropdown-user-name');
  const ddPhone = document.getElementById('dropdown-user-phone');

  if (state.token && state.user) {
    const phone = state.user.phone || state.otpPhone || '';
    const role = state.user.role === 'SUBMITTER' ? 'Problem Submitter' : state.user.role;
    const kycStatus = state.user.kycStatus || 'UNVERIFIED';
    const kycStatusDisplay = kycStatus === 'UNVERIFIED' ? 'Pending Verification' : kycStatus;
    const isVerified = kycStatus === 'VERIFIED';

    if (userRole) userRole.textContent = role;
    if (userPhone) userPhone.textContent = phone ? `+91 ${phone.slice(0,5)} ${phone.slice(5)}` : 'Logged In';

    // Avatar initials from phone
    if (avatarEl) {
      avatarEl.innerHTML = phone ? `<span class="text-sm font-bold">${phone.slice(-2)}</span>` : '<span class="material-symbols-outlined text-[16px]">person</span>';
    }

    if (userKyc) {
      userKyc.textContent = isVerified ? '✓ Verified' : 'Unverified';
      userKyc.className = `text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
        isVerified
          ? 'bg-status-approved-bg text-status-approved-text'
          : 'bg-status-action-bg text-status-action-text'
      }`;
    }

    // Dropdown info
    if (ddName) ddName.textContent = state.activeSourceAccount?.displayName || `Submitter (${phone.slice(-4)})`;
    if (ddPhone) ddPhone.textContent = `+91 ${phone}`;
  } else {
    if (userRole) userRole.textContent = 'Guest';
    if (userPhone) userPhone.textContent = 'Not Logged In';
    if (userKyc) userKyc.className = 'hidden';
    if (avatarEl) avatarEl.innerHTML = '<span class="material-symbols-outlined text-[16px]">person</span>';
    if (ddName) ddName.textContent = 'Guest User';
    if (ddPhone) ddPhone.textContent = 'Not logged in';
  }
}

/* ---------------- Profile Page Rendering ---------------- */
function renderProfilePage() {
  const user = state.user;
  if (!user) return;

  const phone = user.phone || state.otpPhone || '—';
  const kycStatus = user.kycStatus || 'UNVERIFIED';
  const kycStatusDisplay = kycStatus === 'UNVERIFIED' ? 'Pending Verification' : kycStatus;
  const isVerified = kycStatus === 'VERIFIED';

  // Header
  const displayName = state.activeSourceAccount?.displayName || (phone !== '—' ? `Submitter (${phone.slice(-4)})` : 'Submitter');
  const avatarLarge = document.getElementById('profile-avatar-large');
  if (avatarLarge) avatarLarge.innerHTML = phone !== '—' ? `<span class="text-3xl font-bold">${phone.slice(-2)}</span>` : '<span class="material-symbols-outlined text-4xl">person</span>';

  const nameEl = document.getElementById('profile-display-name');
  if (nameEl) nameEl.textContent = displayName;

  const roleLabel = document.getElementById('profile-role-label');
  if (roleLabel) roleLabel.textContent = isVerified ? 'Verified Source Organization Submitter' : 'Source Organization Submitter — KYC Pending';

  const kycBadge = document.getElementById('profile-kyc-badge');
  if (kycBadge) {
    kycBadge.textContent = kycStatusDisplay;
    kycBadge.className = `text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${isVerified ? 'bg-status-approved-bg text-status-approved-text' : 'bg-status-action-bg text-status-action-text'}`;
  }

  const phoneBadge = document.getElementById('profile-phone-badge');
  if (phoneBadge) phoneBadge.textContent = `+91 ${phone}`;

  // Account fields
  const userId = document.getElementById('profile-user-id');
  if (userId) userId.textContent = user.userId || '—';

  const phoneEl = document.getElementById('profile-phone');
  if (phoneEl) phoneEl.textContent = `+91 ${phone}`;

  const emailEl = document.getElementById('profile-email');
  if (emailEl) emailEl.textContent = user.email || 'Not provided';

  const roleEl = document.getElementById('profile-role');
  if (roleEl) roleEl.textContent = user.role || 'SUBMITTER';

  const kycStatusEl = document.getElementById('profile-kyc-status');
  if (kycStatusEl) {
    kycStatusEl.textContent = kycStatusDisplay;
    kycStatusEl.className = `text-sm font-bold ${isVerified ? 'text-status-approved-text' : 'text-status-action-text'}`;
  }

  // Source Account
  const sourceInfo = document.getElementById('profile-source-account-info');
  if (sourceInfo && state.activeSourceAccount) {
    const acc = state.activeSourceAccount;
    sourceInfo.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="p-4 rounded-lg bg-status-approved-bg border border-status-approved-border flex items-center gap-3">
          <span class="material-symbols-outlined text-status-approved-text text-2xl">verified</span>
          <div>
            <span class="text-sm font-bold text-status-approved-text">Account Active & Verified</span>
            <p class="text-[11px] text-text-secondary">Authorized to submit problem statements</p>
          </div>
        </div>
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
          <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Source Account ID</span>
          <span class="text-sm text-text-primary font-medium">${acc.displayName || acc.sourceName || '—'}</span>
        </div>
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
          <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Organization Name</span>
          <span class="text-sm text-text-primary font-bold">${acc.displayName || acc.sourceName || '—'}</span>
        </div>
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
          <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Source Type</span>
          <span class="font-mono-code text-sm text-text-primary">${TYPE_SCHEMAS[acc.sourceType]?.name || acc.sourceType || '—'}</span>
        </div>
        <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
          <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</span>
          <span class="text-sm text-status-approved-text font-bold">${acc.status || 'ACTIVE'} / ${acc.verificationStatus || 'VERIFIED'}</span>
        </div>
      </div>
    `;
  } else if (sourceInfo) {
    if (state.activeRegistration) {
      const reg = state.activeRegistration;
      const orgName = reg.source?.organizationName || reg.sourceName || 'Pending Registration';
      const statusLabel = STATUS_LABELS[reg.status] || reg.status || 'Under Review';
      sourceInfo.innerHTML = `
        <div class="flex flex-col gap-3">
          <div class="p-4 rounded-lg bg-surface-subtle border border-border-hairline flex items-center gap-3">
            <span class="material-symbols-outlined text-saffron-accent text-2xl">pending</span>
            <div>
              <span class="text-sm font-bold text-text-primary">KYC Registration in Progress</span>
              <p class="text-[11px] text-text-secondary">Status: ${statusLabel}</p>
            </div>
          </div>
          <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
            <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Organization Name</span>
            <span class="text-sm text-text-primary font-bold">${orgName}</span>
          </div>
          <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
            <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Registration ID</span>
            <span class="font-mono-code text-xs text-text-primary">${reg.registrationId || '—'}</span>
          </div>
          <div class="flex flex-col gap-1 p-3 rounded-lg bg-surface-subtle">
            <span class="text-[10px] font-bold text-text-muted uppercase tracking-wider">Application Status</span>
            <span class="text-sm text-status-action-text font-bold">${statusLabel}</span>
          </div>
        </div>
      `;
    } else {
      sourceInfo.innerHTML = `
        <div class="p-6 text-center text-text-muted text-xs border border-dashed border-border-strong rounded-lg">
          No verified source account yet. Complete your KYC registration to activate your source account.
        </div>
      `;
    }
  }
}

/* ---------------- Event Wireups ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Mobile OTP Segment Input Handlers
  const cells = document.querySelectorAll('.otp-cell');
  cells.forEach((cell, idx) => {
    cell.addEventListener('input', e => {
      const v = e.target.value.replace(/\D/g, '');
      e.target.value = v ? v.slice(-1) : '';
      if (v && idx < cells.length - 1) {
        cells[idx + 1].focus();
      }
    });
    cell.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        cells[idx - 1].focus();
      }
    });
    cell.addEventListener('paste', e => {
      e.preventDefault();
      const p = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      p.split('').forEach((ch, i) => {
        if (cells[i]) cells[i].value = ch;
      });
      if (cells[Math.min(p.length, cells.length - 1)]) {
        cells[Math.min(p.length, cells.length - 1)].focus();
      }
    });
  });

  // Global Click Listener for Custom Selects & Profile Dropdowns
  document.addEventListener('click', (e) => {
    // 1. Check if clicking a custom select trigger
    const trigger = e.target.closest('[data-select-trigger]');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = trigger.closest('.custom-select-wrapper');
      const wasOpen = wrapper?.classList.contains('open');

      // Close all custom selects
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
        w.classList.remove('open');
        const btn = w.querySelector('[data-select-trigger]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen && wrapper) {
        wrapper.classList.remove('has-error');
        wrapper.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    // 2. Check if clicking a custom select option
    const option = e.target.closest('.custom-select-option');
    if (option) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = option.closest('.custom-select-wrapper');
      if (!wrapper) return;
      const fieldKey = wrapper.getAttribute('data-field-key');
      const newVal = option.getAttribute('data-value');
      const newLabel = option.getAttribute('data-label');

      // Update hidden input
      const hiddenInput = wrapper.querySelector('input[type="hidden"]');
      if (hiddenInput) {
        hiddenInput.value = newVal;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Update trigger label
      const labelEl = wrapper.querySelector('.custom-select-label');
      if (labelEl) labelEl.textContent = newLabel;

      // Update state formData
      if (fieldKey) {
        state.wizard.formData[fieldKey] = newVal;
      }

      // Update option selection highlight & checkmarks
      wrapper.querySelectorAll('.custom-select-option').forEach(opt => {
        const isMatch = opt.getAttribute('data-value') === newVal;
        opt.classList.toggle('is-selected', isMatch);
        opt.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        let checkEl = opt.querySelector('.checkmark');
        if (isMatch) {
          if (!checkEl) {
            checkEl = document.createElement('span');
            checkEl.className = 'material-symbols-outlined text-[17px] text-ashoka-blue checkmark shrink-0';
            checkEl.textContent = 'check';
            opt.appendChild(checkEl);
          }
        } else if (checkEl) {
          checkEl.remove();
        }
      });

      // Close dropdown
      wrapper.classList.remove('open');
      const btn = wrapper.querySelector('[data-select-trigger]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      return;
    }

    // 3. Close custom selects when clicking outside
    if (!e.target.closest('.custom-select-wrapper')) {
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
        w.classList.remove('open');
        const btn = w.querySelector('[data-select-trigger]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    // 4. Header Profile Dropdown outside click
    const profileWrapper = document.getElementById('profile-dropdown-wrapper');
    if (profileWrapper && !profileWrapper.contains(e.target)) {
      closeProfileDropdown();
    }
  });

  // Close all open dropdowns on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProfileDropdown();
      closeApplicationSnapshotModal();
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
        w.classList.remove('open');
        const btn = w.querySelector('[data-select-trigger]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Prevent browser from opening files dragged outside dropzone
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => {
    window.addEventListener(name, (e) => {
      e.preventDefault();
    }, false);
  });

  // Check existing session
  syncPortalState();

  // Popstate listener for back/forward browser navigation
  window.addEventListener('popstate', (e) => {
    const targetView = e.state?.viewId || (window.location.hash ? window.location.hash.slice(1) : null);
    if (targetView) {
      showView(targetView);
    } else {
      syncPortalState();
    }
  });

});

// Expose functions to window for HTML inline handlers
window.handleSendOtp = handleSendOtp;
window.handleVerifyOtp = handleVerifyOtp;
window.syncPortalState = syncPortalState;
window.toggleProfileDropdown = toggleProfileDropdown;
window.showView = showView;
window.goBackFromProfile = goBackFromProfile;
window.closeProfileDropdown = closeProfileDropdown;
window.clearSession = clearSession;
window.setWizardBucket = setWizardBucket;
window.renderWizardStep = renderWizardStep;
window.collectStep2Data = collectStep2Data;
window.addDoc = addDoc;
window.removeDoc = removeDoc;
window.attachFiles = attachFiles;
window.toggleHistoryItem = toggleHistoryItem;
window.copyHistoryEventDetails = copyHistoryEventDetails;
window.resumeDraftFromHistory = resumeDraftFromHistory;
window.openApplicationSnapshotModal = openApplicationSnapshotModal;
window.closeApplicationSnapshotModal = closeApplicationSnapshotModal;
window.handleSaveDraft = handleSaveDraft;
window.handleSubmitRegistration = handleSubmitRegistration;
window.handlePatchDeficiency = handlePatchDeficiency;
window.handleResubmit = handleResubmit;
window.handlePostProblem = handlePostProblem;
window.goToKycAction = goToKycAction;
window.goToFileProblem = goToFileProblem;
window.goToMyProblems = goToMyProblems;
window.handleAccessRuleChange = handleAccessRuleChange;
window.filterUniversitiesList = filterUniversitiesList;
window.selectUniversity = selectUniversity;
window.removeSelectedUniversity = removeSelectedUniversity;
window.toggleDomainSelection = toggleDomainSelection;
window.fillDefaultLocation = fillDefaultLocation;
window.handleFilterProblemsList = handleFilterProblemsList;
window.openProblemDetailModal = openProblemDetailModal;
window.closeProblemDetailModal = closeProblemDetailModal;
window.closeProblemSuccessModal = closeProblemSuccessModal;
window.handleAddProblemEvidence = handleAddProblemEvidence;
window.copyModalProblemId = copyModalProblemId;
window.copySuccessProblemId = copySuccessProblemId;
window.toast = toast;
window.state = state;
