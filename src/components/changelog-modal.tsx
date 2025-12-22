import type { ChangelogEntry } from '@/data/changelog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setShowChangelogModal, useUIStore } from '@/store/ui.store';
import { changelog } from '@/data/changelog';
import { cn } from '@/lib/utils';

const changeTypeBadge: Record<
  ChangelogEntry['changes'][number]['type'],
  { label: string; className: string }
> = {
  added: {
    label: 'Added',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  changed: {
    label: 'Changed',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  fixed: {
    label: 'Fixed',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  },
  removed: {
    label: 'Removed',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400',
  },
};

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

                {/* Changes grouped by type */}
                <div className="space-y-3">
                  {entry.changes.map((changeGroup) => (
                    <div key={changeGroup.type}>
                      <span
                        className={cn(
                          'inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1.5',
                          changeTypeBadge[changeGroup.type].className,
                        )}
                      >
                        {changeTypeBadge[changeGroup.type].label}
                      </span>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {changeGroup.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex gap-2">
                            <span className="text-muted-foreground/50">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

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
