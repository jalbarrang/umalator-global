import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useStaminaCalculatorStore } from '../store/stamina-calculator.store';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ResultsPanel() {
  const { result, isCalculating, error } = useStaminaCalculatorStore();

  if (isCalculating) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Calculating...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Configure your uma and click Calculate to see results</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col border rounded-xl p-4 bg-card gap-4">
      <div className="text-lg font-semibold">Results</div>

      {/* Main Status */}
      <div
        className={cn(
          'mb-6 p-4 rounded-lg text-center font-semibold text-lg',
          result.canMaxSpurt
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-2 border-green-500/30'
            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-2 border-red-500/30',
        )}
      >
        {result.canMaxSpurt ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            <span>You have enough stamina to max spurt!</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <XCircle className="w-6 h-6" />
            <span>Need +{result.staminaDeficit} stamina</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Left Column */}
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Current Stamina
            </div>
            <div className="font-mono text-lg font-semibold">
              {result.input.stamina}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Required Stamina
            </div>
            <div
              className={cn(
                'font-mono text-lg font-semibold',
                result.requiredStamina > result.input.stamina
                  ? 'text-red-500'
                  : 'text-green-500',
              )}
            >
              {result.requiredStamina}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Max HP</div>
            <div className="font-mono text-lg">{result.maxHp.toFixed(0)}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">HP Needed</div>
            <div className="font-mono text-lg">
              {result.totalHpNeeded.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {result.totalRecovery > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                HP Recovered
              </div>
              <div className="font-mono text-lg text-green-500">
                +{result.totalRecovery.toFixed(0)}
              </div>
            </div>
          )}

          {result.totalDrain > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                HP Lost (Debuffs)
              </div>
              <div className="font-mono text-lg text-red-500">
                -{result.totalDrain.toFixed(0)}
              </div>
            </div>
          )}

          {result.netHpEffect !== 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Net HP Effect
              </div>
              <div
                className={cn(
                  'font-mono text-lg',
                  result.netHpEffect > 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                {result.netHpEffect > 0 ? '+' : ''}
                {result.netHpEffect.toFixed(0)}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-muted-foreground mb-1">
              HP Remaining
            </div>
            <div
              className={cn(
                'font-mono text-lg',
                result.hpRemaining >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {result.hpRemaining >= 0 ? '+' : ''}
              {result.hpRemaining.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Skill Proc Rate
          </div>
          <div className="font-mono text-sm">
            {(result.skillProcRate * 100).toFixed(2)}%
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Rushing Rate</div>
          <div className="font-mono text-sm">
            {(result.rushingRate * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Speed Info */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Max Spurt Speed
          </div>
          <div className="font-mono text-sm">
            {result.maxSpurtSpeed.toFixed(3)} m/s
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Base Target Speed (Phase 2)
          </div>
          <div className="font-mono text-sm">
            {result.baseTargetSpeed2.toFixed(3)} m/s
          </div>
        </div>
      </div>
    </div>
  );
}
