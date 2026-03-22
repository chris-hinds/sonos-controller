import { useState, useEffect } from 'react';
import api from '../api/sonosApi';
import type { GroupState, QueueItem } from '../../../shared/types';

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
    <div className="bg-sonos-card rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-sonos-border/20 transition-colors"
      >
        <h3 className="text-sm font-semibold text-sonos-muted uppercase tracking-wider">
          Queue {queue.length > 0 && `(${queue.length})`}
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
          {!loading && !error && queue.length === 0 && (
            <div className="p-4 text-sonos-muted text-sm text-center">Queue is empty</div>
          )}
          {!loading && queue.length > 0 && (
            <div className="divide-y divide-sonos-border/50 max-h-80 overflow-y-auto">
              {queue.map((item, idx) => {
                const isCurrentTrack = idx === currentIndex;
                const artUrl = item.albumArtURI ? api.artUrl(item.albumArtURI) : null;

                return (
                  <button
                    key={`${item.id || idx}`}
                    onClick={() => api.playQueueItem(speakerIp, item.index !== undefined ? item.index : idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                      isCurrentTrack ? 'bg-sonos-accent/10 hover:bg-sonos-accent/20' : 'hover:bg-sonos-border/30'
                    }`}
                  >
                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                      {isCurrentTrack ? (
                        <div className="flex items-end gap-0.5 h-4">
                          <span className="sound-bar" style={{ height: '6px' }} />
                          <span className="sound-bar" style={{ height: '10px' }} />
                          <span className="sound-bar" style={{ height: '6px' }} />
                        </div>
                      ) : (
                        <span className="text-xs text-sonos-muted">{idx + 1}</span>
                      )}
                    </div>

                    <div className="w-9 h-9 rounded bg-sonos-border flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {artUrl ? (
                        <img
                          src={artUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sonos-muted">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isCurrentTrack ? 'text-sonos-accent font-medium' : 'text-sonos-text'}`}>
                        {item.title || 'Unknown Track'}
                      </p>
                      {item.artist && <p className="text-xs text-sonos-muted truncate">{item.artist}</p>}
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
