import { registerPage, navigate, setState, showToast } from '../app.js';
import { verifyOtp, setTokens, decodeJwtPayload, requestOtp } from '../api.js';

let timerInterval = null;

function render() {
  const phone = sessionStorage.getItem('auth_phone') || '9800000001';
  return `
    <!-- Header (same as login screen) -->
    <header class="fixed top-1 left-0 right-0 z-40 bg-surface-crisp shadow-sm border-b border-border-hairline h-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-container-low shadow-sm border border-border-hairline/60">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-7 h-7" fill="none">
              <circle cx="24" cy="24" r="22" fill="#0A2540" stroke="#E2E8F0" stroke-width="1.5"/>
              <circle cx="24" cy="24" r="16" fill="#F8FAFC" stroke="#0A2540" stroke-width="1"/>
              <circle cx="24" cy="24" r="11" stroke="#1E3A8A" stroke-width="1.2" fill="none"/>
              <circle cx="24" cy="24" r="3" fill="#1E3A8A"/>
              <line x1="24" y1="13" x2="24" y2="35" stroke="#1E3A8A" stroke-width="1"/>
              <line x1="13" y1="24" x2="35" y2="24" stroke="#1E3A8A" stroke-width="1"/>
              <line x1="16" y1="16" x2="32" y2="32" stroke="#1E3A8A" stroke-width="1"/>
              <line x1="16" y1="32" x2="32" y2="16" stroke="#1E3A8A" stroke-width="1"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="font-bold text-ashoka-blue tracking-tight text-base sm:text-lg leading-tight">SIH26043 Admin Panel</span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-submitted-bg text-status-submitted-text uppercase leading-none">Gov.in</span>
            </div>
            <span class="text-xs text-text-muted hidden sm:inline leading-tight">Sovereign Administrative Console | प्रशासनिक नियंत्रण पैनल</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-status-action-bg text-status-action-text uppercase tracking-wider border border-status-action-border">OTP Pending</span>
        </div>
      </div>
    </header>

    <!-- OTP Card — centered below header -->
    <main class="flex-1 pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100vh-4.5rem)]">
      <div class="w-full max-w-md bg-surface-crisp rounded-xl shadow-xl p-6 sm:p-8 relative overflow-hidden border border-border-hairline">
        <!-- Top Tricolor Gradient Strip -->
        <div class="w-full h-1 bg-gradient-to-r from-saffron-accent via-surface-muted to-gov-emerald absolute top-0 left-0"></div>

        <div class="flex flex-col mb-6 text-center sm:text-left">
          <div class="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <span class="material-symbols-outlined text-ashoka-blue text-xl">verified_user</span>
            <span class="text-xs font-bold uppercase tracking-wider text-institutional-navy">Two-Factor Authentication</span>
          </div>
          <h1 class="text-2xl font-bold text-ashoka-blue mb-1">Enter Verification Code</h1>
          <p class="text-sm text-text-secondary">A 6-digit OTP has been sent to your registered mobile</p>
        </div>

        <!-- Target Display -->
        <div class="flex items-center justify-between p-3 bg-surface-subtle rounded-lg border border-border-hairline mb-5">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-ashoka-blue text-[20px]">smartphone</span>
            <span class="font-mono-code text-sm text-text-primary font-semibold">+91 ${phone}</span>
          </div>
          <span class="px-2 py-0.5 rounded bg-status-approved-bg text-status-approved-text text-[10px] font-bold uppercase">Dispatched</span>
        </div>

        <!-- OTP Cells -->
        <div class="flex items-center justify-center gap-2.5 mb-5">
          ${[0,1,2,3,4,5].map(i => `
            <input
              type="text"
              maxlength="1"
              class="otp-cell w-12 h-14 text-center font-mono-code text-xl text-ashoka-blue bg-surface-subtle rounded-lg border-2 border-border-hairline focus:border-ashoka-blue focus:bg-surface-crisp transition-all shadow-sm outline-none"
              data-index="${i}"
              oninput="window.otpPage.handleInput(this, ${i})"
              onkeydown="window.otpPage.handleKeydown(event, ${i})"
              onpaste="window.otpPage.handlePaste(event)"
            />`).join('')}
        </div>

        <!-- Timer & Resend -->
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-text-muted">timer</span>
            <span id="otp-timer" class="font-mono-code text-sm text-saffron-accent font-bold">02:45</span>
            <span class="text-xs text-text-muted">remaining</span>
          </div>
          <button
            id="resend-btn"
            disabled
            class="text-ashoka-blue text-xs font-bold hover:underline disabled:text-text-muted disabled:no-underline disabled:cursor-not-allowed transition-colors cursor-pointer"
            onclick="window.otpPage.resendOtp()"
          >
            Resend Code
          </button>
        </div>

        <!-- Verify Button -->
        <button
          id="verify-btn"
          disabled
          class="w-full h-11 bg-ashoka-blue hover:bg-institutional-navy text-on-primary font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onclick="window.otpPage.verifyOtp()"
        >
          <span class="material-symbols-outlined text-[18px]">verified_user</span>
          <span id="verify-btn-text">Verify & Authenticate</span>
        </button>

        <!-- Feedback Area -->
        <div id="otp-feedback" class="hidden rounded-lg p-3 flex items-start gap-2.5 mt-4"></div>

        <!-- Statutory Notice Footer -->
        <div class="mt-6 pt-4 border-t border-border-hairline flex items-center justify-between text-xs text-text-muted flex-wrap gap-2">
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[15px] text-gov-emerald">lock</span>
            256-Bit TLS Protected
          </span>
          <span class="font-mono-code text-[10px]">SHA-256 TOTP</span>
        </div>
      </div>
    </main>`;
}

