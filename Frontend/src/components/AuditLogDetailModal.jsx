import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUturnLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import GloableModal from "./GloableModal";
import {
  formatAuditScalar,
  getAuditDisplayEntries,
  getChangedAuditFields,
  pickAuditFields,
} from "../utilies/auditLogDisplay";
import {
  FIELD_TABLE_TONE,
  getOperationBadgeClass,
} from "../utilies/auditLogUi";

const OPERATION_ICONS = {
  INSERT: PlusCircleIcon,
  UPDATE: PencilSquareIcon,
  DELETE: TrashIcon,
  RESTORE: ArrowUturnLeftIcon,
  PERMANENT_DELETE: TrashIcon,
};

function MetaItem({ icon: Icon, label, value, valueClassName = "" }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-amber-50 text-amber-700 ring-1 ring-amber-100">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p
          className={`mt-0.5 text-sm font-medium text-slate-900 truncate ${valueClassName}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function AuditFieldTable({
  title,
  tone = "neutral",
  entries,
  valueHeader,
  translateFieldName,
  renderValue,
}) {
  if (!entries.length) return null;

  const styles = FIELD_TABLE_TONE[tone] || FIELD_TABLE_TONE.neutral;

  return (
    <div
      className={`rounded-sm border shadow-sm overflow-hidden ${styles.wrap}`}
    >
      {title && (
        <div
          className={`flex items-center gap-2 border-r-4 px-4 py-2.5 bg-slate-50/60 border-b border-slate-100 ${styles.titleBar}`}
        >
          <h4 className={`text-sm font-semibold ${styles.title}`}>{title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className={styles.head}>
              <th className="px-4 py-2.5 text-right font-semibold text-xs">
                {translateFieldName("__fieldHeader")}
              </th>
              <th className="px-4 py-2.5 text-right font-semibold text-xs">
                {valueHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map(([key, value]) => (
              <tr key={key} className={`transition-colors ${styles.row}`}>
                <td
                  className={`px-4 py-2.5 font-medium text-xs whitespace-nowrap ${styles.field}`}
                >
                  {translateFieldName(key)}
                </td>
                <td className={`px-4 py-2.5 text-sm ${styles.value}`}>
                  {renderValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogDetailModal({ open, setOpen, log, formatTimeAgo }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "fa" ? "fa-AF" : "ps-AF";

  const translateFieldName = useCallback(
    (fieldName) => {
      if (fieldName === "__fieldHeader") return t("dashboard.thField");
      return t(`dashboard.fields.${fieldName}`, { defaultValue: fieldName });
    },
    [t]
  );

  const getOperationLabel = useCallback(
    (operation) =>
      t(`dashboard.operations.${operation}`, { defaultValue: operation }),
    [t]
  );

  const getTableLabel = useCallback(
    (tableName) =>
      t(`dashboard.tables.${tableName}`, { defaultValue: tableName || "—" }),
    [t]
  );

  const renderValue = useCallback(
    (value, depth = 0) => {
      if (value === null || value === undefined || value === "") {
        return (
          <span className="text-slate-400 italic text-xs">
            {t("dashboard.render.emptyValue")}
          </span>
        );
      }

      if (typeof value === "object") {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return (
              <span className="text-slate-400 italic text-xs">
                {t("dashboard.render.emptyValue")}
              </span>
            );
          }
          return (
            <div className="space-y-1.5">
              {value.map((item, index) => (
                <div
                  key={index}
                  className="border-r-2 border-amber-200 pr-2 text-xs"
                >
                  {renderValue(item, depth + 1)}
                </div>
              ))}
            </div>
          );
        }

        const nestedEntries = getAuditDisplayEntries(value);
        if (nestedEntries.length === 0) {
          return (
            <span className="text-slate-400 italic text-xs">
              {t("dashboard.render.emptyValue")}
            </span>
          );
        }

        return (
          <div className="rounded-sm bg-amber-50/40 p-2.5 ring-1 ring-amber-100/80 space-y-1.5">
            {nestedEntries.map(([key, val]) => (
              <div key={key} className="text-xs leading-relaxed">
                <span className="font-semibold text-amber-900/80">
                  {translateFieldName(key)}:
                </span>{" "}
                <span className="text-slate-800">{renderValue(val, depth + 1)}</span>
              </div>
            ))}
          </div>
        );
      }

      const formatted = formatAuditScalar(value, locale);
      return <span className="text-slate-800">{formatted ?? String(value)}</span>;
    },
    [locale, t, translateFieldName]
  );

  const changedKeys = useMemo(() => {
    if (!log) return [];
    if (log.operation === "UPDATE" || log.operation === "RESTORE") {
      return getChangedAuditFields(log.oldData, log.newData);
    }
    return [];
  }, [log]);

  const insertEntries = useMemo(() => {
    if (!log?.newData || log.operation !== "INSERT") return [];
    return getAuditDisplayEntries(log.newData);
  }, [log]);

  const deleteEntries = useMemo(() => {
    if (!log?.oldData || log.operation !== "DELETE") return [];
    return getAuditDisplayEntries(log.oldData);
  }, [log]);

  const updateOldEntries = useMemo(() => {
    if (!log?.oldData || !changedKeys.length) return [];
    return Object.entries(pickAuditFields(log.oldData, changedKeys));
  }, [log, changedKeys]);

  const updateNewEntries = useMemo(() => {
    if (!log?.newData || !changedKeys.length) return [];
    return Object.entries(pickAuditFields(log.newData, changedKeys));
  }, [log, changedKeys]);

  if (!log) return null;

  const OperationIcon = OPERATION_ICONS[log.operation] || DocumentTextIcon;

  return (
    <GloableModal open={open} setOpen={setOpen} isClose={true}>
      <div className="w-[min(100vw-1.5rem,52rem)] rounded-sm border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-l from-amber-600 to-amber-700 px-5 py-4 text-white shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-amber-100/90 text-xs font-medium uppercase tracking-wider mb-1">
                {t("dashboard.auditDetailTitle")}
              </p>
              <h3 className="text-lg font-bold truncate">
                {getTableLabel(log.tableName)}
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${getOperationBadgeClass(log.operation)}`}
            >
              <OperationIcon className="h-4 w-4 shrink-0" />
              {getOperationLabel(log.operation)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-amber-50/95">
            <span className="inline-flex items-center gap-1">
              <UserIcon className="h-4 w-4 opacity-80" />
              {log.changedBy || "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-4 w-4 opacity-80" />
              {formatTimeAgo(log.changedAt)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetaItem
              icon={DocumentTextIcon}
              label={t("dashboard.labelTable")}
              value={getTableLabel(log.tableName)}
            />
            <MetaItem
              icon={OperationIcon}
              label={t("dashboard.labelOperationType")}
              value={getOperationLabel(log.operation)}
            />
            <MetaItem
              icon={UserIcon}
              label={t("dashboard.labelChangedBy")}
              value={log.changedBy || "—"}
            />
            <MetaItem
              icon={ClockIcon}
              label={t("dashboard.labelChangedAt")}
              value={formatTimeAgo(log.changedAt)}
            />
          </div>

          <div className="rounded-sm border border-amber-200/70 bg-amber-50/60 px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70 mb-1">
              {t("dashboard.labelReason")}
            </p>
            <p className="text-sm text-slate-800 leading-relaxed">
              {log.reason || t("dashboard.noReason")}
            </p>
          </div>

          {log.operation === "INSERT" && (
            <AuditFieldTable
              title={t("dashboard.newRowsTitle")}
              tone="new"
              entries={insertEntries}
              valueHeader={t("dashboard.thValue")}
              translateFieldName={translateFieldName}
              renderValue={renderValue}
            />
          )}

          {log.operation === "DELETE" && (
            <AuditFieldTable
              title={t("dashboard.deletedRowsTitle")}
              tone="old"
              entries={deleteEntries}
              valueHeader={t("dashboard.thDeletedValue")}
              translateFieldName={translateFieldName}
              renderValue={renderValue}
            />
          )}

          {(log.operation === "UPDATE" || log.operation === "RESTORE") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-500 px-2">
                  {log.operation === "RESTORE"
                    ? t("dashboard.restoreCompareTitle")
                    : t("dashboard.compareTitle")}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {changedKeys.length === 0 ? (
                <p className="text-sm text-slate-600 bg-white rounded-sm border border-slate-200 px-4 py-3 text-center shadow-sm">
                  {t("dashboard.noVisibleChanges")}
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <AuditFieldTable
                    title={t("dashboard.oldBlockTitle")}
                    tone="old"
                    entries={updateOldEntries}
                    valueHeader={t("dashboard.thOldValue")}
                    translateFieldName={translateFieldName}
                    renderValue={renderValue}
                  />
                  <AuditFieldTable
                    title={t("dashboard.newBlockTitle")}
                    tone="new"
                    entries={updateNewEntries}
                    valueHeader={t("dashboard.thNewValue")}
                    translateFieldName={translateFieldName}
                    renderValue={renderValue}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-sm hover:bg-slate-50 transition-colors"
          >
            {t("dashboard.close")}
          </button>
        </div>
      </div>
    </GloableModal>
  );
}

export default AuditLogDetailModal;
export { getOperationBadgeClass };
