import { Channels } from 'main/preload';

interface WebviewRecipe {
  url: string;
  x?: number;
  y?: number;
}

interface TextRecipe {
  text: string;
  x?: number;
  y?: number;
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

export { WebviewRecipe, TextRecipe };
