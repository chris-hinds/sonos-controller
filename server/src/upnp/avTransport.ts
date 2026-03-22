import { soapCall, secondsToHMS, hmsToSeconds } from './soap.js';
import { XMLParser } from 'fast-xml-parser';
import type { RepeatMode } from '../../../shared/types.js';

const SERVICE_PATH = '/MediaRenderer/AVTransport/Control';
const SERVICE_TYPE = 'urn:schemas-upnp-org:service:AVTransport:1';

export interface TransportInfo {
  transportState: string;
  transportStatus: string;
  speed: string;
}

export interface PositionInfo {
  track: string;
  trackDuration: string;
  trackDurationSeconds: number;
  relTime: string;
  relTimeSeconds: number;
  trackURI: string;
  title: string;
  artist: string;
  album: string;
  albumArtURI: string;
}

export interface MediaInfo {
  numTracks: string;
  mediaDuration: string;
  currentURI: string;
  currentURIMetaData: string;
  nextURI: string;
}

export interface TransportSettings {
  playMode: string;
  shuffle: boolean;
  repeat: RepeatMode;
}

const didlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

function parseDidlMetadata(didlXml: string): Pick<PositionInfo, 'title' | 'artist' | 'album' | 'albumArtURI'> {
  if (!didlXml) return { title: '', artist: '', album: '', albumArtURI: '' };
  try {
    const decoded = didlXml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    const parsed = didlParser.parse(decoded);
    const item = parsed?.['DIDL-Lite']?.item || parsed?.['DIDL-Lite']?.container;
    if (!item) return { title: '', artist: '', album: '', albumArtURI: '' };

    const title = item['dc:title'] || item.title || '';
    const artist =
      item['dc:creator'] ||
      item['r:albumArtist'] ||
      item['upnp:artist'] ||
      item.artist ||
      '';
    const album = item['upnp:album'] || item.album || '';
    const albumArtURI =
      item['upnp:albumArtURI'] ||
      item['upnp:albumArtUri'] ||
      (Array.isArray(item['upnp:albumArtURI']) ? item['upnp:albumArtURI'][0] : null) ||
      '';

    return {
      title: typeof title === 'string' ? title : String(title || ''),
      artist: typeof artist === 'string' ? artist : String(artist || ''),
      album: typeof album === 'string' ? album : String(album || ''),
      albumArtURI: typeof albumArtURI === 'string' ? albumArtURI : String(albumArtURI || ''),
    };
  } catch {
    return { title: '', artist: '', album: '', albumArtURI: '' };
  }
}

async function getTransportInfo(ip: string): Promise<TransportInfo> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'GetTransportInfo', { InstanceID: 0 });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:GetTransportInfoResponse'] || body['GetTransportInfoResponse'] || {};
  return {
    transportState: resp.CurrentTransportState || 'STOPPED',
    transportStatus: resp.CurrentTransportStatus || 'OK',
    speed: resp.CurrentSpeed || '1',
  };
}

async function getPositionInfo(ip: string): Promise<PositionInfo> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'GetPositionInfo', { InstanceID: 0 });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:GetPositionInfoResponse'] || body['GetPositionInfoResponse'] || {};

  const trackMetaData: string = resp.TrackMetaData || '';
  const metadata = parseDidlMetadata(trackMetaData);

  return {
    track: resp.Track || '0',
    trackDuration: resp.TrackDuration || '0:00:00',
    trackDurationSeconds: hmsToSeconds(resp.TrackDuration),
    relTime: resp.RelTime || '0:00:00',
    relTimeSeconds: hmsToSeconds(resp.RelTime),
    trackURI: resp.TrackURI || '',
    ...metadata,
  };
}

async function getMediaInfo(ip: string): Promise<MediaInfo> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'GetMediaInfo', { InstanceID: 0 });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:GetMediaInfoResponse'] || body['GetMediaInfoResponse'] || {};
  return {
    numTracks: resp.NrTracks || '0',
    mediaDuration: resp.MediaDuration || '0:00:00',
    currentURI: resp.CurrentURI || '',
    currentURIMetaData: resp.CurrentURIMetaData || '',
    nextURI: resp.NextURI || '',
  };
}

