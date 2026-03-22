import api from '../api/sonosApi';
import useSpeakerState from '../hooks/useSpeakerState';
import type { SpeakerInfo } from '../../../shared/types';

interface SpeakerItemProps {
  speaker: SpeakerInfo;
  isSelected: boolean;
  onSelect: (ip: string) => void;
}

function SpeakerItem({ speaker, isSelected, onSelect }: SpeakerItemProps) {
  const state = useSpeakerState(speaker.ip);
  const isPlaying = state?.transportState === 'PLAYING';
  const track = state?.track;
  const artUrl = track?.albumArtUrl ? api.artUrl(track.albumArtUrl) : null;

  return (
    <button
      onClick={() => onSelect(speaker.ip)}
      className={`w-full text-left px-3 py-3 flex items-center gap-3 rounded-xl transition-all duration-150 ${
        isSelected
          ? 'bg-sonos-border/30 text-sonos-text'
          : 'text-sonos-muted hover:bg-sonos-border/15 hover:text-sonos-text'
      }`}
    >
      {/* Art / icon */}
      <div className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-sonos-border/30 flex items-center justify-center">
        {artUrl ? (
          <img
            src={artUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${isSelected ? 'text-sonos-accent' : 'text-sonos-muted/30'}`}>
            <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
          </svg>
        )}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-end gap-0.5">
              <span className="sound-bar" style={{ height: '5px' }} />
              <span className="sound-bar" style={{ height: '8px' }} />
              <span className="sound-bar" style={{ height: '5px' }} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isSelected ? 'text-sonos-text' : ''}`}>
            {speaker.name}
          </span>
          {speaker.isCoordinator && (speaker.groupMembers?.length ?? 0) > 1 && (
            <span className="text-xs text-sonos-muted/30 flex-shrink-0">
              {speaker.groupMembers!.length}
            </span>
          )}
        </div>
        <p className="text-xs text-sonos-muted/50 truncate mt-0.5">
          {isPlaying && track?.title
            ? track.title
            : isPlaying
            ? 'Playing'
            : speaker.model || 'Sonos'}
        </p>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full bg-sonos-accent flex-shrink-0" />
      )}
    </button>
  );
}

interface SpeakerListProps {
  speakers: SpeakerInfo[];
  selectedIp: string | null;
  onSelect: (ip: string) => void;
}

export default function SpeakerList({ speakers, selectedIp, onSelect }: SpeakerListProps) {
  if (speakers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <div className="w-6 h-6 border-2 border-sonos-muted/20 border-t-sonos-accent rounded-full animate-spin" />
        <span className="text-xs text-sonos-muted/40">Discovering rooms...</span>
      </div>
    );
  }

  const groups = new Map<string, SpeakerInfo[]>();
  const ungrouped: SpeakerInfo[] = [];

  for (const speaker of speakers) {
    if (speaker.groupId && (speaker.groupMembers?.length ?? 0) > 1) {
      if (!groups.has(speaker.groupId)) groups.set(speaker.groupId, []);
      groups.get(speaker.groupId)!.push(speaker);
    } else {
      ungrouped.push(speaker);
    }
  }

  return (
    <div className="p-2 space-y-1">
      {ungrouped.map(speaker => (
        <SpeakerItem key={speaker.ip} speaker={speaker} isSelected={selectedIp === speaker.ip} onSelect={onSelect} />
      ))}
      {Array.from(groups.entries()).map(([groupId, members]) => {
        const coordinator = members.find(m => m.isCoordinator) || members[0];
        return (
          <div key={groupId}>
            <p className="px-3 pt-3 pb-1 text-xs text-sonos-muted/25 uppercase tracking-widest">
              {coordinator?.name}
            </p>
            {members.map(speaker => (
              <SpeakerItem key={speaker.ip} speaker={speaker} isSelected={selectedIp === speaker.ip} onSelect={onSelect} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
