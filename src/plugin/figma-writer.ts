import type { Token, ImportResult, ImportPlanItem, AliasRef } from "../shared/types.ts";

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
  const result: ImportResult = { created: 0, updated: 0, unchanged: 0, aliased: 0, skipped: 0, errors: [] };

  const collection = getOrCreateCollection(collectionName);
  const modeId = getOrCreateMode(collection, modeName);

  // Only reuse variables from the active collection; mode IDs are collection-scoped.
  const variableMap = buildVariableMap(collection);

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
      const target = variableMap.get(aliasRef.path) ?? buildVariableMap(collection).get(aliasRef.path);

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

function buildVariableMap(collection: VariableCollection): Map<string, Variable> {
  return filterVariablesForCollection(figma.variables.getLocalVariables(), collection.id);
}

export function filterVariablesForCollection<T extends { name: string; variableCollectionId: string }>(
  variables: T[],
  collectionId: string
): Map<string, T> {
  return new Map(
    variables
      .filter((variable) => variable.variableCollectionId === collectionId)
      .map((variable) => [variable.name, variable])
  );
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

/**
 * Execute an already-analyzed import plan. Each item carries its finalAction
 * set by the user in the DuplicateReviewScreen.
 */
export async function executeImportPlan(
  items: ImportPlanItem[],
  collectionName: string,
  modeName: string
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, unchanged: 0, aliased: 0, skipped: 0, errors: [] };

  const collection = getOrCreateCollection(collectionName);
  const modeId = getOrCreateMode(collection, modeName);
  const variableMap = buildVariableMap(collection);

  for (const item of items) {
    const { token, finalAction, aliasTarget } = item;

    try {
      switch (finalAction) {
        case "unchanged":
        case "skip":
          result.skipped++;
          break;

        case "create": {
          const figmaType = toFigmaType(token.type);
          if (!figmaType || token.normalizedValue === null) { result.skipped++; break; }
          const v = figma.variables.createVariable(token.path, collection, figmaType);
          v.setValueForMode(modeId, token.normalizedValue as VariableValue);
          variableMap.set(token.path, v);
          result.created++;
          break;
        }

        case "update": {
          const figmaType = toFigmaType(token.type);
          if (!figmaType || token.normalizedValue === null) { result.skipped++; break; }
          let v = variableMap.get(token.path);
          if (!v) {
            v = figma.variables.createVariable(token.path, collection, figmaType);
            variableMap.set(token.path, v);
            result.created++;
          } else {
            v.setValueForMode(modeId, token.normalizedValue as VariableValue);
            result.updated++;
          }
          break;
        }

        case "alias_to_existing": {
          const target = variableMap.get(aliasTarget ?? "");
          if (!target) {
            result.errors.push({ path: token.path, reason: `Alias target not found: ${aliasTarget}` });
            break;
          }
          let v = variableMap.get(token.path);
          if (!v) {
            v = figma.variables.createVariable(token.path, collection, target.resolvedType);
            variableMap.set(token.path, v);
            result.created++;
          }
          v.setValueForMode(modeId, figma.variables.createVariableAlias(target));
          result.aliased++;
          break;
        }

        case "error":
          result.errors.push({ path: token.path, reason: item.existingByName
            ? `Type conflict: existing is ${item.existingByName.type}, import is ${token.type}`
            : "Unknown error" });
          break;
      }
    } catch (err) {
      result.errors.push({ path: token.path, reason: String(err) });
    }
  }

  return result;
}
