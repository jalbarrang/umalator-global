import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

export function useRoosterImport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoosterCodeRef = useRef(searchParams.get('rooster'));
  const [importCode, setImportCode] = useState<string | null>(() => initialRoosterCodeRef.current);
  const [dialogOpen, setDialogOpen] = useState(() => initialRoosterCodeRef.current != null);

  useEffect(() => {
    const roosterCode = initialRoosterCodeRef.current;
    if (!roosterCode) {
      return;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('rooster');
    setSearchParams(newParams, { replace: true });
    initialRoosterCodeRef.current = null;
  }, [searchParams, setSearchParams]);

  return {
    importCode,
    dialogOpen,
    setDialogOpen,
    clearImportCode: () => setImportCode(null)
  };
}
