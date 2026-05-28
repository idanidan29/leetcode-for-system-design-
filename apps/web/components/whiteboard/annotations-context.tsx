"use client";

import { createContext, useContext, useMemo } from "react";

import type { EvaluationIssue } from "@/lib/api";

/**
 * Per-node evaluation annotations. The Canvas builds this from the current
 * `Evaluation` and provides it to all SketchdNode instances via context, so
 * nodes can render a severity badge without each one knowing about the
 * evaluation shape.
 */
export interface NodeAnnotations {
  issues: EvaluationIssue[];
}

export const AnnotationsContext = createContext<Map<string, NodeAnnotations>>(
  new Map(),
);

export const useNodeAnnotations = (nodeId: string): NodeAnnotations | undefined =>
  useContext(AnnotationsContext).get(nodeId);

/** Build the node-id → annotations map from an Evaluation. */
export function buildAnnotationMap(
  issues: EvaluationIssue[] | undefined,
): Map<string, NodeAnnotations> {
  const map = new Map<string, NodeAnnotations>();
  if (!issues) return map;
  for (const issue of issues) {
    for (const id of issue.node_ids ?? []) {
      const existing = map.get(id);
      if (existing) existing.issues.push(issue);
      else map.set(id, { issues: [issue] });
    }
  }
  return map;
}

/** Hook variant that memoizes the map for a given issues array. */
export function useAnnotationMap(issues: EvaluationIssue[] | undefined) {
  return useMemo(() => buildAnnotationMap(issues), [issues]);
}
