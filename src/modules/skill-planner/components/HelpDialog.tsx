import { HelpCircleIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'skill-planner-help-dismissed';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircleIcon className="w-5 h-5" />
            How to Use Skill Planner
          </DialogTitle>
          <DialogDescription>
            Optimize your skill purchases to maximize Bashin gains
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Overview */}
          <div>
            <h3 className="font-semibold mb-2">What is this?</h3>
            <p className="text-muted-foreground">
              After completing a career, you receive skill hints that discount specific skills. The
              Skill Planner finds the best combination of skills to buy within your budget by
              running full race simulations to maximize your Bashin (distance) gains.
            </p>
          </div>

          {/* Step-by-step guide */}
          <div>
            <h3 className="font-semibold mb-2">Quick Start Guide</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Add candidate skills</strong> - Click "Add
                Skill" and select skills from your career shop
              </li>
              <li>
                <strong className="text-foreground">Set hint levels</strong> - For each skill,
                select the discount level shown in-game (0-5)
              </li>
              <li>
                <strong className="text-foreground">Mark obtained skills</strong> - Check "Already
                Obtained" for free skills you've already unlocked
              </li>
              <li>
                <strong className="text-foreground">Set your budget</strong> - Enter available skill
                points
              </li>
              <li>
                <strong className="text-foreground">Enable Fast Learner</strong> - If you have this
                rare condition (reduces all costs by 10%)
              </li>
              <li>
                <strong className="text-foreground">Click "Optimize"</strong> - Wait 30s-2min for
                results
              </li>
              <li>
                <strong className="text-foreground">Apply to Runner</strong> - Add recommended
                skills to test in Umalator
              </li>
            </ol>
          </div>

          {/* Hint Levels */}
          <div>
            <h3 className="font-semibold mb-2">Understanding Hint Levels</h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Hint Lvl 0 (No hint)</span>
                <span className="font-medium">0% off</span>
              </div>
              <div className="flex justify-between">
                <span>Hint Lvl 1</span>
                <span className="font-medium text-blue-600">10% off</span>
              </div>
              <div className="flex justify-between">
                <span>Hint Lvl 2</span>
                <span className="font-medium text-blue-600">20% off</span>
              </div>
              <div className="flex justify-between">
                <span>Hint Lvl 3</span>
                <span className="font-medium text-green-600">30% off</span>
              </div>
              <div className="flex justify-between">
                <span>Hint Lvl 4</span>
                <span className="font-medium text-green-600">35% off</span>
              </div>
              <div className="flex justify-between">
                <span>Hint Lvl 5 (Max)</span>
                <span className="font-medium text-green-600">40% off</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="font-semibold mb-2">Tips for Best Results</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Limit candidates to 10-15 most promising skills for faster optimization</li>
              <li>
                Mark skills you already have as "Already Obtained" - they're free but included in
                sims
              </li>
              <li>Some skills can be bought twice - check "Can buy twice" for stackable skills</li>
              <li>The optimizer accounts for skill synergies through full race simulations</li>
            </ul>
          </div>

          {/* What happens during optimization */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <h3 className="font-semibold mb-2 text-blue-600">What Happens During Optimization?</h3>
            <p className="text-muted-foreground text-xs">
              The planner tests hundreds of valid skill combinations within your budget, running
              25-sample simulations for each. The best combination then gets a final 200-sample
              simulation for accuracy. Progress is shown in real-time.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={handleClose}>Got it!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage help dialog visibility
export function useHelpDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the help dialog before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Show help dialog on first visit
      setOpen(true);
    }
  }, []);

  return { open, setOpen };
}

// Utility to reset help dialog (for testing or user preference reset)
export function resetHelpDialog() {
  localStorage.removeItem(STORAGE_KEY);
}
