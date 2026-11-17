import { createApp } from '../../server/app.ts';

// Netlify Server entrypoint: runs the PULSO Express API (/api/*) and media (/uploads/*).
// The React storefront is served as static files from `dist`.
const app = await createApp();

export default app;

export const config = {
  path: ['/api/*', '/uploads/*'],
};
