"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

import { useHistory } from "./history-context";

export type ArrowMode = "none" | "end" | "start" | "both";

export const MARKER_INK = {
  type: MarkerType.ArrowClosed,
  color: "var(--color-ink)",
  width: 18,
  height: 18,
} as const;

// Custom smoothstep edge. Uses React Flow's handle-derived coordinates (so it
// snaps cleanly to node handles like a standard edge), but renders a floating
// toolbar at its midpoint when selected: arrow-style toggle + delete.
export function ToolbarEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  style, selected, data,
  markerEnd, markerStart,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const history = useHistory();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  });

  const arrows: ArrowMode =
    (data as { arrows?: ArrowMode } | undefined)?.arrows ?? "end";

  const setArrows = (next: ArrowMode) => {
    history.push();
    setEdges((edges) =>
      edges.map((e) =>
        e.id === id
          ? {
              ...e,
              data: { ...(e.data ?? {}), arrows: next },
              markerEnd:
                next === "end" || next === "both" ? MARKER_INK : undefined,
              markerStart:
                next === "start" || next === "both" ? MARKER_INK : undefined,
            }
          : e,
      ),
    );
  };

  const remove = () => {
    history.push();
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            <EdgeToolbar arrows={arrows} onArrows={setArrows} onDelete={remove} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────────────
function EdgeToolbar({
  arrows, onArrows, onDelete,
}: {
  arrows: ArrowMode;
  onArrows: (next: ArrowMode) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-rule bg-white p-0.5 shadow-lg">
      <Btn
        active={arrows === "none"}
        onClick={() => onArrows("none")}
        title="Line (no arrow)"
      >
        <svg width="22" height="10" viewBox="0 0 22 10">
          <line x1="2" y1="5" x2="20" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </Btn>
      <Btn
        active={arrows === "end"}
        onClick={() => onArrows("end")}
        title="Arrow at end"
      >
        <svg width="22" height="10" viewBox="0 0 22 10">
          <line x1="2" y1="5" x2="15" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 1 L20 5 L14 9 Z" fill="currentColor" />
        </svg>
      </Btn>
      <Btn
        active={arrows === "both"}
        onClick={() => onArrows("both")}
        title="Arrows both ends"
      >
        <svg width="22" height="10" viewBox="0 0 22 10">
          <line x1="6" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 1 L2 5 L8 9 Z" fill="currentColor" />
          <path d="M14 1 L20 5 L14 9 Z" fill="currentColor" />
        </svg>
      </Btn>

      <span className="mx-0.5 h-5 w-px bg-rule" aria-hidden />

      <Btn onClick={onDelete} title="Delete connection" danger>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 4h8M5.5 4V2.5h3V4M4 4l.5 7.5h5L10 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Btn>
    </div>
  );
}

function Btn({
  active, onClick, title, children, danger,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const cls = danger
    ? "text-ink-soft hover:bg-red/10 hover:text-red"
    : active
    ? "bg-coral/15 text-coral"
    : "text-ink-soft hover:bg-paper-2 hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        "flex h-7 w-8 items-center justify-center rounded-md transition " + cls
      }
    >
      {children}
    </button>
  );
}
