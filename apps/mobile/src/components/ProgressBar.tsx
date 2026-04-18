import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { usePlayer } from '@/context/PlayerContext';

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressBar() {
  const { groupState } = usePlayer();

  const track = groupState?.track;
  const duration = track?.duration ?? 0;
  const position = track?.position ?? 0;

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  const handlePress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      // Seek is not implemented in this API, but we track taps anyway
    },
    []
  );

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.thumb, { left: `${progress * 100}%` as unknown as number }]} />
          </View>
        </View>
      </TouchableWithoutFeedback>
      <View style={styles.times}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginVertical: 4,
  },
  barContainer: {
    paddingVertical: 10,
  },
  barTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD32C',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#ffffff',
    marginLeft: -6.5,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontVariant: ['tabular-nums'],
  },
});
