import { Image } from 'expo-image';
const KyuuLogo = () => (
  <Image
    source={require('@/assets/images/splash-icon.svg')}
    style={{ width: 80, height: 80, marginBottom: 8 }}
    contentFit="contain"
  />
);
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NowPlaying } from '@/components/NowPlaying';
import { PlayerControls } from '@/components/PlayerControls';
import { ProgressBar } from '@/components/ProgressBar';
import { VolumeSlider } from '@/components/VolumeSlider';
import { useApi } from '@/hooks/useApi';
import { usePlayer } from '@/context/PlayerContext';
import { useServer } from '@/context/ServerContext';
import { QueueItem } from '@/types/sonos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const UP_NEXT_COUNT = 8;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function UpNextRow({
  item,
  onPress,
}: {
  item: QueueItem;
  onPress: () => void;
}) {
  const { serverUrl } = useServer();
  const proxyUrl =
    item.albumArtURI && serverUrl
      ? `${serverUrl}/api/art?url=${encodeURIComponent(item.albumArtURI)}`
      : null;

  return (
    <TouchableOpacity style={styles.trackRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.artThumb}>
        {proxyUrl ? (
          <Image source={{ uri: proxyUrl }} style={styles.artImage} contentFit="cover" />
        ) : (
          <View style={styles.artPlaceholder}>
            <Text style={styles.artPlaceholderIcon}>♪</Text>
          </View>
        )}
      </View>

      <View style={styles.trackMeta}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trackSubRow}>
          {item.artist ? (
            <Text style={styles.trackArtist} numberOfLines={1}>
              {item.artist}
            </Text>
          ) : null}
          {item.duration ? (
            <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const { groupState, selectedIp, speakers, queue, loadingQueue } = usePlayer();
  const { post } = useApi();

  const selectedSpeaker = speakers.find((s) => s.ip === selectedIp);
  const hasContent = !!selectedIp && !!groupState;
  const coordinatorIp = selectedSpeaker?.coordinatorIp || selectedSpeaker?.ip || selectedIp || '';
  const currentTrackUri = groupState?.track?.uri;

  // Only show upcoming items when the current track is actually in the queue
  const currentIndex = queue.findIndex((q) => q.uri === currentTrackUri);
  const upNext = currentIndex >= 0
    ? queue.slice(currentIndex + 1, currentIndex + 1 + UP_NEXT_COUNT)
    : [];

  const playQueueItem = useCallback(
    (index: number) => {
      if (!coordinatorIp) return;
      post(`/api/speakers/${coordinatorIp}/play-queue-item`, { index }).catch(() => {});
    },
    [coordinatorIp, post]
  );

  return (
    <ScrollView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {hasContent ? (
        <>
          <NowPlaying />
          <View style={styles.controls}>
            <ProgressBar />
            <PlayerControls />
            <VolumeSlider />
          </View>

          <View style={styles.upNextSection}>
            <Text style={styles.sectionTitle}>Up Next</Text>
            {loadingQueue ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFD32C" />
              </View>
            ) : upNext.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.emptyText}>Nothing queued</Text>
              </View>
            ) : (
              upNext.map((item) => (
                <UpNextRow
                  key={`upnext-${item.id}`}
                  item={item}
                  onPress={() => playQueueItem(item.index)}
                />
              ))
            )}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <KyuuLogo />
          <Text style={styles.emptyTitle}>
            {speakers.length === 0 ? 'Connecting...' : 'Select a room'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {speakers.length === 0
              ? 'Looking for speakers on your network'
              : 'Tap the Rooms tab to choose a speaker'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  controls: {
    gap: 16,
    paddingTop: 20,
  },
  upNextSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  artThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    flexShrink: 0,
  },
  artImage: { width: '100%', height: '100%' },
  artPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artPlaceholderIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.15)',
  },
  trackMeta: { flex: 1, gap: 2 },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  trackSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    flexShrink: 1,
  },
  trackDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    flexShrink: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
