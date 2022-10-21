import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import {
  DetailedHTMLProps,
  HTMLAttributes,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react';
import panzoom, { PanZoom, Transform } from 'panzoom';
import { v4 as uuidv4 } from 'uuid';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { CloseWithEscape, CommandPalette } from './components/CommandPalette';
// import Canvas from "./components/Canvas";
import {
  WebNode,
  TNode,
  TNodeDetails,
  NodeHelper,
  MetadataLookup,
  SerializableNodeMetadata,
  SerializableMetadataLookup,
} from './components/Node';

function setTitle(title: string) {
  window.electron.ipcRenderer.sendMessage('set-title', title);
}

function makeTab(title: string, selected = false) {
  return (
    <div
      className={`tab${selected ? ' selected' : ''}`}
      onClick={() => setTitle(title)}
    >
      {title}
    </div>
  );
}

interface IZoomableExtra {
  setPanZoom: (p: PanZoom) => void;
  onSerializePanZoom: () => void;
}

type TZoomable = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  IZoomableExtra;

const Zoomable = ({ children, setPanZoom, onSerializePanZoom }: TZoomable) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current != null) {
      const instance = panzoom(divRef.current, {
        initialZoom: 0.5,
        enableTextSelection: true,
        filterKey: () => true,
        beforeWheel(e) {
          // Only allow ctrl + scroll (or pinch on macos)
          if (e.ctrlKey) {
            return false;
          }
          return true;
        },
        beforeMouseDown(e) {
          if (e.metaKey) {
            return false;
          }
          return true;
        },
        zoomDoubleClickSpeed: 1,
      });

      setPanZoom(instance);

      instance.on('zoom', () => {
        onSerializePanZoom();
      });

      instance.on('pan', () => {
        onSerializePanZoom();
      });
    }
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: 'relative',
      }}
      // maxZoom={0.2}
    >
      {children}
    </div>
  );
};

