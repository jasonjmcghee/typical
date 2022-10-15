import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import { CSSProperties, MutableRefObject, useEffect, useRef, useState } from "react";
import { PanZoom } from "panzoom";

type TNode = {
  url: string;
  x: number;
  y: number;
  // eslint-disable-next-line react/require-default-props
  width?: number;
  // eslint-disable-next-line react/require-default-props
  height?: number;

  // eslint-disable-next-line react/require-default-props
  hide?: boolean;

  panZoomRef: MutableRefObject<PanZoom>;
};

function updateStyle(webview: HTMLWebViewElement) {
  const style = webview.shadowRoot?.querySelector('iframe')?.style;
  if (style) {
    style.borderRadius = '6px';
  }
}

function WebNode({ url, x, y, panZoomRef, width = 500, height = 300, hide = false }: TNode) {
  const webviewRef = useRef<HTMLWebViewElement>(null);
  const [show, setShow] = useState(true);
  const [position, setPosition] = useState({ x, y });
  const [resizing, setResizing] = useState(false);

  const shouldShow = show && !hide;

  useEffect(() => {
    if (webviewRef.current !== null) {
      updateStyle(webviewRef.current);
    }
  }, []);

  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '6px',
    boxShadow: '0 10px 16px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)',
  };

  if (resizing || !shouldShow) {
    style.display = 'none';
  }

  const scale = panZoomRef.current?.getTransform().scale ?? 1;

  return (
    <Draggable
      scale={scale}
      position={position}
      onDrag={(event) => {
        // if (!resizing) {
        //   event.stopPropagation();
        // }
      }}
      onStart={(event) => {
        if (!resizing) {
          setShow(false);
          event.stopPropagation();
        }
      }}
      onStop={(_, { x: x_, y: y_ }) => {
        if (!resizing) {
          setPosition({ x: x_, y: y_ });
          setShow(true);
        }
      }}
      axis={resizing ? "none" : "both"}
    >
      <Resizable
        scale={scale}
        enable={{
          bottom: true,
          right: true,
          bottomRight: true,
        }}
        onResizeStart={() => setResizing(true)}
        onResizeStop={(event) => {
          setResizing(false);
          setShow(true);
          event.stopPropagation();
        }}
        onResize={(event) => {
          event.stopPropagation();
        }}
        defaultSize={{ width, height }}
        style={{
          background: '#ffffff88',
          padding: '20px 2px 2px 2px',
          borderRadius: '6px',
          position: 'relative',
        }}
      >
        <webview
          ref={webviewRef}
          style={style}
          src={url}
          onLoad={(e) => {
            updateStyle(e.target as HTMLWebViewElement);
          }}
        />
      </Resizable>
    </Draggable>
  );
}

export default WebNode;
