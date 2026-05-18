"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/lib/auth";

// ─── Constants & shared SVG style objects ─────────────────────────────────────
const STROKE_INK = {
  stroke: "var(--color-ink)",
  fill: "none",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ARROW_INK = {
  stroke: "var(--color-ink)",
  fill: "none",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ARROW_CORAL = { ...ARROW_INK, stroke: "var(--color-coral)" };
const ARROW_BLUE = { ...ARROW_INK, stroke: "var(--color-blue)" };

type FillAttrs = { fill: string; opacity: number };
const FILL_CORAL: FillAttrs = { fill: "var(--color-coral)", opacity: 0.18 };
const FILL_AMBER: FillAttrs = { fill: "var(--color-amber)", opacity: 0.22 };
const FILL_BLUE: FillAttrs = { fill: "var(--color-blue)", opacity: 0.16 };

const LABEL = {
  fontFamily: "var(--font-script)",
  fontSize: 22,
  fill: "var(--color-ink)",
};

const DRAW_ANIM_BASE = "animate-draw [stroke-dasharray:var(--len,800)] [stroke-dashoffset:var(--len,800)]";

// ─── Sketch helpers ────────────────────────────────────────────────────────────
// Bit-identical integer hash → [-amp, amp]. Math.imul + uint32 division are
// IEEE-754 deterministic across engines, so SSR and client produce the same
// path coordinates (Math.sin would not — its last digits vary across V8 builds).
function jitter(salt: number, amp = 3): number {
  let x = Math.imul(salt | 0, 0x9e3779b1) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) | 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) | 0;
  x ^= x >>> 16;
  const u = (x >>> 0) / 4294967296;
  return (u - 0.5) * 2 * amp;
}

function ah(x: number, y: number, dir: string, size = 8): string {
  const s = size;
  switch (dir) {
    case "r":  return ` M ${x} ${y} L ${x - s} ${y - s * 0.55} M ${x} ${y} L ${x - s} ${y + s * 0.55}`;
    case "l":  return ` M ${x} ${y} L ${x + s} ${y - s * 0.55} M ${x} ${y} L ${x + s} ${y + s * 0.55}`;
    case "d":  return ` M ${x} ${y} L ${x - s * 0.55} ${y - s} M ${x} ${y} L ${x + s * 0.55} ${y - s}`;
    case "u":  return ` M ${x} ${y} L ${x - s * 0.55} ${y + s} M ${x} ${y} L ${x + s * 0.55} ${y + s}`;
    case "ur": return ` M ${x} ${y} L ${x - s * 0.95} ${y + s * 0.1} M ${x} ${y} L ${x - s * 0.1} ${y + s * 0.95}`;
    case "dr": return ` M ${x} ${y} L ${x - s * 0.95} ${y - s * 0.1} M ${x} ${y} L ${x - s * 0.1} ${y - s * 0.95}`;
    default:   return "";
  }
}

function lenVar(len: number, delay: number): React.CSSProperties {
  return { ["--len" as string]: len, animationDelay: `${delay}s` } as React.CSSProperties;
}

interface SketchBoxProps { x: number; y: number; w: number; h: number; label: string; fill?: FillAttrs; delay?: number; }
function SketchBox({ x, y, w, h, label, fill = FILL_CORAL, delay = 0 }: SketchBoxProps) {
  const len = 2 * (w + h) + 40;
  // Stable seed per box so the wobble is deterministic across SSR/client.
  const s = x * 7919 + y * 31 + w + h * 17;
  return (
    <g transform={`translate(${x},${y})`}>
      <path
        {...STROKE_INK}
        className={DRAW_ANIM_BASE}
        style={lenVar(len, delay)}
        d={`M ${jitter(s + 1, 2)} ${jitter(s + 2, 2)} L ${w + jitter(s + 3)} ${jitter(s + 4, 2)} L ${w + jitter(s + 5)} ${h + jitter(s + 6, 2)} L ${jitter(s + 7)} ${h + jitter(s + 8, 2)} Z`}
      />
      <rect x="3" y="3" width={w - 6} height={h - 6} rx="2" {...fill} />
      <text x={w / 2} y={h / 2 + 7} textAnchor="middle" {...LABEL}>{label}</text>
    </g>
  );
}

