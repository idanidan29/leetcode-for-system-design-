"use client";

import { useEffect, useState } from "react";

import { OutlineBtn, PrimaryBtn } from "./buttons";

// ─── Shared SVG style objects (only used by the sketches in this file) ────────
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

const DRAW_ANIM_BASE =
  "animate-draw [stroke-dasharray:var(--len,800)] [stroke-dashoffset:var(--len,800)]";

// ─── Sketch helpers ───────────────────────────────────────────────────────────
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

// ─── Sketch primitives ────────────────────────────────────────────────────────
interface SketchBoxProps {
  x: number; y: number; w: number; h: number;
  label: string;
  fill?: FillAttrs;
  delay?: number;
}

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

// ─── Hero ─────────────────────────────────────────────────────────────────────
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

export function Hero() {
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
