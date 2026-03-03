import type {
  Token,
  ExistingVariableSnapshot,
  ImportPlanItem,
  AnalysisResult,
  ConflictKind,
  ImportAction,
  DuplicatePolicy,
} from "../shared/types.ts";
import { makeValueKey, valuesEqual } from "./value-equality.ts";

export function analyzeDuplicates(
  tokens: Token[],
  snapshot: ExistingVariableSnapshot[],
  policy: DuplicatePolicy = "conservative"
): AnalysisResult {
  // Name → existing variable
  const byName = new Map<string, ExistingVariableSnapshot>(
    snapshot.map((v) => [v.name, v])
  );

  // ValueKey → existing variables with that key
  const byValueKey = new Map<string, ExistingVariableSnapshot[]>();
  for (const v of snapshot) {
    const key = makeValueKey(v.type, v.modeValue);
    if (key) {
      const arr = byValueKey.get(key) ?? [];
      arr.push(v);
      byValueKey.set(key, arr);
    }
  }

  const items: ImportPlanItem[] = [];

  for (const token of tokens) {
    // SKIP tokens pass straight through — no analysis needed
    if (token.type === "SKIP" || token.normalizedValue === null) {
      items.push({
        token,
        existingByName: null,
        duplicatesByValue: [],
        conflictKind: "clean",
        proposedAction: "skip",
        finalAction: "skip",
      });
      continue;
    }

    const existingByName = byName.get(token.path) ?? null;
    const tokenValueKey = makeValueKey(token.type, token.normalizedValue);

    // Value duplicates = other variables with same normalized value (different name)
    const duplicatesByValue: ExistingVariableSnapshot[] = tokenValueKey
      ? (byValueKey.get(tokenValueKey) ?? []).filter((v) => v.name !== token.path)
      : [];

    let conflictKind: ConflictKind;
    let proposedAction: ImportAction;

    if (existingByName) {
      // Alias tokens can legally alias any type; skip type check for them
      const isTypeMismatch =
        token.type !== "ALIAS" &&
        existingByName.type !== (token.type as string);

      if (isTypeMismatch) {
        conflictKind = "type_conflict";
        proposedAction = "error";
      } else if (valuesEqual(existingByName.modeValue, token.normalizedValue)) {
        conflictKind = "exact_match";
        // Conservative/strict: skip unchanged. update_by_name: still skip (same value).
        proposedAction = "unchanged";
      } else {
        conflictKind = "name_conflict";
        proposedAction = resolveNameConflict(policy);
      }
    } else if (duplicatesByValue.length > 0) {
      conflictKind = "value_duplicate";
      proposedAction = resolveValueDuplicate(policy);
    } else {
      conflictKind = "clean";
      proposedAction = "create";
    }

    items.push({
      token,
      existingByName,
      duplicatesByValue,
      conflictKind,
      proposedAction,
      finalAction: proposedAction,
      // Default alias target = first duplicate's name (user can change)
      aliasTarget:
        conflictKind === "value_duplicate" && duplicatesByValue.length > 0
          ? duplicatesByValue[0].name
          : undefined,
    });
  }

  const counts = {
    clean: items.filter((i) => i.conflictKind === "clean").length,
    exactMatch: items.filter((i) => i.conflictKind === "exact_match").length,
    nameConflict: items.filter((i) => i.conflictKind === "name_conflict").length,
    typeConflict: items.filter((i) => i.conflictKind === "type_conflict").length,
    valueDuplicate: items.filter((i) => i.conflictKind === "value_duplicate").length,
    skipped: items.filter((i) => i.token.type === "SKIP").length,
  };

  const hasConflicts =
    counts.exactMatch +
      counts.nameConflict +
      counts.typeConflict +
      counts.valueDuplicate >
    0;

  return { items, hasConflicts, counts };
}

export function analyzeModeTokenMap(
  modeTokenMap: Record<string, Token[]>,
  snapshot: ExistingVariableSnapshot[],
  policy: DuplicatePolicy = "conservative"
): AnalysisResult {
  const analyses = Object.entries(modeTokenMap).map(([modeName, tokens]) => {
    const modeSnapshot = snapshot.filter((item) => item.modeName === modeName);
    const result = analyzeDuplicates(tokens, modeSnapshot, policy);
    return {
      ...result,
      items: result.items.map((item) => ({ ...item, modeName })),
    };
  });

  const items = analyses.flatMap((analysis) => analysis.items);
  const counts = analyses.reduce(
    (acc, analysis) => ({
      clean: acc.clean + analysis.counts.clean,
      exactMatch: acc.exactMatch + analysis.counts.exactMatch,
      nameConflict: acc.nameConflict + analysis.counts.nameConflict,
      typeConflict: acc.typeConflict + analysis.counts.typeConflict,
      valueDuplicate: acc.valueDuplicate + analysis.counts.valueDuplicate,
      skipped: acc.skipped + analysis.counts.skipped,
    }),
    { clean: 0, exactMatch: 0, nameConflict: 0, typeConflict: 0, valueDuplicate: 0, skipped: 0 }
  );

  return {
    items,
    counts,
    hasConflicts: analyses.some((analysis) => analysis.hasConflicts),
  };
}

// ── Policy helpers ────────────────────────────────────────────────────────────

function resolveNameConflict(policy: DuplicatePolicy): ImportAction {
  switch (policy) {
    case "update_by_name":
      return "update";
    case "conservative":
    case "deduplicate_by_value":
    case "strict":
    default:
      return "skip"; // let user decide in review screen
  }
}

function resolveValueDuplicate(policy: DuplicatePolicy): ImportAction {
  switch (policy) {
    case "strict":
      return "skip";
    case "deduplicate_by_value":
      return "alias_to_existing"; // propose aliasing
    case "conservative":
    case "update_by_name":
    default:
      return "create"; // intentional duplicates are common in design systems
  }
}

// ── Batch action helpers (used by review UI) ──────────────────────────────────

export function applyBatchAction(
  items: ImportPlanItem[],
  conflictKind: ConflictKind,
  action: ImportAction
): ImportPlanItem[] {
  return items.map((item) => {
    if (item.conflictKind !== conflictKind) return item;
    // Type conflicts cannot be overridden
    if (item.conflictKind === "type_conflict") return item;
    return { ...item, finalAction: action };
  });
}

export function setItemAction(
  items: ImportPlanItem[],
  path: string,
  action: ImportAction,
  aliasTarget?: string,
  modeName?: string
): ImportPlanItem[] {
  return items.map((item) => {
    if (item.token.path !== path || item.modeName !== modeName) return item;
    return { ...item, finalAction: action, aliasTarget: aliasTarget ?? item.aliasTarget };
  });
}
