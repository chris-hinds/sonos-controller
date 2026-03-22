import { useState, useEffect } from 'react';

type RGB = [number, number, number];

const DEFAULT_COLOR: RGB = [245, 158, 11]; // amber fallback matches --color-accent

function extractVibrantColor(img: HTMLImageElement): RGB {
  const canvas = document.createElement('canvas');
  const size = 64; // small sample for perf
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return DEFAULT_COLOR;

  try {
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0, g = 0, b = 0, totalWeight = 0;

    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const brightness = max / 255;

      // Favour saturated, mid-brightness pixels — skips greys, near-black, near-white
      if (saturation > 0.2 && brightness > 0.15 && brightness < 0.92) {
        const weight = saturation * (1 - Math.abs(brightness - 0.5) * 1.2);
        r += pr * weight;
        g += pg * weight;
        b += pb * weight;
        totalWeight += weight;
      }
    }

    if (totalWeight < 5) return DEFAULT_COLOR; // image is mostly greyscale
    return [
      Math.round(r / totalWeight),
      Math.round(g / totalWeight),
      Math.round(b / totalWeight),
    ];
  } catch {
    // Canvas tainted (CORS) — return fallback
    return DEFAULT_COLOR;
  }
}

export default function useAlbumColor(artUrl: string | null | undefined): RGB {
  const [color, setColor] = useState<RGB>(DEFAULT_COLOR);

  useEffect(() => {
    if (!artUrl) {
      setColor(DEFAULT_COLOR);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setColor(extractVibrantColor(img));
    img.onerror = () => setColor(DEFAULT_COLOR);
    img.src = artUrl;
  }, [artUrl]);

  return color;
}
