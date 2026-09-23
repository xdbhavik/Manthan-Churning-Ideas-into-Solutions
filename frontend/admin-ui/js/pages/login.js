import { registerPage, navigate, showToast } from '../app.js';
import { requestOtp } from '../api.js';

function render() {
  return `
    <!-- Header (visible on login/otp screens too, matching other portals) -->
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
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-surface-muted text-text-muted uppercase tracking-wider">Unauthenticated</span>
        </div>
      </div>
    </header>

    <!-- Login Card — centered below header -->
    <main class="flex-1 pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[calc(100vh-4.5rem)]">
      <div class="w-full max-w-md bg-surface-crisp rounded-xl shadow-xl p-6 sm:p-8 relative overflow-hidden border border-border-hairline">
        <!-- Top Tricolor Gradient Strip (card accent) -->
        <div class="w-full h-1 bg-gradient-to-r from-saffron-accent via-surface-muted to-gov-emerald absolute top-0 left-0"></div>

        <div class="flex flex-col mb-6 text-center sm:text-left">
          <div class="flex items-center justify-center sm:justify-start gap-2 mb-2">
            <span class="material-symbols-outlined text-ashoka-blue text-xl">shield_person</span>
            <span class="text-xs font-bold uppercase tracking-wider text-saffron-accent">Secure Authentication</span>
          </div>
          <h1 class="text-2xl font-bold text-ashoka-blue mb-1">Sign in to Admin Panel</h1>
          <p class="text-sm text-text-secondary">Passwordless OTP login for Authorized Administrators</p>
        </div>

        <form onsubmit="event.preventDefault(); window.loginPage.requestOtp();" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold uppercase tracking-wider text-text-primary" for="phone-input">
                Official Mobile Number <span class="text-saffron-accent">*</span>
              </label>
              <span class="font-mono-code text-[11px] text-text-muted font-semibold">10 DIGITS</span>
            </div>

            <div class="relative flex items-center rounded-lg border border-border-hairline bg-surface-subtle/50 focus-within:border-ashoka-blue focus-within:ring-1 focus-within:ring-ashoka-blue focus-within:bg-surface-crisp transition-all overflow-hidden">
              <div class="flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-muted text-text-primary select-none pointer-events-none border-r border-border-hairline shrink-0">
                <svg class="w-5 h-3.5 rounded-sm shadow-xs border border-border-hairline shrink-0" viewBox="0 0 640 480" aria-label="India">
                  <path fill="#FF9933" d="M0 0h640v160H0z"/>
                  <path fill="#FFFFFF" d="M0 160h640v160H0z"/>
                  <path fill="#128807" d="M0 320h640v160H0z"/>
                  <circle cx="320" cy="240" r="38" fill="none" stroke="#000080" stroke-width="6"/>
                  <circle cx="320" cy="240" r="8" fill="#000080"/>
                </svg>
                <span class="font-mono-code text-sm font-semibold text-text-primary">+91</span>
              </div>
              <input autocomplete="tel-national" class="w-full h-11 px-3.5 bg-transparent font-mono-code text-sm text-text-primary placeholder:text-text-muted focus:outline-none min-w-0" id="phone-input" inputmode="numeric" maxlength="10" placeholder="98XXX XXXXX" type="tel" oninput="window.loginPage.validatePhone(this)"/>
              <div class="px-3 text-gov-emerald opacity-0 transition-opacity shrink-0" id="mobile-check-icon">
                <span class="material-symbols-outlined text-base">check_circle</span>
              </div>
            </div>

            <div id="phone-feedback" class="flex items-center justify-between text-xs pt-1">
              <span class="text-text-muted">6-digit OTP will be requested from Gateway</span>
            </div>
          </div>

          <!-- Statutory Checkbox -->
          <div class="flex items-start gap-2.5 p-3 bg-surface-subtle/90 rounded-lg border border-border-hairline">
            <input type="checkbox" id="statutory-check" class="mt-0.5 accent-ashoka-blue w-4 h-4" onchange="window.loginPage.toggleCheck()"/>
            <label for="statutory-check" class="text-xs text-text-secondary cursor-pointer leading-relaxed">
              I confirm this is a <strong class="text-text-primary">Government-authorized device</strong> and understand this session will be audited under <strong class="text-text-primary">IT Act 2000, Sec 43A</strong>.
            </label>
          </div>

          <!-- System Connectivity Status Pill -->
          <div class="px-3 py-2 bg-surface-subtle/90 rounded-lg border border-border-hairline text-xs flex items-center justify-between">
            <span class="text-text-muted flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[15px] text-institutional-navy">cloud_done</span>
              <span>Network Status:</span>
            </span>
            <span class="font-mono-code text-[11px] font-semibold text-gov-emerald flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-gov-emerald animate-pulse"></span>
              <span>Systems Online</span>
            </span>
          </div>

          <button class="w-full h-11 bg-ashoka-blue hover:bg-institutional-navy active:bg-primary text-on-primary font-semibold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed" id="otp-btn" type="submit" disabled>
            <span id="otp-btn-text">Send Verification Code (OTP)</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        <!-- Server-Validated Feedback -->
        <div id="login-feedback" class="hidden rounded-lg p-3 flex items-start gap-2.5 mt-4"></div>

        <!-- Statutory Notice Footer inside Card -->
        <div class="mt-6 pt-4 border-t border-border-hairline flex items-center justify-between text-xs text-text-muted flex-wrap gap-2">
          <span class="flex items-center gap-1">
            <span class="material-symbols-outlined text-[15px] text-gov-emerald">lock</span>
            256-Bit TLS Protected
          </span>
          <span class="font-mono-code text-[10px]">ADM-NODE-01</span>
        </div>
      </div>
    </main>`;
}

