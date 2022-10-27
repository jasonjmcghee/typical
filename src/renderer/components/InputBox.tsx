import {
  DetailedHTMLProps,
  HTMLAttributes,
  MutableRefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import { ActionItem, CommandHelper, CommandPalette } from './CommandPalette';

type InputBoxProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  value: string;
  onChangeValue: (val: string) => void;
  onSubmitValue: () => void;
  history: MutableRefObject<string[]>;
  refocusRef?: MutableRefObject<() => void>;
  prepareSaveSearch?: (search: string) => string;
  alignBottom?: boolean;
  hideHistory?: boolean;
};

function InputBox({
  title,
  value,
  onChangeValue,
  onSubmitValue,
  history,
  refocusRef,
  alignBottom,
  prepareSaveSearch = (search) => search,
  hideHistory = false,
}: InputBoxProps) {
  const changeValue = useCallback(
    (val: string) => {
      onChangeValue(val);
    },
    [onChangeValue]
  );

  const historyItems = hideHistory ? [] : history.current;

  return (
    <CommandPalette
      alignBottom={alignBottom}
      refocusRef={refocusRef}
      autoSelectInitialInputText
      autoSelectFirstOption={false}
      onCommand={(command) => {
        if (CommandHelper.isNavigate(command)) {
          changeValue(command.url);
          onSubmitValue();
        }
      }}
      commands={historyItems.map((h) => ({
        item: h,
        command: { type: 'navigate', url: h },
      }))}
      onChangeValue={changeValue}
      onNoResults={(search: string) => {
        if (!search || hideHistory) {
          return null;
        }
        if (!hideHistory) {
          historyItems.push(prepareSaveSearch(search));
        }
        return {
          item: search,
          command: { type: 'navigate', url: search },
        };
      }}
      title={title}
      initialValue={value}
    />
  );
}

export { InputBox };
