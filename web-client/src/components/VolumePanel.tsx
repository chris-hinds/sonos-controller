import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/sonosApi';
import type { GroupState, SpeakerInfo } from '../../../shared/types';

const STEP = 5;
const LONG_PRESS_DELAY = 400;  // ms before continuous repeat starts
const LONG_PRESS_INTERVAL = 120; // ms between repeats

interface VolumeSliderProps {
  label?: string;
  volume: number;
  muted: boolean;
  onVolume: (v: number) => Promise<void>;
  onMute: (m: boolean) => Promise<void>;
}

function VolumeSlider({ label, volume, muted, onVolume, onMute }: VolumeSliderProps) {
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const committedRef = useRef<number | null>(null);
  const longPressRef = useRef<{ timeout: ReturnType<typeof setTimeout>; interval: ReturnType<typeof setInterval> | null } | null>(null);
  const displayVolume = localVolume !== null ? localVolume : (volume ?? 0);

  useEffect(() => {
    if (committedRef.current !== null && volume === committedRef.current) {
      setLocalVolume(null);
      committedRef.current = null;
    }
  }, [volume]);

  const commit = useCallback(async (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setLocalVolume(clamped);
    committedRef.current = clamped;
    await onVolume(clamped);
  }, [onVolume]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVolume(Number(e.target.value));
  };

  const handleCommit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await commit(Number(e.target.value));
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timeout);
      if (longPressRef.current.interval) clearInterval(longPressRef.current.interval);
      longPressRef.current = null;
    }
  };

  const handleStepPress = (delta: number) => {
    // immediate step
    const next = Math.max(0, Math.min(100, displayVolume + delta));
    commit(next);

    // long-press: keep stepping while held
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setLocalVolume(prev => {
          const base = prev !== null ? prev : volume;
          const stepped = Math.max(0, Math.min(100, base + delta));
          committedRef.current = stepped;
          onVolume(stepped);
          return stepped;
        });
      }, LONG_PRESS_INTERVAL);
      longPressRef.current!.interval = interval;
    }, LONG_PRESS_DELAY);

    longPressRef.current = { timeout, interval: null };
  };

  const pct = muted ? 0 : displayVolume;

  return (
    <div className="space-y-1.5">
      {label && (
        <span className="text-xs text-sonos-muted/40 pl-1">{label}</span>
      )}
      <div className="flex items-center gap-2">

        {/* Mute toggle */}
        <button
          onClick={() => onMute(!muted)}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-sonos-muted/40 hover:text-sonos-muted hover:bg-sonos-border/20 transition-colors"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : displayVolume === 0 ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          )}
        </button>

        {/* − button */}
        <button
          onPointerDown={() => handleStepPress(-STEP)}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-sonos-muted/50 hover:text-sonos-text hover:bg-sonos-border/20 active:scale-95 transition-all select-none"
          aria-label="Volume down"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>

        {/* Slider */}
        <div className="flex-1 relative flex items-center" style={{ height: 36 }}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={handleChange}
            onMouseUp={handleCommit as unknown as React.MouseEventHandler<HTMLInputElement>}
            onTouchEnd={handleCommit as unknown as React.TouchEventHandler<HTMLInputElement>}
            className="volume-slider w-full"
            style={{
              background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-border) ${pct}%)`
            }}
          />
        </div>

        {/* + button */}
        <button
          onPointerDown={() => handleStepPress(STEP)}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-sonos-muted/50 hover:text-sonos-text hover:bg-sonos-border/20 active:scale-95 transition-all select-none"
          aria-label="Volume up"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>

        {/* Volume number */}
        <span className="text-xs text-sonos-muted/40 w-7 text-right flex-shrink-0 tabular-nums">
          {muted ? <span className="text-sonos-muted/30">M</span> : displayVolume}
        </span>

      </div>
    </div>
  );
}

interface VolumePanelProps {
  speakerIp: string;
  speakers: SpeakerInfo[];
  state: GroupState | null;
}

export default function VolumePanel({ speakerIp, speakers, state }: VolumePanelProps) {
  const volumeState = state?.volume || {};
  const members = state?.members || [speakerIp];
  const coordinatorIp = state?.coordinatorIp || speakerIp;
  const isGroup = members.length > 1;

  const memberVolumes = members
    .map(ip => volumeState[ip]?.volume)
    .filter((v): v is number => v !== undefined);
  const masterVolume = memberVolumes.length > 0
    ? Math.round(memberVolumes.reduce((a, b) => a + b, 0) / memberVolumes.length)
    : 0;
  const anyMuted = members.some(ip => volumeState[ip]?.mute);

  const handleMasterVolume = useCallback(async (vol: number) => {
    await api.setVolume(coordinatorIp, vol);
  }, [coordinatorIp]);

  const handleMasterMute = useCallback(async (muted: boolean) => {
    await Promise.all(members.map(ip => api.setMute(ip, muted)));
  }, [members]);

  const getSpeakerName = (ip: string) =>
    speakers.find(sp => sp.ip === ip)?.name || ip;

  return (
    <div className="space-y-3 pt-4 border-t border-sonos-border/30">
      <VolumeSlider
        label={isGroup ? 'All rooms' : undefined}
        volume={masterVolume}
        muted={anyMuted}
        onVolume={handleMasterVolume}
        onMute={handleMasterMute}
      />
      {isGroup && (
        <div className="space-y-3 pt-3 border-t border-sonos-border/20">
          {members.map(ip => {
            const vol = volumeState[ip];
            return (
              <VolumeSlider
                key={ip}
                label={getSpeakerName(ip)}
                volume={vol?.volume || 0}
                muted={vol?.mute || false}
                onVolume={async (v) => { await api.setVolume(ip, v); }}
                onMute={async (m) => { await api.setMute(ip, m); }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
