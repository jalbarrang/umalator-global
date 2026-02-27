import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setShowCreditsModal, useUIStore } from '@/store/ui.store';
import { Separator } from './ui/separator';

export function CreditsModal() {
  const { showCreditsModal } = useUIStore();

  return (
    <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
      <DialogContent className="max-w-lg!">
        <DialogHeader>
          <DialogTitle>Acknowledgements</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Sunday's Shadow</span> - Built by{' '}
            <span className="font-medium text-foreground">Albhax</span> (@albhax on discord)
          </p>

          <Separator />

          <p className="text-muted-foreground">
            This project is inspired by and built on the work of the Uma musume community.
          </p>

          <p className="font-medium">Special thanks to:</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">alpha123</span> for the original
              simulator and UI foundations (
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
              ).
            </li>
            <li>
              <span className="font-medium text-foreground">Transparent Dino</span>,{' '}
              <span className="font-medium text-foreground">jechtoff2dudes</span>, and{' '}
              <span className="font-medium text-foreground">Kachi</span> for extensive fixes,
              systems rework, and simulator enhancements made in{' '}
              <span className="font-medium text-foreground">VFalator</span>.
            </li>
            <li>
              <a
                href="https://gametora.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Gametora
              </a>{' '}
              for all the data used in this project.
            </li>
          </ul>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium">Copyright and Fair Use Notice</div>

          <p className="text-xs text-muted-foreground">
            Uma Musume: Pretty Derby, its characters, names, artwork, game assets, and related
            trademarks are the property of{' '}
            <span className="font-medium text-foreground">Cygames, Inc.</span> and their respective
            rights holders.
          </p>

          <p className="text-xs text-muted-foreground">
            This project is an independent, fan-made simulation and analysis tool. It is not
            affiliated with, endorsed by, or sponsored by{' '}
            <span className="font-medium text-foreground">Cygames, Inc.</span>.
          </p>

          <p className="text-xs text-muted-foreground">
            Any referenced game data, terminology, or limited derivative material is used for
            commentary, research, education, and interoperability purposes. This repository is
            intended to fall under applicable{' '}
            <span className="font-medium text-foreground">fair use</span> principles and equivalent
            exceptions under relevant copyright laws.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
