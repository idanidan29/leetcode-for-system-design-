/**
 * Simple BFS-based layered auto-layout. No external dep.
 *
 * Algorithm:
 *  1. Compute each node's layer = longest path from a root (node with no
 *     incoming edges). Cycles fall back to insertion order.
 *  2. Place layer N at x = N * COL_W. Distribute nodes within a layer
 *     evenly along Y around the canvas vertical center.
 *
 * Output is suitable for direct use as React Flow node `position` fields.
 */

import type { SolutionEdge, SolutionNode } from "@/lib/api";

const COL_W = 220;
const ROW_H = 130;
const X0 = 80;
const Y0 = 80;

export interface LayoutedNode {
  id: string;
  position: { x: number; y: number };
}

export function autoLayout(
  nodes: SolutionNode[],
  edges: SolutionEdge[],
): Map<string, { x: number; y: number }> {
  // Build adjacency (forward) + incoming counts.
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, []);
    outgoing.set(n.id, []);
  }
  for (const e of edges) {
    if (!incoming.has(e.source) || !incoming.has(e.target)) continue;
    outgoing.get(e.source)!.push(e.target);
    incoming.get(e.target)!.push(e.source);
  }

  // Layer = longest path from any root. Computed via Kahn's algorithm + DP.
  const layer = new Map<string, number>();
  const indeg = new Map(nodes.map((n) => [n.id, incoming.get(n.id)!.length]));
  const queue: string[] = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);

  for (const id of queue) layer.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const u = queue[head++]!;
    const lu = layer.get(u) ?? 0;
    for (const v of outgoing.get(u) ?? []) {
      const lv = (layer.get(v) ?? -1);
      if (lu + 1 > lv) layer.set(v, lu + 1);
      const next = (indeg.get(v) ?? 1) - 1;
      indeg.set(v, next);
      if (next === 0) queue.push(v);
    }
  }

  // Any node without a layer participates in a cycle — drop it on the right.
  let maxLayer = 0;
  for (const l of layer.values()) maxLayer = Math.max(maxLayer, l);
  for (const n of nodes) {
    if (!layer.has(n.id)) layer.set(n.id, maxLayer + 1);
  }
  if (nodes.some((n) => (layer.get(n.id) ?? 0) > maxLayer)) maxLayer += 1;

  // Bucket nodes by layer, then place.
  const buckets: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const n of nodes) buckets[layer.get(n.id) ?? 0]!.push(n.id);

  // Total vertical span to center the layout.
  const tallest = Math.max(1, ...buckets.map((b) => b.length));
  const totalH = (tallest - 1) * ROW_H;

  const positions = new Map<string, { x: number; y: number }>();
  buckets.forEach((bucket, col) => {
    const colH = (bucket.length - 1) * ROW_H;
    const yStart = Y0 + (totalH - colH) / 2;
    bucket.forEach((id, row) => {
      positions.set(id, {
        x: X0 + col * COL_W,
        y: yStart + row * ROW_H,
      });
    });
  });

  return positions;
}
