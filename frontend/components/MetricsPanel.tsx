import { formatInteger, formatMetric, formatPValue } from "../lib/format";
import type { RoundMetrics } from "../lib/types";

interface MetricsPanelProps {
  metrics: RoundMetrics | null;
  subtitle?: string;
  title?: string;
}

export function MetricsPanel({ metrics, subtitle = "Cumulative through selected round", title = "Metrics" }: MetricsPanelProps): JSX.Element {
  if (!metrics) {
    return (
      <section className="panel p-5">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-md bg-mist" />
          ))}
        </div>
      </section>
    );
  }

  const items = [
    ["Modularity", formatMetric(metrics.modularity)],
    ["Null interval", `${formatMetric(metrics.modularity_ci_low)} to ${formatMetric(metrics.modularity_ci_high)}`],
    ["p-value", formatPValue(metrics.modularity_p)],
    ["Assortativity", formatMetric(metrics.assortativity)],
    ["Content correlation", formatMetric(metrics.content_engagement_correlation)],
    ["Communities", formatInteger(metrics.n_communities)]
  ];

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="text-xs text-slate">{subtitle}</p>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(([label, value], index) => (
          <div
            key={label}
            className={`rounded-md border-[0.5px] p-4 ${
              index === 0 ? "border-ink bg-ink text-white sm:col-span-2 xl:col-span-1" : "border-line bg-white text-ink"
            }`}
          >
            <dt className={`text-xs uppercase tracking-[0.12em] ${index === 0 ? "text-white/70" : "text-slate"}`}>{label}</dt>
            <dd className={`mt-2 font-medium tabular-nums ${index === 0 ? "text-3xl text-white" : "text-2xl text-ink"}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
