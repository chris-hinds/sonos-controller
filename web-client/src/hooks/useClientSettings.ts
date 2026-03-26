import { useState, useCallback } from 'react';

export interface ClientSettings {
  defaultSpeakerUuid: string | null;
  clientName: string | null;        // e.g. "Kitchen Display"
  screensaverDelay: number;         // ms; 0 = disabled
  albumColorAccent: boolean;        // match accent colour to album art
}

const STORAGE_KEY = 'sonos-client-settings';

const DEFAULTS: ClientSettings = {
  defaultSpeakerUuid: null,
  clientName: null,
  screensaverDelay: 90_000,
  albumColorAccent: true,
};

function load(): ClientSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useClientSettings() {
  const [settings, setSettings] = useState<ClientSettings>(load);

  const updateSettings = useCallback((patch: Partial<ClientSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage quota exceeded or private mode — fail silently
      }
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
