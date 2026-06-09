// Russian formatters

export function formatRub(amount: number, options?: { withSign?: boolean }): string {
  const fmt = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const formatted = fmt.format(amount);
  if (options?.withSign && amount > 0) return `+${formatted}`;
  return formatted;
}

export function formatGb(gb: number, options?: { unlimited?: boolean }): string {
  if (options?.unlimited && gb >= 9999) return "Безлимит";
  return `${gb} ГБ`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes) return "0 Б";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const ruDayWord = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
};

export function formatDaysLeft(toDate: Date | string): string {
  const target = typeof toDate === "string" ? new Date(toDate) : toDate;
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "истекла";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${days} ${ruDayWord(days)}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = target.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
