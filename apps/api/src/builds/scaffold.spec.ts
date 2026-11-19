import { inferType, nameFromPrompt, scaffold } from './scaffold';

describe('scaffold helpers', () => {
  it('infers type from prompt', () => {
    expect(inferType('build a REST api for orders')).toBe('API');
    expect(inferType('an android app for fitness')).toBe('Mobile');
    expect(inferType('a landing page')).toBe('Web App');
  });

  it('derives a readable name', () => {
    expect(nameFromPrompt('Build an inventory tracker for warehouses')).toBe('Inventory Tracker Warehouses');
    expect(nameFromPrompt('a b')).toBe('New Project');
  });

  it('creates files for each type', () => {
    expect(Object.keys(scaffold('Shop', 'x', 'Web App'))).toContain('src/App.tsx');
    expect(Object.keys(scaffold('Shop', 'x', 'API'))).toContain('src/server.ts');
    expect(Object.keys(scaffold('Shop', 'x', 'Full Stack'))).toContain('docker-compose.yml');
    expect(Object.keys(scaffold('Shop', 'x', 'Platform'))).toContain('k8s/deployment.yaml');
  });
});
