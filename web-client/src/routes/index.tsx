import { useNavigate } from '@tanstack/react-router';
import { usePlayer } from '../context/PlayerContext';
import NowPlaying from '../components/NowPlaying';
import Controls from '../components/Controls';
import VolumePanel from '../components/VolumePanel';
import Favorites from '../components/Favorites';
import Queue from '../components/Queue';

export default function IndexRoute() {
  const {
    speakers, selectedIp, selectedSpeaker, speakerState,
    transitioning, handleTrackChange,
    drawerOpen, setDrawerOpen,
    settings, updateSettings,
    setScreensaver,
  } = usePlayer();
  const navigate = useNavigate();

  const isDefault = !!selectedSpeaker && settings.defaultSpeakerUuid === selectedSpeaker.uuid;

  const toggleDefault = () => {
    const uuid = selectedSpeaker?.uuid ?? null;
    updateSettings({ defaultSpeakerUuid: settings.defaultSpeakerUuid === uuid ? null : uuid });
  };

  if (!selectedSpeaker) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 h-full">
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
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-5 py-5 space-y-1">

        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-1 -ml-1 text-sonos-muted/40 hover:text-sonos-muted transition-colors"
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
              onClick={toggleDefault}
              className={`p-2 transition-colors ${isDefault ? 'text-sonos-accent' : 'text-sonos-muted/30 hover:text-sonos-muted'}`}
              title={isDefault ? 'Remove default room' : 'Set as default room'}
              style={isDefault ? { color: 'var(--color-accent)' } : {}}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d={isDefault
                  ? "M17 4v7l2 3H5l2-3V4h10zm-5 16c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm0-18H7v2h10V2h-5z"
                  : "M17 4v7l2 3H5l2-3V4h10zm0-2H7C5.9 2 5 2.9 5 4v7L3 14h18l-2-3V4c0-1.1-.9-2-2-2zm-5 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"
                }/>
              </svg>
            </button>
            <button
              onClick={() => setScreensaver(true)}
              className="p-2 text-sonos-muted/30 hover:text-sonos-muted transition-colors"
              title="Screensaver"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zM5 15h14v2H5z"/>
              </svg>
            </button>
            <button
              onClick={() => navigate({ to: '/fullscreen' })}
              className="p-2 text-sonos-muted/30 hover:text-sonos-muted transition-colors"
              title="Fullscreen"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            </button>
          </div>
        </div>

        <NowPlaying state={speakerState} transitioning={transitioning} />
        <Controls speakerIp={selectedIp!} state={speakerState} onTrackChange={handleTrackChange} />
        <VolumePanel speakerIp={selectedIp!} speakers={speakers} state={speakerState} />
        <Favorites speakerIp={selectedIp!} state={speakerState} onTrackChange={handleTrackChange} />
        <Queue speakerIp={selectedIp!} state={speakerState} />
      </div>
    </div>
  );
}
