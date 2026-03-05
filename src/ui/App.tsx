import React, { useState, useEffect, useRef } from "react";
import type {
  Token,
  ImportResult,
  ImportPlanItem,
  AnalysisResult,
  ExistingVariableSnapshot,
  DuplicatePolicy,
  ImportMode,
  StyleImportResult,
} from "../shared/types.ts";
import { parseJSON } from "../core/parser.ts";
import { flattenTokens, flattenNestedModeTokens } from "../core/flattener.ts";
import { detectModes } from "../core/mode-detector.ts";
import { analyzeDuplicates, analyzeModeTokenMap } from "../core/duplicate-analyzer.ts";
import InputScreen from "./screens/InputScreen.tsx";
import PreviewScreen from "./screens/PreviewScreen.tsx";
import DuplicateReviewScreen from "./screens/DuplicateReviewScreen.tsx";
import ResultScreen from "./screens/ResultScreen.tsx";

type Screen = "input" | "preview" | "review" | "result";

interface Collection {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
}

function send(type: string, payload?: unknown) {
  parent.postMessage({ pluginMessage: { type, payload } }, "*");
}

function findCollectionByName(
  collections: Collection[],
  collectionName: string
): Collection | null {
  return collections.find((collection) => collection.name === collectionName) ?? null;
}

function matchCollectionModeName(
  collection: Collection | null,
  requestedModeName: string
): string {
  if (!collection) return requestedModeName;

  const exactMatch = collection.modes.find(
    (mode) => mode.name.toLowerCase() === requestedModeName.toLowerCase()
  );
  return exactMatch?.name ?? requestedModeName;
}

