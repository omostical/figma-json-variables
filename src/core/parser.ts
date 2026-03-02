export interface ParseSuccess {
  ok: true;
  data: unknown;
}

export interface ParseError {
  ok: false;
  message: string;
  line?: number;
  column?: number;
}

export type ParseResult = ParseSuccess | ParseError;

export function parseJSON(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, message: "Input is empty" };
  }

  try {
    const data = JSON.parse(trimmed);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof SyntaxError) {
      const message = err.message;
      const posMatch = message.match(/position (\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const lines = trimmed.substring(0, pos).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return { ok: false, message, line, column };
      }
      return { ok: false, message };
    }
    return { ok: false, message: String(err) };
  }
}
