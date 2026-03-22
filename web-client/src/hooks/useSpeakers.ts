import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import { subscribe } from '../api/sseClient';
import type { SpeakerInfo } from '../../../shared/types';

export default function useSpeakers(): SpeakerInfo[] {
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([]);

  useEffect(() => {
    api.getSpeakers()
      .then(data => { if (Array.isArray(data)) setSpeakers(data); })
      .catch(err => console.error('[useSpeakers] fetch error:', err));

    return subscribe('speakers', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SpeakerInfo[];
        if (Array.isArray(data)) setSpeakers(data);
      } catch { /* ignore */ }
    });
  }, []);

  return speakers;
}
