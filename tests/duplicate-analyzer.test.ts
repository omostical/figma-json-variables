import { describe, it, expect } from "vitest";
import { analyzeDuplicates, analyzeModeTokenMap, applyBatchAction, setItemAction } from "../src/core/duplicate-analyzer.ts";
import type { Token, ExistingVariableSnapshot } from "../src/shared/types.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeToken(
  path: string,
  type: Token["type"],
  normalizedValue: Token["normalizedValue"],
  rawValue: unknown = normalizedValue
): Token {
  return { path, type, normalizedValue, rawValue, status: "new" };
}

function makeSnap(
  name: string,
  type: ExistingVariableSnapshot["type"],
  modeValue: ExistingVariableSnapshot["modeValue"],
  modeName = "default"
): ExistingVariableSnapshot {
  return { id: `id-${name}-${modeName}`, name, type, collectionId: "col1", modeName, modeValue };
}

const RED = { r: 1, g: 0, b: 0, a: 1 };
const RED2 = { r: 0.9999, g: 0, b: 0, a: 1 }; // within tolerance
const BLUE = { r: 0, g: 0, b: 1, a: 1 };

// ── exact_match ───────────────────────────────────────────────────────────────

describe("exact_match", () => {
  it("flags same name + same color value as exact_match with proposedAction=unchanged", () => {
    const tokens = [makeToken("colors/red", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("exact_match");
    expect(items[0].proposedAction).toBe("unchanged");
    expect(items[0].finalAction).toBe("unchanged");
  });

  it("treats near-identical color values (rounding tolerance) as exact_match", () => {
    const tokens = [makeToken("colors/red", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED2)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("exact_match");
  });

  it("flags same name + same float as exact_match", () => {
    const tokens = [makeToken("spacing/sm", "FLOAT", 8)];
    const snapshot = [makeSnap("spacing/sm", "FLOAT", 8)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("exact_match");
  });

  it("flags same name + same boolean as exact_match", () => {
    const tokens = [makeToken("flags/dark", "BOOLEAN", true)];
    const snapshot = [makeSnap("flags/dark", "BOOLEAN", true)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("exact_match");
  });

  it("flags same name + same string as exact_match", () => {
    const tokens = [makeToken("font/family/sans", "STRING", "Geist Sans, system-ui, sans-serif")];
    const snapshot = [makeSnap("font/family/sans", "STRING", "Geist Sans, system-ui, sans-serif")];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("exact_match");
  });
});

// ── name_conflict ─────────────────────────────────────────────────────────────

describe("name_conflict", () => {
  it("flags same name + different color value as name_conflict", () => {
    const tokens = [makeToken("colors/red", "COLOR", BLUE, "#0000ff")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("name_conflict");
  });

  it("proposedAction is skip under conservative policy", () => {
    const tokens = [makeToken("colors/red", "COLOR", BLUE, "#0000ff")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot, "conservative");
    expect(items[0].proposedAction).toBe("skip");
  });

  it("proposedAction is update under update_by_name policy", () => {
    const tokens = [makeToken("colors/red", "COLOR", BLUE, "#0000ff")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot, "update_by_name");
    expect(items[0].proposedAction).toBe("update");
  });

  it("flags same name + different float as name_conflict", () => {
    const tokens = [makeToken("spacing/sm", "FLOAT", 12)];
    const snapshot = [makeSnap("spacing/sm", "FLOAT", 8)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("name_conflict");
  });
});

// ── type_conflict ─────────────────────────────────────────────────────────────

describe("type_conflict", () => {
  it("flags same name + incompatible type as type_conflict with proposedAction=error", () => {
    const tokens = [makeToken("spacing/sm", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("spacing/sm", "FLOAT", 8)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("type_conflict");
    expect(items[0].proposedAction).toBe("error");
  });

  it("blocks type_conflict even under update_by_name policy", () => {
    const tokens = [makeToken("spacing/sm", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("spacing/sm", "FLOAT", 8)];
    const { items } = analyzeDuplicates(tokens, snapshot, "update_by_name");
    expect(items[0].conflictKind).toBe("type_conflict");
    expect(items[0].proposedAction).toBe("error");
  });
});

// ── value_duplicate ───────────────────────────────────────────────────────────

describe("value_duplicate", () => {
  it("flags different name + same normalized color value as value_duplicate", () => {
    const tokens = [makeToken("colors/accent", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("value_duplicate");
    expect(items[0].duplicatesByValue).toHaveLength(1);
    expect(items[0].duplicatesByValue[0].name).toBe("colors/red");
  });

  it("proposedAction is create under conservative (design systems use intentional dupes)", () => {
    const tokens = [makeToken("semantic/error", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("primitives/red-500", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot, "conservative");
    expect(items[0].proposedAction).toBe("create");
  });

  it("proposedAction is alias_to_existing under deduplicate_by_value policy", () => {
    const tokens = [makeToken("semantic/error", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("primitives/red-500", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot, "deduplicate_by_value");
    expect(items[0].proposedAction).toBe("alias_to_existing");
  });

  it("proposedAction is skip under strict policy", () => {
    const tokens = [makeToken("semantic/error", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("primitives/red-500", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot, "strict");
    expect(items[0].proposedAction).toBe("skip");
  });

  it("sets aliasTarget to the first duplicate's name", () => {
    const tokens = [makeToken("semantic/error", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("primitives/red-500", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].aliasTarget).toBe("primitives/red-500");
  });

  it("does NOT flag the same token against itself in value duplicates", () => {
    const tokens = [makeToken("colors/red", "COLOR", RED, "#ff0000")];
    const snapshot = [makeSnap("colors/red", "COLOR", RED)]; // exact match, not value dup
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("exact_match");
    expect(items[0].duplicatesByValue).toHaveLength(0);
  });
});

// ── clean ─────────────────────────────────────────────────────────────────────

describe("clean", () => {
  it("marks brand new token as clean with proposedAction=create", () => {
    const tokens = [makeToken("colors/new", "COLOR", BLUE, "#0000ff")];
    const { items } = analyzeDuplicates(tokens, []);
    expect(items[0].conflictKind).toBe("clean");
    expect(items[0].proposedAction).toBe("create");
  });

  it("marks SKIP tokens as clean/skip regardless of snapshot", () => {
    const tokens = [makeToken("obj/foo", "SKIP", null)];
    const snapshot = [makeSnap("obj/foo", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    expect(items[0].conflictKind).toBe("clean");
    expect(items[0].finalAction).toBe("skip");
  });
});

// ── hasConflicts / counts ─────────────────────────────────────────────────────

describe("hasConflicts and counts", () => {
  it("reports hasConflicts=false when all tokens are new", () => {
    const tokens = [
      makeToken("a", "COLOR", RED),
      makeToken("b", "FLOAT", 8),
    ];
    const result = analyzeDuplicates(tokens, []);
    expect(result.hasConflicts).toBe(false);
    expect(result.counts.clean).toBe(2);
  });

  it("reports correct counts across mixed conflict kinds", () => {
    const tokens = [
      makeToken("colors/red",  "COLOR", RED),        // exact_match
      makeToken("colors/blue", "COLOR", BLUE),       // name_conflict (same name, diff value)
      makeToken("spacing/sm",  "COLOR", RED),        // type_conflict
      makeToken("colors/new",  "COLOR", { r: 0, g: 1, b: 0, a: 1 }), // clean
      makeToken("semantic/err","COLOR", RED),        // value_duplicate (same as colors/red)
    ];
    const snapshot = [
      makeSnap("colors/red",  "COLOR", RED),          // for token[0] → exact_match
      makeSnap("colors/blue", "COLOR", RED),           // for token[1] → name_conflict
      makeSnap("spacing/sm",  "FLOAT", 8),             // for token[2] → type_conflict
    ];
    const result = analyzeDuplicates(tokens, snapshot);
    expect(result.counts.exactMatch).toBe(1);
    expect(result.counts.nameConflict).toBe(1);
    expect(result.counts.typeConflict).toBe(1);
    expect(result.counts.clean).toBe(1);
    expect(result.counts.valueDuplicate).toBe(1); // semantic/err shares value with colors/red snap
    expect(result.hasConflicts).toBe(true);
  });
});

describe("analyzeModeTokenMap", () => {
  it("analyzes each mode against the matching snapshot mode", () => {
    const modeTokenMap = {
      light: [makeToken("color/bg/page", "COLOR", RED)],
      dark: [makeToken("color/bg/page", "COLOR", BLUE)],
    };
    const snapshot = [
      makeSnap("color/bg/page", "COLOR", RED, "light"),
      makeSnap("color/bg/page", "COLOR", RED, "dark"),
    ];

    const result = analyzeModeTokenMap(modeTokenMap, snapshot);

    expect(result.items).toHaveLength(2);
    expect(result.items.find((item) => item.modeName === "light")?.conflictKind).toBe("exact_match");
    expect(result.items.find((item) => item.modeName === "dark")?.conflictKind).toBe("name_conflict");
    expect(result.counts.exactMatch).toBe(1);
    expect(result.counts.nameConflict).toBe(1);
  });

  it("keeps mode context when overriding one item action", () => {
    const modeTokenMap = {
      light: [makeToken("color/bg/page", "COLOR", RED)],
      dark: [makeToken("color/bg/page", "COLOR", BLUE)],
    };
    const snapshot = [
      makeSnap("color/bg/page", "COLOR", RED, "light"),
      makeSnap("color/bg/page", "COLOR", RED, "dark"),
    ];

    const result = analyzeModeTokenMap(modeTokenMap, snapshot);
    const updated = setItemAction(result.items, "color/bg/page", "update", undefined, "dark");

    expect(updated.find((item) => item.modeName === "dark")?.finalAction).toBe("update");
    expect(updated.find((item) => item.modeName === "light")?.finalAction).toBe("unchanged");
  });
});

// ── batch actions ─────────────────────────────────────────────────────────────

describe("applyBatchAction", () => {
  it("applies batch action to all items of given conflictKind", () => {
    const tokens = [
      makeToken("a", "COLOR", BLUE),
      makeToken("b", "COLOR", RED),
    ];
    const snapshot = [
      makeSnap("a", "COLOR", RED),
      makeSnap("b", "COLOR", BLUE),
    ];
    const { items } = analyzeDuplicates(tokens, snapshot);
    const updated = applyBatchAction(items, "name_conflict", "update");
    expect(updated.every((i) => i.finalAction === "update")).toBe(true);
  });

  it("does not override type_conflict items", () => {
    const tokens = [makeToken("spacing/sm", "COLOR", RED)];
    const snapshot = [makeSnap("spacing/sm", "FLOAT", 8)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    const updated = applyBatchAction(items, "type_conflict", "update");
    expect(updated[0].finalAction).toBe("error");
  });

  it("leaves items of other kinds untouched", () => {
    const tokens = [
      makeToken("a", "COLOR", BLUE),  // name_conflict
      makeToken("b", "COLOR", RED),   // clean
    ];
    const snapshot = [makeSnap("a", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    const updated = applyBatchAction(items, "name_conflict", "update");
    const cleanItem = updated.find((i) => i.token.path === "b");
    expect(cleanItem?.finalAction).toBe("create");
  });
});

describe("setItemAction", () => {
  it("overrides a single item's finalAction", () => {
    const tokens = [
      makeToken("a", "COLOR", BLUE),
      makeToken("b", "COLOR", BLUE),
    ];
    const snapshot = [
      makeSnap("a", "COLOR", RED),
      makeSnap("b", "COLOR", RED),
    ];
    const { items } = analyzeDuplicates(tokens, snapshot);
    const updated = setItemAction(items, "a", "update");
    expect(updated.find((i) => i.token.path === "a")?.finalAction).toBe("update");
    expect(updated.find((i) => i.token.path === "b")?.finalAction).toBe("skip");
  });

  it("sets aliasTarget when provided", () => {
    const tokens = [makeToken("semantic/error", "COLOR", RED)];
    const snapshot = [makeSnap("primitives/red", "COLOR", RED)];
    const { items } = analyzeDuplicates(tokens, snapshot);
    const updated = setItemAction(items, "semantic/error", "alias_to_existing", "primitives/red");
    expect(updated[0].aliasTarget).toBe("primitives/red");
  });
});
