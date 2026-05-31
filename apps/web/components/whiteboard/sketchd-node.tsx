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
  /** Optional method/function signatures shown in the UML methods compartment.
   *  Only renders on rect-shaped nodes (uml-class / uml-interface / etc.); a
   *  taller cylinder would just look wrong. Stored per-line as a free-form
   *  string so users can write whatever convention they like ("update()",
   *  "+ attach(o: Observer)", etc.). */
  methods?: string[];
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

  // Methods/functions compartment (UML class-like nodes only). Each method is
  // its own row with its own input + delete button. When the node is selected
  // the rows are editable; otherwise they render as read-only text.
  const methods: string[] = d.methods ?? [];
  const methodInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Index of a freshly-added row that should grab focus on the next render.
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);

  // Only rect-shaped nodes get a useful methods compartment; on a cylinder
  // or diamond the stretched shape would look wrong.
  const canHaveMethods = shape.shape === "rect" || shape.shape === "rect-dash";

  useEffect(() => {
    if (!editing) setDraft(d.label);
  }, [d.label, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (pendingFocus === null) return;
    const el = methodInputRefs.current[pendingFocus];
    if (el) {
      el.focus();
      // Cursor at end so the user can type immediately.
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  // When the node gets deselected, the method <input>s unmount without
  // firing blur — so empty rows would linger and render as blank read-only
  // lines. Drop them here.
  useEffect(() => {
    if (selected) return;
    if (methods.some((m) => m.trim().length === 0)) {
      const cleaned = methods.filter((m) => m.trim().length > 0);
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, methods: cleaned } } : n,
        ),
      );
    }
    // We intentionally don't depend on `methods` — only react to selection
    // changes — otherwise this would race with addMethod's empty row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

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

  // Helper to swap the methods array on this node. Each mutation pushes a
  // history snapshot so Ctrl+Z can roll back individual add/edit/delete ops.
  const setMethods = (next: string[]) => {
    history.push();
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, methods: next } } : n,
      ),
    );
  };

  const addMethod = () => {
    const next = [...methods, ""];
    setMethods(next);
    setPendingFocus(next.length - 1); // focus the new row on next render
  };
  const removeMethod = (i: number) => {
    setMethods(methods.filter((_, idx) => idx !== i));
  };
  const updateMethod = (i: number, value: string) => {
    setMethods(methods.map((m, idx) => (idx === i ? value : m)));
  };
  // After the user leaves an input, drop any empty rows so the saved data
  // and the LLM-facing serialization stay clean. Only triggers when focus
  // leaves the methods area entirely (not when tabbing between rows).
  const trimEmptyMethods = () => {
    const next = methods.filter((m) => m.trim().length > 0);
    if (next.length !== methods.length) setMethods(next);
  };

  // Only show the compartment (divider + rows) when there's at least one
  // method. An empty methods array means "no functions" — the node should
  // look exactly like a plain class with no extra divider. Users add the
  // first function via the ƒ() toolbar button.
  const showCompartment = canHaveMethods && methods.length > 0;
  const nodeHeight =
    !showCompartment
      ? h
      : h + methodsCompartmentHeight(methods.length, !!selected);

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

          {canHaveMethods && (
            <ToolBtn
              title="Add a function"
              onClick={addMethod}
            >
              {/* Stylized fn() glyph — matches the "code" affordance. */}
              <svg width="15" height="13" viewBox="0 0 18 14" fill="none">
                <path
                  d="M4 2c-1.6 0-2 1-2 2v6c0 1 .4 2 2 2M14 2c1.6 0 2 1 2 2v6c0 1-.4 2-2 2"
                  stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                <path
                  d="M7 5h1.5l1 4M11 5l-1.5 4"
                  stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </ToolBtn>
          )}

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
        style={{ width: w, height: nodeHeight }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <svg
          className="absolute inset-0"
          width="100%"
          height="100%"
          viewBox={`0 0 ${w} ${nodeHeight}`}
          preserveAspectRatio="none"
        >
          <Shape
            kind={shape.shape}
            w={w}
            h={nodeHeight}
            stroke={colors.stroke}
            fill={colors.fill}
          />
        </svg>

        <div className="relative flex h-full flex-col px-3 py-2 text-center leading-tight">
          {/* Header section — stereotype + class name. Centered vertically
              when the methods compartment is hidden, top-aligned otherwise. */}
          <div
            className={
              "w-full " +
              (showCompartment
                ? "shrink-0"
                : "flex flex-1 flex-col justify-center")
            }
          >
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

          {/* Methods compartment — UML convention: a horizontal divider then
              the method list. When the node is selected each method becomes
              its own editable row with a delete button, plus an "+ Add"
              affordance at the bottom. Deselected → read-only text lines. */}
          {showCompartment && (
            <>
              <div
                className="mt-1.5 mb-1 h-px w-full opacity-40"
                style={{ background: colors.stroke }}
              />
              {selected ? (
                <div
                  className="text-left"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {methods.map((m, i) => (
                    <div
                      key={i}
                      className="group/method flex items-center gap-0.5"
                    >
                      <input
                        ref={(el) => {
                          methodInputRefs.current[i] = el;
                        }}
                        value={m}
                        onChange={(e) => updateMethod(i, e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            // Commit & exit — blur runs trimEmptyMethods,
                            // so an empty row dissolves the compartment.
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          } else if (e.key === "Backspace" && m === "") {
                            // Backspace on empty input deletes the row and
                            // moves focus to the previous one — feels right.
                            e.preventDefault();
                            removeMethod(i);
                            if (i > 0) setPendingFocus(i - 1);
                          } else if (e.key === "Escape") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        onBlur={() => {
                          // Slight delay so a click on the × or + button
                          // gets a chance to fire before we trim empties.
                          setTimeout(trimEmptyMethods, 0);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="attach(observer)"
                        className="nodrag h-4.25 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-[10.5px] leading-[1.45] text-ink outline-none placeholder:text-ink-muted/50 focus:bg-paper-2/60"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMethod(i);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Delete this function"
                        className="nodrag inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-ink-muted/70 opacity-0 transition hover:bg-red/10 hover:text-red group-hover/method:opacity-100 group-focus-within/method:opacity-100"
                      >
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addMethod();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Add a function"
                    className="nodrag mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-ink-muted/80 transition hover:text-coral"
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    add
                  </button>
                </div>
              ) : (
                <ul
                  className="m-0 list-none space-y-0 p-0 text-left"
                  title="Select the node to edit functions"
                >
                  {methods.map((m, i) => (
                    <li
                      key={i}
                      className="truncate font-mono text-[10.5px] leading-[1.45] text-ink"
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
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

// Vertical space the methods compartment needs to add to the node — caller
// adds this to the base height. Selected nodes use input rows (taller) plus
// a "+ add" button; deselected nodes use compact text lines. Returning the
// same number that drives the SVG viewBox keeps rounded corners from being
// stretched into ovals.
function methodsCompartmentHeight(methodCount: number, selected: boolean): number {
  // Layout constants — kept aligned with the JSX above. The editable row is
  // a borderless input so it matches the read-only line height (17px); the
  // "+ add" button below it is text-sized (~14px) plus the 2px mt-0.5 gap.
  const DIVIDER = 6;
  const FOOTER = 4;
  const LINE = 17;
  if (selected) {
    const ADD_BUTTON = 14 + 2;
    return DIVIDER + methodCount * LINE + ADD_BUTTON + FOOTER;
  }
  if (methodCount === 0) return 0;
  return DIVIDER + methodCount * LINE + FOOTER;
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
