import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import type { FavoriteItem, GroupState } from '@sonos/shared';

interface FavoritesProps {
  speakerIp: string;
  state: GroupState | null;
  onTrackChange?: () => void;
}

function isActiveFavorite(fav: FavoriteItem, state: GroupState | null): boolean {
  if (!state) return false;
  if (state.track?.uri && fav.uri && state.track.uri === fav.uri) return true;
  if (state.container?.title && fav.title && state.container.title === fav.title) return true;
  return false;
}

export default function Favorites({ speakerIp, state, onTrackChange }: FavoritesProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!speakerIp) return;
    setLoading(true);
    setError(null);
    api.getFavorites(speakerIp)
      .then(data => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load favorites'))
      .finally(() => setLoading(false));
  }, [speakerIp]);

  const handlePlay = async (fav: FavoriteItem) => {
    onTrackChange?.();
    try { await api.playFavorite(speakerIp, fav.uri, fav.metadata || ''); }
    catch (err) { console.error('Play favorite error:', err); }
  };

  return (
    <div className="pt-5">
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between pb-3 hover:opacity-70 transition-opacity"
      >
        <span className="text-xs text-sonos-muted/50 uppercase tracking-widest">
          Favorites {favorites.length > 0 && `· ${favorites.length}`}
        </span>
        <svg viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 text-sonos-muted/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isExpanded && (
        <>
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-sonos-muted/20 border-t-sonos-accent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-sonos-muted/40 text-xs text-center py-4">{error}</p>}
          {!loading && !error && favorites.length === 0 && (
            <p className="text-sonos-muted/40 text-xs text-center py-4">No favorites found</p>
          )}
          {!loading && favorites.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {favorites.map((fav, index) => {
                const artUrl = fav.albumArtURI ? api.artUrl(fav.albumArtURI) : null;
                const isActive = isActiveFavorite(fav, state);
                const isPlaying = isActive && state?.transportState === 'PLAYING';
                return (
                  <button
                    key={fav.id || index}
                    onClick={() => handlePlay(fav)}
                    className={`relative rounded-xl overflow-hidden bg-sonos-border/20 active:scale-95 transition-transform duration-100 ${isActive ? 'ring-2 ring-sonos-accent' : ''}`}
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    {artUrl ? (
                      <img
                        src={artUrl}
                        alt={fav.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-sonos-muted/20">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                    {/* Title overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-6 pb-2 px-2">
                      <p className="text-xs text-white font-medium leading-tight line-clamp-2">{fav.title || 'Unknown'}</p>
                    </div>
                    {/* Playing indicator */}
                    {isActive && (
                      <div className="absolute top-1.5 right-1.5">
                        {isPlaying ? (
                          <div className="flex items-end gap-px bg-black/50 rounded px-1 py-0.5">
                            <span className="sound-bar" style={{ height: '5px' }} />
                            <span className="sound-bar" style={{ height: '8px' }} />
                            <span className="sound-bar" style={{ height: '5px' }} />
                          </div>
                        ) : (
                          <div className="bg-black/50 rounded px-1.5 py-0.5">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-sonos-accent">
                              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
