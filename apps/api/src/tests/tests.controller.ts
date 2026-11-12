import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { RunTestsDto } from './tests.dto';
import { TestsService } from './tests.service';

@Controller()
export class TestsController {
  constructor(private tests: TestsService) {}

  @Post('projects/:id/tests')
  run(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RunTestsDto) {
    return this.tests.run(user.id, id, dto.suite ?? 'all');
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
