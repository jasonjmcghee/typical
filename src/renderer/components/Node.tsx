import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import {
  ChangeEvent,
  CSSProperties,
  HTMLAttributes,
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
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
  ViewfinderCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

import styles from './Node.module.scss';
import { buildUrl } from '../util';
import { Position, Size } from '../preload';
import { useRefState } from '../hooks/useRefState';

interface SerializableNodeMetadata {
  position: Position;
  size: Size;
  nodeDetails: TNodeDetails;
  zoomLevel: number;
}

interface NodeMetadata extends SerializableNodeMetadata {
  centerOnNode: () => void;
  changeZoom: (delta: number) => void;
  forceUpdate: () => void;
  updateZIndex: (zIndex: number) => void;
  setHiddenState: (hidden: boolean) => void;
}

type MetadataLookup = { [id: string]: NodeMetadata };
type SerializableMetadataLookup = { [id: string]: SerializableNodeMetadata };

type TNode = {
  id: string;
  metadataLookup: MutableRefObject<MetadataLookup>;
  nodeDetails: TNodeDetails;
  startPosition: Position;
  startSize: Size;
  startZoomLevel: number;

  isSelected: () => boolean;
  zIndex: number;
  onChangeSelection: (selected: boolean, center?: boolean) => void;
  onSerialize: () => void;

  panZoomRef: MutableRefObject<PanZoom | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  panningRef: RefObject<boolean>;

  readonly add: (
    nodeDetails: TNodeDetails,
    position?: Position,
    size?: Size
  ) => void;
  readonly remove: () => void;
};

function updateStyle(webview: WebviewTag, selected?: boolean) {
  const iframe = webview.shadowRoot?.querySelector('iframe');
  const style = iframe?.style;
  const borderRadius = '12px';
  if (style) {
    style.borderRadius = selected
      ? `0 0 ${borderRadius} ${borderRadius}`
      : borderRadius;
    style.background = 'white';
  }
  iframe?.addEventListener('keyup', (event) => {
    if (event.metaKey && event.key === 'Equals') {
      webview.setZoomLevel(webview.getZoomLevel() + webview.getZoomFactor());
    }
    if (event.metaKey && event.key === 'Minus') {
      webview.setZoomLevel(webview.getZoomLevel() - webview.getZoomFactor());
    }
  });
}

const debounce = (func: (...args: unknown[]) => void, timeout = 300) => {
  let timer: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(args);
    }, timeout);
  };
};

const useDebouncedEffect = (
  effect: () => void,
  deps: unknown[],
  delay: number
) => {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...(deps || []), delay]);
};

function useDebounce(value: unknown, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useDebouncedEffect(
    () => {
      setDebouncedValue(value);
    },
    [value],
    300
  );
  return debouncedValue;
}

function useForceUpdate(delay = 0) {
  const [, setValue] = useState(0);
  const update = () => setValue((val) => val + 1);
  return debounce(update, delay);
}

interface ITextNode {
  type: 'text';
  text: string;
}

interface IWebviewNode {
  type: 'webview';
  url: string;
  scrollTop: number;
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

