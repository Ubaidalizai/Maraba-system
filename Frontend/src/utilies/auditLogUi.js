export const OPERATION_BADGE = {
  INSERT:
    "bg-emerald-50 text-emerald-800 border-emerald-200/80 ring-1 ring-emerald-100",
  UPDATE:
    "bg-amber-50 text-amber-900 border-amber-200/80 ring-1 ring-amber-100",
  DELETE:
    "bg-red-50 text-red-800 border-red-200/80 ring-1 ring-red-100",
  RESTORE:
    "bg-sky-50 text-sky-800 border-sky-200/80 ring-1 ring-sky-100",
  PERMANENT_DELETE:
    "bg-red-50 text-red-900 border-red-300/80 ring-1 ring-red-200",
};

export const getOperationBadgeClass = (operation) =>
  OPERATION_BADGE[operation] ||
  "bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-100";

export const FIELD_TABLE_TONE = {
  neutral: {
    wrap: "bg-white border-slate-200",
    title: "text-slate-800",
    titleBar: "border-amber-500",
    head: "bg-slate-50 text-slate-600",
    row: "hover:bg-amber-50/30",
    field: "text-slate-700 border-slate-100",
    value: "text-slate-900 border-slate-100",
  },
  old: {
    wrap: "bg-white border-red-100",
    title: "text-red-800",
    titleBar: "border-red-400",
    head: "bg-red-50/80 text-red-700",
    row: "hover:bg-red-50/40",
    field: "text-red-900/80 border-red-50",
    value: "text-red-800 border-red-50",
  },
  new: {
    wrap: "bg-white border-emerald-100",
    title: "text-emerald-800",
    titleBar: "border-emerald-400",
    head: "bg-emerald-50/80 text-emerald-700",
    row: "hover:bg-emerald-50/40",
    field: "text-emerald-900/80 border-emerald-50",
    value: "text-emerald-800 border-emerald-50",
  },
};
