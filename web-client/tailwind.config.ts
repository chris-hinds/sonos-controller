import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'sonos-dark': '#0a0a0a',
        'sonos-surface': '#1a1a1a',
        'sonos-card': '#242424',
        'sonos-border': '#333333',
        'sonos-accent': '#f59e0b',
        'sonos-text': '#f5f5f5',
        'sonos-muted': '#888888',
      },
    },
  },
  plugins: [],
} satisfies Config;