  static webview(url: string, scrollTop = 0): IWebviewNode {
    return { url: buildUrl(url), scrollTop, type: 'webview' };
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
  onRemove: () => void;
  selected: undefined | boolean;
  onChangeSelection: (selected: boolean, center?: boolean) => void;
  onUpdatePinnedState: (pinned: boolean) => void;
  ignoreInput: undefined | boolean;
}

interface CompNodeProps {
  id: string;
  onAdd: (nodeDetails: TNodeDetails) => void;
  onRemove: () => void;
  selected: undefined | boolean;
  ignoreInput: undefined | boolean;
  onChangeSelection: (selected: boolean, center?: boolean) => void;
  onUpdatePinnedState: (pinned: boolean) => void;
  onSerialize: () => void;
}

const GenericNode = ({
  onRemove,
  selected,
  onChangeSelection,
  onUpdatePinnedState,
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
            onUpdatePinnedState(true);
            event.preventDefault();
          }}
        >
          <ViewfinderCircleIcon />
        </button>
        <button
          type="button"
          style={{
            padding: 0,
            width: '24px',
            color: 'white',
            background: 'transparent',
          }}
          onClick={(event) => {
            onRemove();
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
  setNotFound,
  loaded,
  onUrlBarFocused,
}: {
  url: string;
  webviewRef: RefObject<Electron.WebviewTag>;
  onUpdateUrl: (url: string) => void;
  setNotFound: (notFound: boolean) => void;
  loaded: boolean;
  onUrlBarFocused: () => void;
}) {
  const [urlValue, setUrlValue, urlValueRef] = useRefState<string>(url);
  const updateUrl = useCallback(
    (u: string) => {
      setUrlValue(u);
      onUpdateUrl(u);
    },
    [onUpdateUrl]
  );

  const onSetUrl = useCallback(() => {
    try {
      webviewRef.current?.stop();
      setNotFound(false);
      webviewRef.current?.loadURL(buildUrl(urlValueRef.current)).catch((e) => {
        console.error(e);
      });
    } catch (e) {
      console.error(e);
    }
  }, [setNotFound, webviewRef]);

  const onEditInput = useCallback(() => {
    document.dispatchEvent(
      new CustomEvent('edit-input', {
        detail: {
          inputValue: urlValue,
          onChangeValue: (value: string) => updateUrl(value),
          onSubmit: () => {
            onSetUrl();
          },
        },
      })
    );
  }, [onSetUrl, updateUrl, urlValue]);

  useEffect(() => {
    if (webviewRef.current !== null) {
      webviewRef.current.addEventListener('did-navigate', async (event) => {
        updateUrl(event.url);
      });
      webviewRef.current.addEventListener(
        'did-navigate-in-page',
        async (event) => {
          setUrlValue(event.url);
        }
      );
    }

    document.addEventListener('request-edit-input', onEditInput);

    return () => {
      document.removeEventListener('request-edit-input', onEditInput);
    };
  }, []);

  const formStyle: CSSProperties = {
    flexGrow: 1,
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  };

  const inputStyle: CSSProperties = {
    color: 'white',
    background: '#33373b',
    width: '100%',
    maxWidth: '500px',
    borderRadius: '6px',
    border: '1px solid #555555',
    textAlign: 'center',
  };

  // if (focused) {
  //   inputStyle['position'] = 'absolute';
  //   inputStyle['fontSize'] = '64px';
  // }

  return (
    <form
      style={formStyle}
      onSubmit={(event) => {
        event.preventDefault();
        onSetUrl();
      }}
    >
      <div className={styles.titleBar}>
        {loaded ? webviewRef.current?.getTitle() : ''}
      </div>
      <input
        style={inputStyle}
        onFocus={(event) => {
          onEditInput();
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
      <button type="submit" style={{ display: 'none', position: 'absolute' }} />
    </form>
  );
}

function WebviewNavbar({
  url,
  onUpdateUrl,
  selected,
  webviewRef,
  onRemove,
  setNotFound,
  onUrlBarFocused,
}: {
  url: string;
  selected: undefined | boolean;
  onUpdateUrl: (url: string) => void;
  webviewRef: RefObject<Electron.WebviewTag>;
  setNotFound: (notFound: boolean) => void;
  onRemove: () => void;
  onUrlBarFocused: () => void;
}) {
  const forceUpdate = useForceUpdate();
  const [loaded, setLoaded] = useState<boolean>(false);

  const onDidUpdateUrl = (urlValue: string) => {
    onUpdateUrl(urlValue);
    forceUpdate();
  };

  useEffect(() => {
    if (webviewRef.current !== null) {
      webviewRef.current.addEventListener('dom-ready', async (event) => {
        setLoaded(true);
      });
    }
  }, []);

  return (
    <div className={`${styles.webviewNavbar} ${selected ? '' : styles.hide}`}>
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
            setNotFound(false);
            webviewRef.current?.reload();
            event.preventDefault();
          }}
        >
          <ArrowPathIcon />
        </button>
      </div>
      <WebviewNavbarUrl
        url={url}
        webviewRef={webviewRef}
        onUpdateUrl={onDidUpdateUrl}
        setNotFound={setNotFound}
        loaded={loaded}
        onUrlBarFocused={onUrlBarFocused}
      />
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
            onRemove();
            event.preventDefault();
          }}
        >
          <XMarkIcon />
        </button>
      </div>
    </div>
  );
}

const RawWebview = ({
  id,
  webviewRef,
  src,
}: {
  id: string;
  webviewRef: RefObject<WebviewTag>;
  src: string;
}) =>
  useMemo(
    () => (
      <webview
        id={id}
        ref={webviewRef}
        className={styles.rawWebview}
        src={src}
        // TODO: make sure we can communicate
        preload={window.preloadScript}
        // webpreferences="nativeWindowOpen=false"
        // This is correct, despite what TS says
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        allowpopups="true"
      />
    ),
    []
  );

