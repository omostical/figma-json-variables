import { writeTokensToFigma, executeImportPlan } from "./figma-writer.ts";
import type { Token, ImportPlanItem, NormalizedValue, RGBAColor } from "../shared/types.ts";

figma.showUI(__html__, { width: 480, height: 600, themeColors: true });

figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case "PING":
      figma.ui.postMessage({ type: "PONG" });
      break;

    case "GET_COLLECTIONS": {
      try {
        const collections = figma.variables.getLocalVariableCollections();
        figma.ui.postMessage({
          type: "COLLECTIONS",
          payload: collections.map((c) => ({ id: c.id, name: c.name, modes: c.modes })),
        });
      } catch (err) {
        figma.ui.postMessage({
          type: "RESULT",
          payload: { error: String(err), created: 0, updated: 0, unchanged: 0, aliased: 0, skipped: 0, errors: [] },
        });
      }
      break;
    }

    case "GET_SETTINGS": {
      try {
        const settings = await figma.clientStorage.getAsync("settings");
        figma.ui.postMessage({ type: "SETTINGS", payload: settings ?? {} });
      } catch {
        figma.ui.postMessage({ type: "SETTINGS", payload: {} });
      }
      break;
    }

    case "SAVE_SETTINGS":
      await figma.clientStorage.setAsync("settings", msg.payload).catch(() => null);
      break;

    case "IMPORT": {
      const { tokens, collectionName, modeName } = msg.payload as {
        tokens: Token[];
        collectionName: string;
        modeName: string;
      };
      try {
        const result = await writeTokensToFigma(tokens, collectionName, modeName);
        figma.ui.postMessage({ type: "RESULT", payload: result });
      } catch (err) {
        figma.ui.postMessage({ type: "RESULT", payload: { error: String(err), created: 0, updated: 0, unchanged: 0, aliased: 0, skipped: 0, errors: [] } });
      }
      break;
    }

    case "IMPORT_MULTIMODE": {
      const { modeTokenMap, collectionName } = msg.payload as {
        modeTokenMap: Record<string, Token[]>;
        collectionName: string;
      };
      let created = 0, updated = 0, unchanged = 0, aliased = 0, skipped = 0;
      const errors: Array<{ path: string; reason: string }> = [];
      try {
        for (const [modeName, tokens] of Object.entries(modeTokenMap)) {
          const r = await writeTokensToFigma(tokens, collectionName, modeName);
          created += r.created;
          updated += r.updated;
          unchanged += r.unchanged;
          aliased += r.aliased;
          skipped += r.skipped;
          errors.push(...r.errors);
        }
        figma.ui.postMessage({ type: "RESULT", payload: { created, updated, unchanged, aliased, skipped, errors } });
      } catch (err) {
        figma.ui.postMessage({ type: "RESULT", payload: { error: String(err), created, updated, unchanged, aliased, skipped, errors } });
      }
      break;
    }

    case "GET_VARIABLE_SNAPSHOT": {
      const { collectionName, modeName } = msg.payload as { collectionName: string; modeName: string };
      try {
        const collections = figma.variables.getLocalVariableCollections();
        const collection = collections.find((c) => c.name === collectionName);
        if (!collection) {
          figma.ui.postMessage({ type: "VARIABLE_SNAPSHOT", payload: [] });
          break;
        }
        const mode = collection.modes.find((m) => m.name === modeName) ?? collection.modes[0];
        const modeId = mode?.modeId;
        if (!modeId) {
          figma.ui.postMessage({ type: "VARIABLE_SNAPSHOT", payload: [] });
          break;
        }
        const allVars = figma.variables.getLocalVariables();
        const snapshot = allVars
          .filter((v) => v.variableCollectionId === collection.id)
          .map((v) => {
            const raw = v.valuesByMode[modeId];
            let modeValue: NormalizedValue | null = null;
            if (raw !== undefined && raw !== null) {
              if (v.resolvedType === "COLOR" && typeof raw === "object" && "r" in raw) {
                modeValue = raw as RGBAColor;
              } else if (v.resolvedType === "FLOAT" && typeof raw === "number") {
                modeValue = raw;
              } else if (v.resolvedType === "BOOLEAN" && typeof raw === "boolean") {
                modeValue = raw;
              } else if (typeof raw === "object" && "type" in raw && (raw as { type: string }).type === "VARIABLE_ALIAS") {
                const alias = raw as { type: string; id: string };
                const target = figma.variables.getVariableById(alias.id);
                modeValue = target ? { kind: "alias" as const, path: target.name } : null;
              }
            }
            return { id: v.id, name: v.name, type: v.resolvedType as "COLOR" | "FLOAT" | "BOOLEAN" | "STRING", collectionId: collection.id, modeValue };
          });
        figma.ui.postMessage({ type: "VARIABLE_SNAPSHOT", payload: snapshot });
      } catch {
        figma.ui.postMessage({ type: "VARIABLE_SNAPSHOT", payload: [] });
      }
      break;
    }

    case "EXECUTE_IMPORT_PLAN": {
      const { items, collectionName, modeName } = msg.payload as {
        items: ImportPlanItem[];
        collectionName: string;
        modeName: string;
      };
      try {
        const result = await executeImportPlan(items, collectionName, modeName);
        figma.ui.postMessage({ type: "RESULT", payload: result });
      } catch (err) {
        figma.ui.postMessage({ type: "RESULT", payload: { error: String(err), created: 0, updated: 0, unchanged: 0, aliased: 0, skipped: 0, errors: [] } });
      }
      break;
    }

    case "CLOSE":
      figma.closePlugin();
      break;
  }
};
