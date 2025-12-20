import { useStaminaCalculatorStore } from '../store/stamina-calculator.store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function PhaseTable() {
  const { result } = useStaminaCalculatorStore();

  if (!result || !result.phases || result.phases.length === 0) {
    return null;
  }

  const totalDistance = result.phases.reduce(
    (sum, phase) => sum + phase.distanceMeters,
    0,
  );
  const totalTime = result.phases.reduce(
    (sum, phase) => sum + phase.timeSeconds,
    0,
  );
  const totalHp = result.phases.reduce(
    (sum, phase) => sum + phase.hpConsumption,
    0,
  );

  return (
    <div className="flex flex-col border rounded-xl p-4 bg-card gap-4">
      <div className="text-lg font-semibold">Phase Breakdown</div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phase</TableHead>
              <TableHead className="text-right">Start Speed (m/s)</TableHead>
              <TableHead className="text-right">Goal Speed (m/s)</TableHead>
              <TableHead className="text-right">Acceleration (m/s²)</TableHead>
              <TableHead className="text-right">Time (s)</TableHead>
              <TableHead className="text-right">Distance (m)</TableHead>
              <TableHead className="text-right">HP Consumption</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.phases.map((phase, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{phase.phaseName}</TableCell>
                <TableCell className="text-right font-mono">
                  {phase.startSpeed.toFixed(3)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {phase.goalSpeed.toFixed(3)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {phase.acceleration === 0
                    ? '-'
                    : phase.acceleration.toFixed(3)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {phase.timeSeconds.toFixed(3)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {phase.distanceMeters.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {phase.hpConsumption.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right font-mono">
                {totalTime.toFixed(3)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {totalDistance.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {totalHp.toFixed(2)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
