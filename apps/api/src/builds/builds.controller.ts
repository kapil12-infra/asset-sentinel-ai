import { Body, Controller, Post } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { GenerateDto } from './builds.dto';
import { BuildsService } from './builds.service';

@Controller('projects')
export class BuildsController {
  constructor(private builds: BuildsService) {}

  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateDto) {
    return this.builds.generate(user.id, dto);
  }
}
