import { useEffect } from 'react';

export const useClickOutside = (
  element: HTMLElement,
  callback: (event: MouseEvent) => void,
  dependencies: unknown[] = [],
) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (element && !element.contains(event.target as Node)) {
        callback(event);
      }
    };

    element.addEventListener('click', handleClickOutside);

    return () => {
      element.removeEventListener('click', handleClickOutside);
    };
  }, dependencies);
};
