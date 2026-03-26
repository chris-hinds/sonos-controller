// Domain types shared between server and web-client

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

export interface ContainerInfo {
  title: string | null;
  type: 'playlist' | 'radio';
}

export interface VolumeEntry {
  volume: number;
  mute: boolean;
}

export interface GroupState {
  groupId: string;
  coordinatorIp: string;
  members: string[];
  transportState: TransportState;
  track: TrackInfo;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: Record<string, VolumeEntry>;
  container: ContainerInfo | null;
}

export interface ContentItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtURI: string;
  uri: string;
  class: string;
}

export interface FavoriteItem extends ContentItem {
  metadata: string;
}

export interface QueueItem extends ContentItem {
  index: number;
}

export interface AudioInput {
  id: string;
  title: string;
  uri: string;
}
