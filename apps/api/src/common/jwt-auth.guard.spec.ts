import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

const ctx = (headers: Record<string, string> = {}) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as never;

describe('JwtAuthGuard', () => {
  it('rejects requests without credentials', async () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService({ secret: 's' }), {} as never);
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lets @Public routes through', async () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector, new JwtService({ secret: 's' }), {} as never);
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
  });
});
