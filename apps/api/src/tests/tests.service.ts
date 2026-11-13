import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, TestRun as DbRun } from '@prisma/client';
import type {
  RunSuite,
  TestCase,
  TestRun,
  TestRunSummary,
  TestSuiteResult,
  QaStageStatus,
} from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { PrismaService } from '../core/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { SecurityService } from '../security/security.service';

type RunWithProject = DbRun & { project: { name: string } };

type StageOutcome = {
  status: QaStageStatus;
  message: string;
  checksRun?: number;
};

const STAGE_DEFINITIONS = [
  { key: 'repository', name: 'Repository validation' },
  { key: 'discovery', name: 'Project discovery' },
  { key: 'static', name: 'Static code analysis' },
  { key: 'functional', name: 'Functional testing' },
  { key: 'api', name: 'API testing' },
  { key: 'automation', name: 'Automation testing' },
  { key: 'regression', name: 'Regression testing' },
  { key: 'performance', name: 'Performance testing' },
  { key: 'security', name: 'Security source audit' },
  { key: 'playwright', name: 'Playwright E2E testing' },
  { key: 'compatibility', name: 'Compatibility testing' },
  { key: 'accessibility', name: 'Accessibility testing' },
  { key: 'database', name: 'Database testing' },
  { key: 'integration', name: 'Integration testing' },
  { key: 'smoke', name: 'Smoke testing' },
  { key: 'aggregation', name: 'Result aggregation' },
  { key: 'report', name: 'QA report generation' },
] as const;

type StageKey = (typeof STAGE_DEFINITIONS)[number]['key'];

const ALL_TEST_MODULE_IDS = [
  'functional',
  'api',
  'ui',
  'integration',
  'database',
  'regression',
  'smoke',
  'sanity',
  'compatibility',
  'performance',
  'security',
  'accessibility',
] as const;

const MODULE_COMPATIBILITY_MAP: Record<string, string[]> = {
  functional: ['functional'],
  api: ['api'],
  ui: ['automation'],
  integration: ['integration'],
  database: ['database'],
  regression: ['regression'],
  smoke: ['smoke'],
  sanity: ['regression'],
  compatibility: ['compatibility'],
  performance: ['performance'],
  security: ['security'],
  accessibility: ['accessibility'],

  // Legacy API compatibility.
  automation: ['automation'],
  static: ['static'],
};

const STAGE_MODULE: Partial<Record<StageKey, string>> = {
  static: 'security',
  functional: 'functional',
  api: 'api',
  automation: 'automation',
  regression: 'regression',
  performance: 'performance',
  security: 'security',
  playwright: 'automation',
  compatibility: 'compatibility',
  accessibility: 'accessibility',
  database: 'database',
  integration: 'integration',
  smoke: 'smoke',
};

