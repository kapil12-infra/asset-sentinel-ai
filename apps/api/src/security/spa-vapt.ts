import type { Severity, SpaChecklistItem, SpaFinding, SpaPhase } from '@asset-sentinel/shared';

export const PHASE_TITLES: Record<SpaPhase, string> = {
  1: 'Client-side reconnaissance and source mapping',
  2: 'Dynamic crawling and traffic interception',
  3: 'Client-side vulnerability assessment',
  4: 'Backend API testing (REST and GraphQL)',
};

export const SPA_CHECKLIST: SpaChecklistItem[] = [
  { id: 'p1-sourcemaps', phase: 1, title: 'Locate and extract source maps', tool: 'sourcemapper, restore-source-tree', how: 'Check whether .map files are exposed in production (for example main.bundle.js.map).', automated: true },
  { id: 'p1-endpoints', phase: 1, title: 'Extract hidden endpoints and route paths', tool: 'LinkFinder, JSFinder', how: 'Mine bundled JS for hardcoded API routes, staging environments and backend parameters.', automated: true },
  { id: 'p1-secrets', phase: 1, title: 'Check for hardcoded secrets', tool: 'TruffleHog, SecretFinder', how: 'Search bundles for API keys, JWT secrets, Firebase credentials and test tokens.', automated: true },
  { id: 'p2-ajax', phase: 2, title: 'Configure an AJAX spider', tool: 'OWASP ZAP AJAX Spider', how: 'Use headless Chrome to render DOM events, click client-side elements and populate route history.', automated: false },
  { id: 'p2-proxy', phase: 2, title: 'Intercept backend API traffic', tool: 'Burp Suite Community, Caido', how: 'Route fetch() and axios calls through an intercepting proxy and install its CA certificate.', automated: false },
  { id: 'p2-openapi', phase: 2, title: 'Map the API surface', tool: 'ZAP OpenAPI extension, Burp OpenAPI Parser', how: 'Import the Swagger, OpenAPI or Postman schema into the proxy.', automated: false },
  { id: 'p3-domxss', phase: 3, title: 'DOM-based XSS', tool: 'DOM Invader (Burp browser)', how: 'Test sinks (dangerouslySetInnerHTML, innerHTML, document.write, eval) fed by sources (location, hash, referrer).', automated: false },
  { id: 'p3-storage', phase: 3, title: 'Local storage and session hygiene', tool: 'Chrome DevTools, Application tab', how: 'Keep session tokens in HttpOnly, Secure, SameSite cookies, not localStorage.', automated: false },
  { id: 'p3-clientauthz', phase: 3, title: 'Client-side authorization bypass', tool: 'Browser DevTools, Redux DevTools', how: 'Flip isAdmin in client state and confirm restricted views expose no backend controls without server-side checks.', automated: false },
  { id: 'p4-bola', phase: 4, title: 'Broken object level authorization (BOLA / IDOR)', tool: 'Burp Repeater, ZAP Fuzzer', how: 'Change resource IDs across tokens of different users to confirm tenant isolation.', automated: false },
  { id: 'p4-massassign', phase: 4, title: 'Mass assignment', tool: 'Burp Repeater', how: 'Inject role, verified or similar fields into profile update requests.', automated: false },
  { id: 'p4-graphql', phase: 4, title: 'GraphQL introspection and batching', tool: 'Clairvoyance, InQL', how: 'Check schema leakage through introspection and DoS through deeply nested queries.', automated: false },
  { id: 'p4-cors', phase: 4, title: 'CORS misconfiguration', tool: 'curl, Burp', how: 'Inspect Access-Control-Allow-Origin and Allow-Credentials for wildcards or reflected origins.', automated: false },
];

interface Rule {
  phase: SpaPhase;
  check: string;
  severity: Severity;
  /** File paths this rule applies to. */
  files: RegExp;
  pattern: RegExp;
  detail: string;
  fix: string;
  /** Raise severity to this when the same file also matches `escalateIf`. */
  escalateTo?: Severity;
  escalateIf?: RegExp;
}

