import { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { toast } from 'sonner';

interface OcrUnrecognizedProps {
  results: Partial<ExtractedUmaData> | null;
}

export function OcrUnrecognized({ results }: Readonly<OcrUnrecognizedProps>) {
  if (!results?.unrecognized || results.unrecognized.length === 0) {
    return null;
  }

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Unrecognized text ({results.unrecognized.length} lines)
      </summary>

      <pre className="mt-2 p-2 bg-muted rounded text-xs max-h-[100px] overflow-y-auto relative">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground absolute right-2 top-2"
          onClick={() => {
            navigator.clipboard.writeText(results.unrecognized?.join('\n') ?? '');
            toast.success('Copied to clipboard');
          }}
        >
          Copy
        </button>
        {results.unrecognized.join('\n')}
      </pre>
    </details>
  );
}