function SketchURLShortener({ delay = 0 }) {
  return (
    <>
      <SketchBox x={-150} y={-36} w={96}  h={40} label="iOS"     fill={FILL_BLUE}  delay={delay + 0} />
      <SketchBox x={-150} y={18}  w={96}  h={40} label="Web"     fill={FILL_AMBER} delay={delay + 0.2} />
      <circle
        cx={-28} cy={28} r={18}
        className={DRAW_ANIM_BASE}
        style={{ ...STROKE_INK, fill: "var(--color-coral)", fillOpacity: 0.16, ...lenVar(120, delay + 0.5) } as React.CSSProperties}
      />
      <path {...ARROW_INK}  className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 0.6)}  d={`M -54 -16 C -42 -10, -38 0, -38 14${ah(-38,14,"d")}`} />
      <path {...ARROW_INK}  className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 0.7)}  d={`M -54 38 C -42 42, -38 40, -38 38${ah(-38,38,"r")}`} />
      <path {...ARROW_INK}  className={DRAW_ANIM_BASE} style={lenVar(50,  delay + 0.85)} d={`M -10 28 L 0 28${ah(0,28,"r")}`} />
      <SketchBox x={0}   y={0}   w={130} h={56} label="Client"   delay={delay + 1.1} />
      <SketchBox x={180} y={0}   w={150} h={56} label="API GW"   fill={FILL_AMBER} delay={delay + 1.5} />
      <SketchBox x={380} y={-60} w={150} h={56} label="ID Gen"   fill={FILL_BLUE}  delay={delay + 2.1} />
      <SketchBox x={380} y={60}  w={150} h={56} label="Cache"    fill={FILL_CORAL} delay={delay + 2.5} />
      <SketchBox x={580} y={60}  w={150} h={56} label="Postgres" delay={delay + 2.9} />
      <path {...ARROW_INK}   className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 1.8)} d={`M 130 28 C 150 28, 165 28, 180 28${ah(180,28,"r")}`} />
      <path {...ARROW_INK}   className={DRAW_ANIM_BASE} style={lenVar(140, delay + 2.4)} d={`M 330 18 C 350 0, 360 -20, 380 -32${ah(380,-32,"ur")}`} />
      <path {...ARROW_CORAL} className={DRAW_ANIM_BASE} style={lenVar(140, delay + 2.7)} d={`M 330 40 C 350 60, 360 75, 380 88${ah(380,88,"dr")}`} />
      <path {...ARROW_INK}   className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 3.1)} d={`M 530 88 L 580 88${ah(580,88,"r")}`} />
    </>
  );
}

