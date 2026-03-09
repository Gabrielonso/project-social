export function normalizeHashtags(input?: string[]): string[] | undefined {
  if (!input) return undefined;

  const normalized = input
    .map((t) => t?.trim())
    .filter((t) => !!t)
    .map((t) => (t.startsWith('#') ? t.slice(1) : t))
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);

  // de-duplicate while preserving order
  const seen = new Set<string>();
  const unique = normalized.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  return unique.length ? unique : undefined;
}

