import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import {
  CSSProperties,
  HTMLAttributes,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PanZoom } from 'panzoom';
import WebviewTag = Electron.WebviewTag;
import { ArrowLeftIcon, ArrowPathIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/solid';

import styles from './Node.module.scss';

type TNode = {
  nodeDetails: TNodeDetails;
  x: number;
  y: number;
  // eslint-disable-next-line react/require-default-props
  width?: number;
  // eslint-disable-next-line react/require-default-props
  height?: number;

  // eslint-disable-next-line react/require-default-props
  hide?: boolean;

  isSelected: () => boolean;
  onChangeSelection: (selected: boolean) => void;

  panZoomRef: MutableRefObject<PanZoom | null>;

  readonly add: (details: TNodeDetails) => void;
  readonly remove: () => void;
};

function updateStyle(webview: HTMLWebViewElement) {
  const style = webview.shadowRoot?.querySelector('iframe')?.style;
  if (style) {
    style.borderRadius = '0 0 6px 6px';
  }
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, 300);
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );
  return debouncedValue;
}

function useForceUpdate() {
  const [, setValue] = useState(0);
  return () => setValue((val) => val + 1);
}

const useDebouncedEffect = (effect, deps, delay) => {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...(deps || []), delay]);
};

interface ITextNode {
  type: 'text';
  text: string;
}

interface IWebviewNode {
  type: 'webview';
  url: string;
}

interface ImageNode {
  type: 'image';
  url: string;
  alt: undefined | string;
}

type TNodeDetails = ITextNode | IWebviewNode | ImageNode;
class NodeHelper {
  static isNode(n: any): n is TNodeDetails {
    return 'type' in n;
  }

  static text(text: string): ITextNode {
    return { text, type: 'text' };
  }

  static isText(n: any): n is ITextNode {
    return NodeHelper.isNode(n) && n.type === 'text';
  }

  static webview(url: string): IWebviewNode {
    let finalUrl = url;
    if (!url.includes('://')) {
      finalUrl = `https://${url}`;
    }
    return { url: finalUrl, type: 'webview' };
  }

  static isWebview(n: any): n is IWebviewNode {
    return NodeHelper.isNode(n) && n.type === 'webview';
  }

  static image(url: string, alt?: string): ImageNode {
    return { url, alt, type: 'image' };
  }

  static isImage(n: any): n is ImageNode {
    return NodeHelper.isNode(n) && n.type === 'image';
  }
}

interface GenericNodeProps {
  remove: () => void;
  selected: undefined | boolean;
  onChangeSelection: (selected: boolean) => void;
  ignoreInput: undefined | boolean;
}

interface CompNodeProps {
  add: (nodeDetails: TNodeDetails) => void;
  remove: () => void;
  selected: undefined | boolean;
  onChangeSelection: (selected: boolean) => void;
  ignoreInput: undefined | boolean;
}

const GenericNode = ({
  remove,
  selected,
  onChangeSelection,
  ignoreInput,
  children,
}: GenericNodeProps & HTMLAttributes<HTMLDivElement>) => {
  const style: CSSProperties = {
    width: '-webkit-fill-available',
    height: '-webkit-fill-available',
    borderRadius: '6px',
  };

  if (!selected || ignoreInput) {
    style.pointerEvents = 'none';
  }

  if (selected) {
    style.border = '4px solid rgba(0, 112, 243, 0.85)';
  }

  return (
    <div
      style={{
        height: '-webkit-fill-available',
        width: '-webkit-fill-available',
      }}
      onBlur={() => onChangeSelection(false)}>
      <div
        className="generic-navbar"
        style={{
          position: 'absolute',
          top: '12px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          width: '-webkit-fill-available',
          paddingLeft: '6px',
          paddingRight: '6px',
          gap: '20px',
          placeContent: 'flex-end'
        }}
      >
        <button
          type="button"
          style={{ padding: 0, width: '24px', color: 'white', background: 'transparent' }}
          onClick={(event) => {
            remove();
            event.preventDefault();
          }}
        >
          <XMarkIcon />
        </button>
      </div>
      <div style={style} onFocus={() => onChangeSelection(true)}>
        {children}
      </div>
    </div>
  );
};

