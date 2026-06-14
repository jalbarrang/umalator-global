import { ExtractedUmaData } from '@/modules/runners/ocr/types';

interface OcrStatsEditorProps {
  results: Partial<ExtractedUmaData> | null;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
}

export function OcrStatsEditor(props: Readonly<OcrStatsEditorProps>) {
  const { results, onUpdateResults } = props;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Stats</h4>
      <div className="grid grid-cols-5 gap-1 text-center">
        <div className="bg-primary text-primary-foreground rounded-tl p-1 text-xs">Speed</div>
        <div className="bg-primary text-primary-foreground p-1 text-xs">Stamina</div>
        <div className="bg-primary text-primary-foreground p-1 text-xs">Power</div>
        <div className="bg-primary text-primary-foreground p-1 text-xs">Guts</div>
        <div className="bg-primary text-primary-foreground rounded-tr p-1 text-xs">Wit</div>
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 rounded-bl font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.speed ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              speed: e.target.value ? Number.parseInt(e.target.value) : undefined
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.stamina ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              stamina: e.target.value ? Number.parseInt(e.target.value) : undefined
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.power ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              power: e.target.value ? Number.parseInt(e.target.value) : undefined
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.guts ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              guts: e.target.value ? Number.parseInt(e.target.value) : undefined
            })
          }
        />
        <input
          type="number"
          min={1}
          max={2000}
          className="border p-2 rounded-br font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={results?.wisdom ?? ''}
          placeholder="-"
          onChange={(e) =>
            onUpdateResults({
              wisdom: e.target.value ? Number.parseInt(e.target.value) : undefined
            })
          }
        />
      </div>
    </div>
  );
}
