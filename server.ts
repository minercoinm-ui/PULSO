import 'dotenv/config';
import {createServer as createHttpServer} from 'node:http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = await createApp();
  const httpServer = createHttpServer(app);

  // ========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // ========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: { server: httpServer },
        ws: { server: httpServer },
      },
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PULSO Sneakers server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

