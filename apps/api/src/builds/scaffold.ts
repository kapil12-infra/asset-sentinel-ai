import type { ProjectType } from '@asset-sentinel/shared';

export interface Model {
  title: string;
  sub: string;
  stack: string[];
}

export const MODELS: Record<ProjectType, Model> = {
  'Web App': { title: 'Web App', sub: 'React + Vite', stack: ['React', 'TypeScript', 'Vite'] },
  API: { title: 'API Service', sub: 'Node + Express', stack: ['Node.js', 'Express', 'TypeScript'] },
  Mobile: { title: 'Mobile App', sub: 'React Native', stack: ['React Native', 'Expo', 'TypeScript'] },
  'Full Stack': { title: 'Full Stack App', sub: 'React + Node + Postgres', stack: ['React', 'Node.js', 'PostgreSQL'] },
  Platform: { title: 'Platform', sub: 'Microservices + Docker', stack: ['Docker', 'Kubernetes', 'Node.js'] },
};

/** Guesses a project type from a free-text prompt. */
export function inferType(prompt: string): ProjectType {
  const l = prompt.toLowerCase();
  if (/mobile|android|ios|react native/.test(l)) return 'Mobile';
  if (/microservice|platform|kubernetes/.test(l)) return 'Platform';
  if (/full.?stack|database|postgres/.test(l)) return 'Full Stack';
  if (/\bapi\b|rest|backend|service/.test(l)) return 'API';
  return 'Web App';
}

export function nameFromPrompt(prompt: string): string {
  const words = prompt
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(build|create|make|that|with|for|the|and|app|application|please)$/i.test(w))
    .slice(0, 3);
  return words.length ? words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : 'New Project';
}

const pkg = (name: string, deps: Record<string, string>, scripts: Record<string, string>) =>
  JSON.stringify({ name, version: '0.1.0', private: true, scripts, dependencies: deps }, null, 2) + '\n';

/** Starter files for a generated project. */
export function scaffold(name: string, desc: string, type: ProjectType): Record<string, string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
  const readme = `# ${name}\n\n${desc}\n\n## Getting started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`;
  const gitignore = 'node_modules\ndist\n.env\n';
  const base: Record<string, string> = { 'README.md': readme, '.gitignore': gitignore };

  const web = {
    'package.json': pkg(slug, { react: '^18.3.1', 'react-dom': '^18.3.1' }, { dev: 'vite', build: 'vite build', test: 'vitest run' }),
    'index.html': `<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><title>${name}</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`,
    'src/main.tsx': `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { App } from './App';\n\ncreateRoot(document.getElementById('root')!).render(<App />);\n`,
    'src/App.tsx': `export function App() {\n  return (\n    <main>\n      <h1>${name}</h1>\n      <p>${desc.replace(/`/g, "'").replace(/\{|\}/g, '')}</p>\n    </main>\n  );\n}\n`,
  };
  const api = {
    'package.json': pkg(slug, { express: '^4.19.2' }, { dev: 'ts-node src/server.ts', build: 'tsc', test: 'jest' }),
    'src/server.ts': `import express from 'express';\n\nconst app = express();\napp.use(express.json());\n\napp.get('/health', (_req, res) => res.json({ status: 'ok' }));\n\napp.listen(3000, () => console.log('${name} listening on :3000'));\n`,
  };
  const mobile = {
    'package.json': pkg(slug, { expo: '^51.0.0', react: '^18.3.1', 'react-native': '^0.74.0' }, { start: 'expo start', test: 'jest' }),
    'App.tsx': `import { Text, View } from 'react-native';\n\nexport default function App() {\n  return (\n    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>\n      <Text>${name}</Text>\n    </View>\n  );\n}\n`,
  };
  const dockerfile = `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]\n`;

  switch (type) {
    case 'API':
      return { ...base, ...api, Dockerfile: dockerfile };
    case 'Mobile':
      return { ...base, ...mobile };
    case 'Full Stack':
      return {
        ...base,
        'client/package.json': web['package.json'],
        'client/index.html': web['index.html'],
        'client/src/main.tsx': web['src/main.tsx'],
        'client/src/App.tsx': web['src/App.tsx'],
        'server/package.json': api['package.json'],
        'server/src/server.ts': api['src/server.ts'],
        'docker-compose.yml': `services:\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_PASSWORD: example\n  server:\n    build: ./server\n    ports: ['3000:3000']\n    depends_on: [db]\n`,
      };
    case 'Platform':
      return {
        ...base,
        'services/gateway/src/server.ts': api['src/server.ts'],
        'services/gateway/package.json': api['package.json'],
        'k8s/deployment.yaml': `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${slug}\nspec:\n  replicas: 2\n  selector:\n    matchLabels: { app: ${slug} }\n  template:\n    metadata:\n      labels: { app: ${slug} }\n    spec:\n      containers:\n        - name: ${slug}\n          image: ${slug}:latest\n          ports: [{ containerPort: 3000 }]\n`,
        Dockerfile: dockerfile,
      };
    default:
      return { ...base, ...web };
  }
}
