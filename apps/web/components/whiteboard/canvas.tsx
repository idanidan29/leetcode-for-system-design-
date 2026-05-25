"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type OnReconnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import type { Diagram, DiagramEdge, DiagramNode } from "@/lib/api";

import { HistoryContext } from "./history-context";
import {
  SketchdNode,
  type SketchdNodeData,
  type SketchdTone,
} from "./sketchd-node";
import {
  MARKER_INK,
  ToolbarEdge,
  type ArrowMode,
} from "./toolbar-edge";
import { COMPONENTS_BY_KIND, type ComponentKind } from "./types";

type RFNode = Node<SketchdNodeData>;

const NODE_TYPES: NodeTypes = { sketchd: SketchdNode as never };
const EDGE_TYPES: EdgeTypes = { toolbar: ToolbarEdge };

const DEFAULT_EDGE_STYLE = { stroke: "var(--color-ink)", strokeWidth: 1.5 };
const HISTORY_LIMIT = 100;

export interface CanvasHandle {
  addNode: (kind: ComponentKind) => void;
  toDiagram: () => Diagram;
  loadDiagram: (d: Diagram) => void;
  clear: () => void;
}

interface Props {
  initial?: Diagram | null;
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function edgeFromArrows(arrows: ArrowMode): Pick<Edge, "markerEnd" | "markerStart"> {
  return {
    markerEnd: arrows === "end" || arrows === "both" ? MARKER_INK : undefined,
    markerStart: arrows === "start" || arrows === "both" ? MARKER_INK : undefined,
  };
}

function diagramToReactFlow(d: Diagram): { nodes: RFNode[]; edges: Edge[] } {
  const nodes: RFNode[] = d.nodes.map((n) => {
    const tone =
      n.metadata && typeof n.metadata === "object" && "tone" in n.metadata
        ? (n.metadata as { tone?: SketchdTone }).tone
        : undefined;
    return {
      id: n.id,
      type: "sketchd",
      position: { x: n.position.x, y: n.position.y },
      data: {
        kind: (n.type as ComponentKind),
        label: n.label,
        ...(tone ? { tone } : {}),
      },
    };
  });
  const edges: Edge[] = d.edges.map((e) => {
    const arrows: ArrowMode =
      (e.metadata && typeof e.metadata === "object" && "arrows" in e.metadata
        ? (e.metadata as { arrows?: ArrowMode }).arrows
        : undefined) ?? "end";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ?? undefined,
      type: "toolbar",
      data: { arrows },
      style: DEFAULT_EDGE_STYLE,
      ...edgeFromArrows(arrows),
    };
  });
  return { nodes, edges };
}

function reactFlowToDiagram(nodes: RFNode[], edges: Edge[]): Diagram {
  const dNodes: DiagramNode[] = nodes.map((n) => {
    const d = n.data;
    return {
      id: n.id,
      type: d.kind,
      label: d.label,
      position: { x: n.position.x, y: n.position.y },
      metadata: d.tone ? { tone: d.tone } : {},
    };
  });
  const dEdges: DiagramEdge[] = edges.map((e) => {
    const arrows: ArrowMode =
      (e.data as { arrows?: ArrowMode } | undefined)?.arrows ?? "end";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === "string" ? e.label : null,
      metadata: { arrows },
    };
  });
  return { version: 1, nodes: dNodes, edges: dEdges };
}

// ─── Canvas inner (lives inside ReactFlowProvider) ───────────────────────────
const CanvasInner = forwardRef<CanvasHandle, Props>(function CanvasInner({ initial }, ref) {
  const initialRF = useMemo(
    () => (initial ? diagramToReactFlow(initial) : { nodes: [], edges: [] }),
    [initial],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>(initialRF.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialRF.edges);
  const { screenToFlowPosition } = useReactFlow();

  const dropOffset = useRef(0);

  // ─── Undo / redo ────────────────────────────────────────────────────────
  // Live refs so push() (called from child components via context) always
  // snapshots the latest state without re-creating the function.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  type Snapshot = { nodes: RFNode[]; edges: Edge[] };
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  const push = useCallback(() => {
    past.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
  }, []);

  const historyValue = useMemo(() => ({ push }), [push]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [setNodes, setEdges]);

  // Keyboard: Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z or Ctrl+Y = redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Wrap React Flow's change handlers so built-in interactions (Delete key,
  // box-select-then-delete) also enter the history stack.
  const handleNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => {
      if (changes.some((c) => c.type === "remove")) push();
      onNodesChange(changes);
    },
    [onNodesChange, push],
  );
  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      if (changes.some((c) => c.type === "remove")) push();
      onEdgesChange(changes);
    },
    [onEdgesChange, push],
  );

  // ─── User actions that mutate state ─────────────────────────────────────
  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      push();
      setEdges((es) =>
        addEdge(
          {
            ...params,
            id: newId(),
            type: "toolbar",
            data: { arrows: "end" satisfies ArrowMode },
            style: DEFAULT_EDGE_STYLE,
            ...edgeFromArrows("end"),
          },
          es,
        ),
      );
    },
    [setEdges, push],
  );

  const onReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      push();
      setEdges((es) => reconnectEdge(oldEdge, newConnection, es));
    },
    [setEdges, push],
  );

  const onNodeDragStart = useCallback(() => {
    // Snapshot pre-drag positions; drop is final.
    push();
  }, [push]);

  useImperativeHandle(
    ref,
    () => ({
      addNode: (kind: ComponentKind) => {
        const def = COMPONENTS_BY_KIND[kind];
        const center = screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        const offset = dropOffset.current * 24;
        dropOffset.current = (dropOffset.current + 1) % 6;
        const node: RFNode = {
          id: newId(),
          type: "sketchd",
          position: { x: center.x - 70 + offset, y: center.y - 30 + offset },
          data: { kind, label: kind === "custom" ? "" : def.label },
        };
        push();
        setNodes((ns) => [...ns, node]);
      },

      toDiagram: () => reactFlowToDiagram(nodes, edges),

      loadDiagram: (d: Diagram) => {
        const rf = diagramToReactFlow(d);
        // Loading replaces canvas content — reset history.
        past.current = [];
        future.current = [];
        setNodes(rf.nodes);
        setEdges(rf.edges);
      },

      clear: () => {
        push();
        setNodes([]);
        setEdges([]);
      },
    }),
    [nodes, edges, setNodes, setEdges, screenToFlowPosition, push],
  );

  return (
    <HistoryContext.Provider value={historyValue}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeDragStart={onNodeDragStart}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        connectionMode={ConnectionMode.Loose}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(26,24,20,0.18)" />
        <Controls position="bottom-right" />
      </ReactFlow>
    </HistoryContext.Provider>
  );
});

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  return (
    <ReactFlowProvider>
      <CanvasInner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});
