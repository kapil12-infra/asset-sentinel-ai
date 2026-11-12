import { Injectable, NotFoundException } from '@nestjs/common';
import type { Integration } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { CryptoService } from '../core/crypto.service';
import { PrismaService } from '../core/prisma.service';

export const CATALOG: Record<string, string> = {
  github: 'GitHub',
  aws: 'AWS',
  docker: 'Docker Hub',
  jenkins: 'Jenkins',
  slack: 'Slack',
  jira: 'Jira',
};

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private activity: ActivityService,
  ) {}

  async list(userId: string): Promise<Integration[]> {
    const rows = await this.prisma.integration.findMany({ where: { userId } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return Object.entries(CATALOG).map(([id, name]) => {
      const row = byKey.get(id);
      return { id, name, connected: !!row, connectedAt: row ? row.connectedAt.toISOString() : null };
    });
  }

  private async one(userId: string, id: string): Promise<Integration> {
    return (await this.list(userId)).find((i) => i.id === id) as Integration;
  }

  async connect(userId: string, id: string, token: string): Promise<Integration> {
    if (!CATALOG[id]) throw new NotFoundException('Unknown integration');
    const tokenEnc = this.crypto.encrypt(token);
    await this.prisma.integration.upsert({
      where: { userId_key: { userId, key: id } },
      create: { userId, key: id, tokenEnc },
      update: { tokenEnc, connectedAt: new Date() },
    });
    await this.activity.log(userId, `Connected ${CATALOG[id]}`, 'bolt');
    return this.one(userId, id);
  }

  async disconnect(userId: string, id: string): Promise<Integration> {
    if (!CATALOG[id]) throw new NotFoundException('Unknown integration');
    await this.prisma.integration.deleteMany({ where: { userId, key: id } });
    await this.activity.log(userId, `Disconnected ${CATALOG[id]}`, 'bolt');
    return this.one(userId, id);
  }
}
