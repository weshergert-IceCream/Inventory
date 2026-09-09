export function money(value: number | string | { toString(): string } | null | undefined) {
  const n = value == null ? 0 : Number(value.toString());
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
}

export function qty(value: number | string | { toString(): string } | null | undefined, max = 2) {
  const n = value == null ? 0 : Number(value.toString());
  return new Intl.NumberFormat("en-CA", { maximumFractionDigits: max }).format(n);
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
