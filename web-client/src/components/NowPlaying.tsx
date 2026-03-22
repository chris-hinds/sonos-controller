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
      <div className="bg-sonos-card rounded-xl p-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg bg-sonos-border flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-sonos-muted">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
        <div>
          <p className="text-sonos-muted text-sm">Nothing Playing</p>
          <p className="text-xs text-sonos-muted mt-1 opacity-60">Select a favorite or item from queue to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-sonos-card rounded-xl overflow-hidden relative">
      {transitioning && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <div className="w-8 h-8 border-2 border-sonos-muted border-t-sonos-accent rounded-full animate-spin" />
        </div>
      )}
      {artUrl ? (
        <div className="relative w-full pt-[56.25%] bg-sonos-border">
          <img
            src={artUrl}
            alt={track?.album || 'Album art'}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {container?.title && (
              <p className="text-white/50 text-xs truncate drop-shadow mb-1">
                {container.type === 'radio' ? 'Radio: ' : 'Playing from: '}{container.title}
              </p>
            )}
            <h3 className="text-white font-semibold text-lg leading-tight truncate drop-shadow">
              {track?.title || 'Unknown Track'}
            </h3>
            {track?.artist && <p className="text-white/80 text-sm truncate drop-shadow">{track.artist}</p>}
            {track?.album && <p className="text-white/60 text-xs truncate drop-shadow">{track.album}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4">
          <div className="w-20 h-20 rounded-lg bg-sonos-border flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-sonos-muted">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div className="min-w-0">
            {container?.title && (
              <p className="text-sonos-muted text-xs truncate mb-0.5">
                {container.type === 'radio' ? 'Radio: ' : 'Playing from: '}{container.title}
              </p>
            )}
            <h3 className="text-sonos-text font-semibold text-lg leading-tight truncate">
              {track?.title || 'Unknown Track'}
            </h3>
            {track?.artist && <p className="text-sonos-muted text-sm truncate">{track.artist}</p>}
            {track?.album && <p className="text-sonos-muted text-xs truncate">{track.album}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
