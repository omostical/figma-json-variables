import { describe, it, expect } from "vitest";
import { detectModes } from "../src/core/mode-detector.ts";

describe("detectModes", () => {
  it("detects light/dark as multi-mode", () => {
    const data = {
      light: { colors: { primary: { value: "#fff" } } },
      dark: { colors: { primary: { value: "#000" } } },
    };
    const result = detectModes(data);
    expect(result.isMultiMode).toBe(true);
    expect(result.detectedModes).toEqual(["light", "dark"]);
  });

  it("detects default/dark as multi-mode", () => {
    const data = {
      default: { spacing: { sm: { value: 8 } } },
      dark: { spacing: { sm: { value: 8 } } },
    };
    expect(detectModes(data).isMultiMode).toBe(true);
  });

  it("detects mobile/desktop as multi-mode", () => {
    const data = {
      mobile: { radius: { value: 4 } },
      desktop: { radius: { value: 8 } },
    };
    expect(detectModes(data).isMultiMode).toBe(true);
  });

  it("does NOT detect flat token categories as multi-mode", () => {
    const data = {
      colors: { primary: { value: "#fff" } },
      spacing: { sm: { value: 8 } },
    };
    expect(detectModes(data).isMultiMode).toBe(false);
  });

  it("does NOT detect objects with direct value keys as multi-mode", () => {
    const data = {
      primary: { value: "#fff" },
      secondary: { value: "#000" },
    };
    expect(detectModes(data).isMultiMode).toBe(false);
  });

  it("does NOT detect scale steps as multi-mode", () => {
    const data = {
      "100": { value: "#f5f5f5" },
      "200": { value: "#eeeeee" },
    };
    expect(detectModes(data).isMultiMode).toBe(false);
  });

  it("does NOT detect arrays as multi-mode", () => {
    expect(detectModes([1, 2, 3]).isMultiMode).toBe(false);
  });

  it("does NOT detect primitives as multi-mode", () => {
    expect(detectModes("hello").isMultiMode).toBe(false);
    expect(detectModes(42).isMultiMode).toBe(false);
    expect(detectModes(null).isMultiMode).toBe(false);
  });

  it("does NOT detect single-key objects as multi-mode", () => {
    const data = { light: { primary: { value: "#fff" } } };
    expect(detectModes(data).isMultiMode).toBe(false);
  });

  it("does NOT detect objects with more than 8 keys as multi-mode", () => {
    const data = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`mode${i}`, { primary: {} }])
    );
    expect(detectModes(data).isMultiMode).toBe(false);
  });

  it("does NOT detect hex color values in top-level keys as multi-mode", () => {
    const data = {
      "#ffffff": { usage: "background" },
      "#000000": { usage: "text" },
    };
    expect(detectModes(data).isMultiMode).toBe(false);
  });
});
