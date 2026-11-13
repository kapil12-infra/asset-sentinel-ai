export interface TestingModule {
  id: string;
  name: string;
  description: string;
  status: 'catalogued' | 'planned';
  subcategoryCount: number;
  testCaseCount: number;
}

export const TESTING_CATALOG: TestingModule[] = [
  {
    id: 'functional',
    name: 'Functional Testing',
    description: 'Application behaviour and business requirements',
    status: 'catalogued',
    subcategoryCount: 20,
    testCaseCount: 24,
  },
  {
    id: 'api',
    name: 'API Testing',
    description: 'REST and GraphQL API validation',
    status: 'catalogued',
    subcategoryCount: 8,
    testCaseCount: 24,
  },
  {
    id: 'ui',
    name: 'UI Testing',
    description: 'User interface, interactions and visual behaviour',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'integration',
    name: 'Integration Testing',
    description: 'Interactions between application services',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'database',
    name: 'Database Testing',
    description: 'Data integrity, schema and query validation',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'regression',
    name: 'Regression Testing',
    description: 'Validation of existing application functionality',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'smoke',
    name: 'Smoke Testing',
    description: 'Critical application health checks',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'sanity',
    name: 'Sanity Testing',
    description: 'Focused validation of specific changes',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'compatibility',
    name: 'Compatibility Testing',
    description: 'Browser, operating system and device compatibility',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'performance',
    name: 'Performance Testing',
    description: 'Response time, load, stress and scalability',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'security',
    name: 'Security Testing',
    description: 'Application security and vulnerability validation',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
  {
    id: 'accessibility',
    name: 'Accessibility Testing',
    description: 'WCAG and assistive technology validation',
    status: 'planned',
    subcategoryCount: 0,
    testCaseCount: 0,
  },
];
