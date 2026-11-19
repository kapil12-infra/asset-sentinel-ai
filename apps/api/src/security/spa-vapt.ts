import { createHash } from 'node:crypto';
import type {
  Severity,
  SpaChecklistItem,
  SpaFinding,
  SpaPhase,
} from '@asset-sentinel/shared';

export const PHASE_TITLES: Record<SpaPhase, string> = {
  1: 'Client-side reconnaissance and source mapping',
  2: 'Dynamic crawling and traffic interception',
  3: 'Client-side vulnerability assessment',
  4: 'Backend API testing (REST and GraphQL)',
};

export const SPA_CHECKLIST: SpaChecklistItem[] = [
  {
    id: 'p1-sourcemaps',
    phase: 1,
    title: 'Locate and inspect source maps',
    tool: 'Built-in source-map analyzer',
    how: 'Identify uploaded maps, parse sourcesContent and inspect bundle references.',
    automated: true,
  },
  {
    id: 'p1-endpoints',
    phase: 1,
    title: 'Extract API endpoints',
    tool: 'Built-in endpoint extractor',
    how: 'Inspect fetch, Axios, API base URLs and common API route literals.',
    automated: true,
  },
  {
    id: 'p1-secrets',
    phase: 1,
    title: 'Detect exposed credentials',
    tool: 'Built-in secret heuristics',
    how: 'Identify provider token formats and credential assignments with redacted evidence.',
    automated: true,
  },
  {
    id: 'p2-ajax',
    phase: 2,
    title: 'Configure an AJAX spider',
    tool: 'OWASP ZAP AJAX Spider',
    how: 'Render the authorized SPA and discover client-side routes.',
    automated: false,
  },
  {
    id: 'p2-proxy',
    phase: 2,
    title: 'Intercept backend API traffic',
    tool: 'Burp Suite Community, Caido',
    how: 'Inspect requests and responses in an authorized test environment.',
    automated: false,
  },
  {
    id: 'p2-openapi',
    phase: 2,
    title: 'Map the API surface',
    tool: 'OWASP ZAP OpenAPI',
    how: 'Import an authorized OpenAPI or Postman specification.',
    automated: false,
  },
  {
    id: 'p3-domxss',
    phase: 3,
    title: 'DOM-based XSS',
    tool: 'Browser DevTools, DOM Invader',
    how: 'Trace untrusted input into dangerous DOM sinks.',
    automated: false,
  },
  {
    id: 'p3-storage',
    phase: 3,
    title: 'Browser storage hygiene',
    tool: 'Chrome DevTools',
    how: 'Review session token storage and cookie protections.',
    automated: false,
  },
  {
    id: 'p3-clientauthz',
    phase: 3,
    title: 'Client-side authorization',
    tool: 'Browser DevTools',
    how: 'Verify that server-side authorization protects restricted resources.',
    automated: false,
  },
  {
    id: 'p4-bola',
    phase: 4,
    title: 'Broken object level authorization',
    tool: 'Burp Repeater, OWASP ZAP',
    how: 'Test tenant isolation using authorized test accounts.',
    automated: false,
  },
  {
    id: 'p4-massassign',
    phase: 4,
    title: 'Mass assignment',
    tool: 'Burp Repeater',
    how: 'Verify DTO validation and server-side field allow-lists.',
    automated: false,
  },
  {
    id: 'p4-graphql',
    phase: 4,
    title: 'GraphQL security',
    tool: 'InQL, OWASP ZAP',
    how: 'Review introspection, query depth and complexity controls.',
    automated: false,
  },
  {
    id: 'p4-cors',
    phase: 4,
    title: 'CORS configuration',
    tool: 'curl, Burp Suite',
    how: 'Review allowed origins and credential behavior.',
    automated: false,
  },
];

type SourceFile = {
  path: string;
  content: string;
};

type Rule = {
  phase: SpaPhase;
  check: string;
  severity: Severity;
  files: RegExp;
  pattern: RegExp;
  detail: string;
  fix: string;
  escalateTo?: Severity;
  escalateIf?: RegExp;
};

