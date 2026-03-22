import { useState, useEffect, useRef } from 'react';
import api from '../api/sonosApi';
import type { GroupState, RepeatMode } from '../../../shared/types';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const REPEAT_MODES: RepeatMode[] = ['none', 'all', 'one'];

interface ControlsProps {
  speakerIp: string;
  state: GroupState | null;
  onTrackChange?: () => void;
}

function RepeatIcon({ repeat }: { repeat: RepeatMode }) {
  if (repeat === 'one') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
    </svg>
  );
}

export default function Controls({ speakerIp, state, onTrackChange }: ControlsProps) {
  const isPlaying = state?.transportState === 'PLAYING';
  const duration = state?.track?.duration || 0;
  const shuffle = state?.shuffle || false;
  const repeat: RepeatMode = state?.repeat || 'none';

  const [localPosition, setLocalPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSsePositionRef = useRef(0);
  const lastSseTimeRef = useRef(Date.now());

  useEffect(() => {
    const pos = state?.track?.position || 0;
    lastSsePositionRef.current = pos;
    lastSseTimeRef.current = Date.now();
    if (!isSeeking) setLocalPosition(pos);
  }, [state?.track?.position, state?.track?.uri]);

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

  const handleSeekStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setSeekValue(Number(e.target.value));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value));
  };

  const handleSeekEnd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = Number(e.target.value);
    setLocalPosition(seconds);
    setIsSeeking(false);
    try {
      await api.seek(speakerIp, seconds);
      lastSsePositionRef.current = seconds;
      lastSseTimeRef.current = Date.now();
    } catch (err) {
      console.error('Seek error:', err);
    }
  };

  const handleShuffle = async () => {
    try { await api.shuffle(speakerIp, !shuffle); }
    catch (err) { console.error('Shuffle error:', err); }
  };

  const handleRepeat = async () => {
    const next = REPEAT_MODES[(REPEAT_MODES.indexOf(repeat) + 1) % REPEAT_MODES.length];
    try { await api.repeat(speakerIp, next); }
    catch (err) { console.error('Repeat error:', err); }
  };

  const displayPosition = isSeeking ? seekValue : localPosition;
  const progressPercent = duration > 0 ? (displayPosition / duration) * 100 : 0;

  return (
    <div className="bg-sonos-card rounded-xl p-4 space-y-4">
      {/* Seek bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={1}
          value={displayPosition}
          onMouseDown={handleSeekStart as unknown as React.MouseEventHandler<HTMLInputElement>}
          onTouchStart={handleSeekStart as unknown as React.TouchEventHandler<HTMLInputElement>}
          onChange={handleSeekChange}
          onMouseUp={handleSeekEnd as unknown as React.MouseEventHandler<HTMLInputElement>}
          onTouchEnd={handleSeekEnd as unknown as React.TouchEventHandler<HTMLInputElement>}
          className="w-full"
          style={{ background: `linear-gradient(to right, #f59e0b ${progressPercent}%, #333333 ${progressPercent}%)` }}
        />
        <div className="flex justify-between text-xs text-sonos-muted">
          <span>{formatTime(displayPosition)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleShuffle}
          className={`p-2 rounded-lg transition-colors ${shuffle ? 'text-sonos-accent' : 'text-sonos-muted hover:text-sonos-text'}`}
          title="Shuffle"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
          </svg>
        </button>

        <button onClick={() => { onTrackChange?.(); api.previous(speakerIp); }} className="p-2 text-sonos-text hover:text-sonos-accent transition-colors rounded-lg" title="Previous">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>

        <button
          onClick={() => isPlaying ? api.pause(speakerIp) : api.play(speakerIp)}
          className="w-14 h-14 rounded-full bg-sonos-accent hover:bg-amber-400 flex items-center justify-center transition-all duration-150 active:scale-95 text-black"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <button onClick={() => { onTrackChange?.(); api.next(speakerIp); }} className="p-2 text-sonos-text hover:text-sonos-accent transition-colors rounded-lg" title="Next">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>

        <button
          onClick={handleRepeat}
          className={`p-2 rounded-lg transition-colors ${repeat !== 'none' ? 'text-sonos-accent' : 'text-sonos-muted hover:text-sonos-text'}`}
          title={`Repeat: ${repeat}`}
        >
          <RepeatIcon repeat={repeat} />
        </button>
      </div>
    </div>
  );
}
