"use client";

import { useState } from "react";

import { DIFF_STYLE } from "@/components/problem-card";
import type { Problem } from "@/lib/api";

interface Props {
  problem: Problem | null;
  problemError: string | null;
  notes: string;
  onNotesChange: (v: string) => void;
}

export function ProblemPanel(props: Props) {
  return (
    <aside className="flex w-[360px] shrink-0 flex-col border-l border-rule bg-paper">
      <div className="flex-1 overflow-y-auto">
        <Section title="Problem" defaultOpen>
          <ProblemSection problem={props.problem} error={props.problemError} />
        </Section>

        <Section title="Your notes" defaultOpen>
          <NotesSection notes={props.notes} onChange={props.onNotesChange} />
        </Section>
      </div>
    </aside>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Section({
  title, children, defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-rule last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-ink/5"
      >
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
          {title}
        </span>
        <Chevron open={open} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Problem section content ──────────────────────────────────────────────────
function ProblemSection({ problem, error }: { problem: Problem | null; error: string | null }) {
  if (error) {
    return <p className="text-[13px] text-red">Couldn&apos;t load problem — {error}</p>;
  }
  if (!problem) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-1/2 animate-pulse rounded bg-paper-2" />
        <div className="h-3 w-full animate-pulse rounded bg-paper-2" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-paper-2" />
      </div>
    );
  }
  const d = DIFF_STYLE[problem.difficulty];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] ${d.cls}`}>
          {d.label}
        </span>
      </div>
      <h2 className="m-0 text-[18px] font-semibold leading-tight tracking-tight text-ink">
        {problem.title}
      </h2>
      <p className="m-0 text-[13px] leading-[1.55] text-ink-soft">{problem.statement}</p>

      <NestedList title="Functional requirements" items={problem.functional_requirements} dotColor="bg-coral" />
      <NestedList title="Non-functional requirements" items={problem.non_functional_requirements} dotColor="bg-blue" />
      {Object.keys(problem.constraints).length > 0 && (
        <NestedConstraints constraints={problem.constraints} />
      )}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {problem.tags.map((t) => (
          <span key={t} className="rounded bg-paper-2 px-2 py-[3px] font-mono text-[10px] text-ink-soft">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function NestedList({ title, items, dotColor }: { title: string; items: string[]; dotColor: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">{title}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul className="mt-2 list-none space-y-1.5 p-0">
          {items.map((r, i) => (
            <li key={i} className="relative pl-4 text-[12.5px] leading-[1.5] text-ink">
              <span className={`absolute left-0 top-[8px] h-1 w-1 rounded-full ${dotColor}`} />
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NestedConstraints({ constraints }: { constraints: Record<string, unknown> }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">Constraints</span>
        <Chevron open={open} />
      </button>
      {open && (
        <dl className="mt-2 grid grid-cols-1 gap-1.5">
          {Object.entries(constraints).map(([k, v]) => (
            <div key={k} className="rounded-md border border-rule bg-white px-2.5 py-1.5">
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-muted">{k}</dt>
              <dd className="mt-0.5 text-[12.5px] font-medium text-ink">{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number") return v.toLocaleString();
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ─── Notes section ────────────────────────────────────────────────────────────
function NotesSection({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Why did you pick a cache? What's your sharding strategy? Anything you'd say out loud in the room."
        rows={5}
        className="w-full resize-y rounded-[10px] border border-rule bg-white px-3 py-2.5 text-[13px] leading-[1.5] text-ink shadow-sm outline-none placeholder:text-ink-muted/70 transition focus:border-ink focus:ring-2 focus:ring-coral/30"
      />
      <p className="mt-1.5 text-[11px] text-ink-muted">
        Saved with your design. Useful as a thinking log while you sketch.
      </p>
    </div>
  );
}
