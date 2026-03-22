import { supabase } from '@/integrations/supabase/client';

export const OPEN_DAYS = [0, 1, 2, 4, 5, 6]; // fallback
export const OPEN_TIME = 18 * 60 + 15; // fallback 18:15
export const CLOSE_TIME = 23 * 60; // fallback 23:00

interface StoreHourConfig {
  day_of_week: number;
  is_open: boolean;
  open_time: string; // "HH:MM"
  close_time: string;
}

let cachedHours: StoreHourConfig[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const getStoreHours = async (): Promise<StoreHourConfig[]> => {
  if (cachedHours && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedHours;
  }

  try {
    const { data, error } = await (supabase as any)
      .from('store_hours')
      .select('*')
      .order('day_of_week');

    if (!error && data && data.length > 0) {
      cachedHours = data;
      cacheTimestamp = Date.now();
      localStorage.setItem('store_hours', JSON.stringify(data));
      return data;
    }
  } catch {
    // fallback to localStorage
  }

  const saved = localStorage.getItem('store_hours');
  if (saved) {
    try {
      cachedHours = JSON.parse(saved);
      cacheTimestamp = Date.now();
      return cachedHours!;
    } catch {}
  }

  // Ultimate fallback: hardcoded defaults
  return OPEN_DAYS.map(day => ({
    day_of_week: day,
    is_open: true,
    open_time: '18:15',
    close_time: '23:00',
  }));
};

/** Synchronous check using cached data (for immediate rendering) */
export const isStoreOpen = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();

  // Use cached data if available
  if (cachedHours) {
    const dayConfig = cachedHours.find(h => h.day_of_week === day);
    if (dayConfig) {
      if (!dayConfig.is_open) return false;
      return time >= timeToMinutes(dayConfig.open_time) && time <= timeToMinutes(dayConfig.close_time);
    }
  }

  // Try localStorage
  const saved = localStorage.getItem('store_hours');
  if (saved) {
    try {
      const hours: StoreHourConfig[] = JSON.parse(saved);
      cachedHours = hours;
      const dayConfig = hours.find(h => h.day_of_week === day);
      if (dayConfig) {
        if (!dayConfig.is_open) return false;
        return time >= timeToMinutes(dayConfig.open_time) && time <= timeToMinutes(dayConfig.close_time);
      }
    } catch {}
  }

  // Hardcoded fallback
  return OPEN_DAYS.includes(day) && time >= OPEN_TIME && time <= CLOSE_TIME;
};

/** Async version that ensures fresh data */
export const isStoreOpenAsync = async (): Promise<boolean> => {
  const hours = await getStoreHours();
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();

  const dayConfig = hours.find(h => h.day_of_week === day);
  if (!dayConfig || !dayConfig.is_open) return false;
  return time >= timeToMinutes(dayConfig.open_time) && time <= timeToMinutes(dayConfig.close_time);
};

/** Preload store hours into cache */
export const preloadStoreHours = () => {
  getStoreHours();
};

export const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

/** Get available time slots (HH:MM) for scheduling */
export const getAvailableTimeSlots = (): string[] => {
  const slots: string[] = [];
  let openTime = OPEN_TIME;
  let closeTime = CLOSE_TIME;

  if (cachedHours) {
    const now = new Date();
    const dayConfig = cachedHours.find(h => h.day_of_week === now.getDay());
    if (dayConfig) {
      openTime = timeToMinutes(dayConfig.open_time);
      closeTime = timeToMinutes(dayConfig.close_time);
    }
  }

  for (let m = openTime; m <= closeTime - 30; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
  }
  return slots;
};

/** Get next N open dates starting from today (if still has slots) or tomorrow */
export const getNextOpenDates = (count: number = 7): Date[] => {
  const dates: Date[] = [];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let current = new Date(now);

  const isOpenDay = (d: number) => {
    if (cachedHours) {
      const cfg = cachedHours.find(h => h.day_of_week === d);
      return cfg?.is_open ?? false;
    }
    return OPEN_DAYS.includes(d);
  };

  const getCloseTime = (d: number) => {
    if (cachedHours) {
      const cfg = cachedHours.find(h => h.day_of_week === d);
      if (cfg) return timeToMinutes(cfg.close_time);
    }
    return CLOSE_TIME;
  };

  if (isOpenDay(current.getDay()) && currentMinutes < getCloseTime(current.getDay()) - 30) {
    dates.push(new Date(current));
  }
  current.setDate(current.getDate() + 1);

  while (dates.length < count) {
    if (isOpenDay(current.getDay())) {
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
