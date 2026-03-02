import type { ImportResult } from "../shared/types.ts";

export function buildSummary(result: ImportResult): string {
  const lines: string[] = [
    `✅ Created: ${result.created}`,
    `🔄 Updated: ${result.updated}`,
    `⏭️ Skipped: ${result.skipped}`,
  ];
  if (result.errors.length > 0) {
    lines.push(`❌ Errors: ${result.errors.length}`);
    result.errors.forEach((e) => lines.push(`  - ${e.path}: ${e.reason}`));
  }
  return lines.join("\n");
}
