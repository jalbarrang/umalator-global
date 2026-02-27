import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setShowCreditsModal, useUIStore } from '@/store/ui.store';

export function CreditsModal() {
  const { showCreditsModal } = useUIStore();

  return (
    <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Acknowledgements</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            This project is inspired by and built on the work of the Uma simulation community.
          </p>

          <p className="font-medium">Special thanks to:</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">alpha123</span> for the original simulator
              and UI foundations (
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
              <span className="font-medium text-foreground">Kachi</span> for extensive fixes, systems
              rework, and simulator enhancements made in VFalator.
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
      </DialogContent>
    </Dialog>
  );
}
