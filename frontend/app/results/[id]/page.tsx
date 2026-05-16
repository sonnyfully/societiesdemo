"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, getDashboardData } from "../../../lib/api";
import { formatDate, formatInteger, formatMetric } from "../../../lib/format";
import { SAVED_RUN_OPTIONS, savedRunOrCanonical } from "../../../lib/runs";
import type { DashboardData } from "../../../lib/types";
import { EmbeddingMap } from "../../../components/EmbeddingMap";
import { MetricTrend } from "../../../components/MetricTrend";
import { MetricsPanel } from "../../../components/MetricsPanel";
import { NetworkGraph } from "../../../components/NetworkGraph";

export default function ResultsPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboardData(runId)
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
  }, [runId]);

  if (loading) {
    return <ResultsSkeleton />;
  }

  if (error || !data) {
    const title = error instanceof ApiError && error.code === "run_not_found" ? "Run not found" : "Analysis unavailable";
    const text = error instanceof Error ? error.message : "The backend did not return readable analysis data.";
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-8 md:px-8">
        <StatusMessage title={title} text={text} />
      </main>
    );
  }

  const finalMetrics = data.analysis.final_metrics;

  return (
    <main className="page-shell">
      <header className="grid gap-6 border-b-[0.5px] border-line pb-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <Link href="/" className="text-sm text-slate hover:text-ink focus-visible:outline-ink">
            Homophily Simulation
          </Link>
          <p className="eyebrow mt-8">Saved experiment</p>
          <h1 className="mt-3 text-4xl font-medium leading-tight tracking-normal text-ink md:text-6xl">Run analysis</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate">{data.run.topic}</p>
          <RunSwitchForm selectedRunId={runId} />
        </div>
        <dl className="grid grid-cols-2 overflow-hidden rounded-md border-[0.5px] border-line bg-white text-sm">
          <SummaryItem label="Status" value={data.run.status} />
          <SummaryItem label="Agents" value={formatInteger(data.run.personas.length)} hasLeftBorder />
          <SummaryItem label="Rounds" value={formatInteger(data.run.rounds.length)} isBottom />
          <SummaryItem label="Completed" value={formatDate(data.run.completed_at)} hasLeftBorder isBottom />
        </dl>
      </header>

      {data.run.status === "failed" ? (
        <StatusMessage title="Simulation failed" text="This run stopped before completion. The dashboard is rendering the saved partial state." />
      ) : null}

      <MetricsPanel metrics={finalMetrics} title="Final cumulative metrics" />

      <section className="panel grid gap-0 overflow-hidden lg:grid-cols-[0.78fr_1.22fr]">
        <div className="border-b-[0.5px] border-line p-5 lg:border-b-0 lg:border-r-[0.5px]">
          <p className="eyebrow">Interpretation</p>
          <h2 className="mt-3 text-2xl font-medium leading-snug text-ink">The signal is present, but quieter than Chirper.</h2>
          <p className="mt-4 text-sm leading-6 text-slate">
            The Claude run clears the bootstrap null on modularity while producing weaker community alignment than He et al. reported. For synthetic-audience products, that still matters: repeated interaction can concentrate attention even when the starting population is deliberately balanced.
          </p>
        </div>
        <div className="grid divide-y-[0.5px] divide-line sm:grid-cols-3 sm:divide-x-[0.5px] sm:divide-y-0">
          <EvidenceStat label="Null interval" value={finalMetrics ? `${formatMetric(finalMetrics.modularity_ci_low)}-${formatMetric(finalMetrics.modularity_ci_high)}` : "Pending"} />
          <EvidenceStat label="Communities" value={finalMetrics ? formatInteger(finalMetrics.n_communities) : "Pending"} />
          <EvidenceStat label="Classification" value="Replicates" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <SectionHeading title="Engagement network" text="Edges represent likes or follows accumulated through the selected round." />
          <NetworkGraph nodes={data.graph.nodes} edges={data.graph.edges} />
        </div>
        <div>
          <SectionHeading title="Embedding map" text="Agent post histories projected from MiniLM embeddings with UMAP." />
          <EmbeddingMap
            embeddings={data.analysis.embeddings}
            personas={data.run.personas}
            communities={data.analysis.communities}
            available={data.analysis.embeddings_available}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricTrend points={data.analysis.per_round_metrics} metric="modularity" label="Modularity" />
        <MetricTrend points={data.analysis.per_round_metrics} metric="assortativity" label="Assortativity" />
        <MetricTrend points={data.analysis.per_round_metrics} metric="content_engagement_correlation" label="Content correlation" />
      </section>

      <section className="panel p-5">
        <h2 className="text-base font-medium text-ink">Reference comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead className="border-b-[0.5px] border-line text-slate">
              <tr>
                <th className="py-3 pr-4 font-medium">Metric</th>
                <th className="py-3 pr-4 font-medium">He et al. final English subset</th>
                <th className="py-3 pr-4 font-medium">This saved run</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-line">
              <ComparisonRow label="Modularity" reference="0.38" value={finalMetrics ? formatMetric(finalMetrics.modularity) : "Pending"} />
              <ComparisonRow label="Assortativity" reference="0.61" value={finalMetrics ? formatMetric(finalMetrics.assortativity) : "Pending"} />
              <ComparisonRow
                label="Content correlation"
                reference="Directionally negative distance relation"
                value={finalMetrics ? formatMetric(finalMetrics.content_engagement_correlation) : "Pending"}
              />
            </tbody>
          </table>
        </div>
      </section>

      <div>
        <Link
          href={`/simulation?runId=${encodeURIComponent(runId)}`}
          className="button-primary"
        >
          Inspect simulation playback
        </Link>
      </div>
    </main>
  );
}

