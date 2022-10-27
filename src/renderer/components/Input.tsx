import { useEffect, useRef } from 'react';

interface InputProps {
  className?: string;
  value: string;
  setValue: (value: string) => void;
  autoFocus?: boolean;
  autoSelect?: boolean;
}

export const Input = ({
  value,
  setValue,
  className,
  autoFocus,
  autoSelect,
}: InputProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      autoFocus={autoFocus}
      className={className}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Start Typing..."
    />
  );
};
