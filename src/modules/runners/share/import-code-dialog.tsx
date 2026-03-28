import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { decodeSingleUma } from './encoding';
import { singleExportToRunnerState } from './converters';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';
import { StatImage } from '@/modules/runners/components/StatInput';
import { skillCollection } from '@/modules/data/skills';

type ImportCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string | null;
  mode?: 'slot-picker' | 'direct-import';
  onLoadToSlot?: (slot: 'uma1' | 'uma2', runner: Partial<RunnerState>) => void;
  onDirectImport?: (runner: Partial<RunnerState>) => void;
};

export function ImportCodeDialog({
  open,
  onOpenChange,
  initialCode,
  mode = 'slot-picker',
  onLoadToSlot,
  onDirectImport,
}: ImportCodeDialogProps) {
  const [code, setCode] = useState('');

  useEffect(() => {
    if (open && initialCode) {
      setCode(initialCode);
    }
  }, [open, initialCode]);

  const decoded = useMemo(() => {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const data = decodeSingleUma(trimmed);
    if (!data) return null;
    return singleExportToRunnerState(data);
  }, [code]);

  const umaInfo = useMemo(() => {
    if (!decoded?.outfitId) return null;
    return getUmaDisplayInfo(decoded.outfitId);
  }, [decoded?.outfitId]);

  const imageUrl = useMemo(() => getUmaImageUrl(decoded?.outfitId), [decoded?.outfitId]);

  const skillNames = useMemo(() => {
    if (!decoded?.skills) return [];
    return decoded.skills.map((id) => skillCollection[id]?.name ?? `Unknown (${id})`);
  }, [decoded?.skills]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCode('');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Code</DialogTitle>
          <DialogDescription>Paste a RosterView export code to import a runner.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <textarea
            className="w-full h-24 p-3 rounded-md border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Paste RosterView code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          {code.trim() && !decoded && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
              Invalid code. Please check the code and try again.
            </div>
          )}

          {decoded && (
            <div className="flex flex-col gap-3 p-3 border rounded-md">
              <div className="flex items-center gap-3">
                {decoded.outfitId && <img src={imageUrl} alt="" className="w-12 h-12 rounded" />}
                <div>
                  {umaInfo ? (
                    <>
                      <div className="font-semibold">{umaInfo.name}</div>
                      <div className="text-sm text-muted-foreground">{umaInfo.outfit}</div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Unknown character (ID: {decoded.outfitId})
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 text-center">
                {['Speed', 'Stamina', 'Power', 'Guts', 'Wit'].map((label, i) => (
                  <div
                    key={label}
                    className={`bg-primary text-primary-foreground p-1 text-xs ${
                      i === 0 ? 'rounded-tl' : i === 4 ? 'rounded-tr' : ''
                    }`}
                  >
                    {label}
                  </div>
                ))}
                {(
                  [
                    decoded.speed,
                    decoded.stamina,
                    decoded.power,
                    decoded.guts,
                    decoded.wisdom,
                  ] as Array<number | undefined>
                ).map((val, i) => (
                  <div
                    key={i}
                    className={`border p-1 font-mono flex items-center justify-center gap-1 ${
                      i === 0 ? 'rounded-bl' : i === 4 ? 'rounded-br' : ''
                    }`}
                  >
                    <StatImage value={val ?? 0} className="w-3 h-3" />
                    <span>{val ?? '-'}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 text-sm flex-wrap">
                <span className="text-muted-foreground">Distance:</span>
                <span className="font-medium">{decoded.distanceAptitude}</span>
                <span className="text-muted-foreground ml-2">Surface:</span>
                <span className="font-medium">{decoded.surfaceAptitude}</span>
                <span className="text-muted-foreground ml-2">Strategy:</span>
                <span className="font-medium">{decoded.strategyAptitude}</span>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Skills:</span>{' '}
                <span className="font-medium">{skillNames.length} detected</span>
                {skillNames.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">{skillNames.join(', ')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>

          {mode === 'slot-picker' && decoded && (
            <div className="flex gap-2">
              <Button
                onClick={() => onLoadToSlot?.('uma1', decoded)}
                className="bg-[#2a77c5] hover:bg-[#2a77c5]/90"
              >
                Uma 1
              </Button>
              <Button
                onClick={() => onLoadToSlot?.('uma2', decoded)}
                className="bg-[#c52a2a] hover:bg-[#c52a2a]/90"
              >
                Uma 2
              </Button>
            </div>
          )}

          {mode === 'direct-import' && decoded && (
            <Button onClick={() => onDirectImport?.(decoded)}>Import</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
