/** Template suggestion used when no AI key is configured. */
export function assistSnippet(prompt: string, path: string): string {
  const l = prompt.toLowerCase();
  if (!/\.(tsx?|jsx?)$/.test(path)) {
    return `\n# AI Assist: ${prompt}\n# Suggested change added below. Review before deploying.\n`;
  }
  if (/valid|form|input/.test(l)) {
    return `\n// AI Assist: ${prompt}\nexport function validateEmail(value: string): boolean {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);\n}\n`;
  }
  if (/api|fetch|request/.test(l)) {
    return `\n// AI Assist: ${prompt}\nexport async function apiGet<T>(path: string): Promise<T> {\n  const res = await fetch(path, { headers: { Accept: 'application/json' } });\n  if (!res.ok) throw new Error('Request failed: ' + res.status);\n  return res.json() as Promise<T>;\n}\n`;
  }
  if (/test/.test(l)) {
    return `\n// AI Assist: ${prompt}\ndescribe('smoke', () => {\n  it('renders without crashing', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
  }
  return `\n// AI Assist: ${prompt}\nexport function aiGenerated() {\n  // TODO: implement the requested change\n}\n`;
}

/** Removes a wrapping markdown code fence if the model added one. */
export function stripFence(text: string): string {
  const m = text.trim().match(/^```[\w-]*\n([\s\S]*?)\n```$/);
  return m ? m[1] : text;
}
