import { Body, Controller, Post } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { DeployDto } from './deploy.dto';
import { DeployService } from './deploy.service';

@Controller('deployments')
export class DeployController {
  constructor(private deploy: DeployService) {}

  @Post()
  deployApp(@CurrentUser() user: AuthUser, @Body() dto: DeployDto) {
    return this.deploy.deploy(user.id, dto);
  }
}
