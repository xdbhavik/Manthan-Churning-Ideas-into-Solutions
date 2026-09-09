import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { getErrorMessage } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{10}$/.test(phone)) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login(phone);
      navigate('/verify-otp', { state: { phone, challengeId: res.challengeId, devOtp: res.devOtp } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-gutter-mobile bg-[#f5f7f9] selection:bg-slate-200">
      <div className="w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="flex flex-col items-center mb-space-2xl text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#edf3ee] border border-emerald-200 shadow-sm mb-space-md">
            <span className="material-symbols-outlined text-emerald-700 text-[26px]">shield_person</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-[#1f2d3a] tracking-tight">
            Central Nodal Registry
          </h1>
          <div className="flex items-center gap-space-xs mt-space-sm text-slate-500">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(22,163,74,0.4)]" aria-hidden="true" />
            <span className="font-mono-code text-[11px] uppercase tracking-[0.2em]">
              Secured Node · Tier-1 Gateway
            </span>
          </div>
        </div>

        <div className="w-full bg-white border border-slate-200 rounded-xl shadow-[0_10px_25px_rgba(15,23,42,0.04)] overflow-hidden surface-lift">
          
          <div className="p-space-2xl">
            {/* Notice banner */}
            <div className="mb-space-2xl flex items-start gap-space-md p-space-md bg-surface-muted rounded-lg border border-border-hairline/60">
              <span className="material-symbols-outlined text-text-secondary text-[18px] mt-space-2xs flex-shrink-0" aria-hidden="true">
                lock
              </span>
              <div>
                <span className="font-label-md text-label-md text-text-primary block">
                  Pre-provisioned Access Only
                </span>
                <p className="font-body-sm text-body-sm text-text-secondary mt-1 leading-relaxed">
                  Authentication requires a registered mobile identity. Self-provisioning is restricted.
                </p>
              </div>
            </div>

            {/* Form */}
            <form className="flex flex-col gap-space-xl" onSubmit={handleSubmit} id="admin-auth-form" noValidate>

              {/* Phone field */}
              <div className="flex flex-col gap-space-sm">
                <div className="flex justify-between items-baseline">
                  <label
                    className="font-label-sm text-[11px] text-text-muted uppercase tracking-wider font-semibold"
                    htmlFor="admin-phone"
                  >
                    Mobile Identity
                  </label>
                  <span className="font-mono-code text-[10px] text-text-muted/60 uppercase tracking-widest">10 Digits</span>
                </div>

                {/* Refined Input Group */}
                <div
                  className={`flex items-stretch rounded-lg border bg-surface-crisp transition-all duration-200 overflow-hidden ${
                    error 
                      ? 'border-red-300 ring-4 ring-red-500/10' 
                      : 'border-border-strong focus-within:border-ashoka-blue focus-within:ring-4 focus-within:ring-ashoka-blue/10'
                  }`}
                >
                  <div className="flex items-center gap-space-xs px-space-md bg-surface-muted/50 border-r border-border-strong select-none">
                    <span className="font-mono-code text-body-md text-text-secondary font-medium">+91</span>
                  </div>
                  <input
                    id="admin-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[6-9][0-9]{9}"
                    placeholder="Enter authorised number"
                    required
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    aria-describedby={`phone-hint${error ? ' phone-error' : ''}`}
                    aria-invalid={error ? 'true' : undefined}
                    className="flex-1 h-12 px-space-md bg-transparent font-mono-code text-body-lg text-text-primary placeholder:text-text-muted/40 focus:outline-none tracking-wide"
                  />
                </div>

                {/* Inline error / hint */}
                {error ? (
                  <div
                    id="phone-error"
                    role="alert"
                    aria-live="assertive"
                    className="flex items-center gap-space-xs mt-1 text-red-600 animate-in slide-in-from-top-1 duration-200"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                    <span className="font-body-sm text-[12px]">{error}</span>
                  </div>
                ) : (
                  <p id="phone-hint" className="font-body-sm text-[11px] text-text-muted/80 mt-1">
                    Must match your departmentally issued registry profile.
                  </p>
                )}
              </div>

              {/* Security acknowledgement */}
              <div className="flex items-start gap-space-md pt-space-xs">
                <div className="flex items-center h-5">
                  <input
                    id="hardware-token"
                    type="checkbox"
                    required
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="w-4 h-4 rounded border-border-strong text-ashoka-blue focus:ring-ashoka-blue focus:ring-offset-background cursor-pointer transition-colors"
                  />
                </div>
                <label
                  className="font-body-sm text-[12px] text-text-secondary cursor-pointer select-none leading-relaxed"
                  htmlFor="hardware-token"
                >
                  I verify this terminal complies with statutory isolation protocols and is authorized for registry access.
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-space-md">
                <button
                  id="btn-submit"
                  type="submit"
                  disabled={loading || !checked || phone.length < 10}
                  aria-busy={loading}
                  className="group relative w-full h-12 bg-[#1e2d3d] text-white rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-[#172734] transition-all duration-300 shadow-md cursor-pointer pressable disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                  
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>Negotiating Handshake...</span>
                    </>
                  ) : (
                    <>
                      <span>Initialize Session</span>
                      <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer policy notice */}
          <div className="bg-surface-subtle/50 px-space-2xl py-space-lg border-t border-border-hairline">
            <div className="flex items-start gap-space-md">
              <span className="material-symbols-outlined text-text-muted/60 text-[18px] mt-0.5 flex-shrink-0" aria-hidden="true">
                gavel
              </span>
              <p className="font-body-sm text-[11px] text-text-muted leading-relaxed">
                <span className="font-mono-code uppercase tracking-wider text-text-secondary">Statutory Warning — </span>
                Internal administrative portal. Unauthorized attempts are cryptographically logged and automatically reported to the Vigilance Directorate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
