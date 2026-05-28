"use client";

interface StatTile {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "ink" | "coral" | "acid" | "blue" | "amber";
}

const TONE_FG: Record<NonNullable<StatTile["tone"]>, string> = {
  ink:   "text-ink",
  coral: "text-coral",
  acid:  "text-[#5a7d10]",
  blue:  "text-blue",
  amber: "text-[#8a5b00]",
};

export function StatsGrid({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="relative overflow-hidden rounded-[14px] border border-rule bg-white p-4 shadow-sm"
        >
          {/* Top-right radial accent — same vibe as ProblemCard hover */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-px -top-px h-[44px] w-[44px] bg-[radial-gradient(circle_at_top_right,var(--color-coral)_0%,transparent_60%)] opacity-15"
          />
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            {t.label}
          </div>
          <div className={`mt-1.5 text-[26px] font-semibold leading-none tracking-tight ${TONE_FG[t.tone ?? "ink"]}`}>
            {t.value}
          </div>
          {t.hint && (
            <div className="mt-1 text-[11px] text-ink-soft">{t.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}
