import { Router } from 'express';
import { getSpeakers } from '../discovery/ssdp.js';
import { getGroupState } from '../poller.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    res.json(getSpeakers());
  } catch (err) {
    console.error('[Route] GET /speakers error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:ip/state', (req, res) => {
  try {
    const state = getGroupState(req.params.ip);
    if (!state) {
      res.status(404).json({ error: 'No state available for this speaker' });
      return;
    }
    res.json(state);
  } catch (err) {
    console.error('[Route] GET /speakers/:ip/state error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
