// A product's `barcode` field can hold more than one code — e.g. the same
// item received from different suppliers with different printed barcodes —
// stored as a single comma-separated string rather than a second table.
// These two helpers are the one place that convention is defined; every
// screen that creates/edits or matches against a product's barcode(s)
// should go through them instead of re-splitting the string itself.

/** Splits a raw `barcode` field into its individual codes, trimmed and with empties dropped. */
export function parseBarcodes(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(b => b.trim()).filter(Boolean);
}

/** Re-joins a list of codes back into the stored field format, deduped and in order of first appearance. */
export function formatBarcodes(codes: string[]): string {
  const seen = new Set<string>();
  const unique = codes.filter(c => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  return unique.join(", ");
}

/** True if `query` exactly matches any one of the codes in a product's (possibly multi-value) barcode field. Case-insensitive. */
export function matchesBarcode(raw: string | undefined | null, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return parseBarcodes(raw).some(code => code.toLowerCase() === q);
}
