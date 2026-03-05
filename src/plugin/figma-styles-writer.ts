import type { Token, RGBAColor, StyleImportResult } from "../shared/types.ts";
import { groupTextStyleTokens } from "../core/text-style-grouper.ts";

export function writeColorStylesToFigma(tokens: Token[]): StyleImportResult {
  const result: StyleImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const existing = figma.getLocalPaintStyles();
  const byName = new Map<string, PaintStyle>(existing.map((s) => [s.name, s]));

  for (const token of tokens) {
    if (token.type !== "COLOR" || token.normalizedValue === null) {
      result.skipped++;
      continue;
    }

    const { r, g, b, a } = token.normalizedValue as RGBAColor;
    const paint: SolidPaint = {
      type: "SOLID",
      color: { r, g, b },
      opacity: a ?? 1,
    };

    try {
      const existing = byName.get(token.path);
      if (existing) {
        existing.paints = [paint];
        result.updated++;
      } else {
        const style = figma.createPaintStyle();
        style.name = token.path;
        style.paints = [paint];
        byName.set(token.path, style);
        result.created++;
      }
    } catch (err) {
      result.errors.push({ name: token.path, reason: String(err) });
    }
  }

  return result;
}

export async function writeTextStylesToFigma(tokens: Token[]): Promise<StyleImportResult> {
  const result: StyleImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const specs = groupTextStyleTokens(tokens);
  if (specs.length === 0) {
    result.skipped = tokens.filter((t) => t.type !== "SKIP").length;
    return result;
  }

  const existing = figma.getLocalTextStyles();
  const byName = new Map<string, TextStyle>(existing.map((s) => [s.name, s]));

  for (const spec of specs) {
    try {
      const fontName: FontName = { family: spec.fontFamily, style: spec.fontStyle };
      await figma.loadFontAsync(fontName);

      const existingStyle = byName.get(spec.name);
      const isNew = !existingStyle;
      const style = isNew ? figma.createTextStyle() : existingStyle!;

      if (isNew) {
        style.name = spec.name;
        byName.set(spec.name, style);
      }

      style.fontSize = spec.fontSize;
      style.fontName = fontName;

      style.lineHeight = spec.lineHeight !== null
        ? { unit: "PIXELS", value: spec.lineHeight }
        : { unit: "AUTO" };

      // letterSpacing stored as em; Figma PERCENT unit: 1% = 0.01em, so em * 100 = %
      style.letterSpacing = { unit: "PERCENT", value: spec.letterSpacing * 100 };

      if (isNew) result.created++;
      else result.updated++;
    } catch (err) {
      result.errors.push({ name: spec.name, reason: String(err) });
    }
  }

  return result;
}
