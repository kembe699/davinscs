import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateFieldProps = {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
};

// A date picker that always displays dd/mm/yyyy, regardless of the
// browser's locale — unlike a native <input type="date">, whose displayed
// format follows the OS/browser and can show mm/dd/yyyy. Still stores and
// emits plain ISO yyyy-mm-dd strings, so callers don't need to change how
// they read/send the value.
export function DateField({ value, onChange, placeholder = "dd/mm/yyyy", className = "" }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`field-input flex items-center justify-between gap-2 text-left ${
            selected ? "" : "text-muted-foreground/50"
          } ${className}`}
        >
          {selected ? format(selected, "dd/MM/yyyy") : placeholder}
          <CalendarIcon size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
