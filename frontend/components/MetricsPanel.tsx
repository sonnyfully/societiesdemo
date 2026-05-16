import { formatInteger, formatMetric, formatPValue } from "../lib/format";
import type { RoundMetrics } from "../lib/types";

interface MetricsPanelProps {
  metrics: RoundMetrics | null;
  title?: string;
}

export function MetricsPanel({ metrics, title = "Metrics" }: MetricsPanelProps): JSX.Element {
  if (!metrics) {
    return (
      <section className="rounded border-[0.5px] border-line bg-white p-5">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded bg-mist" />
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
    <section className="rounded border-[0.5px] border-line bg-white p-5">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded border-[0.5px] border-line bg-white p-4">
            <dt className="text-xs uppercase tracking-normal text-slate">{label}</dt>
            <dd className="mt-2 text-2xl font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
