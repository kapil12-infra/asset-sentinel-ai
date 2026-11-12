import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { EnvStatus, Environment } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { PrismaService } from '../core/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateEnvDto } from '../deploy/deploy.dto';
import { envUrl } from '../deploy/env-url';

type Row = { id: string; projectId: string; stage: string; url: string; status: string; lastDeployAt: Date | null; project: { name: string } };

@Injectable()
export class EnvironmentsService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private activity: ActivityService,
  ) {}

  private map(e: Row): Environment {
    return {
      id: e.id,
      projectId: e.projectId,
      projectName: e.project.name,
      stage: e.stage,
      url: e.url,
      status: e.status as EnvStatus,
      lastDeployAt: e.lastDeployAt ? e.lastDeployAt.toISOString() : null,
    };
  }

  async list(userId: string, projectId?: string): Promise<Environment[]> {
    const rows = await this.prisma.environment.findMany({
      where: { project: { userId }, ...(projectId ? { projectId } : {}) },
      include: { project: { select: { name: true } } },
      orderBy: [{ projectId: 'asc' }, { stage: 'asc' }],
    });
    return rows.map((r) => this.map(r));
  }

  async create(userId: string, dto: CreateEnvDto): Promise<Environment> {
    const project = await this.projects.find(userId, dto.projectId);
    const exists = await this.prisma.environment.findUnique({
      where: { projectId_stage: { projectId: project.id, stage: dto.stage } },
    });
    if (exists) throw new ConflictException(`Environment ${dto.stage} already exists`);
    const row = await this.prisma.environment.create({
      data: { projectId: project.id, stage: dto.stage, url: envUrl(dto.stage, project.slug), status: 'Stopped' },
      include: { project: { select: { name: true } } },
    });
    return this.map(row);
  }

  private async own(userId: string, id: string): Promise<Row> {
    const row = await this.prisma.environment.findFirst({
      where: { id, project: { userId } },
      include: { project: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Environment not found');
    return row;
  }

  async toggle(userId: string, id: string): Promise<Environment> {
    const env = await this.own(userId, id);
    const next = env.status === 'Running' ? 'Stopped' : 'Running';
    const row = await this.prisma.environment.update({
      where: { id },
      data: { status: next },
      include: { project: { select: { name: true } } },
    });
    await this.activity.log(userId, `${next === 'Running' ? 'Started' : 'Stopped'} ${env.project.name} ${env.stage}`, 'cloud');
    return this.map(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.own(userId, id);
    await this.prisma.environment.delete({ where: { id } });
    return { ok: true };
  }
}
