"use client";

import { Fragment, useEffect, useState, type CSSProperties } from "react";

// ─── Phases & timeline ────────────────────────────────────────────────────────
type Phase =
  | "intro"
  | "draw1"
  | "draw2"
  | "draw3"
  | "draw4"
  | "draw5"
  | "submit"
  | "evaluate"
  | "verdict"
  | "offer"
  | "accept"
  | "hold";

type TimelineStep = { phase: Phase | "restart"; at: number };

const TIMELINE: TimelineStep[] = [
  { phase: "intro", at: 0 },
  { phase: "draw1", at: 1200 },
  { phase: "draw2", at: 1900 },
  { phase: "draw3", at: 2600 },
  { phase: "draw4", at: 3300 },
  { phase: "draw5", at: 4000 },
  { phase: "submit", at: 4900 },
  { phase: "evaluate", at: 5500 },
  { phase: "verdict", at: 8800 },
  { phase: "offer", at: 12200 },
  { phase: "accept", at: 14800 },
  { phase: "hold", at: 17000 },
  { phase: "restart", at: 19500 },
];

const ORDER: Phase[] = [
  "intro", "draw1", "draw2", "draw3", "draw4", "draw5",
  "submit", "evaluate", "verdict", "offer", "accept", "hold",
];

const gte = (phase: Phase, target: Phase): boolean =>
  ORDER.indexOf(phase) >= ORDER.indexOf(target);

const stepOf = (phase: Phase): 1 | 2 | 3 => {
  if (gte(phase, "offer")) return 3;
  if (gte(phase, "submit")) return 2;
  return 1;
};

function useStoryPhase(): { phase: Phase; tick: number } {
  const [phase, setPhase] = useState<Phase>("intro");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timers = TIMELINE.map(({ phase: p, at }) =>
      setTimeout(() => {
        if (p === "restart") setTick((t) => t + 1);
        else setPhase(p);
      }, at),
    );
    return () => timers.forEach(clearTimeout);
  }, [tick]);

  useEffect(() => { setPhase("intro"); }, [tick]);

  return { phase, tick };
}

// ─── SVG arrow-head builder ───────────────────────────────────────────────────
function arrowHead(x: number, y: number, dir: "r" | "ur" | "dr", size = 6): string {
  const s = size;
  switch (dir) {
    case "r":  return ` M ${x} ${y} L ${x - s} ${y - s * 0.55} M ${x} ${y} L ${x - s} ${y + s * 0.55}`;
    case "ur": return ` M ${x} ${y} L ${x - s * 0.95} ${y + s * 0.1} M ${x} ${y} L ${x - s * 0.1} ${y + s * 0.95}`;
    case "dr": return ` M ${x} ${y} L ${x - s * 0.95} ${y - s * 0.1} M ${x} ${y} L ${x - s * 0.1} ${y - s * 0.95}`;
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ phase }: { phase: Phase }) {
  const cur = stepOf(phase);
  const steps = [
    { n: 1 as const, label: "Solve",     sub: "sketch the design" },
    { n: 2 as const, label: "Iterate",   sub: "feedback that compounds" },
    { n: 3 as const, label: "Get hired", sub: "accept the offer" },
  ];
  return (
    <div className="flex items-center gap-2 rounded-xl border border-rule bg-white px-3 py-2 shadow-md">
      {steps.map((s, i) => {
        const isDone = cur > s.n;
        const isActive = cur === s.n;
        return (
          <Fragment key={s.n}>
            <div
              className={`flex shrink-0 items-center gap-2 transition-opacity duration-300 ${
                !isDone && !isActive ? "opacity-45" : ""
              }`}
            >
              <div
                className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[10px] font-semibold transition-all duration-300 ${
                  isDone
                    ? "border-acid bg-acid text-night"
                    : isActive
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper-2 text-ink-muted"
                }`}
                style={
                  isActive
                    ? { animation: "sb-step-pulse 1.6s ease-in-out infinite" }
                    : undefined
                }
              >
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <div className="flex flex-col leading-[1.05]">
                <div className={`text-[11px] font-semibold ${!isDone && !isActive ? "text-ink-muted" : "text-ink"}`}>
                  {s.label}
                </div>
                <div className="mt-px font-mono text-[8.5px] tracking-[0.04em] text-ink-muted">
                  {s.sub}
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="relative h-0.5 min-w-[10px] flex-1 overflow-hidden rounded-full bg-rule">
                {isDone && (
                  <div
                    className="absolute inset-0 origin-left bg-acid"
                    style={{ animation: "sb-line-fill 0.45s ease-out forwards" }}
                  />
                )}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Animated SVG primitives ──────────────────────────────────────────────────
type FillTone = "coral" | "amber" | "blue";

const FILL_STYLES: Record<FillTone, { fill: string; opacity: number }> = {
  coral: { fill: "var(--color-coral)", opacity: 0.18 },
  amber: { fill: "var(--color-amber)", opacity: 0.22 },
  blue:  { fill: "var(--color-blue)",  opacity: 0.16 },
};

interface StoryBoxProps {
  x: number; y: number; w: number; h: number;
  fill: FillTone; label: string; visible: boolean; delay?: number;
}

function StoryBox({ x, y, w, h, fill, label, visible, delay = 0 }: StoryBoxProps) {
  const len = 2 * (w + h) + 30;
  if (!visible) return null;
  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ animation: `sb-pop-in 0.4s ease ${delay}ms backwards` }}
    >
      <path
        d={`M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: len,
          strokeDashoffset: len,
          animation: `skDraw 0.6s cubic-bezier(.5,0,.3,1) ${delay}ms forwards`,
        }}
      />
      <rect
        x="3" y="3" width={w - 6} height={h - 6} rx="2"
        {...FILL_STYLES[fill]}
        style={{ opacity: 0, animation: `skFadeIn 0.4s ease ${delay + 400}ms forwards` }}
      />
      <text
        x={w / 2} y={h / 2 + 7}
        textAnchor="middle"
        fontFamily="'Caveat', 'Comic Sans MS', cursive"
        fontSize="22"
        fontWeight="600"
        fill="var(--color-ink)"
        style={{ opacity: 0, animation: `skFadeIn 0.5s ease ${delay + 500}ms forwards` }}
      >
        {label}
      </text>
    </g>
  );
}

interface StoryArrowProps {
  d: string; visible: boolean; delay?: number; color?: string;
}

function StoryArrow({ d, visible, delay = 0, color = "var(--color-ink)" }: StoryArrowProps) {
  if (!visible) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        strokeDasharray: 200,
        strokeDashoffset: 200,
        animation: `skDraw 0.5s ease ${delay}ms forwards`,
      }}
    />
  );
}

