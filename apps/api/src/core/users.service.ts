import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User as DbUser } from '@prisma/client';
import type { Preferences, User } from '@asset-sentinel/shared';
import { PrismaService } from './prisma.service';

export const DEFAULT_PREFS: Preferences = {
  emailNotif: true,
  autoTest: true,
  autoScan: true,
  autoDeploy: false,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  toUser(u: DbUser): User {
    return { id: u.id, name: u.name, email: u.email, role: u.role, org: u.org };
  }

  async require(id: string): Promise<DbUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getPrefs(id: string): Promise<Preferences> {
    const user = await this.require(id);
    return { ...DEFAULT_PREFS, ...((user.prefs as Partial<Preferences> | null) ?? {}) };
  }

  async setPrefs(id: string, patch: Partial<Preferences>): Promise<Preferences> {
    const next = { ...(await this.getPrefs(id)), ...patch };
    await this.prisma.user.update({
      where: { id },
      data: { prefs: next as unknown as Prisma.InputJsonValue },
    });
    return next;
  }
}
