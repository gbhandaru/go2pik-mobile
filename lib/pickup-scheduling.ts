export type PickupWindow = { open: string; close: string };

export type PickupAvailability = {
  timezone: string;
  asapAllowed: boolean;
  isOpenNow: boolean;
  statusMessage: string;
  today: {
    date: string;
    weekday: string;
    openTime: string;
    closeTime: string;
    windows: PickupWindow[];
  };
  weeklySchedule: {
    day: string;
    windows: PickupWindow[];
  }[];
};

const PICKUP_SLOT_STEP_MINUTES = 15;
const PICKUP_SLOT_LOOKAHEAD_DAYS = 14;

export function resolvePickupAvailability(data: Record<string, any> | null | undefined, restaurant: Record<string, any> | null | undefined): PickupAvailability {
  const source = data?.pickupAvailability || restaurant?.pickupAvailability || restaurant?.openHours || restaurant?.open_hours || null;
  const timezone = source?.timezone || restaurant?.timezone || defaultTimeZone();
  const weeklySchedule = normalizePickupWeeklySchedule(source?.weeklySchedule || source?.weekly_schedule || []);
  const today = normalizePickupDay(source?.today || {}, weeklySchedule, timezone);

  return {
    timezone,
    asapAllowed: normalizeBoolean(source?.asapAllowed ?? restaurant?.asapAllowed, true),
    isOpenNow: normalizeBoolean(source?.isOpenNow ?? restaurant?.isOpenNow, false),
    statusMessage: source?.statusMessage || restaurant?.statusMessage || '',
    today,
    weeklySchedule,
  };
}

export function buildPickupSlotGroups(availability: PickupAvailability | null | undefined) {
  if (!availability) return [];

  const timezone = availability.timezone || defaultTimeZone();
  const groups: { key: string; label: string; hoursLabel: string; slots: { value: string; label: string; windowLabel: string }[] }[] = [];

  for (let offset = 0; offset < PICKUP_SLOT_LOOKAHEAD_DAYS; offset += 1) {
    const candidateDate = new Date();
    candidateDate.setDate(candidateDate.getDate() + offset);
    const dayParts = getDatePartsInTimeZone(candidateDate, timezone);
    const windows = getPickupWindowsForDate(availability, dayParts, offset);
    if (!windows.length) continue;

    const slots = windows.flatMap((window) => buildPickupSlotsForWindow(dayParts, window, timezone));
    if (!slots.length) continue;

    groups.push({
      key: `${dayParts.year}-${dayParts.month}-${dayParts.day}`,
      label: formatPickupDayLabel(candidateDate, timezone, offset),
      hoursLabel: formatPickupWindows(windows, timezone),
      slots,
    });
  }

  return groups;
}

export function normalizeScheduledPickupSelection(value: string, availability: PickupAvailability | null | undefined) {
  const input = String(value || '').trim();
  if (!input) return '';

  if (input.includes('T')) {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  const parsed = parseTimeToMinutes(input);
  if (!Number.isFinite(parsed)) return '';

  const sourceDay = availability?.today?.date || '';
  const sourceParts = sourceDay
    ? getDatePartsInTimeZone(new Date(sourceDay), availability?.timezone || defaultTimeZone())
    : getDatePartsInTimeZone(new Date(), availability?.timezone || defaultTimeZone());
  return buildDateInTimeZone(sourceParts, parsed, availability?.timezone || defaultTimeZone()).toISOString();
}

export function getPickupStatusLabel(availability: PickupAvailability | null | undefined) {
  if (!availability) return '';
  const windows = availability.today?.windows || [];
  if (!windows.length) return 'Soon';
  const window = windows[0];
  if (!window?.open || !window?.close) return 'Soon';
  const reference = availability.isOpenNow ? window.close : window.open;
  return formatPickupTimeLabel(buildTimeForFormatting(reference, availability.timezone), availability.timezone);
}

export function getAsapReadyLabel(availability: PickupAvailability | null | undefined) {
  if (!availability) return '';
  if (availability.asapAllowed === false) return 'ASAP pickup is currently unavailable.';
  if (availability.isOpenNow === false) {
    return 'Currently the restaurant is closed, but you can still place an order for later pickup.';
  }
  return '⚡ ASAP (15–20 min)';
}

export function getPickupByLabel(
  selectedMode: 'ASAP' | 'SCHEDULED',
  scheduledPickupTime: string,
  asapReadyTime: string,
  timezone: string,
  availability: PickupAvailability | null | undefined,
  todayWindows: PickupWindow[] = [],
) {
  if (selectedMode === 'SCHEDULED' && scheduledPickupTime) {
    return formatScheduledPickupSelection(scheduledPickupTime, timezone);
  }

  if (selectedMode === 'ASAP') {
    if (availability?.asapAllowed === false) {
      return 'ASAP unavailable';
    }

    const firstWindow = todayWindows.length > 0 ? todayWindows[0] : null;
    if (availability?.isOpenNow === false && firstWindow?.open) {
      return formatPickupTimeLabel(buildTimeForFormatting(firstWindow.open, timezone), timezone);
    }

    return asapReadyTime ? formatPickupTimeLabel(buildTimeForFormatting(asapReadyTime, timezone), timezone) : 'ASAP';
  }

  if (todayWindows.length) {
    return formatPickupWindows(todayWindows, timezone);
  }

  return 'Choose a pickup time';
}

export function formatScheduledPickupSelection(value: string, timezone: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || defaultTimeZone(),
  });
}

