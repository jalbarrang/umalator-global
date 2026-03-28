import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

export function useRoosterImport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [importCode, setImportCode] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const code = searchParams.get('rooster');
    if (code) {
      setImportCode(code);
      setDialogOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('rooster');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return {
    importCode,
    dialogOpen,
    setDialogOpen,
    clearImportCode: () => setImportCode(null),
  };
}
