import { describe, it, expect } from "vitest";
import { detectType, detectSemanticType } from "../src/core/detector.ts";

describe("detectType", () => {
  it("detects 6-digit hex color", () => {
    expect(detectType("#C83072")).toBe("COLOR");
  });

  it("detects 3-digit hex color", () => {
    expect(detectType("#fff")).toBe("COLOR");
  });

  it("detects 8-digit hex color with alpha", () => {
    expect(detectType("#C83072FF")).toBe("COLOR");
  });

  it("detects rgb() color", () => {
    expect(detectType("rgb(200, 48, 114)")).toBe("COLOR");
  });

  it("detects rgba() color", () => {
    expect(detectType("rgba(200, 48, 114, 0.5)")).toBe("COLOR");
  });

  it("detects hsl() color", () => {
    expect(detectType("hsl(330, 62%, 48%)")).toBe("COLOR");
  });

  it("detects hsla() color", () => {
    expect(detectType("hsla(330, 62%, 48%, 0.8)")).toBe("COLOR");
  });

  it("detects integer as FLOAT", () => {
    expect(detectType(8)).toBe("FLOAT");
  });

  it("detects decimal as FLOAT", () => {
    expect(detectType(1.5)).toBe("FLOAT");
  });

  it("detects zero as FLOAT", () => {
    expect(detectType(0)).toBe("FLOAT");
  });

  it("detects boolean true as BOOLEAN", () => {
    expect(detectType(true)).toBe("BOOLEAN");
  });

  it("detects boolean false as BOOLEAN", () => {
    expect(detectType(false)).toBe("BOOLEAN");
  });

  it("detects alias reference as ALIAS", () => {
    expect(detectType("{colors.brand.600}")).toBe("ALIAS");
  });

  it("detects alias with nested path as ALIAS", () => {
    expect(detectType("{semantic.color.primary}")).toBe("ALIAS");
  });

  it("detects plain strings as STRING", () => {
    expect(detectType("some label")).toBe("STRING");
  });

  it("detects unit-bearing numeric strings as FLOAT", () => {
    expect(detectType("3.5rem")).toBe("FLOAT");
    expect(detectType("60px")).toBe("FLOAT");
    expect(detectType("+0.01em")).toBe("FLOAT");
  });

  it("skips oklch values", () => {
    expect(detectType("oklch(50.0% 0.200 350)")).toBe("SKIP");
  });

  it("skips null", () => {
    expect(detectType(null)).toBe("SKIP");
  });

  it("skips undefined", () => {
    expect(detectType(undefined)).toBe("SKIP");
  });

  it("skips objects", () => {
    expect(detectType({ r: 1, g: 0, b: 0 })).toBe("SKIP");
  });
});

describe("detectSemanticType", () => {
  it("keeps numeric values as FLOAT in semantic mode detection", () => {
    expect(detectSemanticType(500)).toBe("FLOAT");
  });

  it("detects shorthand color references as aliases", () => {
    expect(detectSemanticType("blue-600")).toBe("ALIAS");
  });

  it("detects shorthand alpha references as aliases", () => {
    expect(detectSemanticType("black-alpha-6")).toBe("ALIAS");
  });

  it("detects transparent as a color", () => {
    expect(detectSemanticType("transparent")).toBe("COLOR");
  });
});
