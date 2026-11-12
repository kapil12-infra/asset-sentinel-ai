import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL || 'demo@assetsentinel.ai';
  const password = process.env.SEED_PASSWORD || 'Demo@12345';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Demo User', email, passwordHash: await bcrypt.hash(password, 10), role: 'Platform Engineer', org: 'Asset Sentinel' },
  });
  const slug = 'demo-storefront';
  const exists = await prisma.project.findUnique({ where: { slug } });
  if (!exists) {
    await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Demo Storefront',
        sub: 'React + Vite',
        desc: 'Sample e-commerce storefront',
        type: 'Web App',
        stack: ['React', 'TypeScript', 'Vite'],
        slug,
        files: { create: [{ path: 'README.md', content: '# Demo Storefront\n' }, { path: 'src/App.tsx', content: 'export function App() { return <h1>Demo</h1>; }\n' }] },
      },
    });
  }
  console.log(`Seeded ${email} / ${password}`);
}

main().finally(() => prisma.$disconnect());
