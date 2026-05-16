import type {
  AnalysisResponse,
  DashboardData,
  FeedItem,
  GraphResponse,
  Run
} from "./types";

const DEFAULT_API_BASE_URL = "https://societiesdemo-production.up.railway.app";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

export function getDefaultRunId(): string | null {
  const value = process.env.NEXT_PUBLIC_DEFAULT_RUN_ID;
  return value && value.trim() ? value.trim() : null;
}

export async function getRun(runId: string): Promise<Run> {
  return fetchJson<Run>(`/runs/${encodeURIComponent(runId)}`);
}

export async function getFeed(runId: string, round: number): Promise<FeedItem[]> {
  return fetchJson<FeedItem[]>(
    `/runs/${encodeURIComponent(runId)}/feed?round=${encodeURIComponent(round)}`
  );
}

export async function getGraph(runId: string, round: number): Promise<GraphResponse> {
  return fetchJson<GraphResponse>(
    `/runs/${encodeURIComponent(runId)}/graph?round=${encodeURIComponent(round)}`
  );
}

export async function getAnalysis(runId: string): Promise<AnalysisResponse> {
  return fetchJson<AnalysisResponse>(`/runs/${encodeURIComponent(runId)}/analysis`);
}

export async function getDashboardData(
  runId: string,
  requestedRound?: number
): Promise<DashboardData> {
  const run = await getRun(runId);
  const latestRound = run.rounds.at(-1)?.round ?? 1;
  const round = Math.max(1, Math.min(requestedRound ?? latestRound, latestRound));
  const [feed, graph, analysis] = await Promise.all([
    getFeed(runId, round),
    getGraph(runId, round),
    getAnalysis(runId)
  ]);
  return { run, feed, graph, analysis, round };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }
  return (await response.json()) as T;
}

async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let code = "api_error";
  let message = `Request failed with status ${response.status}.`;

  try {
    const body = (await response.json()) as unknown;
    const detail = isRecord(body) ? body.detail : null;
    if (typeof detail === "string") {
      message = detail;
    } else if (isRecord(detail)) {
      if (typeof detail.code === "string") {
        code = detail.code;
      }
      if (typeof detail.message === "string") {
        message = detail.message;
      }
    }
  } catch {
    message = response.statusText || message;
  }

  return new ApiError(message, response.status, code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
