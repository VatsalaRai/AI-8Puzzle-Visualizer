/*
 * tailwind-config.js
 * Configuration for the Tailwind CSS Play CDN (loaded in every page, right after the CDN script).
 * Adds the pixel palette and the two pixel fonts as Tailwind utilities, e.g. bg-hot, text-sun, font-pixel.
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: '#050509',
        surface: '#0A0A18',
        hot: '#E85DB5',
        pastel: '#F2A9D5',
        lav: '#6258F5',
        lime: '#83F28F',
        mint: '#D0FFC0',
        sun: '#F7E96B',
        soft: '#F5F3FF',
        plum: '#2B1A52'
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
        silk: ['Silkscreen', 'ui-monospace', 'monospace'],
        body: ['ui-monospace', '"Cascadia Mono"', 'Consolas', '"Courier New"', 'monospace']
      }
    }
  }
};
