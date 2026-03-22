import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/sonosApi';
import type { GroupState, SpeakerInfo } from '../../../shared/types';

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
  const displayVolume = localVolume !== null ? localVolume : (volume ?? 0);

  useEffect(() => {
    if (committedRef.current !== null && volume === committedRef.current) {
      setLocalVolume(null);
      committedRef.current = null;
    }
  }, [volume]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVolume(Number(e.target.value));
  };

  const handleCommit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalVolume(val);
    committedRef.current = val;
    await onVolume(val);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onMute(!muted)}
        className="flex-shrink-0 text-sonos-muted hover:text-sonos-text transition-colors p-1"
        title={muted ? 'Unmute' : 'Mute'}
        style={{ minWidth: 36, minHeight: 36 }}
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

      {label && <span className="text-xs text-sonos-muted w-16 truncate flex-shrink-0">{label}</span>}

      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={muted ? 0 : displayVolume}
          onChange={handleChange}
          onMouseUp={handleCommit as unknown as React.MouseEventHandler<HTMLInputElement>}
          onTouchEnd={handleCommit as unknown as React.TouchEventHandler<HTMLInputElement>}
          className="flex-1"
          style={{ background: `linear-gradient(to right, #f59e0b ${muted ? 0 : displayVolume}%, #333333 ${muted ? 0 : displayVolume}%)` }}
        />
        <span className="text-xs text-sonos-muted w-8 text-right flex-shrink-0">
          {muted ? 'M' : `${displayVolume}`}
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
    <div className="bg-sonos-card rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-sonos-muted uppercase tracking-wider">Volume</h3>

      <VolumeSlider
        label={isGroup ? 'All' : undefined}
        volume={masterVolume}
        muted={anyMuted}
        onVolume={handleMasterVolume}
        onMute={handleMasterMute}
      />

      {isGroup && (
        <div className="space-y-2 pt-2 border-t border-sonos-border">
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
