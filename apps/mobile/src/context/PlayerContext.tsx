import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroupState, QueueItem, SpeakerInfo } from '@/types/sonos';
import { useServer } from './ServerContext';
import { useMediaControl } from '@/hooks/useMediaControl';
import { useApi } from '@/hooks/useApi';

const SPEAKERS_CACHE_KEY = '@sonos/speakers';

interface PlayerContextValue {
  speakers: SpeakerInfo[];
  selectedIp: string | null;
  setSelectedIp: (ip: string | null) => void;
  groupState: GroupState | null;
  isConnected: boolean;
  queue: QueueItem[];
  loadingQueue: boolean;
  refreshQueue: () => void;
  refreshSpeakers: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue>({
  speakers: [],
  selectedIp: null,
  setSelectedIp: () => {},
  groupState: null,
  isConnected: false,
  queue: [],
  loadingQueue: false,
  refreshQueue: () => {},
  refreshSpeakers: async () => {},
});

function connectSSE(
  url: string,
  onEvent: (type: string, data: unknown) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    let buffer = '';
    let lastProcessed = 0;

    const processBuffer = () => {
      const newText = xhr.responseText.slice(lastProcessed);
      lastProcessed = xhr.responseText.length;
      buffer += newText;

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const eventStr of events) {
        if (!eventStr.trim()) continue;
        let eventType = 'message';
        let eventData = '';
        for (const line of eventStr.split('\n')) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim();
          if (line.startsWith('data: ')) eventData = line.slice(6).trim();
        }
        if (eventData) {
          try {
            onEvent(eventType, JSON.parse(eventData));
          } catch {
            // ignore parse errors
          }
        }
      }
    };

    xhr.onreadystatechange = () => {
      if (
        xhr.readyState === XMLHttpRequest.LOADING ||
        xhr.readyState === XMLHttpRequest.DONE
      ) {
        processBuffer();
      }
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 0 && !signal.aborted) {
          reject(new Error('Network error'));
        } else {
          resolve();
        }
      }
    };

    signal.addEventListener('abort', () => xhr.abort());
    xhr.send();
  });
}

