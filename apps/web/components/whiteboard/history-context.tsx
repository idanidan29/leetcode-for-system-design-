"use client";

import { createContext, useContext } from "react";

/**
 * Lets child components (custom nodes, custom edges) snapshot the canvas
 * state into the undo stack before they mutate it. The CanvasInner provides
 * the implementation; callers get a stable no-op when used outside.
 */
export const HistoryContext = createContext<{ push: () => void }>({
  push: () => {},
});

export const useHistory = () => useContext(HistoryContext);
