"use client";

import type { ComponentKind } from "./types";

// ─── Shape registry ──────────────────────────────────────────────────────────
export type ShapeKind =
  | "rect"
  | "rect-dash"
  | "pill"
  | "stack"
  | "diamond"
  | "hexagon"
  | "cylinder"
  | "cloud"
  | "barrel"         // cylinder w/ horizontal stripes — indexed storage
  | "chevron"        // right-pointing pentagon — realtime push
  | "circle"         // worker / async compute
  | "parallelogram"  // slanted rect — flowing data
  | "note";          // UML note — rectangle with folded corner

export interface ShapeDef {
  shape: ShapeKind;
  size: [number, number];
}

export const SHAPE_PER_KIND: Record<ComponentKind, ShapeDef> = {
  "api-gateway":    { shape: "hexagon",   size: [160, 76] },
  "load-balancer":  { shape: "diamond",   size: [150, 96] },
  "web-server":     { shape: "rect",      size: [140, 68] },
  "cache":          { shape: "pill",      size: [150, 56] },
  "sql-db":         { shape: "cylinder",  size: [120, 90] },
  "nosql-db":       { shape: "cylinder",  size: [120, 90] },
  "queue":          { shape: "stack",     size: [150, 70] },
  "object-storage": { shape: "cylinder",  size: [120, 90] },
  "cdn":            { shape: "cloud",     size: [160, 78] },
  "microservice":   { shape: "rect",      size: [140, 68] },
  "external-api":   { shape: "rect-dash", size: [140, 68] },
  "custom":         { shape: "rect",      size: [150, 72] },
  "search-index":     { shape: "barrel",        size: [130, 86] },
  "websocket-gateway":{ shape: "chevron",       size: [160, 70] },
  "worker":           { shape: "circle",        size: [90, 90] },
  "stream-processor": { shape: "parallelogram", size: [150, 68] },
  "analytics-db":     { shape: "cylinder",      size: [120, 90] },
  // UML kinds: solid rectangles for concrete things, dashed for abstractions.
  // Note has its own folded-corner shape; abstract gets a slight size bump so
  // it reads as a "base" class.
  "uml-class":        { shape: "rect",          size: [150, 80] },
  "uml-interface":    { shape: "rect-dash",     size: [150, 80] },
  "uml-abstract":     { shape: "rect-dash",     size: [160, 84] },
  "uml-enum":         { shape: "rect",          size: [140, 78] },
  "uml-note":         { shape: "note",          size: [150, 80] },
};

export const TONE_COLORS: Record<string, { stroke: string; fill: string }> = {
  coral:  { stroke: "var(--color-coral)",     fill: "rgba(255, 106, 61, 0.13)" },
  amber:  { stroke: "var(--color-amber)",     fill: "rgba(243, 185, 65, 0.18)" },
  blue:   { stroke: "var(--color-blue)",      fill: "rgba(59, 130, 246, 0.10)"  },
  acid:   { stroke: "#5a7d10",                fill: "rgba(181, 242, 58, 0.18)" },
  ink:    { stroke: "var(--color-ink-muted)", fill: "#ffffff"                  },
  violet: { stroke: "#7c3aed",                fill: "rgba(124, 58, 237, 0.12)" },
};

