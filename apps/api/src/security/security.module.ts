import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { SpaScannerClient } from './spa-scanner.client';

@Module({
  imports: [ProjectsModule],
  controllers: [SecurityController],
  providers: [
    SecurityService,
    SpaScannerClient,
  ],
  exports: [SecurityService],
})
export class SecurityModule {}
