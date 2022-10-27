interface InputProps {
  className?: string;
  value: string;
  setValue: (value: string) => void;
  autoFocus?: boolean;
}

export const Input = ({
  value,
  setValue,
  className,
  autoFocus,
}: InputProps) => {
  return (
    <input
      autoFocus={autoFocus}
      className={className}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Start Typing..."
    />
  );
};
