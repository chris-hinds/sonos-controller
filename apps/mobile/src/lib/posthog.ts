import PostHog from 'posthog-react-native';

export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  {
    host: 'https://eu.i.posthog.com',
    persistence: 'file',
    // Autocapture is disabled — all events are captured explicitly with meaningful names
    autocapture: false,
    disabled: !process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  }
);
