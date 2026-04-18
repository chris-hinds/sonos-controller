import { Image } from 'expo-image';
const KyuuLogo = () => (
  <Image
    source={require('@/assets/images/splash-icon.svg')}
    style={{ width: 80, height: 80, marginBottom: 8 }}
    contentFit="contain"
  />
);
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useApi } from '@/hooks/useApi';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePlayer } from '@/context/PlayerContext';
import { useServer } from '@/context/ServerContext';
import { FavoriteItem } from '@/types/sonos';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FavoriteCard({
  title,
  artist,
  artUrl,
  isLoading,
  onPress,
}: {
  title: string;
  artist?: string;
  artUrl?: string;
  isLoading: boolean;
  onPress: () => void;
}) {
  const { serverUrl } = useServer();
  const proxyUrl =
    artUrl && serverUrl ? `${serverUrl}/api/art?url=${encodeURIComponent(artUrl)}` : null;

  return (
    <TouchableOpacity
      style={[styles.card, isLoading && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.cardArt}>
        {proxyUrl ? (
          <Image source={{ uri: proxyUrl }} style={styles.cardArtImage} contentFit="cover" />
        ) : (
          <View style={styles.cardArtPlaceholder}>
            <Text style={styles.cardArtPlaceholderIcon}>♪</Text>
          </View>
        )}
        {isLoading && (
          <View style={styles.cardLoadingOverlay}>
            <ActivityIndicator color="#FFD32C" />
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      {artist ? <Text style={styles.cardArtist} numberOfLines={1}>{artist}</Text> : null}
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { groupState, selectedIp, speakers } = usePlayer();
  const { get, post } = useApi();

  const selectedSpeaker = speakers.find((s) => s.ip === selectedIp);
  const hasContent = !!selectedIp && !!groupState;
  const coordinatorIp = selectedSpeaker?.coordinatorIp || selectedSpeaker?.ip || selectedIp || '';

  const { capture } = useAnalytics();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playingIdRef = useRef<string | null>(null);

  const loadFavorites = useCallback(async () => {
    if (!coordinatorIp) return;
    setLoadingFavorites(true);
    try {
      const data = await get(`/api/speakers/${coordinatorIp}/favorites`);
      const list = Array.isArray(data) ? data : [];
      setFavorites(list);
    } catch (e) {
      console.error('[favorites]', e);
      setFavorites([]);
    } finally {
      setLoadingFavorites(false);
    }
  }, [coordinatorIp, get]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Clear loading state when the track actually changes
  const prevTrackUriRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const uri = groupState?.track?.uri;
    if (uri && uri !== prevTrackUriRef.current && playingIdRef.current) {
      prevTrackUriRef.current = uri;
      setPlayingId(null);
      playingIdRef.current = null;
    } else if (!prevTrackUriRef.current) {
      prevTrackUriRef.current = uri;
    }
  }, [groupState?.track?.uri]);

  const playFavorite = useCallback(
    (item: FavoriteItem) => {
      if (!coordinatorIp || playingIdRef.current) return;
      setPlayingId(item.id);
      playingIdRef.current = item.id;
      capture('Library Item Played', { title: item.title, artist: item.artist });
      post(`/api/speakers/${coordinatorIp}/play-favorite`, {
        uri: item.uri,
        metadata: item.metadata,
      }).catch(() => {
        setPlayingId(null);
        playingIdRef.current = null;
      });
      // Fallback: clear after 8s if track hasn't changed
      setTimeout(() => {
        if (playingIdRef.current === item.id) {
          setPlayingId(null);
          playingIdRef.current = null;
        }
      }, 8000);
    },
    [coordinatorIp, post, capture]
  );

  return (
    <ScrollView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {hasContent ? (
        <>
          <View style={styles.favoritesSection}>
            {loadingFavorites ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFD32C" />
              </View>
            ) : favorites.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.emptyText}>No favorites</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {favorites.map((item) => (
                  <FavoriteCard
                    key={`f-${item.id}`}
                    title={item.title}
                    artist={item.artist}
                    artUrl={item.albumArtURI}
                    isLoading={playingId === item.id}
                    onPress={() => playFavorite(item)}
                  />
                ))}
              </View>
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
  },
  favoritesSection: {
    marginTop: 32,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.25)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  card: {
    width: '47%',
    backgroundColor: '#141414',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardActive: {
    borderColor: 'rgba(255,211,44,0.4)',
  },
  cardArt: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
  },
  cardArtImage: { width: '100%', height: '100%' },
  cardArtPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArtPlaceholderIcon: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.1)',
  },
  cardLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    paddingHorizontal: 10,
    paddingTop: 10,
    lineHeight: 18,
  },
  cardArtist: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 10,
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
