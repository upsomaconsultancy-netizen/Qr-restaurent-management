import { CommonEngine } from '@angular/ssr';
import { APP_BASE_HREF } from '@angular/common';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from '../dist/ros/server/main.server.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(__dirname, '..', 'dist', 'ros', 'browser');
const indexHtml = join(__dirname, '..', 'dist', 'ros', 'server', 'index.server.html');

const engine = new CommonEngine();

export default async function handler(req, res) {
  const url = `https://${req.headers.host}${req.url}`;

  try {
    const html = await engine.render({
      bootstrap,
      documentFilePath: indexHtml,
      url,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: req.url }],
    });
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.end(html);
  } catch (err) {
    console.error('SSR error:', err);
    res.statusCode = 500;
    res.end('Server error');
  }
}
