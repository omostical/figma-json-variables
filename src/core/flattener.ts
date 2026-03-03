import type { Token } from "../shared/types.ts";
import { detectType, detectSemanticType } from "./detector.ts";
import { normalizeValue, normalizeSemanticValue } from "./normalizer.ts";
import { isKnownModeKey } from "./mode-detector.ts";

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

export interface NestedModeFlattenResult {
  hasModeTokens: boolean;
  detectedModes: string[];
  modeTokenMap: Record<string, Token[]>;
}

export function flattenNestedModeTokens(
  data: unknown,
  options: FlattenOptions = {}
): NestedModeFlattenResult {
  const { separator = "/" } = options;
  const modeTokenMap: Record<string, Token[]> = {};
  const detectedModes = new Set<string>();

  traverseNestedModes(data, [], separator, modeTokenMap, detectedModes);

  return {
    hasModeTokens: detectedModes.size > 0,
    detectedModes: [...detectedModes],
    modeTokenMap,
  };
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

function traverseNestedModes(
  node: unknown,
  pathParts: string[],
  separator: string,
  modeTokenMap: Record<string, Token[]>,
  detectedModes: Set<string>
): void {
  if (node === null || node === undefined) return;

  if (typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      traverseNestedModes(item, [...pathParts, String(i)], separator, modeTokenMap, detectedModes);
    });
    return;
  }

  const obj = node as Record<string, unknown>;
  if ("value" in obj) return;

  const modeEntries = Object.entries(obj).filter(([key]) => isKnownModeKey(key));

  if (pathParts.length > 0 && modeEntries.length > 0) {
    for (const [modeKey, rawValue] of modeEntries) {
      detectedModes.add(modeKey);
      modeTokenMap[modeKey] ??= [];
      const token = createToken(rawValue, pathParts, separator, true);
      if (token) modeTokenMap[modeKey].push(token);
    }
    return;
  }

  for (const [key, val] of Object.entries(obj)) {
    traverseNestedModes(val, [...pathParts, key], separator, modeTokenMap, detectedModes);
  }
}

function addToken(
  rawValue: unknown,
  pathParts: string[],
  separator: string,
  tokens: Token[]
): void {
  const token = createToken(rawValue, pathParts, separator);
  if (token) tokens.push(token);
}

function createToken(
  rawValue: unknown,
  pathParts: string[],
  separator: string,
  semanticModeValue = false
): Token | null {
  if (pathParts.length === 0) return null;

  const path = pathParts.join(separator);
  const type = semanticModeValue ? detectSemanticType(rawValue) : detectType(rawValue);
  const normalizedValue = semanticModeValue
    ? normalizeSemanticValue(rawValue, type)
    : normalizeValue(rawValue, type);

  return {
    path,
    rawValue,
    type,
    normalizedValue,
    status: type === "SKIP" ? "skip" : "new",
    errorReason: type === "SKIP" ? "String tokens are not imported" : undefined,
  };
}