async function getTransportSettings(ip: string): Promise<TransportSettings> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'GetTransportSettings', { InstanceID: 0 });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:GetTransportSettingsResponse'] || body['GetTransportSettingsResponse'] || {};

  const playMode: string = resp.PlayMode || 'NORMAL';
  let shuffle = false;
  let repeat: RepeatMode = 'none';

  if (playMode === 'SHUFFLE') { shuffle = true; repeat = 'all'; }
  else if (playMode === 'SHUFFLE_REPEAT_ONE') { shuffle = true; repeat = 'one'; }
  else if (playMode === 'SHUFFLE_NOREPEAT') { shuffle = true; repeat = 'none'; }
  else if (playMode === 'REPEAT_ALL') { repeat = 'all'; }
  else if (playMode === 'REPEAT_ONE') { repeat = 'one'; }

  return { playMode, shuffle, repeat };
}

async function play(ip: string): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Play', { InstanceID: 0, Speed: 1 });
}

async function pause(ip: string): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Pause', { InstanceID: 0 });
}

async function next(ip: string): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Next', { InstanceID: 0 });
}

async function previous(ip: string): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Previous', { InstanceID: 0 });
}

async function seek(ip: string, seconds: number): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Seek', {
    InstanceID: 0,
    Unit: 'REL_TIME',
    Target: secondsToHMS(seconds),
  });
}

async function setPlayMode(ip: string, mode: string): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'SetPlayMode', {
    InstanceID: 0,
    NewPlayMode: mode,
  });
}

async function setShuffle(ip: string, enabled: boolean, currentRepeat: RepeatMode = 'none'): Promise<void> {
  let mode: string;
  if (enabled) {
    mode = currentRepeat === 'one' ? 'SHUFFLE_REPEAT_ONE' : 'SHUFFLE';
  } else {
    mode = currentRepeat === 'all' ? 'REPEAT_ALL'
         : currentRepeat === 'one' ? 'REPEAT_ONE'
         : 'NORMAL';
  }
  return setPlayMode(ip, mode);
}

async function setRepeat(ip: string, repeatMode: RepeatMode, currentShuffle = false): Promise<void> {
  let mode = 'NORMAL';
  if (repeatMode === 'all' && currentShuffle) mode = 'SHUFFLE';
  else if (repeatMode === 'all') mode = 'REPEAT_ALL';
  else if (repeatMode === 'one' && currentShuffle) mode = 'SHUFFLE_REPEAT_ONE';
  else if (repeatMode === 'one') mode = 'REPEAT_ONE';
  else if (repeatMode === 'none' && currentShuffle) mode = 'SHUFFLE_NOREPEAT';
  return setPlayMode(ip, mode);
}

async function setAVTransportURI(ip: string, uri: string, metadata = ''): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'SetAVTransportURI', {
    InstanceID: 0,
    CurrentURI: uri,
    CurrentURIMetaData: metadata,
  });
}

async function seekToQueueItem(ip: string, index: number): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Seek', {
    InstanceID: 0,
    Unit: 'TRACK_NR',
    Target: index + 1,
  });
}

async function removeAllTracksFromQueue(ip: string): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'RemoveAllTracksFromQueue', { InstanceID: 0 });
}

async function addURIToQueue(ip: string, uri: string, metadata = ''): Promise<void> {
  // Use a longer timeout — streaming service containers require the device to
  // contact the music service to resolve tracks (can take 10–20s).
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'AddURIToQueue', {
    InstanceID: 0,
    EnqueuedURI: uri,
    EnqueuedURIMetaData: metadata,
    DesiredFirstTrackNumberEnqueued: 0,
    EnqueueAsNext: 0,
  }, 20000);
}

export {
  getTransportInfo,
  getPositionInfo,
  getMediaInfo,
  getTransportSettings,
  play,
  pause,
  next,
  previous,
  seek,
  setShuffle,
  setRepeat,
  setPlayMode,
  setAVTransportURI,
  seekToQueueItem,
  removeAllTracksFromQueue,
  addURIToQueue,
};
