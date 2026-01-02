import { Construction } from 'lucide-react';
import { Card } from './ui/card';

/**
 * Work-in-progress placeholder component
 * Displays a friendly message when a feature is under development
 */
export function WorkInProgress() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="p-8 max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Construction className="h-16 w-16 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Under Development</h2>
        <p className="text-muted-foreground">
          This feature is currently under development and will be available soon.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Check back later for updates!
        </p>
      </Card>
    </div>
  );
}

