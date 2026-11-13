import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TestsService } from './tests.service';

describe('TestsService environment validation', () => {
  const userId = 'user-1';
  const projectId = 'project-1';
  const environmentId = 'env-1';

  let service: TestsService;
  let prisma: any;
  let projects: any;
  let activity: any;

  const environment = {
    id: environmentId,
    stage: 'DEV',
    url: 'https://dev.example.in',
    status: 'Running',
  };

  const makeRun = (envId: string | null = environmentId) => ({
    id: 101,
    projectId,
    environmentId: envId,
    suite: 'functional',
    status: 'running',
    total: 12,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationSec: 0,
    startedAt: new Date(),
    suites: [],
    cases: [],
    logs: [],
    project: { name: 'Demo Project' },
  });

  beforeEach(() => {
    prisma = {
      environment: {
        findFirst: jest.fn().mockResolvedValue(environment),
      },
      testRun: {
        create: jest.fn().mockImplementation(async (args: any) =>
          makeRun(args.data.environmentId),
        ),
        findFirst: jest.fn().mockResolvedValue(makeRun()),
      },
    };

    projects = {
      find: jest.fn().mockResolvedValue({
        id: projectId,
        name: 'Demo Project',
      }),
    };

    activity = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    service = new TestsService(prisma, projects, activity, {} as any, {} as any);

    jest.spyOn(service as any, 'executeRun').mockResolvedValue(undefined);
  });

  it('accepts a Running environment and persists its ID', async () => {
    const result = await service.run(userId, projectId, 'functional', environmentId);

    expect(prisma.environment.findFirst).toHaveBeenCalledWith({
      where: {
        id: environmentId,
        projectId,
        project: { userId },
      },
      select: { id: true, stage: true, url: true, status: true },
    });

    expect(prisma.testRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId, environmentId }),
      }),
    );

    expect(result.environmentId).toBe(environmentId);
  });

  it('rejects a Stopped environment', async () => {
    prisma.environment.findFirst.mockResolvedValue({
      ...environment,
      status: 'Stopped',
    });

    await expect(
      service.run(userId, projectId, 'functional', environmentId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.testRun.create).not.toHaveBeenCalled();
  });

  it('rejects an environment not belonging to the project and user', async () => {
    prisma.environment.findFirst.mockResolvedValue(null);

    await expect(
      service.run(userId, projectId, 'functional', environmentId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.testRun.create).not.toHaveBeenCalled();
  });

  it('preserves the environment when rerunning', async () => {
    prisma.testRun.findFirst.mockResolvedValue(makeRun(environmentId));

    await service.rerun(userId, 101);

    expect(prisma.environment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: environmentId, projectId }),
      }),
    );

    expect(prisma.testRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ environmentId }),
      }),
    );
  });

  it('allows a run without an environment for backward compatibility', async () => {
    const result = await service.run(userId, projectId, 'functional');

    expect(prisma.environment.findFirst).not.toHaveBeenCalled();

    expect(prisma.testRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ environmentId: null }),
      }),
    );

    expect(result.environmentId).toBeNull();
  });
});
