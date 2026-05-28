"use client";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { useMemo, useState } from "react";

import type { Diagram, SolutionResponse } from "@/lib/api";

import { autoLayout } from "./auto-layout";
import { MARKER_INK, ToolbarEdge } from "./toolbar-edge";
import { SketchdNode, type SketchdNodeData } from "./sketchd-node";
import type { ComponentKind } from "./types";

const NODE_TYPES: NodeTypes = { sketchd: SketchdNode as never };
const EDGE_TYPES = { toolbar: ToolbarEdge };

interface Props {
  solution: SolutionResponse;
  onClose: () => void;
  /** Replace the user's current diagram with this solution. */
  onApply: (diagram: Diagram) => void;
}

export function SolutionModal({ solution, onClose, onApply }: Props) {
  const [selectedNode, setSelectedNode] = useState<string | null>(
    solution.nodes[0]?.id ?? null,
  );
  const [confirmApply, setConfirmApply] = useState(false);

  // Build laid-out React Flow nodes/edges from the solution.
  const { rfNodes, rfEdges } = useMemo(() => {
    const positions = autoLayout(solution.nodes, solution.edges);
    const nodes: Node<SketchdNodeData>[] = solution.nodes.map((n) => ({
      id: n.id,
      type: "sketchd",
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: { kind: n.type as ComponentKind, label: n.label },
      draggable: false,
      selectable: true,
    }));
    const edges: Edge[] = solution.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ?? undefined,
      type: "toolbar",
      data: { arrows: "end" },
      style: { stroke: "var(--color-ink)", strokeWidth: 1.5 },
      markerEnd: MARKER_INK,
      selectable: false,
    }));
    return { rfNodes: nodes, rfEdges: edges };
  }, [solution]);

  const handleApply = () => {
    if (!confirmApply) { setConfirmApply(true); return; }
    const positions = autoLayout(solution.nodes, solution.edges);
    const diagram: Diagram = {
      version: 1,
      nodes: solution.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        metadata: {},
      })),
      edges: solution.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label ?? null,
        metadata: { arrows: "end" },
      })),
    };
    onApply(diagram);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[860px] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-rule bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-rule bg-white px-5 py-3">
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-coral">
              Reference solution
            </div>
            <h2 className="m-0 text-[16px] font-semibold leading-tight tracking-tight text-ink">
              How a senior engineer might draw this
            </h2>
          </div>
          <button
            onClick={() => void handleApply()}
            className={
              "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-medium transition " +
              (confirmApply
                ? "bg-red text-white hover:bg-red/90"
                : "border border-rule bg-white text-ink-soft hover:border-ink hover:text-ink")
            }
            title={confirmApply ? "Click again to confirm — this overwrites your current diagram" : "Replace my current design with this solution"}
          >
            {confirmApply ? "Confirm — overwrite my design" : "Apply to my canvas"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-muted transition hover:bg-paper-2 hover:text-ink"
            title="Close (Esc)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body: canvas (left) + explainer (right) */}
        <div className="flex min-h-0 flex-1">
          <div className="relative flex-1 bg-paper">
            <ReactFlowProvider>
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                panOnDrag
                zoomOnScroll
                proOptions={{ hideAttribution: true }}
                // SketchdNode only declares source handles. Without Loose mode
                // React Flow can't find a target handle and renders zero-length
                // edge paths — matches the main Canvas, which sets the same.
                connectionMode={ConnectionMode.Loose}
                onNodeClick={(_, n) => setSelectedNode(n.id)}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(26,24,20,0.18)" />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          <aside className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-l border-rule bg-white">
            <section className="border-b border-rule p-5">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                Narrative
              </div>
              <div className="space-y-2 text-[13px] leading-[1.55] text-ink-soft">
                {solution.narrative.split(/\n\n+/).map((para, i) => (
                  <p key={i} className="m-0">{para}</p>
                ))}
              </div>
            </section>

            <section className="p-5">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                Components ({solution.nodes.length})
              </div>
              <p className="mb-3 text-[11.5px] text-ink-muted">
                Click a component to see why it&apos;s there.
              </p>
              <ul className="list-none space-y-1.5 p-0">
                {solution.nodes.map((n) => {
                  const active = selectedNode === n.id;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedNode(n.id)}
                        className={
                          "w-full rounded-md border p-2 text-left transition " +
                          (active
                            ? "border-coral bg-coral/10"
                            : "border-rule bg-paper hover:border-ink")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                            {n.type}
                          </span>
                          <span className="text-[12.5px] font-medium text-ink">
                            {n.label}
                          </span>
                        </div>
                        {active && (
                          <p className="m-0 mt-1.5 text-[12px] leading-[1.45] text-ink-soft">
                            {solution.rationale[n.id] ?? "—"}
                          </p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
