import { SanitizedEvidence } from './ai-analysis.types';

const MAX_EVIDENCE_CHARACTERS = 12000;

const SENSITIVE_KEYS =
  /password|passwd|secret|token|authorization|cookie|api.?key|client.?secret|private.?key|credential/i;

function redactString(value: string): string {
  return value
    .replace(
      /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
      'Bearer [REDACTED]',
    )
    .replace(
      /\b(sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{16,})\b/g,
      '[REDACTED_API_KEY]',
    )
    .replace(
      /((?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\s*["']?\s*[:=]\s*["']?)[^,\s"'&}]+/gi,
      '$1[REDACTED]',
    )
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      '[REDACTED_EMAIL]',
    );
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[MAX_DEPTH]';

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) =>
      sanitizeValue(item, depth + 1),
    );
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEYS.test(key)
        ? '[REDACTED]'
        : sanitizeValue(item, depth + 1);
    }

    return output;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }

  return String(value);
}

export function sanitizeEvidence(input: unknown): SanitizedEvidence {
  const serialized = JSON.stringify(sanitizeValue(input), null, 2);
  const safeText = serialized ?? 'No evidence supplied';

  return {
    text: safeText.slice(0, MAX_EVIDENCE_CHARACTERS),
    truncated: safeText.length > MAX_EVIDENCE_CHARACTERS,
    originalCharacters: safeText.length,
  };
}
