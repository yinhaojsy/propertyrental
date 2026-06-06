import type { InputHTMLAttributes } from 'react';

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
};

export function NumberInput({ value, onValueChange, className, onWheel, ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onValueChange(null);
          return;
        }
        const parsed = Number(raw);
        onValueChange(Number.isNaN(parsed) ? null : parsed);
      }}
      onWheel={(e) => {
        e.currentTarget.blur();
        onWheel?.(e);
      }}
      className={className}
      {...rest}
    />
  );
}
