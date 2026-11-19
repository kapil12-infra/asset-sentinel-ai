import { Injectable, Logger } from '@nestjs/common';
import type { Project } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { AiService } from '../core/ai.service';
import { UsersService } from '../core/users.service';
import { DeployService } from '../deploy/deploy.service';
import { toProject } from '../projects/project.mapper';
import { ProjectsService } from '../projects/projects.service';
import { SecurityService } from '../security/security.service';
import { TestsService } from '../tests/tests.service';
import { GenerateDto } from './builds.dto';
import { MODELS, nameFromPrompt, scaffold } from './scaffold';

@Injectable()
export class BuildsService {
  private readonly log = new Logger(BuildsService.name);

  constructor(
    private projects: ProjectsService,
    private ai: AiService,
    private users: UsersService,
    private activity: ActivityService,
    private tests: TestsService,
    private security: SecurityService,
    private deploy: DeployService,
  ) {}

  async generate(userId: string, dto: GenerateDto): Promise<Project> {
    const model = MODELS[dto.type];
    const name = dto.name?.trim() || nameFromPrompt(dto.prompt);
    const files = scaffold(name, dto.prompt, dto.type);

    // With an API key, ask the model for the main source file; keep the scaffold otherwise.
    const mainPath = files['src/App.tsx'] ? 'src/App.tsx' : files['src/server.ts'] ? 'src/server.ts' : null;
    if (mainPath) {
      const result = await this.ai.complete(
        'You are a senior engineer. Return ONLY the complete source file. No markdown fences, no commentary.',
        `Write ${mainPath} for a ${dto.type} named "${name}". Requirement: ${dto.prompt}\nStarter file:\n${files[mainPath]}`,
        4000,
      );
      if (result?.text.trim()) {
        const m = result.text.trim().match(/^```[\w-]*\n([\s\S]*?)\n```$/);
        files[mainPath] = m ? m[1] : result.text;
        await this.ai.addTokens(userId, result.tokens);
      }
    }

    const row = await this.projects.createWithFiles(
      userId,
      { name, sub: model.sub, desc: dto.prompt, type: dto.type, stack: model.stack },
      files,
    );
    await this.activity.log(userId, `Generated ${name} (${dto.type})`, 'bolt');

    const prefs = await this.users.getPrefs(userId);
    try {
      if (prefs.autoTest) await this.tests.run(userId, row.id, 'all');
      if (prefs.autoScan) await this.security.scan(userId, row.id);
      if (prefs.autoDeploy) await this.deploy.deploy(userId, { projectId: row.id, stage: 'DEV', method: 'Docker' });
    } catch (e) {
      this.log.warn(`Post-build automation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return toProject(await this.projects.find(userId, row.id));
  }
}
