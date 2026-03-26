import { Router } from 'express';
import { getSpeakers } from '../discovery/ssdp.js';
import { getQueue } from '../upnp/contentDirectory.js';
import { seekToQueueItem, setAVTransportURI, play } from '../upnp/avTransport.js';
import { setGracePeriod } from '../poller.js';

const router = Router();

function getCoordinatorIp(ip: string): string {
  const speaker = getSpeakers().find(s => s.ip === ip);
  return speaker?.coordinatorIp || ip;
}

function getGroupId(ip: string): string {
  const speaker = getSpeakers().find(s => s.ip === ip);
  return speaker?.groupId || ip;
}

function getCoordinatorRinconId(ip: string): string | null {
  const speakers = getSpeakers();
  const coordIp = getCoordinatorIp(ip);
  const coordinator = speakers.find(s => s.ip === coordIp);
  if (coordinator?.uuid) {
    const uuid = coordinator.uuid.replace(/-/g, '').toUpperCase();
    return `RINCON_${uuid}_01400`;
  }
  return null;
}

router.get('/:ip/queue', async (req, res) => {
  try {
    const coordIp = getCoordinatorIp(req.params.ip);
    res.json(await getQueue(coordIp));
  } catch (err) {
    console.error('[Route] GET queue error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/play-queue-item', async (req, res) => {
  try {
    const { index } = req.body as { index?: number };
    if (index === undefined) { res.status(400).json({ error: 'index required' }); return; }

    const coordIp = getCoordinatorIp(req.params.ip);
    const groupId = getGroupId(req.params.ip);

    const rinconId = getCoordinatorRinconId(req.params.ip);
    if (rinconId) {
      try {
        await setAVTransportURI(coordIp, `x-rincon-queue:${rinconId}#0`, '');
      } catch { /* already playing from queue */ }
    }

    await seekToQueueItem(coordIp, Number(index));
    await play(coordIp);

    setGracePeriod(groupId, 'track', 5000);
    setGracePeriod(groupId, 'transportState', 5000);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] play-queue-item error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