function StoryCursor({ phase }: { phase: Phase }) {
  const POSITIONS: Partial<Record<Phase, { x: number; y: number; visible?: boolean }>> = {
    intro:  { x: 60, y: 50, visible: false },
    draw1:  { x: 90, y: 100 },
    draw2:  { x: 240, y: 100 },
    draw3:  { x: 410, y: 50 },
    draw4:  { x: 410, y: 160 },
    draw5:  { x: 540, y: 160 },
    submit: { x: 280, y: 280, visible: false },
  };
  const pos = POSITIONS[phase] ?? { x: 540, y: 160, visible: false };
  const show = pos.visible !== false && phase !== "intro" && !gte(phase, "submit");
  return (
    <g
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: "transform 0.55s cubic-bezier(.4,1.3,.5,1), opacity 0.3s ease",
        opacity: show ? 1 : 0,
      }}
    >
      <g transform="rotate(-22)">
        <rect x="-3" y="0" width="6" height="34" fill="var(--color-ink)" rx="1.5" />
        <polygon points="-3,34 3,34 0,42" fill="var(--color-coral)" />
        <rect x="-3" y="-10" width="6" height="10" fill="var(--color-ink)" rx="2" opacity="0.7" />
      </g>
    </g>
  );
}

// ─── Typewriter (segmented, supports inline bold) ────────────────────────────
type Segment = { text: string; bold?: boolean };

function Typewriter({ segments, msPerChar = 22 }: { segments: Segment[]; msPerChar?: number }) {
  const total = segments.reduce((sum, s) => sum + s.text.length, 0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= total) return;
    const id = setTimeout(() => setShown((s) => Math.min(s + 1, total)), msPerChar);
    return () => clearTimeout(id);
  }, [shown, total, msPerChar]);

  let remaining = shown;
  return (
    <>
      {segments.map((seg, i) => {
        if (remaining <= 0) return null;
        const take = Math.min(seg.text.length, remaining);
        remaining -= take;
        const visible = seg.text.slice(0, take);
        if (seg.bold) {
          return (
            <strong
              key={i}
              className="rounded-sm bg-[rgba(255,106,61,0.18)] px-1 font-semibold text-ink"
            >
              {visible}
            </strong>
          );
        }
        return <span key={i}>{visible}</span>;
      })}
      {shown < total && (
        <span
          className="ml-px inline-block h-[1em] w-[1.5px] -mb-[2px] bg-ink/70 align-middle"
          style={{ animation: "sb-blink 0.7s steps(2) infinite" }}
        />
      )}
    </>
  );
}

