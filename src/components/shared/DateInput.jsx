import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { gregorianToEthiopian, ethiopianToGregorian, isValidEthiopianDate, getEthiopianMonthNames } from '@/lib/ethiopianCalendar';

/**
 * DateInput — supports both Gregorian and Ethiopian calendar modes.
 *
 * Internal value is always Gregorian ISO (YYYY-MM-DD).
 * Display/input format depends on `calendarMode` ('gregorian' | 'ethiopian').
 *
 * Props:
 *   value: Gregorian ISO date string (YYYY-MM-DD)
 *   onChange: (gregorianISO: string) => void
 *   calendarMode: 'gregorian' | 'ethiopian'
 *   label: optional label
 *   required: boolean
 *   disabled: boolean
 */
export default function DateInput({ value, onChange, calendarMode = 'gregorian', label, required, disabled }) {
  const [ethDate, setEthDate] = useState(() => {
    if (value && calendarMode === 'ethiopian') {
      return gregorianToEthiopian(value);
    }
    return null;
  });
  const [ethError, setEthError] = useState('');

  useEffect(() => {
    if (value && calendarMode === 'ethiopian') {
      setEthDate(gregorianToEthiopian(value));
    }
  }, [value, calendarMode]);

  if (calendarMode !== 'ethiopian') {
    return (
      <div>
        {label && <Label>{label}{required && ' *'}</Label>}
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
        />
      </div>
    );
  }

  // Ethiopian mode
  const months = getEthiopianMonthNames(false);

  const ethYear = ethDate?.year || 2017;
  const ethMonth = ethDate?.month || 1;
  const ethDay = ethDate?.day || 1;

  const maxDay = (() => {
    if (ethMonth === 13) {
      return (ethYear % 4 === 0) ? 6 : 5;
    }
    return 30;
  })();

  const updateEthDate = (newYear, newMonth, newDay) => {
    setEthError('');
    if (!isValidEthiopianDate(newYear, newMonth, newDay)) {
      setEthError('Invalid Ethiopian date');
      return;
    }
    const greg = ethiopianToGregorian(newYear, newMonth, newDay);
    onChange(greg);
  };

  return (
    <div>
      {label && <Label>{label}{required && ' *'}</Label>}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Day</Label>
          <Input
            type="number"
            min={1}
            max={maxDay}
            value={ethDay}
            onChange={(e) => {
              const d = parseInt(e.target.value) || 1;
              const clamped = Math.max(1, Math.min(d, maxDay));
              updateEthDate(ethYear, ethMonth, clamped);
            }}
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Month</Label>
          <Select
            value={String(ethMonth)}
            onValueChange={(v) => {
              const m = parseInt(v);
              updateEthDate(ethYear, m, ethDay);
            }}
          >
            <SelectTrigger disabled={disabled}><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((name, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Year</Label>
          <Input
            type="number"
            min={1900}
            max={2100}
            value={ethYear}
            onChange={(e) => {
              const y = parseInt(e.target.value) || ethYear;
              updateEthDate(y, ethMonth, ethDay);
            }}
            disabled={disabled}
          />
        </div>
      </div>
      {ethError && <p className="text-xs text-destructive mt-1">{ethError}</p>}
    </div>
  );
}