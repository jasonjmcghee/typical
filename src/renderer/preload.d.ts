import { Channels } from 'main/preload';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface WebviewRecipe {
  url: string;
  position?: Position;
}

interface TextRecipe {
  text: string;
  position?: Position;
}

declare global {
  interface Window {
    electron: {
      setTitle: (title: string) => void;
      onAddWebview: (func: (objs: WebviewRecipe[]) => void) => void;
      onAddText: (func: (objs: TextRecipe[]) => void) => void;
      initialLoadFinished: () => void;
      onOpenCommandPalette: (func: () => void) => void;
    };
  }
}

export { WebviewRecipe, TextRecipe, Position, Size };
