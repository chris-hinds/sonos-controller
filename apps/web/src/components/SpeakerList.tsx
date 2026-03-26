import { useState, useRef, useEffect } from 'react';
import api from '../api/sonosApi';
import useSpeakerState from '../hooks/useSpeakerState';
import type { SpeakerInfo } from '@sonos/shared';

interface SpeakerItemProps {
  speaker: SpeakerInfo;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: (ip: string) => void;
  onSetDefault: (uuid: string | null) => void;
}

function SpeakerItem({ speaker, isSelected, isDefault, onSelect, onSetDefault }: SpeakerItemProps) {
  const state = useSpeakerState(speaker.ip);
  const isPlaying = state?.transportState === 'PLAYING';
  const track = state?.track;
  const artUrl = track?.albumArtUrl ? api.artUrl(track.albumArtUrl) : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(o => !o);
  };

  const handleSetDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetDefault(isDefault ? null : speaker.uuid);
    setMenuOpen(false);
  };

  return (
    <div className="relative">
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

        {/* Default indicator + menu trigger */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isDefault && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" style={{ color: 'var(--color-accent)', opacity: 0.7 }}>
              <path d="M17 4v7l2 3H5l2-3V4h10zm-5 16c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm0-18H7v2h10V2h-5z"/>
            </svg>
          )}
          <button
            ref={buttonRef}
            onClick={handleMenuClick}
            className="w-6 h-6 flex items-center justify-center rounded-md text-sonos-muted/30 hover:text-sonos-muted hover:bg-sonos-border/30 transition-colors"
            style={{ minWidth: 24, minHeight: 24 }}
            title="Options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        </div>
      </button>

      {/* Popup menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-full mt-1 z-50 min-w-44 rounded-xl border border-sonos-border/40 shadow-xl overflow-hidden"
          style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(16px)' }}
        >
          <button
            onClick={handleSetDefault}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-sonos-text hover:bg-sonos-border/20 transition-colors text-left"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" style={{ color: isDefault ? 'var(--color-accent)' : undefined }}>
              {isDefault
                ? <path d="M17 4v7l2 3H5l2-3V4h10zm-5 16c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm0-18H7v2h10V2h-5z"/>
                : <path d="M17 4v7l2 3H5l2-3V4h10zm0-2H7C5.9 2 5 2.9 5 4v7L3 14h18l-2-3V4c0-1.1-.9-2-2-2zm-5 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/>
              }
            </svg>
            {isDefault ? 'Remove default room' : 'Set as default room'}
          </button>
        </div>
      )}
    </div>
  );
}

interface SpeakerListProps {
  speakers: SpeakerInfo[];
  selectedIp: string | null;
  defaultUuid: string | null;
  onSelect: (ip: string) => void;
  onSetDefault: (uuid: string | null) => void;
}

export default function SpeakerList({ speakers, selectedIp, defaultUuid, onSelect, onSetDefault }: SpeakerListProps) {
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
        <SpeakerItem
          key={speaker.ip}
          speaker={speaker}
          isSelected={selectedIp === speaker.ip}
          isDefault={defaultUuid === speaker.uuid}
          onSelect={onSelect}
          onSetDefault={onSetDefault}
        />
      ))}
      {Array.from(groups.entries()).map(([groupId, members]) => {
        const coordinator = members.find(m => m.isCoordinator) || members[0];
        return (
          <div key={groupId}>
            <p className="px-3 pt-3 pb-1 text-xs text-sonos-muted/25 uppercase tracking-widest">
              {coordinator?.name}
            </p>
            {members.map(speaker => (
              <SpeakerItem
                key={speaker.ip}
                speaker={speaker}
                isSelected={selectedIp === speaker.ip}
                isDefault={defaultUuid === speaker.uuid}
                onSelect={onSelect}
                onSetDefault={onSetDefault}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