const AI_FEEDBACK: Segment[] = [
  { text: "Solid cache-aside on reads. " },
  { text: "Add a rate limiter", bold: true },
  { text: " before the gateway and you’re at 5/5." },
];

// ─── Confetti (deterministic, no random for SSR safety) ──────────────────────
const CONFETTI_COLORS = [
  "var(--color-coral)",
  "var(--color-amber)",
  "var(--color-acid)",
  "var(--color-blue)",
];

interface Particle { tx: number; ty: number; color: string; rotate: number; delay: number; size: number; }

const CONFETTI: Particle[] = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2;
  const dist = 80 + ((i * 11) % 50);
  return {
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: (i * 53) % 360,
    delay: (i % 6) * 35,
    size: 5 + ((i * 3) % 5),
  };
});

function Confetti() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-0">
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-[1px]"
          style={{
            background: p.color,
            width: p.size,
            height: p.size * 0.45,
            opacity: 0,
            ["--tx" as string]: `${p.tx}px`,
            ["--ty" as string]: `${p.ty}px`,
            ["--rotate" as string]: `${p.rotate}deg`,
            animation: `sb-confetti 1.4s cubic-bezier(.18,.7,.35,1) ${p.delay}ms forwards`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Score row ────────────────────────────────────────────────────────────────
function ScoreRow({
  label, val, max = 5, delay = 0, show,
}: { label: string; val: number; max?: number; delay?: number; show: boolean }) {
  const fillStyle: CSSProperties = {
    width: show ? `${(val / max) * 100}%` : "0%",
    transition: `width 0.9s cubic-bezier(.2,.8,.2,1) ${delay}ms`,
  };
  const numStyle: CSSProperties = {
    opacity: show ? 1 : 0,
    transition: `opacity 0.3s ease ${delay + 700}ms`,
  };
  return (
    <div className="grid grid-cols-[80px_1fr_28px] items-center gap-2">
      <span className="font-mono text-[9px] tracking-[0.08em] text-ink-muted">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral to-acid"
          style={fillStyle}
        />
      </div>
      <span className="text-right font-mono text-[9px] text-ink-muted">
        <span className="font-semibold text-ink" style={numStyle}>{val}</span>/{max}
      </span>
    </div>
  );
}

// ─── Main storyboard ──────────────────────────────────────────────────────────
function Storyboard() {
  const { phase, tick } = useStoryPhase();
  const showEval    = gte(phase, "evaluate");
  const showVerdict = gte(phase, "verdict");
  const showOffer   = gte(phase, "offer");
  const showAccept  = gte(phase, "accept");

  return (
    <div
      key={tick}
      className="grid gap-x-3 gap-y-2 grid-cols-[1.25fr_1fr] [grid-template-areas:'steps_steps'_'prompt_panels'_'board_panels'_'caption_caption'] max-[700px]:grid-cols-1 max-[700px]:[grid-template-areas:'steps'_'prompt'_'board'_'panels'_'caption']"
    >
      {/* Step indicator */}
      <div className="[grid-area:steps]">
        <StepIndicator phase={phase} />
      </div>

      {/* Problem prompt */}
      <div
        className={`[grid-area:prompt] rounded-xl border border-rule bg-white px-3 py-2 shadow-md transition-all duration-500 ${
          gte(phase, "draw1") ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-coral">
          <span
            className="h-1.5 w-1.5 rounded-full bg-coral shadow-[0_0_6px_var(--color-coral)]"
            style={{ animation: "sb-pulse 1.8s ease-in-out infinite" }}
          />
          PROBLEM · #02
        </div>
        <h3 className="mb-0.5 text-[15px] font-semibold tracking-tight text-ink">
          Design a URL shortener
        </h3>
        <p className="m-0 font-mono text-[10px] text-ink-muted">
          100M users · {"<"}10ms reads · 6:1 read/write ratio
        </p>
      </div>

      {/* Whiteboard */}
      <div className="[grid-area:board] relative overflow-hidden rounded-xl border border-rule bg-[#fffdf6] shadow-md">
        <svg viewBox="0 0 600 320" className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="dots-story" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(26,24,20,0.16)" />
            </pattern>
          </defs>
          <rect width="600" height="320" fill="url(#dots-story)" />

          <StoryBox x={40}  y={130} w={110} h={50} label="Client"  fill="amber" visible={gte(phase, "draw1")} />
          <StoryBox x={200} y={130} w={130} h={50} label="API GW"  fill="blue"  visible={gte(phase, "draw2")} />
          <StoryBox x={380} y={60}  w={130} h={50} label="ID Gen"  fill="coral" visible={gte(phase, "draw3")} />
          <StoryBox x={380} y={200} w={130} h={50} label="Cache"   fill="coral" visible={gte(phase, "draw4")} />
          <StoryBox x={540} y={200} w={50}  h={50}  label="DB"     fill="blue"  visible={gte(phase, "draw5")} />

          <StoryArrow d={`M 150 155 L 200 155${arrowHead(200,155,"r")}`}                        visible={gte(phase, "draw2")} delay={200} />
          <StoryArrow d={`M 330 145 C 350 130, 365 110, 380 90${arrowHead(380,90,"ur")}`}        visible={gte(phase, "draw3")} delay={200} />
          <StoryArrow d={`M 330 165 C 350 180, 365 200, 380 220${arrowHead(380,220,"dr")}`}      visible={gte(phase, "draw4")} delay={200} color="var(--color-coral)" />
          <StoryArrow d={`M 510 225 L 540 225${arrowHead(540,225,"r")}`}                         visible={gte(phase, "draw5")} delay={200} />

          <StoryCursor phase={phase} />
        </svg>

        <button
          tabIndex={-1}
          className={`pointer-events-none absolute bottom-2.5 left-1/2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-[0_8px_20px_-8px_rgba(20,16,8,0.45)] transition-all duration-400 ${
            gte(phase, "draw5") ? "translate-x-[-50%] translate-y-0 opacity-100" : "translate-x-[-50%] translate-y-2 opacity-0"
          } ${gte(phase, "evaluate") ? "bg-acid text-night" : "bg-ink text-paper"}`}
          style={phase === "submit" ? { animation: "sb-flash 0.5s ease-out" } : undefined}
        >
          {gte(phase, "evaluate") ? "✓ submitted" : (<>Submit for review <span aria-hidden>→</span></>)}
        </button>
      </div>

      {/* Panel wrap — eval & offer cards overlap, transition between */}
      <div className="[grid-area:panels] relative min-h-[220px] self-stretch">
        {/* Eval card */}
        <div
          className={`absolute inset-0 flex flex-col rounded-xl border border-rule bg-white px-3.5 py-3 shadow-md transition-all duration-[550ms] ease-[cubic-bezier(0.4,1.3,0.5,1)] ${
            showOffer ? "-translate-y-[22px] scale-[0.97] opacity-0" : showEval ? "translate-y-0 opacity-100" : "translate-y-[18px] opacity-0"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.14em] text-coral">
              <span
                className="h-1.5 w-1.5 rounded-full bg-coral shadow-[0_0_6px_var(--color-coral)]"
                style={{ animation: "sb-pulse 1.8s ease-in-out infinite" }}
              />
              AI EVALUATION
            </span>
            {showVerdict && (
              <span
                className="rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold tracking-[0.04em]"
                style={{
                  color: "#5a7d10",
                  background: "rgba(181,242,58,0.14)",
                  borderColor: "rgba(181,242,58,0.5)",
                  animation: "sb-pop-in 0.45s cubic-bezier(.4,1.5,.5,1) backwards",
                }}
              >
                ✓ Strong design
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <ScoreRow label="CORRECTNESS" val={5} delay={0}    show={showEval} />
            <ScoreRow label="SCALABILITY" val={4} delay={250}  show={showEval} />
            <ScoreRow label="RELIABILITY" val={4} delay={500}  show={showEval} />
            <ScoreRow label="PERFORMANCE" val={5} delay={750}  show={showEval} />
            <ScoreRow label="SECURITY"    val={4} delay={1000} show={showEval} />
            <ScoreRow label="COST"        val={4} delay={1250} show={showEval} />
          </div>

          {showVerdict && (
            <div
              className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-rule bg-paper-2 px-2.5 py-2"
              style={{ animation: "sb-ai-slide 0.55s cubic-bezier(.3,1.3,.5,1) backwards" }}
            >
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded bg-ink font-mono text-[8px] font-bold tracking-[0.06em] text-coral">
                AI
              </div>
              <div className="text-[11px] leading-[1.4] text-ink-soft">
                <Typewriter segments={AI_FEEDBACK} msPerChar={20} />
              </div>
            </div>
          )}
        </div>

        {/* Offer card */}
        <div
          className={`absolute inset-0 flex flex-col rounded-xl border border-rule bg-white px-3.5 py-3 shadow-md transition-all duration-[550ms] ease-[cubic-bezier(0.4,1.3,0.5,1)] ${
            showOffer ? "translate-y-0 opacity-100" : "translate-y-[18px] opacity-0"
          }`}
        >
          <div className="mb-2 flex items-center gap-2 border-b border-dashed border-rule pb-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-ink to-[#2a261f] font-mono text-[13px] font-semibold text-paper">
              M
            </div>
            <div>
              <div className="text-[12px] font-semibold text-ink">Meridian Labs</div>
              <div className="font-mono text-[9px] text-ink-muted">talent@meridian.dev</div>
            </div>
          </div>

          <div className="mb-1 text-[12px] text-ink">
            <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.06em] text-ink-muted">
              Subject:
            </span>
            Re: your interview loop
          </div>

          <p className="mb-2 text-[12px] leading-[1.45] text-ink-soft">
            Great news — the panel{" "}
            <span className="rounded-sm bg-amber/85 px-1 text-ink">loved</span> your URL
            shortener walkthrough. We&apos;d like to extend an offer for{" "}
            <strong className="font-semibold text-ink">Staff Software Engineer</strong>.
          </p>

          <div className="mt-auto flex gap-1.5">
            <button tabIndex={-1} className="pointer-events-none flex-1 rounded-md bg-ink px-3 py-2 text-[12px] font-medium text-paper">
              Accept offer
            </button>
            <button tabIndex={-1} className="pointer-events-none rounded-md border border-rule px-3 py-2 text-[12px] text-ink-muted">
              Decline
            </button>
          </div>

          {showAccept && (
            <>
              <Confetti />
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex flex-col items-center gap-0.5 rounded-xl border-[3px] border-acid px-4 py-2.5 font-mono text-[12px] font-bold tracking-[0.12em] shadow-[0_15px_30px_-12px_rgba(181,242,58,0.5)]"
                style={{
                  color: "#5a7d10",
                  background: "rgba(255,253,246,0.95)",
                  animation: "sb-stamp-in 0.7s cubic-bezier(.3,1.6,.5,1) forwards",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-acid">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>OFFER ACCEPTED</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="[grid-area:caption] text-center">
        <span className="font-script text-[14px] font-medium text-ink-muted opacity-70">
          solve → ship → get hired.
        </span>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
export function WhiteboardLoopSection() {
  return (
    <section
      id="sk-benefits"
      className="bg-night bg-[radial-gradient(circle_at_1px_1px,rgba(239,231,211,0.06)_1px,transparent_0)] bg-[length:28px_28px] py-16"
    >
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mb-8 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-mute">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
            THE WHOLE LOOP
          </span>
          <h2 className="mx-0 my-2 mb-3 text-[clamp(28px,4vw,42px)] font-semibold leading-[1.05] tracking-[-0.025em] text-bone">
            From blank board to offer letter.
          </h2>
          <p className="mx-auto max-w-[56ch] text-[15px] text-bone-soft">
            The same product you&apos;ll get inside, played at 1x speed. Solve →
            iterate on feedback → land the role.
          </p>
        </div>

        {/* Browser-chrome window */}
        <div
          className="relative mx-auto max-w-[860px] overflow-hidden rounded-2xl border border-night-line bg-night-2"
          style={{
            boxShadow:
              "0 40px 90px -30px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04), 0 16px 40px -22px rgba(255,106,61,0.18)",
          }}
        >
          <div className="flex items-center gap-1.5 border-b border-night-line bg-night-3 px-3 py-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="mx-auto font-mono text-[10px] tracking-[0.06em] text-bone-mute">
              sketchd.app · live demo
            </span>
            <span
              className="font-mono text-[9px] tracking-[0.16em] text-coral"
              style={{ animation: "sb-pulse 1.8s ease-in-out infinite" }}
            >
              REC ●
            </span>
          </div>
          <div
            className="bg-paper bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.1)_1px,transparent_0)] bg-[length:22px_22px] px-4 py-4"
          >
            <Storyboard />
          </div>
        </div>
      </div>
    </section>
  );
}
