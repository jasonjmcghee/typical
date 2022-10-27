import {
  DetailedHTMLProps,
  HTMLAttributes,
  useCallback,
  useState,
} from 'react';
import styles from './InputBox.module.scss';
import { Input } from './Input';

type InputBoxProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  value: string;
  onChangeValue: (val: string) => void;
  onSubmitValue: () => void;
};

function InputBox({ value, onChangeValue, onSubmitValue }: InputBoxProps) {
  const changeValue = useCallback(
    (val: string) => {
      onChangeValue(val);
    },
    [onChangeValue]
  );

  return (
    <div className={styles.inputBox}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitValue();
        }}
      >
        <Input
          autoFocus
          value={value}
          setValue={changeValue}
          className={styles.inputBoxInput}
        />
        <button
          type="submit"
          style={{ display: 'none', position: 'absolute' }}
        />
      </form>
    </div>
  );
}

export { InputBox };
