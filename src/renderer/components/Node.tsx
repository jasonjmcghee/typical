import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import {
  CSSProperties,
  HTMLAttributes,
  MutableRefObject,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PanZoom } from 'panzoom';
import WebviewTag = Electron.WebviewTag;
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  SignalSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

import styles from './Node.module.scss';
import { buildUrl } from '../util';

interface SerializableNodeMetadata {
  position: { x: number; y: number };
  size: { width: number; height: number };
  nodeDetails: TNodeDetails;
}

interface NodeMetadata extends SerializableNodeMetadata {
  centerOnNode: () => void;
  forceUpdate: () => void;
}

type MetadataLookup = { [id: string]: NodeMetadata };
type SerializableMetadataLookup = { [id: string]: SerializableNodeMetadata };

type TNode = {
  id: string;
  metadataLookup: MutableRefObject<MetadataLookup>;
  nodeDetails: TNodeDetails;
  startPosition: { x: number; y: number };
  startSize: { width: number; height: number };

  // eslint-disable-next-line react/require-default-props
  hide?: boolean;
  // eslint-disable-next-line react/require-default-props

  isSelected: () => boolean;
  onChangeSelection: (selected: boolean) => void;
  onSerialize: () => void;

  panZoomRef: MutableRefObject<PanZoom | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  panningRef: RefObject<boolean>;

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
    return { url: buildUrl(url), type: 'webview' };
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
  ignoreInput: undefined | boolean;
  onSerialize: () => void;
}

const GenericNode = ({
  remove,
  selected,
  onChangeSelection,
  ignoreInput,
  children,
}: GenericNodeProps & HTMLAttributes<HTMLDivElement>) => {
  return selected ? (
    <div
      style={{
        height: '-webkit-fill-available',
        width: '-webkit-fill-available',
        boxShadow: selected
          ? '0px 3px 6px -4px rgba(0, 0, 0, 0.12), ' +
            '0px 6px 16px rgba(0, 0, 0, 0.08), ' +
            '0px 9px 28px 8px rgba(0, 0, 0, 0.05)'
          : 'none',
      }}
    >
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
          placeContent: 'flex-end',
        }}
      >
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
      {/* <div style={style} onMouseDown={() => onChangeSelection(true)}> */}
      {children}
      {/* </div> */}
    </div>
  ) : (
    <>{children}</>
  );
};

function WebviewNavbarUrl({
  url,
  webviewRef,
  onUpdateUrl,
}: {
  url: string;
  webviewRef: RefObject<Electron.WebviewTag>;
  onUpdateUrl: (url: string) => void;
}) {
  const [urlValue, setUrlValue] = useState<string>(url);
  const updateUrl = (u: string) => {
    setUrlValue(u);
    onUpdateUrl(u);
  };
  useEffect(() => {
    if (webviewRef.current !== null) {
      webviewRef.current.addEventListener('did-navigate', async (event) => {
        updateUrl(event.url);
      });
    }
  }, []);

  return (
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
      onChange={(event) => updateUrl(event.target.value)}
    />
  );
}

function WebviewNavbar({
  url,
  onUpdateUrl,
  selected,
  webviewRef,
  remove,
}: {
  url: string;
  selected: undefined | boolean;
  onUpdateUrl: (url: string) => void;
  webviewRef: RefObject<Electron.WebviewTag>;
  remove: () => void;
}) {
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (webviewRef.current !== null) {
      webviewRef.current.addEventListener('dom-ready', async (event) => {
        setLoaded(true);
      });
    }
  }, []);

  return (
    <div className={`${styles.webviewNavbar} ${selected ? '' : styles.hide}`}>
      <div
        style={{
          top: -48,
          position: 'absolute',
          fontSize: '2em',
          cursor: 'default',
        }}
      >
        {loaded ? webviewRef.current?.getTitle() : ''}
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        <button
          type="button"
          style={{
            padding: 0,
            width: '24px',
            background: 'transparent',
            color: loaded && webviewRef.current?.canGoBack() ? 'white' : 'grey',
          }}
          onClick={(event) => {
            webviewRef.current?.stop();
            webviewRef.current?.goBack();
            event.preventDefault();
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
            color:
              loaded && webviewRef.current?.canGoForward() ? 'white' : 'grey',
          }}
          onClick={(event) => {
            webviewRef.current?.stop();
            webviewRef.current?.goForward();
            event.preventDefault();
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
          try {
            webviewRef.current?.stop();
            webviewRef.current?.loadURL(buildUrl(urlValue));
          } catch (e) {
            debugger;
          }
        }}
      >
        <WebviewNavbarUrl
          url={url}
          webviewRef={webviewRef}
          onUpdateUrl={onUpdateUrl}
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
  );
}

