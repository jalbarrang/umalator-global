import { BookmarkPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SaveRunnerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, shouldLink: boolean) => void;
  triggerButton?: React.ReactElement;
};

export const SaveRunnerModal = ({
  open,
  onOpenChange,
  onSave,
  triggerButton,
}: SaveRunnerModalProps) => {
  const [name, setName] = useState('');
  const [shouldLink, setShouldLink] = useState(true);

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    onSave(name.trim(), shouldLink);
    setName('');
    setShouldLink(true);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName('');
    setShouldLink(true);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerButton && <DialogTrigger render={triggerButton} />}

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save to Veterans</DialogTitle>
          <DialogDescription>
            Save this runner configuration to your Veterans library for quick access later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="runner-name">Runner Notes *</Label>
            <Input
              id="runner-name"
              placeholder="e.g., Speed Build, Stamina Build, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              maxLength={255}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="link-runner"
              checked={shouldLink}
              onCheckedChange={(checked) => setShouldLink(checked === true)}
            />
            <Label htmlFor="link-runner" className="cursor-pointer font-normal">
              Link runner after saving (sync future changes)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
