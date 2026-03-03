import React, { useState } from "react";
import type {
  ImportPlanItem,
  AnalysisResult,
  ConflictKind,
  ImportAction,
  DuplicatePolicy,
} from "../../shared/types.ts";
import { applyBatchAction, setItemAction } from "../../core/duplicate-analyzer.ts";

interface DuplicateReviewScreenProps {
  analysis: AnalysisResult;
  policy: DuplicatePolicy;
  onPolicyChange: (p: DuplicatePolicy) => void;
  onConfirm: (items: ImportPlanItem[]) => void;
  onBack: () => void;
  isImporting: boolean;
}

const POLICY_LABELS: Record<DuplicatePolicy, string> = {
  conservative: "Conservative",
  update_by_name: "Update by name",
  deduplicate_by_value: "Deduplicate by value",
  strict: "Strict (no duplicates)",
};

const CONFLICT_META: Record<ConflictKind, { label: string; color: string; dot: string }> = {
  name_conflict:   { label: "Name conflicts",    color: "border-amber-200 bg-amber-50",  dot: "bg-amber-400" },
  value_duplicate: { label: "Value duplicates",  color: "border-violet-200 bg-violet-50", dot: "bg-violet-400" },
  exact_match:     { label: "Exact matches",     color: "border-gray-200 bg-gray-50",    dot: "bg-gray-400" },
  type_conflict:   { label: "Type conflicts",    color: "border-red-200 bg-red-50",      dot: "bg-red-500" },
  clean:           { label: "Clean",             color: "",                               dot: "" },
};

const ACTION_OPTIONS: Record<ConflictKind, Array<{ value: ImportAction; label: string }>> = {
  name_conflict:   [{ value: "skip", label: "Skip" }, { value: "update", label: "Update" }],
  value_duplicate: [{ value: "create", label: "Keep both" }, { value: "skip", label: "Skip" }, { value: "alias_to_existing", label: "Alias to existing" }],
  exact_match:     [{ value: "unchanged", label: "Skip (unchanged)" }, { value: "update", label: "Force update" }],
  type_conflict:   [{ value: "error", label: "Error (blocked)" }],
  clean:           [{ value: "create", label: "Create" }],
};

