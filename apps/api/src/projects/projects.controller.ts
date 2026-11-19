import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AssistDto, FileDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string, @Query('status') status?: string) {
    return this.projects.list(user.id, q, status);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.remove(user.id, id);
  }

  @Post(':id/clone')
  clone(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.clone(user.id, id);
  }

  @Get(':id/files')
  files(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.listFiles(user.id, id);
  }

  @Put(':id/files')
  putFile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: FileDto) {
    return this.projects.upsertFile(user.id, id, dto);
  }

  @Delete(':id/files')
  deleteFile(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('path') path: string) {
    return this.projects.deleteFile(user.id, id, path);
  }

  @Post(':id/assist')
  assist(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AssistDto) {
    return this.projects.assist(user.id, id, dto);
  }
}
