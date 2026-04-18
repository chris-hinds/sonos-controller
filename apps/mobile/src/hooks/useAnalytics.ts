import { useCallback } from 'react';
import { posthog } from '@/lib/posthog';

export function useAnalytics() {
  const capture = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      posthog.capture(event, properties);
    },
    []
  );

  return { capture };
}
