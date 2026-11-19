import { assistSnippet, stripFence } from './assist';

describe('assist helpers', () => {
  it('strips a markdown fence', () => {
    expect(stripFence('```ts\nconst a = 1;\n```')).toBe('const a = 1;');
    expect(stripFence('plain')).toBe('plain');
  });

  it('adds a validator for form prompts', () => {
    expect(assistSnippet('add form validation', 'src/a.ts')).toContain('validateEmail');
  });

  it('uses comments for non-code files', () => {
    expect(assistSnippet('tweak', 'README.md')).toContain('# AI Assist');
  });
});
