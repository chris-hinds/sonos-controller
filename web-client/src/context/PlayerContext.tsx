import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import useSpeakers from '../hooks/useSpeakers';
import useSpeakerState from '../hooks/useSpeakerState';
import useAlbumColor from '../hooks/useAlbumColor';
import { useClientSettings } from '../hooks/useClientSettings';
import useTheme from '../hooks/useTheme';
import api from '../api/sonosApi';
import type { GroupState, SpeakerInfo } from '../../../shared/types';
import type { ClientSettings } from '../hooks/useClientSettings';

interface PlayerContextValue {
  // Speakers
  speakers: SpeakerInfo[];
  selectedIp: string | null;
  selectedSpeaker: SpeakerInfo | null;
  setSelectedIp: (ip: string | null) => void;
  speakerState: GroupState | null;
  // Album colour
  albumR: number;
  albumG: number;
  albumB: number;
  // Playback
  transitioning: boolean;
  handleTrackChange: () => void;
  // Screensaver
  screensaver: boolean;
  setScreensaver: (v: boolean) => void;
  resetInactivity: () => void;
  // Drawer (mobile sidebar)
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  // Settings
  settings: ClientSettings;
  updateSettings: (patch: Partial<ClientSettings>) => void;
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const speakers = useSpeakers();
  const { settings, updateSettings } = useClientSettings();
  const { theme, toggle: toggleTheme } = useTheme();
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [screensaver, setScreensaver] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const speakerState = useSpeakerState(selectedIp);
  const artUrl = speakerState?.track?.albumArtUrl
    ? api.artUrl(speakerState.track.albumArtUrl)
    : null;
  const [albumR, albumG, albumB] = useAlbumColor(artUrl);
  const prevTrackUriRef = useRef<string | undefined>(undefined);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultAppliedRef = useRef(false);

  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    const delay = settings.screensaverDelay ?? 90_000;
    if (delay > 0) {
      inactivityTimer.current = setTimeout(() => setScreensaver(true), delay);
    }
  }, [settings.screensaverDelay]);

  // Auto-select default speaker
  useEffect(() => {
    if (defaultAppliedRef.current || selectedIp || speakers.length === 0) return;
    const match = speakers.find(s => s.uuid === settings.defaultSpeakerUuid);
    if (match) setSelectedIp(match.ip);
    defaultAppliedRef.current = true;
  }, [speakers, settings.defaultSpeakerUuid, selectedIp]);

  // Inactivity timer
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'wheel'];
    const handler = () => { setScreensaver(false); resetInactivity(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivity]);

  // Track change detection
  useEffect(() => {
    const uri = speakerState?.track?.uri;
    if (transitioning && uri && uri !== prevTrackUriRef.current) {
      setTransitioning(false);
    }
    prevTrackUriRef.current = uri;
  }, [speakerState?.track?.uri, transitioning]);

  const handleTrackChange = useCallback(() => {
    prevTrackUriRef.current = speakerState?.track?.uri;
    setTransitioning(true);
  }, [speakerState?.track?.uri]);

  const selectedSpeaker = speakers.find(s => s.ip === selectedIp) ?? null;

  return (
    <PlayerContext.Provider value={{
      speakers, selectedIp, selectedSpeaker, setSelectedIp,
      speakerState, albumR, albumG, albumB,
      transitioning, handleTrackChange,
      screensaver, setScreensaver, resetInactivity,
      drawerOpen, setDrawerOpen,
      settings, updateSettings,
      theme, toggleTheme,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
