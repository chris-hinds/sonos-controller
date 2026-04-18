export type TransportState = 'PLAYING' | 'PAUSED_PLAYBACK' | 'STOPPED' | 'TRANSITIONING';
export type RepeatMode = 'none' | 'all' | 'one';

export interface SpeakerInfo {
  ip: string;
  uuid: string;
  name: string;
  model: string;
  isCoordinator: boolean;
  groupId: string;
  coordinatorIp: string;
  groupMembers?: string[];
}

export interface TrackInfo {
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  duration: number;
  position: number;
  uri: string;
}

export interface GroupState {
  groupId: string;
  coordinatorIp: string;
  members: string[];
  transportState: TransportState;
  track: TrackInfo;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: Record<string, { volume: number; mute: boolean }>;
  container: { title: string | null; type: 'playlist' | 'radio' } | null;
}

export interface FavoriteItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtURI: string;
  uri: string;
  class: string;
  metadata: string;
}

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtURI: string;
  uri: string;
  class: string;
  index: number;
  duration?: number; // seconds
}
