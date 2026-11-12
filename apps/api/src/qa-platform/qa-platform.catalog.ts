export const QA_MODULES = [
  {
    id: 'functional',
    name: 'Functional Testing',
    engine: 'playwright',
    description: 'Application behaviour and business requirements',
    subcategories: [
      'authentication', 'registration', 'otp-verification',
      'password-management', 'authorization', 'crud-operations',
      'form-validation', 'input-validation', 'business-logic',
      'workflow-testing', 'search-filters', 'file-upload',
      'notifications', 'session-testing', 'error-handling',
      'data-persistence', 'dashboard', 'navigation',
      'multi-user-behaviour', 'integration-behaviour',
    ],
  },
  {
    id: 'api',
    name: 'API Testing',
    engine: 'api-runner',
    description: 'REST and GraphQL API validation',
    subcategories: [
      'endpoint-discovery', 'http-methods', 'status-codes',
      'request-validation', 'response-schema', 'authentication',
      'authorization', 'rate-limits', 'error-responses',
      'pagination', 'filtering', 'api-versioning',
    ],
  },
  {
    id: 'automation',
    name: 'Automation Testing',
    engine: 'playwright',
    description: 'Automated browser workflows and user journeys',
    subcategories: [
      'browser-launch', 'page-navigation', 'form-automation',
      'user-journeys', 'multi-step-workflows', 'screenshots',
      'cross-page-flows', 'download-upload',
    ],
  },
  {
    id: 'regression',
    name: 'Regression Testing',
    engine: 'playwright-api',
    description: 'Verify existing features after application changes',
    subcategories: [
      'feature-regression', 'bug-verification', 'api-regression',
      'ui-regression', 'database-regression', 'release-regression',
    ],
  },
  {
    id: 'performance',
    name: 'Performance Testing',
    engine: 'k6',
    description: 'Load, response time and scalability',
    subcategories: [
      'load', 'stress', 'spike', 'soak',
      'endurance', 'concurrency', 'response-time', 'throughput',
    ],
  },
  {
    id: 'security',
    name: 'Security Testing',
    engine: 'semgrep-zap',
    description: 'Application security and vulnerability assessment',
    subcategories: [
      'owasp-top-10', 'injection', 'authentication',
      'authorization', 'session-security', 'security-headers',
      'tls-configuration', 'dependency-vulnerabilities',
      'secret-detection', 'spa-vapt', 'access-control',
    ],
  },
  {
    id: 'static',
    name: 'Static Testing',
    engine: 'eslint-semgrep',
    description: 'Source-code quality and static analysis',
    subcategories: [
      'linting', 'type-checking', 'code-quality',
      'complexity', 'dead-code', 'secrets',
      'dependency-analysis', 'static-security',
    ],
  },
  {
    id: 'compatibility',
    name: 'Compatibility Testing',
    engine: 'playwright',
    description: 'Browser, viewport and device compatibility',
    subcategories: [
      'chromium', 'firefox', 'webkit',
      'desktop-viewports', 'tablet-viewports',
      'mobile-viewports', 'responsive-layout',
    ],
  },
  {
    id: 'accessibility',
    name: 'Accessibility Testing',
    engine: 'axe-core',
    description: 'WCAG accessibility validation',
    subcategories: [
      'wcag-a', 'wcag-aa', 'keyboard-navigation',
      'screen-reader', 'color-contrast',
      'form-labels', 'aria-validation', 'focus-management',
    ],
  },
  {
    id: 'database',
    name: 'Database Testing',
    engine: 'sql-runner',
    description: 'Schema, data integrity and query validation',
    subcategories: [
      'schema-validation', 'constraints', 'foreign-keys',
      'indexes', 'data-integrity', 'transactions',
      'query-validation', 'migration-validation',
    ],
  },
  {
    id: 'integration',
    name: 'Integration Testing',
    engine: 'integration-runner',
    description: 'Communication between application components',
    subcategories: [
      'service-to-service', 'api-database',
      'frontend-backend', 'third-party-services',
      'authentication-integration', 'event-integration',
      'message-queues', 'external-webhooks',
    ],
  },
  {
    id: 'smoke',
    name: 'Smoke Testing',
    engine: 'api-playwright',
    description: 'Critical application health and availability checks',
    subcategories: [
      'application-health', 'login-availability',
      'critical-api', 'database-connectivity',
      'frontend-availability', 'critical-user-journey',
    ],
  },
] as const;

export type QaModuleId = (typeof QA_MODULES)[number]['id'];

export const QA_WORKFLOW = [
  { step: 1, id: 'project-selection', name: 'Select Project & Environment' },
  { step: 2, id: 'application-discovery', name: 'AI Application Discovery' },
  { step: 3, id: 'test-generation', name: 'AI Test Case Generation' },
  { step: 4, id: 'test-planning', name: 'Automatic Test Planning' },
  { step: 5, id: 'policy-validation', name: 'Policy & Permission Validation' },
  { step: 6, id: 'test-execution', name: 'Automated Test Execution' },
  { step: 7, id: 'evidence-collection', name: 'Evidence Collection' },
  { step: 8, id: 'failure-analysis', name: 'AI Failure Analysis' },
  { step: 9, id: 'controlled-retry', name: 'Controlled Automatic Retry' },
  { step: 10, id: 'qa-report', name: 'AI QA Report' },
] as const;

export const PROJECT_TESTING_PROFILES = [
  {
    projectType: 'government',
    recommendedModules: [
      'functional', 'api', 'security', 'database',
      'integration', 'regression', 'smoke', 'accessibility',
    ],
  },
  {
    projectType: 'real-estate',
    recommendedModules: [
      'functional', 'api', 'automation', 'performance',
      'security', 'compatibility', 'database', 'integration',
    ],
  },
  {
    projectType: 'crm',
    recommendedModules: [
      'functional', 'api', 'automation', 'regression',
      'security', 'database', 'integration', 'smoke',
    ],
  },
  {
    projectType: 'qa-platform',
    recommendedModules: QA_MODULES.map((module) => module.id),
  },
] as const;
