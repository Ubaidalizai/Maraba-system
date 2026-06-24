/** Shared palette and chart tokens for Reports page */

export const reportColors = {
  sales: "#228B22",
  purchases: "#DAA520",
  expenses: "#DC143C",
  moneyIn: "#228B22",
  moneyOut: "#DC143C",
  paid: "#4682B4",
  due: "#DC143C",
  profit: "#059669",
  profitNegative: "#DC143C",
  accounts: "#4682B4",
  inventory: "#577671",
};

export const chartTokens = {
  grid: "#e2e8f0",
  axis: "#64748b",
  tooltipBg: "#ffffff",
  tooltipBorder: "#f1f5f9",
  tooltipText: "#1e293b",
  tooltipMuted: "#64748b",
};

/** Tailwind classes for report type card icon tints */
export const reportTypeTints = {
  sales: { bg: "bg-green-100", text: "text-green-700", active: "border-green-500" },
  inventory: { bg: "bg-palm-100", text: "text-palm-400", active: "border-palm-300" },
  purchases: { bg: "bg-amber-100", text: "text-amber-700", active: "border-amber-500" },
  accounts: { bg: "bg-blue-100", text: "text-blue-700", active: "border-blue-500" },
  expenses: { bg: "bg-red-100", text: "text-red-700", active: "border-red-500" },
  profit: { bg: "bg-emerald-100", text: "text-emerald-700", active: "border-emerald-500" },
};

/** Tailwind classes for summary KPI icon boxes */
export const summaryTints = {
  green: { bg: "bg-green-100", text: "text-green-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  red: { bg: "bg-red-100", text: "text-red-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
};
