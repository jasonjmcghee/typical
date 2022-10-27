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
      onRequestEditInput: (func: () => void) => void;
      onCopyWorkspaceToClipboard: (func: () => void) => void;
      onFocusApp: (func: () => void) => void;
      onZoomIn: (func: () => void) => void;
      onZoomOut: (func: () => void) => void;
      onZoomInAll: (func: () => void) => void;
      onZoomOutAll: (func: () => void) => void;
      onOpenUrl: (func: (url: string) => void) => void;
      onSetPreloadScript: (func: (src: string) => void) => void;
      version: string;
    };
    preloadScript: string;
  }
}

export { WebviewRecipe, TextRecipe, Position, Size };
