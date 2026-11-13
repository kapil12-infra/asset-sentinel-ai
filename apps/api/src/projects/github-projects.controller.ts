import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { ConnectGitHubDto } from './github-projects.dto';
import { GitHubProjectsService } from './github-projects.service';

@Controller('projects/:id/github')
export class GitHubProjectsController {
  constructor(private readonly github: GitHubProjectsService) {}

  @Get('status')
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.github.status(user.id, id);
  }

  @Post('connect')
  connect(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ConnectGitHubDto,
  ) {
    return this.github.connect(user.id, id, dto);
  }

  @Delete('disconnect')
  disconnect(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.github.disconnect(user.id, id);
  }
}
