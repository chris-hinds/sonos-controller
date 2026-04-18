import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { GroupState } from '@/types/sonos';

const SILENT_AUDIO = require('../../assets/silent.wav');

interface MediaControlHandlers {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function useMediaControl(
  groupState: GroupState | null,
  serverUrl: string | null,
  handlers: MediaControlHandlers
) {
  const player = useAudioPlayer(SILENT_AUDIO);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Set to true while we programmatically change player state so the bridge ignores it.
  const weTriggeredRef = useRef(false);
  // Track the last playing value we sent to Sonos so we only act on transitions.
  const lastBridgedPlayingRef = useRef<boolean | null>(null);
  // Current Sonos play state — needed in the restart handler.
  const sonosIsPlayingRef = useRef(false);
  sonosIsPlayingRef.current = groupState?.transportState === 'PLAYING';

  // Configure audio session once.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
    // Manual restart on finish — avoids the brief playing:false the native
    // loop emits during its internal seek-to-zero.
    player.loop = false;
  }, [player]);

  // Register lock screen controls once. Repeated calls stack remote-command handlers.
  useEffect(() => {
    player.setActiveForLockScreen(true, {}, undefined);
    return () => {
      try { player.pause(); } catch {}
      try { player.clearLockScreenControls(); } catch {}
    };
  }, [player]);

  // Update lock screen metadata (title / artist / artwork) when the track changes.
  useEffect(() => {
    const track = groupState?.track;
    if (!track?.title) return;
    const artworkUrl =
      track.albumArtUrl && serverUrl
        ? `${serverUrl}/api/art?url=${encodeURIComponent(track.albumArtUrl)}`
        : undefined;
    try {
      player.updateLockScreenMetadata({
        title: track.title,
        artist: track.artist ?? undefined,
        albumTitle: track.album ?? undefined,
        artworkUrl,
      });
    } catch {}
  }, [
    groupState?.track?.uri,
    groupState?.track?.title,
    groupState?.track?.artist,
    groupState?.track?.album,
    groupState?.track?.albumArtUrl,
    serverUrl,
    player,
  ]);

  // Mirror Sonos play/pause state onto the silent player so the lock screen icon is correct.
  useEffect(() => {
    const isPlaying = groupState?.transportState === 'PLAYING';
    weTriggeredRef.current = true;
    try {
      if (isPlaying && !player.playing) {
        player.play();
      } else if (!isPlaying && player.playing) {
        player.pause();
      }
    } catch {}
    const t = setTimeout(() => { weTriggeredRef.current = false; }, 600);
    return () => clearTimeout(t);
  }, [groupState?.transportState, player]);

  // Bridge lock screen play/pause → Sonos, and silently restart the file when it ends.
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        // The 30-second silent file ended. Restart it if Sonos is playing.
        // Mark as triggered so the restart events don't reach Sonos.
        if (sonosIsPlayingRef.current) {
          weTriggeredRef.current = true;
          player.seekTo(0)
            .then(() => { try { player.play(); } catch {} })
            .catch(() => {})
            .finally(() => {
              setTimeout(() => { weTriggeredRef.current = false; }, 600);
            });
        }
        return;
      }

      if (weTriggeredRef.current) return;

      // Only call Sonos on state transitions, not on every status poll.
      if (status.playing === lastBridgedPlayingRef.current) return;
      lastBridgedPlayingRef.current = status.playing;

      if (status.playing) {
        handlersRef.current.onPlay();
      } else {
        handlersRef.current.onPause();
      }
    });

    return () => sub.remove();
  }, [player]);
}
