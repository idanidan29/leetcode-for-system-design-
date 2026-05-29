"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Nav } from "@/components/nav";
import { useBadges } from "@/components/profile/badges";
import { Canvas, type CanvasHandle } from "@/components/whiteboard/canvas";
import { Palette } from "@/components/whiteboard/palette";
import { ProblemPanel } from "@/components/whiteboard/problem-panel";
import { SolutionModal } from "@/components/whiteboard/solution-modal";
import type { ComponentKind } from "@/components/whiteboard/types";
import {
  ApiError,
  problems as problemsApi,
  submissions as submissionsApi,
  type Diagram,
  type Evaluation,
  type Hint,
  type Problem,
  type SolutionResponse,
  type Submission,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

type EvalState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done" }
  | { kind: "error"; message: string };

type HintsState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ready"; hints: Hint[] }
  | { kind: "error"; message: string };

type SolutionState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ready"; solution: SolutionResponse }
  | { kind: "error"; message: string };

export default function DrawPage() {
  const params = useParams<{ id: string }>();
  const problemId = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refresh: refreshBadges } = useBadges();

  const canvasRef = useRef<CanvasHandle | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [initialDiagram, setInitialDiagram] = useState<Diagram | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [evalState, setEvalState] = useState<EvalState>({ kind: "idle" });
  const [hintsState, setHintsState] = useState<HintsState>({ kind: "idle" });
  const [solutionState, setSolutionState] = useState<SolutionState>({ kind: "idle" });
  const [solutionOpen, setSolutionOpen] = useState(false);

  const [notes, setNotes] = useState("");
  const [showPanel, setShowPanel] = useState(true);

  // The evaluation displayed in the right panel — derived from the current
  // submission's evaluation field, refreshed when an eval completes.
  const evaluation: Evaluation | null =
    (submission?.evaluation as Evaluation | null | undefined) ?? null;

  // Fetch the problem (public).
  useEffect(() => {
    if (!problemId) return;
    let cancelled = false;
    problemsApi
      .get(problemId)
      .then((p) => { if (!cancelled) setProblem(p); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProblemError(err instanceof ApiError ? err.detail : "Couldn’t load problem.");
        }
      });
    return () => { cancelled = true; };
  }, [problemId]);

  // Load the user's most recent submission for this problem.
  useEffect(() => {
    if (authLoading || !problemId) return;
    let cancelled = false;
    if (!user) { setBootstrapped(true); return; }
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
      .catch(() => { if (!cancelled) setBootstrapped(true); });
    return () => { cancelled = true; };
  }, [authLoading, user, problemId]);

  const addNode = useCallback((kind: ComponentKind) => {
    canvasRef.current?.addNode(kind);
  }, []);

  const handleSave = useCallback(async () => {
    if (!problemId) return;
    if (!user) { router.push("/signup"); return; }
    const diagram = canvasRef.current?.toDiagram();
    if (!diagram) return;
    setSave({ kind: "saving" });
    try {
      const saved = submission
        ? await submissionsApi.update(submission.id, { diagram })
        : await submissionsApi.create({ problem_id: problemId, diagram });
      setSubmission(saved);
      setSave({ kind: "saved", at: Date.now() });
      // First-sketch badge unlocks here — re-tally so the toast fires.
      refreshBadges();
    } catch (err) {
      setSave({
        kind: "error",
        message: err instanceof ApiError ? err.detail : "Couldn’t save.",
      });
    }
  }, [problemId, user, submission, router, refreshBadges]);

  const handleShowSolution = useCallback(async () => {
    if (!problemId) return;
    if (!user) { router.push("/signup"); return; }
    // Already loaded? Just reopen.
    if (solutionState.kind === "ready") { setSolutionOpen(true); return; }
    setSolutionState({ kind: "running" });
    try {
      const sol = await problemsApi.solution(problemId);
      setSolutionState({ kind: "ready", solution: sol });
      setSolutionOpen(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 429
            ? "Rate limit reached — try again in an hour."
            : err.detail
          : "Couldn’t load reference solution.";
      setSolutionState({ kind: "error", message });
    }
  }, [problemId, user, solutionState, router]);

  const handleHint = useCallback(async () => {
    if (!problemId) return;
    if (!user) { router.push("/signup"); return; }
    const diagram = canvasRef.current?.toDiagram();
    if (!diagram) return;
    setHintsState({ kind: "running" });
    try {
      const res = await problemsApi.hints(problemId, diagram);
      setHintsState({ kind: "ready", hints: res.hints });
      setShowPanel(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 429
            ? "Rate limit reached — try again in an hour."
            : err.detail
          : "Couldn’t fetch hints.";
      setHintsState({ kind: "error", message });
    }
  }, [problemId, user, router]);

  // Save (if needed), then evaluate. Saving first guarantees the diagram on
  // disk matches what we score, and the eval result lands on the same row.
  const handleEvaluate = useCallback(async () => {
    if (!problemId) return;
    if (!user) { router.push("/signup"); return; }
    const diagram = canvasRef.current?.toDiagram();
    if (!diagram) return;

    setEvalState({ kind: "running" });
    try {
      // Always save first — evaluate scores whatever is in the DB.
      const saved = submission
        ? await submissionsApi.update(submission.id, { diagram })
        : await submissionsApi.create({ problem_id: problemId, diagram });
      setSubmission(saved);
      const scored = await submissionsApi.evaluate(saved.id, notes);
      setSubmission(scored);
      setEvalState({ kind: "done" });
      // Make sure the panel is open so the user sees the result.
      setShowPanel(true);
      // Trigger badge recomputation — new unlocks fire toasts globally.
      refreshBadges();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 429
            ? "Rate limit reached — try again in an hour."
            : err.detail
          : "Couldn’t evaluate.";
      setEvalState({ kind: "error", message });
    }
  }, [problemId, user, submission, router, notes, refreshBadges]);

  useEffect(() => {
    if (save.kind !== "saved") return;
    const t = setTimeout(() => setSave({ kind: "idle" }), 2500);
    return () => clearTimeout(t);
  }, [save]);

  useEffect(() => {
    if (evalState.kind !== "done") return;
    const t = setTimeout(() => setEvalState({ kind: "idle" }), 2500);
    return () => clearTimeout(t);
  }, [evalState]);

  const evalRunning = evalState.kind === "running";
  const hintRunning = hintsState.kind === "running";
  const solutionRunning = solutionState.kind === "running";
  const saving = save.kind === "saving";

  // Track which discipline we're in; the palette uses this too. AI features
  // now have a parallel pattern-rubric path on the backend, so no gating.
  const isPatternProblem = problem?.kind === "design_pattern";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Nav />

      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-b border-rule bg-white px-5 py-2.5">
        <Link
          href="/problems"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted transition hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M13 7H1m0 0l5 5M1 7l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All problems
        </Link>
        <div className="flex-1 truncate">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">Drawing —</span>{" "}
          <span className="text-[13px] font-medium text-ink">
            {problem?.title ?? (problemError ? "Problem not found" : "loading…")}
          </span>
        </div>
        <SaveStatus state={save} evalState={evalState} loggedIn={!!user} />

        <button
          type="button"
          onClick={() => setShowPanel((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-white px-3 py-2 text-[12px] font-medium text-ink-soft transition hover:border-ink hover:text-ink"
          title={showPanel ? "Hide details panel" : "Show details panel"}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="2.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          {showPanel ? "Hide" : "Show"} details
        </button>

        <button
          onClick={() => void handleShowSolution()}
          disabled={solutionRunning || evalRunning || hintRunning || saving || !bootstrapped}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-white px-3 py-2 text-[12px] font-medium text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-progress disabled:opacity-60"
          title="See a reference solution"
        >
          {solutionRunning ? (
            <>
              <Spinner />
              Drawing…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M4 5h6M4 7.5h6M4 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Solution
            </>
          )}
        </button>

        <button
          onClick={() => void handleHint()}
          disabled={hintRunning || evalRunning || solutionRunning || saving || !bootstrapped}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-white px-3 py-2 text-[12px] font-medium text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-progress disabled:opacity-60"
          title="Get a contextual hint based on your current design"
        >
          {hintRunning ? (
            <>
              <Spinner />
              Thinking…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5a4 4 0 00-2.4 7.2c.4.3.6.7.6 1.2v.6h3.6V9.9c0-.5.2-.9.6-1.2A4 4 0 007 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M5.2 12h3.6M5.7 13h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Hint
            </>
          )}
        </button>

        <button
          onClick={() => void handleSave()}
          disabled={saving || evalRunning || hintRunning || solutionRunning || !bootstrapped}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-ink bg-white px-3 py-2 text-[13px] font-medium text-ink transition hover:bg-paper-2 disabled:cursor-progress disabled:opacity-60"
        >
          {!user ? "Sign in to save" : submission ? "Save" : "Save design"}
        </button>

        <button
          onClick={() => void handleEvaluate()}
          disabled={evalRunning || saving || hintRunning || solutionRunning || !bootstrapped}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-coral px-4 py-2 text-[13px] font-medium text-white shadow-md transition hover:-translate-y-px hover:bg-coral/90 disabled:cursor-progress disabled:opacity-70"
          title={!user ? "Sign in to evaluate" : "Run AI evaluation"}
        >
          {evalRunning ? (
            <>
              <Spinner />
              Evaluating…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5l1.5 3.5 3.5.5-2.5 2.5.5 3.5L7 9.5 3.5 11.5l.5-3.5L1.5 5.5l3.5-.5L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Evaluate
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <Palette
          onAdd={addNode}
          discipline={isPatternProblem ? "pattern" : "system"}
        />
        <div className="relative flex-1 bg-paper">
          {!bootstrapped ? (
            <div className="absolute inset-0 grid place-items-center text-[13px] text-ink-muted">
              Loading…
            </div>
          ) : (
            <Canvas
              ref={canvasRef}
              initial={initialDiagram}
              issues={evaluation?.issues}
            />
          )}
        </div>
        {showPanel && (
          <ProblemPanel
            problem={problem}
            problemError={problemError}
            notes={notes}
            onNotesChange={setNotes}
            evaluation={evaluation}
            evalState={evalState}
            hintsState={hintsState}
            onResetHints={() => setHintsState({ kind: "idle" })}
            onFocusNode={(nodeId) => canvasRef.current?.focusNode(nodeId)}
          />
        )}
      </div>

      {solutionOpen && solutionState.kind === "ready" && (
        <SolutionModal
          solution={solutionState.solution}
          onClose={() => setSolutionOpen(false)}
          onApply={(d) => canvasRef.current?.loadDiagram(d)}
        />
      )}
    </div>
  );
}

function SaveStatus({
  state, evalState, loggedIn,
}: {
  state: SaveState;
  evalState: EvalState;
  loggedIn: boolean;
}) {
  if (!loggedIn) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
        guest · not persisted
      </span>
    );
  }
  if (evalState.kind === "error")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-red" title={evalState.message}>eval failed</span>;
  if (evalState.kind === "done")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a7d10]">✓ evaluated</span>;
  if (state.kind === "saving")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-coral">saving…</span>;
  if (state.kind === "saved")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#5a7d10]">✓ saved</span>;
  if (state.kind === "error")
    return <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-red" title={state.message}>save failed</span>;
  return null;
}

function Spinner() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16"
      style={{ animation: "spin 0.9s linear infinite" }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" fill="none" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
