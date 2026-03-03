import React from "react";
import type { Token } from "../../shared/types.ts";

interface TokenRowProps {
  token: Token;
}

function ColorSwatch({ hex }: { hex: string }) {
  const isHex = /^#[0-9a-f]{3,8}$/i.test(hex.trim());
  return (
    <span className="inline-flex items-center gap-1.5">
      {isHex && (
        <span
          className="inline-block w-3 h-3 rounded-sm border border-black/10 shrink-0"
          style={{ backgroundColor: hex }}
        />
      )}
      <span className="font-mono text-xs truncate max-w-[120px]">{hex}</span>
    </span>
  );
}

const TYPE_BADGE: Record<string, string> = {
  COLOR: "bg-blue-100 text-blue-700",
  FLOAT: "bg-emerald-100 text-emerald-700",
  BOOLEAN: "bg-amber-100 text-amber-700",
  ALIAS: "bg-violet-100 text-violet-700",
  SKIP: "bg-gray-100 text-gray-500",
};

function ValuePreview({ token }: { token: Token }) {
  if (token.type === "SKIP" || token.normalizedValue === null) {
    return <span className="text-gray-400 text-xs italic">—</span>;
  }

  if (token.type === "COLOR") {
    const raw = String(token.rawValue);
    return <ColorSwatch hex={raw} />;
  }

  if (token.type === "ALIAS") {
    const alias = token.normalizedValue as { kind: string; path: string };
    return (
      <span className="text-xs font-mono text-violet-600 truncate max-w-[140px]">
        → {alias.path}
      </span>
    );
  }

  return (
    <span className="text-xs font-mono text-gray-700">
      {String(token.normalizedValue)}
    </span>
  );
}

export default function TokenRow({ token }: TokenRowProps) {
  const badgeClass = TYPE_BADGE[token.type] ?? TYPE_BADGE.SKIP;
  const isSkip = token.type === "SKIP";

  return (
    <tr className={`border-b border-gray-100 ${isSkip ? "opacity-40" : ""}`}>
      <td className="py-1.5 pl-3 pr-2 max-w-0 w-1/2">
        <span
          className="block truncate text-xs text-gray-800 font-mono"
          title={token.path}
        >
          {token.path}
        </span>
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeClass}`}
        >
          {token.type}
        </span>
      </td>
      <td className="py-1.5 pl-2 pr-3">
        <ValuePreview token={token} />
      </td>
    </tr>
  );
}
