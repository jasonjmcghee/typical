import { MutableRefObject, useRef } from 'react';
import { TNodeLookup } from '../components/types';
import { useRefState } from './useRefState';

const useNodes = (): {
  nodeStackRef: MutableRefObject<string[]>;
  nodeStackIndexRef: MutableRefObject<number>;
  nodeStackIndexLookupRef: MutableRefObject<{ [id: string]: number }>;
  didSwapNode: MutableRefObject<boolean>;
  nodeIdRef: MutableRefObject<string | null>;
  nodes: TNodeLookup;
  setNodes: (nodes: TNodeLookup) => void;
  nodesRef: MutableRefObject<TNodeLookup>;
  clear: () => void;
} => {
  const nodeStackRef = useRef<string[]>([]);
  const nodeStackIndexRef = useRef<number>(0);
  const nodeStackIndexLookupRef = useRef<{ [id: string]: number }>({});
  const didSwapNode = useRef<boolean>(false);
  const [nodes, setNodes, nodesRef] = useRefState<TNodeLookup>({});
  const nodeIdRef = useRef<string | null>(null);

  const clear = () => {
    setNodes({});
    nodeIdRef.current = null;
    nodeStackRef.current = [];
    nodeStackIndexLookupRef.current = {};
    nodeStackIndexRef.current = 0;
    didSwapNode.current = false;
  };

  return {
    nodeStackRef,
    nodeStackIndexRef,
    nodeStackIndexLookupRef,
    didSwapNode,
    nodeIdRef,
    nodes,
    setNodes,
    nodesRef,
    clear,
  };
};

export { useNodes };
