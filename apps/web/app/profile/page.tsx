"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Nav } from "@/components/nav";
import { DIFF_STYLE } from "@/components/problem-card";
import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import { Avatar } from "@/components/profile/avatar";
import { BadgesPanel } from "@/components/profile/badges";
import { StatsGrid } from "@/components/profile/stats";
import { PASS_THRESHOLD } from "@/components/whiteboard/evaluation-panel";
import {
  ApiError,
  problems as problemsApi,
  submissions as submissionsApi,
  type Evaluation,
  type Problem,
  type Submission,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Send guests to login. We use replace so the back button doesn't bounce.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/profile");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      submissionsApi.list({ limit: 100 }),
      problemsApi.list({ limit: 100 }),
    ])
      .then(([s, p]) => {
        if (cancelled) return;
        setSubs(s.items);
        setProblems(p.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.detail : "Couldn't load profile.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const problemTitleById = useMemo(() => {
    const m = new Map<string, Problem>();
    for (const p of problems ?? []) m.set(p.id, p);
    return m;
  }, [problems]);

  const stats = useMemo(() => computeStats(subs ?? [], problemTitleById), [subs, problemTitleById]);

  const heatmap = useMemo(() => {
    const all: string[] = [];
    const passed: string[] = [];
    for (const s of subs ?? []) {
      all.push(s.created_at);
      const ev = s.evaluation as Evaluation | null;
      if (ev && evalPassed(ev)) passed.push(s.created_at);
    }
    return { all, passed };
  }, [subs]);

  const recent = useMemo(() => (subs ?? []).slice(0, 8), [subs]);

  if (authLoading || (!user && !error)) {
    return (
      <>
        <Nav />
        <main className="bg-paper min-h-[60vh]" />
      </>
    );
  }
  if (!user) return null;

  return (
    <>
      <Nav />
      <main className="bg-paper bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.18)_1px,transparent_0)] bg-[length:22px_22px]">
        <div className="mx-auto max-w-[1100px] px-7 pt-12 pb-24">
          {/* ─── Header card ─────────────────────────────────────────────── */}
          <header className="relative overflow-hidden rounded-[18px] border border-rule bg-white p-7 shadow-sm">
            {/* Decorative grid + corner accent */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.06)_1px,transparent_0)] bg-[length:18px_18px]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-coral/15 blur-2xl"
            />
            <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Avatar user={user} size={104} editable />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                  Profile
                </div>
                <h1 className="m-0 mt-1 truncate text-[clamp(26px,3.5vw,36px)] font-semibold leading-tight tracking-tight">
                  {user.display_name}
                </h1>
                <p className="m-0 mt-1 text-[13px] text-ink-soft">
                  {user.email} · Joined {formatJoined(user.created_at)}
                </p>
                <StatusBadges stats={stats} />
              </div>
              <Link
                href="/problems"
                className={
                  "group inline-flex items-center justify-center gap-1.5 self-stretch " +
                  "rounded-[10px] bg-coral px-4 py-2.5 text-center text-[13.5px] font-medium " +
                  "text-white shadow-md transition hover:-translate-y-px hover:bg-coral/90 sm:self-auto"
                }
              >
                Solve a problem
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  className="transition group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </header>

          {error ? (
            <div className="mt-6 rounded-[14px] border border-red/40 bg-red/10 p-6 text-center text-[14px] text-red">
              Couldn&apos;t load profile data — {error}
            </div>
          ) : (
            <>
              {/* ─── Stats grid ────────────────────────────────────────── */}
              <section className="mt-6">
                <StatsGrid tiles={statTiles(stats)} />
              </section>

              {/* ─── Activity heatmap ─────────────────────────────────── */}
              <section className="mt-6">
                {subs === null ? (
                  <HeatmapSkeleton />
                ) : (
                  <ActivityHeatmap
                    timestamps={heatmap.all}
                    passedTimestamps={heatmap.passed}
                  />
                )}
              </section>

              {/* ─── Badges ───────────────────────────────────────────── */}
              <section className="mt-6">
                <BadgesPanel />
              </section>

              {/* ─── Recent activity ──────────────────────────────────── */}
              <section className="mt-6">
                <RecentActivity
                  loading={subs === null}
                  submissions={recent}
                  problemById={problemTitleById}
                />
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

// ─── Status badges row ────────────────────────────────────────────────────────
function StatusBadges({ stats }: { stats: Stats }) {
  const tier =
    stats.passed >= 10 ? { label: "Architect", cls: "bg-coral/15 text-coral border-coral/40" } :
    stats.passed >= 5  ? { label: "Designer",  cls: "bg-amber/20 text-[#8a5b00] border-amber/40" } :
    stats.passed >= 1  ? { label: "Sketcher",  cls: "bg-acid/20 text-[#5a7d10] border-acid/60" } :
                         { label: "New here",  cls: "bg-paper-2 text-ink-soft border-rule" };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${tier.cls}`}>
        {tier.label}
      </span>
      <span className="rounded-full border border-rule bg-paper-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {stats.attempted} attempted
      </span>
      <span className="rounded-full border border-rule bg-paper-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
        {stats.passed} passed
      </span>
      {stats.bestScore !== null && (
        <span className="rounded-full border border-rule bg-paper-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          Best {stats.bestScore}/25
        </span>
      )}
    </div>
  );
}

// ─── Recent submissions list ──────────────────────────────────────────────────
function RecentActivity({
  loading, submissions, problemById,
}: {
  loading: boolean;
  submissions: Submission[];
  problemById: Map<string, Problem>;
}) {
  return (
    <div className="rounded-[14px] border border-rule bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
          Recent activity
        </div>
        {!loading && submissions.length > 0 && (
          <span className="font-mono text-[10px] text-ink-muted">
            {submissions.length} shown
          </span>
        )}
      </div>
      {loading ? (
        <RecentSkeleton />
      ) : submissions.length === 0 ? (
        <div className="px-6 py-10 text-center text-[13.5px] text-ink-soft">
          No submissions yet —{" "}
          <Link href="/problems" className="text-coral hover:underline">
            pick a problem
          </Link>{" "}
          and sketch your first design.
        </div>
      ) : (
        <ul className="m-0 list-none p-0">
          {submissions.map((s) => {
            const p = problemById.get(s.problem_id) ?? null;
            const ev = s.evaluation as Evaluation | null;
            const score = ev ? scoreOf(ev) : null;
            const passed = ev ? evalPassed(ev) : false;
            const d = p ? DIFF_STYLE[p.difficulty] : null;
            return (
              <li key={s.id}>
                <Link
                  href={`/problems/${s.problem_id}/draw`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-rule px-5 py-3 transition last:border-b-0 hover:bg-coral/[0.05]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-ink">
                      {p?.title ?? s.problem_id}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
                      {relativeTime(s.updated_at)}
                    </div>
                  </div>
                  {d && (
                    <span className={`hidden rounded-full px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] sm:inline-flex ${d.cls}`}>
                      {d.label}
                    </span>
                  )}
                  <ScoreChip score={score} max={25} passed={passed} status={s.evaluation_status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScoreChip({
  score, max, passed, status,
}: {
  score: number | null;
  max: number;
  passed: boolean;
  status: Submission["evaluation_status"];
}) {
  if (score === null) {
    if (status === "running") {
      return (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-coral">
          scoring…
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-red">
          eval failed
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">
        unscored
      </span>
    );
  }
  const cls = passed
    ? "border-[#5a7d10]/40 bg-[#5a7d10]/10 text-[#5a7d10]"
    : score / max >= 0.6
      ? "border-blue/30 bg-blue/10 text-blue"
      : "border-amber/40 bg-amber/15 text-[#8a5b00]";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] ${cls}`}>
      {score}/{max}
      {passed && (
        <svg width="11" height="11" viewBox="0 0 12 12" className="ml-1" fill="none">
          <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function HeatmapSkeleton() {
  return (
    <div className="rounded-[14px] border border-rule bg-white p-5 shadow-sm">
      <div className="mb-4 h-4 w-1/3 animate-pulse rounded bg-paper-2" />
      <div className="grid grid-cols-[repeat(52,12px)] gap-[3px]">
        {Array.from({ length: 52 * 7 }).map((_, i) => (
          <div key={i} className="h-3 w-3 animate-pulse rounded-[2.5px] bg-paper-2" />
        ))}
      </div>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <ul className="m-0 list-none p-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-rule px-5 py-3.5 last:border-b-0"
        >
          <div>
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-paper-2" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-paper-2" />
          </div>
          <div className="h-4 w-12 animate-pulse rounded-full bg-paper-2" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-paper-2" />
        </li>
      ))}
    </ul>
  );
}

