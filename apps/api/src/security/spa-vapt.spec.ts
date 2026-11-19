
import { analyzeFiles, extractEndpoints, SPA_CHECKLIST } from './spa-vapt';

const run = (path: string, content: string) =>
  analyzeFiles([{ path, content }]);

const checks = (path: string, content: string) =>
  run(path, content).map((f) => f.check);

describe('SPA VAPT static analysis', () => {
  it('flags source maps and sourcemap build flags', () => {
    expect(checks('dist/main.js.map', '{}')).toContain('Source map file uploaded');
    expect(checks('vite.config.ts', 'build: { sourcemap: true }'))
      .toContain('Source maps enabled in build config');
  });

  it('finds secrets without echoing their value', () => {
    const f = run(
      'src/cfg.ts',
      "const apiKey = 'abcd1234efgh5678';\nconst k='AKIAABCDEFGHIJKLMNOP';",
    );
    expect(f.map((x) => x.check)).toEqual(
      expect.arrayContaining([
        'Hardcoded credential assignment',
        'Hardcoded AWS access key',
      ]),
    );
    expect(JSON.stringify(f)).not.toContain('abcd1234efgh5678');
    expect(JSON.stringify(f)).not.toContain('AKIAABCDEFGHIJKLMNOP');
  });

  it('flags DOM XSS sinks and escalates when a URL source is present', () => {
    const plain = run(
      'a.tsx',
      '<div dangerouslySetInnerHTML={{ __html: x }} />',
    );
    expect(plain[0].severity).toBe('Medium');

    const hot = run(
      'b.tsx',
      'const q = window.location.hash;\n<div dangerouslySetInnerHTML={{ __html: q }} />',
    );
    expect(
      hot.find((f) => f.check === 'dangerouslySetInnerHTML')?.severity,
    ).toBe('High');
  });

  it('flags tokens in web storage', () => {
    expect(
      checks('a.ts', "localStorage.setItem('auth_token', t)"),
    ).toContain('Auth token stored in web storage');
  });

  it('flags permissive CORS, mass assignment, BOLA and introspection', () => {
    expect(checks('s.ts', "app.use(cors({ origin: '*' }))"))
      .toContain('CORS allows any origin');

    expect(
      checks('s.ts', 'prisma.user.update({ where: { id }, data: req.body })'),
    ).toContain('Possible mass assignment');

    expect(
      checks('s.ts', 'prisma.doc.findUnique({ where: { id: req.params.id } })'),
    ).toContain('Possible BOLA / IDOR');

    expect(checks('s.ts', 'new ApolloServer({ introspection: true })'))
      .toContain('GraphQL introspection enabled');
  });

  it('is quiet on clean code and caps repeats', () => {
    expect(
      run('a.ts', 'export const add = (a: number, b: number) => a + b;'),
    ).toHaveLength(0);

    const many = Array.from({ length: 30 }, () => 'eval(x)').join('\n');
    expect(
      run('a.ts', many).filter(
        (f) => f.check === 'eval / Function constructor',
      ),
    ).toHaveLength(20);
  });

  it('marks heuristic findings as unverified static findings', () => {
    const finding = run('src/app.tsx', 'eval(userInput)')[0];

    expect(finding).toMatchObject({
      source: 'static',
      confidence: 'medium',
      verified: false,
    });
  });

  it('checklist covers all four phases', () => {
    expect(new Set(SPA_CHECKLIST.map((i) => i.phase)))
      .toEqual(new Set([1, 2, 3, 4]));
  });
});


describe('SPA VAPT Phase 1 enhanced analysis', () => {
  it('inspects embedded source-map content for credentials', () => {
    const map = JSON.stringify({
      version: 3,
      sources: ['src/config.ts'],
      sourcesContent: [
        "const apiKey = 'abcd1234efgh5678';",
      ],
    });

    const findings = run('dist/app.js.map', map);

    expect(findings.map((f) => f.check)).toContain(
      'Hardcoded credential assignment',
    );
    expect(JSON.stringify(findings)).not.toContain('abcd1234efgh5678');
  });

  it('creates stable finding IDs for unchanged source', () => {
    const first = run('src/app.ts', 'eval(userInput)');
    const second = run('src/app.ts', 'eval(userInput)');

    expect(first[0]?.id).toBe(second[0]?.id);
  });

  it('does not duplicate identical findings at the same location', () => {
    const findings = run(
      'src/app.ts',
      'eval(userInput); eval(otherInput);',
    );

    expect(
      findings.filter((f) => f.check === 'eval / Function constructor'),
    ).toHaveLength(1);
  });

  it('does not report source-map files as proof of public exposure', () => {
    const finding = run('dist/app.js.map', '{}').find(
      (f) => f.check === 'Source map file uploaded',
    );

    expect(finding?.detail).toContain(
      'does not by itself prove public deployment exposure',
    );
    expect(finding?.verified).toBe(false);
  });
});

describe('SPA endpoint extraction', () => {
  it('discovers fetch and Axios endpoints with source locations', () => {
    const endpoints = extractEndpoints([
      {
        path: 'src/api.ts',
        content: [
          "fetch('/api/users');",
          "axios.get('/api/orders');",
        ].join('\n'),
      },
    ]);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/api/users',
          method: 'FETCH',
          sourceFile: 'src/api.ts',
          line: 1,
        }),
        expect.objectContaining({
          path: '/api/orders',
          method: 'GET',
          sourceFile: 'src/api.ts',
          line: 2,
        }),
      ]),
    );
  });

  it('removes query strings and fragments from discovered URLs', () => {
    const endpoints = extractEndpoints([
      {
        path: 'src/client.ts',
        content: "fetch('https://api.example.com/users?token=secret#profile');",
      },
    ]);

    expect(endpoints[0]?.path).toBe('https://api.example.com/users');
    expect(JSON.stringify(endpoints)).not.toContain('secret');
  });

  it('ignores dependency and build directories', () => {
    const endpoints = extractEndpoints([
      { path: 'node_modules/lib/client.js', content: "fetch('/api/ignored');" },
      { path: 'dist/client.js', content: "fetch('/api/ignored');" },
    ]);

    expect(endpoints).toHaveLength(0);
  });
});
