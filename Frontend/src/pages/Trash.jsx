import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import Table from "../components/Table";
import TableHeader from "../components/TableHeader";
import TableBody from "../components/TableBody";
import TableRow from "../components/TableRow";
import TableColumn from "../components/TableColumn";
import Pagination from "../components/Pagination";
import {
  TRASH_TYPES,
  fetchTrashItems,
  fetchTrashSummary,
  permanentDeleteTrashItem,
  restoreTrashItem,
} from "../utilies/trashApi";
import { invalidateQueriesForTrashRestore } from "../services/useApi";
import { formatNumber, formatJalaliDate } from "../utilies/helper";

function formatTrashDate(value) {
  return formatJalaliDate(value);
}

function Trash() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [selectedType, setSelectedType] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["trashSummary"],
    queryFn: fetchTrashSummary,
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["trashItems", selectedType, page, limit],
    queryFn: () => fetchTrashItems({ type: selectedType, page, limit }),
  });

  const invalidateTrash = () => {
    queryClient.invalidateQueries({ queryKey: ["trashSummary"] });
    queryClient.invalidateQueries({ queryKey: ["trashItems"] });
  };

  const restoreMutation = useMutation({
    mutationFn: ({ type, id }) => restoreTrashItem(type, id),
    onSuccess: (_data, { type, id }) => {
      toast.success(t("trash.toast.restoreSuccess"));
      invalidateTrash();
      void invalidateQueriesForTrashRestore(queryClient, type, id);
    },
    onError: (err) =>
      toast.error(err.message || t("trash.toast.restoreError")),
  });

  const permanentMutation = useMutation({
    mutationFn: ({ type, id }) => permanentDeleteTrashItem(type, id),
    onSuccess: (_data, { type, id }) => {
      toast.success(t("trash.toast.permanentSuccess"));
      invalidateTrash();
      void invalidateQueriesForTrashRestore(queryClient, type, id);
    },
    onError: (err) =>
      toast.error(err.message || t("trash.toast.permanentError")),
  });

  const summaryRows = summaryData?.data || [];
  const totalTrash = summaryData?.total || 0;

  const typeOptions = useMemo(() => {
    const counts = Object.fromEntries(
      summaryRows.map((row) => [row.type, row.count])
    );
    const allOption = {
      type: "all",
      count: totalTrash,
      label: t("trash.types.all"),
    };
    const byType = TRASH_TYPES.map((type) => ({
      type,
      count: counts[type] || 0,
      label: t(`trash.types.${type}`, type),
    }));
    return [allOption, ...byType];
  }, [summaryRows, totalTrash, t]);

  const headers = useMemo(
    () => [
      { title: t("trash.table.name") },
      { title: t("trash.table.details") },
      { title: t("trash.table.type") },
      { title: t("trash.table.recordDate") },
      { title: t("trash.table.deletedAt") },
      { title: t("trash.table.deletedBy") },
      { title: t("trash.table.actions") },
    ],
    [t]
  );

  const handleRestore = (type, id) => {
    if (window.confirm(t("trash.confirmRestore"))) {
      restoreMutation.mutate({ type, id });
    }
  };

  const handlePermanent = (type, id) => {
    if (window.confirm(t("trash.confirmPermanent"))) {
      permanentMutation.mutate({ type, id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("trash.title")}</h1>
          <p className="text-sm text-gray-500">{t("trash.subtitle")}</p>
        </div>
        {!summaryLoading && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
            {t("trash.totalCount")}:{" "}
            <span className="font-semibold">{formatNumber(totalTrash)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <button
          type="button"
          onClick={() => {
            setSelectedType("all");
            setPage(1);
          }}
          className={`rounded-lg border p-3 text-right transition ${
            selectedType === "all"
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <div className="text-xs text-gray-500">{t("trash.types.all")}</div>
          <div className="text-lg font-bold text-gray-900">
            {formatNumber(totalTrash)}
          </div>
        </button>
        {summaryRows
          .filter((row) => row.count > 0)
          .map((row) => (
            <button
              key={row.type}
              type="button"
              onClick={() => {
                setSelectedType(row.type);
                setPage(1);
              }}
              className={`rounded-lg border p-3 text-right transition ${
                selectedType === row.type
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="text-xs text-gray-500">
                {t(`trash.types.${row.type}`, row.label)}
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatNumber(row.count)}
              </div>
            </button>
          ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4">
          <label className="flex flex-col gap-1 text-sm text-gray-700 sm:flex-row sm:items-center">
            {t("trash.filterType")}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:mr-2"
            >
              {typeOptions.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label} ({formatNumber(opt.count)})
                </option>
              ))}
            </select>
          </label>
        </div>

        <Table>
          <TableHeader headerData={headers} />
          <TableBody>
            {itemsLoading ? (
              <TableRow>
                <TableColumn colSpan={headers.length} className="text-center py-8 text-gray-500">
                  {t("common.loading", "لوډ کېږي...")}
                </TableColumn>
              </TableRow>
            ) : (itemsData?.data || []).length === 0 ? (
              <TableRow>
                <TableColumn colSpan={headers.length} className="text-center py-8 text-gray-500">
                  {selectedType === "all"
                    ? t("trash.emptyAll")
                    : t("trash.empty")}
                </TableColumn>
              </TableRow>
            ) : (
              (itemsData?.data || []).map((row) => (
                <TableRow key={`${row.type}-${row._id}`}>
                  <TableColumn>
                    <span className="font-medium text-gray-900">
                      {row.name || "—"}
                    </span>
                  </TableColumn>
                  <TableColumn>
                    <span className="text-sm text-gray-600 line-clamp-2">
                      {row.summary || "—"}
                    </span>
                  </TableColumn>
                  <TableColumn>
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {t(`trash.types.${row.type}`, row.label)}
                    </span>
                  </TableColumn>
                  <TableColumn>
                    {formatTrashDate(row.recordDate)}
                  </TableColumn>
                  <TableColumn>
                    {formatTrashDate(row.deletedAt)}
                  </TableColumn>
                  <TableColumn>
                    <span className="text-sm text-gray-600">
                      {row.deletedByName || "—"}
                    </span>
                  </TableColumn>
                  <TableColumn>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        title={t("trash.restore")}
                        onClick={() => handleRestore(row.type, row._id)}
                        disabled={restoreMutation.isPending}
                        className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <ArrowPathIcon className="h-3.5 w-3.5" />
                        <span>{t("trash.restore")}</span>
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          title={t("trash.permanentDelete")}
                          onClick={() => handlePermanent(row.type, row._id)}
                          disabled={permanentMutation.isPending}
                          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          <span>{t("trash.permanentDelete")}</span>
                        </button>
                      )}
                    </div>
                  </TableColumn>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {(itemsData?.totalPages || 0) > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={page}
              totalPages={itemsData.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Trash;
