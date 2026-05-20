"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DIFF_STYLE } from "@/components/problem-card";
import { problems as problemsApi, type Problem } from "@/lib/api";

// ─── Problems section (rotating carousel — fetches the live catalog) ─────────
export function ProblemsSection() {
  const [items, setItems] = useState<Problem[] | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    problemsApi
      .list({ limit: 100 })
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Split into two rows that scroll opposite directions.
  const top = items?.slice(0, Math.ceil(items.length / 2)) ?? null;
  const bottom = items?.slice(Math.ceil(items.length / 2)) ?? null;

  return (
    <section id="sk-problems" className="overflow-hidden py-[120px]">
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mb-14 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
            THE CATALOG
          </span>
          <h2 className="mx-0 my-[14px] mb-[18px] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Pick your{" "}
            <span className="font-script font-medium italic text-coral">problem</span>
          </h2>
          <p className="mx-auto max-w-[58ch] text-[18px] text-ink-soft">
            problems pulled from real loops at Google, Meta, Stripe, Uber.
            Each ships with explicit requirements.
          </p>
        </div>
      </div>

      {/* Marquee — full-bleed, faded at both edges, pauses on hover */}
      <div className="group relative space-y-3.5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        {top && bottom ? (
          <>
            <MarqueeRow items={top}    direction="left"  durationSec={48} />
            <MarqueeRow items={bottom} direction="right" durationSec={56} />
          </>
        ) : (
          <SkeletonMarquee />
        )}
      </div>

      <div className="mx-auto mt-12 max-w-[1240px] px-7 text-center">
        {errored ? (
          <p className="text-[13px] text-ink-muted">
            Couldn&apos;t load the live catalog — head to{" "}
            <Link href="/problems" className="font-medium text-coral hover:underline">
              /problems
            </Link>{" "}
            to try directly.
          </p>
        ) : (
          <Link
            href="/problems"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-muted transition hover:text-ink"
          >
            Browse all 10
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}

function MarqueeRow({
  items, direction, durationSec,
}: {
  items: Problem[];
  direction: "left" | "right";
  durationSec: number;
}) {
  // Duplicate so the translate animation can loop seamlessly at -50% / 0.
  const looped = [...items, ...items];
  // py-2 = headroom for the cards' hover -translate-y / shadow lift. overflow-x
  // alone won't do (CSS forces it to auto when overflow-y is visible).
  return (
    <div className="overflow-hidden py-2">
      <div
        className="marquee-track flex w-max gap-3.5 group-hover:[animation-play-state:paused]"
        style={{ animation: `marquee-${direction} ${durationSec}s linear infinite` }}
      >
        {looped.map((p, i) => (
          <CarouselCard key={`${p.id}-${i}`} problem={p} />
        ))}
      </div>
    </div>
  );
}

function CarouselCard({ problem }: { problem: Problem }) {
  const d = DIFF_STYLE[problem.difficulty];
  const blurb = problem.statement.split(/(?<=\.)\s+/)[0] ?? problem.statement;

  return (
    <Link
      href={`/problems/${problem.id}/draw`}
      className={
        "group/card relative flex w-[300px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-rule bg-white p-5 " +
        "transition hover:-translate-y-[3px] hover:border-ink hover:shadow-lg " +
        "after:absolute after:-top-px after:-right-px after:h-[60px] after:w-[60px] after:opacity-0 after:content-[''] " +
        "after:bg-[radial-gradient(circle_at_top_right,var(--color-coral)_0%,transparent_60%)] " +
        "after:transition-opacity hover:after:opacity-20"
      }
    >
      <span
        className={`mb-3 inline-flex w-fit rounded-full px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] ${d.cls}`}
      >
        {d.label}
      </span>
      <h3 className="mb-2 text-[16px] font-semibold leading-tight tracking-tight">
        {problem.title}
      </h3>
      <p className="mb-3 line-clamp-2 text-[12.5px] leading-[1.5] text-ink-muted">
        {blurb}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {problem.tags.slice(0, 3).map((t) => (
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

function SkeletonMarquee() {
  return (
    <>
      <div className="flex gap-3.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[176px] w-[300px] shrink-0 animate-pulse rounded-[14px] border border-rule bg-white"
          />
        ))}
      </div>
      <div className="flex gap-3.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[176px] w-[300px] shrink-0 animate-pulse rounded-[14px] border border-rule bg-white"
          />
        ))}
      </div>
    </>
  );
}
