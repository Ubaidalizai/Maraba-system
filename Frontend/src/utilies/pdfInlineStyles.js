/** Inline-only tokens for PDF/html2canvas capture (no Tailwind). */

export const pdfColors = {
  brown: "#8B4513",
  text: "#111827",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  headerBg: "#f9fafb",
  white: "#ffffff",
  green: "#16a34a",
  red: "#dc2626",
  blueBg: "#eff6ff",
  blueBorder: "#bfdbfe",
  blueText: "#1e3a8a",
  rowAlt: "#f9fafb",
};

export const pdfFont = "Arial, Tahoma, sans-serif";

export const cardStyle = (overrides = {}) => ({
  backgroundColor: pdfColors.white,
  border: `1px solid ${pdfColors.border}`,
  borderRadius: "8px",
  padding: "16px",
  ...overrides,
});

export const thStyle = {
  padding: "10px 12px",
  textAlign: "right",
  fontSize: "10px",
  fontWeight: "600",
  color: pdfColors.textMuted,
  textTransform: "uppercase",
  backgroundColor: pdfColors.headerBg,
  borderBottom: `1px solid ${pdfColors.border}`,
};

export const tdStyle = {
  padding: "10px 12px",
  textAlign: "right",
  fontSize: "11px",
  color: pdfColors.text,
  borderBottom: `1px solid ${pdfColors.border}`,
  verticalAlign: "top",
};

const BADGE_MAP = {
  "bg-purple-100 text-purple-800": { backgroundColor: "#f3e8ff", color: "#6b21a8" },
  "bg-blue-100 text-blue-800": { backgroundColor: "#dbeafe", color: "#1e40af" },
  "bg-indigo-100 text-indigo-800": { backgroundColor: "#e0e7ff", color: "#3730a3" },
  "bg-orange-100 text-orange-800": { backgroundColor: "#ffedd5", color: "#9a3412" },
  "bg-teal-100 text-teal-800": { backgroundColor: "#ccfbf1", color: "#115e59" },
  "bg-violet-100 text-violet-800": { backgroundColor: "#ede9fe", color: "#5b21b6" },
  "bg-amber-100 text-amber-800": { backgroundColor: "#fef3c7", color: "#92400e" },
  "bg-rose-100 text-rose-800": { backgroundColor: "#ffe4e6", color: "#9f1239" },
  "bg-gray-100 text-gray-700": { backgroundColor: "#f3f4f6", color: "#374151" },
  "bg-gray-100 text-gray-600": { backgroundColor: "#f3f4f6", color: "#4b5563" },
  "bg-green-100 text-green-800": { backgroundColor: "#dcfce7", color: "#166534" },
  "bg-red-100 text-red-800": { backgroundColor: "#fee2e2", color: "#991b1b" },
};

export const badgeStyle = (badgeClass) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: "9999px",
  fontSize: "10px",
  fontWeight: "500",
  ...(BADGE_MAP[badgeClass] || BADGE_MAP["bg-gray-100 text-gray-700"]),
});

const CARD_BG = {
  "bg-white": pdfColors.white,
  "bg-green-50": "#f0fdf4",
  "bg-red-50": "#fef2f2",
  "bg-gray-50": pdfColors.headerBg,
  "bg-blue-50": pdfColors.blueBg,
};

const CARD_TEXT = {
  "text-gray-900": pdfColors.text,
  "text-gray-600": pdfColors.textMuted,
  "text-green-600": pdfColors.green,
  "text-red-600": pdfColors.red,
  "text-blue-900": pdfColors.blueText,
};

/** Map getBalanceInfo() Tailwind classes to inline card styles. */
export const balanceCardStyles = (balanceInfo) => {
  const bgKey = balanceInfo?.bgColor || "bg-white";
  const colorKey = balanceInfo?.color || "text-gray-900";
  const isBlue = bgKey === "bg-blue-50";
  return {
    backgroundColor: CARD_BG[bgKey] || pdfColors.white,
    border: `1px solid ${isBlue ? pdfColors.blueBorder : pdfColors.border}`,
    valueColor: CARD_TEXT[colorKey] || pdfColors.text,
  };
};
