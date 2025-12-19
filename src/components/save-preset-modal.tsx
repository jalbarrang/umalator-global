import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addPreset,
  updatePreset,
  usePresetStore,
} from '@/store/race/preset.store';
import { setSelectedPresetId, useSettingsStore } from '@/store/settings.store';
import { EventType } from '@/utils/races';
import dayjs from 'dayjs';
import { BookmarkPlus, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const SavePresetModal = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [eventType, setEventType] = useState<EventType>(EventType.CM);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { courseId, racedef } = useSettingsStore();
  const { selectedPresetId } = useSettingsStore();
  const { presets } = usePresetStore();

  const handleOpen = (open: boolean) => {
    const preset = selectedPresetId ? presets[selectedPresetId] : null;

    if (open && preset) {
      // Load On Open
      setName(preset.name);
      setDate(dayjs(preset.date).toDate());
      setEventType(preset.type);
      setOpen(open);

      return;
    }

    // Reset On Close
    setName('');
    setDate(undefined);
    setEventType(EventType.CM);
    setOpen(open);
  };

  const handleUpdate = () => {
    if (!selectedPresetId) return;

    if (!name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    const dateStr = dayjs(date).format('YYYY-MM-DD');

    updatePreset(selectedPresetId, {
      id: selectedPresetId,
      name: name.trim(),
      type: eventType,
      date: dateStr,
      courseId,
      ground: racedef.ground,
      weather: racedef.weather,
      season: racedef.season,
      time: racedef.time,
    });

    toast.success('Preset updated successfully!');

    handleOpen(false);
  };

  const handleSaveAsNew = () => {
    if (!name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    const dateStr = dayjs(date).format('YYYY-MM-DD');
    const newId = crypto.randomUUID();

    addPreset({
      id: newId,
      name: name.trim(),
      type: eventType,
      date: dateStr,
      courseId,
      ground: racedef.ground,
      weather: racedef.weather,
      season: racedef.season,
      time: racedef.time,
    });

    setSelectedPresetId(newId);
    toast.success('Preset saved successfully!');

    handleOpen(false);
  };

  const isUpdating = !!selectedPresetId;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookmarkPlus className="h-4 w-4" />
          Save
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isUpdating ? 'Update Preset' : 'Save Race Preset'}
          </DialogTitle>
          <DialogDescription>
            {isUpdating
              ? 'Update the existing preset or save as a new one.'
              : 'Save the current race settings as a preset for quick access later.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="preset-name">Preset Name *</Label>
            <Input
              id="preset-name"
              placeholder="e.g., Leo Cup, Scorpio Cup, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={255}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="preset-date">Date *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="preset-date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? dayjs(date).format('YYYY-MM-DD') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(selectedDate) => {
                    setDate(selectedDate);
                    setCalendarOpen(false);
                  }}
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select
              value={eventType.toString()}
              onValueChange={(value) =>
                setEventType(Number(value) as EventType)
              }
            >
              <SelectTrigger id="event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EventType.CM.toString()}>
                  Champions Meeting (CM)
                </SelectItem>
                <SelectItem value={EventType.LOH.toString()}>
                  Legend of Heroes (LOH)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>

          {isUpdating ? (
            <>
              <Button variant="outline" onClick={handleSaveAsNew}>
                Save as New
              </Button>
              <Button onClick={handleUpdate}>Update Preset</Button>
            </>
          ) : (
            <Button onClick={handleSaveAsNew}>Save Preset</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