render.afterRender = function() {
  const firstCell = document.querySelector('.otp-cell[data-index="0"]');
  if (firstCell) firstCell.focus();
  startTimer();
};

function startTimer() {
  let totalSeconds = 165; // 2:45
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    totalSeconds--;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timerEl = document.getElementById('otp-timer');
    if (timerEl) {
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      if (timerEl) {
        timerEl.textContent = 'EXPIRED';
        timerEl.classList.add('text-error');
      }
      const resendBtn = document.getElementById('resend-btn');
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

function getOtpValue() {
  const cells = document.querySelectorAll('.otp-cell');
  return Array.from(cells).map(c => c.value).join('');
}

function checkComplete() {
  const val = getOtpValue();
  const btn = document.getElementById('verify-btn');
  if (btn) btn.disabled = val.length !== 6;
}

window.otpPage = {
  handleInput(el, index) {
    el.value = el.value.replace(/\D/g, '').slice(0, 1);
    if (el.value && index < 5) {
      const next = document.querySelector(`.otp-cell[data-index="${index + 1}"]`);
      if (next) next.focus();
    }
    checkComplete();
  },

  handleKeydown(e, index) {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      const prev = document.querySelector(`.otp-cell[data-index="${index - 1}"]`);
      if (prev) { prev.value = ''; prev.focus(); }
    }
    checkComplete();
  },

  handlePaste(e) {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
    const cells = document.querySelectorAll('.otp-cell');
    pasted.split('').forEach((ch, i) => {
      if (cells[i]) cells[i].value = ch;
    });
    const lastIdx = Math.min(pasted.length, 6) - 1;
    if (cells[lastIdx]) cells[lastIdx].focus();
    checkComplete();
  },

  async verifyOtp() {
    const btn = document.getElementById('verify-btn');
    const btnText = document.getElementById('verify-btn-text');
    const feedback = document.getElementById('otp-feedback');
    const code = getOtpValue();
    const challengeId = sessionStorage.getItem('auth_challenge_id');

    if (code.length !== 6) return;

    btn.disabled = true;
    btnText.textContent = 'Verifying Security Token...';
    if (feedback) feedback.classList.add('hidden');

    try {
      if (!challengeId) {
        throw new Error('Authentication session expired. Please return to login.');
      }

      const res = await verifyOtp(challengeId, code);
      if (timerInterval) clearInterval(timerInterval);

      // Verify user payload / role
      const user = res.user || (res.accessToken ? decodeJwtPayload(res.accessToken) : null) || {};
      const role = (user.role || (user.roles && user.roles[0]) || '').toUpperCase();

      if (feedback) {
        feedback.classList.remove('hidden');
        feedback.className = 'rounded-lg p-3 flex items-start gap-2.5 mt-4 bg-status-approved-bg border border-status-approved-border';
        feedback.innerHTML = `
          <span class="material-symbols-outlined text-gov-emerald text-[20px]">check_circle</span>
          <div>
            <span class="text-xs font-bold text-status-approved-text block">Authentication Verified</span>
            <span class="text-xs text-text-secondary">
              Identity confirmed — Role: <strong>${role || 'ADMIN'}</strong> — Initializing console...
            </span>
          </div>`;
      }

      showToast(`Welcome, ${user.name || user.phone || 'Admin'}`);

      setTimeout(() => {
        if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'REVIEWER') {
          navigate('registrations');
        } else {
          navigate('unauthorized');
        }
      }, 700);
    } catch (err) {
      console.error('OTP Verification Error:', err);
      btn.disabled = false;
      btnText.textContent = 'Verify & Authenticate';
      if (feedback) {
        feedback.classList.remove('hidden');
        feedback.className = 'rounded-lg p-3 flex items-start gap-2.5 mt-4 bg-status-rejected-bg border border-status-rejected-border';
        feedback.innerHTML = `
          <span class="material-symbols-outlined text-status-rejected-text text-[20px]">error</span>
          <div>
            <span class="text-xs font-bold text-status-rejected-text block">Verification Failed</span>
            <span class="text-xs text-text-secondary">${err.message || 'Invalid or expired OTP. Please try again.'}</span>
          </div>`;
      }
      showToast(err.message || 'OTP verification failed', 'error');
    }
  },

  async resendOtp() {
    const resendBtn = document.getElementById('resend-btn');
    const timerEl = document.getElementById('otp-timer');
    const feedback = document.getElementById('otp-feedback');
    const phone = sessionStorage.getItem('auth_phone');

    if (!phone) {
      showToast('No phone number found in session. Please return to login.', 'error');
      navigate('login');
      return;
    }

    if (resendBtn) resendBtn.disabled = true;
    if (timerEl) timerEl.classList.remove('text-error');
    if (feedback) feedback.classList.add('hidden');

    try {
      showToast('Dispatching new OTP challenge...');
      const res = await requestOtp(phone);
      if (res && res.challengeId) {
        sessionStorage.setItem('auth_challenge_id', res.challengeId);
      }
      showToast('New OTP dispatched successfully');
      startTimer();
    } catch (err) {
      console.error('Resend OTP error:', err);
      showToast(err.message || 'Failed to resend OTP', 'error');
      if (resendBtn) resendBtn.disabled = false;
    }
  },
};

registerPage('otp', render);
