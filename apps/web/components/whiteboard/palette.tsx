"use client";

import { COMPONENTS, TONE_CLASSES, type ComponentKind } from "./types";

interface Props {
  onAdd: (kind: ComponentKind) => void;
}

export function Palette({ onAdd }: Props) {
  return (
    <aside className="flex w-[200px] shrink-0 flex-col gap-2 border-r border-rule bg-white p-3">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
        Components
      </div>
      <div className="grid grid-cols-2 gap-2">
        {COMPONENTS.map((c) => {
          const tone = TONE_CLASSES[c.tone];
          return (
            <button
              key={c.kind}
              type="button"
              onClick={() => onAdd(c.kind)}
              title={`Add ${c.label}`}
              className={
                `group flex aspect-square flex-col items-center justify-center rounded-lg border ${tone.border} ${tone.bg} ` +
                `transition hover:-translate-y-px hover:shadow-md`
              }
            >
              <span className={`font-mono text-[15px] font-semibold ${tone.text}`}>
                {c.short}
              </span>
              <span className="mt-1 px-1 text-center text-[10px] leading-tight text-ink-soft">
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-muted">
        Click a tile to add it to the canvas. Drag from a node&apos;s edge to
        connect.
      </p>
    </aside>
  );
}
