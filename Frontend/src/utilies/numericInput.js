import { toEnglishDigits } from "./helper";

/**
 * Normalize typed/pasted value to Western digits for storage and parsing.
 * @param {string} value
 * @param {{ allowDecimal?: boolean, maxDecimals?: number }} options
 */
export function sanitizeNumericString(value, options = {}) {
  const { allowDecimal = true, maxDecimals } = options;
  let s = toEnglishDigits(String(value ?? ""));
  s = s.replace(/,/g, "").replace(/\s/g, "");

  if (!allowDecimal) {
    return s.replace(/\D/g, "");
  }

  s = s.replace(/[^\d.]/g, "");
  const dotIndex = s.indexOf(".");
  if (dotIndex !== -1) {
    const intPart = s.slice(0, dotIndex);
    let fracPart = s.slice(dotIndex + 1).replace(/\./g, "");
    if (maxDecimals != null) {
      fracPart = fracPart.slice(0, maxDecimals);
    }
    s = fracPart.length > 0 ? `${intPart}.${fracPart}` : `${intPart}.`;
    if (intPart === "" && s === ".") return ".";
  }

  return s;
}

/** React Hook Form setValueAs: string field → number | undefined | null */
export function numericSetValueAs(options = {}) {
  const { allowDecimal = true, emptyAs = undefined } = options;
  return (value) => {
    const s = sanitizeNumericString(value, { allowDecimal });
    if (s === "" || s === ".") return emptyAs;
    const n = Number(s);
    return Number.isFinite(n) ? n : emptyAs;
  };
}

/** Default register rules for numeric text inputs */
export function numericRegisterOptions(options = {}) {
  const { allowDecimal = true, emptyAs = undefined, ...rules } = options;
  return {
    ...rules,
    setValueAs:
      rules.setValueAs ?? numericSetValueAs({ allowDecimal, emptyAs }),
  };
}

export function getNumericInputProps(options = {}) {
  const { allowDecimal = true, className, style, ...rest } = options;
  return {
    type: "text",
    inputMode: allowDecimal ? "decimal" : "numeric",
    dir: "ltr",
    autoComplete: "off",
    "data-numeric-input": "true",
    onWheel: (e) => e.target.blur(),
    className,
    style: { textAlign: "right", direction: "ltr", ...style },
    ...rest,
  };
}

/**
 * Spread on <input> with react-hook-form register().
 * @example
 * <input {...registerNumeric('paidAmount', register, { validate: ... })} className="..." />
 */
export function registerNumeric(name, register, rules = {}, options = {}) {
  const { allowDecimal = true, maxDecimals, ...inputOptions } = options;
  const { onChange, onBlur, ref, ...field } = register(
    name,
    numericRegisterOptions({ allowDecimal, ...rules })
  );

  return {
    ...field,
    ...getNumericInputProps({ allowDecimal, ...inputOptions }),
    ref,
    onBlur,
    onChange: (e) => {
      e.target.value = sanitizeNumericString(e.target.value, {
        allowDecimal,
        maxDecimals,
      });
      onChange(e);
    },
  };
}

/**
 * Controlled numeric input props (value + onChange).
 */
export function bindNumericControlled({
  value,
  onChange,
  allowDecimal = true,
  maxDecimals,
  ...inputOptions
}) {
  return {
    ...getNumericInputProps({ allowDecimal, ...inputOptions }),
    value: value ?? "",
    onChange: (e) => {
      e.target.value = sanitizeNumericString(e.target.value, {
        allowDecimal,
        maxDecimals,
      });
      onChange?.(e);
    },
  };
}