function normalizePickupWeeklySchedule(schedule: any[] = []) {
  if (!Array.isArray(schedule)) return [];

  return schedule
    .map((entry) => ({
      day: String(entry?.day || entry?.weekday || entry?.name || '').trim(),
      windows: normalizePickupWindows(entry?.windows || entry?.openHours || []).length
        ? normalizePickupWindows(entry?.windows || entry?.openHours || [])
        : createPickupWindow(entry?.openTime || entry?.open_time, entry?.closeTime || entry?.close_time),
    }))
    .filter((entry) => entry.day);
}

function normalizePickupDay(day: any = {}, weeklySchedule: any[] = [], timezone = '') {
  const windowsSource = normalizePickupWindows(day.windows || day.openHours || []);
  const windows = windowsSource.length
    ? windowsSource
    : createPickupWindow(day.openTime || day.open_time, day.closeTime || day.close_time);
  const fallbackWeekday = day.date ? formatWeekdayFromDate(day.date, timezone) : '';
  const weekday = String(day.weekday || day.day || fallbackWeekday || '').trim();
  const scheduleEntry = weekday ? resolveWeeklyScheduleEntry(weeklySchedule, weekday) : null;
  const scheduleWindowsSource = normalizePickupWindows(scheduleEntry?.windows || scheduleEntry?.openHours || []);
  const mergedWindows = windows.length
    ? windows
    : scheduleWindowsSource.length
      ? scheduleWindowsSource
      : createPickupWindow(scheduleEntry?.openTime || scheduleEntry?.open_time, scheduleEntry?.closeTime || scheduleEntry?.close_time);

  return {
    date: day.date ? String(day.date) : '',
    weekday,
    openTime: day.openTime || day.open_time || mergedWindows[0]?.open || '',
    closeTime: day.closeTime || day.close_time || mergedWindows[mergedWindows.length - 1]?.close || '',
    windows: mergedWindows,
  };
}

function getPickupWindowsForDate(availability: PickupAvailability, dayParts: ReturnType<typeof getDatePartsInTimeZone>, offset: number) {
  if (offset === 0) {
    return normalizePickupWindows(availability.today?.windows);
  }

  const weeklyEntry = resolveWeeklyScheduleEntry(availability.weeklySchedule, dayParts.weekday || '');
  return normalizePickupWindows(weeklyEntry?.windows || weeklyEntry?.openHours || []);
}