function SummaryItem({
  hasLeftBorder = false,
  isBottom = false,
  label,
  value
}: {
  hasLeftBorder?: boolean;
  isBottom?: boolean;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className={`${isBottom ? "" : "border-b-[0.5px]"} ${hasLeftBorder ? "border-l-[0.5px]" : ""} border-line p-4`}>
      <dt className="text-xs uppercase tracking-[0.12em] text-slate">{label}</dt>
      <dd className="mt-2 text-base font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function EvidenceStat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex min-h-36 flex-col justify-between p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-slate">{label}</p>
      <p className="mt-6 text-lg font-medium leading-tight tabular-nums text-ink">{value}</p>
    </div>
  );
}

function SectionHeading({ title, text }: { title: string; text: string }): JSX.Element {
  return (
    <div className="mb-3">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate">{text}</p>
    </div>
  );
}

function RunSwitchForm({ selectedRunId }: { selectedRunId: string }): JSX.Element {
  return (
    <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
      <select
        aria-label="Saved run"
        name="runId"
        defaultValue={savedRunOrCanonical(selectedRunId)}
        className="field min-h-10 flex-1"
        onChange={(event) => {
          window.location.href = `/results/${encodeURIComponent(event.currentTarget.value)}`;
        }}
      >
        {SAVED_RUN_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <Link
        href={`/simulation?runId=${encodeURIComponent(savedRunOrCanonical(selectedRunId))}`}
        className="button-secondary min-h-10"
      >
        Replay
      </Link>
    </div>
  );
}

function ComparisonRow({ label, reference, value }: { label: string; reference: string; value: string }): JSX.Element {
  return (
    <tr>
      <th className="py-3 pr-4 font-medium text-ink">{label}</th>
      <td className="py-3 pr-4 text-slate">{reference}</td>
      <td className="py-3 pr-4 text-ink">{value}</td>
    </tr>
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

function ResultsSkeleton(): JSX.Element {
  return (
    <main className="page-shell">
      <div className="h-36 animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
      <div className="h-52 animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
        <div className="h-96 animate-pulse rounded-md border-[0.5px] border-line bg-mist" />
      </section>
    </main>
  );
}
