import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { files as embeddedFiles } from './_embedded.js';

import { addClient, broadcast, sendToClient, getClientCount } from './sse/eventBus.js';
import { startDiscovery, getSpeakers } from './discovery/ssdp.js';
import { startTopologyPolling } from './upnp/topology.js';
import { startPoller, groupStateMap } from './poller.js';

import speakersRouter from './routes/speakers.js';
import playbackRouter from './routes/playback.js';
import volumeRouter from './routes/volume.js';
import queueRouter from './routes/queue.js';
import favoritesRouter from './routes/favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// SSE endpoint
app.get('/api/events', (req, res) => {
  const remove = addClient(res);

  const speakers = getSpeakers();
  if (speakers.length > 0) {
    sendToClient(res, 'speakers', speakers);
  }

  for (const [, state] of groupStateMap.entries()) {
    sendToClient(res, 'groupState', state);
  }

  req.on('close', () => {
    remove();
    console.log('[SSE] Client disconnected');
  });

  console.log('[SSE] New client connected');
});

// Art proxy
app.get('/api/art', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).send('url query parameter required');
    return;
  }

  try {
    const decoded = decodeURIComponent(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const imageRes = await fetch(decoded, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!imageRes.ok) {
      res.status(imageRes.status).send('Failed to fetch image');
      return;
    }
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buffer = await imageRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Art] Error fetching image:', (err as Error).message);
    res.status(500).send('Error fetching image');
  }
});

app.use('/api/speakers', speakersRouter);
app.use('/api/speakers', playbackRouter);
app.use('/api/speakers', volumeRouter);
app.use('/api/speakers', queueRouter);
app.use('/api/speakers', favoritesRouter);

// Serve static files — embedded (binary build) or from disk (Docker/dev)
if (embeddedFiles && embeddedFiles.size > 0) {
  console.log(`[Server] Serving ${embeddedFiles.size} embedded static files`);
  app.use((req, res, next) => {
    // SPA: map unknown paths to index.html
    const key = embeddedFiles!.has(req.path) ? req.path : '/index.html';
    const file = embeddedFiles!.get(key);
    if (!file) return next();
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Cache-Control', key === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable');
    res.send(Buffer.from(file.b64, 'base64'));
  });
} else {
  const staticPath = process.env.STATIC_PATH || join(__dirname, '../../../apps/web/dist');
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    app.get('*', (_req, res) => res.sendFile(join(staticPath, 'index.html')));
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
});

setInterval(() => {
  if (getClientCount() > 0) {
    broadcast('keepalive', { ts: Date.now() });
  }
}, 15000);

async function bootstrap(): Promise<void> {
  await startDiscovery();

  const speakers = getSpeakers();
  if (speakers.length > 0) {
    broadcast('speakers', speakers);
  }

  startTopologyPolling();
  startPoller();

  setInterval(() => {
    broadcast('speakers', getSpeakers());
  }, 35000);
}

bootstrap().catch(err => {
  console.error('[Bootstrap] Error:', err);
});
