import { SUITE_KEYS, simulateRun } from './suites';

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('simulateRun', () => {
  it('is deterministic with a seeded rng', () => {
    expect(simulateRun('api', seeded(7))).toEqual(simulateRun('api', seeded(7)));
  });

  it('counts add up', () => {
    const r = simulateRun('all', seeded(3));
    expect(r.passed + r.failed).toBe(r.total);
    expect(r.suites).toHaveLength(SUITE_KEYS.length);
    expect(r.cases).toHaveLength(r.total);
  });

  it('only failed cases have an error', () => {
    const r = simulateRun('all', seeded(11));
    r.cases.forEach((c) => expect(!!c.error).toBe(c.result === 'Failed'));
  });
});
