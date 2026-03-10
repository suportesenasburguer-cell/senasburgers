import { supabase } from '@/integrations/supabase/client';

// Fallback constants
export const OPEN_DAYS = [0, 1, 2, 4, 5, 6];
export const OPEN_TIME = 18 * 60 + 15;
export const CLOSE_TIME = 23 * 60;

export const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

interface WeeklyHour {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

let cachedSchedule: WeeklyHour[] | null = null;
let cachedClosures: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;
let refreshPromise: Promise<void> | null = null;

// Listeners for reactive updates
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const subscribeStoreStatus = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const notifyListeners = () => {
  listeners.forEach(l => l());
};

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const refreshCache = async (): Promise<void> => {
  const now = Date.now();
  if (cachedSchedule && now - cacheTimestamp < CACHE_TTL) return;

  // Prevent concurrent refreshes
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [hoursRes, closuresRes] = await Promise.all([
        (supabase as any).from('store_weekly_hours').select('day_of_week, is_open, open_time, close_time').order('day_of_week'),
        (supabase as any).from('store_manual_closures').select('closure_date').gte('closure_date', today),
      ]);
      if (hoursRes.data && hoursRes.data.length > 0) {
        cachedSchedule = hoursRes.data;
        cachedClosures = closuresRes.data ? closuresRes.data.map((c: any) => c.closure_date) : [];
        cacheTimestamp = Date.now();
        notifyListeners();
      }
    } catch {
      // use fallback
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Pre-fetch on module load
refreshCache();

/** Ensure cache is loaded (awaitable) */
export const ensureCacheLoaded = async (): Promise<void> => {
  if (cachedSchedule) return;
  await refreshCache();
};

export const isStoreOpen = (): boolean => {
  // Trigger background refresh if stale
  refreshCache();

  const now = new Date();
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().split('T')[0];

  if (cachedSchedule) {
    // Check manual closure
    if (cachedClosures.includes(todayStr)) return false;

    const todaySchedule = cachedSchedule.find(s => s.day_of_week === day);
    if (!todaySchedule || !todaySchedule.is_open) return false;

    const open = timeToMinutes(todaySchedule.open_time);
    const close = timeToMinutes(todaySchedule.close_time);
    return currentMinutes >= open && currentMinutes <= close;
  }

  // Fallback to hardcoded
  return OPEN_DAYS.includes(day) && currentMinutes >= OPEN_TIME && currentMinutes <= CLOSE_TIME;
};

/** Check if cache is loaded */
export const isCacheLoaded = (): boolean => !!cachedSchedule;

/** Get available time slots for a given day (uses cached schedule or fallback) */
export const getAvailableTimeSlots = (dayOfWeek?: number): string[] => {
  let openMin = OPEN_TIME;
  let closeMin = CLOSE_TIME;

  if (cachedSchedule) {
    const daySchedule = cachedSchedule.find(s => s.day_of_week === (dayOfWeek ?? new Date().getDay()));
    if (daySchedule && daySchedule.is_open) {
      openMin = timeToMinutes(daySchedule.open_time);
      closeMin = timeToMinutes(daySchedule.close_time);
    }
  }

  const slots: string[] = [];
  for (let m = openMin; m <= closeMin - 30; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return slots;
};

/** Get next N open dates using cached schedule or fallback */
export const getNextOpenDates = (count: number = 7): Date[] => {
  const dates: Date[] = [];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let current = new Date(now);

  const isDayOpen = (day: number): boolean => {
    if (cachedSchedule) {
      const s = cachedSchedule.find(x => x.day_of_week === day);
      return !!s && s.is_open;
    }
    return OPEN_DAYS.includes(day);
  };

  const getCloseTime = (day: number): number => {
    if (cachedSchedule) {
      const s = cachedSchedule.find(x => x.day_of_week === day);
      if (s) return timeToMinutes(s.close_time);
    }
    return CLOSE_TIME;
  };

  const getDateStr = (d: Date) => d.toISOString().split('T')[0];

  // Check today
  if (isDayOpen(current.getDay()) && !cachedClosures.includes(getDateStr(current)) && currentMinutes < getCloseTime(current.getDay()) - 30) {
    dates.push(new Date(current));
  }
  current.setDate(current.getDate() + 1);

  let safety = 0;
  while (dates.length < count && safety < 30) {
    safety++;
    if (isDayOpen(current.getDay()) && !cachedClosures.includes(getDateStr(current))) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/** Format a scheduled date/time for display */
export const formatScheduledDateTime = (date: Date, time: string): string => {
  const dayLabel = DAY_LABELS[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${dayLabel}, ${day}/${month} às ${time}`;
};
