import type { CellContext } from '@tanstack/react-table';
import type { SkillComparisonRoundResult } from '@/modules/simulation/types';
import React from 'react';

export const formatBasinn = React.memo(
  (props: CellContext<SkillComparisonRoundResult, unknown>) => {
    const value = props.getValue() as number;

    return value.toFixed(2).replace('-0.00', '0.00') + ' L';
  }
);
