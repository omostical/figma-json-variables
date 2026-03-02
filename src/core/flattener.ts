import type { Token } from "../shared/types.ts";
import { detectType } from "./detector.ts";
import { normalizeValue } from "./normalizer.ts";

interface FlattenOptions {
  separator?: string;
}

export function flattenTokens(
  data: unknown,
  options: FlattenOptions = {}
): Token[] {
  const { separator = "/" } = options;
  const tokens: Token[] = [];
  traverse(data, [], separator, tokens);
  return tokens;
}

function traverse(
  node: unknown,
  pathParts: string[],
  separator: string,
  tokens: Token[]
): void {
  if (node === null || node === undefined) return;

  if (typeof node !== "object") {
    addToken(node, pathParts, separator, tokens);
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      traverse(item, [...pathParts, String(i)], separator, tokens);
    });
    return;
  }

  const obj = node as Record<string, unknown>;

  if ("value" in obj) {
    addToken(obj["value"], pathParts, separator, tokens);
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    traverse(val, [...pathParts, key], separator, tokens);
  }
}

function addToken(
  rawValue: unknown,
  pathParts: string[],
  separator: string,
  tokens: Token[]
): void {
  if (pathParts.length === 0) return;

  const path = pathParts.join(separator);
  const type = detectType(rawValue);
  const normalizedValue = normalizeValue(rawValue, type);

  tokens.push({
    path,
    rawValue,
    type,
    normalizedValue,
    status: type === "SKIP" ? "skip" : "new",
    errorReason: type === "SKIP" ? "String tokens are not imported" : undefined,
  });
}
