import { BiX } from "react-icons/bi";
import { useEffect, useState } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persianCalendar from "react-date-object/calendars/persian";
import persianLocale from "react-date-object/locales/persian_fa";
import gregorianCalendar from "react-date-object/calendars/gregorian";
import { toEnglishDigits } from "../utilies/helper";

const DARI_MONTHS = [
  ["حمل", "ح"],
  ["ثور", "ث"],
  ["جوزا", "جو"],
  ["سرطان", "سر"],
  ["اسد", "اس"],
  ["سنبله", "سن"],
  ["میزان", "می"],
  ["عقرب", "عق"],
  ["قوس", "قو"],
  ["جدی", "جد"],
  ["دلو", "دل"],
  ["حوت", "حو"],
];

const DARI_WEEK_DAYS = [
  ["شنبه", "شن"],
  ["یکشنبه", "یک"],
  ["دوشنبه", "دو"],
  ["سه‌شنبه", "سه"],
  ["چهارشنبه", "چه"],
  ["پنجشنبه", "پن"],
  ["جمعه", "جم"],
];

const DARI_LOCALE = {
  ...persianLocale,
  name: "dari_fa",
  months: DARI_MONTHS,
  weekDays: DARI_WEEK_DAYS,
};

const DATE_INPUT_CLASS =
  "w-full font-custom dark:text-slate-500 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md pr-3 pl-3 py-[14px] transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm focus:shadow";

const toPersianDateObject = (isoString) => {
  if (!isoString) return null;
  try {
    const gregorianDate = new DateObject({
      date: isoString,
      format: "YYYY-MM-DD",
      calendar: gregorianCalendar,
    });
    return gregorianDate.convert(persianCalendar, DARI_LOCALE);
  } catch {
    return null;
  }
};

const toIsoString = (dateObject) => {
  if (!dateObject) return "";
  try {
    const clone = new DateObject(dateObject).convert(gregorianCalendar);
    return clone.format("YYYY-MM-DD");
  } catch (error) {
    return "";
  }
};

const JalaliDatePicker = ({
  label,
  value,
  onChange,
  placeholder = "YYYY/MM/DD",
  className = "",
  error: errorMessage,
  position,
  disabled,
  clearable = true,
  name,
}) => {
  const [selectedDate, setSelectedDate] = useState(() =>
    toPersianDateObject(value)
  );

  useEffect(() => {
    setSelectedDate(toPersianDateObject(value));
  }, [value]);

  const handleChange = (value) => {
    if (Array.isArray(value)) {
      setSelectedDate(null);
      onChange?.("");
      return;
    }

    if (!value) {
      setSelectedDate(null);
      onChange?.("");
      return;
    }

    let dateObject;

    if (value instanceof DateObject) {
      dateObject = value;
    } else if (typeof value === "string") {
      try {
        dateObject = new DateObject({
          date: toEnglishDigits(value),
          format: "YYYY/MM/DD",
          calendar: persianCalendar,
          locale: DARI_LOCALE,
        });
      } catch {
        dateObject = null;
      }
    } else {
      dateObject = null;
    }

    if (!dateObject) {
      setSelectedDate(null);
      onChange?.("");
      return;
    }

    setSelectedDate(dateObject);
    const isoString = toIsoString(dateObject);
    onChange?.(isoString);
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange?.("");
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label
          className="text-[12px] font-medium text-gray-700"
          htmlFor={name}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <DatePicker
          value={selectedDate}
          onChange={handleChange}
          calendar={persianCalendar}
          locale={DARI_LOCALE}
          inputClass={
            "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm  px-3 py-1.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
          }
          placeholder={placeholder}
          format="YYYY/MM/DD"
          calendarPosition={position || "bottom-center"}
          fixMainPosition
          disabled={disabled}
          name={name}
        />
        {clearable && !disabled && selectedDate && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2/4 -translate-y-2/4 left-0  flex items-center text-gray-400 hover:text-gray-600"
            aria-label="پاک کردن تاریخ"
          >
            <BiX />
          </button>
        )}
      </div>
      {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
    </div>
  );
};

export default JalaliDatePicker;
