import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startEvaluation } from '../../services/adminEvalService';
import { getErrorMessage } from '../../lib/api';

export default function StartEvaluationPage() {
  const navigate = useNavigate();
  const [problemId, setProblemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemId.trim()) return;
    setLoading(true); setError('');
    try {
      await startEvaluation(problemId.trim());
      navigate('/evaluation/queue');
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto mt-12">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[#0A2540] text-[28px]">play_circle</span>
          <div>
            <h1 className="text-[20px] font-bold text-[#0A2540]">Start Evaluation</h1>
            <p className="text-[13px] text-[#64748B]">Trigger a new cycle for a problem ID</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#0A2540] mb-1.5">Problem ID</label>
            <input
              type="text"
              value={problemId}
              onChange={e => setProblemId(e.target.value)}
              placeholder="e.g. PRB-XYZ-123"
              className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#0A2540]"
              required
            />
          </div>
          {error && <div className="text-[13px] text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] px-3 py-2 rounded-lg">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-[#0A2540] text-white font-semibold rounded-lg py-2 hover:bg-[#1E3A8A] disabled:opacity-50">
            {loading ? 'Starting…' : 'Start Cycle'}
          </button>
        </form>
      </div>
    </div>
  );
}
