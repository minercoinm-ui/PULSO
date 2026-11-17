import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.js';
import { UPLOADS_DIR, ensureSupabaseSeeded } from './server/storeRepository.js';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await ensureSupabaseSeeded().catch(() => null);
  const app = createApiApp();

  // Serve local uploaded product/banner media safely when running on Node
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Vite middleware (DEV) or static dist assets + SPA fallback (PROD)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PULSO Sneakers server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
