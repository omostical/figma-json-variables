import { describe, it, expect } from "vitest";
import { normalizeValue, normalizeSemanticValue } from "../src/core/normalizer.ts";

describe("normalizeValue — COLOR", () => {
  it("converts 6-digit hex to RGBA", () => {
    const result = normalizeValue("#C83072", "COLOR");
    expect(result).toEqual({ r: expect.closeTo(0.784, 2), g: expect.closeTo(0.188, 2), b: expect.closeTo(0.447, 2), a: 1 });
  });

  it("converts 3-digit hex to RGBA", () => {
    const result = normalizeValue("#fff", "COLOR");
    expect(result).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it("converts 8-digit hex with alpha to RGBA", () => {
    const result = normalizeValue("#00000080", "COLOR");
    expect(result).not.toBeNull();
    if (result && typeof result === "object" && "a" in result) {
      expect((result as { a: number }).a).toBeCloseTo(0.502, 2);
    }
  });

  it("converts rgb() to RGBA", () => {
    const result = normalizeValue("rgb(255, 0, 0)", "COLOR");
    expect(result).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("converts rgba() to RGBA", () => {
    const result = normalizeValue("rgba(255, 0, 0, 0.5)", "COLOR");
    expect(result).toEqual({ r: 1, g: 0, b: 0, a: 0.5 });
  });

  it("converts hsl() to RGBA", () => {
    const result = normalizeValue("hsl(0, 100%, 50%)", "COLOR");
    expect(result).not.toBeNull();
    if (result && typeof result === "object" && "r" in result) {
      expect((result as { r: number }).r).toBeCloseTo(1, 2);
      expect((result as { g: number }).g).toBeCloseTo(0, 2);
    }
  });

  it("returns null for invalid color string", () => {
    const result = normalizeValue("not-a-color", "COLOR");
    expect(result).toBeNull();
  });
});

describe("normalizeValue — FLOAT", () => {
  it("passes through a number", () => {
    expect(normalizeValue(8, "FLOAT")).toBe(8);
  });

  it("passes through a decimal", () => {
    expect(normalizeValue(1.5, "FLOAT")).toBe(1.5);
  });

  it("passes through zero", () => {
    expect(normalizeValue(0, "FLOAT")).toBe(0);
  });

  it("returns null for non-number input", () => {
    expect(normalizeValue("8", "FLOAT")).toBe(8);
  });

  it("parses numeric strings with units", () => {
    expect(normalizeValue("3.5rem", "FLOAT")).toBe(3.5);
    expect(normalizeValue("60px", "FLOAT")).toBe(60);
    expect(normalizeValue("+0.01em", "FLOAT")).toBe(0.01);
  });
});

describe("normalizeValue — BOOLEAN", () => {
  it("passes through true", () => {
    expect(normalizeValue(true, "BOOLEAN")).toBe(true);
  });

  it("passes through false", () => {
    expect(normalizeValue(false, "BOOLEAN")).toBe(false);
  });

  it("returns null for non-boolean input", () => {
    expect(normalizeValue(1, "BOOLEAN")).toBeNull();
  });
});

describe("normalizeValue — ALIAS", () => {
  it("converts dot-notation alias to slash path", () => {
    const result = normalizeValue("{colors.brand.600}", "ALIAS");
    expect(result).toEqual({ kind: "alias", path: "colors/brand/600" });
  });

  it("handles single-key alias", () => {
    const result = normalizeValue("{primary}", "ALIAS");
    expect(result).toEqual({ kind: "alias", path: "primary" });
  });

  it("returns null for malformed alias", () => {
    const result = normalizeValue("notanalias", "ALIAS");
    expect(result).toBeNull();
  });
});

describe("normalizeValue — STRING", () => {
  it("passes through strings", () => {
    expect(normalizeValue("Geist Sans, system-ui, sans-serif", "STRING")).toBe(
      "Geist Sans, system-ui, sans-serif"
    );
  });
});

describe("normalizeValue — SKIP", () => {
  it("returns null for SKIP type", () => {
    expect(normalizeValue("some string", "SKIP")).toBeNull();
  });
});

describe("normalizeSemanticValue", () => {
  it("converts shorthand scale references to primitive aliases", () => {
    expect(normalizeSemanticValue("blue-600", "ALIAS")).toEqual({
      kind: "alias",
      path: "color/blue/600",
    });
  });

  it("converts shorthand alpha references to primitive aliases", () => {
    expect(normalizeSemanticValue("black-alpha-6", "ALIAS")).toEqual({
      kind: "alias",
      path: "alpha/black/6",
    });
  });

  it("converts transparent to a fully transparent color", () => {
    expect(normalizeSemanticValue("transparent", "COLOR")).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });
});
