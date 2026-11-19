import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';
import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { BuildsModule } from './builds/builds.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { MetricsInterceptor } from './common/metrics.interceptor';
import { CoreModule } from './core/core.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeployModule } from './deploy/deploy.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ProjectsModule } from './projects/projects.module';
import { QaPlatformModule } from './qa-platform/qa-platform.module';
import { SecurityModule } from './security/security.module';
import { SettingsModule } from './settings/settings.module';
import { TestsModule } from './tests/tests.module';

import { EnvironmentsModule } from './environments/environments.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    CoreModule,
    AiAnalysisModule,
    AuthModule,
    DashboardModule,
    ProjectsModule,
    QaPlatformModule,
    BuildsModule,
    TestsModule,
    SecurityModule,
    DeployModule,
    EnvironmentsModule,
    MonitoringModule,
    IntegrationsModule,
    AgentsModule,
    SettingsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
