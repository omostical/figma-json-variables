export type VariableType = "COLOR" | "FLOAT" | "BOOLEAN" | "ALIAS" | "SKIP";

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface AliasRef {
  kind: "alias";
  path: string;
}

export type NormalizedValue = RGBAColor | number | boolean | AliasRef;

export type TokenStatus = "new" | "update" | "skip" | "error";

export interface Token {
  path: string;
  rawValue: unknown;
  type: VariableType;
  normalizedValue: NormalizedValue | null;
  status: TokenStatus;
  errorReason?: string;
}

export interface ModeMap {
  [detectedKey: string]: string;
}

export interface ImportPlan {
  tokens: Token[];
  collectionName: string;
  modes: string[];
  modeMap?: ModeMap;
}

export interface ImportResult {
  created: number;
  updated: number;
  unchanged: number;
  aliased: number;
  skipped: number;
  errors: Array<{ path: string; reason: string }>;
}

// ── Duplicate detection ──────────────────────────────────────────────────────

/** Action the writer will take for a single token. */
export type ImportAction =
  | "create"
  | "update"
  | "unchanged"
  | "skip"
  | "alias_to_existing"
  | "error";

/** Why a token was flagged. */
export type ConflictKind =
  | "clean"           // no conflict — new token
  | "exact_match"     // same name + same value already exists → skip by default
  | "name_conflict"   // same name, different value → user decides
  | "type_conflict"   // same name, incompatible type → always error
  | "value_duplicate"; // different name, same normalized value → inform

/** Controls how the analyzer sets proposedAction for conflicts. */
export type DuplicatePolicy =
  | "conservative"       // skip exact_match + name_conflict; create value_dup
  | "update_by_name"     // auto-update name_conflict; ignore value_dup
  | "deduplicate_by_value" // propose alias for value_dup; skip name_conflict
  | "strict";            // skip exact_match + name_conflict + value_dup

/** Serializable snapshot of one existing Figma variable (sent from plugin to UI). */
export interface ExistingVariableSnapshot {
  id: string;
  name: string;
  type: "COLOR" | "FLOAT" | "BOOLEAN" | "STRING";
  collectionId: string;
  modeValue: NormalizedValue | null;
}

/** One token with its conflict analysis and resolved action. */
export interface ImportPlanItem {
  token: Token;
  existingByName: ExistingVariableSnapshot | null;
  duplicatesByValue: ExistingVariableSnapshot[];
  conflictKind: ConflictKind;
  proposedAction: ImportAction;
  finalAction: ImportAction;
  /** Existing variable name to alias to (only when finalAction === "alias_to_existing"). */
  aliasTarget?: string;
}

/** Full result of running analyzeDuplicates. */
export interface AnalysisResult {
  items: ImportPlanItem[];
  hasConflicts: boolean;
  counts: {
    clean: number;
    exactMatch: number;
    nameConflict: number;
    typeConflict: number;
    valueDuplicate: number;
    skipped: number;
  };
}

export interface PluginMessage {
  type: "IMPORT" | "PING" | "GET_COLLECTIONS";
  payload?: unknown;
}

export interface UIMessage {
  type: "RESULT" | "PONG" | "COLLECTIONS";
  payload?: unknown;
}
