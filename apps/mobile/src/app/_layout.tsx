import '../global.css';
import { Stack, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native';
import { ServerProvider, useServer } from '@/context/ServerContext';
import { PlayerProvider, usePlayer } from '@/context/PlayerContext';
import { ServerSetup } from '@/components/ServerSetup';
import { posthog } from '@/lib/posthog';

const TAB_TITLES: Record<string, string> = {
  '/': 'Now Playing',
  '/index': 'Now Playing',
  '/library': 'Library',
  '/queue': 'Queue',
  '/rooms': 'Rooms',
  '/settings': 'Settings',
};

const HEADER_STYLE = {
  backgroundColor: '#0a0a0a',
} as const;

const HEADER_TITLE_STYLE = {
  color: '#ffffff',
} as const;

function ScreenTracker() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;
    const screen = TAB_TITLES[pathname] ?? pathname;
    posthog.screen(screen);
  }, [pathname]);

  return null;
}

function RootNavigator() {
  const { isConfigured } = useServer();
  const { selectedIp, speakers } = usePlayer();
  const pathname = usePathname();

  if (!isConfigured) {
    return <ServerSetup />;
  }

  const selectedSpeaker = speakers.find((s) => s.ip === selectedIp);
  const isHome = pathname === '/' || pathname === '/index';
  const tabTitle = isHome
    ? (selectedSpeaker?.name ?? 'Now Playing')
    : (TAB_TITLES[pathname] ?? 'Kyuu');

  return (
    <>
      <ScreenTracker />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: true,
            headerTitle: tabTitle,
            headerStyle: HEADER_STYLE,
            headerTitleStyle: HEADER_TITLE_STYLE,
            headerTintColor: '#ffffff',
          }}
        />
        <Stack.Screen
          name="rooms"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Rooms & Speakers',
            headerStyle: HEADER_STYLE,
            headerTintColor: '#ffffff',
            headerTitleStyle: HEADER_TITLE_STYLE,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <PostHogProvider client={posthog}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ServerProvider>
          <PlayerProvider>
            <RootNavigator />
          </PlayerProvider>
        </ServerProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}