const Webview = ({
  id,
  metadata,
  zoomLevel,
  url,
  scrollTop,
  selected,
  ignoreInput,
  onUpdateUrl,
  onUpdatePinnedState,
  onAdd,
  onRemove,
}: CompNodeProps & {
  url: string;
  scrollTop: number;
  onUpdateUrl: (url: string) => void;
  metadata: NodeMetadata;
  zoomLevel: number;
}) => {
  const webviewRef = useRef<WebviewTag>(null);
  const [notFound, setNotFound, notFoundRef] = useRefState<boolean>(false);
  const [domReady, setDomReady] = useState<boolean>(false);

  useEffect(() => {
    if (webviewRef.current !== null) {
      // webviewRef.current.addEventListener('did-finish-load', async (event) => {
      //   setNotFound(false);
      // });
      webviewRef.current.addEventListener('dom-ready', async (event) => {
        setDomReady(true);
      });
      webviewRef.current.addEventListener('new-window', async (event) => {
        onAdd(NodeHelper.webview(event.url));
      });
      webviewRef.current.addEventListener('did-fail-load', async () => {
        setNotFound(true);
      });
      webviewRef.current.addEventListener('will-navigate', async () => {
        setNotFound(false);
      });
      webviewRef.current.addEventListener('close', async () => {
        onRemove();
      });

      window.addEventListener('online', () => {
        if (notFoundRef.current) {
          setNotFound(false);
          webviewRef.current?.reload();
        }
      });
    }
  }, []);

  useEffect(() => {
    if (webviewRef.current !== null && domReady) {
      webviewRef.current.setZoomLevel(zoomLevel);
    }
  }, [zoomLevel, domReady]);

  useEffect(() => {
    if (webviewRef.current !== null) {
      updateStyle(webviewRef.current, selected);
    }
  }, [selected]);

  const style: CSSProperties = {
    width: '100%',
    height: '100%',
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
        onRemove={onRemove}
        onUpdateUrl={onUpdateUrl}
        selected={selected}
        webviewRef={webviewRef}
        onUpdatePinnedState={onUpdatePinnedState}
        setNotFound={setNotFound}
        onUrlBarFocused={() => {}}
      />
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {notFound && (
          <div
            style={{
              ...style,
              ...pointerStyles,
              position: 'absolute',
              color: 'grey',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              alignItems: 'center',
              background: '#33373b',
              borderRadius: '6px',
            }}
          >
            <div>
              <SignalSlashIcon />
              Failed to load
            </div>
          </div>
        )}
        <div style={{ ...style, ...pointerStyles }}>
          <RawWebview id={id} webviewRef={webviewRef} src={url} />
        </div>
      </div>
    </>
  );
};

