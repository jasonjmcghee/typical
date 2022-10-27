import { MutableRefObject, useEffect, useRef } from 'react';

interface InputProps {
  className?: string;
  value: string;
  setValue: (value: string) => void;
  autoFocus?: boolean;
  autoSelect?: boolean;
  refocusRef?: MutableRefObject<() => void>;
}

export const Input = ({
  value,
  setValue,
  className,
  autoFocus,
  autoSelect,
  refocusRef,
}: InputProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoSelect) {
      ref.current?.select();
    }
  }, [autoSelect]);

  useEffect(() => {
    if (refocusRef) {
      refocusRef.current = () => {
        setTimeout(() => {
          ref.current?.focus();
        }, 0);
      };
    }
  }, [refocusRef]);

  return (
    <input
      ref={ref}
      autoFocus={autoFocus}
      className={className}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        if (refocusRef) {
          setTimeout(() => {
            ref.current?.focus();
          }, 10);
        }
      }}
      placeholder="Start Typing..."
    />
  );
};
