import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'sonos_server_url';

interface ServerContextValue {
  serverUrl: string | null;
  setServerUrl: (url: string) => Promise<void>;
  clearServerUrl: () => Promise<void>;
  isConfigured: boolean;
}

const ServerContext = createContext<ServerContextValue>({
  serverUrl: null,
  setServerUrl: async () => {},
  clearServerUrl: async () => {},
  isConfigured: false,
});

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrlState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((url) => {
        if (url) setServerUrlState(url);
      })
      .finally(() => setLoaded(true));
  }, []);

  const setServerUrl = useCallback(async (url: string) => {
    const trimmed = url.trim().replace(/\/$/, '');
    await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    setServerUrlState(trimmed);
  }, []);

  const clearServerUrl = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setServerUrlState(null);
  }, []);

  if (!loaded) return null;

  return (
    <ServerContext.Provider
      value={{
        serverUrl,
        setServerUrl,
        clearServerUrl,
        isConfigured: !!serverUrl,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  return useContext(ServerContext);
}
