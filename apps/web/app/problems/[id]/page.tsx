"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Nav } from "@/components/nav";
import { ApiError, problems as problemsApi, type Difficulty, type Problem } from "@/lib/api";

const DIFF_STYLE: Record<Difficulty, { label: string; cls: string }> = {
  easy:   { label: "EASY",   cls: "bg-acid/20 text-[#5a7d10]" },
  medium: { label: "MEDIUM", cls: "bg-amber/20 text-[#8a5b00]" },
  hard:   { label: "HARD",   cls: "bg-red/15 text-[#a82c20]" },
};

export default function ProblemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus("loading");
    problemsApi
      .get(id)
      .then((p) => {
        if (cancelled) return;
        setProblem(p);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setStatus("notfound");
          return;
        }
        setErrorMsg(err instanceof ApiError ? err.detail : "Something went wrong.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Nav />
      <main className="bg-paper bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.18)_1px,transparent_0)] bg-[length:22px_22px]">
        <div className="mx-auto max-w-[860px] px-7 pt-10 pb-24">
          <Link
            href="/problems"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M13 7H1m0 0l5 5M1 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All problems
          </Link>

          {status === "loading" && <DetailSkeleton />}
          {status === "notfound" && <NotFound id={id ?? ""} />}
          {status === "error" && <ErrorState message={errorMsg} />}
          {status === "ready" && problem && <Detail problem={problem} />}
        </div>
      </main>
    </>
  );
}

// ─── Detail body ──────────────────────────────────────────────────────────────
function Detail({ problem }: { problem: Problem }) {
  const d = DIFF_STYLE[problem.difficulty];
  return (
    <article>
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] ${d.cls}`}>
            {d.label}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">{problem.id}</span>
        </div>
        <h1 className="m-0 text-[clamp(28px,4vw,44px)] font-semibold leading-[1.1] tracking-[-0.025em]">
          {problem.title}
        </h1>
        <p className="m-0 mt-4 text-[15px] leading-[1.6] text-ink-soft">
          {problem.statement}
        </p>
      </header>

      <Section title="Functional requirements">
        <ul className="m-0 list-none space-y-2 p-0">
          {problem.functional_requirements.map((r, i) => (
            <li key={i} className="relative pl-5 text-[14px] leading-[1.55] text-ink before:absolute before:left-0 before:top-[10px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-coral before:content-['']">
              {r}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Non-functional requirements">
        <ul className="m-0 list-none space-y-2 p-0">
          {problem.non_functional_requirements.map((r, i) => (
            <li key={i} className="relative pl-5 text-[14px] leading-[1.55] text-ink before:absolute before:left-0 before:top-[10px] before:h-1.5 before:w-1.5 before:rounded-full before:bg-blue before:content-['']">
              {r}
            </li>
          ))}
        </ul>
      </Section>

      {Object.keys(problem.constraints).length > 0 && (
        <Section title="Constraints">
          <dl className="m-0 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(problem.constraints).map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-rule bg-white p-3"
              >
                <dt className="m-0 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                  {k}
                </dt>
                <dd className="m-0 mt-1 text-[14px] font-medium text-ink">
                  {formatValue(v)}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      <Section title="Tags">
        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-paper-2 px-2.5 py-1 font-mono text-[11px] text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>
      </Section>

      {/* Start drawing CTA — the whiteboard route doesn't exist yet, see "Later" todos. */}
      <div className="mt-10 flex flex-col items-center gap-3 rounded-[14px] border border-ink bg-ink px-7 py-7 text-center text-paper">
        <h2 className="m-0 text-[22px] font-semibold tracking-tight">
          Ready to design it?
        </h2>
        <p className="m-0 max-w-[40ch] text-[14px] text-paper/80">
          Sketch your architecture on the whiteboard and ship it for AI review.
        </p>
        <Link
          href={`/problems/${problem.id}/draw`}
          className="mt-2 inline-flex items-center gap-2 rounded-[10px] bg-coral px-5 py-3 text-[14px] font-medium text-white shadow-md transition hover:-translate-y-px hover:bg-[#ff5a25]"
        >
          Start drawing
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="m-0 mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number") return v.toLocaleString();
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ─── States ───────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 flex gap-3">
        <div className="h-5 w-14 rounded-full bg-paper-2" />
        <div className="h-5 w-24 rounded bg-paper-2" />
      </div>
      <div className="mb-3 h-10 w-3/4 rounded bg-paper-2" />
      <div className="mb-1 h-4 w-full rounded bg-paper-2" />
      <div className="mb-1 h-4 w-full rounded bg-paper-2" />
      <div className="mb-8 h-4 w-2/3 rounded bg-paper-2" />
      <div className="mb-2 h-3 w-32 rounded bg-paper-2" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-paper-2" />
        <div className="h-4 w-4/5 rounded bg-paper-2" />
        <div className="h-4 w-3/4 rounded bg-paper-2" />
      </div>
    </div>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-rule bg-white/60 p-10 text-center">
      <h1 className="m-0 mb-2 text-[24px] font-semibold tracking-tight">Problem not found</h1>
      <p className="m-0 mb-5 text-[14px] text-ink-soft">
        No problem with id <code className="font-mono">{id}</code>.
      </p>
      <Link
        href="/problems"
        className="inline-flex rounded-[10px] bg-ink px-4 py-2.5 text-[14px] font-medium text-paper shadow-md transition hover:-translate-y-px"
      >
        Back to catalog
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[14px] border border-red/40 bg-red/10 p-10 text-center">
      <p className="m-0 text-[15px] text-red">Couldn&apos;t load problem — {message}</p>
    </div>
  );
}
