import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { IntegrationsService } from './integrations.service';

class ConnectDto {
  @IsString()
  @MinLength(6)
  token: string;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(private integrations: IntegrationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.integrations.list(user.id);
  }

  @Post(':id/connect')
  connect(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ConnectDto) {
    return this.integrations.connect(user.id, id, dto.token);
  }

  @Post(':id/disconnect')
  disconnect(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.integrations.disconnect(user.id, id);
  }
}
