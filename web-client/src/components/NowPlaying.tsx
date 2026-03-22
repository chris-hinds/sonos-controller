import api from '../api/sonosApi';
import type { GroupState } from '../../../shared/types';

interface NowPlayingProps {
  state: GroupState | null;
  transitioning?: boolean;
}

export default function NowPlaying({ state, transitioning }: NowPlayingProps) {
  const track = state?.track;
  const hasTrack = track?.title || track?.artist;
  const artUrl = track?.albumArtUrl ? api.artUrl(track.albumArtUrl) : null;
  const container = state?.container;

  if (!state || (!hasTrack && state.transportState !== 'PLAYING')) {
    return (
      <div className="flex items-center gap-4 py-6 px-1">
        <div className="w-16 h-16 rounded-lg bg-sonos-border/50 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-sonos-muted/40">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <p className="text-sonos-muted/60 text-sm">Nothing playing</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {transitioning && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <div className="w-8 h-8 border-2 border-sonos-muted border-t-sonos-accent rounded-full animate-spin" />
        </div>
      )}
      {artUrl ? (
        <div className="relative w-full pt-[100%] bg-sonos-border">
          <img
            src={artUrl}
            alt={track?.album || 'Album art'}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {container?.title && (
              <p className="text-white/40 text-xs tracking-wide mb-1 truncate">
                {container.type === 'radio' ? 'Radio · ' : 'From · '}{container.title}
              </p>
            )}
            <h3 className="text-white font-semibold text-xl leading-tight truncate drop-shadow">
              {track?.title || 'Unknown Track'}
            </h3>
            {track?.artist && <p className="text-white/60 text-sm truncate mt-0.5">{track.artist}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 py-4 px-1">
          <div className="w-16 h-16 rounded-lg bg-sonos-border/50 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-sonos-muted/40">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div className="min-w-0">
            {container?.title && (
              <p className="text-sonos-muted/60 text-xs truncate mb-0.5">{container.title}</p>
            )}
            <h3 className="text-sonos-text font-semibold text-lg leading-tight truncate">
              {track?.title || 'Unknown Track'}
            </h3>
            {track?.artist && <p className="text-sonos-muted text-sm truncate">{track.artist}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
