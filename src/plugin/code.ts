import { writeTokensToFigma } from "./figma-writer.ts";
import type { Token } from "../shared/types.ts";

figma.showUI(__html__, { width: 480, height: 600, title: "JSON Variables Importer" });

figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case "PING":
      figma.ui.postMessage({ type: "PONG" });
      break;

    case "GET_COLLECTIONS": {
      const collections = figma.variables.getLocalVariableCollections();
      figma.ui.postMessage({
        type: "COLLECTIONS",
        payload: collections.map((c) => ({ id: c.id, name: c.name, modes: c.modes })),
      });
      break;
    }

    case "GET_SETTINGS": {
      const settings = await figma.clientStorage.getAsync("settings").catch(() => null);
      figma.ui.postMessage({ type: "SETTINGS", payload: settings ?? {} });
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
        figma.ui.postMessage({ type: "RESULT", payload: { error: String(err), created: 0, updated: 0, skipped: 0, errors: [] } });
      }
      break;
    }

    case "IMPORT_MULTIMODE": {
      const { modeTokenMap, collectionName } = msg.payload as {
        modeTokenMap: Record<string, Token[]>;
        collectionName: string;
      };
      let created = 0, updated = 0, skipped = 0;
      const errors: Array<{ path: string; reason: string }> = [];
      try {
        for (const [modeName, tokens] of Object.entries(modeTokenMap)) {
          const r = await writeTokensToFigma(tokens, collectionName, modeName);
          created += r.created;
          updated += r.updated;
          skipped += r.skipped;
          errors.push(...r.errors);
        }
        figma.ui.postMessage({ type: "RESULT", payload: { created, updated, skipped, errors } });
      } catch (err) {
        figma.ui.postMessage({ type: "RESULT", payload: { error: String(err), created, updated, skipped, errors } });
      }
      break;
    }

    case "CLOSE":
      figma.closePlugin();
      break;
  }
};
