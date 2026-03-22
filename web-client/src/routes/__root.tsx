import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { usePlayer } from '../context/PlayerContext';
import SpeakerList from '../components/SpeakerList';
import Screensaver from '../components/Screensaver';

export default function RootLayout() {
  const {
    speakers, selectedIp, selectedSpeaker, setSelectedIp,
    speakerState, albumR, albumG, albumB,
    screensaver, setScreensaver, resetInactivity,
    settings, theme, toggleTheme,
  } = usePlayer();

  const navigate = useNavigate();
  const routerState = useRouterState();
  const isSettings = routerState.location.pathname === '/settings';
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (ip: string) => {
    setSelectedIp(ip);
    setDrawerOpen(false);
    if (isSettings) navigate({ to: '/' });
  };

  return (
    <div
      className="flex flex-col md:flex-row h-screen text-sonos-text overflow-hidden"
      style={{
        background: 'var(--app-bg)',
        ['--album-r' as string]: albumR,
        ['--album-g' as string]: albumG,
        ['--album-b' as string]: albumB,
      }}
    >
      {screensaver && selectedIp && (
        <Screensaver
          state={speakerState}
          speakerName={selectedSpeaker?.name || selectedIp}
          onDismiss={() => { setScreensaver(false); resetInactivity(); }}
        />
      )}

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-64 md:w-56
          border-r border-sonos-border/40
          flex flex-col h-full flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(12px)' }}
      >
        <div className="px-4 py-4 flex items-center justify-between border-b border-sonos-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-sonos-accent flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-black">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-sonos-muted/70 tracking-wide">
              {settings.clientName || 'Sonos'}
            </span>
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
            {/* Settings */}
            <button
              onClick={() => { navigate({ to: isSettings ? '/' : '/settings' }); setDrawerOpen(false); }}
              className={`p-1 transition-colors ${isSettings ? 'text-sonos-accent' : 'text-sonos-muted/40 hover:text-sonos-muted'}`}
              title="Settings"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
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
            defaultUuid={settings.defaultSpeakerUuid}
            onSelect={handleSelect}
          />
        </div>
      </aside>

      {/* Main content — routed */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

// useState needs to be imported
import { useState } from 'react';
