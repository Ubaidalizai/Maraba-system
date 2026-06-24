import { FaUserTag } from "react-icons/fa";
import { BsFillEyeFill } from "react-icons/bs";
import { FiEdit } from "react-icons/fi";
import { MdDelete } from "react-icons/md";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GloableModal from "../components/GloableModal";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableHeader from "../components/TableHeader";
import TableRow from "../components/TableRow";
import {
  useProduct,
  useInventoryStats,
  useStockTransfers,
  useStockTransferDelete,
} from "../services/useApi";
import Product from "./Product";
import Store from "./Store";
import Warehouse from "./Warehouse";
import LowStock from "./LowStock";
import ExpiringStock from "./ExpiringStock";
import { BiLoaderAlt } from "react-icons/bi";
import Confirmation from "../components/Confirmation";
import { useSearchParams } from "react-router-dom";
import Employee from "../components/Employee";
import StockDamagePanel from "../components/StockDamagePanel";
import { TrashIcon } from "lucide-react";
import { ArchiveBoxXMarkIcon } from "@heroicons/react/24/outline";

import { formatJalaliDate } from "../utilies/helper";

const EASTERN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

const Inventory = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openConfirm, setOpenConfirm] = useState(false);
  const { isLoading: isLoadingProducts } = useProduct();
  const { mutate: deleteStockTransfer, isPending: isDeleting } =
    useStockTransferDelete();
  const [id, setIds] = useState();
  const { data: inventoryStats, isLoading: isStatsLoading } =
    useInventoryStats();

  const toLocalizedNumber = (num) => {
    const raw = String(num ?? "");
    return raw.replace(/\d/g, (d) => EASTERN_DIGITS[d]);
  };

  const formatTransferDate = formatJalaliDate;

  const transferTableHeaders = useMemo(
    () => [
      { title: t("inventory.transfer.headers.item") },
      { title: t("inventory.transfer.headers.quantity") },
      { title: t("inventory.transfer.headers.toLocation") },
      { title: t("inventory.transfer.headers.date") },
      { title: t("inventory.transfer.headers.employee") },
      { title: t("inventory.transfer.headers.actions") },
    ],
    [t]
  );

  const locationLabel = (loc) =>
    loc
      ? t(`inventory.locations.${String(loc).toLowerCase()}`, {
          defaultValue: String(loc),
        })
      : "";
  const handleDelete = () => {
    deleteStockTransfer(id);
    setOpenConfirm(false);
  };

  const [activeTab, setActiveTab] = useState("all");

  // Stock transfer history
  const { data: transferHistoryData } = useStockTransfers();

  // Use backend stats
  const stats = inventoryStats?.data || {
    totalProducts: 0,
    warehouse: { totalQuantity: 0, totalValue: 0, uniqueProducts: 0 },
    store: { totalQuantity: 0, totalValue: 0, uniqueProducts: 0 },
    lowStockItems: 0,
    expiringAlertCount: 0,
  };
  useEffect(
    function () {
      activeTab === "warehouse"
        ? searchParams.set("location", "warehouse")
        : searchParams.delete("location");
      setSearchParams(searchParams);
    },
    [activeTab, searchParams, setSearchParams]
  );
  if (isLoadingProducts || isStatsLoading)
    return (
      <div className="w-full h-full flex justify-center items-center">
        <BiLoaderAlt className=" text-2xl animate-spin" />
      </div>
    );
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("inventory.title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("inventory.subtitle")}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("inventory.stats.allProducts")}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {toLocalizedNumber(stats.totalProducts)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("inventory.stats.warehouseStock")}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {toLocalizedNumber(stats.warehouse.totalQuantity)}
              </p>
              <p className="text-sm text-gray-500">
                {t("inventory.stats.productCount", {
                  count: toLocalizedNumber(stats.warehouse.uniqueProducts),
                })}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <BuildingOffice2Icon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("inventory.stats.storeStock")}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {toLocalizedNumber(stats.store.totalQuantity)}
              </p>
              <p className="text-sm text-gray-500">
                {t("inventory.stats.productCount", {
                  count: toLocalizedNumber(stats.store.uniqueProducts),
                })}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <BuildingStorefrontIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab("lowStock")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("lowStock");
            }
          }}
          className="bg-white rounded-lg border border-gray-200 p-6 text-left cursor-pointer hover:border-amber-300 hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("inventory.stats.lowStock")}
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {toLocalizedNumber(stats.lowStockItems)}
              </p>
              <p className="text-sm text-gray-500">
                {t("inventory.stats.needPurchase")}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab("expiring")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("expiring");
            }
          }}
          className="bg-white rounded-lg border border-gray-200 p-6 text-left cursor-pointer hover:border-orange-300 hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("inventory.stats.expiring")}
              </p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {toLocalizedNumber(stats.expiringAlertCount ?? 0)}
              </p>
              <p className="text-sm text-gray-500">
                {t("inventory.stats.expiringHint")}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Table */}
      <div className="bg-white rounded-lg bord border-gray-200/70 ">
        <div className="border-b border-gray-200/70 mb-1 rounded-md">
          <nav className="flex flex-wrap -mb-px gap-x-1">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "all"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t("inventory.tabs.all")}
            </button>
            <button
              onClick={() => setActiveTab("warehouse")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "warehouse"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BuildingOffice2Icon className="h-5 w-5" />
              {t("inventory.tabs.warehouse")}
            </button>
            <button
              onClick={() => setActiveTab("store")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "store"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BuildingStorefrontIcon className="h-5 w-5" />
              {t("inventory.tabs.store")}
            </button>
            <button
              onClick={() => setActiveTab("lowStock")}
              type="button"
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "lowStock"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <ExclamationTriangleIcon className="h-5 w-5" />
              {t("inventory.tabs.lowStock")}
            </button>
            <button
              onClick={() => setActiveTab("expiring")}
              type="button"
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "expiring"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CalendarDaysIcon className="h-5 w-5" />
              {t("inventory.tabs.expiring")}
            </button>
            <button
              onClick={() => setActiveTab("employee")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "employee"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaUserTag className="h-5 w-5" />
              {t("inventory.tabs.seller")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("damage")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "damage"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <ArchiveBoxXMarkIcon className="h-5 w-5" />
              {t("inventory.tabs.damage")}
            </button>
          </nav>
        </div>

        {activeTab === "all" && <Product />}
        {activeTab === "warehouse" && (
          <div className="overflow-x-auto  -mx-6 px-6">
            <Warehouse />
          </div>
        )}
        {activeTab === "store" && (
          <div className="overflow-x-auto  -mx-6 px-6">
            <Store />
          </div>
        )}
        {activeTab === "lowStock" && (
          <div className="overflow-x-auto -mx-6 px-6">
            <LowStock />
          </div>
        )}
        {activeTab === "expiring" && (
          <div className="overflow-x-auto -mx-6 px-6">
            <ExpiringStock />
          </div>
        )}
        {activeTab === "employee" && (
          <div className="overflow-x-auto  -mx-6 px-6">
            <Employee />
          </div>
        )}
        {activeTab === "damage" && (
          <div className="overflow-x-auto -mx-6 px-6">
            <StockDamagePanel />
          </div>
        )}
      </div>

      {/* Stock Transfer History */}
      {activeTab !== "all" &&
        activeTab !== "lowStock" &&
        activeTab !== "expiring" &&
        activeTab !== "damage" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowPathIcon className="h-6 w-6 text-amber-600" />
            {t("inventory.transfer.title")}
          </h3>
          <div className="overflow-x-auto h-auto -mx-6 px-6 ">
            <Table>
              <TableHeader headerData={transferTableHeaders} />
              <TableBody>
                {transferHistoryData?.data
                  ?.filter((transfer) => {
                    // Filter out soft-deleted transfers
                    if (transfer.isDeleted === true) return false;

                    if (activeTab === "store") {
                      return transfer.fromLocation?.toLowerCase() === "store";
                    } else if (activeTab === "warehouse") {
                      return (
                        transfer.fromLocation?.toLowerCase() === "warehouse"
                      );
                    } else if (activeTab === "employee") {
                      return (
                        transfer.fromLocation?.toLowerCase() === "employee"
                      );
                    }
                    return true; // Show all for "all" tab
                  })
                  ?.map((transfer) => (
                    <TableRow key={transfer._id}>
                      <TableColumn>
                        {transfer.product?.name ||
                          t("inventory.transfer.notAvailable")}
                      </TableColumn>
                      <TableColumn>
                        {toLocalizedNumber(transfer.quantity)}{" "}
                        {transfer.unit?.name || ""}
                      </TableColumn>

                      <TableColumn>
                        <div
                          className={` ${
                            transfer.toLocation === "warehouse"
                              ? "text-purple-600"
                              : "text-blue-600"
                          } ${
                            transfer.toLocation === "store"
                              ? "text-green-600"
                              : ""
                          } w-fit`}
                        >
                          <p
                            className={`p-1  ${
                              transfer.toLocation === "warehouse"
                                ? "bg-purple-300/50"
                                : " bg-blue-100/50"
                            }  ${
                              transfer.toLocation === "store"
                                ? "bg-green-100/50"
                                : ""
                            } rounded-full px-2`}
                          >
                            {locationLabel(transfer.toLocation)}
                          </p>
                        </div>
                      </TableColumn>
                      <TableColumn>
                        {formatTransferDate(transfer?.transferDate)}
                      </TableColumn>
                      <TableColumn>
                        {transfer.transferredBy?.name ||
                          transfer.transferredBy.email}
                      </TableColumn>
                      <TableColumn>
                        <div className=" w-full flex  justify-center items-center">
                          <button
                            className=" rounded-full p-1.5 hover:bg-red-100 transition-all duration-100 "
                            onClick={() => {
                              setIds(transfer?._id);
                              setOpenConfirm(true);
                            }}
                          >
                            <MdDelete className=" text-lg text-red-500 " />
                          </button>
                        </div>
                      </TableColumn>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <GloableModal
              open={openConfirm}
              setOpen={setOpenConfirm}
              isClose={true}
            >
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <TrashIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t("inventory.delete.title")}
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    {t("inventory.delete.message")}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setOpenConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      {t("inventory.delete.cancel")}
                    </button>
                    <button
                      onClick={() => {
                        handleDelete();
                      }}
                      disabled={isDeleting}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting
                        ? t("inventory.delete.deleting")
                        : t("inventory.delete.confirm")}
                    </button>
                  </div>
                </div>
              </div>
            </GloableModal>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
