import type { NormalizedValue, RGBAColor, AliasRef } from "../shared/types.ts";

/** Tolerance for float comparisons — allows for 8-bit hex rounding (~1/255). */
const FLOAT_TOLERANCE = 1 / 512;

/**
 * Produces a stable string key for a (type, value) pair.
 * Colors are rounded to the nearest 1/255 step to absorb hex conversion drift.
 * Returns null for unsupported combinations.
 */
export function makeValueKey(type: string, value: NormalizedValue | null): string | null {
  if (value === null) return null;

  if (type === "COLOR" && typeof value === "object" && "r" in value) {
    const c = value as RGBAColor;
    return `COLOR:${round8(c.r)},${round8(c.g)},${round8(c.b)},${round8(c.a)}`;
  }

  if (type === "FLOAT" && typeof value === "number") {
    return `FLOAT:${Math.round(value * 1000) / 1000}`;
  }

  if (type === "BOOLEAN" && typeof value === "boolean") {
    return `BOOLEAN:${value}`;
  }

  if (type === "ALIAS" && typeof value === "object" && "kind" in value) {
    return `ALIAS:${(value as AliasRef).path}`;
  }

  return null;
}

/**
 * Deep equality for two NormalizedValues with float tolerance for colors.
 */
export function valuesEqual(
  a: NormalizedValue | null,
  b: NormalizedValue | null
): boolean {
  if (a === null || b === null) return a === b;

  // Both RGBA colors
  if (isColor(a) && isColor(b)) {
    const ca = a as RGBAColor;
    const cb = b as RGBAColor;
    return (
      Math.abs(ca.r - cb.r) < FLOAT_TOLERANCE &&
      Math.abs(ca.g - cb.g) < FLOAT_TOLERANCE &&
      Math.abs(ca.b - cb.b) < FLOAT_TOLERANCE &&
      Math.abs(ca.a - cb.a) < FLOAT_TOLERANCE
    );
  }

  // Both aliases
  if (isAlias(a) && isAlias(b)) {
    return (a as AliasRef).path === (b as AliasRef).path;
  }

  // Floats with tolerance
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < FLOAT_TOLERANCE;
  }

  // Booleans / other primitives
  return a === b;
}

function isColor(v: NormalizedValue): boolean {
  return typeof v === "object" && v !== null && "r" in v;
}

function isAlias(v: NormalizedValue): boolean {
  return typeof v === "object" && v !== null && "kind" in v;
}

/** Round a 0–1 component to the nearest 1/255 step. */
function round8(v: number): number {
  return Math.round(v * 255) / 255;
}
