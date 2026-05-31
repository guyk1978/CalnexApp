export type PdfExportPayload = {
  calculatorName: string;
  inputs: Record<string, string>;
  results: Record<string, string>;
};

/** Turn snake_case / camelCase keys into readable labels. */
export function humanizeKey(key: string): string {
  const cleaned = key
    .replace(/^(loan|mortgage|car|interest|retirement|rvb|dp|lc)_/i, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!cleaned) return key;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function stringifyExportValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

/** Build export records from a plain object without hardcoding field names. */
export function objectToExportRecords(
  obj: Record<string, unknown>,
  options?: {
    labelFormatter?: (key: string) => string;
    valueFormatter?: (key: string, value: unknown) => string;
    skipEmpty?: boolean;
  }
): Record<string, string> {
  const labelFormatter = options?.labelFormatter ?? humanizeKey;
  const valueFormatter = options?.valueFormatter ?? ((_k, v) => stringifyExportValue(v));
  const skipEmpty = options?.skipEmpty !== false;
  const out: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const formatted = valueFormatter(key, value);
    if (skipEmpty && !formatted) continue;
    out[labelFormatter(key)] = formatted;
  }
  return out;
}

export function mergeExportRecords(
  ...parts: Array<Record<string, string> | undefined>
): Record<string, string> {
  return Object.assign({}, ...parts.filter(Boolean));
}
