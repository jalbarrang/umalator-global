import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setShowChangelogModal, useUIStore } from '@/store/ui.store';
import { changelog } from '@/data/changelog';

type InlineMarkdownProps = {
  text: string;
};

const INLINE_MARKDOWN_PATTERN = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;

type InlineMarkdownToken = {
  key: string;
  value: string;
};

function tokenizeInlineMarkdown(text: string): InlineMarkdownToken[] {
  const tokens: InlineMarkdownToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_MARKDOWN_PATTERN)) {
    const start = match.index ?? cursor;
    if (start > cursor) {
      tokens.push({ key: `text-${cursor}`, value: text.slice(cursor, start) });
    }

    tokens.push({ key: `token-${start}`, value: match[0] });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    tokens.push({ key: `text-${cursor}`, value: text.slice(cursor) });
  }

  return tokens;
}

function InlineMarkdown(props: InlineMarkdownProps) {
  const { text } = props;
  const tokens = tokenizeInlineMarkdown(text);

  return (
    <>
      {tokens.map((token) => {
        const part = token.value;
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <a
              key={token.key}
              href={linkMatch[2]}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {linkMatch[1]}
            </a>
          );
        }

        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={token.key} className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
              {part.slice(1, -1)}
            </code>
          );
        }

        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={token.key} className="font-medium text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }

        return part;
      })}
    </>
  );
}

export function ChangelogModal() {
  const { showChangelogModal } = useUIStore();

  return (
    <Dialog open={showChangelogModal} onOpenChange={setShowChangelogModal}>
      <DialogContent className="max-w-lg! max-h-[80vh] flex flex-col">
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
                      <span>
                        <InlineMarkdown text={item} />
                      </span>
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
