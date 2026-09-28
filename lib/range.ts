export type Range = { from: Date; to: Date; label: string };

export const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveRange(params: { range?: string; from?: string; to?: string }): Range {
  const now = new Date();
  const today = startOfDay(now);

  switch (params.range) {
    case "yesterday": {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { from: d, to: endOfDay(d), label: "Yesterday" };
    }
    case "week": {
      const d = new Date(today);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return { from: d, to: endOfDay(now), label: "This Week" };
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d, to: endOfDay(now), label: "This Month" };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to: endOfDay(to), label: "Last Month" };
    }
    case "custom": {
      const from = params.from ? startOfDay(new Date(params.from)) : today;
      const to = params.to ? endOfDay(new Date(params.to)) : endOfDay(now);
      return { from, to: to < from ? endOfDay(from) : to, label: "Custom Range" };
    }
    default:
      return { from: today, to: endOfDay(now), label: "Today" };
  }
}

export function rangeQuery(range: Range) {
  return { gte: range.from, lte: range.to };
}