function SketchChat({ delay = 0 }) {
  return (
    <>
      <SketchBox x={0}   y={60}  w={130} h={56} label="Client"    delay={delay + 0} />
      <SketchBox x={180} y={60}  w={150} h={56} label="WebSocket" fill={FILL_AMBER} delay={delay + 0.4} />
      <SketchBox x={380} y={60}  w={130} h={56} label="Queue"     fill={FILL_BLUE}  delay={delay + 0.9} />
      <SketchBox x={560} y={-20} w={140} h={50} label="Fan-out"   fill={FILL_CORAL} delay={delay + 1.4} />
      <SketchBox x={560} y={60}  w={140} h={50} label="Indexer"   delay={delay + 1.7} />
      <SketchBox x={560} y={140} w={140} h={50} label="Push svc"  delay={delay + 2.0} />
      <path {...ARROW_INK}   className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 0.7)} d={`M 130 88 L 180 88${ah(180,88,"r")}`} />
      <path {...ARROW_INK}   className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 1.2)} d={`M 330 88 L 380 88${ah(380,88,"r")}`} />
      <path {...ARROW_CORAL} className={DRAW_ANIM_BASE} style={lenVar(130, delay + 1.6)} d={`M 510 80 C 540 50, 540 10, 560 5${ah(560,5,"ur")}`} />
      <path {...ARROW_INK}   className={DRAW_ANIM_BASE} style={lenVar(90,  delay + 1.9)} d={`M 510 88 L 560 88${ah(560,88,"r")}`} />
      <path {...ARROW_BLUE}  className={DRAW_ANIM_BASE} style={lenVar(130, delay + 2.2)} d={`M 510 100 C 540 130, 540 160, 560 168${ah(560,168,"dr")}`} />
    </>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function HeroSketches() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setKey((k) => k + 1), 14000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_100%_90%_at_50%_50%,#000_60%,rgba(0,0,0,0.5)_85%,transparent_100%)]"
      aria-hidden="true"
    >
      <svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
        <g key={`huge-${key}`} transform="translate(1180, 80) scale(-2.6, 2.1)" style={{ opacity: 0.16 }}>
          <SketchURLShortener delay={0} />
        </g>
        <g key={`huge2-${key}`} transform="translate(-40, 640) scale(2.2)" style={{ opacity: 0.11 }}>
          <SketchChat delay={3.5} />
        </g>
      </svg>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper bg-[radial-gradient(circle_at_1px_1px,rgba(26,24,20,0.18)_1px,transparent_0)] bg-[length:22px_22px] px-7 pt-[140px] pb-[200px]">
      <HeroSketches />
      <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col items-center text-center">
        <h1 className="m-0 mb-6 max-w-[14ch] text-[clamp(48px,7vw,96px)] font-semibold leading-[0.95] tracking-[-0.035em]">
          <span className="relative inline-block whitespace-nowrap after:absolute after:-left-[2%] after:-right-[2%] after:bottom-[6%] after:-z-10 after:h-[0.45em] after:-rotate-1 after:rounded after:bg-coral after:opacity-20 after:content-['']">
            LeetCode
          </span>
          , but for{" "}
          <span className="font-script font-medium italic text-coral">system design.</span>
        </h1>
        <p className="m-0 mb-9 max-w-[56ch] text-[19px] leading-[1.5] text-ink-soft">
          Pick a problem. Sketch your architecture on a real whiteboard. Get structured AI feedback graded across{" "}
          <strong>correctness, scalability, reliability, performance, security &amp; cost</strong>. Iterate until it&apos;s interview-ready.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryBtn>Start drilling</PrimaryBtn>
          <OutlineBtn>See a sample evaluation</OutlineBtn>
        </div>
      </div>
    </section>
  );
}

