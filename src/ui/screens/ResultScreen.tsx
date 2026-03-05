import React, { useState } from "react";
import type { ImportResult, StyleImportResult } from "../../shared/types.ts";

interface ResultScreenProps {
  result: (ImportResult & { error?: string }) | null;
  styleResult: (StyleImportResult & { error?: string }) | null;
  onReset: () => void;
  onClose: () => void;
}

export default function ResultScreen({ result, styleResult, onReset, onClose }: ResultScreenProps) {
  const [showErrors, setShowErrors] = useState(false);

  if (styleResult) {
    const errors = styleResult.errors ?? [];
    const hasErrors = errors.length > 0;
    const isSuccess = !styleResult.error && styleResult.created + styleResult.updated > 0;

    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">{styleResult.error ? "❌" : isSuccess ? "✅" : "⚠️"}</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {styleResult.error ? "Style creation failed" : "Styles created"}
              </h2>
              {styleResult.error && (
                <p className="text-xs text-red-600 mt-0.5">{styleResult.error}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {!styleResult.error && (
            <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <StatRow icon="✨" label="Created" value={styleResult.created} color="text-emerald-600" />
              <StatRow icon="🔄" label="Updated" value={styleResult.updated} color="text-blue-600" />
              <StatRow icon="⏭"  label="Skipped" value={styleResult.skipped} color="text-gray-400" />
              <StatRow icon="❌" label="Errors"  value={errors.length}       color="text-red-500" />
            </div>
          )}
          {hasErrors && (
            <div>
              <button type="button" onClick={() => setShowErrors((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                <span>{errors.length} error{errors.length !== 1 ? "s" : ""}</span>
                <span>{showErrors ? "▲ Hide" : "▼ Show"}</span>
              </button>
              {showErrors && (
                <div className="mt-1 rounded-lg border border-red-100 bg-red-50 p-2 space-y-1 max-h-40 overflow-y-auto">
                  {errors.map((e, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-mono text-red-700">{e.name}</span>
                      <span className="text-red-500 ml-1">— {e.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!styleResult.error && styleResult.created + styleResult.updated === 0 && !hasErrors && (
            <p className="text-xs text-gray-400 text-center pt-4">No styles were changed.</p>
          )}
        </div>

        <Footer onReset={onReset} onClose={onClose} />
      </div>
    );
  }

  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const isSuccess = !result.error && result.created + result.updated > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">{result.error ? "❌" : isSuccess ? "✅" : "⚠️"}</span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {result.error ? "Import failed" : "Import complete"}
            </h2>
            {result.error && (
              <p className="text-xs text-red-600 mt-0.5">{result.error}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {!result.error && (
          <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            <StatRow icon="✨" label="Created"   value={result.created}        color="text-emerald-600" />
            <StatRow icon="🔄" label="Updated"   value={result.updated}        color="text-blue-600" />
            <StatRow icon="🔗" label="Aliased"   value={result.aliased ?? 0}   color="text-violet-600" />
            <StatRow icon="＝" label="Unchanged"  value={result.unchanged ?? 0} color="text-gray-400" />
            <StatRow icon="⏭"  label="Skipped"   value={result.skipped}        color="text-gray-400" />
            <StatRow icon="❌" label="Errors"    value={result.errors.length}  color="text-red-500" />
          </div>
        )}
        {hasErrors && (
          <div>
            <button type="button" onClick={() => setShowErrors((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
              <span>{result.errors.length} error{result.errors.length !== 1 ? "s" : ""}</span>
              <span>{showErrors ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showErrors && (
              <div className="mt-1 rounded-lg border border-red-100 bg-red-50 p-2 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-mono text-red-700">{e.path}</span>
                    <span className="text-red-500 ml-1">— {e.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!result.error && result.created + result.updated === 0 && !hasErrors && (
          <p className="text-xs text-gray-400 text-center pt-4">No variables were changed.</p>
        )}
      </div>

      <Footer onReset={onReset} onClose={onClose} />
    </div>
  );
}

function Footer({ onReset, onClose }: { onReset: () => void; onClose: () => void }) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
      <button type="button" onClick={onReset}
        className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
        Import more
      </button>
      <button type="button" onClick={onClose}
        className="flex-1 py-2 text-xs font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors">
        Close
      </button>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-gray-600">
        <span>{icon}</span>
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
