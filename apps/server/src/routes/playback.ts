import { Router } from 'express';
import { getSpeakers } from '../discovery/ssdp.js';
import { play, pause, next, previous, seek, setShuffle, setRepeat, setAVTransportURI } from '../upnp/avTransport.js';
import { getAudioInputs } from '../upnp/contentDirectory.js';
import { setGracePeriod, getGroupState, groupStateMap } from '../poller.js';
import { broadcast } from '../sse/eventBus.js';
import type { GroupState, RepeatMode } from '@sonos/shared';

const router = Router();

function getCoordinatorIp(ip: string): string {
  const speaker = getSpeakers().find(s => s.ip === ip);
  return speaker?.coordinatorIp || ip;
}

function getGroupId(ip: string): string {
  const speaker = getSpeakers().find(s => s.ip === ip);
  return speaker?.groupId || ip;
}

function broadcastOptimisticState(ip: string, updates: Partial<GroupState>): void {
  const groupId = getGroupId(ip);
  const current = groupStateMap.get(groupId);
  if (current) {
    const updated: GroupState = { ...current, ...updates };
    groupStateMap.set(groupId, updated);
    broadcast('groupState', updated);
  }
}

router.post('/:ip/play', async (req, res) => {
  try {
    const coordIp = getCoordinatorIp(req.params.ip);
    await play(coordIp);
    const groupId = getGroupId(req.params.ip);
    setGracePeriod(groupId, 'transportState', 5000);
    broadcastOptimisticState(req.params.ip, { transportState: 'PLAYING' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] play error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/pause', async (req, res) => {
  try {
    const coordIp = getCoordinatorIp(req.params.ip);
    await pause(coordIp);
    const groupId = getGroupId(req.params.ip);
    setGracePeriod(groupId, 'transportState', 5000);
    broadcastOptimisticState(req.params.ip, { transportState: 'PAUSED_PLAYBACK' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] pause error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/next', async (req, res) => {
  try {
    const coordIp = getCoordinatorIp(req.params.ip);
    await next(coordIp);
    const groupId = getGroupId(req.params.ip);
    setGracePeriod(groupId, 'track', 5000);
    broadcastOptimisticState(req.params.ip, { transportState: 'PLAYING' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] next error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/previous', async (req, res) => {
  try {
    const coordIp = getCoordinatorIp(req.params.ip);
    await previous(coordIp);
    const groupId = getGroupId(req.params.ip);
    setGracePeriod(groupId, 'track', 5000);
    broadcastOptimisticState(req.params.ip, { transportState: 'PLAYING' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] previous error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/seek', async (req, res) => {
  try {
    const { seconds } = req.body as { seconds?: number };
    if (seconds === undefined) { res.status(400).json({ error: 'seconds required' }); return; }
    const coordIp = getCoordinatorIp(req.params.ip);
    await seek(coordIp, Number(seconds));
    setGracePeriod(getGroupId(req.params.ip), 'track', 3000);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] seek error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/shuffle', async (req, res) => {
  try {
    const { enabled } = req.body as { enabled?: boolean };
    const coordIp = getCoordinatorIp(req.params.ip);
    const groupId = getGroupId(req.params.ip);
    const state = getGroupState(req.params.ip);
    const currentRepeat: RepeatMode = state?.repeat || 'none';
    await setShuffle(coordIp, Boolean(enabled), currentRepeat);
    setGracePeriod(groupId, 'playMode', 5000);
    broadcastOptimisticState(req.params.ip, { shuffle: Boolean(enabled) });
    res.json({ ok: true });
  } catch (err) {
    if ((err as Error).message.includes('712')) {
      res.json({ ok: false, reason: 'not_supported' });
      return;
    }
    console.error('[Route] shuffle error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/repeat', async (req, res) => {
  try {
    const { mode } = req.body as { mode?: string };
    if (!mode || !['none', 'all', 'one'].includes(mode)) {
      res.status(400).json({ error: 'mode must be none, all, or one' });
      return;
    }
    const repeatMode = mode as RepeatMode;
    const coordIp = getCoordinatorIp(req.params.ip);
    const groupId = getGroupId(req.params.ip);
    const state = getGroupState(req.params.ip);
    const currentShuffle = state?.shuffle || false;
    await setRepeat(coordIp, repeatMode, currentShuffle);
    setGracePeriod(groupId, 'playMode', 5000);
    broadcastOptimisticState(req.params.ip, { repeat: repeatMode });
    res.json({ ok: true });
  } catch (err) {
    if ((err as Error).message.includes('712')) {
      res.json({ ok: false, reason: 'not_supported' });
      return;
    }
    console.error('[Route] repeat error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// Audio inputs — query the individual speaker (not coordinator) as inputs are per-device.
// Home theater soundbars (Arc, Beam, Playbar, Playbase, Ray) may not expose AI: via
// ContentDirectory on newer firmware, so synthesise the TV input from the speaker's UUID.
const HT_MODELS = ['arc', 'beam', 'playbar', 'playbase', 'ray'];

router.get('/:ip/inputs', async (req, res) => {
  try {
    let inputs = await getAudioInputs(req.params.ip);

    if (inputs.length === 0) {
      const speaker = getSpeakers().find(s => s.ip === req.params.ip);
      const model = (speaker?.model || '').toLowerCase();
      if (HT_MODELS.some(m => model.includes(m)) && speaker?.uuid) {
        inputs = [{ id: 'tv', title: 'TV', uri: `x-sonos-htastream:${speaker.uuid}:spdif` }];
      }
    }

    res.json(inputs);
  } catch (err) {
    console.error('[Route] GET inputs error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:ip/play-input', async (req, res) => {
  try {
    const { uri } = req.body as { uri?: string };
    if (!uri) { res.status(400).json({ error: 'uri required' }); return; }
    const coordIp = getCoordinatorIp(req.params.ip);
    const groupId = getGroupId(req.params.ip);
    await setAVTransportURI(coordIp, uri, '');
    await play(coordIp);
    setGracePeriod(groupId, 'track', 5000);
    setGracePeriod(groupId, 'transportState', 5000);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] play-input error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