// ─── Reusable buttons (Tailwind utility composition) ──────────────────────────
function PrimaryBtn({ children, href = "/signup" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-[10px] bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-md transition hover:-translate-y-px"
    >
      {children}
      <svg className="transition-transform group-hover:translate-x-[3px]" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

function OutlineBtn({ children, href = "#" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-[10px] border border-ink bg-transparent px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink hover:text-paper"
    >
      {children}
    </Link>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const { user, loading, logout } = useAuth();
  return (
    <nav className="sticky top-0 z-50 border-b border-rule bg-paper/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-7 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <BrandMark />
          <span>sketchd</span>
        </Link>
        <div className="hidden gap-7 text-sm text-ink-soft md:flex">
          <a href="#sk-pipeline" className="hover:text-ink">How it works</a>
          <a href="#sk-problems" className="hover:text-ink">Problems</a>
          <a href="#sk-benefits" className="hover:text-ink">Why sketchd</a>
        </div>
        <div className="flex items-center gap-2.5">
          {loading ? (
            <div className="h-9 w-32" aria-hidden />
          ) : user ? (
            <>
              <span className="hidden text-sm text-ink-soft sm:inline">
                Hi, <span className="font-medium text-ink">{user.display_name}</span>
              </span>
              <button
                onClick={() => void logout()}
                className="rounded-[10px] px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-[10px] px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-md transition hover:-translate-y-px"
              >
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function MiniProblemPick() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <rect x="10" y="14" width="200" height="22" rx="6" fill="var(--color-night-line)" />
      <rect x="14" y="20" width="80" height="10" rx="3" fill="var(--color-bone-mute)" />
      <rect x="178" y="20" width="28" height="10" rx="3" fill="var(--color-coral)" opacity="0.6" />
      <rect x="10" y="44" width="200" height="22" rx="6" fill="var(--color-coral)" opacity="0.18" stroke="var(--color-coral)" />
      <rect x="14" y="50" width="110" height="10" rx="3" fill="var(--color-coral)" />
      <rect x="178" y="50" width="28" height="10" rx="3" fill="var(--color-amber)" opacity="0.7" />
      <rect x="10" y="74" width="200" height="22" rx="6" fill="var(--color-night-line)" />
      <rect x="14" y="80" width="60" height="10" rx="3" fill="var(--color-bone-mute)" />
      <rect x="178" y="80" width="28" height="10" rx="3" fill="var(--color-red)" opacity="0.6" />
    </svg>
  );
}

function MiniDraw() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <defs>
        <marker id="mh" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--color-bone-soft)" />
        </marker>
      </defs>
      <rect x="10"  y="40" width="44" height="26" rx="5" fill="none" stroke="var(--color-bone-soft)" strokeWidth="1.5" />
      <rect x="86"  y="40" width="44" height="26" rx="5" fill="none" stroke="var(--color-coral)"     strokeWidth="1.5" />
      <rect x="162" y="14" width="44" height="26" rx="5" fill="none" stroke="var(--color-blue)"      strokeWidth="1.5" />
      <rect x="162" y="66" width="44" height="26" rx="5" fill="none" stroke="var(--color-amber)"     strokeWidth="1.5" />
      <path d="M 54 53 L 86 53"   stroke="var(--color-bone-soft)" strokeWidth="1.5" markerEnd="url(#mh)" />
      <path d="M 130 47 L 162 28" stroke="var(--color-bone-soft)" strokeWidth="1.5" markerEnd="url(#mh)" />
      <path d="M 130 59 L 162 78" stroke="var(--color-bone-soft)" strokeWidth="1.5" markerEnd="url(#mh)" />
      <text x="22"  y="56" fontSize="8" fill="var(--color-bone-mute)" fontFamily="var(--font-mono)">CLI</text>
      <text x="92"  y="56" fontSize="8" fill="var(--color-coral)"     fontFamily="var(--font-mono)">API</text>
      <text x="170" y="30" fontSize="8" fill="var(--color-blue)"      fontFamily="var(--font-mono)">DB</text>
      <text x="170" y="82" fontSize="8" fill="var(--color-amber)"     fontFamily="var(--font-mono)">CACHE</text>
    </svg>
  );
}

function MiniEvaluate() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <rect x="10" y="10" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="10" width="160" height="14" rx="4" fill="var(--color-acid)" opacity="0.7" />
      <text x="14" y="20" fontSize="8" fill="var(--color-night)" fontFamily="var(--font-mono)">SCALABILITY 4/5</text>
      <rect x="10" y="32" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="32" width="120" height="14" rx="4" fill="var(--color-amber)" opacity="0.85" />
      <text x="14" y="42" fontSize="8" fill="var(--color-night)" fontFamily="var(--font-mono)">SECURITY 3/5</text>
      <rect x="10" y="54" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="54" width="80"  height="14" rx="4" fill="var(--color-red)" opacity="0.8" />
      <text x="14" y="64" fontSize="8" fill="var(--color-bone)" fontFamily="var(--font-mono)">COST 2/5</text>
      <rect x="10" y="76" width="200" height="14" rx="4" fill="var(--color-night-line)" />
      <rect x="10" y="76" width="180" height="14" rx="4" fill="var(--color-acid)" opacity="0.7" />
      <text x="14" y="86" fontSize="8" fill="var(--color-night)" fontFamily="var(--font-mono)">PERFORMANCE 4.5/5</text>
    </svg>
  );
}

