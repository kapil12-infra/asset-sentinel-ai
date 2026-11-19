import { Injectable } from '@nestjs/common';
import type { DashboardSummary } from '@asset-sentinel/shared';
import { AI_TOKEN_CAP } from '../core/constants';
import { ActivityService } from '../core/activity.service';
import { PrismaService } from '../core/prisma.service';
import { UsersService } from '../core/users.service';
import { toProject } from '../projects/project.mapper';

const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private users: UsersService,
  ) {}

  async summary(userId: string): Promise<DashboardSummary> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const [user, projects, sums, critical, running, recent, runs, activity] = await Promise.all([
      this.users.require(userId),
      this.prisma.project.count({ where: { userId } }),
      this.prisma.testRun.aggregate({
        where: { project: { userId } },
        _sum: { total: true, passed: true, failed: true },
      }),
      this.prisma.vulnerability.count({
        where: { severity: 'Critical', fixed: false, scan: { project: { userId } } },
      }),
      this.prisma.environment.findMany({
        where: { status: 'Running', project: { userId } },
        select: { projectId: true },
        distinct: ['projectId'],
      }),
      this.prisma.project.findMany({
        where: { userId, lastRun: { not: null } },
        orderBy: { lastRun: 'desc' },
        take: 3,
      }),
      this.prisma.testRun.findMany({
        where: { project: { userId }, startedAt: { gte: start } },
        select: { startedAt: true, total: true },
      }),
      this.activity.list(userId, 10),
    ]);

    const total = sums._sum.total ?? 0;
    const passed = sums._sum.passed ?? 0;

    const buckets = new Map<string, number>();
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      labels.push(dayLabel(d));
      buckets.set(dayLabel(d), 0);
    }
    for (const r of runs) {
      const key = dayLabel(r.startedAt);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + r.total);
    }

    return {
      projects,
      testsExecuted: total,
      bugsFound: sums._sum.failed ?? 0,
      criticalIssues: critical,
      deployedApps: running.length,
      passRate: total ? Math.round((passed / total) * 1000) / 10 : 100,
      trend: labels.map((date) => ({ date, tests: buckets.get(date) ?? 0 })),
      recentProjects: recent.map(toProject),
      activity,
      tokens: { used: user.tokensUsed, cap: AI_TOKEN_CAP },
    };
  }
}
