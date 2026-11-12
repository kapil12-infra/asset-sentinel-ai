import type {
  Agent, ActivityItem, ApiKeyInfo, AuthResponse, Billing, DashboardSummary, DeployMethod, Environment,
  Integration, MonitoringRange, MonitoringSnapshot, Preferences, Project, ProjectFile, ProjectType,
  RunSuite, Scan, SpaAudit, SpaChecklistItem, TeamMember, TestRun, TestRunSummary, User, Vulnerability,
} from '@asset-sentinel/shared';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TOKEN_KEY = 'as_token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new ApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return data as T;
}

const get = <T,>(p: string) => request<T>('GET', p);
const post = <T,>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const patch = <T,>(p: string, b: unknown) => request<T>('PATCH', p, b);
const put = <T,>(p: string, b: unknown) => request<T>('PUT', p, b);
const del = <T,>(p: string) => request<T>('DELETE', p);
const qs = (o: Record<string, string | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`);
  return p.length ? `?${p.join('&')}` : '';
};

export const api = {
  auth: {
    login: (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password }),
    register: (name: string, email: string, password: string) => post<AuthResponse>('/auth/register', { name, email, password }),
    me: () => get<User>('/auth/me'),
    updateMe: (b: Partial<Pick<User, 'name' | 'email' | 'role' | 'org'>>) => patch<User>('/auth/me', b),
    oauthUrl: (provider: 'google' | 'github') => `${BASE}/auth/oauth/${provider}`,
  },
  dashboard: {
    summary: () => get<DashboardSummary>('/dashboard'),
    activity: () => get<ActivityItem[]>('/activity'),
  },
  projects: {
    list: (q?: string, status?: string) => get<Project[]>(`/projects${qs({ q, status })}`),
    get: (id: string) => get<Project>(`/projects/${id}`),
    generate: (b: { prompt: string; name?: string; type: ProjectType }) => post<Project>('/projects/generate', b),
    update: (id: string, b: Partial<Pick<Project, 'name' | 'desc' | 'state'>>) => patch<Project>(`/projects/${id}`, b),
    remove: (id: string) => del<{ ok: true }>(`/projects/${id}`),
    clone: (id: string) => post<Project>(`/projects/${id}/clone`),
    files: (id: string) => get<ProjectFile[]>(`/projects/${id}/files`),
    saveFile: (id: string, f: ProjectFile) => put<ProjectFile>(`/projects/${id}/files`, f),
    deleteFile: (id: string, path: string) => del<{ ok: true }>(`/projects/${id}/files?path=${encodeURIComponent(path)}`),
    assist: (id: string, path: string, prompt: string) => post<{ content: string }>(`/projects/${id}/assist`, { path, prompt }),
  },
  tests: {
    run: (projectId: string, suite: RunSuite) => post<TestRun>(`/projects/${projectId}/tests`, { suite }),
    list: (o: { projectId?: string; suite?: string } = {}) => get<TestRunSummary[]>(`/tests${qs(o)}`),
    get: (id: number) => get<TestRun>(`/tests/${id}`),
    rerun: (id: number) => post<TestRun>(`/tests/${id}/rerun`),
  },
  security: {
    scan: (id: string) => post<Scan>(`/projects/${id}/scan`),
    get: (id: string) => get<Scan | null>(`/projects/${id}/scan`),
    fixAll: (id: string) => post<{ fixed: number }>(`/projects/${id}/scan/fix-all`),
    fix: (vulnId: string) => post<Vulnerability>(`/security/vulnerabilities/${vulnId}/fix`),
    spaAudit: (id: string) => post<SpaAudit>(`/projects/${id}/spa-audit`),
    spaChecklist: () => get<SpaChecklistItem[]>('/security/spa-checklist'),
  },
  deploy: {
    deploy: (b: { projectId: string; stage: string; method: DeployMethod }) => post<Environment>('/deployments', b),
    environments: (projectId?: string) => get<Environment[]>(`/environments${qs({ projectId })}`),
    createEnv: (projectId: string, stage: string) => post<Environment>('/environments', { projectId, stage }),
    toggle: (id: string) => post<Environment>(`/environments/${id}/toggle`),
    removeEnv: (id: string) => del<{ ok: true }>(`/environments/${id}`),
  },
  monitoring: { get: (range: MonitoringRange) => get<MonitoringSnapshot>(`/monitoring?range=${range}`) },
  integrations: {
    list: () => get<Integration[]>('/integrations'),
    connect: (id: string, token: string) => post<Integration>(`/integrations/${id}/connect`, { token }),
    disconnect: (id: string) => post<Integration>(`/integrations/${id}/disconnect`),
  },
  agents: {
    list: () => get<Agent[]>('/agents'),
    create: (name: string, description: string) => post<Agent>('/agents', { name, description }),
    run: (id: string, task?: string) => post<{ output: string }>(`/agents/${id}/run`, { task }),
  },
  settings: {
    keys: () => get<ApiKeyInfo[]>('/settings/api-keys'),
    createKey: (name: string) => post<{ key: string; info: ApiKeyInfo }>('/settings/api-keys', { name }),
    deleteKey: (id: string) => del<{ ok: true }>(`/settings/api-keys/${id}`),
    team: () => get<TeamMember[]>('/settings/team'),
    invite: (email: string, role: string) => post<TeamMember>('/settings/team', { email, role }),
    removeMember: (id: string) => del<{ ok: true }>(`/settings/team/${id}`),
    billing: () => get<Billing>('/settings/billing'),
    prefs: () => get<Preferences>('/settings/preferences'),
    setPrefs: (p: Partial<Preferences>) => patch<Preferences>('/settings/preferences', p),
  },
};
