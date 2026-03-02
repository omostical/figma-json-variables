import type { VariableType } from "../shared/types.ts";

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const ALIAS_RE = /^\{[^}]+\}$/;

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
