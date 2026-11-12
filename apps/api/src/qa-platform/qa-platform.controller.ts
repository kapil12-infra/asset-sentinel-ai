import { Controller, Get } from '@nestjs/common';
import {
  PROJECT_TESTING_PROFILES,
  QA_MODULES,
  QA_WORKFLOW,
} from './qa-platform.catalog';

@Controller('qa-platform')
export class QaPlatformController {
  @Get('catalog')
  getCatalog() {
    return {
      platform: 'Asset Sentinel QA AI',
      version: '1.0.0',
      totalModules: QA_MODULES.length,
      modules: QA_MODULES.map((module) => ({
        id: module.id,
        name: module.name,
        description: module.description,
        engine: module.engine,
        subcategories: [...module.subcategories],
        subcategoryCount: module.subcategories.length,
        status: 'catalogued',
        executionStatus: 'not_executed',
      })),
    };
  }

  @Get('workflow')
  getWorkflow() {
    return {
      totalSteps: QA_WORKFLOW.length,
      steps: QA_WORKFLOW,
    };
  }

  @Get('project-profiles')
  getProjectProfiles() {
    return PROJECT_TESTING_PROFILES;
  }
}
