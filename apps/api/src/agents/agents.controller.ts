import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { AgentsService } from './agents.service';

class CreateAgentDto {
  @IsString() @MinLength(2) @MaxLength(60) name: string;
  @IsString() @MinLength(8) @MaxLength(300) description: string;
}

class RunAgentDto {
  @IsOptional() @IsString() @MaxLength(1000) task?: string;
}

@Controller('agents')
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.agents.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgentDto) {
    return this.agents.create(user.id, dto.name, dto.description);
  }

  @Post(':id/run')
  run(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RunAgentDto) {
    return this.agents.run(user.id, id, dto.task);
  }
}
