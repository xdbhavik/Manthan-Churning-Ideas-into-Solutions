import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, useState } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      disabled,
      required,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="font-headline-sm text-headline-sm text-on-surface mb-space-xs flex items-center justify-between">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 pointer-events-none text-on-surface-variant-weak">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={errorId || helperId}
            onChange={onChange}
            className={`input-field ${leftIcon ? 'pl-9' : ''} ${rightIcon ? 'pr-9' : ''} ${error ? 'error' : ''}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 pointer-events-none text-on-surface-variant-weak">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-space-xs font-body-sm text-body-sm text-error flex items-center gap-1" role="alert">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant-weak">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      maxLength,
      showCharCount = true,
      fullWidth = true,
      className = '',
      id,
      disabled,
      required,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText && !error ? `${textareaId}-helper` : undefined;
    const charCountId = maxLength && showCharCount ? `${textareaId}-count` : undefined;

    const [length, setLength] = useState(0);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLength(value.length);
      onChange?.(value);
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="font-headline-sm text-headline-sm text-on-surface mb-space-xs flex items-center justify-between">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={[errorId, helperId, charCountId].filter(Boolean).join(' ') || undefined}
            maxLength={maxLength}
            onChange={handleChange}
            className={`input-field min-h-[100px] resize-y ${error ? 'error' : ''} pr-24`}
            {...props}
          />
          {maxLength && showCharCount && (
            <div id={charCountId} className="absolute bottom-2 right-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant-weak">
              {length} / {maxLength}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-space-xs font-body-sm text-body-sm text-error flex items-center gap-1" role="alert">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant-weak">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';