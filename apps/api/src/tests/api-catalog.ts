export interface ApiTestDefinition {
  id: string;
  name: string;
  objective: string;
  method: string;
  path: string;
  expectedStatus: number;
  executionStatus: 'planned';
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string;
  tests: ApiTestDefinition[];
}

const test = (
  id: string,
  name: string,
  objective: string,
  method: string,
  path: string,
  expectedStatus: number,
): ApiTestDefinition => ({
  id,
  name,
  objective,
  method,
  path,
  expectedStatus,
  executionStatus: 'planned',
});

export const API_TEST_CATALOG: ApiCategory[] = [
  {
    id: 'endpoint-validation',
    name: 'Endpoint Validation',
    description: 'Verify API endpoint availability and routing.',
    tests: [
      test('API-001', 'Health endpoint', 'Verify API health endpoint responds.', 'GET', '/api/health', 200),
      test('API-002', 'Unknown endpoint', 'Verify unknown routes return not found.', 'GET', '/api/unknown-test-endpoint', 404),
      test('API-003', 'Trailing slash', 'Verify endpoint routing with trailing slash.', 'GET', '/api/health/', 200),
    ],
  },
  {
    id: 'http-methods',
    name: 'HTTP Methods',
    description: 'Validate supported and unsupported HTTP methods.',
    tests: [
      test('API-004', 'GET request', 'Validate GET request handling.', 'GET', '/api/health', 200),
      test('API-005', 'HEAD request', 'Validate HEAD request handling.', 'HEAD', '/api/health', 200),
      test('API-006', 'Unsupported method', 'Validate unsupported HTTP method response.', 'TRACE', '/api/health', 405),
    ],
  },
  {
    id: 'status-codes',
    name: 'Status Code Validation',
    description: 'Validate successful and error HTTP responses.',
    tests: [
      test('API-007', 'Successful response', 'Verify successful response status.', 'GET', '/api/health', 200),
      test('API-008', 'Not found response', 'Verify missing resource response.', 'GET', '/api/unknown-test-endpoint', 404),
      test('API-009', 'Method not allowed', 'Verify unsupported method response.', 'TRACE', '/api/health', 405),
    ],
  },
  {
    id: 'headers',
    name: 'Headers Validation',
    description: 'Inspect HTTP response headers.',
    tests: [
      test('API-010', 'Content type', 'Verify response content type.', 'GET', '/api/health', 200),
      test('API-011', 'Security headers', 'Inspect configured security response headers.', 'GET', '/api/health', 200),
      test('API-012', 'Cache headers', 'Inspect cache-control response policy.', 'GET', '/api/health', 200),
    ],
  },
  {
    id: 'authentication',
    name: 'Authentication',
    description: 'Validate authentication and access control.',
    tests: [
      test('API-013', 'Protected endpoint', 'Verify protected endpoint requires authentication.', 'GET', '/api/tests/catalog', 401),
      test('API-014', 'Invalid bearer token', 'Verify invalid token is rejected.', 'GET', '/api/tests/catalog', 401),
      test('API-015', 'Public health endpoint', 'Verify health endpoint is publicly accessible.', 'GET', '/api/health', 200),
    ],
  },
  {
    id: 'request-validation',
    name: 'Request Validation',
    description: 'Validate request parameters and payload handling.',
    tests: [
      test('API-016', 'Invalid resource ID', 'Verify invalid resource identifiers are rejected.', 'GET', '/api/tests/invalid-id', 400),
      test('API-017', 'Missing query parameter', 'Verify endpoint behaviour without optional parameters.', 'GET', '/api/tests', 401),
      test('API-018', 'Unsupported content type', 'Inspect unsupported request content type handling.', 'POST', '/api/auth/login', 415),
    ],
  },
  {
    id: 'response-validation',
    name: 'Response Validation',
    description: 'Validate JSON response structure and required fields.',
    tests: [
      test('API-019', 'Health response schema', 'Verify health response contains status.', 'GET', '/api/health', 200),
      test('API-020', 'Health response JSON', 'Verify health endpoint returns valid JSON.', 'GET', '/api/health', 200),
      test('API-021', 'Catalogue response schema', 'Verify testing catalogue response structure.', 'GET', '/api/tests/catalog', 401),
    ],
  },
  {
    id: 'response-performance',
    name: 'Response Performance',
    description: 'Measure API response times.',
    tests: [
      test('API-022', 'Health response time', 'Measure health endpoint latency.', 'GET', '/api/health', 200),
      test('API-023', 'Repeated health requests', 'Measure repeated health request latency.', 'GET', '/api/health', 200),
      test('API-024', 'Health endpoint stability', 'Check health endpoint response consistency.', 'GET', '/api/health', 200),
    ],
  },
];
