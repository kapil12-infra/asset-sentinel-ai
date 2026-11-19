import type { Project as DbProject } from '@prisma/client';
import type { Project, ProjectState, ProjectStatus, ProjectType } from '@asset-sentinel/shared';

export function toProject(p: DbProject): Project {
  return {
    id: p.id,
    name: p.name,
    sub: p.sub,
    type: p.type as ProjectType,
    desc: p.desc,
    state: p.state as ProjectState,
    status: p.status as ProjectStatus,
    issues: p.issues,
    stack: p.stack,
    slug: p.slug,
    lastRun: p.lastRun ? p.lastRun.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
