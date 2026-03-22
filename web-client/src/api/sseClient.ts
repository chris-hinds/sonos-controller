import { BASE } from './sonosApi';

type SseCallback = (event: MessageEvent) => void;

let es: EventSource | null = null;
const listeners = new Map<string, Set<SseCallback>>();

function getEventSource(): EventSource {
  if (!es || es.readyState === EventSource.CLOSED) {
    es = new EventSource(`${BASE}/api/events`);
    es.addEventListener('error', () => { /* EventSource auto-reconnects */ });
    for (const [eventName, cbs] of listeners.entries()) {
      for (const cb of cbs) {
        es.addEventListener(eventName, cb);
      }
    }
  }
  return es;
}

export function subscribe(eventName: string, callback: SseCallback): () => void {
  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName)!.add(callback);

  getEventSource().addEventListener(eventName, callback);

  return () => {
    listeners.get(eventName)?.delete(callback);
    es?.removeEventListener(eventName, callback);
  };
}
