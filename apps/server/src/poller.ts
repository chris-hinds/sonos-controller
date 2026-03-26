import { getTransportInfo, getPositionInfo, getTransportSettings, getMediaInfo } from './upnp/avTransport.js';
import { getVolumeAndMute } from './upnp/renderingControl.js';
import { getSpeakers } from './discovery/ssdp.js';
import { broadcast } from './sse/eventBus.js';
import type { GroupState, SpeakerInfo, ContainerInfo, RepeatMode, VolumeEntry } from '@sonos/shared';

const POLL_INTERVAL_MS = 2000;

const groupStateMap = new Map<string, GroupState>();

/** groupId -> field -> grace period end timestamp */
const gracePeriods = new Map<string, Map<string, number>>();

// Track which speakers have already had their warnings logged
const warnedTransport = new Set<string>();
const warnedSettings = new Set<string>();
const warnedPosition = new Set<string>();

let pollerTimer: ReturnType<typeof setInterval> | null = null;
let polling = false;

function setGracePeriod(groupId: string, field: string, ms: number): void {
  if (!gracePeriods.has(groupId)) gracePeriods.set(groupId, new Map());
  gracePeriods.get(groupId)!.set(field, Date.now() + ms);
}

function isInGracePeriod(groupId: string, field: string): boolean {
  const gp = gracePeriods.get(groupId);
  if (!gp) return false;
  const until = gp.get(field);
  if (until === undefined) return false;
  if (Date.now() > until) {
    gp.delete(field);
    return false;
  }
  return true;
}

function getGroupState(ip: string): GroupState | null {
  const speakers = getSpeakers();
  const speaker = speakers.find(s => s.ip === ip);
  if (!speaker) return null;
  const groupId = speaker.groupId || ip;
  return groupStateMap.get(groupId) || null;
}

function buildInitialState(coordinator: SpeakerInfo, members: SpeakerInfo[]): GroupState {
  const groupId = coordinator.groupId || coordinator.ip;
  return {
    groupId,
    coordinatorIp: coordinator.ip,
    members: members.map(m => m.ip),
    transportState: 'STOPPED',
    track: {
      title: '',
      artist: '',
      album: '',
      albumArtUrl: '',
      duration: 0,
      position: 0,
      uri: '',
    },
    shuffle: false,
    repeat: 'none',
    volume: {},
    container: null,
  };
}

function parseContainerInfo(currentURI: string, metadataXml: string): ContainerInfo | null {
  if (!currentURI) return null;
  const isPlaylist = currentURI.startsWith('x-rincon-cpcontainer:') || currentURI.startsWith('x-rincon-playlist:');
  const isRadio =
    currentURI.startsWith('x-sonosapi-stream:') ||
    currentURI.startsWith('x-rincon-mp3radio:') ||
    currentURI.startsWith('x-sonosapi-radio:');
  if (!isPlaylist && !isRadio) return null;

  let title: string | null = null;
  if (metadataXml) {
    try {
      const decoded = metadataXml
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const m = decoded.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
      if (m) title = m[1].trim();
    } catch { /* ignore */ }
  }
  return { title, type: isPlaylist ? 'playlist' : 'radio' };
}

function resolveArtUrl(uri: string, speakerIp: string): string {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return `http://${speakerIp}:1400${uri.startsWith('/') ? '' : '/'}${uri}`;
}

interface PollCoordinatorResult {
  next: GroupState;
  changed: boolean;
}

