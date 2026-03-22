import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // RGB-channel variables allow Tailwind opacity modifiers (bg-sonos-dark/50 etc.)
        'sonos-dark':    'rgb(var(--color-dark-rgb)    / <alpha-value>)',
        'sonos-surface': 'rgb(var(--color-surface-rgb) / <alpha-value>)',
        'sonos-card':    'rgb(var(--color-card-rgb)    / <alpha-value>)',
        'sonos-border':  'rgb(var(--color-border-rgb)  / <alpha-value>)',
        'sonos-accent':  'rgb(var(--color-accent-rgb)  / <alpha-value>)',
        'sonos-text':    'rgb(var(--color-text-rgb)    / <alpha-value>)',
        'sonos-muted':   'rgb(var(--color-muted-rgb)   / <alpha-value>)',
      },
    },
  },
  plugins: [],
} satisfies Config;
