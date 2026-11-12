
import { analyzeFiles, extractEndpoints, SPA_CHECKLIST } from './spa-vapt';

const run = (path: string, content: string) =>
  analyzeFiles([{ path, content }]);

const checks = (path: string, content: string) =>
  run(path, content).map((f) => f.check);

describe('SPA VAPT static analysis', () => {
  it('flags source maps and sourcemap build flags', () => {
    expect(checks('dist/main.js.map', '{}')).toContain('Source map exposed');
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
    ).toHaveLength(5);
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
