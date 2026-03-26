import type { SpeakerInfo, GroupState, FavoriteItem, QueueItem, AudioInput } from '../../../shared/types';

export const BASE = import.meta.env.VITE_API_URL || '';

const api = {
  getSpeakers: (): Promise<SpeakerInfo[]> =>
    fetch(`${BASE}/api/speakers`).then(r => r.json()),

  getSpeakerState: (ip: string): Promise<GroupState> =>
    fetch(`${BASE}/api/speakers/${ip}/state`).then(r => r.json()),

  play: (ip: string): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/play`, { method: 'POST' }),

  pause: (ip: string): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/pause`, { method: 'POST' }),

  next: (ip: string): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/next`, { method: 'POST' }),

  previous: (ip: string): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/previous`, { method: 'POST' }),

  seek: (ip: string, seconds: number): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/seek`, {
      method: 'POST',
      body: JSON.stringify({ seconds }),
      headers: { 'Content-Type': 'application/json' },
    }),

  shuffle: (ip: string, enabled: boolean): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/shuffle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
      headers: { 'Content-Type': 'application/json' },
    }),

  repeat: (ip: string, mode: string): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/repeat`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
      headers: { 'Content-Type': 'application/json' },
    }),

  setVolume: (ip: string, volume: number): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/volume`, {
      method: 'POST',
      body: JSON.stringify({ volume }),
      headers: { 'Content-Type': 'application/json' },
    }),

  setMute: (ip: string, muted: boolean): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/mute`, {
      method: 'POST',
      body: JSON.stringify({ muted }),
      headers: { 'Content-Type': 'application/json' },
    }),

  getQueue: (ip: string): Promise<QueueItem[]> =>
    fetch(`${BASE}/api/speakers/${ip}/queue`).then(r => r.json()),

  playQueueItem: (ip: string, index: number): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/play-queue-item`, {
      method: 'POST',
      body: JSON.stringify({ index }),
      headers: { 'Content-Type': 'application/json' },
    }),

  getFavorites: (ip: string): Promise<FavoriteItem[]> =>
    fetch(`${BASE}/api/speakers/${ip}/favorites`).then(r => r.json()),

  playFavorite: (ip: string, uri: string, metadata = ''): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/play-favorite`, {
      method: 'POST',
      body: JSON.stringify({ uri, metadata }),
      headers: { 'Content-Type': 'application/json' },
    }),

  getInputs: (ip: string): Promise<AudioInput[]> =>
    fetch(`${BASE}/api/speakers/${ip}/inputs`).then(r => r.json()),

  playInput: (ip: string, uri: string): Promise<Response> =>
    fetch(`${BASE}/api/speakers/${ip}/play-input`, {
      method: 'POST',
      body: JSON.stringify({ uri }),
      headers: { 'Content-Type': 'application/json' },
    }),

  artUrl: (rawUrl: string): string =>
    rawUrl ? `${BASE}/api/art?url=${encodeURIComponent(rawUrl)}` : '',
};

export default api;
