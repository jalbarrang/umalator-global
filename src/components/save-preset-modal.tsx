import dayjs from 'dayjs';
import { BookmarkPlus, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { IEventType } from '@/lib/sunday-tools/course/definitions';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { addPreset, updatePreset, usePresetStore } from '@/store/race/preset.store';
import { setSelectedPresetId, useSettingsStore } from '@/store/settings.store';
import { EventType } from '@/lib/sunday-tools/course/definitions';

type SaveMode = 'edit' | 'new';

export const SavePresetModal = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SaveMode>('new');
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [eventType, setEventType] = useState<IEventType>(EventType.CM);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { courseId, racedef } = useSettingsStore();
  const { selectedPresetId } = useSettingsStore();
  const { presets } = usePresetStore();

  const existingPreset = selectedPresetId ? presets[selectedPresetId] : null;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      if (existingPreset) {
        setMode('edit');
        setName(existingPreset.name);
        setDate(dayjs(existingPreset.date).toDate());
        setEventType(existingPreset.type);
      } else {
        setMode('new');
        setName('');
        setDate(new Date());
        setEventType(EventType.CM);
      }
    }

    setOpen(isOpen);
  };

  const handleModeChange = (nextMode: SaveMode) => {
    setMode(nextMode);

    if (nextMode === 'edit' && existingPreset) {
      setName(existingPreset.name);
      setDate(dayjs(existingPreset.date).toDate());
      setEventType(existingPreset.type);
    } else {
      setName('');
      setDate(new Date());
      setEventType(EventType.CM);
    }
  };

  const handleUpdate = () => {
    if (!selectedPresetId) return;

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    const dateStr = dayjs(date).format('YYYY-MM-DD');

    updatePreset(selectedPresetId, {
      id: selectedPresetId,
      name: existingPreset!.name,
      type: eventType,
      date: dateStr,
      courseId,
      ground: racedef.ground,
      weather: racedef.weather,
      season: racedef.season,
      time: racedef.time,
    });

    toast.success('Preset updated successfully!');
    setOpen(false);
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
    setOpen(false);
  };

  const isEditMode = mode === 'edit' && !!existingPreset;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <BookmarkPlus className="h-4 w-4" />
            Save
          </Button>
        }
      />

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Update Preset' : 'Save Race Preset'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the existing preset with the current race settings.'
              : 'Save the current race settings as a preset for quick access later.'}
          </DialogDescription>
        </DialogHeader>

        {existingPreset ? (
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as SaveMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="new">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="edit">
              <PresetForm
                name={existingPreset.name}
                date={date}
                eventType={eventType}
                calendarOpen={calendarOpen}
                nameReadOnly
                onNameChange={() => {}}
                onDateChange={setDate}
                onEventTypeChange={setEventType}
                onCalendarOpenChange={setCalendarOpen}
              />
            </TabsContent>

            <TabsContent value="new">
              <PresetForm
                name={name}
                date={date}
                eventType={eventType}
                calendarOpen={calendarOpen}
                onNameChange={setName}
                onDateChange={setDate}
                onEventTypeChange={setEventType}
                onCalendarOpenChange={setCalendarOpen}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <PresetForm
            name={name}
            date={date}
            eventType={eventType}
            calendarOpen={calendarOpen}
            onNameChange={setName}
            onDateChange={setDate}
            onEventTypeChange={setEventType}
            onCalendarOpenChange={setCalendarOpen}
          />
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          {isEditMode ? (
            <Button onClick={handleUpdate}>Update Preset</Button>
          ) : (
            <Button onClick={handleSaveAsNew}>Save Preset</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type PresetFormProps = {
  name: string;
  date: Date | undefined;
  eventType: IEventType;
  calendarOpen: boolean;
  nameReadOnly?: boolean;
  onNameChange: (name: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onEventTypeChange: (type: IEventType) => void;
  onCalendarOpenChange: (open: boolean) => void;
};

const PresetForm = ({
  name,
  date,
  eventType,
  calendarOpen,
  nameReadOnly,
  onNameChange,
  onDateChange,
  onEventTypeChange,
  onCalendarOpenChange,
}: PresetFormProps) => (
  <div className="grid gap-4 py-4">
    <div className="grid gap-2">
      <Label htmlFor="preset-name">Preset Name *</Label>
      <Input
        id="preset-name"
        placeholder="e.g., Leo Cup, Scorpio Cup, etc."
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        readOnly={nameReadOnly}
        autoFocus={!nameReadOnly}
        maxLength={255}
        className={nameReadOnly ? 'text-muted-foreground' : undefined}
      />
    </div>

    <div className="grid gap-2">
      <Label htmlFor="preset-date">Date *</Label>
      <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
        <PopoverTrigger
          render={
            <Button
              id="preset-date"
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? dayjs(date).format('YYYY-MM-DD') : 'Select date'}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate);
              onCalendarOpenChange(false);
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>

    <div className="grid gap-2">
      <Label htmlFor="event-type">Event Type</Label>
      <Select value={eventType} onValueChange={(value) => onEventTypeChange(value as IEventType)}>
        <SelectTrigger id="event-type" className="w-full">
          <SelectValue>
            {(value) => {
              if (value !== undefined) {
                const label =
                  value === EventType.CM ? 'Champions Meeting (CM)' : 'Legend of Heroes (LOH)';

                return <span>{label}</span>;
              }

              return <span className="text-muted-foreground">Select an event type</span>;
            }}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          <SelectItem value={EventType.CM}>Champions Meeting (CM)</SelectItem>
          <SelectItem value={EventType.LOH}>Legend of Heroes (LOH)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);
