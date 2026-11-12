import type { Severity } from '@asset-sentinel/shared';
import { rand } from '../core/constants';

export interface VulnTemplate {
  name: string;
  severity: Severity;
  location: string;
  fix: string;
}

export const SEV_POOLS: Record<Severity, VulnTemplate[]> = {
  Critical: [
    { name: 'SQL injection in query builder', severity: 'Critical', location: 'src/db/query.ts:42', fix: 'Use parameterized queries' },
    { name: 'Hardcoded secret in repository', severity: 'Critical', location: '.env.production:3', fix: 'Move to a secrets manager and rotate the key' },
  ],
  High: [
    { name: 'Missing authorization check', severity: 'High', location: 'src/routes/admin.ts:18', fix: 'Add role guard to admin routes' },
    { name: 'Outdated dependency with known CVE', severity: 'High', location: 'package.json', fix: 'Upgrade to the patched version' },
    { name: 'Cross-site scripting (XSS)', severity: 'High', location: 'src/components/Comment.tsx:27', fix: 'Escape user content before rendering' },
  ],
  Medium: [
    { name: 'Weak password policy', severity: 'Medium', location: 'src/auth/validate.ts:9', fix: 'Require 10+ characters and a complexity check' },
    { name: 'CORS allows any origin', severity: 'Medium', location: 'src/main.ts:12', fix: 'Restrict to an allow-list of origins' },
  ],
  Low: [
    { name: 'Verbose error messages', severity: 'Low', location: 'src/middleware/errors.ts:5', fix: 'Return generic errors in production' },
    { name: 'Missing security headers', severity: 'Low', location: 'nginx.conf', fix: 'Add CSP, HSTS and X-Content-Type-Options' },
  ],
};

/** Picks a random subset of findings. Injectable rng for tests. */
export function makeFindings(rng: () => number = Math.random): VulnTemplate[] {
  const out: VulnTemplate[] = [];
  const counts: Record<Severity, number> = {
    Critical: rand(0, 1, rng),
    High: rand(0, 2, rng),
    Medium: rand(1, 2, rng),
    Low: rand(1, 2, rng),
  };
  (Object.keys(counts) as Severity[]).forEach((sev) => {
    const pool = [...SEV_POOLS[sev]].sort(() => rng() - 0.5);
    out.push(...pool.slice(0, counts[sev]));
  });
  return out;
}
