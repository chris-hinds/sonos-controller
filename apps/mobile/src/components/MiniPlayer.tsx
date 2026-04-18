import { Image } from 'expo-image';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useApi } from '@/hooks/useApi';
import { useAnalytics } from '@/hooks/useAnalytics';
import { usePlayer } from '@/context/PlayerContext';
import { useServer } from '@/context/ServerContext';

export function MiniPlayer() {
  const { groupState, selectedIp, speakers } = usePlayer();
  const { serverUrl } = useServer();
  const { post } = useApi();
  const { capture } = useAnalytics();
  const router = useRouter();

  const speaker = speakers.find((s) => s.ip === selectedIp);
  const coordinatorIp = speaker?.coordinatorIp || speaker?.ip || selectedIp || '';

  const track = groupState?.track;
  const isPlaying = groupState?.transportState === 'PLAYING';

  const artUrl = track?.albumArtUrl && serverUrl
    ? `${serverUrl}/api/art?url=${encodeURIComponent(track.albumArtUrl)}`
    : null;

  const handlePlayPause = useCallback(() => {
    if (!coordinatorIp) return;
    const action = isPlaying ? 'pause' : 'play';
    capture(`Mini Player ${isPlaying ? 'Pause' : 'Play'}`);
    post(`/api/speakers/${coordinatorIp}/${action}`).catch(() => {});
  }, [coordinatorIp, isPlaying, post, capture]);

  const handleNext = useCallback(() => {
    if (!coordinatorIp) return;
    capture('Mini Player Skip Next');
    post(`/api/speakers/${coordinatorIp}/next`).catch(() => {});
  }, [coordinatorIp, post, capture]);

  if (!track?.title) return null;

  return (
    <View className='flex-row items-center gap-2 px-4 h-full'>
        {/* Track info — tappable to go to Now Playing */}
        <TouchableOpacity
          className='flex-1 flex-row items-center gap-2'
          onPress={() => { capture('Mini Player Now Playing Opened'); router.push('/'); }}
          activeOpacity={0.7}
        >
          <View className='w-8 h-8 rounded-lg overflow-hidden bg-gray-200 shrink-0'>
            {artUrl ? (
              <Image source={{ uri: artUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View className='flex-1 items-center justify-center'>
                <Text className='text-xl text-gray-400'>♪</Text>
              </View>
            )}
          </View>
          <View className='flex-1 gap-0 min-w-0'>
            <Text className='text-sm font-medium text-white' numberOfLines={1}>{track.title}</Text>
            {track.artist ? (
              <Text className='text-xs text-gray-400' numberOfLines={1}>{track.artist}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Controls */}
        <View className='flex-row items-center gap-2 shrink-0'>
          <TouchableOpacity onPress={handlePlayPause} className='w-8 h-8 items-center justify-center' activeOpacity={0.6}>
            <SymbolView
              name={isPlaying ? 'pause.fill' : 'play.fill'}
              className='w-6 h-6'
              tintColor="#ffffff"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} className='w-8 h-8 items-center justify-center' activeOpacity={0.6}>
            <SymbolView
              name="forward.fill"
              className='w-6 h-6'
              tintColor="#ffffff"
            />
          </TouchableOpacity>
        </View>
    </View>
  );
}
