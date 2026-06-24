const PERSIAN_TO_EN_DIGITS = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

export function toEnglishDigits(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[۰-۹٠-٩]/g, (digit) => PERSIAN_TO_EN_DIGITS[digit] || digit);
}

// Convert Western numerals (0-9) to Persian/Dari numerals (٠-٩)
export function toPersianDigits(num) {
  const persianDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/\d/g, (digit) => persianDigits[parseInt(digit)]);
}

// Format number with Persian digits and comma separators
export function formatNumberWithPersianDigits(num) {
  if (isNaN(num) || num === null || num === undefined) return '٠';
  
  // Format with comma separators (using Western digits first)
  const formatted = Math.abs(num).toLocaleString('en-US');
  
  // Convert to Persian digits
  return toPersianDigits(formatted);
}

import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import gregorianCalendar from "react-date-object/calendars/gregorian";
import persianLocale from "react-date-object/locales/persian_fa";

export function formatCurrency(amount) {
  if (isNaN(amount) || amount === null || amount === undefined) return "؋٠";

  // Format with full digits and comma separators
  const formattedAmount = formatNumberWithPersianDigits(Math.abs(amount));
  const sign = amount < 0 ? "-" : "";

  return `${sign}؋${formattedAmount}`;
}

// Format number without currency symbol (for general use)
export function formatNumber(num) {
  if (isNaN(num) || num === null || num === undefined) return '٠';
  return formatNumberWithPersianDigits(num);
}

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_SLASH_REGEX = /^\d{4}\/\d{2}\/\d{2}$/;

const convertDateObjectToIso = (dateObject) => {
  try {
    return new DateObject(dateObject).convert(gregorianCalendar).format("YYYY-MM-DD");
  } catch (error) {
    return "";
  }
};

/**
 * Normalize different date representations (Gregorian/Jalali strings, Date objects, DateObject instances)
 * into an ISO (YYYY-MM-DD) string. Returns empty string if conversion fails.
 */
export function normalizeDateToIso(value) {
  if (!value) return "";

  if (value instanceof DateObject) {
    return convertDateObjectToIso(value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const stringValue = toEnglishDigits(String(value).trim());
  if (!stringValue) return "";

  if (stringValue.toLowerCase() === "invalid date") {
    return "";
  }

  if (ISO_REGEX.test(stringValue)) {
    return stringValue;
  }

  try {
    if (ISO_SLASH_REGEX.test(stringValue)) {
      const gregorianDate = new DateObject({
        date: stringValue,
        format: "YYYY/MM/DD",
        calendar: gregorianCalendar,
      });
      return gregorianDate.format("YYYY-MM-DD");
    }
  } catch (error) {
    // continue and try Jalali parsing
  }

  const yearPart = Number(stringValue.slice(0, 4));
  const isLikelyJalali = !Number.isNaN(yearPart) && yearPart < 1800;
  const jalaliFormats = ["YYYY-MM-DD", "YYYY/MM/DD"];

  if (isLikelyJalali || jalaliFormats.some((format) => format.includes("/"))) {
    for (const format of jalaliFormats) {
      try {
        const jalaliDate = new DateObject({
          date: stringValue,
          format,
          calendar: persianCalendar,
          locale: persianLocale,
        });
        if (jalaliDate.isValid) {
          return jalaliDate.convert(gregorianCalendar).format("YYYY-MM-DD");
        }
      } catch (error) {
        // try next format
      }
    }
  }

  // As a last resort, attempt to parse as Gregorian with lenient DateObject
  try {
    const fallbackGregorian = new DateObject({
      date: stringValue,
      calendar: gregorianCalendar,
    });
    if (fallbackGregorian.isValid) {
      return fallbackGregorian.format("YYYY-MM-DD");
    }
  } catch (error) {
    // ignore
  }

  return "";
}

/** Display product notify-days override or settings default label. */
export function formatNotifyDaysBefore(notifyDaysBefore, t) {
  if (notifyDaysBefore != null && notifyDaysBefore !== "") {
    return `${formatNumber(notifyDaysBefore)} ${t("inventory.product.notifyDaysSuffix")}`;
  }
  return t("inventory.product.notifyDaysDefault");
}

const DARI_MONTH_NAMES = [
  "حمل",
  "ثور",
  "جوزا",
  "سرطان",
  "اسد",
  "سنبله",
  "میزان",
  "عقرب",
  "قوس",
  "جدی",
  "دلو",
  "حوت",
];

/** Gregorian YYYY-MM (from month picker) → Jalali month label, e.g. «جدی ۱۴۰۴». */
export function formatReportMonthPeriod(monthValue) {
  if (!monthValue || !String(monthValue).includes("-")) return "";
  const iso = `${monthValue}-01`;
  try {
    const jalali = new DateObject({
      date: iso,
      format: "YYYY-MM-DD",
      calendar: gregorianCalendar,
    }).convert(persianCalendar);
    const monthIndex = parseInt(jalali.format("M"), 10) - 1;
    const monthName = DARI_MONTH_NAMES[monthIndex] || jalali.format("MMMM");
    return `${monthName} ${toPersianDigits(jalali.format("YYYY"))}`;
  } catch {
    return monthValue;
  }
}

/** Gregorian date → Jalali month label for charts (e.g. «جدی ۱۴۰۴»). */
export function formatJalaliMonthFromDate(value) {
  if (!value) return "";
  const iso =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : normalizeDateToIso(value);
  if (!iso) return "";
  return formatReportMonthPeriod(iso.slice(0, 7));
}

/**
 * Display a stored Gregorian ISO / Date value as Hijri Shamsi (YYYY/MM/DD).
 */
export function formatJalaliDate(value, options = {}) {
  const { fallback = "-", withPersianDigits = true, format = "YYYY/MM/DD" } = options;
  if (value == null || value === "") return fallback;

  try {
    let gregorianDate;

    if (value instanceof DateObject) {
      gregorianDate = value.convert(gregorianCalendar);
    } else if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return fallback;
      gregorianDate = new DateObject({ date: value, calendar: gregorianCalendar });
    } else {
      const raw = toEnglishDigits(String(value).trim());
      if (!raw) return fallback;

      if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return fallback;
        gregorianDate = new DateObject({ date: parsed, calendar: gregorianCalendar });
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        gregorianDate = new DateObject({
          date: raw,
          format: "YYYY-MM-DD",
          calendar: gregorianCalendar,
        });
      } else {
        const iso = normalizeDateToIso(raw);
        if (!iso) return fallback;
        gregorianDate = new DateObject({
          date: iso,
          format: "YYYY-MM-DD",
          calendar: gregorianCalendar,
        });
      }
    }

    if (!gregorianDate?.isValid) return fallback;

    const jalali = gregorianDate.convert(persianCalendar, persianLocale);
    const formatted = jalali.format(format);
    return withPersianDigits ? toPersianDigits(formatted) : formatted;
  } catch {
    return fallback;
  }
}

/** Display date + time in Hijri Shamsi (YYYY/MM/DD HH:mm). */
export function formatJalaliDateTime(value, options = {}) {
  const { fallback = "-" } = options;
  if (value == null || value === "") return fallback;

  try {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;

    const gregorianDate = new DateObject({ date: parsed, calendar: gregorianCalendar });
    const jalali = gregorianDate.convert(persianCalendar, persianLocale);
    const formatted = `${jalali.format("YYYY/MM/DD")} ${jalali.format("HH:mm")}`;
    return toPersianDigits(formatted);
  } catch {
    return fallback;
  }
}
