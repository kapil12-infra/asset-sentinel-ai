import { AiAnalysisService } from './ai-analysis.service';

describe('AiAnalysisService', () => {
  const prisma = {
    project: {
      findFirst: jest.fn(),
    },
    testRun: {
      findFirst: jest.fn(),
    },
  };

  const ai = {
    enabled: true,
    complete: jest.fn(),
    addTokens: jest.fn(),
  };

  let service: AiAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiAnalysisService(prisma as any, ai as any);

    prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });
    prisma.testRun.findFirst.mockResolvedValue({
      id: 10,
      suite: 'functional',
      status: 'partial',
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      durationSec: 4,
      startedAt: new Date(),
      suites: [],
      cases: [{ name: 'Login', result: 'Failed', error: 'Invalid password' }],
      logs: [],
    });

    ai.complete.mockResolvedValue({
      text: JSON.stringify({
        summary: 'One test failed.',
        category: 'functional',
        findings: [{
          title: 'Login failure',
          severity: 'medium',
          explanation: 'The login test failed.',
          rootCause: 'The supplied evidence is insufficient to establish the root cause.',
          recommendation: 'Review the authentication response and test credentials.',
          verificationSteps: ['Repeat the login test with approved test data.'],
          confidence: 'low',
        }],
        limitations: ['Root cause is not confirmed.'],
        humanReviewRequired: true,
      }),
      tokens: 100,
    });

    ai.addTokens.mockResolvedValue(undefined);
  });

  it('analyses an owned project test run', async () => {
    const result = await service.analyzeTestRun(
      'user-1',
      'project-1',
      10,
      'functional',
    );

    expect(result.summary).toBe('One test failed.');
    expect(result.humanReviewRequired).toBe(true);
    expect(ai.addTokens).toHaveBeenCalledWith('user-1', 100);
  });

  it('rejects a project not owned by the user', async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      service.analyzeTestRun('other-user', 'project-1', 10, 'functional'),
    ).rejects.toThrow('Project not found');

    expect(ai.complete).not.toHaveBeenCalled();
  });

  it('rejects malformed Claude JSON', async () => {
    ai.complete.mockResolvedValue({ text: 'not-json', tokens: 10 });

    await expect(
      service.analyzeTestRun('user-1', 'project-1', 10, 'functional'),
    ).rejects.toThrow('invalid JSON');
  });
});
