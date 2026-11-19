import { Injectable } from '@nestjs/common';
import type { ActivityItem } from '@asset-sentinel/shared';
import { PrismaService } from './prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  log(userId: string, text: string, type: ActivityItem['type'] = 'ok') {
    return this.prisma.activity.create({ data: { userId, text, type } });
  }

  async list(userId: string, limit = 20): Promise<ActivityItem[]> {
    const rows = await this.prisma.activity.findMany({
      where: { userId },
      orderBy: { at: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((r) => ({
      id: r.id,
      text: r.text,
      type: r.type as ActivityItem['type'],
      at: r.at.toISOString(),
    }));
  }
}
