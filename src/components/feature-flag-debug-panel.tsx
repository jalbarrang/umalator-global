import { useState } from 'react';
import { FlagIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { getAllFeatureFlags } from '@/lib/feature-flags';

/**
 * Development panel to display all feature flags and their states
 * This component demonstrates the feature flag system
 */
export function FeatureFlagDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const flags = getAllFeatureFlags();

  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  if (Object.keys(flags).length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="p-4 w-80 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlagIcon className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Feature Flags</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              ✕
            </Button>
          </div>

          <div className="space-y-2">
            {Object.entries(flags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">{key}</span>
                <Badge variant={value ? 'default' : 'secondary'}>
                  {value ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)} className="shadow-lg">
          <FlagIcon className="h-4 w-4 mr-2" />
          Feature Flags
        </Button>
      )}
    </div>
  );
}
