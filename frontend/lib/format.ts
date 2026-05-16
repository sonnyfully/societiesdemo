const integerFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0
});

const metricFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percentageFormatter = new Intl.NumberFormat("en", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatMetric(value: number): string {
  return metricFormatter.format(value);
}

export function formatPValue(value: number): string {
  if (value < 0.001) {
    return "< 0.001";
  }
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${percentageFormatter.format(value * 100)}%`;
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "Pending";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
