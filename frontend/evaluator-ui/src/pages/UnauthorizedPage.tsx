import { useNavigate } from 'react-router-dom';
import { clearTokens, getRole } from '../lib/auth';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const role = getRole();
  const handleLogout = () => { clearTokens(); navigate('/login', { replace: true }); };
  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-[#FFF1F2] border border-[#FECDD3] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[#BE123C] text-[28px]">block</span>
        </div>
        <h1 className="text-[20px] font-bold text-[#0A2540] mb-2">Access Denied</h1>
        <p className="text-[14px] text-[#64748B] mb-2">
          Your account role {role ? '(' + role + ')' : ''} does not have permission to access this portal.
        </p>
        <p className="text-[13px] text-[#94A3B8] mb-6">
          If you believe this is an error, please contact an administrator.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="px-6 py-2.5 bg-[#0A2540] text-white font-semibold rounded-lg hover:bg-[#1E3A8A] transition-colors text-[14px]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
