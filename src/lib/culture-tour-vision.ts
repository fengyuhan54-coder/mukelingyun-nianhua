function escapeJsonStringControlCharacters(value: string): string {
  let result = "";
  let insideString = false;
  let escaped = false;

  for (const character of value) {
    if (!insideString) {
      if (character === '"') insideString = true;
      result += character;
      continue;
    }

    if (escaped) {
      result += character;
      escaped = false;
    } else if (character === "\\") {
      result += character;
      escaped = true;
    } else if (character === '"') {
      result += character;
      insideString = false;
    } else if (character === "\n") {
      result += "\\n";
    } else if (character === "\r") {
      result += "\\r";
    } else if (character === "\t") {
      result += "\\t";
    } else {
      result += character;
    }
  }

  return result;
}

export function parseCultureTourJson(content: string): Record<string, unknown> {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  const objectText = start >= 0 && end > start
    ? withoutFence.slice(start, end + 1)
    : withoutFence;

  const candidates = [withoutFence, objectText, escapeJsonStringControlCharacters(objectText)];
  for (const candidate of candidates) {
    try {
      let parsed: unknown = JSON.parse(candidate);
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Continue with the next safe normalization.
    }
  }

  throw new Error("视觉模型返回的文化识别结果格式不完整");
}
