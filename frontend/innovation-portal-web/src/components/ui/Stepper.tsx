import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface StepperStep {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: ReactNode;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: string; // step id
  completedSteps?: string[];
  variant?: 'horizontal' | 'vertical';
  className?: string;
  onStepClick?: (stepId: string) => void;
}

export function Stepper({
  steps,
  currentStep,
  completedSteps = [],
  variant = 'horizontal',
  className = '',
  onStepClick,
}: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100;

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col gap-space-lg ${className}`}>
        <div className="relative flex flex-col">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border-subtle" />
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex items-start gap-space-md group">
              <span
                className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ring-4 ring-surface-card z-10 transition-all duration-300 ${
                  completedSteps.includes(step.id)
                    ? 'bg-state-accepted-bg text-state-accepted-text'
                    : step.id === currentStep
                    ? 'bg-primary text-on-primary animate-pulse-ring'
                    : 'bg-surface-container text-on-surface-variant border border-border-subtle'
                }`}
                onClick={() => onStepClick?.(step.id)}
              >
                {completedSteps.includes(step.id) ? (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                ) : step.icon ? (
                  <span className="text-[15px]">{step.icon}</span>
                ) : (
                  <span className="font-label-mono-sm text-label-mono-sm">{index + 1}</span>
                )}
              </span>
              <div className={`flex-1 bg-surface-canvas p-space-md rounded-xl ${step.id === currentStep ? 'bg-state-review-bg/40 shadow-sm' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className={`font-headline-sm text-headline-sm ${step.id === currentStep ? 'text-state-review-text' : 'text-on-surface'}`}>
                    {step.shortLabel || step.label}
                  </span>
                  {completedSteps.includes(step.id) && (
                    <span className="font-label-mono-sm text-label-mono-sm text-state-accepted-text">Completed</span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-space-md ${className}`}>
      <div className="flex items-center justify-between text-on-surface-variant-weak">
        <span className="font-label-mono-sm text-label-mono-sm tracking-wider uppercase text-primary font-semibold">Wizard Progress</span>
        <span className="font-label-mono-sm text-label-mono-sm">Step {currentIndex + 1} of {steps.length} ({Math.round(progress)}% Completed)</span>
      </div>
      <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
        <motion.div
          className="bg-primary-container h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <ol className="grid grid-cols-2 md:grid-cols-5 gap-space-sm pt-space-xs">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`flex items-center gap-space-xs transition-all duration-200 ${
              completedSteps.includes(step.id)
                ? 'text-on-surface'
                : step.id === currentStep
                ? ''
                : 'text-on-surface-variant-weak opacity-75'
            }`}
            onClick={() => onStepClick?.(step.id)}
            style={{ cursor: onStepClick ? 'pointer' : 'default' }}
          >
            <motion.div
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                completedSteps.includes(step.id)
                  ? 'bg-state-accepted-bg text-state-accepted-text'
                  : step.id === currentStep
                  ? 'bg-primary text-on-primary animate-pulse-ring'
                  : 'bg-surface-container text-on-surface-variant-weak border border-border-subtle'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 50, duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
            >
              {completedSteps.includes(step.id) ? (
                <span className="material-symbols-outlined text-[15px]">check</span>
              ) : step.id === currentStep && step.icon ? (
                <span className="text-[15px]">{step.icon}</span>
              ) : (
                <span className="font-label-mono-sm text-label-mono-sm">{index + 1}</span>
              )}
            </motion.div>
            <div className="flex flex-col min-w-0">
              <span className={`font-label-mono-sm text-label-mono-sm ${completedSteps.includes(step.id) ? 'text-on-surface-variant' : step.id === currentStep ? 'text-primary font-semibold' : 'text-on-surface-variant-weak'}`}>
                {step.shortLabel || `0${index + 1}. ${step.label.split(' ').slice(0, 2).join(' ').toUpperCase()}`}
              </span>
              <span className={`font-headline-sm text-[13px] leading-tight truncate ${step.id === currentStep ? 'text-primary font-semibold' : 'text-on-surface-variant-weak'}`}>
                {step.label}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}