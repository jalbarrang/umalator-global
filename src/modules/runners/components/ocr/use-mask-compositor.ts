import { useCallback, useEffect, useState } from 'react';
import type { CanvasTransform, OcrMaskType } from '@/modules/runners/components/ocr/types';

type CachedMask = {
  image: HTMLImageElement;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

const MASK_PATHS: Record<OcrMaskType, string> = {
  'full-details': '/masks/mask-full-details.png',
  'skills-only': '/masks/mask-skills-only.png',
};

const maskCache = new Map<OcrMaskType, Promise<CachedMask>>();

async function loadMask(maskType: OcrMaskType): Promise<CachedMask> {
  const cachedMask = maskCache.get(maskType);
  if (cachedMask) {
    return cachedMask;
  }

  const maskPromise = new Promise<CachedMask>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;

      if (!width || !height) {
        reject(new Error(`Mask image has invalid dimensions: ${MASK_PATHS[maskType]}`));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not create canvas context for mask loading'));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;

      resolve({
        image,
        width,
        height,
        pixels,
      });
    };

    image.onerror = () => {
      reject(new Error(`Failed to load mask image: ${MASK_PATHS[maskType]}`));
    };

    image.src = MASK_PATHS[maskType];
  });

  maskCache.set(maskType, maskPromise);

  try {
    return await maskPromise;
  } catch (error) {
    maskCache.delete(maskType);
    throw error;
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export composed image as PNG blob'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

export function useMaskCompositor(maskType: OcrMaskType) {
  const [maskImage, setMaskImage] = useState<HTMLImageElement | null>(null);
  const [maskWidth, setMaskWidth] = useState(0);
  const [maskHeight, setMaskHeight] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void loadMask(maskType)
      .then((mask) => {
        if (!isMounted) {
          return;
        }

        setMaskImage(mask.image);
        setMaskWidth(mask.width);
        setMaskHeight(mask.height);
      })
      .catch((error: unknown) => {
        console.error('Failed to load OCR mask:', error);
        if (!isMounted) {
          return;
        }

        setMaskImage(null);
        setMaskWidth(0);
        setMaskHeight(0);
      });

    return () => {
      isMounted = false;
    };
  }, [maskType]);

  const composeMaskedImage = useCallback(
    async (sourceImage: HTMLImageElement, transform: CanvasTransform): Promise<Blob> => {
      const mask = await loadMask(maskType);

      const canvas = document.createElement('canvas');
      canvas.width = mask.width;
      canvas.height = mask.height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not create canvas context for OCR mask composition');
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, mask.width, mask.height);

      const sourceWidth = sourceImage.naturalWidth * transform.scale;
      const sourceHeight = sourceImage.naturalHeight * transform.scale;

      context.drawImage(sourceImage, transform.x, transform.y, sourceWidth, sourceHeight);

      const composedImageData = context.getImageData(0, 0, mask.width, mask.height);
      const composedPixels = composedImageData.data;

      for (let i = 0; i < mask.pixels.length; i += 4) {
        if ((mask.pixels[i + 3] ?? 0) > 128) {
          composedPixels[i] = 255;
          composedPixels[i + 1] = 255;
          composedPixels[i + 2] = 255;
        }
      }

      context.putImageData(composedImageData, 0, 0);

      return canvasToBlob(canvas);
    },
    [maskType],
  );

  return {
    maskImage,
    maskWidth,
    maskHeight,
    composeMaskedImage,
  };
}
