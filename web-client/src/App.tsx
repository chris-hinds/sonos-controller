import { useState, useEffect, useRef } from 'react';
import useSpeakers from './hooks/useSpeakers';
import useSpeakerState from './hooks/useSpeakerState';
import SpeakerList from './components/SpeakerList';
import NowPlaying from './components/NowPlaying';
import Controls from './components/Controls';
import VolumePanel from './components/VolumePanel';
import Favorites from './components/Favorites';
import Queue from './components/Queue';
import FullscreenPlayer from './components/FullscreenPlayer';

export default function App() {
  const speakers = useSpeakers();
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const speakerState = useSpeakerState(selectedIp);
  const prevTrackUriRef = useRef<string | undefined>(undefined);

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
    <div className="flex flex-col md:flex-row h-screen bg-sonos-dark text-sonos-text overflow-hidden">
      {fullscreen && selectedIp && (
        <FullscreenPlayer
          state={speakerState}
          speakerIp={selectedIp}
          speakerName={selectedSpeaker?.name || selectedIp}
          onClose={() => setFullscreen(false)}
        />
      )}
      <aside className="
        w-full md:w-72 lg:w-80
        bg-sonos-surface
        border-b md:border-b-0 md:border-r border-sonos-border
        flex flex-col
        overflow-hidden
        md:h-full
        max-h-48 md:max-h-none
        flex-shrink-0
      ">
        <div className="p-4 border-b border-sonos-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sonos-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-sonos-text">Sonos</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SpeakerList
            speakers={speakers}
            selectedIp={selectedIp}
            onSelect={setSelectedIp}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedSpeaker ? (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-sonos-text">{selectedSpeaker.name}</h2>
                  {speakerState?.members && speakerState.members.length > 1 && (
                    <p className="text-sm text-sonos-muted">
                      {speakerState.members.length} speakers in group
                    </p>
                  )}
                </div>
                {speakerState?.transportState === 'PLAYING' && (
                  <div className="flex items-end gap-0.5 h-5">
                    <span className="sound-bar" />
                    <span className="sound-bar" />
                    <span className="sound-bar" />
                  </div>
                )}
              </div>

              <div className="relative group">
                <NowPlaying state={speakerState} transitioning={transitioning} />
                {speakerState && (
                  <button
                    onClick={() => setFullscreen(true)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                    style={{ minWidth: 32, minHeight: 32 }}
                    title="Fullscreen"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  </button>
                )}
              </div>
              <Controls speakerIp={selectedIp!} state={speakerState} onTrackChange={handleTrackChange} />
              <VolumePanel speakerIp={selectedIp!} speakers={speakers} state={speakerState} />
              <Favorites speakerIp={selectedIp!} onTrackChange={handleTrackChange} />
              <Queue speakerIp={selectedIp!} state={speakerState} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-sonos-muted gap-4">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 opacity-30">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p className="text-lg">Select a speaker to control</p>
            {speakers.length === 0 && (
              <p className="text-sm opacity-60">Discovering speakers on your network...</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
