import { Injectable } from '@nestjs/common';
import type { Environment } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { sleep } from '../core/constants';
import { PrismaService } from '../core/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { DeployDto } from './deploy.dto';
import { envUrl } from './env-url';


@Injectable()
export class DeployService {
  constructor(
    private prisma: PrismaService,
    private projects: ProjectsService,
    private activity: ActivityService,
  ) {}

  async deploy(userId: string, dto: DeployDto): Promise<Environment> {
    const project = await this.projects.find(userId, dto.projectId);
    const url = envUrl(dto.stage, project.slug);
    await this.prisma.environment.upsert({
      where: { projectId_stage: { projectId: project.id, stage: dto.stage } },
      create: { projectId: project.id, stage: dto.stage, url, status: 'Deploying' },
      update: { status: 'Deploying' },
    });
    await sleep(1500);
    const row = await this.prisma.environment.update({
      where: { projectId_stage: { projectId: project.id, stage: dto.stage } },
      data: { status: 'Running', lastDeployAt: new Date() },
      include: { project: { select: { name: true } } },
    });
    if (dto.stage === 'PROD') {
      await this.prisma.project.update({ where: { id: project.id }, data: { state: 'Live' } });
    }
    await this.activity.log(userId, `Deployed ${project.name} to ${dto.stage} via ${dto.method}`, 'cloud');
    return {
      id: row.id,
      projectId: row.projectId,
      projectName: row.project.name,
      stage: row.stage,
      url: row.url,
      status: row.status as Environment['status'],
      lastDeployAt: row.lastDeployAt ? row.lastDeployAt.toISOString() : null,
    };
  }

}
