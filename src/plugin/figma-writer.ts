import type { Token, ImportResult, RGBAColor, AliasRef } from "../shared/types.ts";

export function getOrCreateCollection(name: string): VariableCollection {
  const existing = figma.variables
    .getLocalVariableCollections()
    .find((c) => c.name === name);
  return existing ?? figma.variables.createVariableCollection(name);
}

export async function writeTokensToFigma(
  tokens: Token[],
  collectionName: string,
  modeName: string
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const collection = getOrCreateCollection(collectionName);
  const modeId = getOrCreateMode(collection, modeName);

  // Build variable map from current state
  const variableMap = buildVariableMap();

  // Pass 1: create/update all non-alias tokens first
  const aliasTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "SKIP" || token.normalizedValue === null) {
      result.skipped++;
      continue;
    }

    if (token.type === "ALIAS") {
      aliasTokens.push(token);
      continue;
    }

    const figmaType = toFigmaType(token.type);
    if (!figmaType) {
      result.skipped++;
      continue;
    }

    try {
      let variable = variableMap.get(token.path);

      if (variable) {
        if (variable.resolvedType !== figmaType) {
          result.errors.push({
            path: token.path,
            reason: `Type conflict: existing is ${variable.resolvedType}, import is ${figmaType}`,
          });
          continue;
        }
        variable.setValueForMode(modeId, token.normalizedValue as VariableValue);
        result.updated++;
      } else {
        variable = figma.variables.createVariable(token.path, collection, figmaType);
        variable.setValueForMode(modeId, token.normalizedValue as VariableValue);
        variableMap.set(token.path, variable);
        result.created++;
      }
    } catch (err) {
      result.errors.push({ path: token.path, reason: String(err) });
    }
  }

  // Pass 2: resolve alias tokens (targets now exist from pass 1)
  for (const token of aliasTokens) {
    const aliasRef = token.normalizedValue as AliasRef;

    try {
      const target = variableMap.get(aliasRef.path) ?? buildVariableMap().get(aliasRef.path);

      if (!target) {
        result.errors.push({
          path: token.path,
          reason: `Alias target not found: ${aliasRef.path}`,
        });
        continue;
      }

      let variable = variableMap.get(token.path);

      if (!variable) {
        variable = figma.variables.createVariable(token.path, collection, target.resolvedType);
        variableMap.set(token.path, variable);
        result.created++;
      } else {
        result.updated++;
      }

      variable.setValueForMode(modeId, figma.variables.createVariableAlias(target));
    } catch (err) {
      result.errors.push({ path: token.path, reason: String(err) });
    }
  }

  return result;
}

function buildVariableMap(): Map<string, Variable> {
  return new Map(figma.variables.getLocalVariables().map((v) => [v.name, v]));
}

function getOrCreateMode(collection: VariableCollection, name: string): string {
  const existing = collection.modes.find((m) => m.name === name);
  if (existing) return existing.modeId;
  return collection.addMode(name);
}

function toFigmaType(type: string): VariableResolvedDataType | null {
  if (type === "COLOR") return "COLOR";
  if (type === "FLOAT") return "FLOAT";
  if (type === "BOOLEAN") return "BOOLEAN";
  return null;
}
