import { makeFindings } from './vulns';

describe('makeFindings', () => {
  it('returns findings with required fields', () => {
    const f = makeFindings(() => 0.5);
    expect(f.length).toBeGreaterThan(0);
    f.forEach((v) => {
      expect(v.name && v.location && v.fix).toBeTruthy();
      expect(['Critical', 'High', 'Medium', 'Low']).toContain(v.severity);
    });
  });
});
