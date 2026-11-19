import type { SuiteKey, TestCase, TestSuiteResult } from '@asset-sentinel/shared';
import { rand } from '../core/constants';

export const SUITE_KEYS: SuiteKey[] = ['functional', 'api', 'automation', 'regression', 'performance'];

interface SuiteDef {
  label: string;
  names: string[];
}

export const SUITES: Record<SuiteKey, SuiteDef> = {
  functional: {
    label: 'Functional Tests',
    names: ['renders home page', 'navigates between routes', 'submits form with valid data', 'shows validation errors', 'persists session after reload', 'handles empty state', 'filters list by query', 'opens and closes modal'],
  },
  api: {
    label: 'API Tests',
    names: ['GET /health returns 200', 'POST /auth/login returns token', 'rejects missing token with 401', 'GET /items paginates', 'POST /items validates body', 'PATCH /items/:id updates', 'DELETE /items/:id returns 204', 'returns 404 for unknown id'],
  },
  automation: {
    label: 'Automation Tests',
    names: ['login flow end to end', 'checkout flow end to end', 'file upload flow', 'search and select flow', 'profile update flow', 'logout clears session'],
  },
  regression: {
    label: 'Regression Tests',
    names: ['legacy route redirects', 'date formatting unchanged', 'currency rounding unchanged', 'permissions matrix unchanged', 'export CSV columns unchanged', 'pagination boundaries unchanged'],
  },
  performance: {
    label: 'Performance Tests',
    names: ['home page LCP under 2.5s', 'API p95 under 300ms', 'bundle size under budget', '100 concurrent users', 'memory stable over 5 min'],
  },
};

const ERRORS = [
  'Expected 200 but received 500',
  'Timeout of 5000ms exceeded',
  'Element not found: [data-test="submit"]',
  'AssertionError: expected true to equal false',
  'Snapshot mismatch',
];

export interface RunResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationSec: number;
  suites: TestSuiteResult[];
  cases: TestCase[];
  logs: string[];
}

/** Simulated execution. The rng is injectable so tests are deterministic. */
export function simulateRun(suite: SuiteKey | 'all', rng: () => number = Math.random): RunResult {
  const keys = suite === 'all' ? SUITE_KEYS : [suite];
  const suites: TestSuiteResult[] = [];
  const cases: TestCase[] = [];
  const logs: string[] = [`$ asset-sentinel test --suite ${suite}`];
  let duration = 0;

  for (const key of keys) {
    const def = SUITES[key];
    let failed = 0;
    let sd = 0;
    logs.push(`> ${def.label}`);
    for (const name of def.names) {
      const fail = rng() < 0.12;
      const ms = rand(40, 900, rng);
      sd += ms;
      if (fail) failed++;
      cases.push({
        suite: def.label,
        name,
        result: fail ? 'Failed' : 'Passed',
        duration: `${ms}ms`,
        ...(fail ? { error: ERRORS[rand(0, ERRORS.length - 1, rng)] } : {}),
      });
      logs.push(`  ${fail ? '✗' : '✓'} ${name} (${ms}ms)`);
    }
    const sec = Math.max(1, Math.round(sd / 1000));
    duration += sec;
    suites.push({ name: def.label, count: def.names.length, failed, durationSec: sec });
  }

  const total = cases.length;
  const failed = cases.filter((c) => c.result === 'Failed').length;
  logs.push(`Tests: ${total - failed} passed, ${failed} failed, ${total} total`);
  return { total, passed: total - failed, failed, skipped: 0, durationSec: duration, suites, cases, logs };
}
