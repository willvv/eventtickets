import { format, formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const CR_TIMEZONE = "America/Costa_Rica";

export function formatDateCR(date: Date | string, fmt = "PPP"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, CR_TIMEZONE);
  return format(zoned, fmt, { locale: es });
}

export function formatDateTimeCR(date: Date | string): string {
  return formatDateCR(date, "PPPp");
}

export function formatRelativeCR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistance(d, new Date(), { locale: es, addSuffix: true });
}

export function formatCurrency(
  amount: number,
  currency: "CRC" | "USD" = "CRC"
): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "CRC" ? 0 : 2,
  }).format(amount);
}
