import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import {
  DetailedHTMLProps,
  HTMLAttributes, ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState
} from "react";
import panzoom, { PanZoom } from 'panzoom';
import { v4 as uuidv4 } from 'uuid';
import { KeyPress } from './hooks/useKeyPress';
import { CommandPalette, OpenOnKeyPress } from './components/CommandPalette';
// import Canvas from "./components/Canvas";
import { WebNode, TNode, TNodeDetails, NodeHelper } from "./components/Node";
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
        initialZoom: 0.25,
        enableTextSelection: true,
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

const Hello = () => {
  const panZoomRef = useRef<PanZoom | null>(null);
  const [nodes, setNodes] = useState<{ [id: string]: ReactElement<TNode, typeof WebNode> }>({});
  const nodesRef = useRef<{ [id: string]: ReactElement<TNode, typeof WebNode> }>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);

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

  function addNode(id: string, elem: JSX.Element) {

  }

  function add(nodeDetails: TNodeDetails) {
    const id = uuidv4();
    const webview = (
      <WebNode
        nodeDetails={nodeDetails}
        x={0}
        y={0}
        panZoomRef={panZoomRef}
        add={(details: TNodeDetails) => {
          add(details);
        }}
        remove={() => {
          remove(id);
        }}
        isSelected={() => selectedIdRef.current === id}
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
  }

  const renderWebviews = () => {
    return Object.values(nodes);
  };

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
      <OpenOnKeyPress shortcut={new KeyPress({ key: 'k', cmdCtrl: true })}>
        <CommandPalette
          onCommand={(details: string | TNodeDetails) => {
            // AddWebview(w);
            if (NodeHelper.isNode(details)) {
              add(details);
            }
          }}
        />
      </OpenOnKeyPress>
      {/* <Canvas /> */}
      <div
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
          style={{
            width: '4000px',
            height: '3000px',
            position: 'relative',
            border: '4px solid white',
            padding: '40px',
          }}
          // maxZoom={0.2}
        >
          <div className="nodes" onFocus={() => {
            select(null);
          }}>
            <h1>Hello!</h1>
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
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}