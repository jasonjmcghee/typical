import classNames from 'classnames';
import Fuse from 'fuse.js';
import { DetailedHTMLProps, HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";
import { KeyPress, useKeyPressEffect } from '../hooks/useKeyPress';
import styles from './CommandPalette.module.scss';

interface SelectableProps {
  value: string;
  focused: boolean;
  onFocus?: () => void;
  onSelect?: () => void;
  shortcut?: KeyPress;
}

const SelectableItem = ({
  value,
  focused,
  onFocus,
  onSelect,
  shortcut,
}: SelectableProps) => {
  useKeyPressEffect(() => {
    if (onSelect) {
      onSelect();
    }
  }, shortcut);
  return (
    <div
      className={classNames(
        styles.commandPaletteResult,
        styles.commandPaletteItem,
        { [styles.focused]: focused }
      )}
      onMouseEnter={() => onFocus && onFocus()}
      onClick={() => {
        if (onSelect) {
          onSelect();
        }
      }}
    >
      <div>{value}</div>
      {shortcut && (
        <div className={styles.shortcut}>
          {`${shortcut.cmdCtrl ? '⌘ + ' : ''}${shortcut.key}`}
        </div>
      )}
    </div>
  );
};

interface InputProps {
  className?: string;
  value: string;
  setValue: (value: string) => void;
  autoFocus?: boolean;
}

const Input = ({ value, setValue, className, autoFocus }: InputProps) => {
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

type OpenOnKeyPressProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  {shortcut: KeyPress};

const OpenOnKeyPress = ({
  shortcut,
  children,
}: OpenOnKeyPressProps) => {
  const [shown, setShown] = useState(false);
  useKeyPressEffect(() => {
    if (!shown) {
      setShown(true);
    }
  }, shortcut);
  useKeyPressEffect(() => {
    if (shown) {
      setShown(false);
    }
  }, 'Escape');
  return <div onBlur={() => setShown(false)}>{shown && children}</div>;
};

interface ActionItem {
  item: string;
  command: () => void;
  shortcut?: KeyPress;
}

interface CommandPaletteExtraProps {
  onCommand: (cmd: string) => void;
}

type CommandPaletteProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  CommandPaletteExtraProps;

const CommandPalette = ({ onCommand }: CommandPaletteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [availableItems, _] = useState<ActionItem[]>([
    {
      item: 'Alpha',
      command: () => onCommand('Alpha'),
      shortcut: new KeyPress({ key: 'a', cmdCtrl: true }),
    },
    { item: 'Beta', command: () => onCommand('Beta') },
    {
      item: 'Gamma',
      command: () => onCommand('Gamma'),
      shortcut: new KeyPress({ key: 'g', cmdCtrl: true }),
    },
    { item: 'Epsilon', command: () => onCommand('Epsilon') },
  ]);
  const fuseList = useRef<Fuse<ActionItem>>(
    new Fuse(availableItems, { keys: ['item'] })
  );
  const [searchResults, setSearchResults] =
    useState<ActionItem[]>(availableItems);

  useEffect(() => {
    fuseList.current = new Fuse<ActionItem>(availableItems, { keys: ['item'] });
  }, [availableItems]);

  useEffect(() => {
    let results = availableItems;
    if (searchValue.length > 0) {
      results = fuseList.current
        .search(searchValue.trim())
        .map(({ item }) => item);
    }
    if (results !== searchResults) {
      setSearchResults(results);
      setSelectedIndex(0);
    }
  }, [searchValue, availableItems]);

  useKeyPressEffect(() => {
    setSelectedIndex((selectedIndex + 1) % searchResults.length);
  }, 'ArrowDown');
  useKeyPressEffect(() => {
    setSelectedIndex(
      (selectedIndex - 1 + searchResults.length) % searchResults.length
    );
  }, 'ArrowUp');
  useKeyPressEffect(() => {
    const item = searchResults[selectedIndex];
    if (item) {
      item?.command();
    } else {
      // TODO: Fix hack
      onCommand(searchValue);
    }
  }, 'Enter');

  return (
    <div className={styles.commandPalette}>
      <div
        className={classNames(
          styles.commandPaletteItem,
          styles.commandPaletteTitle
        )}
      >
        Actions
      </div>
      <div className={styles.commandPaletteItem}>
        <div className={styles.commandPaletteDivider} />
      </div>
      <Input
        autoFocus
        value={searchValue}
        setValue={setSearchValue}
        className={classNames({
          [styles.commandPaletteInput]: true,
          [styles.commandPaletteItem]: true,
        })}
      />
      {searchResults.length ? (
        searchResults.map((s, i) => (
          <SelectableItem
            key={s.item}
            value={s.item}
            focused={selectedIndex === i}
            onFocus={() => {
              setSelectedIndex(i);
            }}
            onSelect={s.command}
            shortcut={s.shortcut}
          />
        ))
      ) : (
        <div
          className={classNames(
            styles.commandPaletteResult,
            styles.commandPaletteItem
          )}
        >
          {searchValue}
        </div>
      )}
    </div>
  );
};

export { CommandPalette, OpenOnKeyPress };
