"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";

import type { Diagram, DiagramEdge, DiagramNode } from "@/lib/api";

import { SketchdNode, type SketchdNodeData } from "./sketchd-node";
import { COMPONENTS_BY_KIND, type ComponentKind } from "./types";

// React Flow node generic instantiated with our domain data shape.
type RFNode = Node<SketchdNodeData>;

const NODE_TYPES: NodeTypes = { sketchd: SketchdNode as never };

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
  // crypto.randomUUID is available in modern browsers + Node 19+
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function diagramToReactFlow(d: Diagram): { nodes: RFNode[]; edges: Edge[] } {
  const nodes: RFNode[] = d.nodes.map((n) => ({
    id: n.id,
    type: "sketchd",
    position: { x: n.position.x, y: n.position.y },
    data: {
      kind: (n.type as ComponentKind),
      label: n.label,
    },
  }));
  const edges: Edge[] = d.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? undefined,
    type: "smoothstep",
    animated: false,
    style: { stroke: "var(--color-ink)", strokeWidth: 1.5 },
  }));
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
      metadata: {},
    };
  });
  const dEdges: DiagramEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : null,
    metadata: {},
  }));
  return { version: 1, nodes: dNodes, edges: dEdges };
}

// Inner component that uses the React Flow hooks. Must live inside <ReactFlowProvider>.
const CanvasInner = forwardRef<CanvasHandle, Props>(function CanvasInner({ initial }, ref) {
  const initialRF = useMemo(
    () => (initial ? diagramToReactFlow(initial) : { nodes: [], edges: [] }),
    [initial],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>(initialRF.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialRF.edges);
  const { screenToFlowPosition } = useReactFlow();

  // Stagger newly-added nodes so they don't pile up at the same coords.
  const dropOffset = useRef(0);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      setEdges((es) =>
        addEdge(
          {
            ...params,
            id: newId(),
            type: "smoothstep",
            animated: false,
            style: { stroke: "var(--color-ink)", strokeWidth: 1.5 },
          },
          es,
        ),
      );
    },
    [setEdges],
  );

  useImperativeHandle(
    ref,
    () => ({
      addNode: (kind: ComponentKind) => {
        const def = COMPONENTS_BY_KIND[kind];
        // Drop in the center of the visible viewport with a small staircase.
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
          data: { kind, label: def.label },
        };
        setNodes((ns) => [...ns, node]);
      },

      toDiagram: () => reactFlowToDiagram(nodes, edges),

      loadDiagram: (d: Diagram) => {
        const rf = diagramToReactFlow(d);
        setNodes(rf.nodes);
        setEdges(rf.edges);
      },

      clear: () => {
        setNodes([]);
        setEdges([]);
      },
    }),
    [nodes, edges, setNodes, setEdges, screenToFlowPosition],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={NODE_TYPES}
      connectionMode={ConnectionMode.Loose}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(26,24,20,0.18)" />
      <Controls position="bottom-right" />
    </ReactFlow>
  );
});

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  return (
    <ReactFlowProvider>
      <CanvasInner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});
