import { useNavigate } from '@tanstack/react-router';
import { usePlayer } from '../context/PlayerContext';
import useTheme from '../hooks/useTheme';

const SCREENSAVER_OPTIONS = [
  { label: '30s', value: 30_000 },
  { label: '1 min', value: 60_000 },
  { label: '2 min', value: 120_000 },
  { label: '5 min', value: 300_000 },
  { label: 'Never', value: 0 },
];

export default function SettingsRoute() {
  const { speakers, settings, updateSettings } = usePlayer();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-5 py-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-6">
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-1 -ml-1 text-sonos-muted/50 hover:text-sonos-muted transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1 className="text-base font-medium text-sonos-text">Settings</h1>
        </div>

        <div className="space-y-8">

          {/* Display identity */}
          <section className="space-y-3">
            <h2 className="text-xs text-sonos-muted/50 uppercase tracking-widest">This display</h2>
            <div className="space-y-1">
              <label className="text-sm text-sonos-text">Display name</label>
              <p className="text-xs text-sonos-muted/50 mb-2">Shown in the sidebar — helps identify each wall display</p>
              <input
                type="text"
                value={settings.clientName ?? ''}
                onChange={e => updateSettings({ clientName: e.target.value || null })}
                placeholder="e.g. Kitchen Display"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-sonos-border/20 border border-sonos-border/40 text-sonos-text placeholder:text-sonos-muted/30 outline-none focus:border-sonos-accent transition-colors"
                style={{ '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
              />
            </div>
          </section>

          {/* Default room */}
          <section className="space-y-3">
            <h2 className="text-xs text-sonos-muted/50 uppercase tracking-widest">Default room</h2>
            <p className="text-xs text-sonos-muted/50">This display will auto-open to the selected room on load</p>
            <div className="space-y-1">
              {speakers.map(speaker => {
                const isDefault = settings.defaultSpeakerUuid === speaker.uuid;
                return (
                  <button
                    key={speaker.uuid}
                    onClick={() => updateSettings({
                      defaultSpeakerUuid: isDefault ? null : speaker.uuid
                    })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left ${
                      isDefault
                        ? 'bg-sonos-border/30 text-sonos-text'
                        : 'text-sonos-muted hover:bg-sonos-border/15'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{speaker.name}</p>
                      <p className="text-xs text-sonos-muted/50">{speaker.model}</p>
                    </div>
                    {isDefault && (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </button>
                );
              })}
              {speakers.length === 0 && (
                <p className="text-sonos-muted/40 text-sm py-2">Discovering rooms…</p>
              )}
            </div>
          </section>

          {/* Screensaver */}
          <section className="space-y-3">
            <h2 className="text-xs text-sonos-muted/50 uppercase tracking-widest">Screensaver</h2>
            <p className="text-xs text-sonos-muted/50">Activate ambient mode after inactivity</p>
            <div className="flex gap-2 flex-wrap">
              {SCREENSAVER_OPTIONS.map(opt => {
                const isActive = settings.screensaverDelay === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ screensaverDelay: opt.value })}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'text-black font-medium'
                        : 'bg-sonos-border/20 text-sonos-muted hover:bg-sonos-border/30'
                    }`}
                    style={isActive ? { backgroundColor: 'var(--color-accent)' } : {}}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Appearance */}
          <section className="space-y-3">
            <h2 className="text-xs text-sonos-muted/50 uppercase tracking-widest">Appearance</h2>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-sonos-border/20 hover:bg-sonos-border/30 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-sonos-text">Theme</p>
                <p className="text-xs text-sonos-muted/50">{theme === 'dark' ? 'Dark' : 'Light'} mode</p>
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-sonos-muted/50">
                {theme === 'dark' ? (
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z"/>
                ) : (
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
                )}
              </svg>
            </button>

            <button
              onClick={() => updateSettings({ albumColorAccent: !settings.albumColorAccent })}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-sonos-border/20 hover:bg-sonos-border/30 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-sonos-text">Album colour accent</p>
                <p className="text-xs text-sonos-muted/50">
                  {settings.albumColorAccent
                    ? 'Accent colour matches album art'
                    : 'Accent colour is fixed amber'}
                </p>
              </div>
              {/* Toggle pill */}
              <div
                className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ backgroundColor: settings.albumColorAccent ? 'var(--color-accent)' : 'var(--color-border)' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: settings.albumColorAccent ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </div>
            </button>
          </section>

        </div>
      </div>
    </div>
  );
}
