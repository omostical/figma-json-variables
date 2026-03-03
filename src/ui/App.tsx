import React, { useState, useEffect } from "react";
import type { Token, ImportResult } from "../shared/types.ts";
import { parseJSON } from "../core/parser.ts";
import { flattenTokens } from "../core/flattener.ts";
import { detectModes } from "../core/mode-detector.ts";
import InputScreen from "./screens/InputScreen.tsx";
import PreviewScreen from "./screens/PreviewScreen.tsx";
import ResultScreen from "./screens/ResultScreen.tsx";

type Screen = "input" | "preview" | "result";

interface Collection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
}

function send(type: string, payload?: unknown) {
  parent.postMessage({ pluginMessage: { type, payload } }, "*");
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("input");
  const [rawJson, setRawJson] = useState("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [detectedModes, setDetectedModes] = useState<string[]>([]);
  const [modeMap, setModeMap] = useState<Record<string, string>>({});
  const [modeTokenMap, setModeTokenMap] = useState<Record<string, Token[]>>({});
  const [collectionName, setCollectionName] = useState("My Tokens");
  const [modeName, setModeName] = useState("default");
  const [importResult, setImportResult] = useState<(ImportResult & { error?: string }) | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // M6: Listen for Figma messages + request initial data
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case "SETTINGS": {
          const s = msg.payload as { collectionName?: string; modeName?: string } | null;
          if (s?.collectionName) setCollectionName(s.collectionName);
          if (s?.modeName) setModeName(s.modeName);
          break;
        }
        case "COLLECTIONS":
          setCollections(msg.payload ?? []);
          break;
        case "RESULT":
          setImportResult(msg.payload);
          setIsImporting(false);
          setScreen("result");
          break;
      }
    };

    window.addEventListener("message", handler);
    send("GET_SETTINGS");
    send("GET_COLLECTIONS");
    return () => window.removeEventListener("message", handler);
  }, []);

  // M5 + M4: Parse JSON, detect modes, flatten tokens
  const handleParse = () => {
    setParseError(null);
    const parsed = parseJSON(rawJson);

    if (!parsed.ok) {
      const detail = parsed.line ? ` (line ${parsed.line}, col ${parsed.column})` : "";
      setParseError(parsed.message + detail);
      return;
    }

    const modeResult = detectModes(parsed.data);

    if (modeResult.isMultiMode) {
      const data = parsed.data as Record<string, unknown>;
      const defaultModeMap: Record<string, string> = {};
      const tokenMap: Record<string, Token[]> = {};

      for (const key of modeResult.detectedModes) {
        defaultModeMap[key] = key;
        tokenMap[key] = flattenTokens(data[key]);
      }

      setIsMultiMode(true);
      setDetectedModes(modeResult.detectedModes);
      setModeMap(defaultModeMap);
      setModeTokenMap(tokenMap);
      // Preview shows first mode's tokens
      setTokens(tokenMap[modeResult.detectedModes[0]] ?? []);
    } else {
      setIsMultiMode(false);
      setDetectedModes([]);
      setModeMap({});
      setModeTokenMap({});
      setTokens(flattenTokens(parsed.data));
    }

    setScreen("preview");
  };

  // M3: Send import to plugin main thread
  const handleImport = () => {
    setIsImporting(true);

    // M6: Persist settings
    send("SAVE_SETTINGS", { collectionName, modeName });

    if (isMultiMode) {
      const mapped: Record<string, Token[]> = {};
      for (const [key, name] of Object.entries(modeMap)) {
        mapped[name] = modeTokenMap[key];
      }
      send("IMPORT_MULTIMODE", { modeTokenMap: mapped, collectionName });
    } else {
      send("IMPORT", { tokens, collectionName, modeName });
    }
  };

  const handleReset = () => {
    setScreen("input");
    setImportResult(null);
    setParseError(null);
    setTokens([]);
    setModeTokenMap({});
    setIsMultiMode(false);
    setDetectedModes([]);
  };

  const handleClose = () => send("CLOSE");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white" style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 13 }}>
      {screen === "input" && (
        <InputScreen
          rawJson={rawJson}
          onRawJsonChange={setRawJson}
          collectionName={collectionName}
          onCollectionNameChange={setCollectionName}
          modeName={modeName}
          onModeNameChange={setModeName}
          collections={collections}
          parseError={parseError}
          isMultiMode={isMultiMode}
          detectedModes={detectedModes}
          modeMap={modeMap}
          onModeMapChange={setModeMap}
          onParse={handleParse}
        />
      )}

      {screen === "preview" && (
        <PreviewScreen
          tokens={tokens}
          collectionName={collectionName}
          modeName={modeName}
          isMultiMode={isMultiMode}
          modeMap={modeMap}
          isImporting={isImporting}
          onImport={handleImport}
          onBack={() => setScreen("input")}
        />
      )}

      {screen === "result" && importResult && (
        <ResultScreen
          result={importResult}
          onReset={handleReset}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
