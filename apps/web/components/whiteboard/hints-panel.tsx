"use client";

import { useState } from "react";

import type { Hint } from "@/lib/api";

const LEVEL_LABEL: Record<number, string> = {
  1: "Nudge",
  2: "Question",
  3: "Structure",
};

const LEVEL_STYLE: Record<number, string> = {
  1: "border-amber/40 bg-amber/10 text-[#8a5b00]",
  2: "border-coral/40 bg-coral/10 text-coral",
  3: "border-blue/40 bg-blue/10 text-blue",
};

interface Props {
  hints: Hint[];
  /** Optional reset (e.g. when the diagram changes and we re-request). */
  onReset?: () => void;
}

/** Progressive disclosure: hints reveal one at a time. Each card is a
 * collapsible — clicking the header toggles its body so users can re-read
 * an earlier hint without losing their place. */
export function HintsPanel({ hints, onReset }: Props) {
  const [revealed, setRevealed] = useState(1);

  const visible = hints.slice(0, revealed);
  const remaining = hints.length - revealed;

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-[1.5] text-ink-muted">
        Hints tailored to what you&apos;ve drawn so far. They get more specific
        as you reveal them.
      </p>

      <ul className="list-none space-y-2 p-0">
        {visible.map((h, i) => (
          <HintCard key={h.level} hint={h} index={i + 1} />
        ))}
      </ul>

      <div className="flex items-center justify-between">
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setRevealed((r) => Math.min(r + 1, hints.length))}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-ink bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-paper-2"
          >
            Show next hint
            <span className="font-mono text-[10px] text-ink-muted">
              {remaining} left
            </span>
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
            all hints revealed
          </span>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted transition hover:text-ink"
          >
            re-request
          </button>
        )}
      </div>
    </div>
  );
}

function HintCard({ hint, index }: { hint: Hint; index: number }) {
  const [open, setOpen] = useState(true);
  const label = LEVEL_LABEL[hint.level] ?? `Hint ${hint.level}`;
  const style = LEVEL_STYLE[hint.level] ?? "border-rule bg-white text-ink";

  return (
    <li className={`overflow-hidden rounded-md border ${style}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-left transition hover:bg-black/[0.03]"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            #{index} · {label}
          </span>
        </span>
        <svg
          width="10" height="10" viewBox="0 0 12 12" fill="none"
          className={`transition-transform ${open ? "" : "-rotate-90"}`}
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <p className="border-t border-current/20 bg-white px-2.5 py-2 text-[12.5px] leading-[1.5] text-ink">
          {hint.text}
        </p>
      )}
    </li>
  );
}
