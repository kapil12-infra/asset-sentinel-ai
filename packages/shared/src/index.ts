  /**
 * Types shared by apps/web and apps/api.
 * This package contains types only. Always import with `import type { ... }`.
 * All dates are ISO 8601 strings.
 */

export type ProjectType = 'Web App' | 'API' | 'Mobile' | 'Full Stack' | 'Platform';
export type ProjectStatus = 'none' | 'pass' | 'warn';
export type ProjectState = 'Planning' | 'In Progress' | 'In Review' | 'Live';
export type SuiteKey = 'functional' | 'api' | 'automation' | 'regression' | 'performance';
export type RunSuite = SuiteKey | 'all';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ActivityType = 'ok' | 'flask' | 'cloud' | 'shield' | 'bolt';
export type EnvStatus = 'Running' | 'Stopped' | 'Deploying';
export type DeployMethod = 'Docker' | 'Kubernetes' | 'Serverless' | 'Static';
export type MonitoringRange = '1h' | '24h' | '7d';
export type TeamRole = 'Owner' | 'Admin' | 'Developer' | 'QA Engineer' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  org: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Preferences {
  emailNotif: boolean;
  autoTest: boolean;
  autoScan: boolean;
  autoDeploy: boolean;
}

export interface Project {
  id: string;
  name: string;
  sub: string;
  type: ProjectType;
  desc: string;
  state: ProjectState;
  status: ProjectStatus;
  issues: number;
  stack: string[];
  slug: string;
  lastRun: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface TestCase {
  suite: string;
  name: string;
  result: 'Passed' | 'Failed';
  duration: string;
  error?: string;
}

export interface TestSuiteResult {
  name: string;
  count: number;
  failed: number;
  durationSec: number;
}

export interface TestRunSummary {
  id: number;
  suite: RunSuite;
  projectId: string;
  projectName: string;
  status: 'pass' | 'fail';
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationSec: number;
  startedAt: string;
}

export interface TestRun extends TestRunSummary {
  suites: TestSuiteResult[];
  cases: TestCase[];
  logs: string[];
}

export interface Vulnerability {
  id: string;
  name: string;
  severity: Severity;
  location: string;
  fix: string;
  fixed: boolean;
}

export interface Scan {
  projectId: string;
  at: string;
  vulnerabilities: Vulnerability[];
}

export interface Environment {
  id: string;
  projectId: string;
  projectName: string;
  stage: string;
  url: string;
  status: EnvStatus;
  lastDeployAt: string | null;
}

export interface Integration {
  id: string;
  name: string;
  connected: boolean;
  connectedAt: string | null;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  kind: 'builder' | 'qa' | 'security' | 'devops' | 'custom';
  name: string;
  description: string;
  icon: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  type: ActivityType;
  at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole | string;
  status: 'Active' | 'Invited';
}

export interface Invoice {
  period: string;
  amount: string;
  status: 'Paid' | 'Due';
}

export interface Billing {
  plan: string;
  tokens: { used: number; cap: number };
  invoices: Invoice[];
}

export interface DashboardSummary {
  projects: number;
  testsExecuted: number;
  bugsFound: number;
  criticalIssues: number;
  deployedApps: number;
  passRate: number;
  trend: { date: string; tests: number }[];
  recentProjects: Project[];
  activity: ActivityItem[];
  tokens: { used: number; cap: number };
}

export interface MonitoringSnapshot {
  range: MonitoringRange;
  uptime: number;
  responseMs: number;
  cpu: number;
  memory: number;
  series: { label: string; value: number }[];
}

// SPA VAPT shared types

export type SpaPhase = 1 | 2 | 3 | 4;
export type SpaScanMode = 'source' | 'dynamic' | 'both';
export type SpaFindingSource = 'static' | 'dynamic' | 'manual';
export type SpaPhaseStatus = 'completed' | 'partial' | 'skipped' | 'failed';

export interface SpaChecklistItem {
  id: string;
  phase: SpaPhase;
  title: string;
  tool: string;
  how: string;
  automated: boolean;
}

export interface SpaPhaseResult {
  phase: SpaPhase;
  status: SpaPhaseStatus;
  message: string;
  checksRun: number;
  findings: number;
}

export interface SpaFinding {
  id: string;
  phase: SpaPhase;
  check: string;
  severity: Severity;
  location: string;
  detail: string;
  fix: string;
  source?: SpaFindingSource;
  confidence?: 'low' | 'medium' | 'high';
  evidence?: string;
  verified?: boolean;
}

export interface SpaAuditRequest {
  mode: SpaScanMode;
  targetUrl?: string;
  authorizationConfirmed: boolean;
}

export interface SpaDiscoveredEndpoint {
  path: string;
  sourceFile: string;
  line: number;
  method: string;
}

export interface SpaAudit {
  projectId: string;
  at: string;
  mode?: SpaScanMode;
  targetUrl?: string;
  filesScanned: number;
  phases?: SpaPhaseResult[];
  endpoints?: SpaDiscoveredEndpoint[];
  findings: SpaFinding[];
}
