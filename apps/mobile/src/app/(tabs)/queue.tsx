import { Image } from 'expo-image';
const KyuuLogo = () => (
  <Image
    source={require('@/assets/images/splash-icon.svg')}
    style={{ width: 80, height: 80, marginBottom: 8 }}
    contentFit="contain"
  />
);
import { Stack } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DropProvider, SortableItem, useSortableList } from 'react-native-reanimated-dnd';
import { useApi } from '@/hooks/useApi';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePlayer } from '@/context/PlayerContext';
import { useServer } from '@/context/ServerContext';
import { QueueItem } from '@/types/sonos';

const ITEM_HEIGHT = 64;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TrackArt({ uri }: { uri: string | null }) {
  const { serverUrl } = useServer();
  const proxyUrl = uri && serverUrl ? `${serverUrl}/api/art?url=${encodeURIComponent(uri)}` : null;
  return (
    <View style={styles.artThumb}>
      {proxyUrl ? (
        <Image source={{ uri: proxyUrl }} style={styles.artImage} contentFit="cover" />
      ) : (
        <View style={styles.artPlaceholder}>
          <Text style={styles.artPlaceholderIcon}>♪</Text>
        </View>
      )}
    </View>
  );
}

function SimpleRow({
  item,
  isPlaying,
  onPress,
}: {
  item: QueueItem;
  isPlaying: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.trackRow, isPlaying && styles.trackRowPlaying]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TrackArt uri={item.albumArtURI} />
      <View style={styles.trackMeta}>
        <Text style={[styles.trackTitle, isPlaying && styles.trackTitlePlaying]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trackSubRow}>
          {item.artist ? (
            <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
          ) : null}
          {item.duration ? (
            <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function QueueRow({
  item,
  isPlaying,
  onPress,
}: {
  item: QueueItem;
  isPlaying: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.trackRow, isPlaying && styles.trackRowPlaying]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TrackArt uri={item.albumArtURI} />
      <View style={styles.trackMeta}>
        <Text
          style={[styles.trackTitle, isPlaying && styles.trackTitlePlaying]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View style={styles.trackSubRow}>
          {item.artist ? (
            <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
          ) : null}
          {item.duration ? (
            <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
          ) : null}
        </View>
      </View>
      <SortableItem.Handle style={styles.dragHandle}>
        <Text style={styles.dragHandleIcon}>⠿</Text>
      </SortableItem.Handle>
    </TouchableOpacity>
  );
}

// Isolated so useSortableList is always initialised with the loaded queue
function SortableQueue({
  queue,
  currentTrackUri,
  insetBottom,
  onPlayItem,
  onDragStart,
  onDrop,
}: {
  queue: QueueItem[];
  currentTrackUri: string | undefined;
  insetBottom: number;
  onPlayItem: (index: number) => void;
  onDragStart: (id: string, position: number) => void;
  onDrop: (id: string, finalPosition: number) => void;
}) {
  const { scrollViewRef, dropProviderRef, handleScroll, handleScrollEnd, contentHeight, getItemProps } =
    useSortableList({ data: queue, itemHeight: ITEM_HEIGHT });

  return (
    <DropProvider ref={dropProviderRef}>
      {/* Animated.ScrollView = native UIScrollView — required so NativeTabs
          minimizeBehavior="onScrollDown" can detect the scroll view */}
      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ height: contentHeight }}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        showsVerticalScrollIndicator={false}
        contentInset={{ bottom: insetBottom }}
        scrollIndicatorInsets={{ bottom: insetBottom }}
        style={styles.list}
      >
        {queue.map((item, index) => {
          const itemProps = getItemProps(item, index);
          return (
            <SortableItem
              key={item.id}
              {...itemProps}
              item={item}
              index={index}
              onDragStart={onDragStart}
              onDrop={onDrop}
            >
              <QueueRow
                item={item}
                isPlaying={item.uri === currentTrackUri}
                onPress={() => onPlayItem(item.index)}
              />
            </SortableItem>
          );
        })}
      </Animated.ScrollView>
    </DropProvider>
  );
}

export default function QueueScreen() {
  const insets = useSafeAreaInsets();
  const { groupState, selectedIp, speakers, queue: contextQueue, loadingQueue, refreshQueue } = usePlayer();
  const { post } = useApi();
  const { capture } = useAnalytics();

  const selectedSpeaker = speakers.find((s) => s.ip === selectedIp);
  const coordinatorIp = selectedSpeaker?.coordinatorIp || selectedSpeaker?.ip || selectedIp || '';
  const currentTrackUri = groupState?.track?.uri;

  // Local queue state for optimistic reorder updates; seeded from context
  const [localQueue, setLocalQueue] = useState<QueueItem[]>(contextQueue);
  const [queueKey, setQueueKey] = useState(0);

  // Sync local queue when the context queue changes (room switch, server refresh)
  const prevContextQueueRef = useRef(contextQueue);
  if (prevContextQueueRef.current !== contextQueue) {
    prevContextQueueRef.current = contextQueue;
    setLocalQueue(contextQueue);
    setQueueKey((k) => k + 1);
  }

  const dragStartPositionRef = useRef<number | null>(null);

  const playQueueItem = useCallback(
    (index: number) => {
      if (!coordinatorIp) return;
      const item = localQueue[index];
      capture('Queue Item Played', { index, title: item?.title, artist: item?.artist });
      post(`/api/speakers/${coordinatorIp}/play-queue-item`, { index }).catch(() => {});
    },
    [coordinatorIp, post, capture, localQueue]
  );

  const handleDragStart = useCallback((_id: string, position: number) => {
    dragStartPositionRef.current = position;
  }, []);

  const handleDrop = useCallback(
    (_id: string, finalPosition: number) => {
      const from = dragStartPositionRef.current;
      dragStartPositionRef.current = null;
      if (from === null || from === finalPosition || !coordinatorIp) return;

      setLocalQueue((prev) => {
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(finalPosition, 0, item);
        return next.map((q, i) => ({ ...q, index: i }));
      });

      capture('Queue Item Reordered', { from, to: finalPosition });
      post(`/api/speakers/${coordinatorIp}/reorder-queue`, {
        fromIndex: from,
        toIndex: finalPosition,
      }).catch(() => refreshQueue());
    },
    [coordinatorIp, post, refreshQueue, capture]
  );

  const queueTitle = localQueue.length > 0 ? `Queue (${localQueue.length})` : 'Queue';

  // Items after the current track (for simple up-next view)
  const currentIndex = localQueue.findIndex((q) => q.uri === currentTrackUri);
  const upNext = currentIndex >= 0 ? localQueue.slice(currentIndex + 1) : [];

  return (
    <ScrollView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: queueTitle }} />

      {!coordinatorIp ? (
        <View style={styles.empty}>
          <KyuuLogo />
          <Text style={styles.emptyTitle}>No room selected</Text>
          <Text style={styles.emptySubtitle}>Tap the Rooms tab to choose a speaker</Text>
        </View>
      ) : loadingQueue ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFD32C" />
        </View>
      ) : localQueue.length === 0 ? (
        // No queue — show simple up-next style with current track if playing
        <View style={styles.simpleSection}>
          {groupState?.track?.title ? (
            <>
              <Text style={styles.sectionLabel}>NOW PLAYING</Text>
              <View style={styles.nowPlayingRow}>
                <TrackArt uri={groupState.track.albumArtUrl} />
                <View style={styles.trackMeta}>
                  <Text style={[styles.trackTitle, styles.trackTitlePlaying]} numberOfLines={1}>
                    {groupState.track.title}
                  </Text>
                  {groupState.track.artist ? (
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {groupState.track.artist}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>UP NEXT</Text>
              <View style={styles.loadingContainer}>
                <Text style={styles.emptyText}>Nothing queued</Text>
              </View>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.emptyText}>Nothing queued</Text>
            </View>
          )}
        </View>
      ) : currentIndex >= 0 && upNext.length === 0 ? (
        // Queue exists but current track is last — show simple view
        <View style={styles.simpleSection}>
          <Text style={styles.sectionLabel}>NOW PLAYING</Text>
          <SimpleRow
            item={localQueue[currentIndex]}
            isPlaying
            onPress={() => playQueueItem(localQueue[currentIndex].index)}
          />
          {currentIndex > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>PLAYED</Text>
              {localQueue.slice(0, currentIndex).map((item) => (
                <SimpleRow
                  key={item.id}
                  item={item}
                  isPlaying={false}
                  onPress={() => playQueueItem(item.index)}
                />
              ))}
            </>
          ) : null}
        </View>
      ) : (
        <SortableQueue
          key={queueKey}
          queue={localQueue}
          currentTrackUri={currentTrackUri}
          insetBottom={insets.bottom}
          onPlayItem={playQueueItem}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
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
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
  },
  list: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  simpleSection: {
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: ITEM_HEIGHT,
    gap: 12,
    backgroundColor: '#0a0a0a',
  },
  trackRowPlaying: {
    backgroundColor: 'rgba(29,185,84,0.05)',
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
  trackTitlePlaying: { color: '#FFD32C' },
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
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexShrink: 0,
  },
  dragHandleIcon: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.2)',
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
    fontSize: 20,
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
