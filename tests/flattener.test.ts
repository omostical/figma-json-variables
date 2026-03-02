import { describe, it, expect } from "vitest";
import { flattenTokens } from "../src/core/flattener.ts";

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
