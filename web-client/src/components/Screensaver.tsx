import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import type { GroupState } from '../../../shared/types';

interface ScreensaverProps {
  state: GroupState | null;
  speakerName: string;
  onDismiss: () => void;
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right leading-none">
      <p className="text-white/70 font-light tabular-nums leading-none" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-white/30 text-xs font-light mt-1">
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}

export default function Screensaver({ state, speakerName, onDismiss }: ScreensaverProps) {
  const track = state?.track;
  const artUrl = track?.albumArtUrl ? api.artUrl(track.albumArtUrl) : null;
  const container = state?.container;
  const isPlaying = state?.transportState === 'PLAYING';

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden screensaver-fade-in"
      onClick={onDismiss}
      onTouchStart={onDismiss}
      style={{ cursor: 'none' }}
    >
      {/* Ken Burns blurred background */}
      <div className="absolute inset-[-15%] overflow-hidden ken-burns">
        {artUrl ? (
          <img
            src={artUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'blur(60px)' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />
        )}
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-8 md:p-12">
        {/* Top row: speaker name + clock */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest">Now Playing</p>
            <p className="text-white/50 text-sm mt-0.5">{speakerName}</p>
          </div>
          <Clock />
        </div>

        {/* Center: album art */}
        <div className="flex-1 flex items-center justify-center py-8">
          {artUrl ? (
            <img
              src={artUrl}
              alt={track?.album || 'Album art'}
              className="rounded-2xl object-cover screensaver-art"
              style={{
                width: 'clamp(200px, 45vh, 480px)',
                height: 'clamp(200px, 45vh, 480px)',
                boxShadow: '0 80px 160px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)',
              }}
            />
          ) : (
            <div
              className="rounded-2xl bg-white/5 flex items-center justify-center"
              style={{ width: 'clamp(200px, 45vh, 480px)', height: 'clamp(200px, 45vh, 480px)' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-white/10">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Bottom: track info */}
        <div className="text-center space-y-2">
          {container?.title && (
            <p className="text-white/30 text-sm tracking-wide">
              {container.type === 'radio' ? 'Radio · ' : 'Playing from · '}{container.title}
            </p>
          )}
          <h2
            className="text-white font-semibold leading-tight"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
          >
            {track?.title || (isPlaying ? 'Playing' : 'Nothing Playing')}
          </h2>
          {track?.artist && (
            <p className="text-white/50" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
              {track.artist}
            </p>
          )}
          <p className="text-white/20 text-xs mt-4 tracking-widest uppercase">Tap to dismiss</p>
        </div>
      </div>
    </div>
  );
}
