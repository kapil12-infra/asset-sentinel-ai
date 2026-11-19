import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { ApiKeyInfo, Billing, Preferences, TeamMember } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { AI_TOKEN_CAP } from '../core/constants';
import { CryptoService } from '../core/crypto.service';
import { PrismaService } from '../core/prisma.service';
import { UsersService } from '../core/users.service';

export const KEY_PREFIX = 'as_live_';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private users: UsersService,
    private activity: ActivityService,
  ) {}

  private info(k: { id: string; name: string; prefix: string; last4: string; createdAt: Date }): ApiKeyInfo {
    return { id: k.id, name: k.name, prefix: k.prefix, last4: k.last4, createdAt: k.createdAt.toISOString() };
  }

  async listKeys(userId: string): Promise<ApiKeyInfo[]> {
    const rows = await this.prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.info(r));
  }

  async createKey(userId: string, name: string): Promise<{ key: string; info: ApiKeyInfo }> {
    const key = KEY_PREFIX + randomBytes(24).toString('hex');
    const row = await this.prisma.apiKey.create({
      data: { userId, name: name.trim(), prefix: KEY_PREFIX, last4: key.slice(-4), hash: this.crypto.sha256(key) },
    });
    await this.activity.log(userId, `Created API key ${row.name}`, 'bolt');
    return { key, info: this.info(row) };
  }

  async deleteKey(userId: string, id: string): Promise<{ ok: true }> {
    const { count } = await this.prisma.apiKey.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('API key not found');
    return { ok: true };
  }

  async team(userId: string): Promise<TeamMember[]> {
    const [user, rows] = await Promise.all([
      this.users.require(userId),
      this.prisma.teamMember.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
    ]);
    const owner: TeamMember = { id: `owner-${user.id}`, name: user.name, email: user.email, role: 'Owner', status: 'Active' };
    return [owner, ...rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, status: r.status as TeamMember['status'] }))];
  }

  async invite(userId: string, email: string, role: string): Promise<TeamMember> {
    const clean = email.trim().toLowerCase();
    const dup = await this.prisma.teamMember.findFirst({ where: { userId, email: clean } });
    if (dup) throw new ConflictException('Already invited');
    const row = await this.prisma.teamMember.create({
      data: { userId, email: clean, name: clean.split('@')[0], role, status: 'Invited' },
    });
    await this.activity.log(userId, `Invited ${clean} as ${role}`, 'bolt');
    return { id: row.id, name: row.name, email: row.email, role: row.role, status: 'Invited' };
  }

  async removeMember(userId: string, id: string): Promise<{ ok: true }> {
    const { count } = await this.prisma.teamMember.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Member not found');
    return { ok: true };
  }

  async billing(userId: string): Promise<Billing> {
    const user = await this.users.require(userId);
    const now = new Date();
    const invoices = [0, 1, 2].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        period: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        amount: '₹0.00',
        status: (i === 0 ? 'Due' : 'Paid') as 'Paid' | 'Due',
      };
    });
    return { plan: 'Free', tokens: { used: user.tokensUsed, cap: AI_TOKEN_CAP }, invoices };
  }

  prefs(userId: string): Promise<Preferences> {
    return this.users.getPrefs(userId);
  }

  setPrefs(userId: string, patch: Partial<Preferences>): Promise<Preferences> {
    return this.users.setPrefs(userId, patch);
  }
}
