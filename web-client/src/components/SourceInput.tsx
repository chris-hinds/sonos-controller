import { useState, useEffect, useRef } from 'react';
import api from '../api/sonosApi';
import type { AudioInput, GroupState } from '../../../shared/types';

interface SourceInputProps {
  speakerIp: string;
  state: GroupState | null;
}

function TvIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path d="M21 3H3a2 2 0 00-2 2v12a2 2 0 002 2h5v2h8v-2h5a2 2 0 002-2V5a2 2 0 00-2-2zm0 14H3V5h18v12z"/>
    </svg>
  );
}

function LineInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path d="M20 14.5v-3h-3v-1h2V9h-2V7.5C17 6.1 15.9 5 14.5 5h-1V3h-3v2h-1C8.1 5 7 6.1 7 7.5V9H5v1.5h2v1H5v1.5h2V15c0 1.4 1.1 2.5 2.5 2.5h7c1.4 0 2.5-1.1 2.5-2.5v-.5h1zM9 7.5C9 7.2 9.2 7 9.5 7h5c.3 0 .5.2.5.5V15c0 .3-.2.5-.5.5h-5c-.3 0-.5-.2-.5-.5V7.5z"/>
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  );
}

function inputIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('tv') || t.includes('hdmi') || t.includes('optical') || t.includes('arc') || t.includes('spdif')) {
    return <TvIcon />;
  }
  return <LineInIcon />;
}

function isInputActive(trackUri: string, inputUri: string): boolean {
  if (!trackUri || !inputUri) return false;
  return trackUri.split('?')[0] === inputUri.split('?')[0];
}

export default function SourceInput({ speakerIp, state }: SourceInputProps) {
  const [inputs, setInputs] = useState<AudioInput[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);
  const prevIpRef = useRef<string>('');

  useEffect(() => {
    if (!speakerIp || speakerIp === prevIpRef.current) return;
    prevIpRef.current = speakerIp;
    api.getInputs(speakerIp)
      .then(setInputs)
      .catch(() => setInputs([]));
  }, [speakerIp]);

  if (inputs.length === 0) return null;

  const currentUri = state?.track?.uri || '';
  const activeInput = inputs.find(i => isInputActive(currentUri, i.uri));
  const onHardwareInput = !!activeInput;

  const handleSelect = async (input: AudioInput | null) => {
    if (input === null) return; // "Music" tab — no action, user plays a favorite
    if (isInputActive(currentUri, input.uri)) return;
    setSwitching(input.id);
    try {
      await api.playInput(speakerIp, input.uri);
    } catch (err) {
      console.error('Source switch error:', err);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div className="flex items-center gap-1 py-2">
      {/* Music tab — always first, active when not on a hardware input */}
      <button
        onClick={() => handleSelect(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
          !onHardwareInput
            ? 'text-black'
            : 'text-sonos-muted/50 hover:text-sonos-muted hover:bg-sonos-border/20'
        }`}
        style={!onHardwareInput ? { backgroundColor: 'var(--color-accent)' } : {}}
        title="Music"
      >
        <MusicIcon />
        Music
      </button>

      {inputs.map(input => {
        const active = isInputActive(currentUri, input.uri);
        const isLoading = switching === input.id;
        return (
          <button
            key={input.id}
            onClick={() => handleSelect(input)}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              active
                ? 'text-black'
                : 'text-sonos-muted/50 hover:text-sonos-muted hover:bg-sonos-border/20'
            } ${isLoading ? 'opacity-60' : ''}`}
            style={active ? { backgroundColor: 'var(--color-accent)' } : {}}
            title={`Switch to ${input.title}`}
          >
            {inputIcon(input.title)}
            {input.title}
          </button>
        );
      })}
    </div>
  );
}
