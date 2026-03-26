import { Router } from 'express';
import { getSpeakers } from '../discovery/ssdp.js';
import { getFavorites } from '../upnp/contentDirectory.js';
import { setAVTransportURI, play, removeAllTracksFromQueue, addURIToQueue, seekToQueueItem } from '../upnp/avTransport.js';
import { setGracePeriod, setContainerForGroup } from '../poller.js';

const router = Router();

function getCoordinatorIp(ip: string): string {
  const speaker = getSpeakers().find(s => s.ip === ip);
  return speaker?.coordinatorIp || ip;
}

function getGroupId(ip: string): string {
  const speaker = getSpeakers().find(s => s.ip === ip);
  return speaker?.groupId || ip;
}

router.get('/:ip/favorites', async (req, res) => {
  try {
    const coordIp = getCoordinatorIp(req.params.ip);
    res.json(await getFavorites(coordIp));
  } catch (err) {
    console.error('[Route] GET favorites error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/speakers/:ip/play-favorite  body: { uri, metadata }
router.post('/:ip/play-favorite', async (req, res) => {
  try {
    const { uri, metadata = '' } = req.body as { uri?: string; metadata?: string };
    if (!uri) { res.status(400).json({ error: 'uri required' }); return; }

    const coordIp = getCoordinatorIp(req.params.ip);
    const groupId = getGroupId(req.params.ip);

    // x-rincon-playlist: local Sonos playlists — must go via queue (SetAVTransportURI returns 714)
    // Everything else (x-rincon-cpcontainer:, direct tracks, radio): SetAVTransportURI with the
    // full outer FV:2 DIDL-Lite metadata, which carries the <res protocolInfo> Sonos needs.
    if (uri.startsWith('x-rincon-playlist:')) {
      await removeAllTracksFromQueue(coordIp);
      await addURIToQueue(coordIp, uri, metadata);

      const coordinator = getSpeakers().find(s => s.ip === coordIp);
      if (coordinator?.uuid) {
        const uuid = coordinator.uuid.replace(/-/g, '').toUpperCase();
        try {
          await setAVTransportURI(coordIp, `x-rincon-queue:${uuid}#0`, '');
        } catch { /* already in queue mode */ }
      }

      await seekToQueueItem(coordIp, 0);
    } else {
      // Strip nested <r:resMD> before sending to SetAVTransportURI — its inner
      // DIDL-Lite causes parse issues when re-encoded for SOAP.
      const cleanMetadata = metadata.replace(/<r:resMD>[\s\S]*?<\/r:resMD>/, '');
      try {
        await setAVTransportURI(coordIp, uri, cleanMetadata);
      } catch (err) {
        const msg = (err as Error).message;
        if (!msg.includes('714')) throw err;

        // 714 = container URI rejected by SetAVTransportURI — try queue path.
        // AddURIToQueue needs service auth (<desc id="cdudn">) from <r:resMD>,
        // combined with a <res> element so Sonos knows the protocol.
        const resMDContent = metadata.match(/<r:resMD>([\s\S]+)/)?.[1]
          ?.match(/<DIDL-Lite[\s\S]*?<\/DIDL-Lite>/)?.[0] ?? '';
        const resElement = metadata.match(/(<res [^>]*>[^<]*<\/res>)/)?.[1] ?? '';
        const queueMetadata = resMDContent
          ? resMDContent.replace(/<\/item>/, `${resElement}</item>`)
          : cleanMetadata;

        await removeAllTracksFromQueue(coordIp);
        await addURIToQueue(coordIp, uri, queueMetadata);
        const coordinator = getSpeakers().find(s => s.ip === coordIp);
        if (coordinator?.uuid) {
          const uuid = coordinator.uuid.replace(/-/g, '').toUpperCase();
          try { await setAVTransportURI(coordIp, `x-rincon-queue:${uuid}#0`, ''); } catch { /* already queued */ }
        }
        // No seek — streaming service containers are loaded asynchronously after
        // AddURIToQueue returns; seeking immediately causes error 711 (empty queue).
      }
    }

    await play(coordIp);

    setGracePeriod(groupId, 'track', 5000);
    setGracePeriod(groupId, 'transportState', 5000);

    // Push container title immediately so it shows before the next poll.
    const titleMatch = metadata.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
    if (titleMatch) {
      const type = uri.startsWith('x-sonosapi-stream:') || uri.startsWith('x-sonosapi-radio:') || uri.startsWith('x-rincon-mp3radio:')
        ? 'radio' : 'playlist';
      setContainerForGroup(groupId, { title: titleMatch[1], type });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] play-favorite error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
