import Link from "next/link";

import type { Difficulty, Problem } from "@/lib/api";

interface Props {
  problem: Problem;
  index: number;
}

export const DIFF_STYLE: Record<Difficulty, { label: string; cls: string }> = {
  easy:   { label: "EASY",   cls: "bg-acid/20 text-[#5a7d10]" },
  medium: { label: "MEDIUM", cls: "bg-amber/20 text-[#8a5b00]" },
  hard:   { label: "HARD",   cls: "bg-red/15 text-[#a82c20]" },
};

export function ProblemCard({ problem, index }: Props) {
  const d = DIFF_STYLE[problem.difficulty];
  // First sentence of the statement makes a tighter card preview than the full
  // multi-sentence paragraph.
  const blurb =
    problem.statement.split(/(?<=\.)\s+/)[0] ?? problem.statement;

  return (
    <Link
      href={`/problems/${problem.id}/draw`}
      className={
        "group relative block overflow-hidden rounded-[14px] border border-rule bg-white p-5 " +
        "transition hover:-translate-y-[3px] hover:border-ink hover:shadow-lg " +
        "after:absolute after:-top-px after:-right-px after:h-[60px] after:w-[60px] after:opacity-0 after:content-[''] " +
        "after:bg-[radial-gradient(circle_at_top_right,var(--color-coral)_0%,transparent_60%)] " +
        "after:transition-opacity hover:after:opacity-20"
      }
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="font-mono text-[11px] text-ink-muted">
          #{String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`rounded-full px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] ${d.cls}`}
        >
          {d.label}
        </span>
      </div>
      <h3 className="mb-2.5 text-[18px] font-semibold tracking-tight">
        {problem.title}
      </h3>
      <p className="mb-3.5 text-[13px] leading-[1.5] text-ink-muted">{blurb}</p>
      <div className="flex flex-wrap gap-1.5">
        {problem.tags.map((t) => (
          <span
            key={t}
            className="rounded bg-paper-2 px-2 py-[3px] font-mono text-[10px] text-ink-soft"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}

// ─── Row variant ─────────────────────────────────────────────────────────────
// Compact LeetCode-style row. Tight vertical rhythm, alternating row tint so
// long lists stay scannable; hover lifts the row and reveals an "open" cue.
export function ProblemRow({ problem, index }: Props) {
  const d = DIFF_STYLE[problem.difficulty];
  return (
    <Link
      href={`/problems/${problem.id}/draw`}
      className={
        "group grid grid-cols-[48px_1fr_auto_96px_28px] items-center gap-4 " +
        "border-b border-rule px-4 py-3 transition " +
        "odd:bg-white even:bg-paper-2/40 " +
        "hover:bg-coral/[0.06] hover:shadow-[inset_3px_0_0_0_var(--color-coral)]"
      }
    >
      <span className="font-mono text-[11px] text-ink-muted">
        #{String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium text-ink group-hover:text-coral">
          {problem.title}
        </div>
      </div>
      <div className="hidden max-w-[280px] flex-wrap justify-end gap-1 md:flex">
        {problem.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="rounded bg-paper-2 px-1.5 py-[2px] font-mono text-[9.5px] text-ink-soft"
          >
            {t}
          </span>
        ))}
        {problem.tags.length > 3 && (
          <span className="font-mono text-[9.5px] text-ink-muted">
            +{problem.tags.length - 3}
          </span>
        )}
      </div>
      <div className="flex justify-end">
        <span
          className={`rounded-full px-2 py-[3px] text-center font-mono text-[10px] tracking-[0.1em] ${d.cls}`}
        >
          {d.label}
        </span>
      </div>
      <svg
        width="14" height="14" viewBox="0 0 14 14" fill="none"
        className="text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-coral"
      >
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
