import { Transform } from 'panzoom';
import { CSSProperties, ReactElement } from 'react';
import { SerializableMetadataLookup, TNode, WebNode } from './Node';

interface PanZoomSettings {
  transform: Transform;
}

interface Workspace {
  id: string;
  title: string;
  nodes: SerializableMetadataLookup;
  panzoom: PanZoomSettings;
  backgroundStyle: CSSProperties;
}

type WorkspaceLookup = { [id: string]: Workspace };

interface SaveData {
  appVersion: string;
  workspaceLookup: WorkspaceLookup;
  tabs: string[];
  selectedWorkspaceId: string | null;
}

type TNodeLookup = {
  [id: string]: ReactElement<TNode, typeof WebNode>;
};

export { SaveData, TNodeLookup, WorkspaceLookup, Workspace, PanZoomSettings };
