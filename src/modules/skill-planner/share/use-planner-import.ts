import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { decodeSkillPlanner } from './encoding';
import { exportDataToImport } from './converters';
import { importFromCode } from '../skill-planner.store';

const PLANNER_PARAM = 'planner';

/**
 * Deep-link import for the Skill Planner.
 *
 * Reads a planner export code from the `?planner=` query param on load,
 * hydrates a full planner session, then strips the param so the code
 * isn't re-applied on navigation or shared accidentally.
 *
 * Example: `/skill-planner?planner=<encodedValue>`
 */
export function usePlannerImport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const importedRef = useRef(false);

  useEffect(() => {
    if (importedRef.current) {
      return;
    }

    const code = searchParams.get(PLANNER_PARAM);
    if (!code) {
      return;
    }

    importedRef.current = true;

    const decoded = decodeSkillPlanner(code.trim());
    if (decoded) {
      importFromCode(exportDataToImport(decoded));
      toast.success('Skill Planner session loaded from link');
    } else {
      toast.error('Invalid Skill Planner link');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(PLANNER_PARAM);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);
}