function MiniIterate() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 110">
      <circle cx="110" cy="55" r="40" fill="none" stroke="var(--color-coral)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate" from="0 110 55" to="360 110 55" dur="9s" repeatCount="indefinite" />
      </circle>
      <circle cx="110" cy="55" r="22" fill="none" stroke="var(--color-acid)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="360 110 55" to="0 110 55" dur="6s" repeatCount="indefinite" />
      </circle>
      <text x="110" y="50" fontSize="10" textAnchor="middle" fill="var(--color-bone)" fontFamily="var(--font-mono)">SCORE</text>
      <text x="110" y="64" fontSize="14" textAnchor="middle" fill="var(--color-acid)" fontFamily="var(--font-mono)" fontWeight="600">4.2</text>
    </svg>
  );
}

interface PipelineStepProps { num: string; title: string; desc: string; children: React.ReactNode; }
function PipelineStep({ num, title, desc, children }: PipelineStepProps) {
  return (
    <div className="relative flex min-h-[320px] flex-col border-r border-night-line p-7 pb-8 last:border-r-0">
      <div className="absolute right-7 top-7 grid h-7 w-7 place-items-center rounded-full border border-night-line bg-night-3 font-mono text-[11px] text-bone-mute">
        {num}
      </div>
      <div className="mb-[18px] font-mono text-[11px] tracking-[0.14em] text-coral">STEP {num}</div>
      <h3 className="mb-2.5 text-[22px] font-semibold tracking-tight text-bone">{title}</h3>
      <p className="mb-[18px] text-sm leading-[1.55] text-bone-soft">{desc}</p>
      <div className="relative mt-auto flex h-[130px] items-center justify-center overflow-hidden rounded-xl border border-night-line bg-night-3 p-3">
        {children}
      </div>
    </div>
  );
}

const DOT_NIGHT_BG =
  "bg-night bg-[radial-gradient(circle_at_1px_1px,rgba(239,231,211,0.06)_1px,transparent_0)] bg-[length:28px_28px]";

function Pipeline() {
  return (
    <section id="sk-pipeline" className={`${DOT_NIGHT_BG} py-[120px]`}>
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mb-16 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-mute">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
            HOW IT WORKS
          </span>
          <h2 className="mx-0 my-[14px] mb-[18px] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em] text-bone">
            From blank canvas to staff-engineer feedback in four steps.
          </h2>
          <p className="mx-auto max-w-[60ch] text-[18px] text-bone-soft">
            No interviewer to wait for. No vague &ldquo;good job&rdquo; or &ldquo;go deeper.&rdquo; Every diagram you ship gets a structured, opinionated review you can actually act on.
          </p>
        </div>
        <div
          className={
            "relative grid grid-cols-1 overflow-hidden rounded-[22px] border border-night-line " +
            "bg-gradient-to-b from-night-2 to-night md:grid-cols-2 lg:grid-cols-4 " +
            "before:absolute before:inset-x-0 before:top-[100px] before:h-px before:opacity-40 before:content-[''] " +
            "before:bg-[repeating-linear-gradient(90deg,var(--color-coral)_0_6px,transparent_6px_16px)] before:pointer-events-none"
          }
        >
          <PipelineStep num="01" title="Pick a problem" desc="A curated catalog of real interview prompts — URL shortener, chat, rate limiter, payment flows — each with functional and non-functional requirements baked in."><MiniProblemPick /></PipelineStep>
          <PipelineStep num="02" title="Sketch the system" desc="An infinite canvas with the components that actually matter: gateways, load balancers, caches, queues, databases, CDNs. Drag, connect, label."><MiniDraw /></PipelineStep>
          <PipelineStep num="03" title="Get evaluated" desc="One click. Your diagram is reviewed across six rubric categories — with concrete strengths, severity-tagged issues, and suggested fixes."><MiniEvaluate /></PipelineStep>
          <PipelineStep num="04" title="Iterate & level up" desc="Apply the feedback. Re-submit. Watch your scores climb. Every problem becomes a private gym for the architecture muscles interviewers test."><MiniIterate /></PipelineStep>
        </div>
      </div>
    </section>
  );
}

