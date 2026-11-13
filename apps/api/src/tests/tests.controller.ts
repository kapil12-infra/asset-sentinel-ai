import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { RunTestsDto } from './tests.dto';
import { TestsService } from './tests.service';
import { FUNCTIONAL_TEST_CATALOG } from './functional-catalog';
import { API_TEST_CATALOG } from './api-catalog';
import { TESTING_CATALOG } from './testing-catalog';

@Controller()
export class TestsController {
  constructor(private tests: TestsService) {}

  @Post('projects/:id/tests')
  run(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RunTestsDto) {
    return this.tests.run(user.id, id, dto.suite ?? 'all', dto.environmentId, dto.moduleIds, dto.authorizationConfirmed ?? false);
  }

  @Get('tests/catalog')
  testingCatalog() {
    const modules = TESTING_CATALOG.map((module) => {
      if (module.id === 'api') {
        return {
          ...module,
          subcategoryCount: API_TEST_CATALOG.length,
          testCaseCount: API_TEST_CATALOG.reduce(
            (total, category) => total + category.tests.length,
            0,
          ),
        };
      }

      if (module.id !== 'functional') return module;

      return {
        ...module,
        subcategoryCount: FUNCTIONAL_TEST_CATALOG.length,
        testCaseCount: FUNCTIONAL_TEST_CATALOG.reduce(
          (total, category) => total + category.tests.length,
          0,
        ),
      };
    });

    return {
      platform: 'Asset Sentinel QA',
      totalModules: modules.length,
      totalCatalogued: modules.filter((module) => module.status === 'catalogued').length,
      totalPlanned: modules.filter((module) => module.status === 'planned').length,
      modules,
    };
  }

  @Get('tests/catalog/api')
  apiCatalog() {
    return {
      category: 'api',
      label: 'API Testing',
      totalCategories: API_TEST_CATALOG.length,
      totalCases: API_TEST_CATALOG.reduce(
        (total, category) => total + category.tests.length,
        0,
      ),
      categories: API_TEST_CATALOG,
    };
  }

  @Get('tests/catalog/functional')
  functionalCatalog() {
    return {
      category: 'functional',
      label: 'Functional Testing',
      totalCategories: FUNCTIONAL_TEST_CATALOG.length,
      totalCases: FUNCTIONAL_TEST_CATALOG.reduce(
        (total, category) => total + category.tests.length,
        0,
      ),
      categories: FUNCTIONAL_TEST_CATALOG,
    };
  }

  @Get('tests')
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string, @Query('suite') suite?: string) {
    return this.tests.list(user.id, projectId, suite);
  }

  @Get('tests/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tests.get(user.id, id);
  }

  @Post('tests/:id/rerun')
  rerun(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tests.rerun(user.id, id);
  }
}
