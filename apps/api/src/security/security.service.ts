
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type {
  Scan,
  Severity,
  SpaAudit,
  SpaPhaseResult,
  Vulnerability,
} from '@asset-sentinel/shared';

import { ActivityService } from '../core/activity.service';
import { PrismaService } from '../core/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { makeFindings } from './vulns';
import { analyzeFiles, extractEndpoints } from './spa-vapt';
import { SpaAuditDto } from './spa-audit.dto';
import { SpaScannerClient } from './spa-scanner.client';

type DbVuln = {
  id: string;
  name: string;
  severity: string;
  location: string;
  fix: string;
  fixed: boolean;
};

@Injectable()
export class SecurityService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private activity: ActivityService,
    private spaScanner: SpaScannerClient,
  ) {}

  private vuln(v: DbVuln): Vulnerability {
    return {
      id: v.id,
      name: v.name,
      severity: v.severity as Severity,
      location: v.location,
      fix: v.fix,
      fixed: v.fixed,
    };
  }

  private async sync(projectId: string): Promise<void> {
    const open = await this.prisma.vulnerability.count({
      where: { fixed: false, scan: { projectId } },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { issues: open },
    });
  }

  async scan(userId: string, projectId: string): Promise<Scan> {
    const project = await this.projects.find(userId, projectId);

    await this.prisma.scan.deleteMany({
      where: { projectId },
    });

    const created = await this.prisma.scan.create({
      data: {
        projectId,
        vulnerabilities: {
          create: makeFindings(),
        },
      },
      include: { vulnerabilities: true },
    });

    await this.sync(projectId);

    await this.activity.log(
      userId,
      `Security scan on ${project.name}: ${created.vulnerabilities.length} findings`,
      'shield',
    );

    return {
      projectId,
      at: created.at.toISOString(),
      vulnerabilities: created.vulnerabilities.map((v) => this.vuln(v)),
    };
  }

  /**
   * Static SPA VAPT audit.
   * Read-only: does not overwrite or delete stored security scans.
   */
  async spaAudit(
    userId: string,
    projectId: string,
    request: SpaAuditDto,
  ): Promise<SpaAudit> {
    const mode = request.mode ?? 'source';

    if (mode !== 'source' && !request.authorizationConfirmed) {
      throw new BadRequestException(
        'Explicit authorization is required before dynamic scanning.',
      );
    }

    if (mode !== 'source') {
      if (process.env.SPA_SCANNER_ENABLED !== 'true') {
        throw new ServiceUnavailableException(
          'Dynamic SPA scanning is disabled until scanner network isolation and target validation are verified.',
        );
      }
      throw new ServiceUnavailableException(
        'Dynamic SPA scanning is not yet approved for execution.',
      );
    }

    const project = await this.projects.find(userId, projectId);

    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      select: {
        path: true,
        content: true,
      },
    });

    const findings = analyzeFiles(files);
    const endpoints = extractEndpoints(files);

    const phases: SpaPhaseResult[] = [
      {
        phase: 1,
        status: files.length > 0 ? 'partial' : 'skipped',
        message: files.length > 0
          ? 'Static source analysis, source-map inspection, credential-pattern detection with redacted evidence, and supported endpoint extraction completed. Public deployment exposure and credential validity have not been verified.'
          : 'No project source files were available to scan.',
        checksRun: files.length,
        findings: findings.filter((item) => item.phase === 1).length,
      },
      {
        phase: 2,
        status: 'skipped',
        message: 'Live browser spidering, traffic interception and OpenAPI import are not configured.',
        checksRun: 0,
        findings: 0,
      },
      {
        phase: 3,
        status: files.length > 0 ? 'partial' : 'skipped',
        message: files.length > 0
          ? 'Static client-side checks only; browser runtime DOM XSS, storage and authorization tests were not run.'
          : 'No source files available; browser runtime checks were not run.',
        checksRun: files.length,
        findings: findings.filter((item) => item.phase === 3).length,
      },
      {
        phase: 4,
        status: files.length > 0 ? 'partial' : 'skipped',
        message: files.length > 0
          ? 'Static backend heuristics only; authenticated BOLA, mass-assignment and live API tests were not run.'
          : 'No source files available; authenticated API tests were not run.',
        checksRun: files.length,
        findings: findings.filter((item) => item.phase === 4).length,
      },
    ];

    await this.activity.log(
      userId,
      `SPA VAPT audit on ${project.name}: ${findings.length} findings`,
      'shield',
    );

    return {
      projectId,
      at: new Date().toISOString(),
      mode,
      ...(request.targetUrl ? { targetUrl: request.targetUrl } : {}),
      filesScanned: files.length,
      phases,
      endpoints,
      findings,
    };
  }

  async get(
    userId: string,
    projectId: string,
  ): Promise<Scan | null> {
    await this.projects.find(userId, projectId);

    const scan = await this.prisma.scan.findUnique({
      where: { projectId },
      include: { vulnerabilities: true },
    });

    if (!scan) return null;

    return {
      projectId,
      at: scan.at.toISOString(),
      vulnerabilities: scan.vulnerabilities.map((v) => this.vuln(v)),
    };
  }

  async fixAll(
    userId: string,
    projectId: string,
  ): Promise<{ fixed: number }> {
    const project = await this.projects.find(userId, projectId);

    const scan = await this.prisma.scan.findUnique({
      where: { projectId },
    });

    if (!scan) {
      throw new NotFoundException(
        'No scan for this project. Run a scan first.',
      );
    }

    const { count } = await this.prisma.vulnerability.updateMany({
      where: {
        scanId: scan.id,
        fixed: false,
      },
      data: { fixed: true },
    });

    await this.sync(projectId);

    await this.activity.log(
      userId,
      `Auto-fixed ${count} issues on ${project.name}`,
      'shield',
    );

    return { fixed: count };
  }

  async fixOne(
    userId: string,
    vulnId: string,
  ): Promise<Vulnerability> {
    const v = await this.prisma.vulnerability.findFirst({
      where: {
        id: vulnId,
        scan: { project: { userId } },
      },
      include: { scan: true },
    });

    if (!v) {
      throw new NotFoundException('Vulnerability not found');
    }

    const updated = await this.prisma.vulnerability.update({
      where: { id: vulnId },
      data: { fixed: true },
    });

    await this.sync(v.scan.projectId);

    return this.vuln(updated);
  }
}
