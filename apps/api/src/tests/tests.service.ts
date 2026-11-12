import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, TestRun as DbRun } from '@prisma/client';
import type { RunSuite, TestCase, TestRun, TestRunSummary, TestSuiteResult } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { PrismaService } from '../core/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { simulateRun } from './suites';

type RunWithProject = DbRun & { project: { name: string } };

@Injectable()
export class TestsService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private activity: ActivityService,
  ) {}

  private summary(r: RunWithProject): TestRunSummary {
    return {
      id: r.id,
      suite: r.suite as RunSuite,
      projectId: r.projectId,
      projectName: r.project.name,
      status: r.status as 'pass' | 'fail',
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

  async run(userId: string, projectId: string, suite: RunSuite): Promise<TestRun> {
    const project = await this.projects.find(userId, projectId);
    const res = simulateRun(suite);
    const status = res.failed ? 'fail' : 'pass';
    const row = await this.prisma.testRun.create({
      data: {
        projectId,
        suite,
        status,
        total: res.total,
        passed: res.passed,
        failed: res.failed,
        skipped: res.skipped,
        durationSec: res.durationSec,
        suites: res.suites as unknown as Prisma.InputJsonValue,
        cases: res.cases as unknown as Prisma.InputJsonValue,
        logs: res.logs as unknown as Prisma.InputJsonValue,
      },
      include: { project: { select: { name: true } } },
    });
    await this.prisma.project.update({
      where: { id: projectId },
      data: { lastRun: new Date(), status: res.failed ? 'warn' : 'pass', issues: res.failed },
    });
    await this.activity.log(
      userId,
      `Ran ${suite} tests on ${project.name}: ${res.passed}/${res.total} passed`,
      'flask',
    );
    return this.full(row);
  }

  async list(userId: string, projectId?: string, suite?: string): Promise<TestRunSummary[]> {
    const rows = await this.prisma.testRun.findMany({
      where: { project: { userId }, ...(projectId ? { projectId } : {}), ...(suite ? { suite } : {}) },
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
    return this.run(userId, prev.projectId, prev.suite);
  }
}
