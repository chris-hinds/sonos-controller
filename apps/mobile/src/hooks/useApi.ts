import { useServer } from '@/context/ServerContext';
import { useCallback } from 'react';

export function useApi() {
  const { serverUrl } = useServer();

  const get = useCallback(
    async (path: string) => {
      if (!serverUrl) throw new Error('Server URL not configured');
      const res = await fetch(`${serverUrl}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    [serverUrl]
  );

  const post = useCallback(
    async (path: string, body?: unknown) => {
      if (!serverUrl) throw new Error('Server URL not configured');
      const headers: Record<string, string> = {};
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      const res = await fetch(`${serverUrl}${path}`, {
        method: 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${path}`);
      return res.json();
    },
    [serverUrl]
  );

  return { get, post };
}