function MediaControlBridge({
  groupState,
  selectedIp,
  speakers,
}: {
  groupState: GroupState | null;
  selectedIp: string | null;
  speakers: SpeakerInfo[];
}) {
  const { serverUrl } = useServer();
  const { post } = useApi();

  const speaker = speakers.find((s) => s.ip === selectedIp);
  const coordinatorIp = speaker?.coordinatorIp || speaker?.ip || selectedIp || '';

  useMediaControl(groupState, serverUrl, {
    onPlay: () => coordinatorIp && post(`/api/speakers/${coordinatorIp}/play`).catch(() => {}),
    onPause: () => coordinatorIp && post(`/api/speakers/${coordinatorIp}/pause`).catch(() => {}),
    onNext: () => coordinatorIp && post(`/api/speakers/${coordinatorIp}/next`).catch(() => {}),
    onPrevious: () => coordinatorIp && post(`/api/speakers/${coordinatorIp}/previous`).catch(() => {}),
  });

  return null;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { serverUrl, isConfigured } = useServer();
  const { get } = useApi();
  const [speakers, setSpeakers] = useState<SpeakerInfo[]>([]);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  // Load cached speakers on first mount so rooms are available immediately
  useEffect(() => {
    AsyncStorage.getItem(SPEAKERS_CACHE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const cached = JSON.parse(raw) as SpeakerInfo[];
        setSpeakers((prev) => (prev.length === 0 ? cached : prev));
        setSelectedIp((prev) => {
          if (prev) return prev;
          return cached.find((s) => s.isCoordinator)?.ip ?? null;
        });
      } catch { /* ignore corrupt cache */ }
    });
  }, []);
  const [groupStateMap, setGroupStateMap] = useState<Record<string, GroupState>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const connectRef = useRef<(() => void) | null>(null);

  const handleEvent = useCallback((type: string, data: unknown) => {
    if (type === 'speakers') {
      const speakerList = data as SpeakerInfo[];
      setSpeakers(speakerList);
      AsyncStorage.setItem(SPEAKERS_CACHE_KEY, JSON.stringify(speakerList)).catch(() => {});
      // Auto-select first coordinator if nothing selected
      setSelectedIp((prev) => {
        if (prev) return prev;
        const coordinator = speakerList.find((s) => s.isCoordinator);
        return coordinator?.ip ?? null;
      });
    } else if (type === 'groupState') {
      const state = data as GroupState;
      setGroupStateMap((prev) => ({
        ...prev,
        [state.coordinatorIp]: state,
      }));
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000);
    retryCountRef.current += 1;
    retryTimeoutRef.current = setTimeout(() => {
      connectRef.current?.();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (!isConfigured || !serverUrl) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsConnected(false);

    connectSSE(`${serverUrl}/api/events`, handleEvent, controller.signal)
      .then(() => {
        setIsConnected(false);
        // Reconnect after clean close
        if (!controller.signal.aborted) {
          scheduleReconnect();
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setIsConnected(false);
        scheduleReconnect();
      });

    setIsConnected(true);
  }, [serverUrl, isConfigured, handleEvent, scheduleReconnect]);

  // Keep connectRef current so scheduleReconnect can call latest version
  connectRef.current = connect;

  useEffect(() => {
    if (!isConfigured || !serverUrl) return;

    retryCountRef.current = 0;
    connect();

    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [serverUrl, isConfigured]);

  // Derive coordinatorIp for selected speaker
  const coordinatorIp = React.useMemo(() => {
    if (!selectedIp) return null;
    const speaker = speakers.find((s) => s.ip === selectedIp);
    return speaker?.coordinatorIp || speaker?.ip || selectedIp;
  }, [selectedIp, speakers]);

  const refreshSpeakers = useCallback(async () => {
    if (!serverUrl) return;
    try {
      const data = await get('/api/speakers');
      const speakerList = Array.isArray(data) ? (data as SpeakerInfo[]) : [];
      setSpeakers(speakerList);
      AsyncStorage.setItem(SPEAKERS_CACHE_KEY, JSON.stringify(speakerList)).catch(() => {});
      setSelectedIp((prev) => {
        if (prev && speakerList.some((s) => s.ip === prev)) return prev;
        return speakerList.find((s) => s.isCoordinator)?.ip ?? null;
      });
    } catch { /* ignore */ }
  }, [serverUrl, get]);

  const refreshQueue = useCallback(async () => {
    if (!coordinatorIp) return;
    setLoadingQueue(true);
    try {
      const data = await get(`/api/speakers/${coordinatorIp}/queue`);
      setQueue(Array.isArray(data) ? data : []);
    } catch {
      setQueue([]);
    } finally {
      setLoadingQueue(false);
    }
  }, [coordinatorIp, get]);

  // Reload queue when the coordinator changes (room switch)
  useEffect(() => {
    if (coordinatorIp) {
      refreshQueue();
    } else {
      setQueue([]);
    }
  }, [coordinatorIp]);

  // Derive groupState for selected speaker
  const groupState = React.useMemo(() => {
    if (!selectedIp) return null;
    const speaker = speakers.find((s) => s.ip === selectedIp);
    if (!speaker) return null;
    const coordinatorIp = speaker.coordinatorIp || speaker.ip;
    return groupStateMap[coordinatorIp] ?? null;
  }, [selectedIp, speakers, groupStateMap]);

  return (
    <PlayerContext.Provider
      value={{
        speakers,
        selectedIp,
        setSelectedIp,
        groupState,
        isConnected,
        queue,
        loadingQueue,
        refreshQueue,
        refreshSpeakers,
      }}
    >
      <MediaControlBridge
        groupState={groupState}
        selectedIp={selectedIp}
        speakers={speakers}
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
