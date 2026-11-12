import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface AiResult {
  text: string;
  tokens: number;
}

/**
 * Thin wrapper over the Anthropic Messages API.
 * Returns null when ANTHROPIC_API_KEY is not set or the call fails, so callers
 * can fall back to templates instead of breaking.
 */
@Injectable()
export class AiService {
  private readonly log = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  get enabled(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async complete(system: string, prompt: string, maxTokens = 4000): Promise<AiResult | null> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        this.log.warn(`Anthropic API returned ${res.status}`);
        return null;
      }
      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens: number; output_tokens: number };
      };
      const text = (data.content ?? [])
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
      const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
      return { text, tokens };
    } catch (e) {
      this.log.warn(`Anthropic API call failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  async addTokens(userId: string, tokens: number): Promise<void> {
    if (tokens <= 0) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokensUsed: { increment: tokens } },
    });
  }
}
