import type { Token } from "../shared/types.ts";

export interface TextStyleSpec {
  name: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: number | null;
  letterSpacing: number;
}

const FONT_FAMILY_KEYS = new Set(["fontFamily", "family", "font-family"]);
const FONT_STYLE_KEYS = new Set(["fontStyle", "style", "font-style"]);
const FONT_SIZE_KEYS = new Set(["fontSize", "size", "font-size"]);
const FONT_WEIGHT_KEYS = new Set(["fontWeight", "weight", "font-weight"]);
const LINE_HEIGHT_KEYS = new Set(["lineHeight", "line-height", "lineheight", "lh"]);
const LETTER_SPACING_KEYS = new Set(["letterSpacing", "letter-spacing", "tracking", "ls"]);

const ALL_FONT_PROP_KEYS = new Set([
  ...FONT_FAMILY_KEYS, ...FONT_STYLE_KEYS, ...FONT_SIZE_KEYS,
  ...FONT_WEIGHT_KEYS, ...LINE_HEIGHT_KEYS, ...LETTER_SPACING_KEYS,
]);

function weightToStyle(weight: number): string {
  const map: Record<number, string> = {
    100: "Thin", 200: "ExtraLight", 300: "Light",
    400: "Regular", 500: "Medium", 600: "SemiBold",
    700: "Bold", 800: "ExtraBold", 900: "Black",
  };
  return map[weight] ?? "Regular";
}

export function groupTextStyleTokens(tokens: Token[]): TextStyleSpec[] {
  const groups = new Map<string, Map<string, Token>>();

  for (const token of tokens) {
    if (token.type === "SKIP" || token.normalizedValue === null) continue;
    const parts = token.path.split("/");
    if (parts.length < 2) continue;

    const leafKey = parts[parts.length - 1];
    if (!ALL_FONT_PROP_KEYS.has(leafKey)) continue;

    const parentPath = parts.slice(0, -1).join("/");
    if (!groups.has(parentPath)) groups.set(parentPath, new Map());
    groups.get(parentPath)!.set(leafKey, token);
  }

  const specs: TextStyleSpec[] = [];

  for (const [name, props] of groups) {
    const fontSizeToken = [...props.entries()].find(([k]) => FONT_SIZE_KEYS.has(k))?.[1];
    if (!fontSizeToken) continue;

    const fontSize = Number(fontSizeToken.normalizedValue);
    if (!Number.isFinite(fontSize) || fontSize <= 0) continue;

    const familyToken = [...props.entries()].find(([k]) => FONT_FAMILY_KEYS.has(k))?.[1];
    const styleToken = [...props.entries()].find(([k]) => FONT_STYLE_KEYS.has(k))?.[1];
    const weightToken = [...props.entries()].find(([k]) => FONT_WEIGHT_KEYS.has(k))?.[1];
    const lhToken = [...props.entries()].find(([k]) => LINE_HEIGHT_KEYS.has(k))?.[1];
    const lsToken = [...props.entries()].find(([k]) => LETTER_SPACING_KEYS.has(k))?.[1];

    const rawFamily = familyToken ? String(familyToken.normalizedValue) : "Inter";
    const fontFamily = rawFamily.split(",")[0].trim().replace(/["']/g, "");

    const fontStyle = styleToken
      ? String(styleToken.normalizedValue)
      : weightToken
        ? weightToStyle(Number(weightToken.normalizedValue))
        : "Regular";

    const lhRaw = lhToken ? Number(lhToken.normalizedValue) : null;
    const lineHeight = lhRaw !== null && Number.isFinite(lhRaw) ? lhRaw : null;

    const lsRaw = lsToken ? Number(lsToken.normalizedValue) : 0;
    const letterSpacing = Number.isFinite(lsRaw) ? lsRaw : 0;

    specs.push({ name, fontFamily, fontStyle, fontSize, lineHeight, letterSpacing });
  }

  return specs;
}
