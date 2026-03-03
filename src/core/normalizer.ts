import type { VariableType, NormalizedValue, RGBAColor, AliasRef } from "../shared/types.ts";

export function normalizeValue(
  rawValue: unknown,
  type: VariableType
): NormalizedValue | null {
  switch (type) {
    case "COLOR":
      return normalizeColor(rawValue as string);
    case "FLOAT":
      return typeof rawValue === "number" ? rawValue : null;
    case "BOOLEAN":
      return typeof rawValue === "boolean" ? rawValue : null;
    case "ALIAS":
      return normalizeAlias(rawValue as string);
    default:
      return null;
  }
}

export function normalizeSemanticValue(
  rawValue: unknown,
  type: VariableType
): NormalizedValue | null {
  if (type === "COLOR" && typeof rawValue === "string" && rawValue.trim().toLowerCase() === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (type === "ALIAS" && typeof rawValue === "string") {
    return normalizeSemanticAlias(rawValue);
  }

  return normalizeValue(rawValue, type);
}

function normalizeAlias(raw: string): AliasRef | null {
  const match = raw.match(/^\{([^}]+)\}$/);
  if (!match) return null;
  const path = match[1].replace(/\./g, "/");
  return { kind: "alias", path };
}

function normalizeSemanticAlias(raw: string): AliasRef | null {
  const directAlias = normalizeAlias(raw);
  if (directAlias) return directAlias;

  const trimmed = raw.trim();
  const alphaMatch = trimmed.match(/^([a-z0-9]+)-alpha-(\d+)$/i);
  if (alphaMatch) {
    return { kind: "alias", path: `alpha/${alphaMatch[1].toLowerCase()}/${alphaMatch[2]}` };
  }

  const scaleMatch = trimmed.match(/^([a-z0-9]+)-(\d+)$/i);
  if (scaleMatch) {
    return { kind: "alias", path: `color/${scaleMatch[1].toLowerCase()}/${scaleMatch[2]}` };
  }

  return null;
}

function normalizeColor(raw: string): RGBAColor | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("#")) return parseHex(trimmed);
  if (/^rgba?\(/i.test(trimmed)) return parseRgb(trimmed);
  if (/^hsla?\(/i.test(trimmed)) return parseHsl(trimmed);
  return null;
}

function parseHex(hex: string): RGBAColor | null {
  const cleaned = hex.replace("#", "");
  let r: number, g: number, b: number, a = 1;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 4) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
    a = parseInt(cleaned[3] + cleaned[3], 16) / 255;
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
  } else if (cleaned.length === 8) {
    r = parseInt(cleaned.slice(0, 2), 16);
    g = parseInt(cleaned.slice(2, 4), 16);
    b = parseInt(cleaned.slice(4, 6), 16);
    a = parseInt(cleaned.slice(6, 8), 16) / 255;
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r: r / 255, g: g / 255, b: b / 255, a };
}

function parseRgb(raw: string): RGBAColor | null {
  const comma = raw.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i
  );
  if (comma) {
    const r = parseInt(comma[1], 10);
    const g = parseInt(comma[2], 10);
    const b = parseInt(comma[3], 10);
    const a = comma[4] !== undefined ? parseFloat(comma[4]) : 1;
    return { r: r / 255, g: g / 255, b: b / 255, a };
  }

  const space = raw.match(
    /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+%?))?\s*\)/i
  );
  if (space) {
    const r = parseInt(space[1], 10);
    const g = parseInt(space[2], 10);
    const b = parseInt(space[3], 10);
    let a = 1;
    if (space[4]) {
      a = space[4].endsWith("%")
        ? parseFloat(space[4]) / 100
        : parseFloat(space[4]);
    }
    return { r: r / 255, g: g / 255, b: b / 255, a };
  }

  return null;
}

function parseHsl(raw: string): RGBAColor | null {
  const match = raw.match(
    /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)/i
  );
  if (!match) return null;

  const h = parseFloat(match[1]) / 360;
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  const { r, g, b } = hslToRgb(h, s, l);
  return { r, g, b, a };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) return { r: l, g: l, b: l };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hueToRgb(p, q, h + 1 / 3),
    g: hueToRgb(p, q, h),
    b: hueToRgb(p, q, h - 1 / 3),
  };
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