async function pollCoordinator(coordinator: SpeakerInfo, members: SpeakerInfo[]): Promise<PollCoordinatorResult> {
  const groupId = coordinator.groupId || coordinator.ip;
  const ip = coordinator.ip;

  const existing = groupStateMap.get(groupId) || buildInitialState(coordinator, members);
  let changed = false;
  const next: GroupState = { ...existing, members: members.map(m => m.ip), coordinatorIp: ip };

  // Transport state
  try {
    const transport = await getTransportInfo(ip);
    if (!isInGracePeriod(groupId, 'transportState')) {
      if (transport.transportState !== existing.transportState) {
        next.transportState = transport.transportState as GroupState['transportState'];
        changed = true;
      }
    }
  } catch (err) {
    if (!warnedTransport.has(ip)) {
      console.warn(`[Poller] GetTransportInfo not available for ${ip} (${(err as Error).message}) — transport state will rely on optimistic updates`);
      warnedTransport.add(ip);
    }
  }

  // Position / track info
  try {
    const position = await getPositionInfo(ip);
    if (!isInGracePeriod(groupId, 'track')) {
      const newTrack = {
        title: position.title || '',
        artist: position.artist || '',
        album: position.album || '',
        albumArtUrl: resolveArtUrl(position.albumArtURI, ip),
        duration: position.trackDurationSeconds || 0,
        position: position.relTimeSeconds || 0,
        uri: position.trackURI || '',
      };

      const trackChanged =
        newTrack.title !== existing.track?.title ||
        newTrack.artist !== existing.track?.artist ||
        newTrack.uri !== existing.track?.uri ||
        Math.abs((newTrack.position || 0) - (existing.track?.position || 0)) > 3;

      if (trackChanged) {
        next.track = newTrack;
        changed = true;
      }
    }
  } catch (err) {
    if (!warnedPosition.has(ip)) {
      console.warn(`[Poller] GetPositionInfo not available for ${ip} (${(err as Error).message}) — position will rely on optimistic updates`);
      warnedPosition.add(ip);
    }
  }

  // Container / playlist info
  try {
    const media = await getMediaInfo(ip);
    const container = parseContainerInfo(media.currentURI, media.currentURIMetaData);
    // Don't wipe a known container when the transport is on a queue URI —
    // the title was set via setContainerForGroup when the favorite started.
    const isQueueURI = media.currentURI.startsWith('x-rincon-queue:');
    if (!isQueueURI && JSON.stringify(container) !== JSON.stringify(existing.container)) {
      next.container = container;
      changed = true;
    }
  } catch {
    // getMediaInfo not supported on this speaker — leave container as-is
  }

  // Shuffle / repeat
  try {
    const settings = await getTransportSettings(ip);
    if (!isInGracePeriod(groupId, 'playMode')) {
      if (settings.shuffle !== existing.shuffle || settings.repeat !== existing.repeat) {
        next.shuffle = settings.shuffle;
        next.repeat = settings.repeat as RepeatMode;
        changed = true;
      }
    }
  } catch (err) {
    if (!warnedSettings.has(ip)) {
      console.warn(`[Poller] GetTransportSettings not available for ${ip} — shuffle/repeat will rely on optimistic updates`);
      warnedSettings.add(ip);
    }
  }

  return { next, changed };
}

interface PollVolumesResult {
  volumeState: Record<string, VolumeEntry>;
  volumeChanged: boolean;
}

async function pollVolumes(groupId: string, members: SpeakerInfo[]): Promise<PollVolumesResult> {
  const existing = groupStateMap.get(groupId);
  const volumeState: Record<string, VolumeEntry> = existing?.volume ? { ...existing.volume } : {};
  let volumeChanged = false;

  await Promise.allSettled(
    members.map(async (member) => {
      if (isInGracePeriod(groupId, `volume_${member.ip}`)) return;
      try {
        const { volume, mute } = await getVolumeAndMute(member.ip);
        const prev = volumeState[member.ip];
        if (!prev || prev.volume !== volume || prev.mute !== mute) {
          volumeState[member.ip] = { volume, mute };
          volumeChanged = true;
        }
      } catch (err) {
        console.error(`[Poller] Volume error for ${member.ip}:`, (err as Error).message);
      }
    })
  );

  return { volumeState, volumeChanged };
}

async function pollAll(): Promise<void> {
  if (polling) return;
  polling = true;
  const speakers = getSpeakers();
  if (speakers.length === 0) {
    polling = false;
    return;
  }

  const coordinatorMap = new Map<string, SpeakerInfo[]>();
  for (const speaker of speakers) {
    const coordIp = speaker.coordinatorIp || speaker.ip;
    if (!coordinatorMap.has(coordIp)) coordinatorMap.set(coordIp, []);
    coordinatorMap.get(coordIp)!.push(speaker);
  }

  try {
    await Promise.allSettled(
      Array.from(coordinatorMap.entries()).map(async ([coordIp, members]) => {
        const coordinator = speakers.find(s => s.ip === coordIp);
        if (!coordinator) return;

        const groupId = coordinator.groupId || coordIp;

        try {
          const [{ next, changed }, { volumeState, volumeChanged }] = await Promise.all([
            pollCoordinator(coordinator, members),
            pollVolumes(groupId, members),
          ]);

          const finalState: GroupState = { ...next, volume: volumeState };
          groupStateMap.set(groupId, finalState);

          if (changed || volumeChanged) {
            broadcast('groupState', finalState);
          }
        } catch (err) {
          console.error(`[Poller] Error polling group ${groupId}:`, (err as Error).message);
        }
      })
    );
  } finally {
    polling = false;
  }
}

function startPoller(): void {
  if (pollerTimer) clearInterval(pollerTimer);
  console.log('[Poller] Starting polling loop...');
  pollerTimer = setInterval(() => void pollAll(), POLL_INTERVAL_MS);
  setTimeout(() => void pollAll(), 3000);
}

function stopPoller(): void {
  if (pollerTimer) clearInterval(pollerTimer);
}

function setContainerForGroup(groupId: string, container: ContainerInfo | null): void {
  const existing = groupStateMap.get(groupId);
if (!existing) return;
  const updated = { ...existing, container };
  groupStateMap.set(groupId, updated);
  broadcast('groupState', updated);
}

export { startPoller, stopPoller, getGroupState, setGracePeriod, groupStateMap, setContainerForGroup };
