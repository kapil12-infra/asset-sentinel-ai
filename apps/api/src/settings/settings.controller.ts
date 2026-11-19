import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { SettingsService } from './settings.service';

class KeyDto {
  @IsString() @MinLength(2) @MaxLength(60) name: string;
}

class InviteDto {
  @IsEmail() email: string;
  @IsIn(['Admin', 'Developer', 'QA Engineer', 'Viewer']) role: string;
}

class PrefsDto {
  @IsOptional() @IsBoolean() emailNotif?: boolean;
  @IsOptional() @IsBoolean() autoTest?: boolean;
  @IsOptional() @IsBoolean() autoScan?: boolean;
  @IsOptional() @IsBoolean() autoDeploy?: boolean;
}

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('api-keys') keys(@CurrentUser() u: AuthUser) { return this.settings.listKeys(u.id); }
  @Post('api-keys') createKey(@CurrentUser() u: AuthUser, @Body() d: KeyDto) { return this.settings.createKey(u.id, d.name); }
  @Delete('api-keys/:id') deleteKey(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.settings.deleteKey(u.id, id); }

  @Get('team') team(@CurrentUser() u: AuthUser) { return this.settings.team(u.id); }
  @Post('team') invite(@CurrentUser() u: AuthUser, @Body() d: InviteDto) { return this.settings.invite(u.id, d.email, d.role); }
  @Delete('team/:id') removeMember(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.settings.removeMember(u.id, id); }

  @Get('billing') billing(@CurrentUser() u: AuthUser) { return this.settings.billing(u.id); }

  @Get('preferences') prefs(@CurrentUser() u: AuthUser) { return this.settings.prefs(u.id); }
  @Patch('preferences') setPrefs(@CurrentUser() u: AuthUser, @Body() d: PrefsDto) { return this.settings.setPrefs(u.id, d); }
}
