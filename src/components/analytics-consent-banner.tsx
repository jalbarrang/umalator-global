import posthog from 'posthog-js';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { config } from '@/config';
import {
  setAnalyticsConsent,
  useAnalyticsConsentStore
} from '@/store/analytics-consent.store';

export function AnalyticsConsentBanner() {
  const consent = useAnalyticsConsentStore((state) => state.consent);

  // Nothing to consent to when analytics isn't configured.
  if (!config.posthog.key || consent !== null) {
    return null;
  }

  const accept = () => {
    setAnalyticsConsent('granted');
    posthog.opt_in_capturing();
  };

  const decline = () => {
    setAnalyticsConsent('denied');
    posthog.opt_out_capturing();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-lg border bg-card p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use privacy-friendly analytics to improve Torena Sim. Nothing is collected until you
          accept.{' '}
          <Link to="/privacy" className="text-primary hover:underline">
            Learn more
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
