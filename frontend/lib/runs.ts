export interface SavedRunOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const SAVED_RUN_OPTIONS: readonly SavedRunOption[] = [
  {
    id: "full-100x12",
    label: "Canonical run: 100 agents, 12 rounds",
    description: "Main result, completed May 16, 2026"
  },
  {
    id: "full-stage8",
    label: "Historical run: 50 agents, 8 rounds",
    description: "Initial full run, kept for comparison"
  }
] as const;

export function canonicalRunId(): string {
  return SAVED_RUN_OPTIONS[0].id;
}

export function savedRunOrCanonical(runId: string | null): string {
  if (runId && SAVED_RUN_OPTIONS.some((option) => option.id === runId)) {
    return runId;
  }
  return canonicalRunId();
}
