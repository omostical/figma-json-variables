figma.showUI(__html__, { width: 480, height: 600, title: "JSON Variables Importer" });

figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  if (msg.type === "PING") {
    figma.ui.postMessage({ type: "PONG" });
  }

  if (msg.type === "GET_COLLECTIONS") {
    const collections = figma.variables.getLocalVariableCollections();
    figma.ui.postMessage({
      type: "COLLECTIONS",
      payload: collections.map((c) => ({ id: c.id, name: c.name, modes: c.modes })),
    });
  }
};
