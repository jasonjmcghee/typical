import {
  DetailedHTMLProps,
  HTMLAttributes,
  MutableRefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import { ActionItem, CommandHelper, CommandPalette } from './CommandPalette';
import { buildUrl } from '../util';

type InputBoxProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  value: string;
  onChangeValue: (val: string) => void;
  onSubmitValue: () => void;
  history: MutableRefObject<string[]>;
};

function InputBox({
  value,
  onChangeValue,
  onSubmitValue,
  history,
}: InputBoxProps) {
  const changeValue = useCallback(
    (val: string) => {
      onChangeValue(val);
    },
    [onChangeValue]
  );

  return (
    <CommandPalette
      autoSelectInitialInputText
      autoSelectFirstOption={false}
      onCommand={(command) => {
        if (CommandHelper.isNavigate(command)) {
          changeValue(command.url);
          onSubmitValue();
        }
      }}
      commands={history.current.map((h) => ({
        item: h,
        command: { type: 'navigate', url: h },
      }))}
      onChangeValue={changeValue}
      onNoResults={(search: string) => {
        history.current.push(buildUrl(search));
        return {
          item: search,
          command: { type: 'navigate', url: search },
        };
      }}
      title="URL"
      initialValue={value}
    />
  );
}

export { InputBox };