// ─── Shape SVGs ──────────────────────────────────────────────────────────────
export function Shape({
  kind, w, h, stroke, fill, sw = 2,
}: {
  kind: ShapeKind;
  w: number;
  h: number;
  stroke: string;
  fill: string;
  sw?: number;
}) {
  switch (kind) {
    case "rect":
      return (
        <rect
          x={sw / 2} y={sw / 2}
          width={w - sw} height={h - sw}
          rx={10}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      );

    case "rect-dash":
      return (
        <rect
          x={sw / 2} y={sw / 2}
          width={w - sw} height={h - sw}
          rx={10}
          fill={fill} stroke={stroke} strokeWidth={sw}
          strokeDasharray="6 4"
        />
      );

    case "pill":
      return (
        <rect
          x={sw / 2} y={sw / 2}
          width={w - sw} height={h - sw}
          rx={h / 2}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      );

    case "diamond": {
      const pts = [
        `${w / 2},${sw}`,
        `${w - sw},${h / 2}`,
        `${w / 2},${h - sw}`,
        `${sw},${h / 2}`,
      ].join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    }

    case "hexagon": {
      const cap = w * 0.13;
      const pts = [
        `${cap},${sw}`,
        `${w - cap},${sw}`,
        `${w - sw},${h / 2}`,
        `${w - cap},${h - sw}`,
        `${cap},${h - sw}`,
        `${sw},${h / 2}`,
      ].join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    }

    case "cylinder": {
      const capH = h * 0.18;
      return (
        <g>
          <rect x={sw / 2} y={capH} width={w - sw} height={h - capH * 2} fill={fill} />
          <line x1={sw / 2} y1={capH} x2={sw / 2} y2={h - capH} stroke={stroke} strokeWidth={sw} />
          <line x1={w - sw / 2} y1={capH} x2={w - sw / 2} y2={h - capH} stroke={stroke} strokeWidth={sw} />
          <path
            d={`M ${sw / 2},${h - capH} a ${w / 2 - sw / 2},${capH} 0 0 0 ${w - sw},0`}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
          <ellipse
            cx={w / 2} cy={capH}
            rx={w / 2 - sw / 2} ry={capH - sw / 2}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
        </g>
      );
    }

    case "stack": {
      const pad = 6;
      return (
        <g>
          <rect
            x={pad * 2} y={pad * 2}
            width={w - pad * 2 - sw} height={h - pad * 2 - sw}
            rx={6}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
          <rect
            x={pad} y={pad}
            width={w - pad * 2 - sw} height={h - pad * 2 - sw}
            rx={6}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
          <rect
            x={sw / 2} y={sw / 2}
            width={w - pad * 2 - sw} height={h - pad * 2 - sw}
            rx={6}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
        </g>
      );
    }

    case "cloud": {
      const path =
        `M ${w * 0.18},${h * 0.85} ` +
        `C ${w * 0.02},${h * 0.85} ${w * 0.02},${h * 0.55} ${w * 0.14},${h * 0.50} ` +
        `C ${w * 0.10},${h * 0.20} ${w * 0.35},${h * 0.10} ${w * 0.42},${h * 0.30} ` +
        `C ${w * 0.50},${h * 0.05} ${w * 0.78},${h * 0.10} ${w * 0.72},${h * 0.35} ` +
        `C ${w * 0.95},${h * 0.25} ${w * 1.02},${h * 0.60} ${w * 0.85},${h * 0.55} ` +
        `C ${w * 0.98},${h * 0.78} ${w * 0.85},${h * 0.95} ${w * 0.70},${h * 0.85} ` +
        `Z`;
      return <path d={path} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    }

    case "barrel": {
      // Cylinder with horizontal stripes — reads as an indexed/sharded store.
      const capH = h * 0.16;
      const r = w / 2 - sw / 2;
      const stripeYs = [h * 0.35, h * 0.55, h * 0.75];
      return (
        <g>
          <rect x={sw / 2} y={capH} width={w - sw} height={h - capH * 2} fill={fill} />
          <line x1={sw / 2} y1={capH} x2={sw / 2} y2={h - capH} stroke={stroke} strokeWidth={sw} />
          <line x1={w - sw / 2} y1={capH} x2={w - sw / 2} y2={h - capH} stroke={stroke} strokeWidth={sw} />
          <path
            d={`M ${sw / 2},${h - capH} a ${r},${capH} 0 0 0 ${w - sw},0`}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
          {stripeYs.map((y, i) => (
            <line
              key={i}
              x1={sw / 2 + 4} y1={y} x2={w - sw / 2 - 4} y2={y}
              stroke={stroke} strokeWidth={1} opacity={0.45}
            />
          ))}
          <ellipse
            cx={w / 2} cy={capH}
            rx={r} ry={capH - sw / 2}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
        </g>
      );
    }

    case "chevron": {
      // Right-pointing pentagon — suggests directional / streaming push.
      const point = w * 0.16;
      const pts = [
        `${sw},${sw}`,
        `${w - point},${sw}`,
        `${w - sw},${h / 2}`,
        `${w - point},${h - sw}`,
        `${sw},${h - sw}`,
      ].join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    }

    case "circle": {
      // Pure compute unit — workers, async jobs.
      const r = Math.min(w, h) / 2 - sw / 2;
      return (
        <circle
          cx={w / 2} cy={h / 2}
          r={r}
          fill={fill} stroke={stroke} strokeWidth={sw}
        />
      );
    }

    case "parallelogram": {
      // Slanted rectangle — classic "data in motion" flowchart symbol.
      const slant = h * 0.35;
      const pts = [
        `${slant},${sw}`,
        `${w - sw},${sw}`,
        `${w - slant},${h - sw}`,
        `${sw},${h - sw}`,
      ].join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
    }

    case "note": {
      // UML note — rectangle with the top-right corner folded over. The fold
      // is drawn as a second polygon over the corner so it reads in any tone.
      const fold = Math.min(w, h) * 0.22;
      const body = [
        `${sw},${sw}`,
        `${w - fold},${sw}`,
        `${w - sw},${fold}`,
        `${w - sw},${h - sw}`,
        `${sw},${h - sw}`,
      ].join(" ");
      const triangle = [
        `${w - fold},${sw}`,
        `${w - sw},${fold}`,
        `${w - fold},${fold}`,
      ].join(" ");
      // Slightly darker tint on the fold so the corner reads as a turn-over.
      return (
        <g>
          <polygon points={body} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <polygon points={triangle} fill={stroke} fillOpacity="0.18" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </g>
      );
    }
  }
}
