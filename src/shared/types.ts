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
  skipped: number;
  errors: Array<{ path: string; reason: string }>;
}

export interface PluginMessage {
  type: "IMPORT" | "PING" | "GET_COLLECTIONS";
  payload?: unknown;
}

export interface UIMessage {
  type: "RESULT" | "PONG" | "COLLECTIONS";
  payload?: unknown;
}
