import { SymbolView } from 'expo-symbols';
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useApi } from '@/hooks/useApi';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePlayer } from '@/context/PlayerContext';
import { RepeatMode } from '@/types/sonos';

export function PlayerControls() {
  const { groupState, selectedIp, speakers } = usePlayer();
  const { post } = useApi();
  const { capture } = useAnalytics();

  const speaker = speakers.find((s) => s.ip === selectedIp);
  const coordinatorIp = speaker?.coordinatorIp || speaker?.ip || selectedIp || '';

  const transportState = groupState?.transportState ?? 'STOPPED';
  const isPlaying = transportState === 'PLAYING';
  const isTransitioning = transportState === 'TRANSITIONING';
  const shuffle = groupState?.shuffle ?? false;
  const repeat = groupState?.repeat ?? 'none';
  const repeatActive = repeat !== 'none';

  const handlePlay = useCallback(() => {
    if (!coordinatorIp) return;
    capture('Play');
    post(`/api/speakers/${coordinatorIp}/play`).catch(() => {});
  }, [coordinatorIp, post, capture]);

  const handlePause = useCallback(() => {
    if (!coordinatorIp) return;
    capture('Pause');
    post(`/api/speakers/${coordinatorIp}/pause`).catch(() => {});
  }, [coordinatorIp, post, capture]);

  const handleNext = useCallback(() => {
    if (!coordinatorIp) return;
    capture('Skip Next');
    post(`/api/speakers/${coordinatorIp}/next`).catch(() => {});
  }, [coordinatorIp, post, capture]);

  const handlePrevious = useCallback(() => {
    if (!coordinatorIp) return;
    capture('Skip Previous');
    post(`/api/speakers/${coordinatorIp}/previous`).catch(() => {});
  }, [coordinatorIp, post, capture]);

  const handleShuffle = useCallback(() => {
    if (!coordinatorIp) return;
    capture('Shuffle Toggled', { enabled: !shuffle });
    post(`/api/speakers/${coordinatorIp}/shuffle`, { enabled: !shuffle }).catch(() => {});
  }, [coordinatorIp, post, shuffle, capture]);

  const handleRepeat = useCallback(() => {
    if (!coordinatorIp) return;
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const next = modes[(modes.indexOf(repeat) + 1) % modes.length];
    capture('Repeat Changed', { mode: next });
    post(`/api/speakers/${coordinatorIp}/repeat`, { mode: next }).catch(() => {});
  }, [coordinatorIp, post, repeat, capture]);

  return (
    <View style={styles.container}>
      {/* Shuffle */}
      <TouchableOpacity
        style={styles.sideBtn}
        onPress={handleShuffle}
        activeOpacity={0.6}
        disabled={!coordinatorIp}
      >
        <SymbolView
          name="shuffle"
          style={styles.sideIcon}
          tintColor={shuffle ? '#FFD32C' : 'rgba(255,255,255,0.5)'}
        />
        {shuffle && <View style={styles.dot} />}
      </TouchableOpacity>

      {/* Previous */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handlePrevious}
        activeOpacity={0.6}
        disabled={!coordinatorIp}
      >
        <SymbolView
          name="backward.fill"
          style={styles.skipIcon}
          tintColor={coordinatorIp ? '#ffffff' : 'rgba(255,255,255,0.3)'}
        />
      </TouchableOpacity>

      {/* Play / Pause */}
      <TouchableOpacity
        style={styles.playBtn}
        onPress={isPlaying ? handlePause : handlePlay}
        activeOpacity={0.85}
        disabled={!coordinatorIp}
      >
        {isTransitioning ? (
          <ActivityIndicator color="#0a0a0a" size="small" />
        ) : (
          <SymbolView
            name={isPlaying ? 'pause.fill' : 'play.fill'}
            style={styles.playIcon}
            tintColor="#0a0a0a"
          />
        )}
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handleNext}
        activeOpacity={0.6}
        disabled={!coordinatorIp}
      >
        <SymbolView
          name="forward.fill"
          style={styles.skipIcon}
          tintColor={coordinatorIp ? '#ffffff' : 'rgba(255,255,255,0.3)'}
        />
      </TouchableOpacity>

      {/* Repeat */}
      <TouchableOpacity
        style={styles.sideBtn}
        onPress={handleRepeat}
        activeOpacity={0.6}
        disabled={!coordinatorIp}
      >
        <SymbolView
          name={repeat === 'one' ? 'repeat.1' : 'repeat'}
          style={styles.sideIcon}
          tintColor={repeatActive ? '#FFD32C' : 'rgba(255,255,255,0.5)'}
        />
        {repeatActive && <View style={styles.dot} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 4,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideIcon: {
    width: 22,
    height: 22,
  },
  skipBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipIcon: {
    width: 32,
    height: 32,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  playIcon: {
    width: 30,
    height: 30,
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD32C',
  },
});
