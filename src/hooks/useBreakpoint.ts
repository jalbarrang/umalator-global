import { useEffect, useState } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Breakpoints in pixels from the tailwind config
 */
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Custom hook to determine the current breakpoint of the window
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm');

  useEffect(() => {
    const handleResize = () => {
      const currentBreakpoint = Object.keys(breakpoints).find(
        (key) => window.innerWidth < breakpoints[key as Breakpoint],
      ) as Breakpoint;

      if (currentBreakpoint) {
        setBreakpoint(currentBreakpoint);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { breakpoint, isMobile: breakpoint === 'sm' };
};

export const useIsMobile = () => {
  // Get user agent
  const userAgent = navigator.userAgent;

  return userAgent.includes('Mobile');
};