function CompNode({
  id,
  zoomLevel,
  metadata,
  onAdd,
  nodeDetails,
  selected,
  onSerialize,
  size,
  ...rest
}: CompNodeProps & {
  size: Size;
  zoomLevel: number;
  nodeDetails: TNodeDetails;
  metadata: NodeMetadata;
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  if (NodeHelper.isText(nodeDetails)) {
    const zoomAmount = 2.5 * zoomLevel ** 0.25;
    const fontSize = `${zoomAmount * 1.7}em`;
    // if (textAreaRef.current !== null) {
    //   // const width = textAreaRef.current.getBoundingClientRect().width;
    //   fontSize = `${0.023 * size.width * zoomAmount}px`;
    // }
    // if (preRef.current !== null) {
    //   fontSize = `${0.023 * size.width * zoomAmount}px`;
    // }
    return (
      <GenericNode selected={selected} {...rest}>
        {selected ? (
          <textarea
            ref={textAreaRef}
            onMouseDown={(event) => event.stopPropagation()}
            className={styles.textNode}
            defaultValue={nodeDetails.text}
            style={{ fontSize }}
            onChange={(event) => {
              nodeDetails.text = event.target.value;
              onSerialize();
            }}
          />
        ) : (
          <pre
            ref={preRef}
            style={{
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
              fontSize,
            }}
            className={styles.textNode}
          >
            {nodeDetails.text}
          </pre>
        )}
      </GenericNode>
    );
  }

  if (NodeHelper.isWebview(nodeDetails)) {
    return (
      <Webview
        id={id}
        zoomLevel={zoomLevel}
        metadata={metadata}
        url={nodeDetails.url}
        scrollTop={nodeDetails.scrollTop}
        selected={selected}
        {...rest}
        onSerialize={onSerialize}
        onUpdateUrl={(url: string) => {
          nodeDetails.url = url;
          onSerialize();
        }}
        onAdd={onAdd}
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
  startZoomLevel,
  panZoomRef,
  frameRef,
  panningRef,
  add,
  remove,
  isSelected,
  zIndex,
  onChangeSelection,
  onSerialize,
}: TNode) {
  const forceUpdate = useForceUpdate(50);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const nodeRectDiv = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(startPosition);
  const [size, setSize, sizeRef] = useRefState(startSize);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [zoomLevel, setZoomLevel] = useState<number>(startZoomLevel);

  const selected = isSelected();

  useEffect(() => {
    panZoomRef.current?.on('zoom', () => {
      forceUpdate();
    });
    panZoomRef.current?.on('pan', () => {
      forceUpdate();
    });
  }, []);

  const scale = panZoomRef.current?.getTransform()?.scale ?? 1;

  const globalStyle: CSSProperties = {};

  let frameStyle: CSSProperties = {
    border: `4px ${selected ? 'white' : 'transparent'} solid`,
    userSelect: selected ? 'auto' : 'none',
  };

  const showBackground = nodeDetails.type === 'text';

  if (showBackground || selected) {
    frameStyle = {
      ...frameStyle,
      background: '#33373bfd',
    };
  }

  const onSelected = (s: boolean, center = false) => {
    onChangeSelection(s, center);
    forceUpdate();
  };

  function centerOnNode() {
    const currentScale = panZoomRef.current?.getTransform()?.scale ?? 1;
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

  function setHiddenState(hidden: boolean) {
    if (!baseRef.current) {
      return;
    }
    if (hidden) {
      baseRef.current.style.display = 'none';
    } else {
      baseRef.current.style.display = 'auto';
    }
  }

  useEffect(() => {
    if (baseRef.current !== null) {
      baseRef.current.style.zIndex = `${zIndex}`;
    }
  }, [zIndex]);

  function updateZIndex(newZIndex: number) {
    if (baseRef.current !== null) {
      baseRef.current.style.zIndex = `${newZIndex}`;
    }
  }

  function changeZoom(delta: number) {
    setZoomLevel(delta);
  }

  useEffect(() => {
    if (baseRef.current?.style?.display === 'none') {
      return;
    }
    metadataLookup.current[id] = {
      updateZIndex,
      centerOnNode,
      setHiddenState,
      changeZoom,
      zoomLevel,
      forceUpdate,
      position,
      size,
      nodeDetails,
    };
    onSerialize();
  }, [position, size, zoomLevel]);

  useEffect(() => {
    baseRef.current?.addEventListener('keydown', () => {});
  }, []);

  return (
    <div ref={baseRef} className={styles.frameStyle}>
      <Draggable
        disabled={panningRef.current || resizing}
        defaultClassName={`${styles.framePadded} ${
          panningRef.current ? '' : styles.draggable
        }`}
        scale={scale}
        position={position}
        onStart={() => {
          if (panningRef.current || resizing) {
            return false;
          }
          setDragging(true);
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
          onResizeStart={() => {
            if (panningRef.current) {
              return false;
            }
            setResizing(true);
          }}
          onResizeStop={(event) => {
            setSize(sizeRef.current);
            setResizing(false);
            event.stopPropagation();
          }}
          onResize={(event, direction, elementRef) => {
            let { x: newX, y: newY } = position;
            let { width: w, height: h } = elementRef.getBoundingClientRect();
            const scale = panZoomRef.current?.getTransform()?.scale ?? 1;
            const scaleCoef = 1 / scale;
            w *= scaleCoef;
            h *= scaleCoef;
            const deltaX = w - sizeRef.current.width;
            const deltaY = h - sizeRef.current.height;
            if (
              ['topLeft', 'bottomLeft', 'left'].includes(direction) &&
              !event.altKey
            ) {
              newX -= deltaX;
            }
            if (
              ['topLeft', 'topRight', 'top'].includes(direction) &&
              !event.altKey
            ) {
              newY -= deltaY;
            }
            if (event.altKey) {
              newX -= deltaX;
              newY -= deltaY;
              w += deltaX;
              h += deltaY;
            }
            // setSize({ width: w, height: h });
            sizeRef.current = { width: w, height: h };
            setPosition({ x: newX, y: newY });
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
              if (!selected && !event.metaKey) {
                onSelected(true, event.altKey);
              }
            }}
            onMouseEnter={() => {
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
            id={id}
            zoomLevel={zoomLevel}
            size={size}
            metadata={metadataLookup.current[id]}
            onAdd={(details) => {
              add(details, { x: position.x + size.width, y: position.y }, size);
            }}
            onRemove={remove}
            selected={selected}
            onUpdatePinnedState={(pinned: boolean) => {}}
            onChangeSelection={onSelected}
            nodeDetails={nodeDetails}
            ignoreInput={dragging || resizing}
            onSerialize={onSerialize}
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
  MetadataLookup,
  SerializableNodeMetadata,
  SerializableMetadataLookup,
};