function buildPickupSlotsForWindow(dayParts: ReturnType<typeof getDatePartsInTimeZone>, window: PickupWindow, timezone: string) {
  const openMinutes = parseTimeToMinutes(window.open);
  const closeMinutes = parseTimeToMinutes(window.close);
  if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes) || closeMinutes <= openMinutes) {
    return [];
  }

  const slots: { value: string; label: string; windowLabel: string }[] = [];
  const start = Math.ceil(openMinutes / PICKUP_SLOT_STEP_MINUTES) * PICKUP_SLOT_STEP_MINUTES;
  const end = Math.floor(closeMinutes / PICKUP_SLOT_STEP_MINUTES) * PICKUP_SLOT_STEP_MINUTES;

  for (let minutes = start; minutes <= end; minutes += PICKUP_SLOT_STEP_MINUTES) {
    const slotDate = buildDateInTimeZone(dayParts, minutes, timezone);
    slots.push({
      value: slotDate.toISOString(),
      label: formatPickupTimeLabel(slotDate, timezone),
      windowLabel: formatTimeRange(window.open, window.close, timezone),
    });
  }

  return slots;
}

function normalizePickupWindows(windows: any[] = []) {
  if (!Array.isArray(windows)) return [];
  return windows
    .map((window) => ({
      open: String(window?.open || window?.start || window?.from || '').trim(),
      close: String(window?.close || window?.end || window?.to || '').trim(),
    }))
    .filter((window) => window.open && window.close);
}

function createPickupWindow(open: unknown, close: unknown) {
  const normalizedOpen = String(open || '').trim();
  const normalizedClose = String(close || '').trim();
  if (!normalizedOpen || !normalizedClose) return [];
  return [{ open: normalizedOpen, close: normalizedClose }];
}

function resolveWeeklyScheduleEntry(weeklySchedule: any[] = [], weekday: string) {
  const target = normalizeWeekday(weekday);
  if (!target) return null;
  return weeklySchedule.find((entry) => normalizeWeekday(entry.day) === target) || null;
}

function normalizeWeekday(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function formatPickupWindows(windows: PickupWindow[] = [], timezone: string) {
  const normalized = normalizePickupWindows(windows);
  if (!normalized.length) return '';
  return normalized.map((window) => formatTimeRange(window.open, window.close, timezone)).join(' • ');
}

function formatTimeRange(open: string, close: string, timezone: string) {
  const openDate = buildTimeForFormatting(open, timezone);
  const closeDate = buildTimeForFormatting(close, timezone);
  return `${formatPickupTimeLabel(openDate, timezone)} - ${formatPickupTimeLabel(closeDate, timezone)}`;
}

function buildTimeForFormatting(time: string, timezone: string) {
  const minutes = parseTimeToMinutes(time);
  const baseParts = getDatePartsInTimeZone(new Date(), timezone || defaultTimeZone());
  return buildDateInTimeZone(baseParts, minutes, timezone || defaultTimeZone());
}

function parseTimeToMinutes(timeValue: string) {
  const input = String(timeValue || '').trim();
  if (!input) return NaN;
  const match = input.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

function buildDateInTimeZone(dayParts: ReturnType<typeof getDatePartsInTimeZone>, minutes: number, timezone: string) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const target = {
    year: dayParts.year,
    month: dayParts.month,
    day: dayParts.day,
    hour: hours,
    minute: mins,
  };

  let guess = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const current = getDatePartsInTimeZone(new Date(guess), timezone);
    if (
      current.year === target.year &&
      current.month === target.month &&
      current.day === target.day &&
      current.hour === target.hour &&
      current.minute === target.minute
    ) {
      return new Date(guess);
    }

    const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
    const currentAsUtc = Date.UTC(current.year, current.month - 1, current.day, current.hour, current.minute);
    guess += targetAsUtc - currentAsUtc;
  }

  return new Date(guess);
}

function getDatePartsInTimeZone(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || defaultTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    weekday: parts.find((part) => part.type === 'weekday')?.value || '',
  };
}

function formatPickupDayLabel(date: Date, timezone: string, offset: number) {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone || defaultTimeZone(),
  });
}

function formatPickupTimeLabel(date: Date, timezone: string) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || defaultTimeZone(),
  });
}

function formatWeekdayFromDate(value: string, timezone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], {
    weekday: 'long',
    timeZone: timezone || defaultTimeZone(),
  });
}

function defaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) return true;
    if (['false', '0', 'no', 'off'].includes(lower)) return false;
  }
  return fallback;
}
