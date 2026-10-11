import { useState, useId } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { formatDisplayDate, toISODate, MONTH_NAMES } from '../../lib/date';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value: string; // YYYY-MM-DD or DD-MM-YYYY
  onChange: (isoDate: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, className, id, disabled = false }: DatePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [open, setOpen] = useState(false);

  // Normalize current selected date into year, month, day numbers
  const isoValue = toISODate(value) || new Date().toISOString().split('T')[0];
  const [selectedY, selectedM, selectedD] = isoValue.split('-').map(Number);

  // View state for navigating months inside the calendar picker
  const [viewYear, setViewYear] = useState<number>(selectedY || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>((selectedM ? selectedM - 1 : new Date().getMonth()));

  // Synchronize view when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (selectedY && selectedM) {
        setViewYear(selectedY);
        setViewMonth(selectedM - 1);
      }
    }
    setOpen(isOpen);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedY = viewYear;
    const formattedM = (viewMonth + 1).toString().padStart(2, '0');
    const formattedD = day.toString().padStart(2, '0');
    const newIso = `${formattedY}-${formattedM}-${formattedD}`;
    onChange(newIso);
    setOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, '0');
    const d = today.getDate().toString().padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const handleSelectYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    onChange(`${y}-${m}-${day}`);
    setOpen(false);
  };

  // Compute days in current month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Compute day of week of 1st day of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  // Let's use Monday as first day of week (0 = Monday, ..., 6 = Sunday)
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  // Previous month filler days
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const leadingDays = Array.from({ length: firstDayOfWeek }, (_, i) => prevMonthDays - firstDayOfWeek + 1 + i);

  // Current month days
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Today's details for highlighting
  const today = new Date();
  const isCurrentViewTodayMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDate = today.getDate();

  // Selected date match check
  const isSelectedMonth = selectedY === viewYear && (selectedM - 1) === viewMonth;

  // Years for quick jump dropdown (10 years back, 5 years forward)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 16 }, (_, i) => currentYear - 10 + i);

  const displayString = formatDisplayDate(isoValue);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={inputId}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 h-10 cursor-pointer",
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold tracking-wide text-foreground truncate">
            {displayString || "DD-MM-YYYY"}
          </span>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
          DD-MM-YYYY
        </span>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[300px] p-3 rounded-2xl border shadow-xl bg-card space-y-3"
      >
        {/* Month & Year Navigation Header */}
        <div className="flex items-center justify-between gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8 rounded-lg"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5">
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="bg-muted text-xs font-semibold rounded-md px-1.5 py-1 border border-border/50 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="bg-muted text-xs font-semibold rounded-md px-1.5 py-1 border border-border/50 focus:outline-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-lg"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day-of-week headers (Monday to Sunday) */}
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground/80 py-1 border-b">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>Su</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {/* Leading days from previous month */}
          {leadingDays.map((d) => (
            <span
              key={`prev-${d}`}
              className="h-8 flex items-center justify-center text-muted-foreground/30 pointer-events-none text-[11px]"
            >
              {d}
            </span>
          ))}

          {/* Current month days */}
          {currentMonthDays.map((day) => {
            const isSelected = isSelectedMonth && selectedD === day;
            const isToday = isCurrentViewTodayMonth && todayDate === day;

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={cn(
                  "h-8 w-8 mx-auto rounded-lg flex items-center justify-center font-medium transition-all text-xs",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
                    : isToday
                    ? "border border-primary/60 text-primary font-bold hover:bg-muted"
                    : "text-foreground hover:bg-muted/80"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Quick select buttons */}
        <div className="pt-2 border-t flex items-center justify-between text-xs">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-medium text-primary hover:underline px-1 py-0.5"
            >
              Today
            </button>
            <span className="text-muted-foreground/40">•</span>
            <button
              type="button"
              onClick={handleSelectYesterday}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline px-1 py-0.5"
            >
              Yesterday
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            DD-MM-YYYY
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
