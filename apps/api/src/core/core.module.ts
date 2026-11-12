import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ActivityService } from './activity.service';
import { AiService } from './ai.service';
import { CryptoService } from './crypto.service';
import { MetricsStore } from './metrics.store';
import { PrismaService } from './prisma.service';
import { UsersService } from './users.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: (() => {
          const secret = process.env.JWT_SECRET;
          if (!secret || secret.length < 32) {
            throw new Error('JWT_SECRET must be configured with at least 32 characters');
          }
          return secret;
        })(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
      }),
    }),
  ],
  providers: [PrismaService, ActivityService, AiService, CryptoService, UsersService, MetricsStore],
  exports: [PrismaService, ActivityService, AiService, CryptoService, UsersService, MetricsStore],
})
export class CoreModule {}