const CLIENT = /\.(tsx?|jsx?|vue|html)$/;
const SERVER = /\.(tsx?|jsx?)$/;
const ANY = /\.(tsx?|jsx?|vue|html|json|env|ya?ml|cfg|conf|md)$|(^|\/)\.env/;
const SOURCES = /(window\.location|location\.(hash|search|href)|document\.referrer|document\.URL)/;

export const RULES: Rule[] = [
  { phase: 1, check: 'Source map exposed', severity: 'Medium', files: /\.map$/, pattern: /^/, detail: 'A source map ships with the project and would reveal original source in production.', fix: 'Do not deploy .map files, or serve them only to authenticated internal users.' },
  { phase: 1, check: 'Source map reference in bundle', severity: 'Low', files: /\.(js|html|css)$/, pattern: /\/\/# sourceMappingURL=/, detail: 'The bundle points to a source map.', fix: 'Strip sourceMappingURL comments from production builds.' },
  { phase: 1, check: 'Source maps enabled in build config', severity: 'Medium', files: /(vite|webpack|rollup|next)\.config\.\w+$|angular\.json$/, pattern: /(sourcemap|productionSourceMap|devtool)\s*[:=]\s*(true|['"]source-map['"]|['"]hidden-source-map['"])/i, detail: 'The production build generates source maps.', fix: 'Set sourcemap to false for production, or upload maps only to your error tracker.' },
  { phase: 1, check: 'Hardcoded AWS access key', severity: 'Critical', files: ANY, pattern: /AKIA[0-9A-Z]{16}/, detail: 'A string shaped like an AWS access key id is in the source.', fix: 'Revoke the key, move credentials to a secrets manager and read them from the environment.' },
  { phase: 1, check: 'Hardcoded private key', severity: 'Critical', files: ANY, pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, detail: 'A private key is stored in the repository.', fix: 'Remove it from history, rotate the key and load it from a secrets manager.' },
  { phase: 1, check: 'Hardcoded provider token', severity: 'High', files: ANY, pattern: /(ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,})/, detail: 'A token matching a known provider format (GitHub, OpenAI-style, Google, Slack) is in the source.', fix: 'Revoke the token and inject it at runtime from the environment or a secrets manager.' },
  { phase: 1, check: 'Hardcoded credential assignment', severity: 'High', files: ANY, pattern: /\b(api[_-]?key|secret|passwd|password|jwt[_-]?secret|client[_-]?secret)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i, detail: 'A secret-looking value is assigned in code or config.', fix: 'Read the value from an environment variable; never commit it. Rotate it if it was real.' },
  { phase: 1, check: 'Hardcoded non-production endpoint', severity: 'Low', files: ANY, pattern: /https?:\/\/[\w.-]*(staging|stage|dev|test|internal|uat|localhost)[\w.-]*(:\d+)?[^\s'"`]*/i, detail: 'A staging, internal or local URL is hardcoded and may leak infrastructure details in the bundle.', fix: 'Inject API base URLs through build-time environment variables.' },
  { phase: 3, check: 'dangerouslySetInnerHTML', severity: 'Medium', files: CLIENT, pattern: /dangerouslySetInnerHTML/, detail: 'Raw HTML is injected into the DOM.', fix: 'Render text normally, or sanitise with DOMPurify before injecting.', escalateTo: 'High', escalateIf: SOURCES },
  { phase: 3, check: 'innerHTML / outerHTML assignment', severity: 'Medium', files: CLIENT, pattern: /\.(inner|outer)HTML\s*=/, detail: 'Assigning HTML strings is a DOM XSS sink.', fix: 'Use textContent, or sanitise first.', escalateTo: 'High', escalateIf: SOURCES },
  { phase: 3, check: 'document.write', severity: 'Medium', files: CLIENT, pattern: /document\.write(ln)?\s*\(/, detail: 'document.write is a DOM XSS sink.', fix: 'Build nodes with the DOM API instead.', escalateTo: 'High', escalateIf: SOURCES },
  { phase: 3, check: 'eval / Function constructor', severity: 'High', files: CLIENT, pattern: /\beval\s*\(|new Function\s*\(/, detail: 'Dynamic code execution is a DOM XSS and injection sink.', fix: 'Remove eval; parse data with JSON.parse and use explicit logic.' },
  { phase: 3, check: 'Auth token stored in web storage', severity: 'Medium', files: CLIENT, pattern: /(local|session)Storage\.setItem\(\s*['"`][^'"`]*(token|jwt|auth|session|secret)[^'"`]*['"`]/i, detail: 'Tokens in web storage can be stolen by any XSS.', fix: 'Prefer HttpOnly, Secure, SameSite cookies for session tokens, plus a strict CSP.' },
  { phase: 3, check: 'Client-side role gating', severity: 'Low', files: CLIENT, pattern: /\b(isAdmin|is_admin|user\.role\s*===?\s*['"]admin['"])/, detail: 'The UI decides access from client state, which a user can change.', fix: 'Treat it as UX only and enforce the same rule on the server for every route.' },
  { phase: 4, check: 'CORS allows any origin', severity: 'Medium', files: SERVER, pattern: /(origin\s*:\s*(true|['"]\*['"])|Access-Control-Allow-Origin['"]?\s*,\s*['"]\*['"]|enableCors\(\s*\)|[^.\w]cors\(\s*\))/, detail: 'Any website can call this API from a browser.', fix: 'Restrict origins to an allow-list and avoid credentials with wildcard origins.' },
  { phase: 4, check: 'CORS credentials with reflected origin', severity: 'High', files: SERVER, pattern: /origin\s*:\s*\(?\s*\w*\s*,?\s*\w*\s*\)?\s*=>\s*\w*\(?\s*null\s*,\s*true/, detail: 'Reflecting every origin while allowing credentials lets any site act as the user.', fix: 'Check the origin against an allow-list before calling back with true.' },
  { phase: 4, check: 'Possible mass assignment', severity: 'Medium', files: SERVER, pattern: /(data\s*:\s*(req|request)\.body\b|\.\.\.\s*(req|request)\.body\b|Object\.assign\([^)]*(req|request)\.body|\.update\(\s*(req|request)\.body)/, detail: 'The raw request body is written to the database, so a client can set fields such as role or verified.', fix: 'Validate with a DTO whitelist (class-validator whitelist or zod) and pick allowed fields explicitly.' },
  { phase: 4, check: 'Possible BOLA / IDOR', severity: 'Medium', files: SERVER, pattern: /(findUnique|findById|findOne|delete|update)\(\s*\{?\s*(where\s*:\s*\{\s*)?id\s*:?\s*(req|request)\.params\.id\s*\}?\s*\}?\s*\)/, detail: 'A record is fetched or changed by an id from the URL with no owner filter.', fix: 'Include the authenticated user or tenant in the query (for example where: { id, userId }).' },
  { phase: 4, check: 'GraphQL introspection enabled', severity: 'Medium', files: SERVER, pattern: /introspection\s*:\s*true/, detail: 'Anyone can download the full schema.', fix: 'Disable introspection in production and add query depth and cost limits.' },
  { phase: 4, check: 'No GraphQL depth limit', severity: 'Low', files: SERVER, pattern: /new ApolloServer\(|GraphQLModule\.forRoot/, detail: 'Deeply nested or batched queries can exhaust the server.', fix: 'Add depth and complexity limits (graphql-depth-limit, query cost analysis) and cap batch size.' },
];

const MAX_PER_RULE = 5;

export function analyzeFiles(files: { path: string; content: string }[]): SpaFinding[] {
  const out: SpaFinding[] = [];
  const counts = new Map<string, number>();
  let n = 0;

  for (const file of files) {
    if (/(^|\/)(node_modules|\.git)\//.test(file.path)) continue;
    const lines = file.content.split('\n');
    for (const rule of RULES) {
      if (!rule.files.test(file.path)) continue;
      // The `.map` rule flags the file itself, not its content.
      if (rule.pattern.source === '^') {
        push(rule, file.path, 1);
        continue;
      }
      for (let i = 0; i < lines.length; i++) {
        if (rule.pattern.test(lines[i])) push(rule, file.path, i + 1, file.content);
      }
    }
  }
  return out;

  function push(rule: Rule, path: string, line: number, content = '') {
    const key = rule.check;
    const c = counts.get(key) ?? 0;
    if (c >= MAX_PER_RULE) return;
    counts.set(key, c + 1);
    const escalate = rule.escalateIf && rule.escalateTo && rule.escalateIf.test(content);
    out.push({
      id: `spa-${++n}`,
      phase: rule.phase,
      check: rule.check,
      severity: escalate ? (rule.escalateTo as Severity) : rule.severity,
      location: `${path}:${line}`,
      detail: escalate ? `${rule.detail} The same file reads a user-controlled source such as the URL.` : rule.detail,
      fix: rule.fix,
      source: 'static',
      confidence: 'medium',
      verified: false,
    });
  }
}

export interface SpaDiscoveredEndpoint {
  path: string;
  sourceFile: string;
  line: number;
  method: string;
}

const ENDPOINT_PATTERNS: { method: string; pattern: RegExp }[] = [
  { method: 'FETCH', pattern: /\bfetch\s*\(\s*['"`]([^'"`]+)['"`]/g },
  { method: 'GET', pattern: /\baxios\.get\s*\(\s*['"`]([^'"`]+)['"`]/g },
  { method: 'POST', pattern: /\baxios\.post\s*\(\s*['"`]([^'"`]+)['"`]/g },
  { method: 'PUT', pattern: /\baxios\.put\s*\(\s*['"`]([^'"`]+)['"`]/g },
  { method: 'PATCH', pattern: /\baxios\.patch\s*\(\s*['"`]([^'"`]+)['"`]/g },
  { method: 'DELETE', pattern: /\baxios\.delete\s*\(\s*['"`]([^'"`]+)['"`]/g },
  { method: 'BASE_URL', pattern: /\bbaseURL\s*:\s*['"`]([^'"`]+)['"`]/g },
];

export function extractEndpoints(
  files: { path: string; content: string }[],
): SpaDiscoveredEndpoint[] {
  const results: SpaDiscoveredEndpoint[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (/(^|\/)(node_modules|\.git|dist|build)\//.test(file.path)) continue;
    if (!/\.(js|jsx|ts|tsx|vue|html)$/.test(file.path)) continue;

    const lines = file.content.split('\n');

    for (let index = 0; index < lines.length; index++) {
      for (const item of ENDPOINT_PATTERNS) {
        item.pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = item.pattern.exec(lines[index])) !== null) {
          const raw = match[1].trim();
          if (!raw || /^(data|javascript):/i.test(raw)) continue;

          let safePath = raw;
          try {
            if (/^https?:\/\//i.test(raw)) {
              const parsed = new URL(raw);
              safePath = parsed.origin + parsed.pathname;
            } else {
              safePath = raw.split(/[?#]/, 1)[0];
            }
          } catch {
            safePath = raw.split(/[?#]/, 1)[0];
          }

          if (
            !safePath ||
            !(safePath.startsWith('/') || /^https?:\/\//i.test(safePath))
          ) continue;

          const key = `${item.method}|${safePath}|${file.path}|${index + 1}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            path: safePath,
            sourceFile: file.path,
            line: index + 1,
            method: item.method,
          });
        }
      }

      const routePattern = /['"`](\/(?:api\/|graphql(?:\/|$)|v\d+\/)[^'"`\s]*)['"`]/g;
      let route: RegExpExecArray | null;

      while ((route = routePattern.exec(lines[index])) !== null) {
        const safePath = route[1].split(/[?#]/, 1)[0];
        const key = `ROUTE|${safePath}|${file.path}|${index + 1}`;

        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          path: safePath,
          sourceFile: file.path,
          line: index + 1,
          method: 'ROUTE',
        });
      }
    }
  }

  return results;
}
