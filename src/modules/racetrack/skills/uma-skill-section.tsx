import { useRaceTrack } from '../context/RaceTrackContext';
import { UmaSkillRow } from './uma-skill-row';
import React from 'react';

type UmaSkillSectionProps = {
  readonly yOffset: number;
};

export const UmaSkillSection = React.memo<UmaSkillSectionProps>(({ yOffset }) => {
  const { course, showUma1, showUma2, handleDragStart } = useRaceTrack();

  return (
    <>
      <UmaSkillRow
        course={course}
        umaIndex={0}
        label="Uma 1"
        yOffset={yOffset}
        visible={showUma1}
        onDragStart={handleDragStart}
      />

      <UmaSkillRow
        course={course}
        umaIndex={1}
        label="Uma 2"
        yOffset={yOffset}
        visible={showUma2}
        onDragStart={handleDragStart}
      />
    </>
  );
});