function suggestSingleModeName(collection: Collection | null): string {
  if (!collection || collection.modes.length === 0) return "default";

  const defaultLike = collection.modes.find((mode) =>
    ["default", "base"].includes(mode.name.toLowerCase())
  );
  if (defaultLike) return defaultLike.name;

  if (collection.modes.length === 1) return collection.modes[0].name;

  return "default";
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
  const [importMode, setImportMode] = useState<ImportMode>("variables");
  const [importResult, setImportResult] = useState<(ImportResult & { error?: string }) | null>(null);
  const [styleResult, setStyleResult] = useState<(StyleImportResult & { error?: string }) | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [policy, setPolicy] = useState<DuplicatePolicy>("conservative");

  // Tokens at point of "review" button click — used when snapshot arrives
  const pendingTokensRef = useRef<Token[]>([]);
  const pendingModeTokenMapRef = useRef<Record<string, Token[]>>({});

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

        case "VARIABLE_SNAPSHOT": {
          const snapshot = (msg.payload ?? []) as ExistingVariableSnapshot[];
          const hasPendingModes = Object.keys(pendingModeTokenMapRef.current).length > 0;
          const result = hasPendingModes
            ? analyzeModeTokenMap(pendingModeTokenMapRef.current, snapshot, policy)
            : analyzeDuplicates(pendingTokensRef.current, snapshot, policy);
          setAnalysis(result);
          setIsAnalyzing(false);
          if (result.hasConflicts) {
            setScreen("review");
          } else {
            handleConfirmReview(result.items);
          }
          break;
        }

        case "RESULT":
          setImportResult(msg.payload);
          setIsImporting(false);
          setScreen("result");
          break;

        case "STYLE_RESULT":
          setStyleResult(msg.payload);
          setIsImporting(false);
          setScreen("result");
          break;
      }
    };

    window.addEventListener("message", handler);
    send("GET_SETTINGS");
    send("GET_COLLECTIONS");
    return () => window.removeEventListener("message", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy]);

  const handleParse = () => {
    setParseError(null);
    const parsed = parseJSON(rawJson);

    if (!parsed.ok) {
      const detail = parsed.line ? ` (line ${parsed.line}, col ${parsed.column})` : "";
      setParseError(parsed.message + detail);
      return;
    }

    const collection = findCollectionByName(collections, collectionName);
    const modeResult = detectModes(parsed.data);

    if (modeResult.isMultiMode) {
      const data = parsed.data as Record<string, unknown>;
      const defaultModeMap: Record<string, string> = {};
      const tokenMap: Record<string, Token[]> = {};

      for (const key of modeResult.detectedModes) {
        defaultModeMap[key] = matchCollectionModeName(collection, key);
        tokenMap[key] = flattenTokens(data[key]);
      }

      setIsMultiMode(true);
      setDetectedModes(modeResult.detectedModes);
      setModeMap(defaultModeMap);
      setModeTokenMap(tokenMap);
      setTokens(tokenMap[modeResult.detectedModes[0]] ?? []);
    } else {
      const nestedModeResult = flattenNestedModeTokens(parsed.data);

      if (nestedModeResult.hasModeTokens) {
        const defaultModeMap: Record<string, string> = {};
        for (const key of nestedModeResult.detectedModes) {
          defaultModeMap[key] = matchCollectionModeName(collection, key);
        }

        setIsMultiMode(true);
        setDetectedModes(nestedModeResult.detectedModes);
        setModeMap(defaultModeMap);
        setModeTokenMap(nestedModeResult.modeTokenMap);
        setTokens(nestedModeResult.modeTokenMap[nestedModeResult.detectedModes[0]] ?? []);
      } else {
        setIsMultiMode(false);
        setDetectedModes([]);
        setModeMap({});
        setModeTokenMap({});
        setModeName(suggestSingleModeName(collection));
        setTokens(flattenTokens(parsed.data));
      }
    }

    setScreen("preview");
  };

  // User clicks "Import →" on PreviewScreen:
  // For styles modes, skip duplicate review and go straight to import.
  const handlePreviewImport = () => {
    send("SAVE_SETTINGS", { collectionName, modeName });

    if (importMode === "color-styles") {
      setIsImporting(true);
      send("CREATE_COLOR_STYLES", { tokens });
      return;
    }

    if (importMode === "text-styles") {
      setIsImporting(true);
      const allTokens = isMultiMode
        ? Object.values(modeTokenMap).flat()
        : tokens;
      send("CREATE_TEXT_STYLES", { tokens: allTokens });
      return;
    }

    if (isMultiMode) {
      const mapped: Record<string, Token[]> = {};
      for (const [key, name] of Object.entries(modeMap)) {
        mapped[name] = modeTokenMap[key];
      }
      pendingTokensRef.current = [];
      pendingModeTokenMapRef.current = mapped;
      setIsAnalyzing(true);
      send("GET_VARIABLE_SNAPSHOT", { collectionName, modeNames: Object.keys(mapped) });
    } else {
      pendingTokensRef.current = tokens;
      pendingModeTokenMapRef.current = {};
      setIsAnalyzing(true);
      send("GET_VARIABLE_SNAPSHOT", { collectionName, modeName });
    }
  };

  // User confirms import from DuplicateReviewScreen with resolved items
  const handleConfirmReview = (items: ImportPlanItem[]) => {
    setIsImporting(true);
    pendingModeTokenMapRef.current = {};
    send("EXECUTE_IMPORT_PLAN", { items, collectionName, modeName });
  };

  const handleReset = () => {
    setStyleResult(null);
    setImportResult(null);
    setScreen("input");
    setParseError(null);
    setTokens([]);
    setModeTokenMap({});
    setIsMultiMode(false);
    setDetectedModes([]);
    setAnalysis(null);
    setIsAnalyzing(false);
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
          collections={collections}
          importMode={importMode}
          onImportModeChange={setImportMode}
          parseError={parseError}
          onParse={handleParse}
        />
      )}

      {screen === "preview" && (
        <PreviewScreen
          tokens={tokens}
          collectionName={collectionName}
          modeName={modeName}
          isMultiMode={isMultiMode}
          detectedModes={detectedModes}
          modeMap={modeMap}
          onModeNameChange={setModeName}
          onModeMapChange={setModeMap}
          isImporting={isImporting || isAnalyzing}
          onImport={handlePreviewImport}
          onBack={() => setScreen("input")}
        />
      )}

      {screen === "review" && analysis && (
        <DuplicateReviewScreen
          analysis={analysis}
          policy={policy}
          onPolicyChange={(p) => {
            setPolicy(p);
            setIsAnalyzing(true);
            if (isMultiMode) {
              const mapped: Record<string, Token[]> = {};
              for (const [key, name] of Object.entries(modeMap)) {
                mapped[name] = modeTokenMap[key];
              }
              pendingTokensRef.current = [];
              pendingModeTokenMapRef.current = mapped;
              send("GET_VARIABLE_SNAPSHOT", { collectionName, modeNames: Object.keys(mapped) });
            } else {
              pendingTokensRef.current = tokens;
              pendingModeTokenMapRef.current = {};
              send("GET_VARIABLE_SNAPSHOT", { collectionName, modeName });
            }
            setScreen("preview");
          }}
          onConfirm={handleConfirmReview}
          onBack={() => setScreen("preview")}
          isImporting={isImporting}
        />
      )}

      {screen === "result" && (importResult || styleResult) && (
        <ResultScreen
          result={importResult ?? null}
          styleResult={styleResult ?? null}
          onReset={handleReset}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
