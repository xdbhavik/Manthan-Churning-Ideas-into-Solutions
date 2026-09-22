import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';

export interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
}

export function OTPInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = false,
  className = '',
  inputClassName = '',
}: OTPInputProps) {
  const [inputs, setInputs] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(length).fill(null));
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    const vals = value.split('').slice(0, length);
    setInputs((prev) => prev.map((_, idx) => vals[idx] || ''));
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
      const newInputs = [...inputs];
      newInputs[index] = val;
      setInputs(newInputs);

      const newValue = newInputs.join('');
      onChange?.(newValue);

      if (val && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newValue.length === length) {
        onComplete?.(newValue);
      }
    },
    [inputs, length, onChange, onComplete]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !inputs[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [inputs, length]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
      const newInputs = pasted.split('').map((v) => v || '');
      while (newInputs.length < length) newInputs.push('');
      setInputs(newInputs);
      const newValue = newInputs.join('');
      onChange?.(newValue);
      if (newValue.length === length) {
        onComplete?.(newValue);
        inputRefs.current[length - 1]?.focus();
      } else {
        inputRefs.current[newInputs.findIndex((v) => !v)]?.focus() || inputRefs.current[length - 1]?.focus();
      }
    },
    [length, onChange, onComplete]
  );

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="One-time password"
    >
      {Array.from({ length }).map((_, index) => (
        <motion.input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={inputs[index]}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          disabled={disabled}
          autoComplete="one-time-code"
          aria-label={`Digit ${index + 1}`}
          className={`otp-input ${inputClassName} ${focusedIndex === index ? 'active' : ''} ${inputs[index] ? 'filled' : ''} ${error ? 'error' : ''}`}
          whileFocus={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={error ? { x: [-8, 8, -8, 8, 0] } : undefined}
          transition={{ duration: 0.05 }}
        />
      ))}
      <input
        type="hidden"
        value={inputs.join('')}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}