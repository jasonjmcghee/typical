import classNames from 'classnames';
import Fuse from 'fuse.js';
import {
  CSSProperties,
  DetailedHTMLProps,
  HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import { KeyPress, useKeyPressEffect } from '../hooks/useKeyPress';
import styles from './CommandPalette.module.scss';
import { NodeHelper, TNodeDetails } from './Node';

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
  return <div onBlur={() => onHide()}>{shown && children}</div>;
};

interface ActionItem {
  item: string;
  command: Command;
  shortcut?: KeyPress;
}

type CommandType = 'setBackground' | 'addNode' | 'copyLink';

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

const commands: ActionItem[] = [
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
}

type CommandPaletteProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  CommandPaletteExtraProps;

const CommandPalette = ({ onCommand }: CommandPaletteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [availableItems, setAvailableItems] = useState<ActionItem[]>(commands);
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

  const addItem = (item: ActionItem) => {
    setAvailableItems([item, ...availableItems]);
  };

  useKeyPressEffect(() => {
    setSelectedIndex((selectedIndex + 1) % searchResults.length);
  }, 'ArrowDown');
  useKeyPressEffect(() => {
    setSelectedIndex(
      (selectedIndex - 1 + searchResults.length) % searchResults.length
    );
  }, 'ArrowUp');
  useKeyPressEffect(() => {
    let item = searchResults[selectedIndex];

    if (!item) {
      const nodeData = NodeHelper.webview(searchValue);
      item = {
        item: `New Browser: ${searchValue}`,
        command: CommandHelper.addNode(nodeData),
      };
      addItem(item);
    }

    if (item) {
      onCommand(item.command);
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
      <div className={styles.commandPaletteResults}>
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
    </div>
  );
};

export {
  CommandPalette,
  OpenOnKeyPress,
  CloseWithEscape,
  CommandHelper,
  Command,
};
