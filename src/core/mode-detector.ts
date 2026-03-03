export interface ModeDetectionResult {
  isMultiMode: boolean;
  detectedModes: string[];
}

const MODE_KEYWORDS = new Set([
  "light", "dark", "default", "base",
  "mobile", "tablet", "desktop", "screen",
  "compact", "comfortable", "expanded", "cozy",
  "small", "medium", "large",
  "en", "fr", "de", "es", "ja", "zh", "ar",
  "rtl", "ltr",
]);

export function detectModes(data: unknown): ModeDetectionResult {
  const none: ModeDetectionResult = { isMultiMode: false, detectedModes: [] };

  if (!data || typeof data !== "object" || Array.isArray(data)) return none;

  const obj = data as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.length < 2 || keys.length > 8) return none;

  // All top-level values must be non-null objects (not arrays, not primitives)
  const allObjects = keys.every((k) => {
    const v = obj[k];
    return v !== null && typeof v === "object" && !Array.isArray(v);
  });
  if (!allObjects) return none;

  // None of the top-level objects should have a "value" key directly
  // (that would mean it's already a token node, not a mode container)
  const noneHaveValue = keys.every((k) => !("value" in (obj[k] as object)));
  if (!noneHaveValue) return none;

  // Keys must not look like scale steps (100, 200…) or hex colors
  const noScaleOrHex = keys.every((k) => !/^#/.test(k) && !/^\d+$/.test(k));
  if (!noScaleOrHex) return none;

  // At least one key must be a known mode keyword
  const hasKnownMode = keys.some((k) => MODE_KEYWORDS.has(k.toLowerCase()));
  if (!hasKnownMode) return none;

  return { isMultiMode: true, detectedModes: keys };
}
