import { formatMetric } from "../lib/format";
import type { RoundMetricPoint } from "../lib/types";

interface MetricTrendProps {
  points: RoundMetricPoint[];
  metric: "modularity" | "assortativity" | "content_engagement_correlation";
  label: string;
}

export function MetricTrend({ points, metric, label }: MetricTrendProps): JSX.Element {
  const values = points.map((point) => point.metrics[metric]);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const width = 320;
  const height = 84;
  const coordinates = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 14) - 7;
    return `${x},${y}`;
  });

  return (
    <div className="rounded border-[0.5px] border-line bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">{label}</h3>
        <span className="text-sm text-slate">
          {values.length ? formatMetric(values[values.length - 1]) : "0.00"}
        </span>
      </div>
      <svg
        className="mt-4 h-24 w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} over simulation rounds`}
      >
        <line x1="0" x2={width} y1={height - 7} y2={height - 7} stroke="#d8d8d2" />
        {coordinates.length > 1 ? (
          <polyline
            points={coordinates.join(" ")}
            fill="none"
            stroke="#141414"
            strokeLinecap="round"
            strokeWidth="2"
          />
        ) : null}
        {coordinates.map((coordinate, index) => {
          const [x, y] = coordinate.split(",").map(Number);
          return <circle key={`${coordinate}-${index}`} cx={x} cy={y} r="3" fill="#9f2d55" />;
        })}
      </svg>
    </div>
  );
}
