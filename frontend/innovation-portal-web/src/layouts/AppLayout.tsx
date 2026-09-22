import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../app/providers/AuthProvider';
import { AppSidebar } from '../components/layout/AppSidebar';
import { AppTopbar } from '../components/layout/AppTopbar';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const displayName = user?.phone || user?.email || 'User';

  const sidebarWidth = isCollapsed ? 80 : 256;

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* Desktop sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarWidth }}
        className="hidden lg:flex fixed inset-y-0 left-0 bg-surface-card border-r border-border-subtle flex-col z-40 overflow-hidden"
      >
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-border-subtle tricolor-border-top shrink-0">
          <img src="/logo.svg" alt="Portal logo" className="w-8 h-8 shrink-0" />
          {!isCollapsed && (
            <div className="leading-tight truncate">
              <div className="font-headline font-bold text-on-surface text-sm truncate">Innovation Portal</div>
              <div className="text-[11px] text-on-surface-variant-weak truncate">Participant Workspace</div>
            </div>
          )}
        </div>
        <AppSidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        />
      </motion.aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy-900/40" 
              onClick={() => setSidebarOpen(false)} 
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-64 bg-surface-card flex flex-col shadow-level-3"
            >
              <div className="h-16 px-5 flex items-center justify-between border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.svg" alt="Portal logo" className="w-8 h-8 shrink-0" />
                  <div className="font-headline font-bold text-on-surface text-sm">Innovation Portal</div>
                </div>
                <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="p-2 rounded-lg hover:bg-surface text-on-surface-variant-weak hover:text-on-surface">
                  <span className="material-symbols-outlined text-on-surface">close</span>
                </button>
              </div>
              <AppSidebar onNavigate={() => setSidebarOpen(false)} isCollapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ paddingLeft: sidebarWidth }}
        className="flex flex-col min-h-screen max-lg:!pl-0"
      >
        <AppTopbar displayName={displayName} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 w-full overflow-x-hidden">
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}
