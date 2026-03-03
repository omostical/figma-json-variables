import { describe, it, expect } from "vitest";
import { flattenTokens, flattenNestedModeTokens } from "../src/core/flattener.ts";

describe("flattenTokens", () => {
  it("flattens a flat primitive object", () => {
    const tokens = flattenTokens({ radius: 8 });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].path).toBe("radius");
    expect(tokens[0].rawValue).toBe(8);
    expect(tokens[0].type).toBe("FLOAT");
  });

  it("extracts value from token objects", () => {
    const tokens = flattenTokens({ radius: { value: 8 } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].path).toBe("radius");
    expect(tokens[0].rawValue).toBe(8);
    expect(tokens[0].type).toBe("FLOAT");
  });

  it("ignores sibling fields like oklch when value is present", () => {
    const tokens = flattenTokens({
      "600": {
        value: "#C83072",
        oklch: "oklch(50.0% 0.200 350)",
      },
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].path).toBe("600");
    expect(tokens[0].rawValue).toBe("#C83072");
    expect(tokens[0].type).toBe("COLOR");
  });

  it("flattens a nested color scale", () => {
    const tokens = flattenTokens({
      colors: {
        brand: {
          "500": { value: "#E03F84" },
          "600": { value: "#C83072" },
        },
      },
    });
    expect(tokens).toHaveLength(2);
    expect(tokens[0].path).toBe("colors/brand/500");
    expect(tokens[1].path).toBe("colors/brand/600");
  });

  it("uses custom separator", () => {
    const tokens = flattenTokens({ colors: { primary: "#fff" } }, { separator: "." });
    expect(tokens[0].path).toBe("colors.primary");
  });

  it("marks SKIP tokens with skip status", () => {
    const tokens = flattenTokens({ label: { value: "some text" } });
    expect(tokens[0].type).toBe("SKIP");
    expect(tokens[0].status).toBe("skip");
  });

  it("handles alias values", () => {
    const tokens = flattenTokens({ primary: { value: "{colors.brand.600}" } });
    expect(tokens[0].type).toBe("ALIAS");
    expect(tokens[0].normalizedValue).toEqual({ kind: "alias", path: "colors/brand/600" });
  });

  it("handles boolean values", () => {
    const tokens = flattenTokens({ enabled: { value: true } });
    expect(tokens[0].type).toBe("BOOLEAN");
    expect(tokens[0].normalizedValue).toBe(true);
  });

  it("handles deeply nested objects without value key", () => {
    const tokens = flattenTokens({
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
      },
    });
    expect(tokens).toHaveLength(3);
    expect(tokens.map((t) => t.path)).toEqual(["spacing/xs", "spacing/sm", "spacing/md"]);
  });

  it("returns empty array for empty object", () => {
    const tokens = flattenTokens({});
    expect(tokens).toHaveLength(0);
  });

  it("handles null and undefined gracefully", () => {
    expect(() => flattenTokens(null)).not.toThrow();
    expect(() => flattenTokens(undefined)).not.toThrow();
  });
});

describe("flattenNestedModeTokens", () => {
  it("extracts nested light and dark values into per-mode token maps", () => {
    const result = flattenNestedModeTokens({
      color: {
        bg: {
          page: {
            usage: "Root canvas",
            light: "neutral-100",
            dark: "neutral-900",
          },
        },
      },
    });

    expect(result.hasModeTokens).toBe(true);
    expect(result.detectedModes).toEqual(["light", "dark"]);
    expect(result.modeTokenMap.light[0]).toMatchObject({
      path: "color/bg/page",
      type: "ALIAS",
      normalizedValue: { kind: "alias", path: "color/neutral/100" },
    });
    expect(result.modeTokenMap.dark[0]).toMatchObject({
      path: "color/bg/page",
      type: "ALIAS",
      normalizedValue: { kind: "alias", path: "color/neutral/900" },
    });
  });

  it("handles mixed alias, color, and transparent mode values", () => {
    const result = flattenNestedModeTokens({
      color: {
        action: {
          secondary: {
            bg: {
              light: "transparent",
              dark: "#ffffff",
            },
          },
        },
      },
    });

    expect(result.modeTokenMap.light[0]).toMatchObject({
      path: "color/action/secondary/bg",
      type: "COLOR",
      normalizedValue: { r: 0, g: 0, b: 0, a: 0 },
    });
    expect(result.modeTokenMap.dark[0]).toMatchObject({
      path: "color/action/secondary/bg",
      type: "COLOR",
    });
  });

  it("ignores metadata objects that happen to contain light and dark keys", () => {
    const result = flattenNestedModeTokens({
      color: {
        text: {
          primary: {
            apca: { light: "~100", dark: "~100" },
            light: "neutral-1000",
            dark: "neutral-100",
          },
        },
      },
    });

    expect(result.modeTokenMap.light).toHaveLength(1);
    expect(result.modeTokenMap.light[0].path).toBe("color/text/primary");
    expect(result.modeTokenMap.light[0].type).toBe("ALIAS");
  });
});
