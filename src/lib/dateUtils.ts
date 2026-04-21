const TZ = 'Asia/Singapore'; // GMT+8

export function getTodayStrGMT8(): string {
  const d = new Date();
  const str = d.toLocaleString('en-US', { timeZone: TZ });
  const tzDate = new Date(str);
  
  const year = tzDate.getFullYear();
  const month = String(tzDate.getMonth() + 1).padStart(2, '0');
  const day = String(tzDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatToDDMMYYYY(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function getDayOfWeek(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return '';
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getMalayDayOfWeek(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return '';
  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  return days[dateObj.getDay()];
}

export function getGroupHeader(dateStr: string): string {
  const day = getMalayDayOfWeek(dateStr);
  const formattedDate = formatToDDMMYYYY(dateStr);
  return `${day} - ${formattedDate}`;
}

export function maskDateDDMMYYYY(val: string): string {
  let v = val.replace(/\D/g, '');
  if (v.length > 8) v = v.substring(0, 8);
  if (v.length >= 5) {
    return `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
  } else if (v.length >= 3) {
    return `${v.substring(0, 2)}/${v.substring(2)}`;
  }
  return v;
}

export function parseDDMMYYYY(str: string): string | null {
  if (!str || str.length !== 10) return null;
  const [dd, mm, yyyy] = str.split('/');
  if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
  return null;
}

export function formatTo12Hour(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, '0')}:${minStr} ${ampm}`;
}

export function formatToDateTime(timestamp: number): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  
  let hour = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  
  return `${dd}/${mm}/${yyyy} ${String(hour).padStart(2, '0')}:${min} ${ampm}`;
}
