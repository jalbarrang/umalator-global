import { useEffect, useState } from 'react';

/** True once the viewport is wide enough for the dense table; below this we render stacked cards. */
export function useWideViewport() {
  const [isWide, setIsWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsWide(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isWide;
}
