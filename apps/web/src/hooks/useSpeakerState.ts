import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import { subscribe } from '../api/sseClient';
import type { GroupState } from '@sonos/shared';

export default function useSpeakerState(speakerIp: string | null): GroupState | null {
  const [state, setState] = useState<GroupState | null>(null);

  useEffect(() => {
    if (!speakerIp) { setState(null); return; }

    api.getSpeakerState(speakerIp)
      .then(data => { if (data && !(data as { error?: string }).error) setState(data); })
      .catch(() => { /* ignore */ });

    return subscribe('groupState', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as GroupState;
        if (
          data.coordinatorIp === speakerIp ||
          (Array.isArray(data.members) && data.members.includes(speakerIp))
        ) {
          setState(data);
        }
      } catch { /* ignore */ }
    });
  }, [speakerIp]);

  return state;
}