// ─── Stat math ────────────────────────────────────────────────────────────────
interface Stats {
  attempted: number;
  passed: number;
  inProgress: number;
  bestScore: number | null;
  byDifficulty: { easy: number; medium: number; hard: number };
}

function computeStats(subs: Submission[], problemById: Map<string, Problem>): Stats {
  // Unique problems attempted (one row per latest submission per problem in
  // our schema, but be defensive).
  const attemptedSet = new Set<string>();
  const passedSet = new Set<string>();
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  let best: number | null = null;
  let inProgress = 0;

  for (const s of subs) {
    attemptedSet.add(s.problem_id);
    if (s.evaluation_status === "running") inProgress++;
    const ev = s.evaluation as Evaluation | null;
    if (!ev) continue;
    const score = scoreOf(ev);
    if (best === null || score > best) best = score;
    if (evalPassed(ev) && !passedSet.has(s.problem_id)) {
      passedSet.add(s.problem_id);
      const p = problemById.get(s.problem_id);
      if (p) byDiff[p.difficulty]++;
    }
  }

  return {
    attempted: attemptedSet.size,
    passed: passedSet.size,
    inProgress,
    bestScore: best,
    byDifficulty: byDiff,
  };
}

function statTiles(s: Stats) {
  return [
    { label: "Passed",      value: s.passed,                                tone: "acid" as const,  hint: `${s.byDifficulty.easy}·${s.byDifficulty.medium}·${s.byDifficulty.hard}  E·M·H` },
    { label: "Attempted",   value: s.attempted,                             tone: "ink" as const },
    { label: "Best score",  value: s.bestScore === null ? "—" : `${s.bestScore}/25`, tone: "coral" as const },
    { label: "In progress", value: s.inProgress,                            tone: "amber" as const,  hint: s.inProgress > 0 ? "Eval running" : "All settled" },
  ];
}

// ─── Eval helpers ─────────────────────────────────────────────────────────────
function scoreOf(ev: Evaluation): number {
  let v = 0;
  for (const c of Object.values(ev.scores)) if (c) v += c.value;
  return v;
}
function maxOf(ev: Evaluation): number {
  let m = 0;
  for (const c of Object.values(ev.scores)) if (c) m += c.max;
  return m;
}
function evalPassed(ev: Evaluation): boolean {
  const m = maxOf(ev);
  return m > 0 && scoreOf(ev) / m >= PASS_THRESHOLD;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
