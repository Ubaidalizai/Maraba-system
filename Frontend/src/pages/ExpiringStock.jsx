import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { PencilIcon } from "@heroicons/react/24/outline";
import { BiLoaderAlt } from "react-icons/bi";
import SearchInput from "../components/SearchInput";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import TableRow from "../components/TableRow";
import Pagination from "../components/Pagination";
import { useExpiringStocks } from "../services/useApi";
import { formatNumber, formatJalaliDate } from "../utilies/helper";

const statusBadgeClass = {
  out: "bg-red-100 text-red-800 border border-red-200",
  critical: "bg-orange-100 text-orange-800 border border-orange-200",
  low: "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

function ExpiringStock() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isFetching } = useExpiringStocks({
    search,
    location: locationFilter,
    status: levelFilter,
    page,
    limit,
  });

  const rows = data?.data || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const headers = useMemo(
    () => [
      { title: t("inventory.expiring.table.product") },
      { title: t("inventory.expiring.table.batch") },
      { title: t("inventory.expiring.table.location") },
      { title: t("inventory.expiring.table.quantity") },
      { title: t("inventory.expiring.table.unit") },
      { title: t("inventory.expiring.table.expiryDate") },
      { title: t("inventory.expiring.table.daysLeft") },
      { title: t("inventory.expiring.table.status") },
    ],
    [t]
  );

  const formatExpiryDate = formatJalaliDate;

  const formatDaysLeft = (daysLeft) => {
    if (daysLeft === null || daysLeft === undefined) return "—";
    if (daysLeft < 0) {
      return t("inventory.expiring.daysExpired", {
        count: Math.abs(daysLeft),
      });
    }
    return t("inventory.expiring.daysRemaining", { count: daysLeft });
  };

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const safePage = Math.min(page, Math.max(1, totalPages));
  const loading = isLoading || isFetching;

  return (
    <section>
      <div className="w-full flex flex-col gap-3 md:flex-row md:items-end md:justify-between py-3 my-1.5 border border-slate-200 bg-white rounded-md px-3">
        <div className="flex-1 min-w-0 max-w-md">
          <SearchInput
            placeholder={t("inventory.expiring.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e?.target ? e.target.value : e);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="expiry-location-filter"
              className="text-sm text-gray-600 whitespace-nowrap"
            >
              {t("inventory.expiring.locationFilterLabel")}
            </label>
            <select
              id="expiry-location-filter"
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(1);
              }}
              className="min-w-[9rem] px-3 py-1.5 rounded-sm text-sm font-medium border border-gray-300 bg-white text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {["all", "warehouse", "store"].map((key) => (
                <option key={key} value={key}>
                  {key === "all"
                    ? t("inventory.expiring.filters.all")
                    : t(`inventory.locations.${key}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {t("inventory.expiring.filterLabel")}
            </span>
            {(["all", "low", "critical", "out"]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setLevelFilter(key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                  levelFilter === key
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t(`inventory.expiring.filters.${key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data?.defaultNotifyDays != null && (
        <p className="text-sm text-gray-500 mb-2 px-1">
          {t("inventory.expiring.notifyHint", {
            days: data.defaultNotifyDays,
          })}
        </p>
      )}

      <Table>
        <TableHeader headerData={headers} />
        <TableBody>
          {loading ? (
            <TableRow key="loading">
              <TableColumn colSpan={headers.length} className="text-center">
                <div className="w-full h-[120px] flex justify-center items-center">
                  <BiLoaderAlt className="text-2xl animate-spin text-amber-600" />
                </div>
              </TableColumn>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableColumn
                colSpan={headers.length}
                className="text-center py-10 text-gray-500"
              >
                {t("inventory.expiring.empty")}
              </TableColumn>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row._id}>
                <TableColumn>
                  {row?.product?.name || "—"}
                </TableColumn>
                <TableColumn>{row?.batchNumber || "DEFAULT"}</TableColumn>
                <TableColumn>
                  {row?.location === "warehouse"
                    ? t("inventory.locations.warehouse")
                    : row?.location === "store"
                      ? t("inventory.locations.store")
                      : row?.location || "—"}
                </TableColumn>
                <TableColumn className="font-semibold">
                  {formatNumber(row?.quantity)}
                </TableColumn>
                <TableColumn>{row?.unit?.name || "—"}</TableColumn>
                <TableColumn>{formatExpiryDate(row?.expiryDate)}</TableColumn>
                <TableColumn>{formatDaysLeft(row?.daysLeft)}</TableColumn>
                <TableColumn>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusBadgeClass[row.alertLevel] ||
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {t(`inventory.expiring.status.${row.alertLevel}`)}
                  </span>
                </TableColumn>
                <TableColumn>
                  {row.purchaseId ? (
                    <button
                      type="button"
                      title={t("inventory.expiring.editPurchase")}
                      onClick={() =>
                        navigate(
                          `/purchases/edit/${row.purchaseId}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 rounded border border-amber-200"
                    >
                      <PencilIcon className="h-4 w-4" />
                      {t("inventory.expiring.editPurchase")}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </TableColumn>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!loading && total > 0 && (
        <div className="mt-2">
          <Pagination
            page={safePage}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onRowsPerPageChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
          />
        </div>
      )}
    </section>
  );
}

export default ExpiringStock;
