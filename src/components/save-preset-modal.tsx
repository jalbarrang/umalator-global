import dayjs from 'dayjs';
import { BookmarkPlus, CalendarIcon } from 'lucide-react';
import { useReducer } from 'react';
import { toast } from 'sonner';
import type { IEventType } from 'sunday-tools/course/definitions';
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
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { addPreset, updatePreset, usePresetStore } from '@/store/race/preset.store';
import { setSelectedPresetId, useSettingsStore } from '@/store/settings.store';
import { EventType } from 'sunday-tools/course/definitions';
import type { RacePreset } from '@/utils/races';

type SaveMode = 'edit' | 'new';

type SavePresetFormState = {
  open: boolean;
  mode: SaveMode;
  name: string;
  date: Date | undefined;
  eventType: IEventType;
  calendarOpen: boolean;
};

type SavePresetFormAction =
  | { type: 'dialog:openChange'; open: boolean; preset?: RacePreset | null }
  | { type: 'mode:set'; mode: SaveMode; preset?: RacePreset | null }
  | { type: 'name:set'; name: string }
  | { type: 'date:set'; date: Date | undefined }
  | { type: 'eventType:set'; eventType: IEventType }
  | { type: 'calendar:openChange'; open: boolean }
  | { type: 'dialog:close' };

function createNewFormFields(): Pick<SavePresetFormState, 'mode' | 'name' | 'date' | 'eventType'> {
  return {
    mode: 'new',
    name: '',
    date: new Date(),
    eventType: EventType.CM
  };
}

function fieldsFromPreset(
  preset: RacePreset
): Pick<SavePresetFormState, 'mode' | 'name' | 'date' | 'eventType'> {
  return {
    mode: 'edit',
    name: preset.name,
    date: dayjs(preset.date).toDate(),
    eventType: preset.type
  };
}

function createInitialSavePresetState(): SavePresetFormState {
  return {
    open: false,
    calendarOpen: false,
    ...createNewFormFields()
  };
}

function savePresetFormReducer(
  state: SavePresetFormState,
  action: SavePresetFormAction
): SavePresetFormState {
  switch (action.type) {
    case 'dialog:openChange':
      if (action.open) {
        return {
          ...state,
          open: true,
          calendarOpen: false,
          ...(action.preset ? fieldsFromPreset(action.preset) : createNewFormFields())
        };
      }
      return { ...state, open: false };
    case 'mode:set':
      if (action.mode === 'edit' && action.preset) {
        return { ...state, ...fieldsFromPreset(action.preset) };
      }
      return { ...state, ...createNewFormFields() };
    case 'name:set':
      return { ...state, name: action.name };
    case 'date:set':
      return { ...state, date: action.date };
    case 'eventType:set':
      return { ...state, eventType: action.eventType };
    case 'calendar:openChange':
      return { ...state, calendarOpen: action.open };
    case 'dialog:close':
      return { ...state, open: false };
    default:
      return state;
  }
}

export const SavePresetModal = () => {
  const [form, dispatch] = useReducer(
    savePresetFormReducer,
    undefined,
    createInitialSavePresetState
  );

  const { courseId, racedef } = useSettingsStore();
  const { selectedPresetId } = useSettingsStore();
  const { presets } = usePresetStore();

  const existingPreset = selectedPresetId ? presets[selectedPresetId] : null;

  const handleOpen = (isOpen: boolean) => {
    dispatch({
      type: 'dialog:openChange',
      open: isOpen,
      preset: isOpen && existingPreset ? existingPreset : null
    });
  };

  const handleModeChange = (nextMode: SaveMode) => {
    dispatch({
      type: 'mode:set',
      mode: nextMode,
      preset: nextMode === 'edit' ? existingPreset : null
    });
  };

  const handleUpdate = () => {
    if (!selectedPresetId) return;

    if (!form.date) {
      toast.error('Please select a date');
      return;
    }

    const dateStr = dayjs(form.date).format('YYYY-MM-DD');

    updatePreset(selectedPresetId, {
      id: selectedPresetId,
      name: existingPreset!.name,
      type: form.eventType,
      date: dateStr,
      courseId,
      ground: racedef.ground,
      weather: racedef.weather,
      season: racedef.season,
      time: racedef.time
    });

    toast.success('Preset updated successfully!');
    dispatch({ type: 'dialog:close' });
  };

  const handleSaveAsNew = () => {
    if (!form.name.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (!form.date) {
      toast.error('Please select a date');
      return;
    }

    const dateStr = dayjs(form.date).format('YYYY-MM-DD');
    const newId = crypto.randomUUID();

    addPreset({
      id: newId,
      name: form.name.trim(),
      type: form.eventType,
      date: dateStr,
      courseId,
      ground: racedef.ground,
      weather: racedef.weather,
      season: racedef.season,
      time: racedef.time
    });

    setSelectedPresetId(newId);
    toast.success('Preset saved successfully!');
    dispatch({ type: 'dialog:close' });
  };

  const isEditMode = form.mode === 'edit' && !!existingPreset;

  return (
    <Dialog open={form.open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <BookmarkPlus className="size-4" />
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
          <Tabs value={form.mode} onValueChange={(v) => handleModeChange(v as SaveMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="new">Create New</TabsTrigger>
            </TabsList>

            <TabsContent value="edit">
              <PresetForm
                name={existingPreset.name}
                date={form.date}
                eventType={form.eventType}
                calendarOpen={form.calendarOpen}
                nameReadOnly
                onNameChange={() => {}}
                onDateChange={(date) => dispatch({ type: 'date:set', date })}
                onEventTypeChange={(eventType) => dispatch({ type: 'eventType:set', eventType })}
                onCalendarOpenChange={(open) => dispatch({ type: 'calendar:openChange', open })}
              />
            </TabsContent>

            <TabsContent value="new">
              <PresetForm
                name={form.name}
                date={form.date}
                eventType={form.eventType}
                calendarOpen={form.calendarOpen}
                onNameChange={(name) => dispatch({ type: 'name:set', name })}
                onDateChange={(date) => dispatch({ type: 'date:set', date })}
                onEventTypeChange={(eventType) => dispatch({ type: 'eventType:set', eventType })}
                onCalendarOpenChange={(open) => dispatch({ type: 'calendar:openChange', open })}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <PresetForm
            name={form.name}
            date={form.date}
            eventType={form.eventType}
            calendarOpen={form.calendarOpen}
            onNameChange={(name) => dispatch({ type: 'name:set', name })}
            onDateChange={(date) => dispatch({ type: 'date:set', date })}
            onEventTypeChange={(eventType) => dispatch({ type: 'eventType:set', eventType })}
            onCalendarOpenChange={(open) => dispatch({ type: 'calendar:openChange', open })}
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
  onCalendarOpenChange
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
        // eslint-disable-next-line jsx-a11y/no-autofocus -- modal should focus the editable name field when opened
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
              <CalendarIcon className="mr-2 size-4" />
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
