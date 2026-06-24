import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BiLoaderAlt } from "react-icons/bi";
import SearchInput from "../components/SearchInput";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import TableRow from "../components/TableRow";
import Pagination from "../components/Pagination";
import { useWarehouseStocks, useStoreStocks } from "../services/useApi";
import { formatNumber } from "../utilies/helper";
import { computeInventoryStockLevel } from "../utilies/stockStatus";

const statusBadgeClass = {
  out: "bg-red-100 text-red-800 border border-red-200",
  critical: "bg-orange-100 text-orange-800 border border-orange-200",
  low: "bg-yellow-100 text-yellow-800 border border-yellow-200",
};

function LowStock() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchWarehouse = locationFilter === "all" || locationFilter === "warehouse";
  const fetchStore = locationFilter === "all" || locationFilter === "store";

  const { data: warehouseData, isLoading: whLoading } = useWarehouseStocks({
    search,
    includeZeroQuantity: false,
    enabled: fetchWarehouse,
  });
  const { data: storeData, isLoading: stLoading } = useStoreStocks({
    search,
    includeZeroQuantity: true,
    enabled: fetchStore,
  });

  const isLoading =
    (fetchWarehouse && whLoading) || (fetchStore && stLoading);

  const headers = useMemo(
    () => [
      { title: t("inventory.lowStock.table.product") },
      { title: t("inventory.lowStock.table.batch") },
      { title: t("inventory.lowStock.table.location") },
      { title: t("inventory.lowStock.table.quantity") },
      { title: t("inventory.lowStock.table.unit") },
      { title: t("inventory.lowStock.table.minLevel") },
      { title: t("inventory.lowStock.table.status") },
    ],
    [t]
  );

  const mergedWithAlerts = useMemo(() => {
    const wh = warehouseData?.data || warehouseData || [];
    const st = storeData?.data || storeData || [];
    const rows = [
      ...(fetchWarehouse
        ? (Array.isArray(wh) ? wh : []).map((r) => ({
            ...r,
            location: r.location || "warehouse",
          }))
        : []),
      ...(fetchStore
        ? (Array.isArray(st) ? st : []).map((r) => ({
            ...r,
            location: r.location || "store",
          }))
        : []),
    ];

    return rows
      .map((row) => {
        const minLevel = row.minLevel ?? 0;
        const level = computeInventoryStockLevel(row.quantity, minLevel);
        return { ...row, alertLevel: level };
      })
      .filter((row) => row.alertLevel !== "normal")
      .filter(
        (row) =>
          row.location !== "warehouse" || row.alertLevel !== "out"
      );
  }, [warehouseData, storeData, fetchWarehouse, fetchStore]);

  const filteredRows = useMemo(() => {
    let list = mergedWithAlerts;
    if (locationFilter !== "all") {
      list = list.filter((r) => r.location === locationFilter);
    }
    if (levelFilter !== "all") {
      list = list.filter((r) => r.alertLevel === levelFilter);
    }
    return list;
  }, [mergedWithAlerts, levelFilter, locationFilter]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const pageRows = filteredRows.slice(start, start + limit);

  const setSearchAndResetPage = (value) => {
    setSearch(value);
    setPage(1);
  };

  const setLevelAndResetPage = (value) => {
    setLevelFilter(value);
    setPage(1);
  };

  const setLocationAndResetPage = (value) => {
    setLocationFilter(value);
    setPage(1);
  };

  const locationFilterKeys = ["all", "warehouse", "store"];

  return (
    <section>
      <div className="w-full flex flex-col gap-3 md:flex-row md:items-end md:justify-between py-3 my-1.5 border border-slate-200 bg-white rounded-md px-3">
        <div className="flex-1 min-w-0 max-w-md">
          <SearchInput
            placeholder={t("inventory.lowStock.searchPlaceholder")}
            value={search}
            onChange={(e) =>
              setSearchAndResetPage(e?.target ? e.target.value : e)
            }
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="low-stock-location-filter"
              className="text-sm text-gray-600 whitespace-nowrap"
            >
              {t("inventory.lowStock.locationFilterLabel")}
            </label>
            <select
              id="low-stock-location-filter"
              value={locationFilter}
              onChange={(e) => setLocationAndResetPage(e.target.value)}
              className="min-w-[9rem] px-3 py-1.5 rounded-sm text-sm font-medium border border-gray-300 bg-white text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {locationFilterKeys.map((key) => (
                <option key={key} value={key}>
                  {key === "all"
                    ? t("inventory.lowStock.filters.all")
                    : t(`inventory.locations.${key}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {t("inventory.lowStock.filterLabel")}
            </span>
            {(["all", "low", "critical", "out"]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setLevelAndResetPage(key)}
                className={`px-3 py-1.5 rounded-sm text-sm font-medium border transition-colors ${
                  levelFilter === key
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t(`inventory.lowStock.filters.${key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Table>
        <TableHeader headerData={headers} />
        <TableBody>
          {isLoading ? (
            <TableRow key="loading">
              <TableColumn colSpan={headers.length} className="text-center">
                <div className="w-full h-[120px] flex justify-center items-center">
                  <BiLoaderAlt className="text-2xl animate-spin text-amber-600" />
                </div>
              </TableColumn>
            </TableRow>
          ) : pageRows.length === 0 ? (
            <TableRow>
              <TableColumn
                colSpan={headers.length}
                className="text-center py-10 text-gray-500"
              >
                {t("inventory.lowStock.empty")}
              </TableColumn>
            </TableRow>
          ) : (
            pageRows.map((row) => (
              <TableRow key={row._id}>
                <TableColumn>
                  {row?.product?.name || row?.product || "—"}
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
                <TableColumn>{row?.unit?.name || row?.unit || "—"}</TableColumn>
                <TableColumn>{formatNumber(row?.minLevel ?? 0)}</TableColumn>
                <TableColumn>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusBadgeClass[row.alertLevel] ||
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {t(`inventory.lowStock.status.${row.alertLevel}`)}
                  </span>
                </TableColumn>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && total > 0 && (
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

export default LowStock;
