import { useState, useEffect } from 'react';

interface IKeyPress {
  key: string;
  cmdCtrl?: boolean;
}

class KeyPress implements IKeyPress {
  cmdCtrl: boolean = false;

  key: string;

  constructor(definition: IKeyPress) {
    this.key = definition.key;
    this.cmdCtrl = !!definition.cmdCtrl;
  }

  isActivated({ key, metaKey, ctrlKey }: KeyboardEvent) {
    return key === this.key && (metaKey || ctrlKey) === this.cmdCtrl;
  }
}

// interface KeyEvent {
//     key: string;
//     metaKey?: boolean;
//     controlKey?: boolean;
// }

function useKeyPress(
  targetKeyRaw?: KeyPress | string,
  propagate = false
): boolean {
  const targetKey: KeyPress | undefined =
    typeof targetKeyRaw === 'string'
      ? new KeyPress({ key: targetKeyRaw })
      : targetKeyRaw;

  // State for keeping track of whether key is pressed
  const [keyPressed, setKeyPressed] = useState(false);
  // If pressed key is our target key then set to true
  function downHandler(event: KeyboardEvent): void {
    if (targetKey?.isActivated(event)) {
      if (!propagate) {
        event.preventDefault();
      }
      setKeyPressed(true);
    }
  }
  // If released key is our target key then set to false
  const upHandler = (event: KeyboardEvent): void => {
    if (targetKey?.isActivated(event)) {
      if (!propagate) {
        event.preventDefault();
      }
      setKeyPressed(false);
    }
  };
  // Add event listeners
  useEffect(() => {
    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, []); // Empty array ensures that effect is only run on mount and unmount
  return !!targetKey && keyPressed;
}

function useKeyPressEffect(
  onKeyPress: () => void,
  targetKey?: KeyPress | string,
  propagate = false
) {
  const keyPress = useKeyPress(targetKey, propagate);
  useEffect(() => {
    if (keyPress) {
      onKeyPress();
    }
  }, [keyPress]);
}

export { useKeyPress, useKeyPressEffect, KeyPress };
