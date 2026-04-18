import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { usePlayer } from '@/context/PlayerContext';
import { useServer } from '@/context/ServerContext';

function AlbumArtPlaceholder({ size }: { size: number }) {
  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: 12 }]}>
      <Text style={styles.placeholderIcon}>♪</Text>
    </View>
  );
}

export function NowPlaying() {
  const { groupState } = usePlayer();
  const { serverUrl } = useServer();
  const { width } = useWindowDimensions();
  const artSize = width - 48;

  const track = groupState?.track;
  const artUrl = track?.albumArtUrl;

  const proxyUrl =
    artUrl && serverUrl
      ? `${serverUrl}/api/art?url=${encodeURIComponent(artUrl)}`
      : null;

  return (
    <View style={styles.container}>
      {/* Album art */}
      <View style={styles.artWrapper}>
        {proxyUrl ? (
          <Image
            source={{ uri: proxyUrl }}
            style={[styles.art, { width: artSize, height: artSize }]}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <AlbumArtPlaceholder size={artSize} />
        )}
      </View>

      {/* Track info */}
      <View style={styles.trackInfo}>
        <Text style={styles.title} numberOfLines={1}>
          {track?.title || 'Nothing playing'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track?.artist || ''}
        </Text>
        {track?.album ? (
          <Text style={styles.album} numberOfLines={1}>
            {track.album}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  artWrapper: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  art: {
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  placeholder: {
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  placeholderIcon: {
    fontSize: 64,
    color: 'rgba(255,255,255,0.15)',
  },
  trackInfo: {
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  artist: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  album: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
