import type { QaModuleId } from './qa-platform.catalog';

export type DefinitionStatus =
  | 'planned'
  | 'implemented'
  | 'deprecated';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'blocked'
  | 'error';

export interface QaTestDefinition {
  id: string;
  moduleId: QaModuleId;
  subcategoryId: string;
  name: string;
  objective: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  executor: string;
  definitionStatus: DefinitionStatus;
}

export interface QaExecutionRequest {
  projectId: string;
  environmentId?: string;
  moduleIds: QaModuleId[];
  subcategoryIds?: string[];
  testCaseIds?: string[];
  executionScope?: 'full' | 'smoke' | 'sanity' | 'regression';
  authorizationConfirmed: boolean;
}

export interface QaCaseResult {
  testCaseId: string;
  moduleId: QaModuleId;
  subcategoryId: string;
  name: string;
  status: ExecutionStatus;
  expectedResult: string;
  actualResult?: string;
  durationMs: number;
  logs: string[];
  error?: string;
  evidence: string[];
}

export interface QaModuleResult {
  moduleId: QaModuleId;
  status: ExecutionStatus;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
  durationMs: number;
  cases: QaCaseResult[];
}

export interface QaExecutionResult {
  runId: number;
  projectId: string;
  status: ExecutionStatus;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
  durationMs: number;
  modules: QaModuleResult[];
  startedAt: string;
  completedAt?: string;
}
