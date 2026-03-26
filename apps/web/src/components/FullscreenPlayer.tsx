import { useState, useEffect, useRef } from 'react';
import api from '../api/sonosApi';
import type { GroupState, RepeatMode } from '@sonos/shared';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const REPEAT_MODES: RepeatMode[] = ['none', 'all', 'one'];

interface FullscreenPlayerProps {
  state: GroupState | null;
  speakerIp: string;
  speakerName: string;
  onClose: () => void;
}

export default function FullscreenPlayer({ state, speakerIp, speakerName, onClose }: FullscreenPlayerProps) {
  const track = state?.track;
  const isPlaying = state?.transportState === 'PLAYING';
  const duration = track?.duration || 0;
  const shuffle = state?.shuffle || false;
  const repeat: RepeatMode = state?.repeat || 'none';
  const container = state?.container;
  const artUrl = track?.albumArtUrl ? api.artUrl(track.albumArtUrl) : null;

  // Seek / position interpolation
  const [localPosition, setLocalPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSsePositionRef = useRef(0);
  const lastSseTimeRef = useRef(Date.now());

  useEffect(() => {
    const pos = track?.position || 0;
    lastSsePositionRef.current = pos;
    lastSseTimeRef.current = Date.now();
    if (!isSeeking) setLocalPosition(pos);
  }, [track?.position, track?.uri]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying && !isSeeking) {
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - lastSseTimeRef.current) / 1000;
        setLocalPosition(Math.min(lastSsePositionRef.current + elapsed, duration || Infinity));
      }, 500);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, isSeeking, duration]);

  const handleSeekEnd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = Number(e.target.value);
    setLocalPosition(seconds);
    setIsSeeking(false);
    try {
      await api.seek(speakerIp, seconds);
      lastSsePositionRef.current = seconds;
      lastSseTimeRef.current = Date.now();
    } catch { /* ignore */ }
  };

  const handleShuffle = () => api.shuffle(speakerIp, !shuffle);
  const handleRepeat = () => {
    const next = REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length];
    api.repeat(speakerIp, next);
  };

  const displayPosition = isSeeking ? seekValue : localPosition;
  const progressPercent = duration > 0 ? (displayPosition / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col">
      {/* Blurred ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        {artUrl ? (
          <img
            src={artUrl}
            alt=""
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(60px)', transform: 'scale(1.3)' }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900" />
        )}
        {/* Dark vignette overlay */}
        <div className="absolute inset-0 bg-black/55" />
        {/* Bottom gradient to blend into controls */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-12 pb-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
          </button>
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Now Playing</p>
            <p className="text-white/80 text-sm mt-0.5 truncate max-w-40">{speakerName}</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Album art — takes the majority of vertical space */}
        <div className="flex-1 flex items-center justify-center px-8 py-4 min-h-0">
          <div
            className="w-full max-w-xs aspect-square rounded-3xl overflow-hidden"
            style={{
              boxShadow: '0 40px 80px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {artUrl ? (
              <img src={artUrl} alt={track?.album || 'Album art'} crossOrigin="anonymous" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-20 h-20 text-white/20">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Track info + controls */}
        <div className="px-8 pb-12 space-y-6">
          {/* Track info */}
          <div>
            {container?.title && (
              <p className="text-white/40 text-xs mb-1 truncate">
                {container.type === 'radio' ? 'Radio · ' : 'From · '}{container.title}
              </p>
            )}
            <h2 className="text-white text-2xl font-bold leading-tight truncate">
              {track?.title || 'Nothing Playing'}
            </h2>
            {track?.artist && (
              <p className="text-white/60 text-base mt-1 truncate">{track.artist}</p>
            )}
            {track?.album && !track?.artist && (
              <p className="text-white/60 text-base mt-1 truncate">{track.album}</p>
            )}
          </div>

          {/* Seek bar */}
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={1}
              value={displayPosition}
              onMouseDown={(e) => { setIsSeeking(true); setSeekValue(Number((e.target as HTMLInputElement).value)); }}
              onTouchStart={(e) => { setIsSeeking(true); setSeekValue(Number((e.target as HTMLInputElement).value)); }}
              onChange={(e) => setSeekValue(Number(e.target.value))}
              onMouseUp={handleSeekEnd as unknown as React.MouseEventHandler<HTMLInputElement>}
              onTouchEnd={handleSeekEnd as unknown as React.TouchEventHandler<HTMLInputElement>}
              className="w-full fullscreen-seek"
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,0.9) ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                height: '3px',
              }}
            />
            <div className="flex justify-between text-white/40 text-xs">
              <span>{formatTime(displayPosition)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-between">
            {/* Shuffle */}
            <button
              onClick={handleShuffle}
              className={`transition-colors ${shuffle ? 'text-sonos-accent' : 'text-white/40 hover:text-white/70'}`}
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>

            {/* Previous */}
            <button
              onClick={() => api.previous(speakerIp)}
              className="text-white/80 hover:text-white transition-colors"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => isPlaying ? api.pause(speakerIp) : api.play(speakerIp)}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform"
              style={{ minWidth: 64, minHeight: 64 }}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 translate-x-0.5">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={() => api.next(speakerIp)}
              className="text-white/80 hover:text-white transition-colors"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            {/* Repeat */}
            <button
              onClick={handleRepeat}
              className={`transition-colors ${repeat !== 'none' ? 'text-sonos-accent' : 'text-white/40 hover:text-white/70'}`}
              style={{ minWidth: 44, minHeight: 44 }}
            >
              {repeat === 'one' ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
