import { useState, useEffect, useCallback, RefObject } from 'react';
import { debounce } from 'es-toolkit';

export interface ContainerSize {
  width: number;
  height: number;
}

export function useContainerSize(
  ref: RefObject<HTMLElement>,
  options?: {
    minWidth?: number;
    maxWidth?: number;
    debounceMs?: number;
  },
): ContainerSize {
  const { minWidth = 400, maxWidth = 1200, debounceMs = 100 } = options ?? {};

  const [size, setSize] = useState<ContainerSize>({ width: 960, height: 240 });

  const updateSize = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, rect.width));

      setSize({
        width: clampedWidth,
        height: rect.height ?? 240,
      });
    }
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver(debounce(updateSize, debounceMs));

    resizeObserver.observe(ref.current);
    updateSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return size;
}
