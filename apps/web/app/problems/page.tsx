"use client";

import { useEffect, useMemo, useState } from "react";

import { Nav } from "@/components/nav";
import { ProblemCard } from "@/components/problem-card";
import { ApiError, problems as problemsApi, type Difficulty, type Problem } from "@/lib/api";

type Filter = "all" | Difficulty;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all",    label: "All" },
  { value: "easy",   label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard",   label: "Hard" },
];

export default function ProblemsPage() {
  const [items, setItems] = useState<Problem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    problemsApi
      .list({ limit: 100 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.detail : "Couldn’t load problems.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === "all") return items;
    return items.filter((p) => p.difficulty === filter);
  }, [items, filter]);

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
              Each prompt ships with explicit functional &amp; non-functional
              requirements and real-world constraints. No vague &ldquo;design
              Twitter&rdquo; energy.
            </p>
          </header>

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
            {filtered && (
              <span className="ml-auto self-center font-mono text-[11px] text-ink-muted">
                {filtered.length} problem{filtered.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Content */}
          {error ? (
            <ErrorState message={error} />
          ) : !filtered ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
              {filtered.map((p, i) => (
                <ProblemCard key={p.id} problem={p} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
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
