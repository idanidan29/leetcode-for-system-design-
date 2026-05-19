"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import {
  COMPONENTS_BY_KIND,
  TONE_CLASSES,
  type ComponentKind,
} from "./types";

// React Flow requires node data to be index-signature-compatible.
export type SketchdNodeData = {
  kind: ComponentKind;
  label: string;
} & Record<string, unknown>;

export function SketchdNode({ data, selected }: NodeProps) {
  const d = data as unknown as SketchdNodeData;
  const def = COMPONENTS_BY_KIND[d.kind];
  const tone = TONE_CLASSES[def.tone];

  return (
    <div
      className={
        `min-w-[140px] rounded-xl border-2 px-3 py-2.5 transition ` +
        `${tone.bg} ${tone.border} ` +
        (selected ? "ring-2 ring-coral ring-offset-2 ring-offset-paper" : "")
      }
    >
      {/* Edge handles — one on each side so edges can come/go any direction */}
      <Handle type="target" position={Position.Left}   className="!h-2 !w-2 !border-ink !bg-paper" />
      <Handle type="target" position={Position.Top}    className="!h-2 !w-2 !border-ink !bg-paper" />
      <Handle type="source" position={Position.Right}  className="!h-2 !w-2 !border-ink !bg-paper" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-ink !bg-paper" />

      <div className={`font-mono text-[9px] uppercase tracking-[0.1em] ${tone.text} mb-0.5`}>
        {def.label}
      </div>
      <div className="font-medium text-[13px] text-ink leading-tight">
        {d.label}
      </div>
    </div>
  );
}
