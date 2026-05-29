"use client";

import { useMemo, useState } from "react";

import { SHAPE_PER_KIND, Shape, TONE_COLORS } from "./shapes";
import {
  CATEGORY_ORDER,
  COMPONENTS,
  PATTERN_CATEGORY_ORDER,
  type ComponentCategory,
  type ComponentDef,
  type ComponentKind,
} from "./types";

interface Props {
  onAdd: (kind: ComponentKind) => void;
  /** Which discipline of components to show. Defaults to system design so
   *  the existing draw flow keeps working when no problem is loaded yet. */
  discipline?: "system" | "pattern";
}

export function Palette({ onAdd, discipline = "system" }: Props) {
  const [query, setQuery] = useState("");

  // Only show components whose discipline matches (or "both", for Custom).
  const available = useMemo(
    () =>
      COMPONENTS.filter(
        (c) => c.discipline === discipline || c.discipline === "both",
      ),
    [discipline],
  );
  const categoryOrder: ComponentCategory[] =
    discipline === "pattern" ? PATTERN_CATEGORY_ORDER : CATEGORY_ORDER;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (c: ComponentDef): boolean => {
      if (!q) return true;
      if (c.label.toLowerCase().includes(q)) return true;
      if (c.kind.includes(q)) return true;
      return (c.aliases ?? []).some((a) => a.toLowerCase().includes(q));
    };
    const out = new Map<ComponentCategory, ComponentDef[]>();
    for (const cat of categoryOrder) out.set(cat, []);
    for (const c of available) {
      if (matches(c)) out.get(c.category)?.push(c);
    }
    return out;
  }, [query, available, categoryOrder]);

  const totalMatches = [...grouped.values()].reduce((n, arr) => n + arr.length, 0);
  const totalAvailable = available.length;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-rule bg-white">
      {/* Header + search */}
      <div className="shrink-0 border-b border-rule px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            Components
          </span>
          <span className="font-mono text-[9.5px] text-ink-muted/80">
            {totalMatches}/{totalAvailable}
          </span>
        </div>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
            width="12" height="12" viewBox="0 0 14 14" fill="none"
          >
            <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-rule bg-paper py-1.5 pl-7 pr-2.5 text-[12px] text-ink outline-none placeholder:text-ink-muted/70 transition focus:border-ink focus:bg-white focus:ring-2 focus:ring-coral/30"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {totalMatches === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] text-ink-muted">
            No components match{" "}
            <span className="font-mono text-ink">&ldquo;{query}&rdquo;</span>.
          </p>
        ) : (
          categoryOrder.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <CategoryGroup
                key={cat}
                title={cat}
                items={items}
                onAdd={onAdd}
                defaultOpen
              />
            );
          })
        )}
      </div>

      {/* Hint footer */}
      <div className="shrink-0 border-t border-rule bg-paper px-3 py-2.5">
        <p className="text-[10.5px] leading-snug text-ink-muted">
          Click to drop on canvas. Drag from any side of a node to draw a
          connection.
        </p>
      </div>
    </aside>
  );
}

// ─── Category group (collapsible) ────────────────────────────────────────────
function CategoryGroup({
  title, items, onAdd, defaultOpen,
}: {
  title: string;
  items: ComponentDef[];
  onAdd: (kind: ComponentKind) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-3 last:mb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-1.5 flex w-full items-center justify-between rounded px-1 py-0.5 text-left transition hover:bg-paper-2"
      >
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
          {title}
          <span className="ml-1.5 text-ink-muted/70">· {items.length}</span>
        </span>
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="none"
          className={`text-ink-muted transition-transform ${open ? "" : "-rotate-90"}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2">
          {items.map((c) => (
            <PaletteTile key={c.kind} component={c} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single palette tile (mini shape preview + label) ────────────────────────
function PaletteTile({
  component, onAdd,
}: {
  component: ComponentDef;
  onAdd: (kind: ComponentKind) => void;
}) {
  const shape = SHAPE_PER_KIND[component.kind];
  const colors = TONE_COLORS[component.tone];
  const [w, h] = shape.size;

  return (
    <button
      type="button"
      onClick={() => onAdd(component.kind)}
      title={`Add ${component.label}`}
      className="group relative flex flex-col items-center justify-end gap-1 overflow-hidden rounded-[10px] border border-rule bg-paper px-1.5 py-2 transition hover:-translate-y-px hover:border-ink hover:bg-white hover:shadow-md"
      style={{ ["--tone" as string]: colors.stroke }}
    >
      {/* Mini shape preview — preserveAspectRatio keeps it nice in the box */}
      <div className="flex h-9 w-full items-center justify-center">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          className="transition-transform group-hover:scale-110"
        >
          <Shape
            kind={shape.shape}
            w={w}
            h={h}
            stroke={colors.stroke}
            fill={colors.fill}
            sw={3}
          />
        </svg>
      </div>
      <span className="line-clamp-1 px-0.5 text-center text-[10px] font-medium leading-tight text-ink">
        {component.label}
      </span>

      {/* Corner accent on hover (subtle) */}
      <span
        className="pointer-events-none absolute right-0 top-0 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at top right, var(--tone) 0%, transparent 70%)",
          opacity: 0,
        }}
      />
    </button>
  );
}
