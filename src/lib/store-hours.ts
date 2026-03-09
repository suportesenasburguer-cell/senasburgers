export const isStoreOpen = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();
  const openDays = [0, 1, 2, 4, 5, 6]; // Dom, Seg, Ter, Qui, Sex, Sáb
  const openTime = 18 * 60 + 15; // 18:15
  const closeTime = 23 * 60; // 23:00
  return openDays.includes(day) && time >= openTime && time <= closeTime;
};
