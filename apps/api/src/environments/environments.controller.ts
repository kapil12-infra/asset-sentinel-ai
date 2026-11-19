import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { CreateEnvDto } from '../deploy/deploy.dto';
import { EnvironmentsService } from './environments.service';

@Controller('environments')
export class EnvironmentsController {
  constructor(private envs: EnvironmentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.envs.list(user.id, projectId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEnvDto) {
    return this.envs.create(user.id, dto);
  }

  @Post(':id/toggle')
  toggle(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.envs.toggle(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.envs.remove(user.id, id);
  }
}
