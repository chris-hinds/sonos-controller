import { useState, useEffect, useRef } from 'react';
import useSpeakers from './hooks/useSpeakers';
import useSpeakerState from './hooks/useSpeakerState';
import useTheme from './hooks/useTheme';
import SpeakerList from './components/SpeakerList';
import NowPlaying from './components/NowPlaying';
import Controls from './components/Controls';
import VolumePanel from './components/VolumePanel';
import Favorites from './components/Favorites';
import Queue from './components/Queue';
import FullscreenPlayer from './components/FullscreenPlayer';
import Screensaver from './components/Screensaver';

export default function App() {
  const speakers = useSpeakers();
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [screensaver, setScreensaver] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const speakerState = useSpeakerState(selectedIp);
  const prevTrackUriRef = useRef<string | undefined>(undefined);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SCREENSAVER_DELAY = 90_000;

  const resetInactivity = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => setScreensaver(true), SCREENSAVER_DELAY);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'wheel'];
    const handler = () => { setScreensaver(false); resetInactivity(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []);

  useEffect(() => {
    const uri = speakerState?.track?.uri;
    if (transitioning && uri && uri !== prevTrackUriRef.current) {
      setTransitioning(false);
    }
    prevTrackUriRef.current = uri;
  }, [speakerState?.track?.uri, transitioning]);

  const handleTrackChange = () => {
    prevTrackUriRef.current = speakerState?.track?.uri;
    setTransitioning(true);
  };

  const selectedSpeaker = speakers.find(s => s.ip === selectedIp) || null;

  return (
    <div className="flex flex-col md:flex-row h-screen text-sonos-text overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      {screensaver && selectedIp && (
        <Screensaver
          state={speakerState}
          speakerName={selectedSpeaker?.name || selectedIp}
          onDismiss={() => { setScreensaver(false); resetInactivity(); }}
        />
      )}
      {fullscreen && selectedIp && (
        <FullscreenPlayer
          state={speakerState}
          speakerIp={selectedIp}
          speakerName={selectedSpeaker?.name || selectedIp}
          onClose={() => setFullscreen(false)}
        />
      )}

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible, mobile: slide-in drawer */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-64 md:w-56
          border-r border-sonos-border/40
          flex flex-col h-full
          flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(12px)' }}
      >
        <div className="px-4 py-4 flex items-center justify-between border-b border-sonos-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-sonos-accent flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-black">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-sonos-muted/70 tracking-wide">Sonos</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1 text-sonos-muted/40 hover:text-sonos-muted transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
                </svg>
              )}
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              className="md:hidden p-1 text-sonos-muted/40 hover:text-sonos-muted transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SpeakerList
            speakers={speakers}
            selectedIp={selectedIp}
            onSelect={(ip) => { setSelectedIp(ip); setDrawerOpen(false); }}
          />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ transition: 'background 0.4s ease' }}>
        {selectedSpeaker ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-5 py-5 space-y-1">

              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="md:hidden p-1 -ml-1 text-sonos-muted/40 hover:text-sonos-muted transition-colors"
                    title="Rooms"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                  </button>
                  <h2 className="text-base font-medium text-sonos-text">{selectedSpeaker.name}</h2>
                  {speakerState?.transportState === 'PLAYING' && (
                    <div className="flex items-end gap-0.5 h-4">
                      <span className="sound-bar" style={{ height: '5px' }} />
                      <span className="sound-bar" style={{ height: '8px' }} />
                      <span className="sound-bar" style={{ height: '5px' }} />
                    </div>
                  )}
                  {speakerState?.members && speakerState.members.length > 1 && (
                    <span className="text-xs text-sonos-muted/40">· {speakerState.members.length} rooms</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setScreensaver(true)}
                    className="p-2 text-sonos-muted/30 hover:text-sonos-muted transition-colors"
                    title="Screensaver"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zM5 15h14v2H5z"/>
                    </svg>
                  </button>
                  {speakerState && (
                    <button
                      onClick={() => setFullscreen(true)}
                      className="p-2 text-sonos-muted/30 hover:text-sonos-muted transition-colors"
                      title="Fullscreen"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Album art */}
              <NowPlaying state={speakerState} transitioning={transitioning} />

              {/* Controls */}
              <Controls speakerIp={selectedIp!} state={speakerState} onTrackChange={handleTrackChange} />

              {/* Volume */}
              <VolumePanel speakerIp={selectedIp!} speakers={speakers} state={speakerState} />

              {/* Favorites + Queue */}
              <Favorites speakerIp={selectedIp!} state={speakerState} onTrackChange={handleTrackChange} />
              <Queue speakerIp={selectedIp!} state={speakerState} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-sonos-muted/20">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p className="text-sonos-muted/50 text-sm">Select a room</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden px-4 py-2 rounded-lg bg-sonos-border/30 text-sonos-muted/60 text-sm hover:bg-sonos-border/50 transition-colors"
            >
              Browse rooms
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
