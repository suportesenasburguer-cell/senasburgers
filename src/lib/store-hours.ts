export const OPEN_DAYS = [0, 1, 2, 4, 5, 6]; // Dom, Seg, Ter, Qui, Sex, Sáb
export const OPEN_TIME = 18 * 60 + 15; // 18:15
export const CLOSE_TIME = 23 * 60; // 23:00

export const isStoreOpen = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();
  return OPEN_DAYS.includes(day) && time >= OPEN_TIME && time <= CLOSE_TIME;
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
  // From 18:15 to 22:30 in 15-min intervals
  for (let m = OPEN_TIME; m <= CLOSE_TIME - 30; m += 15) {
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

  // Include today if it's an open day and there are still time slots available
  if (OPEN_DAYS.includes(current.getDay()) && currentMinutes < CLOSE_TIME - 30) {
    dates.push(new Date(current));
  }
  current.setDate(current.getDate() + 1);

  while (dates.length < count) {
    if (OPEN_DAYS.includes(current.getDay())) {
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