// ─── Problems ─────────────────────────────────────────────────────────────────
type Diff = "easy" | "med" | "hard";
interface Problem { id: string; title: string; diff: Diff; tags: string[]; blurb: string; }

const PROBLEMS: Problem[] = [
  { id: "url-shortener",     title: "Design a URL shortener",            diff: "easy", tags: ["hashing","cache","redirects"],            blurb: "Tiny strings, massive scale. Get the read path right." },
  { id: "twitter-feed",      title: "Design a Twitter-style feed",       diff: "hard", tags: ["fan-out","timeline","ranking"],           blurb: "Push vs. pull, hot users, and the celebrity problem." },
  { id: "chat",              title: "Design a real-time chat service",   diff: "med",  tags: ["websockets","queues","presence"],         blurb: "Delivery guarantees, ordering, and presence at scale." },
  { id: "rate-limiter",      title: "Design a rate limiter",             diff: "easy", tags: ["token-bucket","redis","edge"],            blurb: "Per-user, per-IP, distributed. Without the lock contention." },
  { id: "autocomplete",      title: "Search autocomplete",               diff: "med",  tags: ["trie","ranking","cache"],                 blurb: "Sub-100ms suggestions across billions of queries." },
  { id: "video-streaming",   title: "Design a video streaming platform", diff: "hard", tags: ["CDN","HLS","encoding"],                   blurb: "From upload to playback on a flaky 3G connection." },
  { id: "payment",           title: "Design a payment processor",        diff: "hard", tags: ["idempotency","double-write","audit"],     blurb: "Money moves once. No matter what fails along the way." },
  { id: "notification",      title: "Design a notification system",      diff: "med",  tags: ["fan-out","preferences","delivery"],       blurb: "Push, email, SMS — at fan-out, with retries that don’t loop." },
  { id: "ride-sharing",      title: "Design a ride-sharing service",     diff: "hard", tags: ["geospatial","matching","realtime"],       blurb: "Match drivers to riders on a map that never stops moving." },
  { id: "distributed-cache", title: "Design a distributed cache",        diff: "med",  tags: ["consistent-hash","eviction","replication"], blurb: "Hash ring, eviction policy, replication — without re-inventing Redis." },
];

const DIFF_STYLE: Record<Diff, { label: string; cls: string }> = {
  easy: { label: "EASY",   cls: "bg-acid/20 text-[#5a7d10]" },
  med:  { label: "MEDIUM", cls: "bg-amber/20 text-[#8a5b00]" },
  hard: { label: "HARD",   cls: "bg-red/15 text-[#a82c20]" },
};

