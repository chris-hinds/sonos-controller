import React, { useCallback, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApi } from '@/hooks/useApi';
import { GroupState, SpeakerInfo } from '@/types/sonos';

interface RoomItemProps {
  speaker: SpeakerInfo;
  groupState: GroupState | null;
  isSelected: boolean;
  onSelect: (ip: string) => void;
  isCoordinator: boolean;
  indented?: boolean;
}

export function RoomItem({
  speaker,
  groupState,
  isSelected,
  onSelect,
  isCoordinator,
  indented = false,
}: RoomItemProps) {
  const { post } = useApi();
  const barWidthRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coordinatorIp = speaker.coordinatorIp ?? speaker.ip;
  const volData = groupState?.volume[speaker.ip];
  const volume = volData?.volume ?? 0;
  const isMuted = volData?.mute ?? false;

  const sendVolume = useCallback(
    (vol: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        post(`/api/speakers/${speaker.ip}/volume`, { volume: Math.round(vol) }).catch(() => {});
      }, 150);
    },
    [speaker.ip, post]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const vol = Math.max(0, Math.min(100, (x / barWidthRef.current) * 100));
        sendVolume(vol);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const vol = Math.max(0, Math.min(100, (x / barWidthRef.current) * 100));
        sendVolume(vol);
      },
    })
  ).current;

  const transportState = groupState?.transportState;
  const track = groupState?.track;
  const isPlaying = transportState === 'PLAYING';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        indented && styles.indented,
        isSelected && styles.selected,
      ]}
      onPress={() => onSelect(speaker.ip)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {/* Selection indicator */}
        <View style={[styles.indicator, isSelected && styles.indicatorActive]} />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.name, isSelected && styles.nameSelected]}>
              {speaker.name}
            </Text>
            {isCoordinator && isPlaying && (
              <View style={styles.playingBadge}>
                <Text style={styles.playingText}>▶</Text>
              </View>
            )}
          </View>

          {isCoordinator && track?.title ? (
            <Text style={styles.trackText} numberOfLines={1}>
              {track.title}
              {track.artist ? ` · ${track.artist}` : ''}
            </Text>
          ) : null}

          {/* Volume slider */}
          <View style={styles.volumeRow}>
            <Text style={styles.volIcon}>
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </Text>
            <View
              style={styles.volSlider}
              onLayout={(e) => {
                barWidthRef.current = e.nativeEvent.layout.width;
              }}
              {...panResponder.panHandlers}
            >
              <View style={styles.volTrack}>
                <View
                  style={[
                    styles.volFill,
                    { width: `${isMuted ? 0 : volume}%` },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.volNumber}>{isMuted ? 'M' : volume}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  indented: {
    marginLeft: 32,
    backgroundColor: '#0f0f0f',
  },
  selected: {
    borderColor: 'rgba(29,185,84,0.3)',
    backgroundColor: 'rgba(29,185,84,0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  indicator: {
    width: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    margin: 12,
    marginRight: 0,
  },
  indicatorActive: {
    backgroundColor: '#FFD32C',
  },
  content: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  nameSelected: {
    color: '#ffffff',
  },
  playingBadge: {
    backgroundColor: 'rgba(29,185,84,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playingText: {
    fontSize: 10,
    color: '#FFD32C',
  },
  trackText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  volIcon: {
    fontSize: 12,
    width: 18,
  },
  volSlider: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  volTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  volFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
  },
  volNumber: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    width: 24,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
