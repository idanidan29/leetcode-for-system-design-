"use client";

import type { Evaluation, EvaluationCategory, EvaluationIssue } from "@/lib/api";

// Both disciplines are represented here. The panel only renders categories
// that are actually present on `evaluation.scores`, so a pattern-rubric
// response cleanly skips the system-design rows and vice versa.
const CATEGORY_ORDER: EvaluationCategory[] = [
  // system design (5 × 5 = 25 max)
  "correctness",
  "scalability",
  "reliability",
  "performance",
  "security",
  // design patterns (1 × 5 = 5 max)
  "pattern",
];

/** Aggregate percentage at or above which the problem counts as PASSED.
 *  Threshold is on a *ratio*, so it works for both the 25-max system rubric
 *  (≥20) and the 5-max pattern rubric (≥4). */
export const PASS_THRESHOLD = 0.8;

const SEVERITY_STYLE: Record<EvaluationIssue["severity"], string> = {
  low:    "bg-amber/15 text-[#8a5b00] border-amber/40",
  medium: "bg-coral/15 text-coral border-coral/40",
  high:   "bg-red/15 text-red border-red/40",
};

interface Props {
  evaluation: Evaluation;
  /** Optional callback — when present, issues with node_ids become clickable. */
  onFocusNode?: (nodeId: string) => void;
}

export function EvaluationPanel({ evaluation, onFocusNode }: Props) {
  const total = sumScores(evaluation);
  const passed = total.max > 0 && total.value / total.max >= PASS_THRESHOLD;

  return (
    <div className="space-y-5">
      {passed && <PassedStamp total={total.value} max={total.max} />}
      <Header total={total.value} max={total.max} />
      <Scores evaluation={evaluation} />
      {evaluation.strengths.length > 0 && (
        <BulletList
          title="Strengths"
          items={evaluation.strengths}
          dotColor="bg-[#5a7d10]"
        />
      )}
      {evaluation.issues.length > 0 && (
        <Issues issues={evaluation.issues} onFocusNode={onFocusNode} />
      )}
      {evaluation.suggestions.length > 0 && (
        <BulletList
          title="Suggestions"
          items={evaluation.suggestions}
          dotColor="bg-blue"
        />
      )}
    </div>
  );
}

// ─── Passed banner ───────────────────────────────────────────────────────────
function PassedStamp({ total, max }: { total: number; max: number }) {
  return (
    <div className="relative flex items-center gap-3 overflow-hidden rounded-lg border-2 border-[#5a7d10] bg-[#5a7d10]/10 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5a7d10] text-white shadow">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M4 9l3.5 3.5L14 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5a7d10]">
          Problem passed
        </div>
        <div className="text-[14px] font-semibold leading-tight text-ink">
          {total} of {max} — strong submission
        </div>
      </div>
      {/* Diagonal "PASSED" stamp watermark */}
      <span
        className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 -rotate-12 select-none font-mono text-[24px] font-bold uppercase tracking-[0.04em] text-[#5a7d10]/15"
      >
        passed
      </span>
    </div>
  );
}

// ─── Header: aggregate score ─────────────────────────────────────────────────
function Header({ total, max }: { total: number; max: number }) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  const tier = pct >= 80 ? "Strong" : pct >= 60 ? "Decent" : pct >= 40 ? "Rough" : "Weak";
  const tone =
    pct >= 80 ? "text-[#5a7d10]" :
    pct >= 60 ? "text-blue" :
    pct >= 40 ? "text-amber" :
    "text-red";

  return (
    <div className="flex items-end justify-between border-b border-rule pb-3">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          Aggregate
        </div>
        <div className={`mt-0.5 text-[28px] font-semibold leading-none tracking-tight ${tone}`}>
          {total}<span className="text-[14px] font-medium text-ink-muted">/{max}</span>
        </div>
      </div>
      <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${tone}`}>
        {tier} · {pct}%
      </span>
    </div>
  );
}

// ─── Scores: 6-row mini bars ─────────────────────────────────────────────────
function Scores({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="space-y-2.5">
      {CATEGORY_ORDER.map((c) => {
        const s = evaluation.scores[c];
        if (!s) return null;
        const pct = (s.value / s.max) * 100;
        return (
          <div key={c}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                {c}
              </span>
              <span className="font-mono text-[10.5px] font-medium text-ink">
                {s.value}/{s.max}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
              <div
                className={
                  "h-full rounded-full transition-all " +
                  (pct >= 80 ? "bg-[#5a7d10]" :
                   pct >= 60 ? "bg-blue" :
                   pct >= 40 ? "bg-amber" :
                   "bg-red")
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-[12px] leading-[1.45] text-ink-soft">{s.rationale}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Simple bullet list ──────────────────────────────────────────────────────
function BulletList({
  title, items, dotColor,
}: {
  title: string;
  items: string[];
  dotColor: string;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        {title}
      </div>
      <ul className="list-none space-y-1.5 p-0">
        {items.map((s, i) => (
          <li key={i} className="relative pl-4 text-[12.5px] leading-[1.5] text-ink">
            <span className={`absolute left-0 top-[8px] h-1 w-1 rounded-full ${dotColor}`} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Issues: chips by severity ───────────────────────────────────────────────
function Issues({
  issues, onFocusNode,
}: {
  issues: EvaluationIssue[];
  onFocusNode?: (nodeId: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        Issues
      </div>
      <ul className="list-none space-y-2 p-0">
        {issues.map((i, idx) => {
          const anchorIds = i.node_ids ?? [];
          const clickable = onFocusNode && anchorIds.length > 0;
          const onClick = clickable
            ? () => onFocusNode!(anchorIds[0]!)
            : undefined;
          return (
            <li
              key={idx}
              onClick={onClick}
              className={
                "rounded-md border border-rule bg-white p-2.5 transition " +
                (clickable
                  ? "cursor-pointer hover:border-ink hover:shadow-sm"
                  : "")
              }
              title={clickable ? "Click to highlight on canvas" : undefined}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className={
                    "rounded-full border px-1.5 py-[1px] font-mono text-[9.5px] uppercase tracking-[0.12em] " +
                    SEVERITY_STYLE[i.severity]
                  }
                >
                  {i.severity}
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-muted">
                  {i.category}
                </span>
                {anchorIds.length > 0 && (
                  <span className="ml-auto font-mono text-[9.5px] text-coral">
                    {anchorIds.length === 1 ? "↳ on canvas" : `↳ ${anchorIds.length} nodes`}
                  </span>
                )}
              </div>
              <p className="m-0 text-[12.5px] leading-[1.5] text-ink">{i.text}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sumScores(ev: Evaluation): { value: number; max: number } {
  let value = 0;
  let max = 0;
  for (const c of CATEGORY_ORDER) {
    const s = ev.scores[c];
    if (s) { value += s.value; max += s.max; }
  }
  return { value, max };
}
