"use client";

import { useMemo, useState } from "react";

interface Props {
  /** ISO timestamps of submission activity. */
  timestamps: string[];
  /** Optional secondary set — submissions that passed evaluation. Drawn with
   * a coral hue so the day reads as a "win" rather than just activity. */
  passedTimestamps?: string[];
  /** How many weeks back from today to render. GitHub uses 52. */
  weeks?: number;
}

type Cell = {
  date: Date;
  /** Activity count (any submission). */
  count: number;
  /** Subset of `count` that passed evaluation. */
  passed: number;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CELL = 12;       // square size
const GAP = 3;         // spacing between cells
const WEEK_STRIDE = CELL + GAP;

/** Map (date → "YYYY-MM-DD") in the user's local timezone — what matters is
 * which *calendar* day the user worked on, not UTC midnight boundaries. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tally a list of ISO timestamps into per-local-day counts. */
function tallyByDay(ts: string[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of ts) {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) continue;
    const k = dayKey(d);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export function ActivityHeatmap({
  timestamps,
  passedTimestamps = [],
  weeks = 52,
}: Props) {
  const { cells, weekCount, monthMarkers, total, passedTotal } = useMemo(() => {
    const allByDay = tallyByDay(timestamps);
    const passedByDay = tallyByDay(passedTimestamps);

    // End at the most recent Saturday so columns align like GitHub does.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay())); // forward to Saturday

    const start = new Date(end);
    start.setDate(start.getDate() - (weeks * 7 - 1));

    const list: Cell[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const k = dayKey(cursor);
      list.push({
        date: new Date(cursor),
        count: allByDay.get(k) ?? 0,
        passed: passedByDay.get(k) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Month markers — column index where the month label "first appears".
    const markers: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < list.length; i += 7) {
      const month = list[i]!.date.getMonth();
      if (month !== lastMonth) {
        markers.push({ col: i / 7, label: MONTHS[month]! });
        lastMonth = month;
      }
    }

    const totalAll = list.reduce((acc, c) => acc + c.count, 0);
    const totalPassed = list.reduce((acc, c) => acc + c.passed, 0);

    return {
      cells: list,
      weekCount: list.length / 7,
      monthMarkers: markers,
      total: totalAll,
      passedTotal: totalPassed,
    };
  }, [timestamps, passedTimestamps, weeks]);

  // Streak: count consecutive days ending today with any activity.
  const streak = useMemo(() => {
    const todayKey = dayKey(new Date());
    let i = cells.findIndex((c) => dayKey(c.date) === todayKey);
    if (i < 0) i = cells.length - 1;
    let s = 0;
    while (i >= 0 && cells[i]!.count > 0) { s++; i--; }
    return s;
  }, [cells]);

  // Layout: 7 rows × weekCount cols, plus left column for weekday labels and
  // a row at the top for month markers.
  const width = weekCount * WEEK_STRIDE - GAP;
  const height = 7 * WEEK_STRIDE - GAP;

  return (
    <div className="rounded-[14px] border border-rule bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            Activity
          </div>
          <h3 className="m-0 mt-0.5 text-[17px] font-semibold tracking-tight">
            {total === 0
              ? "No submissions yet"
              : `${total} submission${total === 1 ? "" : "s"} in the last ${weeks} weeks`}
          </h3>
          {passedTotal > 0 && (
            <p className="m-0 mt-0.5 text-[12px] text-ink-soft">
              <span className="font-medium text-[#5a7d10]">{passedTotal}</span> passed
              {streak > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-coral">{streak}-day streak</span>
                </>
              )}
            </p>
          )}
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <div className="relative inline-block">
          {/* Month markers row */}
          <div
            className="relative ml-8 mb-1.5 font-mono text-[10px] text-ink-muted"
            style={{ height: 14, width }}
          >
            {monthMarkers.map((m, i) => (
              <span
                key={i}
                className="absolute"
                style={{ left: m.col * WEEK_STRIDE }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex">
            {/* Weekday labels (only Mon/Wed/Fri shown — matches GitHub). */}
            <div
              className="mr-2 grid font-mono text-[10px] text-ink-muted"
              style={{
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                rowGap: GAP,
              }}
            >
              {["", "Mon", "", "Wed", "", "Fri", ""].map((d, i) => (
                <span key={i} className="leading-[12px]">
                  {d}
                </span>
              ))}
            </div>

            <svg
              width={width}
              height={height}
              role="img"
              aria-label="Submission activity heatmap"
            >
              {cells.map((c, i) => {
                const col = Math.floor(i / 7);
                const row = i % 7;
                const future = c.date > new Date();
                return (
                  <Cell
                    key={i}
                    x={col * WEEK_STRIDE}
                    y={row * WEEK_STRIDE}
                    count={c.count}
                    passed={c.passed}
                    date={c.date}
                    muted={future}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({
  x, y, count, passed, date, muted,
}: {
  x: number;
  y: number;
  count: number;
  passed: number;
  date: Date;
  muted: boolean;
}) {
  const [hover, setHover] = useState(false);
  const { fill, stroke } = cellColors(count, passed, muted);
  const title = formatTooltip(date, count, passed);
  return (
    <g onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <rect
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        rx={2.5}
        fill={fill}
        stroke={hover ? "var(--color-ink)" : stroke}
        strokeWidth={hover ? 1 : 0.6}
      >
        <title>{title}</title>
      </rect>
    </g>
  );
}

// Coral intensity scale for "any activity", with a brighter coral when the
// day's submissions also passed. Empty days fall back to paper-2.
function cellColors(
  count: number,
  passed: number,
  muted: boolean,
): { fill: string; stroke: string } {
  if (muted) return { fill: "transparent", stroke: "rgba(0,0,0,0.04)" };
  if (count === 0) return { fill: "#efe8d6", stroke: "rgba(0,0,0,0.04)" };
  if (passed > 0) {
    // Acid-tinted for passed days — quickly distinguishes wins.
    const t =
      passed >= 4 ? "#5a7d10" :
      passed >= 2 ? "#7fae18" :
      "#b5f23a";
    return { fill: t, stroke: "rgba(0,0,0,0.05)" };
  }
  // Activity-only days → coral intensity.
  const t =
    count >= 6 ? "rgba(255, 106, 61, 0.92)" :
    count >= 3 ? "rgba(255, 106, 61, 0.65)" :
    count >= 2 ? "rgba(255, 106, 61, 0.42)" :
                 "rgba(255, 106, 61, 0.22)";
  return { fill: t, stroke: "rgba(0,0,0,0.05)" };
}

function formatTooltip(date: Date, count: number, passed: number): string {
  const d = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (count === 0) return `${d} — no submissions`;
  const sub = `${count} submission${count === 1 ? "" : "s"}`;
  const pass = passed > 0 ? `, ${passed} passed` : "";
  return `${d} — ${sub}${pass}`;
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-muted">
      <span>Less</span>
      <span className="h-3 w-3 rounded-[2.5px] bg-paper-2" />
      <span className="h-3 w-3 rounded-[2.5px]" style={{ background: "rgba(255,106,61,0.22)" }} />
      <span className="h-3 w-3 rounded-[2.5px]" style={{ background: "rgba(255,106,61,0.65)" }} />
      <span className="h-3 w-3 rounded-[2.5px]" style={{ background: "rgba(255,106,61,0.92)" }} />
      <span className="h-3 w-3 rounded-[2.5px]" style={{ background: "#b5f23a" }} />
      <span className="h-3 w-3 rounded-[2.5px]" style={{ background: "#5a7d10" }} />
      <span>More · Passed</span>
    </div>
  );
}
