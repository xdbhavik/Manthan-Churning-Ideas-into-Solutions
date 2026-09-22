import { useState, type ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline';
  className?: string;
  fullWidth?: boolean;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
  fullWidth = false,
}: TabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ transform: string; width: string }>({
    transform: 'translateX(0px)',
    width: '0px',
  });

  const updateIndicator = (index: number) => {
    if (variant !== 'pills') return;
    const tabElements = document.querySelectorAll('[data-tab-button]');
    const activeElement = tabElements[index] as HTMLElement;
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      const containerRect = activeElement.parentElement?.getBoundingClientRect();
      if (containerRect) {
        setIndicatorStyle({
          transform: `translateX(${rect.left - containerRect.left}px)`,
          width: `${rect.width}px`,
        });
      }
    }
  };

  useEffect(() => {
    const index = tabs.findIndex((t) => t.id === activeTab);
    if (index >= 0) {
      setTimeout(() => updateIndicator(index), 10);
    }
  }, [activeTab, tabs]);

  return (
    <div className={className}>
      <div
        className={`flex items-center gap-space-xs ${variant === 'pills' ? 'bg-surface-container-low p-1.5 rounded-xl' : 'border-b border-border-subtle'} ${fullWidth ? 'w-full' : ''}`}
        role="tablist"
      >
        {variant === 'pills' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="absolute bg-surface-card rounded-lg shadow-sm"
              style={indicatorStyle}
              initial={false}
              animate={indicatorStyle}
              transition={{ duration: 200, ease: 'easeOut' }}
            />
          </AnimatePresence>
        )}
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            data-tab-button
            ref={null}
            onClick={() => {
              if (!tab.disabled) {
                onChange(tab.id);
                updateIndicator(index);
              }
            }}
            disabled={tab.disabled}
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`flex items-center justify-center gap-2 px-space-md py-2 rounded-lg font-headline-sm text-headline-sm transition-all duration-200 relative z-10 ${
              variant === 'pills'
                ? tab.id === activeTab
                  ? 'text-primary bg-surface-card shadow-sm'
                  : 'text-on-surface-variant-weak hover:text-on-surface hover:bg-surface-container'
                : tab.id === activeTab
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-on-surface-variant-weak hover:text-on-surface'
            } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {tab.icon && <span className="material-symbols-outlined text-base leading-none">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full font-label-mono-sm text-label-mono-sm ${
                variant === 'pills'
                  ? tab.id === activeTab
                    ? 'bg-primary-container/10 text-primary'
                    : 'bg-surface-container-high text-primary'
                  : 'bg-surface-container-high text-primary'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {tabs.find((t) => t.id === activeTab)?.children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export interface TabPanelProps {
  children: ReactNode;
}

export function TabPanel({ children }: TabPanelProps) {
  return <>{children}</>;
}