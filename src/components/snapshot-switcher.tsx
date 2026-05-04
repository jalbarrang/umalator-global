import { useState } from 'react';
import { ChevronDown, Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportSnapshotDialog, downloadSnapshot } from '@/modules/simulation/share';

export function SnapshotSwitcher() {
  const [importSnapshotOpen, setImportSnapshotOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Share settings
              <ChevronDown className="h-3 w-3" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => downloadSnapshot()}>
            <Download className="mr-2 h-4 w-4" />
            Export simulation settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setImportSnapshotOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import simulation settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportSnapshotDialog open={importSnapshotOpen} onOpenChange={setImportSnapshotOpen} />
    </>
  );
}
