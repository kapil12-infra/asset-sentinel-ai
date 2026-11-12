import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';

@Module({
  imports: [ProjectsModule],
  controllers: [DeployController],
  providers: [DeployService],
  exports: [DeployService],
})
export class DeployModule {}
