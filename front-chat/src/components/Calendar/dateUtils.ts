// dateUtils.ts
export type DayCell = { date: Date; isCurrentMonth: boolean };

export function getMonthMatrix(date: Date): DayCell[][] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  // start from Monday
  const start = new Date(firstDay);
  start.setDate(start.getDate() - ((firstDay.getDay() + 6) % 7));

  const matrix: DayCell[][] = [];
  for (let week = 0; week < 6; week++) {
    const row: DayCell[] = [];
    for (let day = 0; day < 7; day++) {
      const d = new Date(start);
      d.setDate(start.getDate() + week * 7 + day);
      row.push({ date: d, isCurrentMonth: d.getMonth() === month });
    }
    matrix.push(row);
  }
  return matrix;
}

export type WeekDay = { date: Date; weekdayShort: string; weekday: string };

export function getWeekDays(date: Date): WeekDay[] {
  const current = new Date(date);
  // week start = Monday
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - ((current.getDay() + 6) % 7));

  const weekdayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const fullNames = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push({
      date: d,
      weekdayShort: weekdayNames[i],
      weekday: fullNames[i],
    });
  }
  return days;
}