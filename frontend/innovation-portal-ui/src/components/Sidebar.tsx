import React, { useState } from 'react';
<<<<<<< HEAD
import { motion, AnimatePresence } from 'framer-motion';
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
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
<<<<<<< HEAD
  const [diagOpen, setDiagOpen] = useState(false);
=======
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d

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

<<<<<<< HEAD
  const renderItems = (items: NavItem[]) => (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = currentPath === item.path;
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className="group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer w-full text-left"
            type="button"
          >
            {/* Animated sliding active pill indicator with spring physics */}
            {isActive && (
              <>
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 bg-[#F1F5F9] rounded-xl z-0"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
                <motion.div
                  layoutId="sidebar-active-strip"
                  className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-full bg-[#FF9933] z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              </>
            )}

            <div className="relative z-10 flex items-center gap-2.5">
              <motion.span
                whileHover={{ scale: 1.15, rotate: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`material-symbols-outlined text-[20px] transition-colors ${
                  isActive ? 'text-[#FF9933]' : 'text-[#94A3B8] group-hover:text-[#0A2540]'
                }`}
              >
                {item.icon}
              </motion.span>
              <span className={`transition-colors ${isActive ? 'font-bold text-[#0A2540]' : 'text-[#475569] group-hover:text-[#0A2540]'}`}>
                {item.label}
              </span>
            </div>

            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={`relative z-10 text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  isActive ? 'bg-[#0A2540]/10 text-[#0A2540]' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
    </nav>
  );

  return (
<<<<<<< HEAD
    <aside className="fixed left-0 top-[68px] bottom-0 w-64 bg-white z-40 flex flex-col justify-between border-r border-[#E5E7EB] overflow-y-auto">
      <div className="p-3">
        {/* OVERVIEW */}
        <div className="mb-2">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 px-3">
=======
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white z-40 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#e2e8f0] overflow-y-auto">
      <div className="p-3">
        {/* OVERVIEW */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            Overview
          </div>
          {renderItems([{ path: 'overview', icon: 'space_dashboard', label: 'Dashboard' }])}
        </div>

<<<<<<< HEAD
        <div className="mx-3 my-3 border-t border-[#F1F5F9]" />

        {/* INNOVATION — participants */}
        {isParticipant && (
          <>
            <div className="mb-2">
              <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 px-3">
                Innovation
              </div>
              {renderItems([
                { path: 'problem-catalog', icon: 'inventory_2', label: 'Problem Catalog', badge: problemsCount },
                { path: 'my-submissions', icon: 'folder_shared', label: 'My Submissions', badge: submissionsCount },
              ])}
            </div>
            <div className="mx-3 my-3 border-t border-[#F1F5F9]" />
          </>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
        )}

        {/* EVALUATION — evaluators */}
        {isEvaluator && (
<<<<<<< HEAD
          <>
            <div className="mb-2">
              <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 px-3">
                Evaluation
              </div>
              {renderItems([
                { path: 'project-review-queue', icon: 'fact_check', label: 'Project Review Queue', badge: pendingReviewsCount },
                { path: 'evaluation-rubrics', icon: 'rule', label: 'Scoring Rubrics' },
              ])}
            </div>
            <div className="mx-3 my-3 border-t border-[#F1F5F9]" />
          </>
=======
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
              Evaluation
            </div>
            {renderItems([
              { path: 'project-review-queue', icon: 'fact_check', label: 'Project Review Queue', badge: pendingReviewsCount },
              { path: 'evaluation-rubrics', icon: 'rule', label: 'Scoring Rubrics' },
            ])}
          </div>
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
        )}

        {/* ADMINISTRATION — admins / reviewers */}
        {isAdmin && (
<<<<<<< HEAD
          <>
            <div className="mb-2">
              <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 px-3">
                Administration
              </div>
              {renderItems([
                { path: 'admin-cycles-and-publish', icon: 'published_with_changes', label: 'Cycles & Publish' },
                { path: 'nodal-officers-directory', icon: 'corporate_fare', label: 'Nodal Institutes' },
              ])}
            </div>
            <div className="mx-3 my-3 border-t border-[#F1F5F9]" />
          </>
=======
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
              Administration
            </div>
            {renderItems([
              { path: 'admin-cycles-and-publish', icon: 'published_with_changes', label: 'Cycles & Publish' },
              { path: 'nodal-officers-directory', icon: 'corporate_fare', label: 'Nodal Institutes' },
            ])}
          </div>
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
        )}

        {/* ACCOUNT */}
        <div>
<<<<<<< HEAD
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2 px-3">
=======
          <div className="text-[11px] font-semibold text-[#74777f] uppercase tracking-wider mb-1.5 px-3">
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
            Account
          </div>
          {renderItems([{ path: 'my-profile', icon: 'badge', label: 'My Profile' }])}
        </div>
      </div>

<<<<<<< HEAD
      {/* BOTTOM STATUS WIDGET */}
      <div className="p-3 m-3 rounded-2xl bg-[#F7F8FC] border border-[#E5E7EB]">
        {/* Minimal Health Indicator (all roles) */}
        <div className="flex items-center gap-2 px-1">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[12px] font-semibold text-[#1E293B]">All Systems Operational</span>
          </span>
        </div>

        {/* Admin-only expandable diagnostics */}
        {isAdmin && (
          <div className="mt-2.5 pt-2 border-t border-[#E5E7EB]">
            <button
              onClick={() => setDiagOpen(!diagOpen)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] hover:text-[#64748B] transition-colors px-1 py-1"
              type="button"
            >
              <span>Technical Diagnostics</span>
              <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${diagOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            <AnimatePresence>
              {diagOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mt-1.5 space-y-1 font-mono text-[10px] text-[#64748B] px-1"
                >
                  <div className="flex items-center justify-between">
                    <span>Portal Svc</span>
                    <span className="text-[#1E293B] font-semibold">:8084</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Eval Svc</span>
                    <span className="text-[#1E293B] font-semibold">:8083</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Source Svc</span>
                    <span className="text-[#1E293B] font-semibold">:8081</span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-[10px] text-[#94A3B8]">Role: {role}</span>
                    <button
                      onClick={handlePing}
                      className="text-[10px] text-[#0A2540] font-bold hover:underline flex items-center gap-0.5"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[11px]">sync</span>
                      Ping
                    </button>
                  </div>
                  {pingStatus && (
                    <div className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                      {pingStatus}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Non-admin: muted authenticated role */}
        {!isAdmin && (
          <div className="mt-1.5 px-1 text-[10px] text-[#94A3B8] font-mono flex items-center justify-between">
            <span>Auth Status</span>
            <span className="font-semibold text-[#64748B]">{role}</span>
=======
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
>>>>>>> d732201aa7e34898c938c4647556e99cdd33643d
          </div>
        )}
      </div>
    </aside>
  );
};