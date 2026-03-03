import { describe, expect, it } from "vitest";
import { filterVariablesForCollection } from "../src/plugin/figma-writer.ts";

describe("filterVariablesForCollection", () => {
  it("only returns variables from the selected collection", () => {
    const variables = [
      { name: "violet/700", variableCollectionId: "collection-a", resolvedType: "COLOR" },
      { name: "violet/800", variableCollectionId: "collection-b", resolvedType: "COLOR" },
      { name: "violet/900", variableCollectionId: "collection-a", resolvedType: "COLOR" },
    ];

    const filtered = filterVariablesForCollection(variables, "collection-a");

    expect([...filtered.keys()]).toEqual(["violet/700", "violet/900"]);
    expect(filtered.has("violet/800")).toBe(false);
  });
});
