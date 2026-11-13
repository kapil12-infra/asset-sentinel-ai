export interface FunctionalTestDefinition {
  id: string;
  name: string;
  objective: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  executionStatus: 'planned';
}

export interface FunctionalCategory {
  id: string;
  name: string;
  description: string;
  tests: FunctionalTestDefinition[];
}

const test = (
  id: string,
  name: string,
  objective: string,
  expectedResult: string,
): FunctionalTestDefinition => ({
  id,
  name,
  objective,
  preconditions: ['Application is deployed and accessible', 'Test account and required test data are available'],
  steps: [
    'Open the application or relevant feature',
    'Perform the action described by the test case',
    'Observe the application response',
    'Verify the resulting state and displayed data',
  ],
  expectedResult: expectedResult,
  executionStatus: 'planned',
});

export const FUNCTIONAL_TEST_CATALOG: FunctionalCategory[] = [
  {
    id: 'authentication',
    name: 'Authentication',
    description: 'Verify login, logout and identity verification behaviour.',
    tests: [
      test('FT-001-001', 'Valid login', 'Authenticate with valid credentials.', 'User is authenticated and reaches the authorized application area.'),
      test('FT-001-002', 'Invalid login', 'Attempt login with invalid credentials.', 'Authentication is rejected without exposing sensitive information.'),
    ],
  },
  {
    id: 'registration',
    name: 'Registration',
    description: 'Verify account creation and registration workflows.',
    tests: [
      test('FT-002-001', 'Valid registration', 'Submit a valid registration form.', 'Account is created according to application rules.'),
    ],
  },
  {
    id: 'otp-verification',
    name: 'OTP Verification',
    description: 'Verify OTP generation, validation, expiry and retry behaviour.',
    tests: [
      test('FT-003-001', 'Valid OTP', 'Submit the correct, unexpired OTP.', 'OTP verification succeeds.'),
      test('FT-003-002', 'Expired OTP', 'Submit an expired OTP.', 'OTP verification is rejected.'),
    ],
  },
  {
    id: 'password-management',
    name: 'Password Management',
    description: 'Verify password reset, change and recovery workflows.',
    tests: [
      test('FT-004-001', 'Password reset', 'Complete the password reset workflow.', 'Password is updated and the new credentials work.'),
    ],
  },
  {
    id: 'authorization',
    name: 'Authorization',
    description: 'Verify role-based access and permission enforcement.',
    tests: [
      test('FT-005-001', 'Role permission enforcement', 'Access a feature using an account with insufficient permissions.', 'Unauthorized access is denied.'),
    ],
  },
  {
    id: 'crud-operations',
    name: 'CRUD Operations',
    description: 'Verify create, read, update and delete operations.',
    tests: [
      test('FT-006-001', 'Create record', 'Create a valid application record.', 'The record is saved and can be retrieved.'),
      test('FT-006-002', 'Update record', 'Modify an existing record.', 'The updated values are persisted.'),
      test('FT-006-003', 'Delete record', 'Delete an existing record.', 'The record is removed or archived according to business rules.'),
    ],
  },
  {
    id: 'form-validation',
    name: 'Form Validation',
    description: 'Verify required fields, formats and field constraints.',
    tests: [
      test('FT-007-001', 'Required field validation', 'Submit a form with required fields missing.', 'Submission is blocked and validation messages are displayed.'),
    ],
  },
  {
    id: 'input-validation',
    name: 'Input Validation',
    description: 'Verify handling of invalid, boundary and unexpected input.',
    tests: [
      test('FT-008-001', 'Invalid input handling', 'Submit invalid and boundary input values.', 'Input is safely rejected or handled according to field rules.'),
    ],
  },
  {
    id: 'business-logic',
    name: 'Business Logic',
    description: 'Verify calculations, business rules and domain constraints.',
    tests: [
      test('FT-009-001', 'Business rule validation', 'Execute a workflow with known input and expected business outcome.', 'The application produces the correct business result.'),
    ],
  },
  {
    id: 'workflow-testing',
    name: 'Workflow Testing',
    description: 'Verify multi-step processes and state transitions.',
    tests: [
      test('FT-010-001', 'Complete workflow', 'Complete a valid multi-step workflow.', 'All steps complete in the correct order and final state is correct.'),
    ],
  },
  {
    id: 'search-filters',
    name: 'Search and Filters',
    description: 'Verify search, sorting, filtering and pagination.',
    tests: [
      test('FT-011-001', 'Search records', 'Search using a known query.', 'Matching records are returned correctly.'),
    ],
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    description: 'Verify upload, validation, storage and download.',
    tests: [
      test('FT-012-001', 'Valid file upload', 'Upload a supported file within the configured size limit.', 'The file is accepted and can be retrieved by an authorized user.'),
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Verify email, SMS and in-application notification behaviour.',
    tests: [
      test('FT-013-001', 'Notification delivery', 'Trigger an event configured to send a notification.', 'The expected notification is generated and delivered through the configured channel.'),
    ],
  },
  {
    id: 'session-testing',
    name: 'Session Management',
    description: 'Verify session expiry, refresh and concurrent-session behaviour.',
    tests: [
      test('FT-014-001', 'Session expiry', 'Continue using a session after its configured expiry.', 'Expired sessions are rejected and protected data remains inaccessible.'),
    ],
  },
  {
    id: 'error-handling',
    name: 'Error Handling',
    description: 'Verify error messages, failure recovery and graceful handling.',
    tests: [
      test('FT-015-001', 'Application error handling', 'Trigger a controlled application error.', 'A safe error response is shown and the application remains stable.'),
    ],
  },
  {
    id: 'data-persistence',
    name: 'Data Persistence',
    description: 'Verify that saved data remains consistent across operations.',
    tests: [
      test('FT-016-001', 'Persist saved data', 'Save data and retrieve it in a subsequent session.', 'Saved data is retained accurately.'),
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Verify dashboard widgets, totals and displayed information.',
    tests: [
      test('FT-017-001', 'Dashboard data accuracy', 'Compare displayed dashboard values with the underlying authorized data.', 'Dashboard values reflect the correct data.'),
    ],
  },
  {
    id: 'navigation',
    name: 'Navigation',
    description: 'Verify routes, menus, redirects and protected pages.',
    tests: [
      test('FT-018-001', 'Protected route navigation', 'Open a protected route without an authenticated session.', 'The user is redirected or denied access.'),
    ],
  },
  {
    id: 'multi-user-behaviour',
    name: 'Multi-user Behaviour',
    description: 'Verify data isolation and concurrent user behaviour.',
    tests: [
      test('FT-019-001', 'User data isolation', "Attempt to access another user's private record.", 'The application prevents unauthorized cross-user access.'),
    ],
  },
  {
    id: 'integration-behaviour',
    name: 'Integration Behaviour',
    description: 'Verify application behaviour when interacting with external services.',
    tests: [
      test('FT-020-001', 'External service response handling', 'Trigger an integration using a controlled service response.', 'The application handles successful and unsuccessful responses correctly.'),
    ],
  },
];
