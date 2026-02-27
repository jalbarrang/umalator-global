import type { ChangelogEntry } from '@/data/changelog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setShowChangelogModal, useUIStore } from '@/store/ui.store';
import { changelog } from '@/data/changelog';

export function ChangelogModal() {
  const { showChangelogModal } = useUIStore();

  return (
    <Dialog open={showChangelogModal} onOpenChange={setShowChangelogModal}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Changelog</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-2 -mr-2">
          <div className="space-y-6">
            {changelog.map((entry, idx) => (
              <article key={entry.version} className="relative">
                {/* Version header */}
                <header className="flex items-baseline gap-3 mb-3">
                  <h3 className="font-semibold text-base">v{entry.version}</h3>
                  <time className="text-sm text-muted-foreground">{entry.date}</time>
                  {idx === 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                      Latest
                    </span>
                  )}
                </header>

                <ul className="space-y-1 text-sm text-muted-foreground">
                  {entry.changes.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex gap-2">
                      <span className="text-muted-foreground/50">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Separator between entries */}
                {idx < changelog.length - 1 && <div className="mt-5 border-t border-border/50" />}
              </article>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
