import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { GitHubProjectsController } from './github-projects.controller';
import { GitHubProjectsService } from './github-projects.service';

@Module({
  controllers: [
    ProjectsController,
    GitHubProjectsController,
  ],
  providers: [
    ProjectsService,
    GitHubProjectsService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
