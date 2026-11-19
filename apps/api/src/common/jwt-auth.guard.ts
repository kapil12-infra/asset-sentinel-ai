import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { PrismaService } from '../core/prisma.service';
import { IS_PUBLIC } from './public.decorator';

/**
 * Global guard. Accepts either a JWT (`Authorization: Bearer <jwt>`)
 * or an API key (`as_live_...`) in the same header or in `x-api-key`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] ?? '';
    const token: string | undefined = header.startsWith('Bearer ')
      ? header.slice(7)
      : (req.headers['x-api-key'] as string | undefined);
    if (!token) throw new UnauthorizedException('Missing token');

    if (token.startsWith('as_live_')) {
      const hash = createHash('sha256').update(token).digest('hex');
      const key = await this.prisma.apiKey.findUnique({ where: { hash } });
      if (!key) throw new UnauthorizedException('Invalid API key');
      req.user = { id: key.userId };
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
