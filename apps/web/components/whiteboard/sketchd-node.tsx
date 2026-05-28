"use client";

import {
  Handle,
  NodeToolbar,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import type { EvaluationIssue } from "@/lib/api";

import { useNodeAnnotations } from "./annotations-context";
import { useHistory } from "./history-context";
import { Shape, SHAPE_PER_KIND, TONE_COLORS } from "./shapes";
import { COMPONENTS_BY_KIND, type ComponentDef, type ComponentKind } from "./types";

export type SketchdTone = ComponentDef["tone"];

// React Flow requires node data to be index-signature-compatible.
export type SketchdNodeData = {
  kind: ComponentKind;
  label: string;
  /** Optional tone override (used by Custom node color picker). */
  tone?: SketchdTone;
} & Record<string, unknown>;

const SWATCHES: { tone: SketchdTone; label: string; swatch: string }[] = [
  { tone: "ink",   label: "Default", swatch: "#3a352d" },
  { tone: "coral", label: "Coral",   swatch: "var(--color-coral)" },
  { tone: "amber", label: "Amber",   swatch: "var(--color-amber)" },
  { tone: "blue",  label: "Blue",    swatch: "var(--color-blue)" },
  { tone: "acid",  label: "Acid",    swatch: "#9bc928" },
];

// ─── Node ────────────────────────────────────────────────────────────────────
export function SketchdNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as SketchdNodeData;
  const def = COMPONENTS_BY_KIND[d.kind];
  const shape = SHAPE_PER_KIND[d.kind];
  const activeTone: SketchdTone = d.tone ?? def.tone;
  const colors = TONE_COLORS[activeTone];
  const [w, h] = shape.size;

  // Evaluation badges (rendered when this node has open issues anchored to it).
  const annotations = useNodeAnnotations(id);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);

  const { setNodes, setEdges } = useReactFlow();
  const history = useHistory();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(d.label);
  }, [d.label, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commitLabel = () => {
    const trimmed = draft.trim();
    history.push();
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, label: trimmed || def.label } }
          : n,
      ),
    );
    setEditing(false);
  };
  const cancelLabel = () => {
    setDraft(d.label);
    setEditing(false);
  };

  const setTone = (tone: SketchdTone) => {
    history.push();
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, tone } } : n,
      ),
    );
  };

  const deleteNode = () => {
    history.push();
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    setEdges((edges) => edges.filter((e) => e.source !== id && e.target !== id));
  };

  const isCustom = d.kind === "custom";

  return (
    <>
      {/* Floating toolbar above the node — shows on selection */}
      <NodeToolbar isVisible={selected && !editing} position={Position.Top} offset={10}>
        <div className="flex items-center gap-0.5 rounded-lg border border-rule bg-white p-0.5 shadow-lg">
          <ToolBtn
            title="Edit text"
            onClick={() => setEditing(true)}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M9.5 2.5l2 2-7 7H2.5v-2l7-7zM8.5 3.5l2 2"
                stroke="currentColor" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </ToolBtn>

          {isCustom && (
            <>
              <span className="mx-0.5 h-5 w-px bg-rule" aria-hidden />
              {SWATCHES.map((s) => (
                <button
                  key={s.tone}
                  type="button"
                  onClick={() => setTone(s.tone)}
                  title={s.label}
                  className={
                    "relative h-6 w-6 rounded-full transition hover:scale-110 " +
                    (activeTone === s.tone
                      ? "ring-2 ring-ink ring-offset-1 ring-offset-white"
                      : "ring-1 ring-rule")
                  }
                  style={{ background: s.swatch }}
                />
              ))}
            </>
          )}

          <span className="mx-0.5 h-5 w-px bg-rule" aria-hidden />

          <ToolBtn title="Delete" onClick={deleteNode} danger>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 4h8M5.5 4V2.5h3V4M4 4l.5 7.5h5L10 4"
                stroke="currentColor" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </ToolBtn>
        </div>
      </NodeToolbar>

      <div
        className={"relative transition-all " + (selected ? "sk-node-selected" : "")}
        style={{ width: w, height: h }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <svg
          className="absolute inset-0"
          width="100%"
          height="100%"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
        >
          <Shape kind={shape.shape} w={w} h={h} stroke={colors.stroke} fill={colors.fill} />
        </svg>

        <div className="relative grid h-full place-items-center px-3 text-center leading-tight">
          <div className="w-full">
            {!isCustom && (
              <div
                className="pointer-events-none mb-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em]"
                style={{ color: colors.stroke }}
              >
                {def.label}
              </div>
            )}

            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") commitLabel();
                  else if (e.key === "Escape") cancelLabel();
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="nodrag w-full rounded border border-coral bg-white px-1.5 py-0.5 text-center text-[12.5px] font-medium text-ink outline-none focus:ring-2 focus:ring-coral/40"
              />
            ) : (
              <div
                className="pointer-events-none text-[12.5px] font-medium text-ink"
                title="Double-click to rename"
              >
                {d.label || (
                  <span className="italic text-ink-muted">double-click to edit</span>
                )}
              </div>
            )}
          </div>
        </div>

        <SideHandle position={Position.Top}    id="top" />
        <SideHandle position={Position.Right}  id="right" />
        <SideHandle position={Position.Bottom} id="bottom" />
        <SideHandle position={Position.Left}   id="left" />

        {annotations && annotations.issues.length > 0 && (
          <AnnotationBadge
            issues={annotations.issues}
            open={annotationsOpen}
            onToggle={() => setAnnotationsOpen((o) => !o)}
          />
        )}
      </div>
    </>
  );
}