export default function DuplicateReviewScreen({
  analysis: initialAnalysis,
  policy,
  onPolicyChange,
  onConfirm,
  onBack,
  isImporting,
}: DuplicateReviewScreenProps) {
  const [items, setItems] = useState<ImportPlanItem[]>(initialAnalysis.items);
  const [open, setOpen] = useState<Record<ConflictKind, boolean>>({
    name_conflict: true,
    value_duplicate: true,
    exact_match: false,
    type_conflict: true,
    clean: false,
  });

  const groups: ConflictKind[] = ["type_conflict", "name_conflict", "value_duplicate", "exact_match"];

  const byKind = (kind: ConflictKind) =>
    items.filter((i) => i.conflictKind === kind && i.token.type !== "SKIP");

  const handleBatch = (kind: ConflictKind, action: ImportAction) => {
    setItems((prev) => applyBatchAction(prev, kind, action));
  };

  const handleItemAction = (path: string, action: ImportAction, aliasTarget?: string, modeName?: string) => {
    setItems((prev) => setItemAction(prev, path, action, aliasTarget, modeName));
  };

  const importable = items.filter((i) => i.finalAction !== "skip" && i.finalAction !== "unchanged" && i.finalAction !== "error").length;
  const cleanCount = items.filter((i) => i.conflictKind === "clean" && i.token.type !== "SKIP").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center gap-2">
        <button type="button" onClick={onBack} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">
          ← Preview
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900">Review conflicts</p>
          <p className="text-[10px] text-gray-400">
            {cleanCount} clean · {initialAnalysis.counts.exactMatch} exact · {initialAnalysis.counts.nameConflict} name · {initialAnalysis.counts.valueDuplicate} value-dup · {initialAnalysis.counts.typeConflict} type
          </p>
        </div>
      </div>

      {/* Policy picker */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide shrink-0">Policy</span>
        <select
          value={policy}
          onChange={(e) => onPolicyChange(e.target.value as DuplicatePolicy)}
          className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {(Object.keys(POLICY_LABELS) as DuplicatePolicy[]).map((p) => (
            <option key={p} value={p}>{POLICY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {/* Conflict groups */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {groups.map((kind) => {
          const group = byKind(kind);
          if (group.length === 0) return null;
          const meta = CONFLICT_META[kind];
          const isOpen = open[kind];

          return (
            <div key={kind} className={`border-l-2 ${meta.color.split(" ")[0]}`}>
              {/* Group header */}
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                onClick={() => setOpen((p) => ({ ...p, [kind]: !p[kind] }))}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <span className={`inline-block w-2 h-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                  <span className="text-gray-400 font-normal">({group.length})</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {kind !== "type_conflict" && (
                    <BatchButtons kind={kind} onBatch={handleBatch} />
                  )}
                  <span className="text-gray-300 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Rows */}
              {isOpen && (
                <div className="pb-1">
                  {group.map((item) => (
                    <ConflictRow
                      key={`${item.modeName ?? "default"}:${item.token.path}`}
                      item={item}
                      onChange={handleItemAction}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {cleanCount > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400">
            + {cleanCount} new token{cleanCount !== 1 ? "s" : ""} will be created
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          disabled={isImporting}
          onClick={() => onConfirm(items)}
          className="w-full py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
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
            `Import ${importable} token${importable !== 1 ? "s" : ""} →`
          )}
        </button>
      </div>
    </div>
  );
}

// ── Batch buttons ─────────────────────────────────────────────────────────────

const BATCH_ACTIONS: Record<ConflictKind, Array<{ action: ImportAction; label: string; style: string }>> = {
  name_conflict: [
    { action: "skip",   label: "Skip all",   style: "text-gray-600 bg-gray-100 hover:bg-gray-200" },
    { action: "update", label: "Update all", style: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
  ],
  value_duplicate: [
    { action: "create", label: "Keep all",   style: "text-gray-600 bg-gray-100 hover:bg-gray-200" },
    { action: "skip",   label: "Skip all",   style: "text-gray-600 bg-gray-100 hover:bg-gray-200" },
  ],
  exact_match: [
    { action: "unchanged", label: "Skip all",    style: "text-gray-600 bg-gray-100 hover:bg-gray-200" },
    { action: "update",    label: "Update all",  style: "text-blue-600 bg-blue-50 hover:bg-blue-100" },
  ],
  type_conflict: [],
  clean: [],
};

function BatchButtons({
  kind,
  onBatch,
}: {
  kind: ConflictKind;
  onBatch: (kind: ConflictKind, action: ImportAction) => void;
}) {
  const actions = BATCH_ACTIONS[kind];
  return (
    <div className="flex gap-1">
      {actions.map(({ action, label, style }) => (
        <button
          key={action}
          type="button"
          onClick={(e) => { e.stopPropagation(); onBatch(kind, action); }}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${style}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Per-token row ─────────────────────────────────────────────────────────────

function ValueChip({ label, isColor }: { label: string; isColor: boolean }) {
  const isHex = /^#[0-9a-f]{3,8}$/i.test(label.trim());
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px]">
      {isColor && isHex && (
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm border border-black/10 shrink-0"
          style={{ backgroundColor: label }}
        />
      )}
      <span className="truncate max-w-[80px]">{label}</span>
    </span>
  );
}

function rawColorHex(v: unknown): string {
  if (!v || typeof v !== "object") return String(v ?? "—");
  if ("r" in v) {
    const c = v as { r: number; g: number; b: number; a: number };
    const hex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
    return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
  }
  if ("kind" in v) return `→ ${(v as unknown as { path: string }).path}`;
  return String(v);
}

function ConflictRow({
  item,
  onChange,
}: {
  item: ImportPlanItem;
  onChange: (path: string, action: ImportAction, aliasTarget?: string, modeName?: string) => void;
}) {
  const opts = ACTION_OPTIONS[item.conflictKind];
  const isTypeConflict = item.conflictKind === "type_conflict";

  const incomingLabel = rawColorHex(item.token.rawValue);
  const existingLabel = item.existingByName ? rawColorHex(item.existingByName.modeValue) : null;

  return (
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-mono text-gray-800 truncate">{item.token.path}</p>
          {item.modeName && (
            <span className="px-1 py-0.5 rounded bg-blue-50 text-[9px] font-medium text-blue-600 shrink-0">
              {item.modeName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          <span className="text-[10px] text-gray-400">New:</span>
          <ValueChip label={incomingLabel} isColor={item.token.type === "COLOR"} />
          {existingLabel && (
            <>
              <span className="text-[10px] text-gray-400">Old:</span>
              <ValueChip label={existingLabel} isColor={item.token.type === "COLOR"} />
            </>
          )}
          {item.conflictKind === "value_duplicate" && item.duplicatesByValue.length > 0 && (
            <span className="text-[10px] text-violet-500 truncate max-w-[120px]">
              ≡ {item.duplicatesByValue[0].name}
            </span>
          )}
        </div>
      </div>
      {isTypeConflict ? (
        <span className="text-[10px] text-red-500 shrink-0 mt-0.5">
          {item.existingByName?.type} ≠ {item.token.type}
        </span>
      ) : (
        <select
          value={item.finalAction}
          onChange={(e) => {
            const action = e.target.value as ImportAction;
            const aliasTarget =
              action === "alias_to_existing" && item.duplicatesByValue.length > 0
                ? item.duplicatesByValue[0].name
                : undefined;
            onChange(item.token.path, action, aliasTarget, item.modeName);
          }}
          className="text-[10px] border border-gray-200 rounded px-1 py-0.5 shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
