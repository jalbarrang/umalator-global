import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

const getIsMobile = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < MOBILE_BREAKPOINT;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile);

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(getIsMobile());
    };

    if (typeof window.matchMedia !== 'function') {
      onChange();
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener('change', onChange);
    onChange();

    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
