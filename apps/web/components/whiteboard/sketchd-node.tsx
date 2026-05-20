"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

import { COMPONENTS_BY_KIND, type ComponentKind } from "./types";

// React Flow requires node data to be index-signature-compatible.
export type SketchdNodeData = {
  kind: ComponentKind;
  label: string;
} & Record<string, unknown>;

// ─── Shape registry ──────────────────────────────────────────────────────────
type ShapeKind =
  | "rect"      // plain rounded rectangle
  | "rect-dash" // rectangle with a dashed stroke (external boundaries)
  | "pill"      // long fully-rounded — caches / pools
  | "stack"     // queue (stacked papers)
  | "diamond"   // routing / load balancing
  | "hexagon"   // gateways
  | "cylinder"  // databases / object storage
  | "cloud";    // CDN

interface ShapeDef {
  shape: ShapeKind;
  /** [width, height] in CSS pixels — also the SVG viewBox. */
  size: [number, number];
}

const SHAPE_PER_KIND: Record<ComponentKind, ShapeDef> = {
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
};

// Tone-driven colors used by the SVG shapes.
const TONE_COLORS: Record<string, { stroke: string; fill: string }> = {
  coral: { stroke: "var(--color-coral)",     fill: "rgba(255, 106, 61, 0.13)" },
  amber: { stroke: "var(--color-amber)",     fill: "rgba(243, 185, 65, 0.18)" },
  blue:  { stroke: "var(--color-blue)",      fill: "rgba(59, 130, 246, 0.10)" },
  acid:  { stroke: "#5a7d10",                fill: "rgba(181, 242, 58, 0.18)" },
  ink:   { stroke: "var(--color-ink-muted)", fill: "#ffffff"                  },
};

// ─── Node ────────────────────────────────────────────────────────────────────
export function SketchdNode({ data, selected }: NodeProps) {
  const d = data as unknown as SketchdNodeData;
  const def = COMPONENTS_BY_KIND[d.kind];
  const shape = SHAPE_PER_KIND[d.kind];
  const colors = TONE_COLORS[def.tone];
  const [w, h] = shape.size;

  return (
    <div
      className={
        "relative " +
        (selected
          ? "drop-shadow-[0_0_0_2px_var(--color-coral)] drop-shadow-[0_4px_8px_rgba(255,106,61,0.25)]"
          : "")
      }
      style={{ width: w, height: h }}
    >
      {/* Shape (SVG behind text) */}
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <Shape kind={shape.shape} w={w} h={h} stroke={colors.stroke} fill={colors.fill} />
      </svg>

      {/* Text overlay */}
      <div className="pointer-events-none relative grid h-full place-items-center px-3 text-center leading-tight">
        <div>
          <div
            className="mb-0.5 font-mono text-[8.5px] uppercase tracking-[0.1em]"
            style={{ color: colors.stroke }}
          >
            {def.label}
          </div>
          <div className="text-[12.5px] font-medium text-ink">{d.label}</div>
        </div>
      </div>

      {/* Handles: all four sides, all `source`. Loose connection mode on the
          canvas lets any handle connect to any other handle. */}
      <SideHandle position={Position.Top}    id="top" />
      <SideHandle position={Position.Right}  id="right" />
      <SideHandle position={Position.Bottom} id="bottom" />
      <SideHandle position={Position.Left}   id="left" />
    </div>
  );
}

function SideHandle({ position, id }: { position: Position; id: string }) {
  return (
    <Handle
      type="source"
      position={position}
      id={id}
      className="!h-2.5 !w-2.5 !border-[1.5px] !border-ink !bg-paper hover:!bg-coral"
    />
  );
}

// ─── Shape SVGs ──────────────────────────────────────────────────────────────
function Shape({
  kind, w, h, stroke, fill,
}: {
  kind: ShapeKind;
  w: number;
  h: number;
  stroke: string;
  fill: string;
}) {
  const sw = 2; // stroke width

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
      // Pointy left/right, flat top/bottom. Caps at 15% of width.
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
          {/* Body fill (rectangle behind ellipses) */}
          <rect x={sw / 2} y={capH} width={w - sw} height={h - capH * 2} fill={fill} />
          {/* Side strokes */}
          <line x1={sw / 2} y1={capH} x2={sw / 2} y2={h - capH} stroke={stroke} strokeWidth={sw} />
          <line x1={w - sw / 2} y1={capH} x2={w - sw / 2} y2={h - capH} stroke={stroke} strokeWidth={sw} />
          {/* Bottom curve */}
          <path
            d={`M ${sw / 2},${h - capH} a ${w / 2 - sw / 2},${capH} 0 0 0 ${w - sw},0`}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
          {/* Top ellipse (full — shows front edge) */}
          <ellipse
            cx={w / 2} cy={capH}
            rx={w / 2 - sw / 2} ry={capH - sw / 2}
            fill={fill} stroke={stroke} strokeWidth={sw}
          />
        </g>
      );
    }

    case "stack": {
      // Three offset rounded rectangles, smallest on top.
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
      // 4 bumps along the top + flatter bottom. Coords designed for a 160×78
      // box but scaled by the SVG viewBox.
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
  }
}
