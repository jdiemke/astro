import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * CORS: muss VOR den static handlern laufen, sonst fehlen die Header bei Assets.
 */
app.use((req, res, next): void => {
  const origin = req.headers.origin;

  // Für lokale Entwicklung: nur den Origin erlauben, der wirklich zugreifen soll.
  // (Wenn du mehrere Origins brauchst, erweitere diese Liste.)
  const allowedOrigins = new Set(['http://localhost:8080']);

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');

    // Falls du Cookies/Authorization über Origins hinweg brauchst, zusätzlich:
    // res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Preflight (CORS) beantworten
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');

    const requestHeaders = req.headers['access-control-request-headers'];
    if (requestHeaders) {
      res.setHeader('Access-Control-Allow-Headers', String(requestHeaders));
    }

    return void res.sendStatus(204);
  }

  next();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
