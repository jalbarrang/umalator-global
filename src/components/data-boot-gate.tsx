import { useEffect, useState, type ReactNode } from 'react';
import { bootstrapData } from '@/modules/data/bootstrap';
import { BootSplash } from '@/components/boot-splash';

type BootStatus = { state: 'loading' } | { state: 'ready' } | { state: 'error'; message: string };

type DataBootGateProps = {
  children: ReactNode;
};

/**
 * Gates the data-dependent app behind the one-time data bootstrap. Mounts inside
 * the providers (theme / router / analytics + error boundary), shows the splash
 * while the manifest-driven datasets load, then renders the app once the service
 * singletons are populated. `children` (the routes) only render after the data is
 * ready, so every synchronous `*Service` read downstream is safe.
 */
export function DataBootGate(props: DataBootGateProps) {
  const { children } = props;
  const [status, setStatus] = useState<BootStatus>({ state: 'loading' });

  useEffect(() => {
    let active = true;

    // `bootstrapData()` is memoized — fetches the manifest + datasets once and
    // populates the service singletons.
    bootstrapData()
      .then(() => {
        if (active) setStatus({ state: 'ready' });
      })
      .catch((error: unknown) => {
        console.error('Data bootstrap failed:', error);
        if (active) {
          setStatus({
            state: 'error',
            message: error instanceof Error ? error.message : 'bootstrap failed'
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (status.state === 'loading') {
    return <BootSplash />;
  }

  if (status.state === 'error') {
    return <BootSplash error={status.message} />;
  }

  return <>{children}</>;
}
