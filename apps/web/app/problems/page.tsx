"use client";

import { useEffect, useMemo, useState } from "react";

import { Nav } from "@/components/nav";
import { ProblemCard, ProblemRow } from "@/components/problem-card";
import {
  ApiError,
  problems as problemsApi,
  type Difficulty,
  type Problem,
  type ProblemKind,
} from "@/lib/api";

type Filter = "all" | Difficulty;
type View = "grid" | "list";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",    label: "All" },
  { value: "easy",   label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard",   label: "Hard" },
];

interface KindOption {
  value: ProblemKind;
  label: string;
  blurb: string;
}
const KINDS: KindOption[] = [
  {
    value: "system_design",
    label: "System Design",
    blurb: "Architect services, caches, and queues against real-world scale.",
  },
  {
    value: "design_pattern",
    label: "Design Patterns",
    blurb: "Implement classic OOP patterns: Singleton, Observer, Strategy…",
  },
];

const VIEW_STORAGE_KEY = "sk.problems.view";
const KIND_STORAGE_KEY = "sk.problems.kind";

export default function ProblemsPage() {
  const [items, setItems] = useState<Problem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("grid");
  const [kind, setKind] = useState<ProblemKind>("system_design");

  // Restore the user's last view + track choice.
  useEffect(() => {
    const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (savedView === "grid" || savedView === "list") setView(savedView);
    const savedKind = window.localStorage.getItem(KIND_STORAGE_KEY);
    if (savedKind === "system_design" || savedKind === "design_pattern") setKind(savedKind);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  useEffect(() => {
    window.localStorage.setItem(KIND_STORAGE_KEY, kind);
  }, [kind]);

  // Reset the difficulty filter when switching tracks so a previously-selected
  // pill doesn't silently wipe the new catalog if that pill has no matches.
  useEffect(() => {
    setFilter("all");
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    problemsApi
      .list({ kind, limit: 100 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Distinguish "backend returned an error" (ApiError, has a useful
        // detail) from "request never reached the backend" (TypeError —
        // typically "Failed to fetch"). The latter usually means the API
        // process is down or an unapplied migration is crashing it.
        const message = err instanceof ApiError
          ? err.detail
          : err instanceof TypeError
            ? "Couldn’t reach the API — is the backend running and migrated?"
            : "Couldn’t load problems.";
        setError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === "all") return items;
    return items.filter((p) => p.difficulty === filter);
  }, [items, filter]);

  const activeKind = KINDS.find((k) => k.value === kind) ?? KINDS[0]!;

  return (
    <>
      <Nav />
      <main className="bg-paper bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.18)_1px,transparent_0)] bg-[length:22px_22px]">
        <div className="mx-auto max-w-[1240px] px-7 pt-14 pb-24">
          <header className="mb-10">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
              PROBLEM CATALOG
            </span>
            <h1 className="m-0 mt-3 text-[clamp(36px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.025em]">
              Pick a problem and start sketching.
            </h1>
            <p className="m-0 mt-3 max-w-[60ch] text-[16px] text-ink-soft">
              {activeKind.blurb}
            </p>
          </header>

          {/* Track toggle (system design / design patterns) */}
          <KindToggle value={kind} onChange={setKind} />

          {/* Difficulty filter */}
          <div className="mb-7 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={
                    "rounded-full px-4 py-1.5 text-[13px] font-medium transition " +
                    (active
                      ? "bg-ink text-paper shadow-md"
                      : "border border-rule bg-white text-ink-soft hover:border-ink hover:text-ink")
                  }
                >
                  {f.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-3">
              {filtered && (
                <span className="self-center font-mono text-[11px] text-ink-muted">
                  {filtered.length} problem{filtered.length === 1 ? "" : "s"}
                </span>
              )}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {/* Content */}
          {error ? (
            <ErrorState message={error} />
          ) : !filtered ? (
            view === "grid" ? <SkeletonGrid /> : <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : view === "grid" ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
              {filtered.map((p, i) => (
                <ProblemCard key={p.id} problem={p} index={i} />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[14px] border border-rule bg-white shadow-sm">
              <div className="grid grid-cols-[48px_1fr_auto_96px_28px] items-center gap-4 border-b border-rule bg-paper-2/60 px-4 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">#</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Title</span>
                <span className="hidden text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted md:block">Tags</span>
                <span className="text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Difficulty</span>
                <span />
              </div>
              {filtered.map((p, i) => (
                <ProblemRow key={p.id} problem={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Track toggle (System Design / Design Patterns) ──────────────────────────
// A larger segmented pill than the difficulty chips below it. Visually heavier
// so the user reads it as "switch the whole catalog" rather than "narrow the
// current one". Each option shows a small icon hinting at its discipline.
// Segmented toggle with a sliding ink pill underneath the active label. The
// pill translates between the two equal-width slots instead of one being
// painted in and the other out — feels like a single physical control.
function KindToggle({
  value, onChange,
}: {
  value: ProblemKind;
  onChange: (v: ProblemKind) => void;
}) {
  const activeIndex = KINDS.findIndex((k) => k.value === value);

  return (
    <div className="mb-7 relative inline-grid grid-cols-2 gap-0 rounded-full border border-rule bg-white p-1 shadow-sm">
      {/* Sliding active pill — width is 50% of the inner area, translates by
          100% of its own width to swap between slots. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ink shadow-sm"
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 280ms cubic-bezier(0.4, 0.0, 0.2, 1)",
        }}
      />
      {KINDS.map((k) => {
        const active = k.value === value;
        return (
          <button
            key={k.value}
            type="button"
            onClick={() => onChange(k.value)}
            aria-pressed={active}
            className={
              "relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium " +
              "transition-colors duration-200 " +
              (active ? "text-paper" : "text-ink-soft hover:text-ink")
            }
          >
            {k.value === "system_design" ? <SystemIcon /> : <PatternIcon />}
            {k.label}
          </button>
        );
      })}
    </div>
  );
}

function SystemIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <rect x="5" y="9" width="4" height="4" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 5v2M11 5v2M7 7v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PatternIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="5" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="8" width="5" height="5" rx="0.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 6v2M3.5 8h5M8.5 8V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="flex items-center rounded-full border border-rule bg-white p-0.5 shadow-sm">
      <ToggleButton active={view === "grid"} onClick={() => onChange("grid")} label="Grid view">
        <GridIcon />
      </ToggleButton>
      <ToggleButton active={view === "list"} onClick={() => onChange("list")} label="List view">
        <ListIcon />
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active, onClick, label, children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={
        "flex h-7 w-8 items-center justify-center rounded-full transition " +
        (active
          ? "bg-ink text-paper shadow-sm"
          : "text-ink-muted hover:text-ink")
      }
    >
      {children}
    </button>
  );
}

function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <line x1="1" y1="2.5" x2="12" y2="2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1" y1="10.5" x2="12" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SkeletonList() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-rule bg-white shadow-sm">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[48px_1fr_auto_96px_28px] items-center gap-4 border-b border-rule px-4 py-3 last:border-b-0"
        >
          <div className="h-3 w-6 animate-pulse rounded bg-paper-2" />
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-paper-2" />
          <div className="hidden gap-1 md:flex">
            <div className="h-3 w-10 animate-pulse rounded bg-paper-2" />
            <div className="h-3 w-14 animate-pulse rounded bg-paper-2" />
          </div>
          <div className="ml-auto h-4 w-14 animate-pulse rounded-full bg-paper-2" />
          <div />
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[170px] animate-pulse rounded-[14px] border border-rule bg-white p-5"
        >
          <div className="mb-3 flex justify-between">
            <div className="h-3 w-8 rounded bg-paper-2" />
            <div className="h-4 w-12 rounded-full bg-paper-2" />
          </div>
          <div className="mb-3 h-5 w-3/4 rounded bg-paper-2" />
          <div className="mb-2 h-3 w-full rounded bg-paper-2" />
          <div className="mb-4 h-3 w-2/3 rounded bg-paper-2" />
          <div className="flex gap-1.5">
            <div className="h-4 w-12 rounded bg-paper-2" />
            <div className="h-4 w-16 rounded bg-paper-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="rounded-[14px] border border-dashed border-rule bg-white/60 p-10 text-center">
      <p className="m-0 text-[15px] text-ink-soft">
        No <span className="font-medium text-ink">{filter}</span> problems yet.
        Try a different filter.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[14px] border border-red/40 bg-red/10 p-10 text-center">
      <p className="m-0 text-[15px] text-red">
        Couldn&apos;t load problems — {message}
      </p>
    </div>
  );
}
