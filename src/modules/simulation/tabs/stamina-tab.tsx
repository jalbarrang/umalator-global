import { useState } from 'react';
import { useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useRaceStore } from '@/store/race/store';
import { getCourseById } from '@/modules/racetrack/courses';
import {
  useStaminaAnalysis,
  useActualRecoverySkills,
  useTheoreticalRecoverySkills,
  useActualDebuffsReceived,
  useTheoreticalDebuffsReceived,
  useActualPhaseHp,
  useTheoreticalPhaseHp,
} from './stamina/hooks';
import { StaminaCard } from './stamina/components';

export const StaminaTab = () => {
  const { uma1, uma2 } = useRunnersStore();
  const { courseId, racedef } = useSettingsStore();
  const { chartData } = useRaceStore();
  const course = getCourseById(courseId);

  const hasSimulationData = !!chartData;

  // Mode state for each card (default to actual if simulation data exists)
  const [uma1Theoretical, setUma1Theoretical] = useState(false);
  const [uma2Theoretical, setUma2Theoretical] = useState(false);

  // Calculate stamina analysis for both runners
  const analysis1 = useStaminaAnalysis(uma1, courseId, racedef.ground);
  const analysis2 = useStaminaAnalysis(uma2, courseId, racedef.ground);

  // Get recovery skills - actual or theoretical based on mode
  const actualRecoverySkills1 = useActualRecoverySkills(
    chartData?.sk?.[0],
    analysis1.maxHp,
  );
  const actualRecoverySkills2 = useActualRecoverySkills(
    chartData?.sk?.[1],
    analysis2.maxHp,
  );
  const theoreticalRecoverySkills1 = useTheoreticalRecoverySkills(
    uma1,
    analysis1.maxHp,
    course.distance,
  );
  const theoreticalRecoverySkills2 = useTheoreticalRecoverySkills(
    uma2,
    analysis2.maxHp,
    course.distance,
  );

  // Get debuffs received - actual from simulation or theoretical from opponent's skills
  const actualDebuffsReceived1 = useActualDebuffsReceived(
    chartData?.debuffsReceived?.[0],
    analysis1.maxHp,
  );
  const actualDebuffsReceived2 = useActualDebuffsReceived(
    chartData?.debuffsReceived?.[1],
    analysis2.maxHp,
  );
  // Theoretical debuffs: uma1 could receive debuffs from uma2, and vice versa
  const theoreticalDebuffsReceived1 = useTheoreticalDebuffsReceived(
    uma2, // uma1 receives debuffs from uma2
    analysis1.maxHp,
    course.distance,
  );
  const theoreticalDebuffsReceived2 = useTheoreticalDebuffsReceived(
    uma1, // uma2 receives debuffs from uma1
    analysis2.maxHp,
    course.distance,
  );

  // Get phase HP - actual or theoretical based on mode
  const actualPhaseHp1 = useActualPhaseHp(
    chartData?.p?.[0],
    chartData?.hp?.[0],
    analysis1.phases,
    analysis1.maxHp,
  );
  const actualPhaseHp2 = useActualPhaseHp(
    chartData?.p?.[1],
    chartData?.hp?.[1],
    analysis2.phases,
    analysis2.maxHp,
  );

  // Determine which data to show based on mode
  const isUma1Theoretical = !hasSimulationData || uma1Theoretical;
  const isUma2Theoretical = !hasSimulationData || uma2Theoretical;

  const recoverySkills1 = isUma1Theoretical
    ? theoreticalRecoverySkills1
    : actualRecoverySkills1;
  const recoverySkills2 = isUma2Theoretical
    ? theoreticalRecoverySkills2
    : actualRecoverySkills2;

  const debuffsReceived1 = isUma1Theoretical
    ? theoreticalDebuffsReceived1
    : actualDebuffsReceived1;
  const debuffsReceived2 = isUma2Theoretical
    ? theoreticalDebuffsReceived2
    : actualDebuffsReceived2;

  const theoreticalPhaseHp1 = useTheoreticalPhaseHp(
    analysis1,
    recoverySkills1,
    debuffsReceived1,
  );
  const theoreticalPhaseHp2 = useTheoreticalPhaseHp(
    analysis2,
    recoverySkills2,
    debuffsReceived2,
  );

  const phaseHp1 = isUma1Theoretical
    ? theoreticalPhaseHp1
    : (actualPhaseHp1 ?? theoreticalPhaseHp1);
  const phaseHp2 = isUma2Theoretical
    ? theoreticalPhaseHp2
    : (actualPhaseHp2 ?? theoreticalPhaseHp2);

  return (
    <div className="space-y-4">
      {/* Course Info */}
      <div className="bg-background border-2 rounded-lg p-3 text-center">
        <span className="text-sm text-muted-foreground">
          Analyzing stamina for {course.distance}m course
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaminaCard
          runner={uma1}
          analysis={analysis1}
          label="Uma 1"
          color="text-[#2a77c5] dark:text-blue-500"
          recoverySkills={recoverySkills1}
          debuffsReceived={debuffsReceived1}
          phaseHp={phaseHp1}
          isTheoretical={isUma1Theoretical}
          hasSimulationData={hasSimulationData}
          onModeToggle={() => setUma1Theoretical(!uma1Theoretical)}
        />
        <StaminaCard
          runner={uma2}
          analysis={analysis2}
          label="Uma 2"
          color="text-[#c52a2a] dark:text-red-500"
          recoverySkills={recoverySkills2}
          debuffsReceived={debuffsReceived2}
          phaseHp={phaseHp2}
          isTheoretical={isUma2Theoretical}
          hasSimulationData={hasSimulationData}
          onModeToggle={() => setUma2Theoretical(!uma2Theoretical)}
        />
      </div>
    </div>
  );
};
