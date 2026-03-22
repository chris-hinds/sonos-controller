import { Router } from 'express';
import { getSpeakers } from '../discovery/ssdp.js';
import { setVolume, setMute } from '../upnp/renderingControl.js';
import { setGracePeriod, getGroupState, groupStateMap } from '../poller.js';
import { broadcast } from '../sse/eventBus.js';
import type { GroupState, SpeakerInfo } from '../../../shared/types.js';

const router = Router();

function getSpeakerInfo(ip: string): SpeakerInfo | undefined {
  return getSpeakers().find(s => s.ip === ip);
}

function getGroupId(ip: string): string {
  return getSpeakerInfo(ip)?.groupId || ip;
}

function getGroupMembers(ip: string): string[] {
  const speaker = getSpeakerInfo(ip);
  if (!speaker?.groupMembers?.length) return [ip];
  return speaker.groupMembers;
}

function broadcastVolumeUpdate(groupId: string, speakerIp: string, newVolume: number | null, newMute: boolean | null): void {
  const current = groupStateMap.get(groupId);
  if (!current) return;
  const prev = current.volume?.[speakerIp] || { volume: 0, mute: false };
  const updated: GroupState = {
    ...current,
    volume: {
      ...current.volume,
      [speakerIp]: {
        volume: newVolume !== null ? newVolume : prev.volume,
        mute: newMute !== null ? newMute : prev.mute,
      },
    },
  };
  groupStateMap.set(groupId, updated);
  broadcast('groupState', updated);
}

// POST /api/speakers/:ip/volume  body: { volume: 0-100 }
router.post('/:ip/volume', async (req, res) => {
  try {
    const { volume } = req.body as { volume?: number };
    if (volume === undefined) { res.status(400).json({ error: 'volume required' }); return; }

    const targetVolume = Math.max(0, Math.min(100, Number(volume)));
    const ip = req.params.ip;
    const groupId = getGroupId(ip);
    const speaker = getSpeakerInfo(ip);
    const isCoordinator = speaker?.isCoordinator || speaker?.coordinatorIp === ip || !speaker?.coordinatorIp;

    if (isCoordinator) {
      const memberIps = getGroupMembers(ip);

      if (memberIps.length <= 1) {
        await setVolume(ip, targetVolume);
      } else {
        const state = getGroupState(ip);
        const volumeState = state?.volume || {};
        const currentVolumes = memberIps.map(memberIp => ({
          ip: memberIp,
          volume: volumeState[memberIp]?.volume ?? 20,
        }));
        const maxCurrent = Math.max(...currentVolumes.map(v => v.volume), 1);

        await Promise.allSettled(
          currentVolumes.map(({ ip: memberIp, volume: currentVol }) => {
            const ratio = currentVol / maxCurrent;
            const newVol = Math.round(targetVolume * ratio);
            setGracePeriod(groupId, `volume_${memberIp}`, 3000);
            return setVolume(memberIp, newVol);
          })
        );
      }
    } else {
      await setVolume(ip, targetVolume);
    }

    setGracePeriod(groupId, `volume_${ip}`, 3000);
    broadcastVolumeUpdate(groupId, ip, targetVolume, null);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] volume error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/speakers/:ip/mute  body: { muted: bool }
router.post('/:ip/mute', async (req, res) => {
  try {
    const { muted } = req.body as { muted?: boolean };
    if (muted === undefined) { res.status(400).json({ error: 'muted required' }); return; }

    const ip = req.params.ip;
    await setMute(ip, Boolean(muted));
    const groupId = getGroupId(ip);
    setGracePeriod(groupId, `volume_${ip}`, 3000);
    broadcastVolumeUpdate(groupId, ip, null, Boolean(muted));
    res.json({ ok: true });
  } catch (err) {
    console.error('[Route] mute error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
