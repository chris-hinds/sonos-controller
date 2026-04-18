import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { MiniPlayer } from '@/components/MiniPlayer';
import { DynamicColorIOS } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { usePlayer } from '@/context/PlayerContext';
import { useAnalytics } from '@/hooks/useAnalytics';

function RoomsButton() {
  const { speakers, selectedIp, setSelectedIp } = usePlayer();
  const router = useRouter();
  const { capture } = useAnalytics();
  const coordinators = speakers.filter((s) => s.isCoordinator);

  const selectedSpeaker = speakers.find((s) => s.ip === selectedIp);
  const activeCoordinatorIp = selectedSpeaker?.coordinatorIp || selectedSpeaker?.ip || selectedIp;

  // key forces the native menu to remount whenever the room list changes
  const isLoading = coordinators.length === 0;
  const menuKey = coordinators.map((c) => c.ip).join(',');

  return (
    <Stack.Toolbar key={isLoading ? 'loading' : 'loaded'} placement="right">
      {isLoading ? (
        <Stack.Toolbar.Button
          icon="hifispeaker.2"
          tintColor="rgba(255,211,44,0.35)"
        />
      ) : (
        <Stack.Toolbar.Menu key={menuKey} tintColor="#FFD32C">
          <Stack.Toolbar.Icon sf="hifispeaker.2" />
          <Stack.Toolbar.Label>{selectedSpeaker?.name}</Stack.Toolbar.Label>
          <Stack.Toolbar.Badge>{coordinators.length.toString()}</Stack.Toolbar.Badge>
          {coordinators.map((coordinator) => {
            const memberNames = (coordinator.groupMembers ?? [])
              .map((ip) => speakers.find((s) => s.ip === ip)?.name)
              .filter((n): n is string => !!n && n !== coordinator.name);
            const label =
              memberNames.length > 0
                ? `${coordinator.name} + ${memberNames.join(' + ')}`
                : coordinator.name;

            return (
              <Stack.Toolbar.MenuAction
                key={coordinator.ip}
                icon="hifispeaker"
                isOn={activeCoordinatorIp === coordinator.ip}
                onPress={() => { capture('Room Selected', { room: coordinator.name }); setSelectedIp(coordinator.ip); }}
              >
                {label}
              </Stack.Toolbar.MenuAction>
            );
          })}
          <Stack.Toolbar.Spacer />
          <Stack.Toolbar.MenuAction
            icon="list.bullet"
            onPress={() => { capture('Rooms Opened'); router.push('/rooms'); }}
          >
            All Rooms & Speakers
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      )}
    </Stack.Toolbar>
    
  );
}

export default function TabLayout() {
  const { queue, groupState } = usePlayer();
  const hasTrack = !!groupState?.track?.title;

  return (
    <>
      <RoomsButton />

      <NativeTabs
        labelStyle={{
          color: DynamicColorIOS({ dark: 'white', light: 'black' }),
        }}
        tintColor={DynamicColorIOS({ dark: 'white', light: 'black' })}
        minimizeBehavior="onScrollDown"
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="music.note" md="home" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="library">
          <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="star.fill" md="star" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="queue">
          {queue?.length > 0 && (
            <NativeTabs.Trigger.Badge>{queue?.length?.toString()}</NativeTabs.Trigger.Badge>
          )}
          <NativeTabs.Trigger.Label>Queue</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="music.note.list" md="queue_music" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
        </NativeTabs.Trigger>

        {hasTrack && (
          <NativeTabs.BottomAccessory>
            <MiniPlayer />
          </NativeTabs.BottomAccessory>
        )}
      </NativeTabs>
    </>
  );
}