render.afterRender = function() {
  const phoneInput = document.getElementById('phone-input');
  if (phoneInput) phoneInput.focus();
};

// Expose page logic
window.loginPage = {
  validatePhone(input) {
    const val = input.value.replace(/\D/g, '');
    input.value = val;
    const btn = document.getElementById('otp-btn');
    const checked = document.getElementById('statutory-check')?.checked;
    const checkIcon = document.getElementById('mobile-check-icon');

    if (val.length === 10) {
      if (checkIcon) checkIcon.style.opacity = '1';
      if (checked) btn.disabled = false;
    } else {
      if (checkIcon) checkIcon.style.opacity = '0';
      btn.disabled = true;
    }
  },

  toggleCheck() {
    const phone = document.getElementById('phone-input')?.value || '';
    const checked = document.getElementById('statutory-check')?.checked;
    const btn = document.getElementById('otp-btn');
    btn.disabled = !(phone.replace(/\D/g, '').length === 10 && checked);
  },

  async requestOtp() {
    const input = document.getElementById('phone-input');
    const phone = input?.value.replace(/\D/g, '') || '';
    if (phone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    const btn = document.getElementById('otp-btn');
    const btnText = document.getElementById('otp-btn-text');
    const feedback = document.getElementById('login-feedback');

    btn.disabled = true;
    btnText.textContent = 'Requesting Verification Challenge...';
    if (feedback) feedback.classList.add('hidden');

    try {
      const res = await requestOtp(phone);
      sessionStorage.setItem('auth_phone', phone);
      if (res?.challengeId) {
        sessionStorage.setItem('auth_challenge_id', res.challengeId);
      }

      if (feedback) {
        feedback.classList.remove('hidden');
        feedback.className = 'rounded-lg p-3 flex items-start gap-2.5 mt-4 bg-status-approved-bg border border-status-approved-border';
        feedback.innerHTML = `
          <span class="material-symbols-outlined text-gov-emerald text-[20px]">check_circle</span>
          <div>
            <span class="text-xs font-bold text-status-approved-text block">OTP Dispatched Successfully</span>
            <span class="text-xs text-text-secondary">
              An official 6-digit verification code has been dispatched to +91 ${phone}.
            </span>
          </div>`;
      }

      showToast(`Passcode dispatched to +91 ${phone}`, 'success');
      setTimeout(() => {
        navigate('otp');
      }, 700);
    } catch (err) {
      const errMsg = err.message || 'Unable to request OTP from Gateway.';
      if (feedback) {
        feedback.classList.remove('hidden');
        feedback.className = 'rounded-lg p-3 flex items-start gap-2.5 mt-4 bg-red-50 border border-red-200';
        feedback.innerHTML = `
          <span class="material-symbols-outlined text-error text-[20px]">error</span>
          <div>
            <span class="text-xs font-bold text-error block">Authentication Gateway Notice</span>
            <span class="text-xs text-text-secondary">${errMsg}</span>
          </div>`;
      }
      showToast(errMsg, 'error');
      btn.disabled = false;
      btnText.textContent = 'Send Verification Code (OTP)';
    }
  },
};

registerPage('login', render);
