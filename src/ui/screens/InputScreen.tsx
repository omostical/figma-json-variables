import React, { useRef } from "react";

interface Collection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
}

type ImportMode = "variables" | "color-styles" | "text-styles";

interface InputScreenProps {
  rawJson: string;
  onRawJsonChange: (v: string) => void;
  collectionName: string;
  onCollectionNameChange: (v: string) => void;
  collections: Collection[];
  importMode: ImportMode;
  onImportModeChange: (v: ImportMode) => void;
  parseError: string | null;
  onParse: () => void;
}

const MODES: { value: ImportMode; label: string; hint: string }[] = [
  { value: "variables",    label: "Variables",     hint: "Figma Variables in a collection (color, number, boolean, string)" },
  { value: "color-styles", label: "Color Styles",  hint: "Local paint styles from COLOR tokens" },
  { value: "text-styles",  label: "Text Styles",   hint: 'Local text styles — JSON must group font props under each style name: { \"body/regular\": { fontFamily, fontSize, fontWeight, lineHeight } }' },
];

export default function InputScreen({
  rawJson,
  onRawJsonChange,
  collectionName,
  onCollectionNameChange,
  collections,
  importMode,
  onImportModeChange,
  parseError,
  onParse,
}: InputScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onRawJsonChange(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = "";
  };

  const canParse = rawJson.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-sm font-semibold text-gray-900">JSON Variables Importer</h1>
        <p className="text-xs text-gray-400 mt-0.5">Paste or upload a JSON token file</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* JSON input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">JSON</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Upload file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
            />
          </div>
          <textarea
            value={rawJson}
            onChange={(e) => onRawJsonChange(e.target.value)}
            placeholder={'{\n  "colors": {\n    "brand": {\n      "600": { "value": "#C83072" }\n    }\n  }\n}'}
            spellCheck={false}
            className="w-full h-44 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-300"
          />
          {parseError && (
            <p className="mt-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1 border border-red-100">
              {parseError}
            </p>
          )}
        </div>

        {/* Import mode */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Create as</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => onImportModeChange(m.value)}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                  importMode === m.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-400 leading-relaxed">
            {MODES.find((m) => m.value === importMode)?.hint}
          </p>
        </div>

        {/* Collection — only for variables */}
        {importMode === "variables" && <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Collection name
          </label>
          <input
            type="text"
            list="collections-list"
            value={collectionName}
            onChange={(e) => onCollectionNameChange(e.target.value)}
            placeholder="My Tokens"
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          />
          <datalist id="collections-list">
            {collections.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          {collections.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              Existing: {collections.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>}

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-medium text-gray-700">Import flow</p>
          <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
            {importMode === "variables"
              ? "Parse first. The plugin detects single-mode or multi-mode, suggests Figma modes, then runs duplicate review."
              : importMode === "color-styles"
              ? "Parse first. All COLOR tokens become Paint Styles. Existing styles with the same name are updated."
              : "Parse first. Tokens are grouped by parent path into Text Styles. Use px for font sizes."}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          disabled={!canParse}
          onClick={onParse}
          className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Parse &amp; Preview →
        </button>
      </div>
    </div>
  );
}
