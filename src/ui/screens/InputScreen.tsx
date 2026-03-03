import React, { useRef } from "react";

interface Collection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
}

interface InputScreenProps {
  rawJson: string;
  onRawJsonChange: (v: string) => void;
  collectionName: string;
  onCollectionNameChange: (v: string) => void;
  modeName: string;
  onModeNameChange: (v: string) => void;
  collections: Collection[];
  parseError: string | null;
  isMultiMode: boolean;
  detectedModes: string[];
  modeMap: Record<string, string>;
  onModeMapChange: (m: Record<string, string>) => void;
  onParse: () => void;
}

export default function InputScreen({
  rawJson,
  onRawJsonChange,
  collectionName,
  onCollectionNameChange,
  modeName,
  onModeNameChange,
  collections,
  parseError,
  isMultiMode,
  detectedModes,
  modeMap,
  onModeMapChange,
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

  const updateModeMap = (key: string, value: string) => {
    onModeMapChange({ ...modeMap, [key]: value });
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

        {/* Collection */}
        <div>
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
        </div>

        {/* Mode — single mode only */}
        {!isMultiMode && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mode name
            </label>
            <input
              type="text"
              value={modeName}
              onChange={(e) => onModeNameChange(e.target.value)}
              placeholder="default"
              className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            />
          </div>
        )}

        {/* Multi-mode detected — mode mapping */}
        {isMultiMode && detectedModes.length > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <p className="text-xs font-medium text-violet-700 mb-2">
              Multi-mode detected — map each key to a Figma mode name
            </p>
            <div className="space-y-1.5">
              {detectedModes.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-violet-600 w-20 shrink-0 truncate">
                    {key}
                  </span>
                  <span className="text-gray-400 text-xs">→</span>
                  <input
                    type="text"
                    value={modeMap[key] ?? key}
                    onChange={(e) => updateModeMap(key, e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-violet-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
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
