import { describe, it, expect } from "vitest";
import { parseJSON } from "../src/core/parser.ts";

describe("parseJSON", () => {
  it("parses a valid JSON object", () => {
    const result = parseJSON('{"key": "value"}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ key: "value" });
  });

  it("parses a valid nested JSON object", () => {
    const result = parseJSON('{"colors": {"brand": {"600": {"value": "#C83072"}}}}');
    expect(result.ok).toBe(true);
  });

  it("returns error for empty input", () => {
    const result = parseJSON("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("Input is empty");
  });

  it("returns error for whitespace-only input", () => {
    const result = parseJSON("   \n  ");
    expect(result.ok).toBe(false);
  });

  it("returns error for malformed JSON", () => {
    const result = parseJSON('{"key": }');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBeTruthy();
  });

  it("returns error for trailing comma", () => {
    const result = parseJSON('{"key": "value",}');
    expect(result.ok).toBe(false);
  });

  it("returns line info for positional errors when available", () => {
    const input = '{\n  "key": \n}';
    const result = parseJSON(input);
    expect(result.ok).toBe(false);
    if (!result.ok && result.line !== undefined) {
      expect(result.line).toBeGreaterThan(0);
    }
  });

  it("parses a JSON array", () => {
    const result = parseJSON("[1, 2, 3]");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([1, 2, 3]);
  });
});