function RawWebview({
  webviewRef,
  style,
  src,
  onLoad,
}: {
  webviewRef: RefObject<WebviewTag>;
  style: CSSProperties;
  src: string;
  onLoad: (e) => void;
}) {
  return (
    <webview
      ref={webviewRef}
      style={style}
      src={src}
      webpreferences="nativeWindowOpen=true"
      allowpopups="true"
      onLoad={onLoad}
    />
  );
}

const Webview = ({
  url,
  add,
  remove,
  selected,
  ignoreInput,
  onUpdateUrl,
}: CompNodeProps & { url: string; onUpdateUrl: (url: string) => void }) => {
  const webviewRef = useRef<WebviewTag>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    if (webviewRef.current !== null) {
      updateStyle(webviewRef.current);
      // webviewRef.current.addEventListener('did-finish-load', async (event) => {
      //   setNotFound(false);
      // });
      webviewRef.current.addEventListener('new-window', async (event) => {
        add(NodeHelper.webview(event.url));
      });
      // webviewRef.current.addEventListener('did-navigate', async (event) => {
      //   setNotFound(false);
      // });
      webviewRef.current.addEventListener('did-fail-load', async () => {
        setNotFound(true);
      });
    }
  }, [add]);

  const style: CSSProperties = {
    width: '-webkit-fill-available',
    height: '-webkit-fill-available',
    boxShadow:
      '0px 3px 6px -4px rgba(0, 0, 0, 0.12), ' +
      '0px 6px 16px rgba(0, 0, 0, 0.08), ' +
      '0px 9px 28px 8px rgba(0, 0, 0, 0.05)',
  };

  const pointerStyles: CSSProperties = {};

  if (!selected || ignoreInput) {
    pointerStyles.pointerEvents = 'none';
  }

  return (
    <>
      <WebviewNavbar
        url={url}
        remove={remove}
        onUpdateUrl={onUpdateUrl}
        selected={selected}
        webviewRef={webviewRef}
      />
      {notFound ? (
        <div
          style={{
            ...style,
            ...pointerStyles,
            color: 'grey',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
            background: '#33373b',
            borderRadius: '6px',
          }}
        >
          {notFound && (
            <div>
              <SignalSlashIcon />
              Failed to load
            </div>
          )}
        </div>
      ) : (
        <div style={{ ...style, ...pointerStyles }}>
          <RawWebview
            webviewRef={webviewRef}
            style={style}
            src={url}
            onLoad={(e) => {
              updateStyle(e.target as HTMLWebViewElement);
            }}
          />
        </div>
      )}
    </>
  );
};

function CompNode({
  nodeDetails,
  add,
  selected,
  onSerialize,
  ...rest
}: CompNodeProps & {
  nodeDetails: TNodeDetails;
}) {
  if (NodeHelper.isText(nodeDetails)) {
    return (
      <GenericNode selected={selected} {...rest}>
        {selected ? (
          <textarea
            onMouseDown={(event) => event.stopPropagation()}
            className={styles.textNode}
            defaultValue={nodeDetails.text}
            onChange={(event) => {
              nodeDetails.text = event.target.value;
              onSerialize();
            }}
          />
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap' }} className={styles.textNode}>
            {nodeDetails.text}
          </pre>
        )}
      </GenericNode>
    );
  }

  if (NodeHelper.isWebview(nodeDetails)) {
    return (
      <Webview
        add={add}
        url={nodeDetails.url}
        selected={selected}
        {...rest}
        onSerialize={onSerialize}
        onUpdateUrl={(url: string) => {
          nodeDetails.url = url;
          onSerialize();
        }}
      />
    );
  }

  if (NodeHelper.isImage(nodeDetails)) {
    return (
      <GenericNode selected={selected} {...rest}>
        <img src={nodeDetails.url} alt={nodeDetails.alt || 'none'} />
      </GenericNode>
    );
  }
  return null;
}

