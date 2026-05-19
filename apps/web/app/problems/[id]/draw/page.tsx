"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Nav } from "@/components/nav";
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas";
import { Palette } from "@/components/whiteboard/palette";
import type { ComponentKind } from "@/components/whiteboard/types";
import {
  ApiError,
  problems as problemsApi,
  submissions as submissionsApi,
  type Diagram,
  type Problem,
  type Submission,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export default function DrawPage() {
  const params = useParams<{ id: string }>();
  const problemId = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const canvasRef = useRef<CanvasHandle | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [initialDiagram, setInitialDiagram] = useState<Diagram | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });

  // Fetch the problem (public).
  useEffect(() => {
    if (!problemId) return;
    let cancelled = false;
    problemsApi
      .get(problemId)
      .then((p) => {
        if (!cancelled) setProblem(p);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProblemError(
            err instanceof ApiError ? err.detail : "Couldn’t load problem.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [problemId]);

  // Once auth is resolved, load the user's most recent submission for this problem.
  useEffect(() => {
    if (authLoading || !problemId) return;
    let cancelled = false;
    if (!user) {
      // Guest: nothing to load, start fresh.
      setBootstrapped(true);
      return;
    }
    submissionsApi
      .list({ problem_id: problemId, limit: 1 })
      .then((res) => {
        if (cancelled) return;
        const latest = res.items[0];
        if (latest) {
          setSubmission(latest);
          setInitialDiagram(latest.diagram as Diagram);
        }
        setBootstrapped(true);
      })
      .catch(() => {
        if (!cancelled) setBootstrapped(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, problemId]);

  const addNode = useCallback((kind: ComponentKind) => {
    canvasRef.current?.addNode(kind);
  }, []);

  const handleSave = useCallback(async () => {
    if (!problemId) return;
    if (!user) {
      // Guest hits Save → push them to signup.
      router.push("/signup");
      return;
    }
    const diagram = canvasRef.current?.toDiagram();
    if (!diagram) return;
    setSave({ kind: "saving" });
    try {
      const saved = submission
        ? await submissionsApi.update(submission.id, { diagram })
        : await submissionsApi.create({ problem_id: problemId, diagram });
      setSubmission(saved);
      setSave({ kind: "saved", at: Date.now() });
    } catch (err) {
      setSave({
        kind: "error",
        message: err instanceof ApiError ? err.detail : "Couldn’t save.",
      });
    }
  }, [problemId, user, submission, router]);

  // Auto-flip "saved" back to "idle" after 2.5s so it doesn't stick forever.
  useEffect(() => {
    if (save.kind !== "saved") return;
    const t = setTimeout(() => setSave({ kind: "idle" }), 2500);
    return () => clearTimeout(t);
  }, [save]);

  return (
    <div className="flex h-screen flex-col">
      <Nav />

      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-rule bg-white px-5 py-2.5">
        <Link
          href={problemId ? `/problems/${problemId}` : "/problems"}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M13 7H1m0 0l5 5M1 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </Link>
        <div className="flex-1 truncate">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            Drawing —
          </span>{" "}
          <span className="text-[13px] font-medium text-ink">
            {problem?.title ?? (problemError ? "Problem not found" : "loading…")}
          </span>
        </div>
        <SaveStatus state={save} loggedIn={!!user} />
        <button
          onClick={() => void handleSave()}
          disabled={save.kind === "saving" || !bootstrapped}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-ink px-4 py-2 text-[13px] font-medium text-paper shadow-md transition hover:-translate-y-px disabled:cursor-progress disabled:opacity-70"
        >
          {!user ? "Sign in to save" : submission ? "Save changes" : "Save design"}
        </button>
      </div>

      {/* Body: palette + canvas */}
      <div className="flex min-h-0 flex-1">
        <Palette onAdd={addNode} />
        <div className="relative flex-1 bg-paper">
          {!bootstrapped ? (
            <div className="absolute inset-0 grid place-items-center text-[13px] text-ink-muted">
              Loading…
            </div>
          ) : (
            <Canvas ref={canvasRef} initial={initialDiagram} />
          )}
        </div>
      </div>
    </div>
  );
}

function SaveStatus({ state, loggedIn }: { state: SaveState; loggedIn: boolean }) {
  if (!loggedIn) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
        guest · not persisted
      </span>
    );
  }
  if (state.kind === "saving")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-coral">saving…</span>;
  if (state.kind === "saved")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a7d10]">✓ saved</span>;
  if (state.kind === "error")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-red" title={state.message}>save failed</span>;
  return null;
}
