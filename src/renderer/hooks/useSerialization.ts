import {
  CSSProperties,
  MutableRefObject,
  RefObject,
  useEffect,
  useRef,
} from 'react';
import { PanZoom } from 'panzoom';
import { MetadataLookup, SerializableMetadataLookup } from '../components/Node';
import {
  PanZoomSettings,
  SaveData,
  Workspace,
  WorkspaceLookup,
} from '../components/types';
import { defaultPanZoomSettings } from '../components/Zoomable';

const defaultBackgroundImage =
  'linear-gradient(224.03deg, #FF8575 -4%, #DD439F 93.89%)';
const defaultBackgroundStyle = {
  background: `${defaultBackgroundImage} no-repeat center / cover`,
};

function loadFromWorkspace<T>(id: string, key: string, defaultValue: T): T {
  if (id === null) {
    return defaultValue;
  }
  const workspaceSavePath = `workspaceLookup.${id}`;

  const rawValue = localStorage.getItem(`saveData.${workspaceSavePath}.${key}`);
  if (rawValue === null) {
    return defaultValue;
  }
  return (JSON.parse(rawValue) as T) ?? defaultValue;
}

const loadNodes = (id: string) =>
  loadFromWorkspace<SerializableMetadataLookup>(id, 'nodes', {});

const loadPanZoom = (id: string) =>
  loadFromWorkspace<PanZoomSettings>(id, 'panzoom', defaultPanZoomSettings);

const loadBackgroundStyle = (id: string) =>
  loadFromWorkspace<CSSProperties>(
    id,
    'backgroundStyle',
    defaultBackgroundStyle
  );

const loadWorkspaceMetadata = (id: string) => ({
  id: loadFromWorkspace<string>(id, 'id', ''),
  title: loadFromWorkspace<string>(id, 'title', 'Untitled'),
});

const loadWorkspace = (id: string) => {
  return {
    ...loadWorkspaceMetadata(id),
    nodes: loadNodes(id),
    panzoom: loadPanZoom(id),
    backgroundStyle: loadBackgroundStyle(id),
  };
};

const loadSaveMetadata = () => {
  const result: SaveData = {
    appVersion: '0.0.0',
    workspaceLookup: {},
    tabs: [],
    selectedWorkspaceId: null,
  };
  const version = localStorage.getItem('saveData.appVersion') || '0.0.0';
  const tabs = JSON.parse(localStorage.getItem('saveData.tabs') || '[]');
  const selectedWorkspaceId = localStorage.getItem(
    'saveData.selectedWorkspaceId'
  );
  result.appVersion = version;
  result.tabs = tabs;
  result.selectedWorkspaceId = selectedWorkspaceId;
  tabs.forEach((id: string) => {
    result.workspaceLookup[id] = loadWorkspace(id);
  });
  return result;
};

const useSerialization = ({
  metadataLookup,
  panZoomRef,
}: {
  metadataLookup: MutableRefObject<MetadataLookup>;
  panZoomRef: RefObject<PanZoom>;
}) => {
  const saveDataRef = useRef<SaveData>(loadSaveMetadata());

  const getWorkspaceId = () => saveDataRef.current.selectedWorkspaceId;
  const getWorkspace = (id: string) => saveDataRef.current.workspaceLookup[id];

  const saveToWorkspace = (key: string, value: unknown) => {
    const id = getWorkspaceId();
    if (id === null) {
      return false;
    }
    const workspaceSavePath = `workspaceLookup.${id}`;

    localStorage.setItem(
      `saveData.${workspaceSavePath}.${key}`,
      JSON.stringify(value)
    );
    return true;
  };
  const tryToSetWorkspace = (
    key: string,
    fn: (workspace: Workspace) => unknown
  ) => {
    const id = getWorkspaceId();
    if (id === null) {
      return false;
    }
    const workspace = getWorkspace(id);
    if (workspace == null) {
      return false;
    }
    return saveToWorkspace(key, fn(workspace));
  };

  const onSaveNodes = () =>
    tryToSetWorkspace('nodes', (w) => {
      w.nodes = metadataLookup.current;
      return w.nodes;
    });

  const onSavePanZoom = () =>
    tryToSetWorkspace('panzoom', (w) => {
      const transform = panZoomRef.current?.getTransform();
      if (transform) {
        w.panzoom = { transform };
      }
      return w.panzoom;
    });

  const onSaveBackgroundStyle = (style: CSSProperties) =>
    tryToSetWorkspace('backgroundStyle', (w) => {
      w.backgroundStyle = style;
      return w.backgroundStyle;
    });

  const onSaveWorkspaceMetadata = ({
    id,
    title,
  }: {
    id: string;
    title: string;
  }) => {
    tryToSetWorkspace('title', (w) => {
      window.electron.setTitle(title);
      w.title = title;
      return w.title;
    });
    tryToSetWorkspace('id', (w) => {
      w.id = id;
      return w.id;
    });
  };

  const saveMetadata = (key: string, value: string) => {
    localStorage.setItem(`saveData.${key}`, value);
  };

  const onSelectWorkspaceId = () => {
    const id = saveDataRef.current.selectedWorkspaceId;
    if (id) {
      saveMetadata('selectedWorkspaceId', id);
    }
  };

  const onSaveMetadata = () => {
    saveMetadata('appVersion', saveDataRef.current.appVersion);
    saveMetadata('tabs', JSON.stringify(saveDataRef.current.tabs));
  };

  return {
    saveDataRef,
    onSaveNodes,
    onSavePanZoom,
    onSaveBackgroundStyle,
    onSaveWorkspaceMetadata,
    onSaveMetadata,
    onSelectWorkspaceId,
    loadWorkspace,
    loadSaveMetadata,
  };
};

export { useSerialization };