// ─── Annotation badge (top-right of node) ────────────────────────────────────
const SEVERITY_RANK = { low: 0, medium: 1, high: 2 } as const;
const BADGE_BG = {
  low:    "bg-amber",
  medium: "bg-coral",
  high:   "bg-red",
} as const;

function AnnotationBadge({
  issues, open, onToggle,
}: {
  issues: EvaluationIssue[];
  open: boolean;
  onToggle: () => void;
}) {
  // Worst severity drives the badge color.
  const worst = issues.reduce<EvaluationIssue["severity"]>(
    (acc, i) => (SEVERITY_RANK[i.severity] > SEVERITY_RANK[acc] ? i.severity : acc),
    "low",
  );
  const bg = BADGE_BG[worst];

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onMouseDown={(e) => e.stopPropagation()}
        title={`${issues.length} ${issues.length === 1 ? "issue" : "issues"} flagged`}
        className={
          "nodrag absolute -right-2 -top-2 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white shadow-md transition hover:scale-110 " +
          bg
        }
      >
        !{issues.length > 1 ? <span className="ml-0.5">{issues.length}</span> : null}
      </button>
      {open && (
        <div
          className="nodrag absolute left-full top-0 z-20 ml-2 w-[240px] rounded-lg border border-rule bg-white p-2 shadow-lg"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-muted">
            Flagged ({issues.length})
          </div>
          <ul className="list-none space-y-1.5 p-0">
            {issues.map((i, idx) => (
              <li key={idx} className="text-[11.5px] leading-[1.4]">
                <span
                  className={
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle " + BADGE_BG[i.severity]
                  }
                />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-muted">
                  {i.category}
                </span>
                <p className="m-0 mt-0.5 text-ink">{i.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function SideHandle({ position, id }: { position: Position; id: string }) {
  return (
    <Handle
      type="source"
      position={position}
      id={id}
      className="sk-handle h-2.5! w-2.5! border-[1.5px]! border-ink! bg-paper!"
    />
  );
}

function ToolBtn({
  onClick, title, children, danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        "flex h-7 w-8 items-center justify-center rounded-md transition " +
        (danger
          ? "text-ink-soft hover:bg-red/10 hover:text-red"
          : "text-ink-soft hover:bg-paper-2 hover:text-ink")
      }
    >
      {children}
    </button>
  );
}