const Main = () => {
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const panZoomRef = useRef<PanZoom | null>(null);
  const [panning, setPanning] = useState(false);
  const panningRef = useRef(panning);
  const [nodes, setNodes] = useState<{
    [id: string]: ReactElement<TNode, typeof WebNode>;
  }>({});
  const nodesRef = useRef<{
    [id: string]: ReactElement<TNode, typeof WebNode>;
  }>({});
  const nodeIdRef = useRef<string | null>(null);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const metadataLookup = useRef<MetadataLookup>({});
  const nodeStackRef = useRef<string[]>([]);
  const nodeStackIndexRef = useRef<number>(0);
  const didSwapNode = useRef<boolean>(false);

  const [justSelected, setJustSelected] = useState(false);

  const transformPoint = ({
    x,
    y,
  }: {
    x: number;
    y: number;
  }): { x: number; y: number } => {
    const t = panZoomRef.current?.getTransform();
    const coef = 1 / t.scale;
    return {
      x: coef * (x - t.x),
      y: coef * (y - t.y),
    };
  };

  useEffect(() => {
    if (justSelected && nodeIdRef.current) {
      metadataLookup.current[nodeIdRef.current].centerOnNode();
      setJustSelected(false);
    }
  }, [justSelected]);

  const onSerializePanZoom = () => {
    localStorage.setItem(
      'panzoom',
      JSON.stringify({
        transform: panZoomRef.current?.getTransform(),
      })
    );
  };

  const onSerializeNodes = () => {
    localStorage.setItem('nodes', JSON.stringify(metadataLookup.current));
  };

  function select(id: string | null) {
    const temp = nodeIdRef.current;
    nodeIdRef.current = id;

    if (id != null) {
      if (nodeStackRef.current[nodeStackIndexRef.current] !== id) {
        const foundIndex = nodeStackRef.current.findIndex(
          (v) => v === id
        );
        if (foundIndex >= 0) {
          nodeStackRef.current.splice(foundIndex, 1);
        }
        nodeStackRef.current.unshift(id);
        nodeStackIndexRef.current = 0;
      }
    }

    if (temp !== null) {
      metadataLookup.current[temp].forceUpdate();
    }

    if (temp !== nodeIdRef.current && nodeIdRef.current !== null) {
      metadataLookup.current[nodeIdRef.current].forceUpdate();
    }
  }

  function remove(id: string) {
    const { [id]: webview, ...rest } = nodesRef.current;
    delete metadataLookup.current[id];
    const index = nodeStackRef.current.findIndex((v) => v === id);
    nodeStackRef.current.splice(index, 1);
    nodesRef.current = rest;
    if (id === nodeIdRef.current) {
      nodeIdRef.current = null;
    }
    setNodes(nodesRef.current);
    onSerializeNodes();
    return webview;
  }

  function add(metadata: SerializableNodeMetadata, existingId?: string) {
    const { position, size, nodeDetails } = metadata;
    const id = existingId ?? uuidv4();
    const { x, y } = position;

    const webview = (
      <WebNode
        id={id}
        metadataLookup={metadataLookup}
        nodeDetails={nodeDetails}
        startPosition={{ x, y }}
        startSize={size}
        panZoomRef={panZoomRef}
        frameRef={baseRef}
        add={(details: TNodeDetails) => {
          addDefault(details);
        }}
        remove={() => {
          remove(id);
        }}
        isSelected={() => nodeIdRef.current === id}
        // isSelected={() => true}
        onSerialize={onSerializeNodes}
        onChangeSelection={(selected: boolean) => {
          if (selected) {
            select(id);
          } else if (nodeIdRef.current === id) {
            select(null);
          }
        }}
        panningRef={panningRef}
      />
    );
    nodesRef.current = {
      ...nodesRef.current,
      [id]: webview,
    };
    setNodes(nodesRef.current);
    nodeStackRef.current.push(id);
  }

  function addDefault(
    nodeDetails: TNodeDetails,
    position?: { x: number; y: number },
    size?: { width: number; height: number }
  ) {
    const defaultSize = size ?? {
      width: 640,
      height: 480,
    };
    const rect = baseRef.current?.getBoundingClientRect() ?? {
      x: 40,
      y: 40,
      width: 0,
      height: 0,
    };
    const defaultPosition = position ?? {
      x: (rect.width - rect.x) * 0.5,
      y: (rect.height - rect.y) * 0.5,
    };
    return add({
      nodeDetails,
      position: transformPoint(defaultPosition),
      size: defaultSize,
    });
  }

  const renderWebviews = () => {
    return Object.values(nodes);
  };

  useEffect(() => {
    let loadedData = localStorage.getItem('nodes');
    if (loadedData) {
      loadedData = JSON.parse(loadedData);
    }
    const existingNodes = (loadedData || {}) as SerializableMetadataLookup;
    if (Object.keys(existingNodes).length === 0) {
      addDefault(
        NodeHelper.text(
          'Welcome!\n' +
            '\n' +
            'Command Palette: Cmd+K\n' +
            'Pan: Cmd + Drag\n' +
            'New Browser: Cmd+N\n' +
            'New Text Box: Cmd+T\n' +
            'Open at location: Right Click\n' +
            'Switch to Next Tab: Cmd+1\n'
        ),
        { x: 40, y: 40 },
      );
      addDefault(NodeHelper.webview('www.google.com'), { x: 360, y: 360 });
    } else {
      Object.entries(existingNodes).forEach(([key, value]) => {
        add(value, key);
      });
    }

    const swapNodeForward = (delta: number) => {
      console.log(
        nodeStackRef.current.map((id) =>
          metadataLookup.current[id].nodeDetails
        )
      );
      didSwapNode.current = true;
      const numNodes = Object.keys(metadataLookup.current).length;
      nodeStackIndexRef.current =
        (nodeStackIndexRef.current + delta) % numNodes;
      const id: string = nodeStackRef.current[nodeStackIndexRef.current];
      metadataLookup.current[id].centerOnNode();
    };

    const swapNodeRelease = () => {
      if (!didSwapNode.current) {
        return;
      }
      didSwapNode.current = false;
      const id = nodeStackRef.current[nodeStackIndexRef.current];
      nodeStackIndexRef.current = 0;
      select(id);
    };

    window.addEventListener('dragend', (event) => {
      if (event.target) {
        const target = event.target as HTMLTextAreaElement;
        if (target && target.selectionStart && target.selectionEnd) {
          const text = target.innerHTML.substring(
            target.selectionStart,
            target.selectionEnd
          );
          addDefault(NodeHelper.text(text), { x: event.x, y: event.y });
        } else {
          console.log("Other kind of drag!")
        }
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.metaKey) {
        if (event.key === '1') {
          swapNodeForward(event.shiftKey ? -1 : 1);
        } else if (event.key === '2') {
          const p = panZoomRef.current;
          const relWidth = (baseRef.current?.clientWidth || 0) * 0.5;
          const relHeight = (baseRef.current?.clientHeight || 0) * 0.5;
          p?.zoomTo(relWidth, relHeight, 0.3 / (p?.getTransform()?.scale ?? 1));
        }
      }

      if (event.key === 'Escape') {
        select(null);
      }

      if (event.key === 'Meta') {
        panningRef.current = true;
        setPanning(panningRef.current);
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.metaKey || event.key === 'Meta') {
        swapNodeRelease();
      }

      if (event.key === 'Meta') {
        panningRef.current = false;
        setPanning(panningRef.current);
      }
    });

    const ipc = window.electron.ipcRenderer;
    ipc.on('add-webview', (args) => {
      const objs = args as { url: string; x?: number; y?: number }[];
      objs.forEach(({ url, x, y }) => {
        addDefault(NodeHelper.webview(url), { x: x || 0, y: y || 0 });
      });
    });

    ipc.on('add-text', (args) => {
      const objs = args as { text: string; x?: number; y?: number }[];
      objs.forEach(({ text, x, y }) => {
        addDefault(NodeHelper.text(text), { x: x || 0, y: y || 0 },{ width: 600, height: 300},);
      });
    });

    ipc.on('open-command-palette', () => {
      setShowCommandPalette(true);
    });

    // ipc.on('swap-node-forward', swapNodeForward);
    // ipc.on('swap-node-release', swapNodeRelease);

    const panzoomData = localStorage.getItem('panzoom');
    if (panzoomData) {
      const parsedPanzoomData = JSON.parse(panzoomData) || {};
      const { x, y, scale } = parsedPanzoomData.transform as Transform;
      const currentScale = panZoomRef.current?.getTransform()?.scale ?? 1;
      panZoomRef.current?.zoomTo(0, 0, scale / currentScale);
      panZoomRef.current?.moveTo(x, y);
    }
  }, []);

  return (
    <>
      <div className="title-bar-container">
        <div className="title-bar-padding" />
        <div className="title-bar">
          <div className="home">
            <HomeIcon style={{ height: 16 }} />
          </div>
          <div className="tabs">
            {makeTab('First workspace', true)}
            {makeTab('Second workspace')}
            {makeTab('Third workspace')}
            <div className="tab">+</div>
          </div>
        </div>
        <div className="title-bar-rest" />
      </div>
      {showCommandPalette && <div className="overlay" />}
      <div className="search-bar-container">
        <div
          className="search-bar"
          onClick={() => {
            setShowCommandPalette(true);
          }}
        >
          <MagnifyingGlassIcon style={{ width: 14 }} />
          Search and take actions
        </div>
      </div>
      <CloseWithEscape
        shown={showCommandPalette}
        onHide={() => setShowCommandPalette(false)}
      >
        <CommandPalette
          onBlur={() => setShowCommandPalette(false)}
          onCommand={(details: string | TNodeDetails) => {
            // AddWebview(w);
            if (NodeHelper.isNode(details)) {
              addDefault(details);
            }
            setShowCommandPalette(false);
          }}
        />
      </CloseWithEscape>
      {/* <Canvas /> */}
      <div
        ref={baseRef}
        className="base-canvas"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          cursor: panning ? 'grab' : 'auto',
        }}
        onMouseDown={(event) => {
          // TODO: selecting background doesn't always work
          if (
            !event.metaKey &&
            !event.ctrlKey &&
            event.target.className === 'base-canvas'
          ) {
            select(null);
          }
        }}
      >
        <Zoomable
          setPanZoom={(p) => {
            panZoomRef.current = p;
          }}
          onSerializePanZoom={onSerializePanZoom}
          // maxZoom={0.2}
        >
          <div className="nodes">{renderWebviews()}</div>
        </Zoomable>
      </div>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
      </Routes>
    </Router>
  );
}
