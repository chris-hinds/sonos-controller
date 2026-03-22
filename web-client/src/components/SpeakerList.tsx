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

  return (
    <button
      onClick={() => onSelect(speaker.ip)}
      className={`
        w-full text-left px-4 py-3 flex items-center gap-3
        transition-colors duration-150 hover:bg-sonos-card
        ${isSelected ? 'bg-sonos-card border-l-2 border-sonos-accent' : 'border-l-2 border-transparent'}
      `}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-sonos-accent' : 'bg-sonos-border'}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${isSelected ? 'text-black' : 'text-sonos-muted'}`}>
          <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate text-sonos-text">{speaker.name}</span>
          {isPlaying && (
            <div className="flex items-end gap-0.5 h-3 flex-shrink-0">
              <span className="sound-bar" style={{ height: '6px' }} />
              <span className="sound-bar" style={{ height: '9px' }} />
              <span className="sound-bar" style={{ height: '6px' }} />
            </div>
          )}
        </div>
        <div className="text-xs text-sonos-muted truncate">
          {isPlaying && state?.track?.title ? state.track.title : speaker.model || 'Sonos'}
        </div>
      </div>

      {speaker.isCoordinator && (speaker.groupMembers?.length ?? 0) > 1 && (
        <span className="text-xs text-sonos-muted bg-sonos-border rounded px-1.5 py-0.5 flex-shrink-0">
          {speaker.groupMembers!.length}
        </span>
      )}
    </button>
  );
}

interface GroupSectionProps {
  groupLabel: string;
  members: SpeakerInfo[];
  selectedIp: string | null;
  onSelect: (ip: string) => void;
}

function GroupSection({ groupLabel, members, selectedIp, onSelect }: GroupSectionProps) {
  return (
    <div>
      <div className="px-4 py-2 text-xs font-semibold text-sonos-muted uppercase tracking-wider bg-sonos-surface">
        {groupLabel}
      </div>
      {members.map(speaker => (
        <SpeakerItem
          key={speaker.ip}
          speaker={speaker}
          isSelected={selectedIp === speaker.ip}
          onSelect={onSelect}
        />
      ))}
    </div>
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
      <div className="flex flex-col items-center justify-center p-8 text-sonos-muted gap-2">
        <div className="w-8 h-8 border-2 border-sonos-muted border-t-sonos-accent rounded-full animate-spin" />
        <span className="text-sm">Discovering...</span>
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
    <div>
      {ungrouped.map(speaker => (
        <SpeakerItem
          key={speaker.ip}
          speaker={speaker}
          isSelected={selectedIp === speaker.ip}
          onSelect={onSelect}
        />
      ))}
      {Array.from(groups.entries()).map(([groupId, members]) => {
        const coordinator = members.find(m => m.isCoordinator) || members[0];
        return (
          <GroupSection
            key={groupId}
            groupLabel={coordinator?.name || 'Group'}
            members={members}
            selectedIp={selectedIp}
            onSelect={onSelect}
          />
        );
      })}
    </div>
  );
}
