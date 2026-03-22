import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import type { FavoriteItem } from '../../../shared/types';

interface FavoritesProps {
  speakerIp: string;
  onTrackChange?: () => void;
}

export default function Favorites({ speakerIp, onTrackChange }: FavoritesProps) {
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

  const MusicIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-sonos-muted">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  );

  return (
    <div className="bg-sonos-card rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-sonos-border/20 transition-colors"
      >
        <h3 className="text-sm font-semibold text-sonos-muted uppercase tracking-wider">
          Favorites {favorites.length > 0 && `(${favorites.length})`}
        </h3>
        <svg viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 text-sonos-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-sonos-border">
          {loading && (
            <div className="flex items-center justify-center p-6">
              <div className="w-6 h-6 border-2 border-sonos-muted border-t-sonos-accent rounded-full animate-spin" />
            </div>
          )}
          {error && <div className="p-4 text-sonos-muted text-sm text-center">{error}</div>}
          {!loading && !error && favorites.length === 0 && (
            <div className="p-4 text-sonos-muted text-sm text-center">No favorites found</div>
          )}
          {!loading && favorites.length > 0 && (
            <div className="divide-y divide-sonos-border/50 max-h-64 overflow-y-auto">
              {favorites.map((fav, index) => {
                const artUrl = fav.albumArtURI ? api.artUrl(fav.albumArtURI) : null;
                return (
                  <button
                    key={fav.id || index}
                    onClick={() => handlePlay(fav)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sonos-border/30 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded bg-sonos-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {artUrl ? (
                        <img
                          src={artUrl}
                          alt={fav.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : <MusicIcon />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-sonos-text truncate">{fav.title || 'Unknown'}</p>
                      {fav.artist && <p className="text-xs text-sonos-muted truncate">{fav.artist}</p>}
                    </div>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sonos-muted flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