function ProblemsSection() {
  return (
    <section id="sk-problems" className="py-[120px]">
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mb-16 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
            PROBLEM CATALOG
          </span>
          <h2 className="mx-0 my-[14px] mb-[18px] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Ten of the questions interviewers actually ask.
          </h2>
          <p className="mx-auto max-w-[60ch] text-[18px] text-ink-soft">
            Curated from real loops at Google, Meta, Stripe, Uber and friends. Each prompt ships with explicit functional &amp; non-functional requirements and constraints — no vague &ldquo;design Twitter&rdquo; energy.
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {PROBLEMS.map((p, i) => {
            const d = DIFF_STYLE[p.diff];
            return (
              <div
                key={p.id}
                className={
                  "group relative cursor-pointer overflow-hidden rounded-[14px] border border-rule bg-white p-5 " +
                  "transition hover:-translate-y-[3px] hover:border-ink hover:shadow-lg " +
                  "after:absolute after:-top-px after:-right-px after:h-[60px] after:w-[60px] after:opacity-0 after:content-[''] " +
                  "after:bg-[radial-gradient(circle_at_top_right,var(--color-coral)_0%,transparent_60%)] " +
                  "after:transition-opacity hover:after:opacity-20"
                }
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="font-mono text-[11px] text-ink-muted">#{String(i + 1).padStart(2, "0")}</span>
                  <span className={`rounded-full px-2 py-[3px] font-mono text-[10px] tracking-[0.1em] ${d.cls}`}>{d.label}</span>
                </div>
                <h3 className="mb-2.5 text-[18px] font-semibold tracking-tight">{p.title}</h3>
                <p className="mb-3.5 text-[13px] leading-[1.5] text-ink-muted">{p.blurb}</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded bg-paper-2 px-2 py-[3px] font-mono text-[10px] text-ink-soft">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Benefits ─────────────────────────────────────────────────────────────────
const BENEFIT_CARD = "flex min-h-[380px] flex-col rounded-[20px] border border-night-line bg-night-2 p-8 pb-9 transition hover:-translate-y-[3px] hover:border-coral/35";

function ScoreCard() {
  return (
    <div className={BENEFIT_CARD}>
      <div className="mb-7 flex flex-1 flex-col justify-center">
        <div className="mb-[18px] font-mono text-[72px] font-semibold leading-none tracking-[-0.04em] text-bone">
          4.2<span className="ml-1 text-[28px] text-bone-mute">/5</span>
        </div>
        <div className="mb-4 h-3 overflow-hidden rounded-full border border-night-line bg-night-3">
          <div
            className="h-full w-0 rounded-full bg-gradient-to-r from-coral to-acid shadow-[0_0_12px_rgba(181,242,58,0.5)] animate-fill"
            style={{ ["--target" as string]: "84%" } as React.CSSProperties}
          />
        </div>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[10.5px] tracking-[0.04em] text-bone-mute">
          <span>CORRECTNESS</span><span>SCALABILITY</span><span>RELIABILITY</span>
          <span>PERFORMANCE</span><span>SECURITY</span><span>COST</span>
        </div>
      </div>
      <h3 className="mb-2.5 text-[26px] font-semibold tracking-[-0.02em] text-bone">A real rubric, not vibes.</h3>
      <p className="text-[14.5px] leading-[1.55] text-bone-soft">
        Every diagram gets graded against the six things senior engineers actually care about — with rationales, not just numbers.
      </p>
    </div>
  );
}

function ClimbCard() {
  const points = [
    { x: 24,  y: 168 },
    { x: 88,  y: 138 },
    { x: 152, y: 100 },
    { x: 216, y: 78  },
    { x: 280, y: 44  },
  ];
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} 196 L ${points[0].x} 196 Z`;
  return (
    <div className={BENEFIT_CARD}>
      <div className="mb-7 flex flex-1 flex-col justify-center">
        <svg className="h-[200px] w-full" viewBox="0 0 304 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="climbGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="var(--color-coral)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-coral)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="opacity-0 animate-climb-area"
            d={area}
            fill="url(#climbGrad)"
          />
          <path
            className="animate-climb-line [stroke-dasharray:360] [stroke-dashoffset:360] [filter:drop-shadow(0_0_6px_rgba(255,106,61,0.45))]"
            d={line}
            fill="none"
            stroke="var(--color-coral)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="var(--color-coral)"
              className="opacity-0 animate-climb-dot"
              style={{ animationDelay: `${0.4 + i * 0.32}s` }}
            />
          ))}
          <text
            className="opacity-0 animate-climb-final"
            x="280" y="28"
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize="13"
            fill="var(--color-acid)"
            fontWeight="600"
          >
            +1.8
          </text>
        </svg>
      </div>
      <h3 className="mb-2.5 text-[26px] font-semibold tracking-[-0.02em] text-bone">Iterate until it clicks.</h3>
      <p className="text-[14.5px] leading-[1.55] text-bone-soft">
        Re-submit as many times as you want. Watch the rubric scores climb. Mistakes you make here are ones you won&apos;t make on stage.
      </p>
    </div>
  );
}

function FreeCard() {
  return (
    <div className={BENEFIT_CARD}>
      <div className="mb-7 flex flex-1 flex-col justify-center">
        <div className="flex items-center gap-6">
          <div className="flex flex-1 flex-col gap-1">
            <span className="font-mono text-[56px] font-semibold leading-none tracking-[-0.03em] text-bone">$0</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bone-mute">PER MONTH</span>
          </div>
          <div className="w-px self-stretch bg-night-line" />
          <div className="flex flex-1 flex-col gap-1">
            <span className="font-mono text-[56px] font-semibold leading-none tracking-[-0.03em] text-bone">10</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-bone-mute">CORE PROBLEMS</span>
          </div>
        </div>
      </div>
      <h3 className="mb-2.5 text-[26px] font-semibold tracking-[-0.02em] text-bone">Free, while it&apos;s in beta.</h3>
      <p className="text-[14.5px] leading-[1.55] text-bone-soft">
        Backed by Groq&apos;s free tier under the hood. No card, no trial timer — just sign up and start drilling.
      </p>
    </div>
  );
}

function Benefits() {
  return (
    <section id="sk-benefits" className={`${DOT_NIGHT_BG} py-[120px]`}>
      <div className="mx-auto max-w-[1240px] px-7">
        <div className="mb-16 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bone-mute">
            <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-coral align-middle" />
            WHY SKETCHD
          </span>
          <h2 className="mx-0 my-[14px] mb-[18px] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.02] tracking-[-0.025em] text-bone">
            The drilling reps your prep is missing.
          </h2>
          <p className="mx-auto max-w-[60ch] text-[18px] text-bone-soft">
            Reading system-design articles teaches you patterns. Practicing them under feedback is what makes them stick.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
          <ScoreCard />
          <ClimbCard />
          <FreeCard />
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative bg-paper px-7 pt-[140px] pb-[120px] text-center">
      <div className="mx-auto max-w-[1240px]">
        <h2 className="mx-0 mb-7 text-[clamp(48px,7vw,96px)] font-semibold leading-[0.95] tracking-[-0.035em]">
          Stop reading.<br />
          <span className="font-script font-medium italic text-coral">Start sketching.</span>
        </h2>
        <p className="mx-auto mb-10 max-w-[50ch] text-[19px] text-ink-soft">
          Your next interview won&apos;t reward you for memorizing patterns. It&apos;ll reward you for making the right call under pressure. Build that reflex here.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryBtn>Start drilling — free</PrimaryBtn>
          <OutlineBtn>Browse problems</OutlineBtn>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-night-line bg-night px-7 pt-[50px] pb-9 text-bone-mute">
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight text-bone">
            <BrandMark invert />
            <span>sketchd</span>
          </div>
          <div className="flex flex-wrap gap-14">
            <div>
              <h5 className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone">Product</h5>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#sk-problems">Problems</a>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#sk-pipeline">How it works</a>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#sk-benefits">Why sketchd</a>
            </div>
            <div>
              <h5 className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone">Learn</h5>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#">Guides</a>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#">Sample evaluations</a>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#">Changelog</a>
            </div>
            <div>
              <h5 className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bone">Project</h5>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#">GitHub</a>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#">Roadmap</a>
              <a className="mb-2 block text-[13px] text-bone-mute hover:text-bone" href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-night-line pt-6 font-mono text-[11px] text-bone-mute">
          <span>© {new Date().getFullYear()} sketchd</span>
          <span>built with FastAPI · Next.js · Groq</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <>
      <Nav />
      <Hero />
      <Pipeline />
      <ProblemsSection />
      <Benefits />
      <FinalCTA />
      <Footer />
    </>
  );
}