@Injectable()
export class TestsService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private activity: ActivityService,
    private security: SecurityService,
    private config: ConfigService,
  ) {}

  private summary(r: RunWithProject): TestRunSummary {
    return {
      id: r.id,
      suite: r.suite as RunSuite,
      projectId: r.projectId,
      environmentId: r.environmentId,
      projectName: r.project.name,
      status: r.status as TestRunSummary['status'],
      total: r.total,
      passed: r.passed,
      failed: r.failed,
      skipped: r.skipped,
      durationSec: r.durationSec,
      startedAt: r.startedAt.toISOString(),
    };
  }

  private full(r: RunWithProject): TestRun {
    return {
      ...this.summary(r),
      suites: r.suites as unknown as TestSuiteResult[],
      cases: r.cases as unknown as TestCase[],
      logs: r.logs as unknown as string[],
    };
  }

  private initialStages(): TestSuiteResult[] {
    return STAGE_DEFINITIONS.map((stage) => ({
      key: stage.key,
      name: stage.name,
      count: 0,
      failed: 0,
      durationSec: 0,
      status: 'pending',
      message: 'Waiting to execute',
      checksRun: 0,
    }));
  }

  async run(
    userId: string,
    projectId: string,
    suite: RunSuite,
    environmentId?: string,
    moduleIds?: string[],
    authorizationConfirmed = false,
  ): Promise<TestRun> {
    const project = await this.projects.find(userId, projectId);
    const requestedModuleIds: string[] = moduleIds ?? (
      suite === 'all' ? [...ALL_TEST_MODULE_IDS] : [suite]
    );

    const selectedModuleIds = [
      ...new Set(
        requestedModuleIds.flatMap(
          (id) => MODULE_COMPATIBILITY_MAP[id] ?? [],
        ),
      ),
    ];

    let environment:
      | { id: string; stage: string; url: string; status: string }
      | null = null;

    if (environmentId) {
      environment = await this.prisma.environment.findFirst({
        where: {
          id: environmentId,
          projectId,
          project: { userId },
        },
        select: { id: true, stage: true, url: true, status: true },
      });

      if (!environment) {
        throw new NotFoundException('Environment not found for this project');
      }

      if (environment.status !== 'Running') {
        throw new BadRequestException(
          `Environment must be Running to start QA tests (current status: ${environment.status})`,
        );
      }
    }

    const stages = this.initialStages();
    const logs = [
      `QA pipeline created for ${project.name}`,
      `Selected suite: ${suite}`,
      `Selected modules: ${selectedModuleIds.join(', ')}`,
      ...(environment ? [`Environment: ${environment.stage} (${environment.url})`] : ['Environment: not selected']),
      `Stages configured: ${stages.length}`,
      'Execution mode: read-only project inspection',
      'Uploaded project source will not be executed by the API process.',
    ];

    const row = await this.prisma.testRun.create({
      data: {
        projectId,
        environmentId: environment?.id ?? null,
        suite,
        status: 'running',
        total: stages.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        durationSec: 0,
        suites: stages as unknown as Prisma.InputJsonValue,
        cases: [] as unknown as Prisma.InputJsonValue,
        logs: logs as unknown as Prisma.InputJsonValue,
      },
      include: { project: { select: { name: true } } },
    });

    await this.activity.log(
      userId,
      `Started QA pipeline for ${project.name} (run #${row.id})`,
      'flask',
    );

    // The persisted run is returned immediately. Progress is saved by the
    // background executor and can be retrieved through GET /tests/:id.
    void this.executeRun(userId, projectId, row.id, suite, selectedModuleIds, environment?.url, authorizationConfirmed).catch(
      async (error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unexpected QA pipeline error';

        await this.prisma.testRun.update({
          where: { id: row.id },
          data: {
            status: 'fail',
            logs: [...logs, `FATAL: ${message}`] as unknown as Prisma.InputJsonValue,
          },
        });
      },
    );

    return this.full(row);
  }

  private async executeRun(
    userId: string,
    projectId: string,
    runId: number,
    suite: RunSuite,
    moduleIds: string[],
    targetUrl?: string,
    authorizationConfirmed = false,
  ): Promise<void> {
    const started = Date.now();
    const stages = this.initialStages();
    const cases: TestCase[] = [];
    const logs: string[] = [
      `QA run #${runId} started`,
      `Project ID: ${projectId}`,
      `Suite: ${suite}`,
      `Selected modules: ${moduleIds.join(', ')}`,
    ];

    const persist = async (status = 'running') => {
      const elapsed = Math.max(0, Math.round((Date.now() - started) / 1000));

      await this.prisma.testRun.update({
        where: { id: runId },
        data: {
          status,
          total: stages.length,
          passed: stages.filter((s) => s.status === 'passed').length,
          failed: stages.filter((s) => s.status === 'failed').length,
          skipped: stages.filter((s) => s.status === 'skipped').length,
          durationSec: elapsed,
          suites: stages as unknown as Prisma.InputJsonValue,
          cases: cases as unknown as Prisma.InputJsonValue,
          logs: [...logs] as unknown as Prisma.InputJsonValue,
        },
      });
    };

    const execute = async (
      key: StageKey,
      work: () => Promise<StageOutcome>,
    ): Promise<void> => {
      const stage = stages.find((item) => item.key === key);
      if (!stage) return;

      const moduleId = STAGE_MODULE[key];
      if (moduleId && !moduleIds.includes(moduleId)) {
        stage.status = 'skipped';
        stage.message = 'Module was not selected for this run.';
        stage.completedAt = new Date().toISOString();
        logs.push(`[SKIPPED] ${stage.name}: ${stage.message}`);
        await persist();
        return;
      }

      const stageStarted = Date.now();
      stage.status = 'running';
      stage.startedAt = new Date().toISOString();
      stage.message = 'Execution started';
      logs.push(`[START] ${stage.name}`);
      await persist();

      try {
        const outcome = await work();
        stage.status = outcome.status;
        stage.message = outcome.message;
        stage.checksRun = outcome.checksRun ?? 0;
        stage.count = outcome.checksRun ?? 0;
        stage.failed = 0;
      } catch (error) {
        stage.status = 'failed';
        stage.message =
          error instanceof Error ? error.message : 'Stage execution failed';
        stage.failed = 1;
        logs.push(`[ERROR] ${stage.name}: ${stage.message}`);
      }

      stage.durationSec = Math.max(
        0,
        Math.round((Date.now() - stageStarted) / 1000),
      );
      stage.completedAt = new Date().toISOString();
      logs.push(`[${stage.status.toUpperCase()}] ${stage.name}: ${stage.message}`);
      await persist();
    };

    await execute('repository', async () => {
      await this.projects.find(userId, projectId);
      return {
        status: 'passed',
        message: 'Project ownership and repository access validated.',
        checksRun: 1,
      };
    });

    let discoveredFiles = 0;

    await execute('discovery', async () => {
      const files = await this.projects.listFiles(userId, projectId);
      discoveredFiles = files.length;

      return {
        status: files.length > 0 ? 'passed' : 'partial',
        message:
          files.length > 0
            ? `Discovered ${files.length} stored project source files.`
            : 'No source files are stored for this project.',
        checksRun: files.length,
      };
    });

    await execute('static', async () => ({
      status: 'skipped',
      message: 'Dedicated static-analysis engine is not configured.',
    }));

    for (const [key, name] of [
      ['functional', 'Functional testing'],
      ['api', 'API testing'],
      ['automation', 'Automation testing'],
      ['regression', 'Regression testing'],
      ['performance', 'Performance testing'],
    ] as const) {
      await execute(key, async () => ({
        status: 'skipped',
        message: `${name} runner is not configured. No tests were executed.`,
      }));
    }

    await execute('security', async () => {
      if (discoveredFiles === 0) {
        return {
          status: 'skipped',
          message: 'Security source audit skipped because no project source files were discovered.',
        };
      }

      const request = {
        mode: 'source',
        authorizationConfirmed: false,
      } as Parameters<SecurityService['spaAudit']>[2];

      const audit = await this.security.spaAudit(
        userId,
        projectId,
        request,
      );

      const partialPhases =
        audit.phases?.filter((phase) => phase.status === 'partial').length ?? 0;
      const skippedPhases =
        audit.phases?.filter((phase) => phase.status === 'skipped').length ?? 0;

      logs.push(
        `Security audit: ${audit.filesScanned} files scanned; ${audit.findings.length} findings; ${audit.endpoints?.length ?? 0} endpoints discovered.`,
      );

      return {
        status:
          partialPhases > 0 || skippedPhases > 0 ? 'partial' : 'passed',
        message:
          `Read-only source audit completed: ${audit.filesScanned} files, ` +
          `${audit.findings.length} findings, ` +
          `${audit.endpoints?.length ?? 0} endpoints. ` +
          'Dynamic scanning was not performed.',
        checksRun: audit.filesScanned,
      };
    });

    await execute('playwright', async () => ({
      status: 'skipped',
      message: 'Playwright browser runner is not configured. No browser tests were executed.',
    }));

    for (const [key, name] of [
      ['compatibility', 'Compatibility testing'],
      ['accessibility', 'Accessibility testing'],
      ['database', 'Database testing'],
      ['integration', 'Integration testing'],
      ['smoke', 'Smoke testing'],
    ] as const) {
      await execute(key, async () => ({
        status: 'skipped',
        message: `${name} runner is not configured. No tests were executed.`,
      }));
    }

    await execute('aggregation', async () => {
      const excludedStages = new Set([
        'repository',
        'discovery',
        'static',
        'aggregation',
        'report',
      ]);

      const executionStages = stages.filter(
        (stage) => !excludedStages.has(stage.key ?? ''),
      );

      const failedStages = executionStages.filter(
        (stage) => stage.status === 'failed',
      );

      const incompleteStages = executionStages.filter(
        (stage) =>
          stage.status === 'skipped' ||
          stage.status === 'partial' ||
          stage.status === 'pending' ||
          stage.status === 'running',
      );

      const status: QaStageStatus =
        failedStages.length > 0
          ? 'failed'
          : incompleteStages.length > 0
            ? 'partial'
            : 'passed';

      return {
        status,
        message:
          `Aggregated ${executionStages.length} execution stages: ` +
          `${failedStages.length} failed, ` +
          `${incompleteStages.length} incomplete.`,
        checksRun: executionStages.reduce(
          (total, stage) => total + (stage.checksRun ?? 0),
          0,
        ),
      };
    });

    await execute('report', async () => ({
      status: 'passed',
      message: 'QA report generated and stored in the TestRun record.',
      checksRun: 1,
    }));

    const passed = stages.filter((s) => s.status === 'passed').length;
    const failed = stages.filter((s) => s.status === 'failed').length;
    const skipped = stages.filter((s) => s.status === 'skipped').length;
    const partial = stages.some((s) => s.status === 'partial');

    const finalStatus: 'pass' | 'fail' | 'partial' =
      failed > 0
        ? 'fail'
        : skipped > 0 || partial
          ? 'partial'
          : 'pass';

    logs.push(
      `QA run completed: ${passed} stages passed, ${failed} failed, ${skipped} skipped.`,
    );

    await persist(finalStatus);

    await this.activity.log(
      userId,
      `QA pipeline #${runId} completed with status ${finalStatus}`,
      failed > 0 ? 'shield' : 'flask',
    );

    await this.prisma.project.update({
      where: { id: projectId },
      data: { lastRun: new Date() },
    });
  }

  async list(
    userId: string,
    projectId?: string,
    suite?: string,
  ): Promise<TestRunSummary[]> {
    const rows = await this.prisma.testRun.findMany({
      where: {
        project: { userId },
        ...(projectId ? { projectId } : {}),
        ...(suite ? { suite } : {}),
      },
      include: { project: { select: { name: true } } },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    return rows.map((r) => this.summary(r));
  }

  async get(userId: string, id: number): Promise<TestRun> {
    const row = await this.prisma.testRun.findFirst({
      where: { id, project: { userId } },
      include: { project: { select: { name: true } } },
    });

    if (!row) throw new NotFoundException('Test run not found');
    return this.full(row);
  }

  async rerun(userId: string, id: number): Promise<TestRun> {
    const prev = await this.get(userId, id);
    return this.run(userId, prev.projectId, prev.suite, prev.environmentId ?? undefined);
  }
}
