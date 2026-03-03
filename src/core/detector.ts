import type { VariableType } from "../shared/types.ts";

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const ALIAS_RE = /^\{[^}]+\}$/;
const SCALE_ALIAS_RE = /^[a-z0-9]+-\d+$/i;
const ALPHA_ALIAS_RE = /^[a-z0-9]+-alpha-\d+$/i;

export function detectType(value: unknown): VariableType {
  if (value === null || value === undefined) return "SKIP";

  if (typeof value === "boolean") return "BOOLEAN";
  if (typeof value === "number") return "FLOAT";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (ALIAS_RE.test(trimmed)) return "ALIAS";

    if (HEX_RE.test(trimmed)) return "COLOR";
    if (/^rgb\(/i.test(trimmed)) return "COLOR";
    if (/^rgba\(/i.test(trimmed)) return "COLOR";
    if (/^hsl\(/i.test(trimmed)) return "COLOR";
    if (/^hsla\(/i.test(trimmed)) return "COLOR";

    return "SKIP";
  }

  return "SKIP";
}

export function detectSemanticType(value: unknown): VariableType {
  const baseType = detectType(value);
  if (baseType !== "SKIP") return baseType;

  if (typeof value !== "string") return "SKIP";

  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "transparent") return "COLOR";
  if (SCALE_ALIAS_RE.test(trimmed) || ALPHA_ALIAS_RE.test(trimmed)) return "ALIAS";

  return "SKIP";
}
