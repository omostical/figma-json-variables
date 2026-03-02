import type { Token, ImportResult, RGBAColor, AliasRef } from "../shared/types.ts";

export async function writeTokensToFigma(
  tokens: Token[],
  collectionName: string,
  modeName: string
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  const collection = getOrCreateCollection(collectionName);
  const modeId = getOrCreateMode(collection, modeName);

  const allVariables = figma.variables.getLocalVariables();
  const variableMap = new Map(allVariables.map((v) => [v.name, v]));

  for (const token of tokens) {
    if (token.type === "SKIP" || token.normalizedValue === null) {
      result.skipped++;
      continue;
    }

    try {
      const figmaType = toFigmaType(token.type);
      if (!figmaType) {
        result.skipped++;
        continue;
      }

      let variable = variableMap.get(token.path);

      if (variable) {
        if (variable.resolvedType !== figmaType) {
          result.errors.push({
            path: token.path,
            reason: `Type conflict: existing variable is ${variable.resolvedType}, cannot overwrite with ${figmaType}`,
          });
          continue;
        }
        variable.setValueForMode(modeId, toFigmaValue(token.normalizedValue));
        result.updated++;
      } else {
        variable = figma.variables.createVariable(token.path, collection.id, figmaType);
        variable.setValueForMode(modeId, toFigmaValue(token.normalizedValue));
        variableMap.set(token.path, variable);
        result.created++;
      }
    } catch (err) {
      result.errors.push({ path: token.path, reason: String(err) });
    }
  }

  return result;
}

function getOrCreateCollection(name: string): VariableCollection {
  const existing = figma.variables
    .getLocalVariableCollections()
    .find((c) => c.name === name);
  return existing ?? figma.variables.createVariableCollection(name);
}

function getOrCreateMode(collection: VariableCollection, name: string): string {
  const existing = collection.modes.find((m) => m.name === name);
  if (existing) return existing.modeId;
  return collection.addMode(name);
}

function toFigmaType(type: string): "COLOR" | "FLOAT" | "BOOLEAN" | null {
  if (type === "COLOR") return "COLOR";
  if (type === "FLOAT") return "FLOAT";
  if (type === "BOOLEAN") return "BOOLEAN";
  return null;
}

function toFigmaValue(
  value: RGBAColor | number | boolean | AliasRef
): VariableValue {
  if (typeof value === "object" && "kind" in value && value.kind === "alias") {
    const ref = figma.variables
      .getLocalVariables()
      .find((v) => v.name === value.path);
    if (ref) return figma.variables.createVariableAlias(ref);
  }
  return value as VariableValue;
}
