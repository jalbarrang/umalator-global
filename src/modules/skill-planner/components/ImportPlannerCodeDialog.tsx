import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { decodeSkillPlanner } from '../share/encoding';
import { exportDataToImport } from '../share/converters';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';
import { skillsService } from '@/modules/data/services/SkillService';

type ImportPlannerCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ReturnType<typeof exportDataToImport>) => void;
};

export function ImportPlannerCodeDialog(props: Readonly<ImportPlannerCodeDialogProps>) {
  const { open, onOpenChange, onImport } = props;
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!open) {
      setCode('');
    }
  }, [open]);

  const imported = useMemo(() => {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const decoded = decodeSkillPlanner(trimmed);
    if (!decoded) return null;
    return exportDataToImport(decoded);
  }, [code]);

  const umaInfo = useMemo(() => {
    if (!imported?.runner.outfitId) return null;
    return getUmaDisplayInfo(imported.runner.outfitId);
  }, [imported?.runner.outfitId]);

  const imageUrl = useMemo(
    () => getUmaImageUrl(imported?.runner.outfitId),
    [imported?.runner.outfitId]
  );

  const obtainedSkillNames = useMemo(() => {
    if (!imported) return [];
    return imported.obtainedSkillIds.map(
      (id) => skillsService.getById(id)?.name ?? `Unknown (${id})`
    );
  }, [imported]);

  const candidateSkillNames = useMemo(() => {
    if (!imported) return [];
    return imported.candidates.map((c) => {
      const name = skillsService.getById(c.skillId)?.name ?? `Unknown (${c.skillId})`;
      return c.hintLevel > 0 ? `${name} (Hint ${c.hintLevel})` : name;
    });
  }, [imported]);

  const handleImport = () => {
    if (!imported) return;
    onImport(imported);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Code</DialogTitle>
          <DialogDescription>
            Paste a Skill Planner export code to load a full session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <textarea
            className="w-full h-24 p-3 rounded-md border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Paste planner code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />

          <details className="group text-sm">
            <summary className="flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground">
              <ChevronDownIcon className="size-3.5 transition-transform group-open:rotate-180" />
              What is this code?
            </summary>
            <div className="mt-2 rounded-md border bg-muted/50 p-3 text-muted-foreground text-xs leading-relaxed">
              <p>
                A compact Base64 string that encodes a full Skill Planner session: runner stats,
                aptitudes, obtained skills, shop candidates with hint levels, budget, and Fast
                Learner. External career trackers can produce this code so you can skip manual entry
                and jump straight to optimization.
              </p>
              <a
                href="https://github.com/jalbarrang/umalator-global/blob/main/src/modules/skill-planner/share/ENCODING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-primary hover:underline"
              >
                Read the encoding specification →
              </a>
            </div>
          </details>

          {code.trim() && !imported && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
              Invalid code. Please check the code and try again.
            </div>
          )}

          {imported && (
            <div className="flex flex-col gap-3 p-3 border rounded-md">
              <div className="flex items-center gap-3">
                {imported.runner.outfitId && (
                  <img src={imageUrl} alt="" className="size-12 rounded" />
                )}
                <div>
                  {umaInfo ? (
                    <>
                      <div className="font-semibold">{umaInfo.name}</div>
                      <div className="text-sm text-muted-foreground">{umaInfo.outfit}</div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Unknown character (ID: {imported.runner.outfitId})
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                {['Spd', 'Sta', 'Pow', 'Guts', 'Wiz'].map((label) => (
                  <div key={label} className="bg-muted p-1 font-medium">
                    {label}
                  </div>
                ))}
                {[
                  imported.runner.speed,
                  imported.runner.stamina,
                  imported.runner.power,
                  imported.runner.guts,
                  imported.runner.wisdom
                ].map((val, i) => (
                  <div key={i} className="border p-1 font-mono">
                    {val ?? '-'}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="text-muted-foreground">Strategy:</span>{' '}
                  {imported.runner.strategy}
                </span>
                <span>
                  <span className="text-muted-foreground">Budget:</span> {imported.budget} SP
                </span>
                {imported.hasFastLearner && (
                  <span className="text-muted-foreground">Fast Learner ✓</span>
                )}
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Obtained:</span>{' '}
                <span className="font-medium">{obtainedSkillNames.length} skills</span>
                {obtainedSkillNames.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {obtainedSkillNames.join(', ')}
                  </div>
                )}
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Candidates:</span>{' '}
                <span className="font-medium">{candidateSkillNames.length} skills</span>
                {candidateSkillNames.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {candidateSkillNames.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!imported}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
