import classNames from 'classnames';
import Fuse from 'fuse.js';
import {
  CSSProperties,
  DetailedHTMLProps,
  HTMLAttributes,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { KeyPress, useKeyPressEffect } from '../hooks/useKeyPress';
import styles from './CommandPalette.module.scss';
import { NodeHelper, TNodeDetails } from './Node';
import { Input } from './Input';

interface SelectableProps {
  id: string;
  value: string;
  focused: boolean;
  onFocus?: () => void;
  onSelect?: () => void;
  shortcut?: KeyPress;
}

const SelectableItem = ({
  id,
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
      id={id}
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

type OpenOnKeyPressProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & { shortcut: KeyPress };

const OpenOnKeyPress = ({ shortcut, children }: OpenOnKeyPressProps) => {
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

type CloseWithEscapeProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & { shown: boolean; onHide: () => void };

const CloseWithEscape = ({ shown, onHide, children }: CloseWithEscapeProps) => {
  useKeyPressEffect(() => {
    onHide();
  }, 'Escape');
  const ref = useRef<HTMLDivElement>(null);
  return <div ref={ref}>{shown && children}</div>;
};

interface ActionItem {
  item: string;
  command: Command;
  shortcut?: KeyPress;
}

type CommandType = 'setBackground' | 'addNode' | 'copyLink' | 'navigate';

interface Command {
  type: CommandType;
}

interface AddNodeCommand extends Command {
  type: 'addNode';
  details: TNodeDetails;
}

interface SetBackground extends Command {
  type: 'setBackground';
  style: CSSProperties;
}

interface CopyLink extends Command {
  type: 'copyLink';
}

interface Navigate extends Command {
  type: 'navigate';
  url: string;
}

class CommandHelper {
  static isCommand(n: any): n is Command {
    return 'type' in n;
  }

  static addNode(details: TNodeDetails): AddNodeCommand {
    return { type: 'addNode', details };
  }

  static isAddNode(n: any): n is AddNodeCommand {
    return CommandHelper.isCommand(n) && n.type === 'addNode';
  }

  static setBackground(style: CSSProperties): SetBackground {
    return { type: 'setBackground', style };
  }

  static isSetBackground(n: any): n is SetBackground {
    return CommandHelper.isCommand(n) && n.type === 'setBackground';
  }

  static copyLink(): CopyLink {
    return { type: 'copyLink' };
  }

  static isCopyLink(n: any): n is CopyLink {
    return CommandHelper.isCommand(n) && n.type === 'copyLink';
  }

  static navigate(): Navigate {
    return { type: 'navigate' };
  }

  static isNavigate(n: any): n is Navigate {
    return CommandHelper.isCommand(n) && n.type === 'navigate';
  }
}

const browser = (name: string, url: string) => ({
  item: `New Browser: ${name}`,
  command: CommandHelper.addNode(NodeHelper.webview(url)),
});

const background = (name: string, value: string) => ({
  item: `Set Background: ${name}`,
  command: CommandHelper.setBackground({
    background: `${value} no-repeat center / cover`,
  }),
});

const mainCommands: ActionItem[] = [
  {
    item: 'New Text Node',
    command: CommandHelper.addNode(NodeHelper.text('A new text node!')),
  },
  browser('Google', 'https://www.google.com'),
  browser('DuckDuckGo', 'https://duckduckgo.com'),
  background(
    'Coral Gradient',
    'linear-gradient(224.03deg, #FF8575 -4%, #DD439F 93.89%)'
  ),
  background(
    'Magic Gradient',
    'linear-gradient(224.03deg, #FF75A7 -4%, #5E8BFF 93.89%)'
  ),
  background(
    'Sunset Gradient',
    'linear-gradient(224.03deg, #FEB47B -4%, #FF7E5F 93.89%)'
  ),
  background(
    'Pyramid Pattern (Image)',
    'url(https://images.unsplash.com/photo-1524169113253-c6ba17f68498?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3270&q=80)'
  ),
  background(
    'Colored Mesh on Steel (Image)',
    'url(https://images.unsplash.com/photo-1576502200916-3808e07386a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3265&q=80)'
  ),
  background(
    'Round Concrete Columns (Image)',
    'url(https://images.unsplash.com/photo-1628260905419-072bca352f25?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3260&q=80)'
  ),
  background(
    'Forest (Image)',
    'url(https://images.unsplash.com/photo-1568864453925-206c927dab0a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3270&q=80)'
  ),
  background(
    'Volcano (Image)',
    'url(https://images.unsplash.com/photo-1619450535979-6939a4690888?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3132&q=80)'
  ),
  background(
    'Foggy Lake (Image)',
    'url(https://images.unsplash.com/photo-1560996025-95b43d543770?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=3132&q=80)'
  ),
];

interface CommandPaletteExtraProps {
  onCommand: (command: Command) => void;
  commands: ActionItem[];
  title: string;
  onNoResults: (search: string) => ActionItem | null;
  allowSelectNone?: boolean;
  autoSelectFirstOption?: boolean;
  autoSelectInitialInputText?: boolean;
  onChangeValue?: (value: string) => void;
  initialValue?: string;
  refocusRef?: MutableRefObject<() => void>;
  alignBottom?: boolean;
}

type CommandPaletteProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  CommandPaletteExtraProps;

const CommandPalette = ({
  onCommand,
  commands,
  title,
  onNoResults,
  alignBottom = false,
  onChangeValue = () => {},
  refocusRef,
  initialValue = '',
  // Allows the user to submit any input
  allowSelectNone = true,
  // Automatically picks the top command
  // Always `true` if `allowSelectNone` is false
  autoSelectFirstOption = false,
  autoSelectInitialInputText = false,
}: CommandPaletteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(
    autoSelectFirstOption ? 0 : -1
  );
  const [searchValue, setSearchValue] = useState(initialValue);
  const [availableItems, setAvailableItems] = useState<ActionItem[]>(commands);
  const fuseList = useRef<Fuse<ActionItem>>(
    new Fuse(availableItems, { keys: ['item'], threshold: 0.5 })
  );
  const [searchResults, setSearchResults] =
    useState<ActionItem[]>(availableItems);
  const updateSearchValue = useCallback(
    (value: string) => {
      onChangeValue(value);
      setSearchValue(value);
    },
    [onChangeValue, setSearchValue]
  );

  const addItem = useCallback(
    (item: ActionItem) => {
      setAvailableItems([item, ...availableItems]);
    },
    [setAvailableItems]
  );

  const selectIndex = useCallback(
    (index: number, scrollIntoView = false) => {
      if (scrollIntoView && index >= 0 && index < searchResults.length) {
        const s = searchResults[index];
        const dom = document.getElementById(`item-${s.item}`);
        dom?.scrollIntoView();
      }
      setSelectedIndex(index);
    },
    [setSelectedIndex, searchResults]
  );

  const selectItem = useCallback(() => {
    let item;
    if (selectedIndex >= 0) {
      item = searchResults[selectedIndex];
    }

    if (!item) {
      item = onNoResults(searchValue);
      if (item) {
        addItem(item);
      }
    }

    if (item) {
      onCommand(item.command);
    }
  }, [
    addItem,
    onCommand,
    onNoResults,
    searchResults,
    searchValue,
    selectedIndex,
  ]);

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
      if (autoSelectFirstOption || !allowSelectNone) {
        selectIndex(0);
      }
    }
  }, [searchValue, availableItems]);

  useKeyPressEffect(
    () =>
      selectIndex(
        allowSelectNone && selectedIndex === searchResults.length - 1
          ? -1
          : (selectedIndex + 1) % searchResults.length,
        true
      ),
    'ArrowDown',
    false,
    true
  );
  useKeyPressEffect(
    () =>
      selectIndex(
        allowSelectNone && selectedIndex === searchResults.length - 1
          ? -1
          : (selectedIndex + 1) % searchResults.length,
        true
      ),
    'Tab',
    false,
    true
  );
  useKeyPressEffect(
    () => {
      return selectIndex(
        allowSelectNone && selectedIndex === 0
          ? -1
          : (selectedIndex === -1
              ? searchResults.length - 1
              : selectedIndex - 1) % searchResults.length,
        true
      );
    },
    'ArrowUp',
    false,
    true
  );

  useKeyPressEffect(selectItem, 'Enter');

  return (
    <div
      className={classNames({
        [styles.commandPalette]: true,
        [styles.alignBottom]: alignBottom,
      })}
    >
      <div
        className={classNames(
          styles.commandPaletteItem,
          styles.commandPaletteTitle
        )}
      >
        {title}
      </div>
      <div className={styles.commandPaletteItem}>
        <div className={styles.commandPaletteDivider} />
      </div>
      <Input
        autoFocus
        refocusRef={refocusRef}
        autoSelect={autoSelectInitialInputText}
        value={searchValue}
        setValue={updateSearchValue}
        className={classNames({
          [styles.commandPaletteInput]: true,
          [styles.commandPaletteItem]: true,
        })}
      />
      <div
        className={styles.commandPaletteResults}
        onMouseLeave={() => {
          if (!autoSelectFirstOption) {
            selectIndex(-1);
          }
        }}
      >
        {searchResults.length ? (
          searchResults.map((s, i) => (
            <SelectableItem
              id={`item-${s.item}`}
              key={s.item}
              value={s.item}
              focused={selectedIndex === i}
              onFocus={() => {
                selectIndex(i);
              }}
              onSelect={() => onCommand(s.command)}
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
    </div>
  );
};

export {
  mainCommands,
  CommandPalette,
  OpenOnKeyPress,
  CloseWithEscape,
  CommandHelper,
  Command,
  ActionItem,
};
