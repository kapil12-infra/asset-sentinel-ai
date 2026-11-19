import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from '../core/activity.service';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(
    private dashboard: DashboardService,
    private activity: ActivityService,
  ) {}

  @Get('dashboard')
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(user.id);
  }

  @Get('activity')
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.activity.list(user.id, Number(limit) || 20);
  }
}
