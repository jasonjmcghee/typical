import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import {
  DetailedHTMLProps,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import panzoom, { PanZoom } from 'panzoom';
import { v4 as uuidv4 } from 'uuid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { KeyPress } from './hooks/useKeyPress';
import {
  CloseWithEscape,
  CommandPalette,
  OpenOnKeyPress,
} from './components/CommandPalette';
// import Canvas from "./components/Canvas";
import { WebNode, TNode, TNodeDetails, NodeHelper, MetadataLookup } from './components/Node';
// import PrismaZoom from './components/PrismaZoom';

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
}

type TZoomable = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> &
  IZoomableExtra;

const Zoomable = ({ children, setPanZoom }: TZoomable) => {
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
    }
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        width: '4000px',
        height: '3000px',
        position: 'relative',
        border: '4px solid white',
        padding: '40px',
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
  const [nodes, setNodes] = useState<{
    [id: string]: ReactElement<TNode, typeof WebNode>;
  }>({});
  const nodesRef = useRef<{
    [id: string]: ReactElement<TNode, typeof WebNode>;
  }>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const metadataLookup = useRef<MetadataLookup>({});
  const nodeStackRef = useRef<string[]>([]);
  const currentNodeRef = useRef<number>(0);

  function select(id: string | null) {
    selectedIdRef.current = id;
    setSelectedId(selectedIdRef.current);
  }

  function remove(id: string) {
    const { [id]: webview, ...rest } = nodesRef.current;
    nodesRef.current = rest;
    setNodes(nodesRef.current);
    return webview;
  }

  function add(nodeDetails: TNodeDetails, position?: { x: number; y: number }) {
    const id = uuidv4();
    const transform = panZoomRef.current?.getTransform();
    const scaleCoef = 1 / (transform?.scale || 1);
    let { x, y } = { x: position?.x || 0, y: position?.y || 0 };
    if (position === undefined) {
      const rect = baseRef.current?.getBoundingClientRect();
      if (rect) {
        x = (rect.width - rect.x) * 0.5;
        y = (rect.height - rect.y) * 0.5;
      }
    }

    x = (x - (transform?.x || 0)) * scaleCoef;
    y = (y - (transform?.y || 0)) * scaleCoef;

    const webview = (
      <WebNode
        id={id}
        metadataLookup={metadataLookup}
        nodeDetails={nodeDetails}
        x={x}
        y={y}
        panZoomRef={panZoomRef}
        frameRef={baseRef}
        add={(details: TNodeDetails) => {
          add(details);
        }}
        remove={() => {
          remove(id);
        }}
        // isSelected={() => selectedIdRef.current === id}
        isSelected={() => true}
        onChangeSelection={(selected: boolean) => {
          if (selected) {
            select(id);
          } else if (selectedIdRef.current === id) {
            select(null);
          }
        }}
      />
    );
    nodesRef.current = {
      ...nodesRef.current,
      [id]: webview,
    };
    setNodes(nodesRef.current);
    nodeStackRef.current.push(id);
  }

  const renderWebviews = () => {
    return Object.values(nodes);
  };

  useEffect(() => {
    add(
      NodeHelper.text(
        'Welcome!\n' +
          '\n' +
          'Command Palette: Cmd+K\n' +
          'Pan: Cmd + Drag\n' +
          'New Browser: Cmd+N\n' +
          'New Text Box: Cmd+T\n' +
          'Open at location: Right Click\n'
      ),
      { x: 0, y: 0 }
    );
    add(NodeHelper.webview('www.google.com'), { x: 320, y: 320 });

    const swapToNode = (delta: number) => {
      const numNodes = Object.keys(metadataLookup.current).length;
      currentNodeRef.current = (currentNodeRef.current + delta) % numNodes;
      const id: string = nodeStackRef.current[currentNodeRef.current];
      metadataLookup.current[id].centerOnNode();
    };

    const swapNodeRelease = () => {
      const temp = nodeStackRef.current[0];
      nodeStackRef.current[0] = nodeStackRef.current[currentNodeRef.current];
      nodeStackRef.current[currentNodeRef.current] = temp;
      currentNodeRef.current = 0;
    };

    window.addEventListener('keydown', (event) => {
      if (event.metaKey) {
        if (event.key === '1') {
          swapToNode(event.shiftKey ? -1 : 1);
        } else if (event.key === '2') {
          const p = panZoomRef.current;
          const relWidth = (baseRef.current?.clientWidth || 0) * 0.5;
          const relHeight = (baseRef.current?.clientHeight || 0) * 0.5;
          p?.zoomTo(relWidth, relHeight, 0.5 / (p?.getTransform()?.scale || 1));
        }
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.metaKey || event.key === 'Meta') {
        swapNodeRelease();
      }
    });

    const ipc = window.electron.ipcRenderer;
    ipc.on('add-webview', (args) => {
      const objs = args as { url: string; x?: number; y?: number }[];
      objs.forEach(({ url, x, y }) => {
        add(NodeHelper.webview(url), { x: x || 0, y: y || 0 });
      });
    });

    ipc.on('add-text', (args) => {
      const objs = args as { text: string; x?: number; y?: number }[];
      objs.forEach(({ text, x, y }) => {
        add(NodeHelper.text(text), { x: x || 0, y: y || 0 });
      });
    });

    ipc.on('open-command-palette', () => {
      setShowCommandPalette(true);
    });

    // ipc.on('swap-node-forward', swapNodeForward);
    // ipc.on('swap-node-release', swapNodeRelease);
  }, []);

  return (
    <>
      <div className="title-bar-container">
        <div className="title-bar-padding" />
        <div className="title-bar">
          <div className="home">Home</div>
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
              add(details);
            }
            setShowCommandPalette(false);
          }}
        />
      </CloseWithEscape>
      {/* <Canvas /> */}
      <div
        ref={baseRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Zoomable
          setPanZoom={(p) => {
            panZoomRef.current = p;
          }}
          // maxZoom={0.2}
        >
          <div
            className="nodes"
            onFocus={() => {
              select(null);
            }}
          >
            {renderWebviews()}
          </div>
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
