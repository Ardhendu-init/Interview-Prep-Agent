const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelativeTime(isoString: string): string {
  const diffSeconds = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);

  for (const [unit, secondsInUnit] of UNITS) {
    const value = Math.floor(diffSeconds / secondsInUnit);
    if (value >= 1) {
      return rtf.format(-value, unit);
    }
  }
  return "just now";
}
