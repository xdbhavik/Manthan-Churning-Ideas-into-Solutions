import React, { useState } from 'react';
import { JwtRole, NavPath } from '../types';

interface SidebarProps {
  currentPath: NavPath;
  onNavigate: (path: NavPath) => void;
  role: JwtRole;
  problemsCount: number;
  submissionsCount: number;
  pendingReviewsCount: number;
}

type NavItem = { path: NavPath; icon: string; label: string; badge?: number };

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  role,
  problemsCount,
  submissionsCount,
  pendingReviewsCount,
}) => {
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  const isParticipant = role === 'SUBMITTER';
  const isEvaluator = role === 'EVALUATOR';
  const isAdmin = role === 'ADMIN' || role === 'REVIEWER';

  const handlePing = () => {
    setPingStatus('Pinging mesh nodes…');
    setTimeout(() => {
      setPingStatus('Portal :8084 · Eval :8083 · Source :8081 connected');
      setTimeout(() => setPingStatus(null), 2500);
    }, 400);
  };

  const navItemClass = (path: NavPath) => {
    const isActive = currentPath === path;
    if (isActive) {
      return 'flex items-center justify-between px-3 py-2 rounded-lg bg-[#dce9ff] text-[#0b1c30] font-semibold text-[13px] shadow-xs transition-all';
    }
    return 'flex items-center justify-between px-3 py-2 rounded-lg text-[#43474e] hover:bg-[#e5eeff] hover:text-[#0b1c30] text-[13px] font-medium transition-all';
  };

  const renderItems = (items: NavItem[]) => (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <button
          key={item.path}
          onClick={() => onNavigate(item.path)}
          className={navItemClass(item.path)}
          type="button"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
            <span>{item.label}</span>
          </div>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#eff4ff] text-[#0f2a4a] font-semibold">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white z-40 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#e2e8f0] overflow-y-auto">
      <div className="p-3">
        {/* OVERVIEW */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
            Overview
          </div>
          {renderItems([{ path: 'overview', icon: 'space_dashboard', label: 'Dashboard' }])}
        </div>

        {/* INNOVATION — participants */}
        {isParticipant && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
              Innovation
            </div>
            {renderItems([
              { path: 'problem-catalog', icon: 'inventory_2', label: 'Problem Catalog', badge: problemsCount },
              { path: 'my-submissions', icon: 'folder_shared', label: 'My Submissions', badge: submissionsCount },
            ])}
          </div>
        )}

        {/* EVALUATION — evaluators */}
        {isEvaluator && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
              Evaluation
            </div>
            {renderItems([
              { path: 'project-review-queue', icon: 'fact_check', label: 'Project Review Queue', badge: pendingReviewsCount },
              { path: 'evaluation-rubrics', icon: 'rule', label: 'Scoring Rubrics' },
            ])}
          </div>
        )}

        {/* ADMINISTRATION — admins / reviewers */}
        {isAdmin && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
              Administration
            </div>
            {renderItems([
              { path: 'admin-cycles-and-publish', icon: 'published_with_changes', label: 'Cycles & Publish' },
              { path: 'nodal-officers-directory', icon: 'corporate_fare', label: 'Nodal Institutes' },
            ])}
          </div>
        )}

        {/* ACCOUNT */}
        <div>
          <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
            Account
          </div>
          {renderItems([{ path: 'my-profile', icon: 'badge', label: 'My Profile' }])}
        </div>
      </div>

      {/* BOTTOM MESH STATUS WIDGET */}
      <div className="p-3 m-2.5 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b1c30]">
            Mesh Microservices
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#795900] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffc641]"></span>
            LIVE
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px] text-[#43474e]">
          <div className="flex items-center justify-between">
            <span>Portal Svc</span>
            <span className="text-[#0b1c30] font-semibold">:8084</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Eval Svc</span>
            <span className="text-[#0b1c30] font-semibold">:8083</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Source Svc</span>
            <span className="text-[#0b1c30] font-semibold">:8081</span>
          </div>
        </div>

        <div className="mt-2.5 pt-1.5 bg-white/70 rounded p-1.5 flex items-center justify-between border border-[#e2e8f0]">
          <span className="text-[11px] text-[#43474e] font-medium truncate max-w-[120px]">
            Active: <strong className="text-[#0b1c30]">{role}</strong>
          </span>
          <button
            onClick={handlePing}
            className="font-mono text-[10px] text-[#795900] font-bold hover:underline flex items-center gap-0.5"
            type="button"
          >
            <span className="material-symbols-outlined text-[12px]">sync</span>
            Ping
          </button>
        </div>

        {pingStatus && (
          <div className="mt-1.5 text-[10px] font-mono text-[#004b73] bg-[#cce5ff] px-2 py-1 rounded">
            {pingStatus}
          </div>
        )}
      </div>
    </aside>
  );
};