import { useState } from 'react';
import { createEvaluatorProfile } from '../../services/adminEvalService';
import { getErrorMessage } from '../../lib/api';
import type { EvaluatorType } from '../../types';

export default function EvaluatorOnboardingPage() {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<EvaluatorType>('INDUSTRY');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await createEvaluatorProfile({ userId, evaluatorType: type, fullName: name, organization: org || undefined });
      setSuccess('Profile created successfully.');
      setUserId(''); setName(''); setOrg('');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-xl mx-auto mt-12">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
        <h1 className="text-[20px] font-bold text-[#0A2540] mb-4">Evaluator Onboarding</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#0A2540] mb-1">User ID</label>
            <input type="text" value={userId} onChange={e => setUserId(e.target.value)} required className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[14px]" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#0A2540] mb-1">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[14px]" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#0A2540] mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as EvaluatorType)} className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[14px] bg-white">
              <option value="INDUSTRY">Industry</option>
              <option value="GOVERNMENT">Government</option>
              <option value="HEI">HEI</option>
              <option value="CITIZEN">Citizen</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#0A2540] mb-1">Organization</label>
            <input type="text" value={org} onChange={e => setOrg(e.target.value)} className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[14px]" />
          </div>
          {error && <div className="text-[13px] text-[#BE123C]">{error}</div>}
          {success && <div className="text-[13px] text-[#065F46] bg-[#ECFDF5] p-2 rounded">{success}</div>}
          <button type="submit" disabled={loading} className="w-full bg-[#0A2540] text-white font-semibold rounded-lg py-2">Create Profile</button>
        </form>
      </div>
    </div>
  );
}
