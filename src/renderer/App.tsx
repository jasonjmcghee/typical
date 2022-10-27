import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.scss';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { PanZoom, Transform } from 'panzoom';
import { v4 as uuidv4 } from 'uuid';
import {
  CheckIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  HomeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import {
  CloseWithEscape,
  Command,
  CommandHelper,
  CommandPalette,
} from './components/CommandPalette';
// import Canvas from "./components/Canvas";
import {
  WebNode,
  TNodeDetails,
  NodeHelper,
  MetadataLookup,
  SerializableNodeMetadata,
} from './components/Node';
import { Position, Size } from './preload';
import { useRefState } from './hooks/useRefState';
import { defaultPanZoomTransform, Zoomable } from './components/Zoomable';
import { useNodes } from './hooks/useNodes';
import { Workspace, WorkspaceLookup } from './components/types';
import { useSerialization } from './hooks/useSerialization';

const basicHelpText =
  'Welcome!\n' +
  '\n' +
  'Command Palette: ⌘ K\n' +
  'Pan: ⌘ Drag\n' +
  'New Browser Frame: ⌘ N\n' +
  'New Text Frame: ⌘ T\n' +
  'Open at location: Right Click\n' +
  'Switch to Next Frame: ⌘ 1\n';

function makeZIndex(raw: number): number {
  return 50 + 10 * raw;
}

function CopyClipboardLink({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [clicked, setClicked] = useState(false);
  const listener = () => {
    if (ref.current) {
      ref.current.className = 'icons';
    }
    setClicked(false);
    return ref.current?.removeEventListener('animationiteration', listener);
  };
  return (
    <div
      className={`link-button`}
      onClick={() => {
        onClick();
        setClicked(true);
        ref.current?.addEventListener('animationiteration', listener, false);
      }}
    >
      <div ref={ref} className={`icons${clicked ? ' clicked' : ''}`}>
        <LinkIcon className="icon" />
        <ClipboardDocumentCheckIcon className="icon" />
      </div>
    </div>
  );
}

const Main = () => {
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [showInputBox, setShowInputBox] = useState<boolean>(false);
  const [inputBoxValue, setInputBoxValue] = useState<boolean>(false);

  const panZoomRef = useRef<PanZoom | null>(null);
  const [panning, setWillPan, panningRef] = useRefState(false);
  const [activePanning, setIsPanning] = useState(false);

  const baseRef = useRef<HTMLDivElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);

  const metadataLookup = useRef<MetadataLookup>({});

  const {
    nodeStackRef,
    nodeStackIndexRef,
    nodeStackIndexLookupRef,
    didSwapNode,
    nodeIdRef,
    nodes,
    setNodes,
    nodesRef,
    clear,
  } = useNodes();

  const {
    saveDataRef,
    onSaveNodes,
    onSavePanZoom,
    onSaveBackgroundStyle,
    onSaveWorkspaceMetadata,
    onSaveMetadata,
    onSelectWorkspaceId,
    loadWorkspace,
  } = useSerialization({
    metadataLookup,
    panZoomRef,
  });

  const [selectedWorkspaceId, setWorkspaceId] = useState<string | null>(
    saveDataRef.current.selectedWorkspaceId
  );

  const workspaceLookup = useRef<WorkspaceLookup>(
    saveDataRef.current.workspaceLookup
  );

  const [tabs, setTabs] = useState(saveDataRef.current.tabs);

  const selectWorkspace = (id: string, force = false) => {
    if (!force && saveDataRef.current.selectedWorkspaceId === id) {
      console.log('Workspace already selected!');
      return;
    }
    saveDataRef.current.selectedWorkspaceId = id;
    setWorkspaceId(id);
    onSelectWorkspaceId();
  };

  const transformPoint = ({ x, y }: Position): Position => {
    const t = panZoomRef.current?.getTransform() ?? defaultPanZoomTransform;
    const coef = 1 / t.scale;
    return {
      x: coef * (x - t.x),
      y: coef * (y - t.y),
    };
  };

  const WorkspaceTab = ({
    id,
    selected,
  }: {
    id: string;
    selected: boolean;
  }) => {
    const workspace = workspaceLookup.current[id];
    const [title, setTitle] = useState(workspace?.title);
    if (workspace == null) {
      return null;
    }

    if (title === null) {
      setTitle(workspace.title);
      window.electron.setTitle(workspace.title);
    }

    return (
      <div className={`tab${selected ? ' selected' : ''}`}>
        {!selected ? (
          <button type="button" onClick={() => selectWorkspace(id)}>
            {workspace.title}
          </button>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSaveWorkspaceMetadata({ id, title });
            }}
            onBlur={() => onSaveWorkspaceMetadata({ id, title })}
          >
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                window.electron.setTitle(event.target.value);
              }}
            />
            <button
              type="submit"
              style={{ display: 'none', position: 'absolute' }}
            />
          </form>
        )}
        <button
          type="button"
          style={{
            padding: 0,
            width: '24px',
            color: 'white',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            flexFlow: 'row-reverse',
          }}
          onClick={(event) => {
            removeWorkspace(id);
            event.preventDefault();
          }}
        >
          <XMarkIcon
            style={{ color: selected ? ' white' : 'grey', height: 16 }}
          />
        </button>
      </div>
    );
  };

  const makeDefaultWorkspace = (id: string) => ({
    id,
    title: 'New Workspace',
    nodes: {},
    backgroundStyle: {},
    panzoom: {
      transform: panZoomRef?.current?.getTransform() ?? defaultPanZoomTransform,
    },
  });

  const addWorkspace = (existingWorkspace?: Workspace) => {
    const id = uuidv4();
    const workspace = existingWorkspace ?? makeDefaultWorkspace(id);
    workspace.id = id;
    saveDataRef.current.selectedWorkspaceId = id;
    saveDataRef.current.workspaceLookup[id] = workspace;
    saveDataRef.current.appVersion = window.electron.version;
    saveDataRef.current.tabs = [...saveDataRef.current.tabs, id];
    onSaveNodes();
    onSavePanZoom();
    onSaveBackgroundStyle(workspace.backgroundStyle);
    onSaveMetadata();
    onSaveWorkspaceMetadata({ id, title: workspace.title });
    selectWorkspace(id, true);
    setTabs(saveDataRef.current.tabs);
    return workspace;
  };

  const removeWorkspace = (id: string) => {
    const index = tabs.findIndex((v) => v === id);
    if (index !== -1) {
      tabs.splice(index, 1);
    }
    saveDataRef.current.tabs = tabs;
    delete saveDataRef.current.workspaceLookup[id];
    if (saveDataRef.current.selectedWorkspaceId === id) {
      setWorkspaceId(null);
    }
    setTabs([...tabs]);
    selectWorkspace(tabs[tabs.length - 1]);
  };

  const createWorkspaceFromString = (workspaceString: string) => {
    try {
      const noURI = decodeURIComponent(workspaceString);
      const jsonString = Buffer.from(noURI, 'base64').toString();
      const workspaceObj = JSON.parse(jsonString) as Workspace;
      if (workspaceObj === null) {
        console.error('Failed to parse workspace');
      }
      // Assign a new id each time...?
      // Maybe we should prompt and ask...
      const { id } = addWorkspace(workspaceObj);
      // setTimeout(() => {
      //   initializeWorkspace(id);
      // }, 0);
    } catch (e) {
      console.error('Failed to parse workspace', e);
    }
  };

  const getWorkspaceAsString = () => {
    const id = selectedWorkspaceId;
    if (id === null) {
      throw new Error('No workspace selected.');
    }
    const workspace = saveDataRef.current.workspaceLookup[id];
    if (workspace == null) {
      throw new Error('No workspace data available.');
    }
    return encodeURIComponent(
      Buffer.from(JSON.stringify(workspace)).toString('base64')
    );
  };

  const createWorkspaceLink = () => {
    return `typical://share?workspace=${getWorkspaceAsString()}`;
  };

  const copyWorkspaceToClipboard = () => {
    window.navigator.clipboard
      .writeText(createWorkspaceLink())
      .then(() => console.log('Copied workspace to clipboard!'))
      .catch(() => console.log('Failed to copy workspace to clipboard'));
  };

  // TODO: If no workspaces exist, create a workspace.
  // The workspace should have all properties

  const setBackgroundStyle = (style: CSSProperties, serialize = true) => {
    if (backgroundRef.current !== null) {
      Object.entries(style).forEach(([prop, value]) => {
        backgroundRef.current?.style.setProperty(prop, value);
      });
    }
    if (serialize) {
      onSaveBackgroundStyle(style);
    }
  };

  const reindexNodeStack = () => {
    nodeStackIndexLookupRef.current = Object.fromEntries(
      nodeStackRef.current.map((id: string, i: number) => {
        const metadata = metadataLookup.current[id];
        if (metadata) {
          metadata.updateZIndex(makeZIndex(nodeStackRef.current.length - i));
        }
        return [id, i];
      })
    );
  };
  const findStackIndex = (id: string) =>
    nodeStackIndexLookupRef.current[id] ?? -1;

  function selectNode(id: string | null, center = false) {
    const temp = nodeIdRef.current;
    nodeIdRef.current = id;

    if (id != null) {
      if (nodeStackRef.current[nodeStackIndexRef.current] !== id) {
        const foundIndex = findStackIndex(id);
        if (foundIndex >= 0) {
          nodeStackRef.current.splice(foundIndex, 1);
        }
        nodeStackRef.current.unshift(id);
        nodeStackIndexRef.current = 0;
      }

      reindexNodeStack();

      if (center) {
        setWillPan(true);
        metadataLookup.current[id].centerOnNode();
        setTimeout(() => {
          setWillPan(false);
        }, 0);
      }
    }

    if (temp !== null) {
      metadataLookup.current[temp]?.forceUpdate();
    }

    if (temp !== nodeIdRef.current && nodeIdRef.current !== null) {
      metadataLookup.current[nodeIdRef.current]?.forceUpdate();
    }
  }

  function remove(id: string) {
    const { [id]: webview, ...rest } = nodesRef.current;
    delete metadataLookup.current[id];
    const index = findStackIndex(id);
    nodeStackRef.current.splice(index, 1);
    reindexNodeStack();
    nodesRef.current = rest;
    if (id === nodeIdRef.current) {
      nodeIdRef.current = null;
    }
    setNodes(nodesRef.current);
    onSaveNodes();
    return webview;
  }

  function add(
    metadata: SerializableNodeMetadata,
    options: {
      existingId?: string;
      autoSelect?: boolean;
    } = {}
  ) {
    const { existingId, autoSelect } = options;
    const { position, size, nodeDetails } = metadata;
    const zoomLevel = metadata.zoomLevel ?? 1;
    const id = existingId ?? uuidv4();
    const { x, y } = position;

    panningRef.current = false;

    const webview = (
      <WebNode
        id={id}
        metadataLookup={metadataLookup}
        nodeDetails={nodeDetails}
        startPosition={{ x, y }}
        startSize={size}
        startZoomLevel={zoomLevel}
        panZoomRef={panZoomRef}
        frameRef={baseRef}
        add={(nodeDetails: TNodeDetails, position?: Position, size?: Size) => {
          addDefault(nodeDetails, { position, size, transformPosition: false });
        }}
        remove={() => {
          remove(id);
        }}
        isSelected={() => nodeIdRef.current === id}
        zIndex={makeZIndex(nodeStackRef.current.length)}
        // isSelected={() => true}
        onSerialize={onSaveNodes}
        onChangeSelection={(selected: boolean, center = false) => {
          if (selected) {
            selectNode(id, center);
          } else if (nodeIdRef.current === id) {
            selectNode(null);
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
    setWillPan(panningRef.current);
    nodeStackRef.current.push(id);
    reindexNodeStack();

    if (autoSelect) {
      setTimeout(() => selectNode(id), 0);
    }
  }

  function addDefault(
    nodeDetails: TNodeDetails,
    options: {
      position?: Position;
      size?: Size;
      transformPosition?: boolean;
      autoSelect?: boolean;
    } = {}
  ) {
    const { position, size, autoSelect } = options;
    let { transformPosition } = options;
    transformPosition = transformPosition ?? true;

    const defaultSize =
      size ??
      (nodeDetails.type === 'text'
        ? {
            width: 300 * window.devicePixelRatio,
            height: 150 * window.devicePixelRatio,
          }
        : {
            width: 640 * window.devicePixelRatio,
            height: 480 * window.devicePixelRatio,
          });

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
    return add(
      {
        nodeDetails,
        position: transformPosition
          ? transformPoint(defaultPosition)
          : defaultPosition,
        size: defaultSize,
      },
      { autoSelect }
    );
  }

  function initializeWorkspace(id: string) {
    // Object.values(metadataLookup.current).forEach((v) => {
    //   v.setHiddenState(true);
    // });
    metadataLookup.current = {};
    const workspace = workspaceLookup.current[id];
    setBackgroundStyle(workspace.backgroundStyle, true);

    const existingNodes = workspace.nodes;
    if (Object.keys(existingNodes).length === 0) {
      addDefault(NodeHelper.text(basicHelpText), {
        position: { x: 40, y: 40 },
        size: { width: 640, height: 480 },
      });
      addDefault(NodeHelper.webview('www.google.com'), {
        position: { x: 360, y: 360 },
      });
    } else {
      Object.entries(existingNodes).forEach(([key, value]) => {
        add(value, { existingId: key });
      });
    }

    const { x, y, scale } = workspace.panzoom.transform as Transform;
    const currentScale = panZoomRef.current?.getTransform()?.scale ?? 1;
    panZoomRef.current?.zoomTo(0, 0, scale / currentScale);
    panZoomRef.current?.moveTo(x, y);

    window.electron.setTitle(workspace.title);
  }

  useEffect(() => {
    if (tabs.length === 0) {
      addWorkspace();
      return;
    }
    if (selectedWorkspaceId === null) {
      setWorkspaceId(saveDataRef.current.selectedWorkspaceId ?? tabs[0]);
      return;
    }
    if (Object.keys(nodes).length) {
      clear();
    }
    setTimeout(() => {
      saveDataRef.current.workspaceLookup[selectedWorkspaceId] =
        loadWorkspace(selectedWorkspaceId);
      initializeWorkspace(selectedWorkspaceId);
    }, 0);
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const swapNodeForward = (delta: number) => {
      didSwapNode.current = true;
      const numNodes = Object.keys(metadataLookup.current).length;
      const prevId = nodeStackRef.current[nodeStackIndexRef.current];
      metadataLookup.current[prevId].updateZIndex(
        makeZIndex(nodeStackIndexRef.current)
      );
      nodeStackIndexRef.current =
        (nodeStackIndexRef.current + delta) % numNodes;
      const id: string = nodeStackRef.current[nodeStackIndexRef.current];
      metadataLookup.current[id].updateZIndex(
        makeZIndex(nodeStackRef.current.length)
      );
      metadataLookup.current[id].centerOnNode();
    };

    const swapNodeRelease = () => {
      if (!didSwapNode.current) {
        return;
      }
      didSwapNode.current = false;
      const id = nodeStackRef.current[nodeStackIndexRef.current];
      nodeStackIndexRef.current = 0;
      selectNode(id);
    };

    window.addEventListener('dragend', (event) => {
      if (event.target) {
        const target = event.target as HTMLTextAreaElement;
        if (target && target.selectionStart && target.selectionEnd) {
          const text = target.innerHTML.substring(
            target.selectionStart,
            target.selectionEnd
          );
          addDefault(NodeHelper.text(text), {
            position: { x: event.x, y: event.y },
          });
        } else {
          console.log('Other kind of drag!');
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
        selectNode(null);
      }

      if (event.key === 'Meta') {
        setWillPan(true);
        setIsPanning(false);
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.metaKey || event.key === 'Meta') {
        swapNodeRelease();
      }

      if (event.key === 'Meta') {
        setWillPan(false);
      }
    });

    window.addEventListener('mousedown', () => {
      if (panningRef.current) {
        setIsPanning(true);
      }
    });

    window.addEventListener('mouseup', () => {
      setIsPanning(false);
    });

    const {
      onAddWebview,
      onAddText,
      onOpenCommandPalette,
      initialLoadFinished,
      onFocusApp,
      onZoomIn,
      onZoomOut,
      onZoomInAll,
      onZoomOutAll,
      onOpenUrl,
      onSetPreloadScript,
      onCopyWorkspaceToClipboard,
    } = window.electron;

    onAddWebview((objs) => {
      objs.forEach(({ url, position }) => {
        addDefault(NodeHelper.webview(url), {
          position,
          autoSelect: objs.length === 1,
        });
      });
    });

    onAddText((objs) => {
      objs.forEach(({ text, position }) => {
        addDefault(NodeHelper.text(text), {
          position,
          autoSelect: objs.length === 1,
        });
      });
    });

    onOpenCommandPalette(() => {
      setShowCommandPalette(true);
    });

    onCopyWorkspaceToClipboard(() => {
      copyWorkspaceToClipboard();
    });

    onFocusApp(() => {
      setWillPan(false);
    });

    onZoomIn(() => {
      if (nodeIdRef.current === null) {
        return;
      }
      const current = metadataLookup.current[nodeIdRef.current];
      current.changeZoom(current.zoomLevel * 1.5);
    });

    onZoomOut(() => {
      if (nodeIdRef.current === null) {
        return;
      }
      const current = metadataLookup.current[nodeIdRef.current];
      current.changeZoom(current.zoomLevel * 1.5 ** -1);
    });

    onZoomInAll(() => {
      const zoomLevels = Object.values(metadataLookup.current).map(
        (v) => v.zoomLevel
      );
      Object.values(metadataLookup.current).forEach((v, i) => {
        v.changeZoom(zoomLevels[i] * 1.5);
      });
    });

    onZoomOutAll(() => {
      const zoomLevels = Object.values(metadataLookup.current).map(
        (v) => v.zoomLevel
      );
      Object.values(metadataLookup.current).forEach((v, i) => {
        v.changeZoom(zoomLevels[i] * 1.5 ** -1);
      });
    });

    onOpenUrl((url: string) => {
      const parsedUrl = new URL(url);
      let { pathname } = parsedUrl;
      const { searchParams } = parsedUrl;

      if (pathname.startsWith('//')) {
        pathname = pathname.slice('//'.length);
      }

      if (pathname === 'share') {
        // This should prompt with a description of what it is.
        const value = searchParams.get('workspace');
        if (value === null) {
          return;
        }
        createWorkspaceFromString(value);
      }
    });

    onSetPreloadScript((src: string) => {
      window.preloadScript = `file://${src}`;
    });
    initialLoadFinished();
  }, []);

  return (
    <>
      <div ref={backgroundRef} className="background">
        <div className="filter" />
      </div>
      <div className="title-bar-container">
        <div className="title-bar-padding" />
        <div className="title-bar">
          <div className="home">
            <HomeIcon style={{ height: 16 }} />
          </div>
          <div className="tabs">
            {tabs.map((id: string) => (
              <WorkspaceTab
                key={`workspace-${id}`}
                id={id}
                selected={id === selectedWorkspaceId}
              />
            ))}
            <button
              className="tab"
              type="button"
              onClick={() => addWorkspace()}
            >
              <PlusIcon style={{ height: 16 }} />
            </button>
          </div>
        </div>
        <div className="title-bar-rest" />
      </div>
      {showCommandPalette && <div className="overlay" />}
      <div className="search-bar-container">
        <CopyClipboardLink
          onClick={() => {
            copyWorkspaceToClipboard();
          }}
        />
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
          onCommand={(command: Command) => {
            // AddWebview(w);
            if (CommandHelper.isAddNode(command)) {
              addDefault(command.details, { autoSelect: true });
            } else if (CommandHelper.isSetBackground(command)) {
              setBackgroundStyle(command.style, true);
            } else if (CommandHelper.isCopyLink(command)) {
              copyWorkspaceToClipboard();
            }
            setShowCommandPalette(false);
          }}
        />
      </CloseWithEscape>
      {/* <CloseWithEscape */}
      {/*   shown={showInputBox} */}
      {/*   onHide={() => setShowInputBox(false)} */}
      {/* > */}
      {/*   <InputBox  */}
      {/*     onBlur={() => setShowInputBox(false)}  */}
      {/*     value={inputBoxValue} */}
      {/*     onChange={setInputBoxValue} */}
      {/*   /> */}
      {/* </CloseWithEscape> */}
      {/* <Canvas /> */}
      {panning && (
        <style>{`*{cursor: ${
          activePanning ? 'grabbing' : 'grab'
        }!important}`}</style>
      )}
      <div
        ref={baseRef}
        className="base-canvas"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseDown={(event) => {
          // TODO: selecting background doesn't always work
          if (
            !event.metaKey &&
            !event.ctrlKey &&
            (event.target as HTMLElement).className === 'base-canvas'
          ) {
            selectNode(null);
          }
        }}
      >
        <Zoomable
          setPanZoom={(p) => {
            panZoomRef.current = p;
          }}
          onSerializePanZoom={onSavePanZoom}
          // maxZoom={0.2}
        >
          <div className="nodes">{Object.values(nodes)}</div>
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
