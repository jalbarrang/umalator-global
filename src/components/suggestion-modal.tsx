import { useLocation } from 'react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TurnstileWidget } from '@/components/turnstile-widget';
import { config } from '@/config';
import { setShowSuggestionModal, useUIStore } from '@/store/ui.store';

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'other', label: 'Other' }
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

const MESSAGE_MAX = 2000;

export function SuggestionModal() {
  const { showSuggestionModal } = useUIStore();
  const { pathname } = useLocation();

  const { workerUrl, turnstileSiteKey } = config.suggestions;

  const [category, setCategory] = useState<Category>('bug');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setCategory('bug');
    setMessage('');
    setToken(null);
    setSubmitting(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setShowSuggestionModal(open);
      if (!open) reset();
    },
    [reset]
  );

  const handleSubmit = useCallback(async () => {
    if (!workerUrl || !token || message.trim().length === 0) return;

    setSubmitting(true);
    try {
      const resp = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          token,
          metadata: {
            route: pathname,
            version: __APP__VERSION__,
            userAgent: navigator.userAgent
          }
        })
      });

      if (!resp.ok) {
        const data = (await resp.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Something went wrong.');
      }

      toast.success('Thanks! Your suggestion was sent.');
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send suggestion.');
      setSubmitting(false);
    }
  }, [workerUrl, token, message, category, pathname, handleOpenChange]);

  const canSubmit = Boolean(token) && message.trim().length > 0 && !submitting;

  return (
    <Dialog open={showSuggestionModal} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg!">
        <DialogHeader>
          <DialogTitle>Send a suggestion</DialogTitle>
          <DialogDescription>
            Report a bug or request a feature. It goes straight to the maintainer for triage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="suggestion-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger id="suggestion-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestion-message">Message</Label>
            <Textarea
              id="suggestion-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX}
              rows={5}
              placeholder="Describe the bug or the feature you'd like…"
            />
            <p className="text-muted-foreground text-right text-xs">
              {message.length}/{MESSAGE_MAX}
            </p>
          </div>

          {turnstileSiteKey ? (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              onVerify={setToken}
              onExpire={() => setToken(null)}
              onError={() => setToken(null)}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
