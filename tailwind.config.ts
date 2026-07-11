import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './content/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      // Cinematic palette: near-black "theater" background, warm ivory type,
      // crimson marquee accent, brass-gold secondary. The semantic token names
      // (ink = foreground, paper = background) are kept so every existing
      // `text-ink` / `bg-paper` usage flips to the dark theme automatically.
      colors: {
        ink: '#f2ead9',
        paper: '#0c0a0e',
        accent: '#e84550',
        gold: '#d9a441',
        muted: '#a59c8b',
        rule: '#2a2530',
        // Intermediate zinc shade used by the VaporLoop demo (/vaporloop)
        'zinc-850': '#1f1f23',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