const CLIENT = /\.(tsx?|jsx?|vue|html)$/i;
const SERVER = /\.(tsx?|jsx?)$/i;
const ANY = /\.(tsx?|jsx?|vue|html|json|env|ya?ml|cfg|conf|md)$/i;
const SOURCES = /(window\.location|location\.(hash|search|href)|document\.referrer|document\.URL)/i;

const MAX_FINDINGS_PER_RULE = 20;
const MAX_FINDINGS_TOTAL = 500;
const MAX_EVIDENCE_LENGTH = 240;
const MAX_SOURCE_MAP_SOURCES = 200;

const RULES: Rule[] = [
  {
    phase: 1,
    check: 'Hardcoded AWS access key',
    severity: 'Critical',
    files: ANY,
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    detail: 'A string matching the AWS access key ID format was found.',
    fix: 'Revoke the credential if valid, rotate it and use an IAM role or secrets manager.',
  },
  {
    phase: 1,
    check: 'Hardcoded private key',
    severity: 'Critical',
    files: ANY,
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    detail: 'A private-key header was found in project source.',
    fix: 'Revoke or rotate the key, remove it from repository history and use secure secret storage.',
  },
  {
    phase: 1,
    check: 'Hardcoded GitHub token',
    severity: 'High',
    files: ANY,
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,255}\b/g,
    detail: 'A string matching a GitHub token format was found.',
    fix: 'Revoke the token if valid and replace it with a least-privilege credential.',
  },
  {
    phase: 1,
    check: 'Hardcoded Slack token',
    severity: 'High',
    files: ANY,
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    detail: 'A string matching a Slack token format was found.',
    fix: 'Revoke the token if valid and use a secret manager.',
  },
  {
    phase: 1,
    check: 'Hardcoded Google API key',
    severity: 'High',
    files: ANY,
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    detail: 'A string matching a Google API key format was found.',
    fix: 'Restrict or rotate the key and keep server-side credentials out of browser bundles.',
  },
  {
    phase: 1,
    check: 'Hardcoded provider token',
    severity: 'High',
    files: ANY,
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    detail: 'A string matching a provider API token format was found.',
    fix: 'Revoke the credential if valid and load it from a secure runtime secret.',
  },
  {
    phase: 1,
    check: 'Hardcoded credential assignment',
    severity: 'High',
    files: ANY,
    pattern: /\b(api[_-]?key|secret|passwd|password|jwt[_-]?secret|client[_-]?secret)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/gi,
    detail: 'A credential-like configuration assignment was found.',
    fix: 'Use environment variables or a secrets manager. Rotate the value if it is real.',
  },
  {
    phase: 1,
    check: 'Source map reference in bundle',
    severity: 'Low',
    files: /\.(js|css|html)$/i,
    pattern: /\/\/[#@]\s*sourceMappingURL\s*=\s*\S+|\/\*[#@]\s*sourceMappingURL\s*=\s*[^*]+\*\//gi,
    detail: 'A source file references a source map.',
    fix: 'Do not publish source maps publicly unless exposure is intentional.',
  },
  {
    phase: 1,
    check: 'Source maps enabled in build config',
    severity: 'Medium',
    files: /(vite|webpack|rollup|next)\.config\.\w+$|angular\.json$/i,
    pattern: /(sourcemap|productionSourceMap|devtool)\s*[:=]\s*(true|['"]source-map['"]|['"]hidden-source-map['"])/gi,
    detail: 'The build configuration appears to enable source maps.',
    fix: 'Disable public production source maps or upload them privately to an error-monitoring service.',
  },
  {
    phase: 1,
    check: 'Hardcoded non-production endpoint',
    severity: 'Low',
    files: ANY,
    pattern: /https?:\/\/[\w.-]*(?:staging|stage|dev|test|internal|uat|localhost)[\w.-]*(?::\d+)?[^\s'"`]*/gi,
    detail: 'A development, staging or internal endpoint appears in source.',
    fix: 'Review whether the endpoint should be exposed and configure environment-specific API URLs.',
  },
  {
    phase: 3,
    check: 'dangerouslySetInnerHTML',
    severity: 'Medium',
    files: CLIENT,
    pattern: /dangerouslySetInnerHTML/g,
    detail: 'Raw HTML is injected into the DOM.',
    fix: 'Render text normally or sanitize HTML with a trusted sanitizer such as DOMPurify.',
    escalateTo: 'High',
    escalateIf: SOURCES,
  },
  {
    phase: 3,
    check: 'innerHTML / outerHTML assignment',
    severity: 'Medium',
    files: CLIENT,
    pattern: /\.(?:inner|outer)HTML\s*=/g,
    detail: 'An HTML DOM sink is assigned a string.',
    fix: 'Prefer textContent or sanitize untrusted HTML before insertion.',
    escalateTo: 'High',
    escalateIf: SOURCES,
  },
  {
    phase: 3,
    check: 'document.write',
    severity: 'Medium',
    files: CLIENT,
    pattern: /document\.write(?:ln)?\s*\(/g,
    detail: 'document.write can introduce unsafe HTML into the document.',
    fix: 'Build DOM nodes with safe DOM APIs instead.',
  },
  {
    phase: 3,
    check: 'eval / Function constructor',
    severity: 'High',
    files: CLIENT,
    pattern: /\beval\s*\(|new\s+Function\s*\(/g,
    detail: 'Dynamic code execution was detected.',
    fix: 'Remove dynamic code execution and use explicit parsing and application logic.',
  },
  {
    phase: 3,
    check: 'Auth token stored in web storage',
    severity: 'Medium',
    files: CLIENT,
    pattern: /(?:local|session)Storage\.setItem\(\s*['"`][^'"`]*(?:token|jwt|auth|session|secret)[^'"`]*['"`]/gi,
    detail: 'Authentication-related data appears to be stored in browser web storage.',
    fix: 'Prefer Secure, HttpOnly and SameSite cookies for session credentials where appropriate.',
  },
  {
    phase: 3,
    check: 'Client-side role gating',
    severity: 'Low',
    files: CLIENT,
    pattern: /\b(?:isAdmin|is_admin|user\.role\s*===?\s*['"]admin['"])/g,
    detail: 'The frontend contains role-based UI logic.',
    fix: 'Treat client-side checks as presentation only and enforce authorization on the server.',
  },
  {
    phase: 4,
    check: 'CORS allows any origin',
    severity: 'Medium',
    files: SERVER,
    pattern: /origin\s*:\s*(?:true|['"]\*['"])|Access-Control-Allow-Origin['"]?\s*,\s*['"]\*['"]/gi,
    detail: 'A permissive CORS configuration appears to allow arbitrary origins.',
    fix: 'Use an explicit origin allow-list and review credential handling.',
  },
  {
    phase: 4,
    check: 'Possible mass assignment',
    severity: 'Medium',
    files: SERVER,
    pattern: /(?:data\s*:\s*(?:req|request)\.body\b|\.\.\.\s*(?:req|request)\.body\b|Object\.assign\([^)]*(?:req|request)\.body)/g,
    detail: 'Request body data appears to be passed directly into a write operation.',
    fix: 'Validate input with DTO allow-lists and explicitly select writable fields.',
  },
  {
    phase: 4,
    check: 'Possible BOLA / IDOR',
    severity: 'Medium',
    files: SERVER,
    pattern: /(?:findUnique|findById|findOne|delete|update)\(\s*\{\s*where\s*:\s*\{\s*id\s*:\s*(?:req|request)\.params\.id/g,
    detail: 'A database operation appears to use a URL resource ID without a visible ownership condition.',
    fix: 'Enforce authenticated user or tenant ownership in the database query.',
  },
  {
    phase: 4,
    check: 'GraphQL introspection enabled',
    severity: 'Medium',
    files: SERVER,
    pattern: /introspection\s*:\s*true/g,
    detail: 'GraphQL introspection appears to be enabled.',
    fix: 'Review production introspection policy and restrict schema access where required.',
  },
];

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function redactEvidence(value: string): string {
  return value
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]')
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,255}\b/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED_SLACK_TOKEN]')
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, '[REDACTED_GOOGLE_KEY]')
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_PROVIDER_TOKEN]')
    .replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(
      /\b(api[_-]?key|secret|passwd|password|jwt[_-]?secret|client[_-]?secret)(\s*[:=]\s*)['"][^'"]+['"]/gi,
      '$1$2[REDACTED]',
    )
    .slice(0, MAX_EVIDENCE_LENGTH);
}

function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

export function analyzeFiles(files: SourceFile[]): SpaFinding[] {
  const findings: SpaFinding[] = [];
  const seen = new Set<string>();
  const counts = new Map<string, number>();

  const push = (
    phase: SpaPhase,
    check: string,
    severity: Severity,
    path: string,
    line: number,
    detail: string,
    fix: string,
    evidence: string,
    confidence: 'low' | 'medium' | 'high' = 'medium',
  ) => {
    if (findings.length >= MAX_FINDINGS_TOTAL) return;

    const count = counts.get(check) ?? 0;
    if (count >= MAX_FINDINGS_PER_RULE) return;

    const key = `${check}|${path}|${line}`;
    if (seen.has(key)) return;

    seen.add(key);
    counts.set(check, count + 1);

    findings.push({
      id: `spa-${fingerprint(key)}`,
      phase,
      check,
      severity,
      location: `${path}:${line}`,
      detail,
      fix,
      source: 'static',
      confidence,
      evidence: redactEvidence(evidence),
      verified: false,
    });
  };

  const eligible = files.filter((file) => {
    if (/(^|\/)(node_modules|\.git)\//i.test(file.path)) return false;
    if (file.path.startsWith('/') || file.path.split('/').includes('..')) return false;
    return true;
  });

  // First inspect source maps and embedded original source.
  for (const file of eligible) {
    if (!/\.map$/i.test(file.path)) continue;

    push(
      1,
      'Source map file uploaded',
      'Medium',
      file.path,
      1,
      'A source-map file exists in the uploaded project. This does not by itself prove public deployment exposure.',
      'Keep production source maps private or remove them from public deployment artifacts.',
      'Source map file present',
      'high',
    );

    if (file.content.length > 500000) continue;

    try {
      const parsed: unknown = JSON.parse(file.content);
      if (!parsed || typeof parsed !== 'object') continue;

      const map = parsed as {
        version?: unknown;
        sources?: unknown;
        sourcesContent?: unknown;
      };

      if (
        map.version !== 3 ||
        !Array.isArray(map.sources) ||
        !Array.isArray(map.sourcesContent)
      ) continue;

      const total = Math.min(
        map.sources.length,
        map.sourcesContent.length,
        MAX_SOURCE_MAP_SOURCES,
      );

      for (let index = 0; index < total; index++) {
        const source = map.sources[index];
        const content = map.sourcesContent[index];

        if (typeof source !== 'string' || typeof content !== 'string') continue;

        const virtualPath = `${file.path}::${source.replace(/^\/+/, '')}`;

        for (const rule of RULES) {
          if (rule.phase !== 1 || !rule.files.test(source)) continue;

          rule.pattern.lastIndex = 0;
          let match: RegExpExecArray | null;

          while ((match = rule.pattern.exec(content)) !== null) {
            const line = lineNumber(content, match.index);
            push(
              rule.phase,
              rule.check,
              rule.severity,
              virtualPath,
              line,
              rule.detail,
              rule.fix,
              content.split('\n')[line - 1] ?? '',
            );

            if (match[0].length === 0) {
              rule.pattern.lastIndex++;
            }
          }
        }
      }
    } catch {
      // Invalid or non-JSON maps are reported as files, not parsed.
    }
  }

  // Inspect normal project source.
  for (const file of eligible) {
    if (/\.map$/i.test(file.path)) continue;

    for (const rule of RULES) {
      if (!rule.files.test(file.path)) continue;

      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(file.content)) !== null) {
        const line = lineNumber(file.content, match.index);
        const lines = file.content.split('\n');
        const context = lines.slice(Math.max(0, line - 3), line + 2).join('\n');

        const escalated =
          rule.escalateIf?.test(context) && rule.escalateTo
            ? rule.escalateTo
            : rule.severity;

        push(
          rule.phase,
          rule.check,
          escalated,
          file.path,
          line,
          rule.detail,
          rule.fix,
          lines[line - 1] ?? '',
        );

        if (match[0].length === 0) rule.pattern.lastIndex++;
      }
    }
  }

  return findings;
}

export interface SpaDiscoveredEndpoint {
  path: string;
  sourceFile: string;
  line: number;
  method: string;
}

const ENDPOINT_PATTERNS: { method: string; pattern: RegExp }[] = [
  { method: 'FETCH', pattern: /\bfetch\s*\(\s*(['"`])([^'"`]+)\1/g },
  { method: 'GET', pattern: /\baxios\.get\s*\(\s*(['"`])([^'"`]+)\1/gi },
  { method: 'POST', pattern: /\baxios\.post\s*\(\s*(['"`])([^'"`]+)\1/gi },
  { method: 'PUT', pattern: /\baxios\.put\s*\(\s*(['"`])([^'"`]+)\1/gi },
  { method: 'PATCH', pattern: /\baxios\.patch\s*\(\s*(['"`])([^'"`]+)\1/gi },
  { method: 'DELETE', pattern: /\baxios\.delete\s*\(\s*(['"`])([^'"`]+)\1/gi },
  { method: 'BASE_URL', pattern: /\bbaseURL\s*:\s*(['"`])([^'"`]+)\1/gi },
  { method: 'API_URL', pattern: /\b(?:API_URL|VITE_API_URL|NEXT_PUBLIC_API_URL)\s*[:=]\s*(['"`])([^'"`]+)\1/gi },
];

function normalizeEndpoint(raw: string): string | null {
  const value = raw.trim();

  if (!value || value.startsWith('//')) return null;
  if (/^(?:javascript|data):/i.test(value)) return null;
  if (/\$\{|<%|%>/g.test(value)) return null;

  try {
    if (/^https?:\/\//i.test(value)) {
      const parsed = new URL(value);
      return parsed.origin + parsed.pathname;
    }

    if (value.startsWith('/')) return value.split(/[?#]/, 1)[0];

    if (/^(?:api|graphql|v\d+)\//i.test(value)) {
      return `/${value.split(/[?#]/, 1)[0]}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function extractEndpoints(
  files: SourceFile[],
): SpaDiscoveredEndpoint[] {
  const results: SpaDiscoveredEndpoint[] = [];
  const seen = new Set<string>();

  const add = (
    raw: string,
    method: string,
    sourceFile: string,
    line: number,
  ) => {
    const path = normalizeEndpoint(raw);
    if (!path) return;

    const key = `${method}|${path}|${sourceFile}|${line}`;
    if (seen.has(key)) return;

    seen.add(key);
    results.push({ path, method, sourceFile, line });
  };

  for (const file of files) {
    if (/(^|\/)(node_modules|\.git|dist|build)\//i.test(file.path)) continue;
    if (!/\.(?:js|jsx|ts|tsx|vue|html)$/i.test(file.path)) continue;

    const lines = file.content.split('\n');

    for (let index = 0; index < lines.length; index++) {
      for (const item of ENDPOINT_PATTERNS) {
        item.pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = item.pattern.exec(lines[index])) !== null) {
          add(match[2], item.method, file.path, index + 1);
        }
      }

      const routePattern =
        /['"`](\/(?:api\/|graphql(?:\/|$)|v\d+\/)[^'"`\s]*)['"`]/gi;

      let route: RegExpExecArray | null;
      while ((route = routePattern.exec(lines[index])) !== null) {
        add(route[1], 'ROUTE', file.path, index + 1);
      }
    }
  }

  return results;
}
