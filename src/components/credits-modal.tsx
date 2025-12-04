import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { setShowCreditsModal, useUIStore } from '@/store/ui.store';

export function CreditsModal() {
  const { showCreditsModal } = useUIStore();

  return (
    <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Credits</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="font-semibold text-base mb-2">Current Developer</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Albhax</span>- New
                UI design, post simulation Stamina calculator.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">
              Enhanced Features By
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">
                  Transparent Dino
                </span>{' '}
                — Enhanced Spurt calculator, Virtual Pacemaker, Downhills,
                Rushed
              </li>
              <li>
                <span className="font-medium text-foreground">
                  jechtoff2dudes
                </span>{' '}
                — Frontrunner Overtake/Speedup mode, Dragging Skill Markers,
                Downhills, Skill Activation check
              </li>
              <li>
                <span className="font-medium text-foreground">Kachi</span> — Bug
                fixes, UI improvements, mood, UI responsiveness, poskeep
                rewrite, RNG rework, uniques chart, spot struggle/dueling, lane
                movement
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">Original Umalator</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">alpha123</span> —{' '}
                <a
                  href="https://github.com/alpha123/uma-skill-tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  simulator
                </a>
                ,{' '}
                <a
                  href="https://github.com/alpha123/uma-tools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  UI
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">
              Race Mechanics Documentation
            </h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">KuromiAK</span> —
                Author
              </li>
              <li>
                <a
                  href="https://twitter.com/umamusu_reveng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @umamusu_reveng
                </a>
                ,{' '}
                <a
                  href="https://twitter.com/kak_eng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @kak_eng
                </a>
                ,{' '}
                <a
                  href="https://twitter.com/hoffe_33"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  @hoffe_33
                </a>{' '}
                — Reverse engineering
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
