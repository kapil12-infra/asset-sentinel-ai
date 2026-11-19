import { Injectable, NotFoundException } from '@nestjs/common';
import type { Agent } from '@asset-sentinel/shared';
import { ActivityService } from '../core/activity.service';
import { AiService } from '../core/ai.service';
import { PrismaService } from '../core/prisma.service';

export const DEFAULT_AGENTS: Omit<Agent, 'id'>[] = [
  { kind: 'builder', name: 'Builder Agent', description: 'Generates application code, components and APIs from a prompt.', icon: 'cpu' },
  { kind: 'qa', name: 'QA Agent', description: 'Writes and runs test suites and reports failures with likely causes.', icon: 'flask' },
  { kind: 'security', name: 'Security Agent', description: 'Scans code and dependencies, then proposes fixes for each finding.', icon: 'shield' },
  { kind: 'devops', name: 'DevOps Agent', description: 'Creates CI/CD pipelines, Dockerfiles and deployment manifests.', icon: 'cloud' },
];

const TEMPLATES: Record<string, (task: string) => string> = {
  builder: (t) => `## Plan for: ${t}\n1. Define the data model and API routes\n2. Scaffold UI components\n3. Wire state and error handling\n4. Add unit tests\n\nNo AI key is configured, so this is a template plan.`,
  qa: (t) => `## Test plan for: ${t}\n- Functional: happy path, validation errors, empty state\n- API: status codes, auth, pagination\n- Regression: previously fixed bugs\n- Performance: p95 latency budget\n\nNo AI key is configured, so this is a template plan.`,
  security: (t) => `## Security review for: ${t}\n- Check input validation and output encoding\n- Verify authentication and authorization on every route\n- Audit dependencies for known CVEs\n- Confirm secrets are not committed\n\nNo AI key is configured, so this is a template checklist.`,
  devops: (t) => `## Delivery plan for: ${t}\n- Multi-stage Dockerfile\n- CI: lint, test, build, scan\n- CD: deploy DEV on merge, PROD on approval\n- Health checks and rollback\n\nNo AI key is configured, so this is a template plan.`,
  custom: (t) => `## Result for: ${t}\nNo AI key is configured, so this is a placeholder response.`,
};

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private activity: ActivityService,
  ) {}

  private map(a: { id: string; kind: string; name: string; description: string; icon: string }): Agent {
    return { id: a.id, kind: a.kind as Agent['kind'], name: a.name, description: a.description, icon: a.icon };
  }

  async list(userId: string): Promise<Agent[]> {
    const count = await this.prisma.agent.count({ where: { userId } });
    if (count === 0) {
      await this.prisma.agent.createMany({ data: DEFAULT_AGENTS.map((a) => ({ ...a, userId })) });
    }
    const rows = await this.prisma.agent.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    return rows.map((r) => this.map(r));
  }

  async create(userId: string, name: string, description: string): Promise<Agent> {
    const row = await this.prisma.agent.create({
      data: { userId, kind: 'custom', name: name.trim(), description: description.trim(), icon: 'bolt' },
    });
    await this.activity.log(userId, `Created agent ${row.name}`, 'bolt');
    return this.map(row);
  }

  async run(userId: string, id: string, task?: string): Promise<{ output: string }> {
    const agent = await this.prisma.agent.findFirst({ where: { id, userId } });
    if (!agent) throw new NotFoundException('Agent not found');
    const goal = task?.trim() || 'general review of my workspace';
    const result = await this.ai.complete(
      `You are ${agent.name}. ${agent.description} Reply with a concise, actionable answer in markdown.`,
      goal,
      1500,
    );
    await this.activity.log(userId, `Ran ${agent.name}`, 'bolt');
    if (result) {
      await this.ai.addTokens(userId, result.tokens);
      return { output: result.text };
    }
    return { output: (TEMPLATES[agent.kind] ?? TEMPLATES.custom)(goal) };
  }
}
