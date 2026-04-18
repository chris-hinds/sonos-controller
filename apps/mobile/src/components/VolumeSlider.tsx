import { SymbolView } from 'expo-symbols';
import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useApi } from '@/hooks/useApi';
import { usePlayer } from '@/context/PlayerContext';

export function VolumeSlider() {
  const { groupState, selectedIp, speakers } = usePlayer();
  const { post } = useApi();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barWidthRef = useRef(0);

  const speaker = speakers.find((s) => s.ip === selectedIp);
  const coordinatorIp = speaker?.coordinatorIp || speaker?.ip || selectedIp || '';
  const volData = groupState?.volume[coordinatorIp];
  const isMuted = volData?.mute ?? false;
  const rawVolume = volData?.volume ?? 50;

  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const displayVolume = localVolume !== null ? localVolume : rawVolume;
  const effectiveVolume = isMuted ? 0 : displayVolume;

  const sendVolume = useCallback(
    (vol: number) => {
      if (!coordinatorIp) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        post(`/api/speakers/${coordinatorIp}/volume`, { volume: Math.round(vol) }).catch(() => {});
      }, 120);
    },
    [coordinatorIp, post]
  );

  const toggleMute = useCallback(() => {
    if (!coordinatorIp) return;
    post(`/api/speakers/${coordinatorIp}/mute`, { muted: !isMuted }).catch(() => {});
  }, [coordinatorIp, isMuted, post]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setDragging(true);
        const vol = Math.max(0, Math.min(100, (e.nativeEvent.locationX / barWidthRef.current) * 100));
        setLocalVolume(vol);
        sendVolume(vol);
      },
      onPanResponderMove: (e) => {
        const vol = Math.max(0, Math.min(100, (e.nativeEvent.locationX / barWidthRef.current) * 100));
        setLocalVolume(vol);
        sendVolume(vol);
      },
      onPanResponderRelease: () => {
        setDragging(false);
        setTimeout(() => setLocalVolume(null), 500);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        setTimeout(() => setLocalVolume(null), 500);
      },
    })
  ).current;

  const volumeSymbol = isMuted || effectiveVolume === 0
    ? 'speaker.slash.fill'
    : effectiveVolume < 33
    ? 'speaker.wave.1.fill'
    : effectiveVolume < 66
    ? 'speaker.wave.2.fill'
    : 'speaker.wave.3.fill';

  return (
    <View style={styles.container}>
      {/* Mute toggle */}
      <TouchableOpacity onPress={toggleMute} style={styles.iconBtn} activeOpacity={0.6}>
        <SymbolView
          name={volumeSymbol}
          style={styles.icon}
          tintColor={isMuted ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)'}
        />
      </TouchableOpacity>

      {/* Track */}
      <View
        style={styles.trackContainer}
        onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        {/* Background track */}
        <View style={styles.track} />

        {/* Filled portion */}
        <View style={[styles.fill, { width: `${effectiveVolume}%` }]} />

        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            { left: `${effectiveVolume}%` as unknown as number },
            dragging && styles.thumbDragging,
          ]}
        />
      </View>

      {/* Max icon */}
      <SymbolView
        name="speaker.wave.3.fill"
        style={styles.maxIcon}
        tintColor="rgba(255,255,255,0.25)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 20,
    height: 20,
  },
  maxIcon: {
    width: 18,
    height: 18,
  },
  trackContainer: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  fill: {
    position: 'absolute',
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 3,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginTop: -10,
    marginLeft: -10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  thumbDragging: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginTop: -13,
    marginLeft: -13,
  },
});
