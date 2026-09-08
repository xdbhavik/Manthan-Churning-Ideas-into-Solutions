import { useNavigate } from 'react-router-dom';
import { clearTokens } from '../lib/auth';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  function handleBack() {
    clearTokens();
    navigate('/login');
  }

  return (
    <main className="w-full min-h-screen flex items-center justify-center p-gutter-mobile bg-background selection:bg-red-500/20">
      <div className="w-full max-w-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">

        {/* Sophisticated Error Insignia */}
        <div className="flex flex-col items-center mb-space-2xl text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-crisp border border-border-hairline shadow-sm mb-space-md relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5" />
            <span className="material-symbols-outlined text-red-600 text-[32px] filled z-10">gpp_bad</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
            Clearance Rejected
          </h1>
          <div className="flex items-center gap-space-xs mt-space-sm text-text-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" aria-hidden="true" />
            <span className="font-mono-code text-[11px] uppercase tracking-[0.2em] text-red-700 font-semibold">
              Security Protocol Violation
            </span>
          </div>
        </div>

        {/* System Lockout Canvas */}
        <div className="w-full bg-surface-crisp border border-border-hairline rounded-xl shadow-lg shadow-black/5 overflow-hidden">
          {/* Subtle error accent rail */}
          <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
          
          <div className="p-space-2xl md:p-[3rem] flex flex-col items-center text-center">
            
            <div className="mb-space-xl">
              <span className="font-mono-code text-[10px] text-red-700 bg-red-50 border border-red-200/60 px-space-md py-space-xs rounded-full uppercase tracking-widest inline-block mb-space-md">
                HTTP 403 · FORBIDDEN
              </span>
              <h2 className="font-headline-md text-headline-md text-text-primary mb-space-sm">
                Unauthorized Terminal Access
              </h2>
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed max-w-lg mx-auto">
                This secure portal is strictly gated to identities provisioned with <span className="font-mono-code text-ashoka-blue px-1 py-0.5 rounded bg-blue-50 border border-blue-100 font-medium">ADMIN</span> clearance. 
                The authenticated session lacks the required cryptographic role assignment.
              </p>
            </div>

            <div className="w-full max-w-md bg-surface-muted/50 p-space-xl rounded-lg border border-border-hairline/60 mb-space-2xl text-left">
              <div className="flex items-center gap-space-sm mb-space-md pb-space-sm border-b border-border-hairline/60">
                <span className="material-symbols-outlined text-saffron-accent text-[18px]">rule</span>
                <span className="font-label-md text-label-md text-text-primary uppercase tracking-wider">Required Actions</span>
              </div>
              <ul className="space-y-space-md font-body-sm text-body-sm text-text-secondary">
                <li className="flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-text-muted text-[16px] mt-0.5">check_circle</span>
                  <span>Verify your mobile identity matches your departmental administrative assignment.</span>
                </li>
                <li className="flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-text-muted text-[16px] mt-0.5">contact_support</span>
                  <span>Contact the Central Nodal Registry to request an escalation of your role privileges.</span>
                </li>
                <li className="flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-red-400 text-[16px] mt-0.5">warning</span>
                  <span className="text-red-700 font-medium">Cease further access attempts to prevent automated security lockouts.</span>
                </li>
              </ul>
            </div>

            <button
              id="unauthorized-back-btn"
              type="button"
              onClick={handleBack}
              className="group w-full max-w-sm h-12 bg-text-primary text-background rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-space-sm hover:bg-black transition-all duration-300 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:-translate-x-1">arrow_back</span>
              Return to Safe Gateway
            </button>
          </div>

          <div className="bg-surface-subtle/50 px-space-2xl py-space-lg border-t border-border-hairline flex items-center justify-center gap-space-sm">
            <span className="material-symbols-outlined text-text-muted/60 text-[16px]">fingerprint</span>
            <span className="font-mono-code text-[10px] text-text-muted tracking-wider uppercase">
              Incident securely logged for audit review
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
