import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project, ProjectFile } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { AiService } from '../core/ai.service';
import { PrismaService } from '../core/prisma.service';
import { assistSnippet, stripFence } from './assist';
import { AssistDto, FileDto, UpdateProjectDto } from './projects.dto';
import { toProject } from './project.mapper';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
    private ai: AiService,
  ) {}

  /** Raw row, scoped to the owner. Used by other modules. */
  async find(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async get(userId: string, id: string): Promise<Project> {
    return toProject(await this.find(userId, id));
  }

  async list(userId: string, q?: string, status?: string): Promise<Project[]> {
    const text = q?.trim();
    const rows = await this.prisma.project.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(text
          ? {
              OR: [
                { name: { contains: text, mode: 'insensitive' } },
                { sub: { contains: text, mode: 'insensitive' } },
                { type: { contains: text, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toProject);
  }

  async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30) || 'app';
    let slug = base;
    let i = 1;
    while (await this.prisma.project.findUnique({ where: { slug } })) slug = `${base}-${++i}`;
    return slug;
  }

  async createWithFiles(
    userId: string,
    data: { name: string; sub: string; desc: string; type: string; stack: string[] },
    files: Record<string, string>,
  ) {
    const slug = await this.uniqueSlug(data.name);
    return this.prisma.project.create({
      data: {
        userId,
        ...data,
        slug,
        files: { create: Object.entries(files).map(([path, content]) => ({ path, content })) },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.find(userId, id);
    const data: UpdateProjectDto = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.desc !== undefined) data.desc = dto.desc.trim();
    if (dto.state !== undefined) data.state = dto.state;
    return toProject(await this.prisma.project.update({ where: { id }, data }));
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const project = await this.find(userId, id);
    await this.prisma.project.delete({ where: { id } });
    await this.activity.log(userId, `Deleted ${project.name}`, 'bolt');
    return { ok: true };
  }

  async clone(userId: string, id: string): Promise<Project> {
    const src = await this.find(userId, id);
    const files = await this.prisma.projectFile.findMany({ where: { projectId: id } });
    const copy = await this.createWithFiles(
      userId,
      {
        name: `${src.name} (Copy)`,
        sub: src.sub,
        desc: src.desc,
        type: src.type,
        stack: src.stack,
      },
      Object.fromEntries(files.map((f) => [f.path, f.content])),
    );
    await this.activity.log(userId, `Cloned ${src.name}`, 'ok');
    return toProject(copy);
  }

  async listFiles(userId: string, id: string): Promise<ProjectFile[]> {
    await this.find(userId, id);
    const files = await this.prisma.projectFile.findMany({
      where: { projectId: id },
      orderBy: { path: 'asc' },
    });
    return files.map((f) => ({ path: f.path, content: f.content }));
  }

  async upsertFile(userId: string, id: string, dto: FileDto): Promise<ProjectFile> {
    await this.find(userId, id);
    const file = await this.prisma.projectFile.upsert({
      where: { projectId_path: { projectId: id, path: dto.path } },
      create: { projectId: id, path: dto.path, content: dto.content },
      update: { content: dto.content },
    });
    await this.prisma.project.update({ where: { id }, data: { updatedAt: new Date() } });
    return { path: file.path, content: file.content };
  }

  async deleteFile(userId: string, id: string, path: string): Promise<{ ok: true }> {
    await this.find(userId, id);
    const { count } = await this.prisma.projectFile.deleteMany({
      where: { projectId: id, path },
    });
    if (!count) throw new NotFoundException('File not found');
    return { ok: true };
  }

  async assist(userId: string, id: string, dto: AssistDto): Promise<{ content: string }> {
    const project = await this.find(userId, id);
    const file = await this.prisma.projectFile.findUnique({
      where: { projectId_path: { projectId: id, path: dto.path } },
    });
    if (!file) throw new NotFoundException('File not found');

    const result = await this.ai.complete(
      'You are a senior engineer. Return ONLY the complete updated file content. No markdown fences, no commentary.',
      `Project: ${project.name} (${project.type})\nFile: ${dto.path}\nChange requested: ${dto.prompt}\n\nCurrent content:\n${file.content}`,
      6000,
    );
    if (result) {
      await this.ai.addTokens(userId, result.tokens);
      return { content: stripFence(result.text) };
    }
    return { content: file.content + assistSnippet(dto.prompt, dto.path) };
  }
}