const Webview = ({
  url,
  add,
  remove,
  selected,
  onChangeSelection,
  ignoreInput,
}: CompNodeProps & { url: string }) => {
  const forceUpdate = useForceUpdate();
  const webviewRef = useRef<WebviewTag>(null);
  const [urlValue, setUrlValue] = useState<string>(url);

  useEffect(() => {
    if (webviewRef.current !== null) {
      updateStyle(webviewRef.current);
      webviewRef.current.addEventListener('new-window', async (event) => {
        add(NodeHelper.webview(event.url));
      });
      webviewRef.current.addEventListener('did-navigate', async () => {
        forceUpdate();
      });
    }
  }, [add]);

  const style: CSSProperties = {
    width: '-webkit-fill-available',
    height: '-webkit-fill-available',
  };

  if (!selected || ignoreInput) {
    style.pointerEvents = 'none';
  }

  if (selected) {
    style.border = '4px solid rgba(0, 112, 243, 0.85)';
  }

  return (
    <>
      <div
        className="webview-navbar"
        style={{
          position: 'absolute',
          top: '12px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          width: '-webkit-fill-available',
          paddingLeft: '6px',
          paddingRight: '6px',
          gap: '20px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            type="button"
            style={{
              padding: 0,
              width: '24px',
              background: 'transparent',
              color: webviewRef.current?.canGoBack() ? 'white' : 'grey',
            }}
            onClick={(event) => {
              webviewRef.current?.goBack();
              event.preventDefault();
              forceUpdate();
            }}
          >
            <ArrowLeftIcon />
          </button>
          <button
            type="button"
            style={{
              padding: 0,
              width: '24px',
              background: 'transparent',
              color: webviewRef.current?.canGoForward() ? 'white' : 'grey',
            }}
            onClick={(event) => {
              webviewRef.current?.goForward();
              event.preventDefault();
              forceUpdate();
            }}
          >
            <ArrowRightIcon />
          </button>
          <button
            type="button"
            style={{
              padding: 0,
              width: '24px',
              background: 'transparent',
              color: 'white',
            }}
            onClick={(event) => {
              webviewRef.current?.reload();
              event.preventDefault();
              forceUpdate();
            }}
          >
            <ArrowPathIcon />
          </button>
        </div>
        <form
          style={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
          }}
          onSubmit={(event) => {
            event.preventDefault();
            webviewRef.current?.loadURL(urlValue);
          }}
        >
          <input
            style={{
              color: 'white',
              background: '#33373b',
              width: '100%',
              maxWidth: '500px',
              borderRadius: '6px',
              border: '1px solid #555555',
              textAlign: 'center',
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
            }}
            type="text"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
          />
          <button
            type="submit"
            style={{ display: 'none', position: 'absolute' }}
          />
        </form>
        <div>
          <button
            type="button"
            style={{
              padding: 0,
              width: '24px',
              color: 'white',
              background: 'transparent',
            }}
            onClick={(event) => {
              remove();
              event.preventDefault();
            }}
          >
            <XMarkIcon />
          </button>
        </div>
      </div>
      <webview
        ref={webviewRef}
        style={style}
        src={url}
        onLoad={(e) => {
          updateStyle(e.target as HTMLWebViewElement);
        }}
      />
    </>
  );
};

function CompNode({
  nodeDetails,
  add,
  ...rest
}: CompNodeProps & {
  nodeDetails: TNodeDetails;
}) {
  if (NodeHelper.isText(nodeDetails)) {
    return (
      <GenericNode {...rest}>
        <textarea
          className={styles.textNode}
          defaultValue={nodeDetails.text}
        />
      </GenericNode>
    );
  }

  if (NodeHelper.isWebview(nodeDetails)) {
    return <Webview add={add} url={nodeDetails.url} {...rest} />;
  }

  if (NodeHelper.isImage(nodeDetails)) {
    return (
      <GenericNode {...rest}>
        <img src={nodeDetails.url} alt={nodeDetails.alt || 'none'} />
      </GenericNode>
    );
  }
  return null;
}

function WebNode({
  nodeDetails,
  x,
  y,
  panZoomRef,
  add,
  remove,
  isSelected,
  onChangeSelection,
  width = 640,
  height = 480,
  hide = false,
}: TNode) {
  const forceUpdate = useForceUpdate();
  const nodeRectDiv = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x, y });
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const selected = isSelected();

  useEffect(() => {
    panZoomRef.current?.on('zoom', () => {
      forceUpdate();
    });
  }, []);

  const scale = panZoomRef.current?.getTransform().scale ?? 1;

  const globalStyle: CSSProperties = {};
  if (hide) {
    globalStyle.display = 'none';
  }

  const frameStyle: CSSProperties = {
    position: 'absolute',
    background: '#33373b',
    padding: '48px 2px 2px 2px',
    borderRadius: '6px',
    // position: 'relative',
    boxShadow: '0 10px 16px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)',
  };

  const onSelected = (s: boolean) => {
    onChangeSelection(s);
  };

  return (
    <div
      ref={nodeRectDiv}
      style={globalStyle}
      onBlur={() => onSelected(false)}
      onDoubleClick={() => {
        const div = nodeRectDiv.current;
        if (div === null) return;
        panZoomRef.current?.showRectangle(div.getBoundingClientRect());
      }}
    >
      <Draggable
        scale={scale}
        position={position}
        onStart={(event) => {
          setDragging(true);
          if (!resizing) {
            event.stopPropagation();
          }
        }}
        onStop={(_, { x: x_, y: y_ }) => {
          if (!resizing) {
            setPosition({ x: x_, y: y_ });
          }
          setDragging(false);
        }}
        axis={resizing ? 'none' : 'both'}
      >
        <Resizable
          scale={scale}
          // enable={{
          //   bottom: true,
          //   right: true,
          //   bottomRight: true,
          // }}
          onResizeStart={() => setResizing(true)}
          onResizeStop={(event) => {
            setResizing(false);
            event.stopPropagation();
          }}
          onResize={(event, direction, elementRef, delta) => {
            let { x: newX, y: newY } = position;
            if (['topLeft', 'bottomLeft', 'left'].includes(direction)) {
              newX -= delta.width / scale;
            }
            if (['topLeft', 'topRight', 'top'].includes(direction)) {
              newY -= delta.height / scale;
            }
            setPosition({ x: newX, y: newY });
            event.stopPropagation();
          }}
          defaultSize={{ width, height }}
          style={frameStyle}
        >
          {!selected && (
            <div
              onMouseDown={(event) => {
                if (!event.ctrlKey) {
                  onSelected(true);
                  event.stopPropagation();
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                maxHeight: '-webkit-fill-available',
                maxWidth: '-webkit-fill-available',
              }}
            />
          )}
          <CompNode
            add={add}
            remove={remove}
            selected={selected}
            onChangeSelection={onSelected}
            nodeDetails={nodeDetails}
            ignoreInput={dragging || resizing}
          />
        </Resizable>
      </Draggable>
    </div>
  );
}

export {
  WebNode,
  TNode,
  TNodeDetails,
  ITextNode,
  IWebviewNode,
  ImageNode,
  NodeHelper,
};
