import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { SecurityModule } from '../security/security.module';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  imports: [ProjectsModule, SecurityModule],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
