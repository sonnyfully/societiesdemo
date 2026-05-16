"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, getDashboardData, getDefaultRunId } from "../../lib/api";
import { formatInteger } from "../../lib/format";
import { SAVED_RUN_OPTIONS, savedRunOrCanonical } from "../../lib/runs";
import type { DashboardData } from "../../lib/types";
import { MetricTrend } from "../../components/MetricTrend";
import { MetricsPanel } from "../../components/MetricsPanel";
import { NetworkGraph } from "../../components/NetworkGraph";
import { SimulationFeed } from "../../components/SimulationFeed";

export default function SimulationPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId") ?? getDefaultRunId();
  const requestedRound = parseRoundParam(searchParams.get("round"));
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(runId));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDelayMs, setPlaybackDelayMs] = useState(1600);

  const navigateToRound = useCallback(
    (round: number): void => {
      if (!runId) {
        return;
      }
      router.replace(`/simulation?runId=${encodeURIComponent(runId)}&round=${round}`, { scroll: false });
    },
    [router, runId]
  );

  useEffect(() => {
    if (!runId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboardData(runId, requestedRound)
      .then((nextData) => {
        if (!cancelled) {
          setData(nextData);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(nextError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runId, requestedRound]);

  useEffect(() => {
    if (!data || !isPlaying) {
      return;
    }

    const rounds = data.run.rounds.map((snapshot) => snapshot.round);
    const currentIndex = rounds.indexOf(data.round);
    const nextRound = rounds[currentIndex + 1];

    if (!nextRound) {
      setIsPlaying(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      navigateToRound(nextRound);
    }, playbackDelayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [data, isPlaying, navigateToRound, playbackDelayMs]);

  const currentMetrics = useMemo(() => {
    if (!data) {
      return null;
    }
    return data.run.rounds.find((snapshot) => snapshot.round === data.round)?.metrics ?? null;
  }, [data]);

  if (!runId) {
    return (
      <Shell>
        <EmptyRunState />
      </Shell>
    );
  }

  if (loading && !data) {
    return <SimulationSkeleton />;
  }

  if (error || !data) {
    return (
      <Shell>
        <ErrorState error={error} selectedRunId={runId} />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-4 border-b-[0.5px] border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="text-sm text-slate hover:text-ink focus-visible:outline-ink">
            Homophily Simulation
          </Link>
          <p className="eyebrow mt-8">Replay surface</p>
          <h1 className="mt-3 text-4xl font-medium leading-tight tracking-normal text-ink md:text-5xl">Simulation playback</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate">{data.run.topic}</p>
          <RunSwitchForm selectedRunId={runId} />
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-md border-[0.5px] border-line bg-white text-sm md:min-w-96">
          <RunFact label="Status" value={data.run.status} />
          <RunFact label="Agents" value={formatInteger(data.run.personas.length)} />
          <RunFact label="Rounds" value={formatInteger(data.run.rounds.length)} />
        </div>
      </header>

      {data.run.status === "failed" ? (
        <StatusMessage title="Simulation failed" text="This run stopped before completion. Partial data is shown so the failure can be inspected." />
      ) : null}

      <ReplayControls
        currentRound={data.round}
        isLoading={loading}
        isPlaying={isPlaying}
        onDelayChange={setPlaybackDelayMs}
        onPlayChange={setIsPlaying}
        onRoundChange={navigateToRound}
        playbackDelayMs={playbackDelayMs}
        rounds={data.run.rounds.map((snapshot) => snapshot.round)}
      />

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <SimulationFeed items={data.feed} title={`Round ${data.round} feed`} />
        <div className="grid content-start gap-5">
          <MetricsPanel metrics={currentMetrics} title={`Round ${data.round} cumulative metrics`} />
          <NetworkGraph nodes={data.graph.nodes} edges={data.graph.edges} compact />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricTrend points={data.analysis.per_round_metrics} metric="modularity" label="Modularity" />
        <MetricTrend points={data.analysis.per_round_metrics} metric="assortativity" label="Assortativity" />
        <MetricTrend points={data.analysis.per_round_metrics} metric="content_engagement_correlation" label="Content correlation" />
      </section>

      <div>
        <Link
          href={`/results/${runId}`}
          className="inline-flex min-h-11 items-center rounded border-[0.5px] border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:outline-ink"
        >
          Open final analysis
        </Link>
      </div>
    </Shell>
  );
}

function parseRoundParam(value: string | null): number | undefined {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Shell({ children }: { children: React.ReactNode }): JSX.Element {
  return <main className="page-shell">{children}</main>;
}

function RunFact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border-r-[0.5px] border-line p-4 last:border-r-0">
      <p className="text-xs uppercase tracking-[0.12em] text-slate">{label}</p>
      <p className="mt-2 font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}

function EmptyRunState(): JSX.Element {
  const defaultRunId = savedRunOrCanonical(getDefaultRunId());
  return (
    <section className="panel p-6">
      <h1 className="text-3xl font-medium text-ink">Open a saved simulation run</h1>
      <form action="/simulation" className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
        <select
          name="runId"
          defaultValue={defaultRunId}
          className="field flex-1"
        >
          {SAVED_RUN_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit" className="button-primary">
          View simulation
        </button>
      </form>
    </section>
  );
}

function RunSwitchForm({ selectedRunId }: { selectedRunId: string }): JSX.Element {
  return (
    <form action="/simulation" className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
      <select
        aria-label="Saved run"
        name="runId"
        defaultValue={savedRunOrCanonical(selectedRunId)}
        className="field min-h-10 flex-1"
      >
        {SAVED_RUN_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="button-secondary min-h-10"
      >
        Switch run
      </button>
    </form>
  );
}

function ReplayControls({
  currentRound,
  isLoading,
  isPlaying,
  onDelayChange,
  onPlayChange,
  onRoundChange,
  playbackDelayMs,
  rounds
}: {
  currentRound: number;
  isLoading: boolean;
  isPlaying: boolean;
  onDelayChange: (delayMs: number) => void;
  onPlayChange: (playing: boolean) => void;
  onRoundChange: (round: number) => void;
  playbackDelayMs: number;
  rounds: number[];
}): JSX.Element {
  const currentIndex = Math.max(0, rounds.indexOf(currentRound));
  const firstRound = rounds[0] ?? currentRound;
  const previousRound = rounds[currentIndex - 1];
  const nextRound = rounds[currentIndex + 1];
  const isFirstRound = !previousRound;
  const isFinalRound = !nextRound;
  const progressValue = rounds.length > 1 ? currentIndex : 0;

  return (
    <section className="panel p-4" aria-label="Replay controls">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">Replay</p>
          <p className="mt-1 text-lg font-medium text-ink">Round {currentRound}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRoundChange(previousRound ?? firstRound)}
            disabled={isFirstRound || isLoading}
            className="button-secondary min-h-10 px-3 disabled:cursor-not-allowed disabled:text-slate"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPlayChange(!isPlaying)}
            disabled={isFinalRound && !isPlaying}
            className="button-primary min-h-10 min-w-24 disabled:cursor-not-allowed disabled:border-line disabled:bg-mist disabled:text-slate"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => onRoundChange(nextRound ?? currentRound)}
            disabled={isFinalRound || isLoading}
            className="button-secondary min-h-10 px-3 disabled:cursor-not-allowed disabled:text-slate"
          >
            Next
          </button>
          <label className="flex min-h-10 items-center gap-2 rounded-md border-[0.5px] border-line bg-white px-3 text-sm text-slate">
            Speed
            <select
              value={playbackDelayMs}
              onChange={(event) => onDelayChange(Number(event.target.value))}
              className="bg-white text-ink focus-visible:outline-ink"
            >
              <option value={2400}>0.75x</option>
              <option value={1600}>1x</option>
              <option value={900}>1.5x</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          aria-label="Select replay round"
          type="range"
          min={0}
          max={Math.max(0, rounds.length - 1)}
          value={progressValue}
          onChange={(event) => onRoundChange(rounds[Number(event.target.value)] ?? currentRound)}
          className="w-full accent-ink focus-visible:outline-ink"
        />
        <nav className="flex flex-wrap items-center gap-2" aria-label="Saved rounds">
          {rounds.map((round) => (
            <button
              key={round}
              type="button"
              onClick={() => onRoundChange(round)}
              className={`min-h-9 rounded-full border-[0.5px] px-3 text-sm focus-visible:outline-ink ${
                round === currentRound ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"
              }`}
            >
              {round}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}

function ErrorState({ error, selectedRunId }: { error: unknown; selectedRunId: string }): JSX.Element {
  const title = error instanceof ApiError && error.code === "run_not_found" ? "Run not found" : "Simulation data unavailable";
  const text = error instanceof Error ? error.message : "The backend did not return a readable response.";
  return (
    <>
      <StatusMessage title={title} text={text} />
      <RunSwitchForm selectedRunId={selectedRunId} />
    </>
  );
}

function StatusMessage({ title, text }: { title: string; text: string }): JSX.Element {
  return (
    <section className="panel p-6">
      <h1 className="text-3xl font-medium text-ink">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate">{text}</p>
    </section>
  );
}

function SimulationSkeleton(): JSX.Element {
  return (
    <main className="page-shell">
      <div className="h-28 animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 w-24 animate-pulse rounded-md bg-mist" />
        ))}
      </div>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[36rem] animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
        <div className="h-[36rem] animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
      </section>
    </main>
  );
}
