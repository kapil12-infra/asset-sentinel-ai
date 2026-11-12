import { Controller, Get, Param, Post } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SPA_CHECKLIST } from './spa-vapt';
import { SecurityService } from './security.service';

@Controller()
export class SecurityController {
  constructor(private security: SecurityService) {}

  @Post('projects/:id/scan')
  scan(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.scan(user.id, id);
  }

  @Get('projects/:id/scan')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.get(user.id, id);
  }

  @Post('projects/:id/scan/fix-all')
  fixAll(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.fixAll(user.id, id);
  }

  @Post('projects/:id/spa-audit')
  spaAudit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.security.spaAudit(user.id, id);
  }

  @Get('security/spa-checklist')
  checklist() {
    return SPA_CHECKLIST;
  }

  @Post('security/vulnerabilities/:vid/fix')
  fixOne(@CurrentUser() user: AuthUser, @Param('vid') vid: string) {
    return this.security.fixOne(user.id, vid);
  }
}