function WebNode({
  id,
  metadataLookup,
  nodeDetails,
  startPosition,
  startSize,
  panZoomRef,
  frameRef,
  panningRef,
  add,
  remove,
  isSelected,
  onChangeSelection,
  onSerialize,
  hide = false,
}: TNode) {
  const forceUpdate = useForceUpdate();
  const nodeRectDiv = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(startPosition);
  const [size, setSize] = useState(startSize);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const selected = isSelected();

  useEffect(() => {
    panZoomRef.current?.on('zoom', () => {
      forceUpdate();
    });
  }, []);

  const transform = panZoomRef.current?.getTransform();
  const scale = transform.scale ?? 1;

  const globalStyle: CSSProperties = {};
  if (hide) {
    globalStyle.display = 'none';
  }

  let frameStyle: CSSProperties = {
    border: `4px ${selected ? 'white' : 'transparent'} solid`,
    position: 'absolute',
    background: 'transparent',
    padding: '48px 0 0 0',
    borderRadius: '6px',
    // position: 'relative',
    userSelect: selected ? 'auto' : 'none',
  };

  if (selected) {
    frameStyle = {
      ...frameStyle,
      background: '#33373b',
    };
  }

  const onSelected = (s: boolean) => {
    onChangeSelection(s);
    forceUpdate();
  };

  function getCenter(w: number, h: number) {
    const currentScale = panZoomRef.current?.getTransform().scale || 1;
    const frameWidth = frameRef.current?.clientWidth ?? 0;
    const frameHeight = frameRef.current?.clientHeight ?? 0;
    const newX = -currentScale * (position.x + w * 0.5) + frameWidth * 0.5;
    const newY = -currentScale * (position.y + h * 0.5) + frameHeight * 0.5;
    return { newX, newY };
  }

  function centerOnNode() {
    const currentScale = panZoomRef.current?.getTransform().scale || 1;
    const div = nodeRectDiv.current;
    const frame = frameRef.current;
    if (div === null || frame == null) return;
    const { height: frameHeight, width: frameWidth } =
      frame.getBoundingClientRect();
    const { height: divHeight, width: divWidth } = div.getBoundingClientRect();
    const targetScale =
      Math.min(frameHeight / divHeight, frameWidth / divWidth) * 0.85;

    const newX = -currentScale * position.x;
    const newY = -currentScale * position.y;
    panZoomRef.current?.moveTo(
      newX + (frameWidth * 0.5 - divWidth * 0.5),
      newY + (frameHeight * 0.5 - divHeight * 0.5)
    );
    panZoomRef.current?.zoomTo(
      frameWidth * 0.5,
      frameHeight * 0.5,
      targetScale
    );
  }

  useEffect(() => {
    metadataLookup.current[id] = {
      centerOnNode,
      forceUpdate,
      position,
      size,
      nodeDetails,
    };
  }, [position, size]);

  useEffect(() => {
    if (!dragging && !resizing) {
      onSerialize();
    }
  }, [dragging, resizing]);

  return (
    <>
      <Draggable
        disabled={panningRef.current || false}
        defaultClassName={panningRef.current ? '' : styles.draggable}
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
          size={size}
          onResizeStart={() => setResizing(true)}
          onResizeStop={(event) => {
            setResizing(false);
            event.stopPropagation();
          }}
          onResize={(event, direction, elementRef) => {
            let { x: newX, y: newY } = position;
            let { width: w, height: h } = elementRef.getBoundingClientRect();
            const scaleCoef = 1 / scale;
            w *= scaleCoef;
            h *= scaleCoef;
            if (['topLeft', 'bottomLeft', 'left'].includes(direction)) {
              newX -= w - size.width;
            }
            if (['topLeft', 'topRight', 'top'].includes(direction)) {
              newY -= h - size.height;
            }
            setSize({ width: w, height: h });
            setPosition({ x: newX, y: newY });
            event.stopPropagation();
          }}
          // defaultSize={startSize}
          style={frameStyle}
          minWidth={200}
          minHeight={180}
        >
          <div
            ref={nodeRectDiv}
            style={{
              ...globalStyle,
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              zIndex: selected ? -1 : 1,
            }}
            onMouseDown={(event) => {
              if (event.altKey) {
                event.stopPropagation();
                centerOnNode();
              }
              if (!selected && !event.metaKey) {
                onSelected(true);
              }
            }}
            onMouseEnter={(event) => {
              forceUpdate();
            }}
          />
          {/* {!selected && ( */}
          {/*   <div */}
          {/*     onMouseDown={(event) => { */}
          {/*       if (!event.ctrlKey) { */}
          {/*         onSelected(true); */}
          {/*         event.stopPropagation(); */}
          {/*       } */}
          {/*     }} */}
          {/*     style={{ */}
          {/*       width: '100%', */}
          {/*       height: '100%', */}
          {/*       position: 'absolute', */}
          {/*       maxHeight: '-webkit-fill-available', */}
          {/*       maxWidth: '-webkit-fill-available', */}
          {/*     }} */}
          {/*   /> */}
          {/* )} */}
          <CompNode
            add={add}
            remove={remove}
            selected={selected}
            onChangeSelection={onSelected}
            nodeDetails={nodeDetails}
            ignoreInput={dragging || resizing}
            onSerialize={onSerialize}
          />
        </Resizable>
      </Draggable>
    </>
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
  MetadataLookup,
  SerializableNodeMetadata,
  SerializableMetadataLookup,
};
