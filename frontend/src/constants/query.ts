/** React Query staleTime constants (ms) */
export const STALE_TIME = {
  /** Fast-changing data: quest list, timeline blocks (30s) */
  FAST: 30_000,
  /** Normal data: character, emotions, summaries (60s) */
  NORMAL: 60_000,
} as const;
