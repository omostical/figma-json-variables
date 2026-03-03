import React from "react";
import type { Token } from "../../shared/types.ts";
import TokenRow from "../components/TokenRow.tsx";

interface PreviewScreenProps {
  tokens: Token[];
  collectionName: string;
  modeName: string;
  isMultiMode: boolean;
  modeMap: Record<string, string>;
  isImporting: boolean;
  onImport: () => void;
  onBack: () => void;
}

function count(tokens: Token[], type: string) {
  return tokens.filter((t) => t.type === type).length;
}

export default function PreviewScreen({
  tokens,
  collectionName,
  modeName,
  isMultiMode,
  modeMap,
  isImporting,
  onImport,
  onBack,
}: PreviewScreenProps) {
  const importable = tokens.filter((t) => t.type !== "SKIP");
  const colors = count(tokens, "COLOR");
  const floats = count(tokens, "FLOAT");
  const booleans = count(tokens, "BOOLEAN");
  const aliases = count(tokens, "ALIAS");
  const skipped = count(tokens, "SKIP");

  const modeLabel = isMultiMode
    ? Object.values(modeMap).join(", ")
    : modeName;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
        >
          ← Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {importable.length} token{importable.length !== 1 ? "s" : ""} ready
          </p>
          <p className="text-[10px] text-gray-400 truncate">
            → <span className="font-medium">{collectionName}</span>
            {" / "}
            <span className="font-medium">{modeLabel}</span>
            {isMultiMode && (
              <span className="ml-1 px-1 py-0.5 rounded bg-violet-100 text-violet-600 text-[9px] font-medium">
                MULTI-MODE
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Type summary badges */}
      <div className="flex gap-1.5 px-4 py-2 flex-wrap border-b border-gray-100">
        {colors > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
            {colors} color{colors !== 1 ? "s" : ""}
          </span>
        )}
        {floats > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
            {floats} float{floats !== 1 ? "s" : ""}
          </span>
        )}
        {booleans > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
            {booleans} boolean{booleans !== 1 ? "s" : ""}
          </span>
        )}
        {aliases > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
            {aliases} alias{aliases !== 1 ? "es" : ""}
          </span>
        )}
        {skipped > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
            {skipped} skipped
          </span>
        )}
      </div>

      {/* Token table */}
      <div className="flex-1 overflow-y-auto">
        {tokens.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            No tokens found
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-100">
                <th className="py-1.5 pl-3 pr-2 text-left text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Name
                </th>
                <th className="py-1.5 px-2 text-left text-[10px] font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  Type
                </th>
                <th className="py-1.5 pl-2 pr-3 text-left text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <TokenRow key={token.path} token={token} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        {importable.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            No importable tokens — check your JSON structure.
          </p>
        ) : (
          <button
            type="button"
            disabled={isImporting}
            onClick={onImport}
            className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isImporting ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Importing…
              </>
            ) : (
              `Import ${importable.length} token${importable.length !== 1 ? "s" : ""} →`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
