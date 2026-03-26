import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePlayer } from '../context/PlayerContext';
import FullscreenPlayer from '../components/FullscreenPlayer';

export default function FullscreenRoute() {
  const { selectedIp, selectedSpeaker, speakerState } = usePlayer();
  const navigate = useNavigate();

  // Redirect to home if no speaker selected
  useEffect(() => {
    if (!selectedIp) navigate({ to: '/' });
  }, [selectedIp, navigate]);

  if (!selectedIp || !selectedSpeaker) return null;

  return (
    <FullscreenPlayer
      state={speakerState}
      speakerIp={selectedIp}
      speakerName={selectedSpeaker.name}
      onClose={() => navigate({ to: '/' })}
    />
  );
}
