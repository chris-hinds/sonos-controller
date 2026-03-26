import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import type { GroupState, QueueItem } from '@sonos/shared';

interface QueueProps {
  speakerIp: string;
  state: GroupState | null;
}

export default function Queue({ speakerIp, state }: QueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentUri = state?.track?.uri || '';

  useEffect(() => {
    if (!speakerIp || !isExpanded) return;
    setLoading(true);
    setError(null);
    api.getQueue(speakerIp)
      .then(data => setQueue(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load queue'))
      .finally(() => setLoading(false));
  }, [speakerIp, isExpanded]);

  useEffect(() => {
    if (isExpanded && speakerIp) {
      api.getQueue(speakerIp)
        .then(data => { if (Array.isArray(data)) setQueue(data); })
        .catch(() => { /* ignore */ });
    }
  }, [currentUri]);

  const currentIndex = queue.findIndex(item => item.uri && currentUri && item.uri === currentUri);

  return (
    <div className="border-t border-sonos-border/30">
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between py-3 px-1 hover:opacity-70 transition-opacity"
      >
        <span className="text-xs text-sonos-muted/40 uppercase tracking-widest">
          Queue {queue.length > 0 && `· ${queue.length}`}
        </span>
        <svg viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 text-sonos-muted/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isExpanded && (
        <div className="pb-2">
          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-sonos-muted/20 border-t-sonos-accent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-sonos-muted/40 text-xs text-center py-3">{error}</p>}
          {!loading && !error && queue.length === 0 && (
            <p className="text-sonos-muted/40 text-xs text-center py-3">Queue is empty</p>
          )}
          {!loading && queue.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {queue.map((item, idx) => {
                const isCurrentTrack = idx === currentIndex;
                const artUrl = item.albumArtURI ? api.artUrl(item.albumArtURI) : null;
                return (
                  <button
                    key={`${item.id || idx}`}
                    onClick={() => api.playQueueItem(speakerIp, item.index !== undefined ? item.index : idx)}
                    className={`w-full flex items-center gap-3 py-2 px-1 rounded-lg transition-colors text-left
                      ${isCurrentTrack ? 'bg-sonos-accent/5' : 'hover:bg-sonos-border/10'}`}
                  >
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                      {isCurrentTrack ? (
                        <div className="flex items-end gap-0.5 h-4">
                          <span className="sound-bar" style={{ height: '5px' }} />
                          <span className="sound-bar" style={{ height: '9px' }} />
                          <span className="sound-bar" style={{ height: '5px' }} />
                        </div>
                      ) : (
                        <span className="text-xs text-sonos-muted/30">{idx + 1}</span>
                      )}
                    </div>

                    <div className="w-8 h-8 rounded bg-sonos-border/30 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {artUrl ? (
                        <img src={artUrl} alt={item.title} className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-sonos-muted/30">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isCurrentTrack ? 'text-sonos-accent' : 'text-sonos-text'}`}>
                        {item.title || 'Unknown Track'}
                      </p>
                      {item.artist && <p className="text-xs text-sonos-muted/50 truncate">{item.artist}</p>}
                    </div>
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
