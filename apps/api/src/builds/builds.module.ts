import { Module } from '@nestjs/common';
import { DeployModule } from '../deploy/deploy.module';
import { ProjectsModule } from '../projects/projects.module';
import { SecurityModule } from '../security/security.module';
import { TestsModule } from '../tests/tests.module';
import { BuildsController } from './builds.controller';
import { BuildsService } from './builds.service';

@Module({
  imports: [ProjectsModule, TestsModule, SecurityModule, DeployModule],
  controllers: [BuildsController],
  providers: [BuildsService],
})
export class BuildsModule {}
