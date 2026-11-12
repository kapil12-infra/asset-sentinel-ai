import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { LoginDto, RegisterDto, UpdateMeDto } from './auth.dto';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private oauth: OAuthService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(user.id, dto);
  }

  @Public()
  @Get('oauth/:provider')
  async start(@Param('provider') provider: string, @Res() res: Response) {
    res.redirect(await this.oauth.authorizeUrl(provider));
  }

  @Public()
  @Get('oauth/:provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    res.redirect(await this.oauth.handleCallback(provider, code, state, error));
  }
}
