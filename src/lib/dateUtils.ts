export function toAppDate(value: unknown, fallback?: unknown): Date {
  const source: any = value ?? fallback;
  if (source?.toDate instanceof Function) return source.toDate();
  if (typeof source?.seconds === "number") return new Date(source.seconds * 1000);
  if (source instanceof Date) return source;
  const parsed = new Date(source as any);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
