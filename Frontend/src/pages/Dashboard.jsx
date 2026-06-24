import {
  ArrowUturnLeftIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import DashboardDailyReport from "../components/DashboardDailyReport";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import Table from "../components/Table";
import TableBody from "../components/TableBody";
import TableColumn from "../components/TableColumn";
import TableRow from "../components/TableRow";
import {
  useRecentTransactions,
  useReverseTransaction,
} from "../services/useApi";
import { useAuditLogsByTable, useAuditLogs } from "../services/useAuditLogs";
import TableHeader from "./../components/TableHeader";
import { formatCurrency, formatJalaliDate } from "./../utilies/helper";
import { isAccountTransactionReversible } from "../utilies/accountTransactionReverse";
import Select from "../components/Select";
import Pagination from "../components/Pagination";
import GloableModal from "../components/GloableModal";
import AuditLogDetailModal from "../components/AuditLogDetailModal";
import { getOperationBadgeClass } from "../utilies/auditLogUi";

const TABLE_FILTER_VALUES = [
  "all",
  "Account",
  "AccountTransaction",
  "AuditLog",
  "Brand",
  "Category",
  "Company",
  "Customer",
  "Employee",
  "EmployeeStock",
  "Expense",
  "Income",
  "Product",
  "Purchase",
  "PurchaseItem",
  "Sale",
  "SaleItem",
  "SaleReturn",
  "Stock",
  "StockTransfer",
  "Supplier",
  "Type",
  "Unit",
  "User",
];

const Dashboard = () => {
  const { t, i18n } = useTranslation();

  const headers = useMemo(
    () => [
      { title: t("dashboard.headers.account") },
      { title: t("dashboard.headers.type") },
      { title: t("dashboard.headers.date") },
      { title: t("dashboard.headers.amount") },
      { title: t("dashboard.headers.reference") },
      { title: t("dashboard.headers.actions") },
    ],
    [t]
  );

  const auditLogHeaders = useMemo(
    () => [
      { title: t("dashboard.auditHeaders.changedAt") },
      { title: t("dashboard.auditHeaders.table") },
      { title: t("dashboard.auditHeaders.reason") },
      { title: t("dashboard.auditHeaders.changedBy") },
      { title: t("dashboard.auditHeaders.operationType") },
      { title: t("dashboard.auditHeaders.details") },
    ],
    [t]
  );

  const tableOptions = useMemo(
    () =>
      TABLE_FILTER_VALUES.map((value) => ({
        value,
        label: t(`dashboard.tables.${value}`),
      })),
    [t]
  );

  const getTableLabel = useCallback(
    (tableName) =>
      t(`dashboard.tables.${tableName}`, { defaultValue: tableName || "—" }),
    [t]
  );

  const getTypeColor = (type) => {
    switch (type) {
      case "Sale":
        return "text-blue-600 ";
      case "Purchase":
        return "text-orange-600  ";
      case "Payment":
        return "text-green-600";
      case "Transfer":
        return "text-purple-600 ";
      case "Expense":
        return "text-red-600";
      case "Credit":
        return "text-green-700 ";
      case "Debit":
        return "text-red-700 ";
      case "SaleReturn":
        return "text-yellow-600 ";
      default:
        return "text-gray-800";
    }
  };

  const getTransactionTypeLabel = useCallback(
    (type) => t(`dashboard.transactionTypes.${type}`, { defaultValue: type }),
    [t]
  );

  const getOperationLabel = useCallback(
    (operation) =>
      t(`dashboard.operations.${operation}`, { defaultValue: operation }),
    [t]
  );

  // API hooks
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionLimit, setTransactionLimit] = useState(10);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState("logs");
  const { data: recentTransactions, isLoading: statsLoading } =
    useRecentTransactions({
      page: currentPage,
      limit: transactionLimit,
      search: transactionSearch,
      sortBy: "date",
      sortOrder: "desc",
    });
  const { mutate: reverseTransaction, isLoading: reverseLoading } =
    useReverseTransaction();

  // Audit logs hooks
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(10);
  const [selectedTable, setSelectedTable] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const allAuditLogs = useAuditLogs({
    page: auditPage,
    limit: auditLimit,
    search: searchTerm,
    sortBy: "changedAt",
    sortOrder: "desc",
  });

  const tableAuditLogs = useAuditLogsByTable(selectedTable, {
    page: auditPage,
    limit: auditLimit,
    search: searchTerm,
    sortBy: "changedAt",
    sortOrder: "desc",
  });
  const tableLogs = selectedTable === "all" ? allAuditLogs : tableAuditLogs;
  const auditLogs = tableLogs.data;
  const auditLoading = tableLogs.isLoading;

  useEffect(() => {
    setAuditPage(1);
  }, [selectedTable]);

  const handleReverseClick = (transaction) => {
    if (transaction && transaction._id && transaction._id !== "undefined") {
      setSelectedTransaction(transaction);
      setShowModal(true);
    }
  };

  const handleConfirmReverse = () => {
    if (reason.trim() && selectedTransaction && selectedTransaction._id) {
      reverseTransaction({ id: selectedTransaction._id, reason });
      setShowModal(false);
      setReason("");
      setSelectedTransaction(null);
    }
  };

  // Format recent transactions from API data

  const formatTimeAgo = useCallback(
    (dateString) => {
      if (!dateString) return t("dashboard.time.unknown");
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

      if (diffInHours < 1) return t("dashboard.time.justNow");
      if (diffInHours < 24)
        return t("dashboard.time.hoursAgo", { count: diffInHours });
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7)
        return t("dashboard.time.daysAgo", { count: diffInDays });
      return formatJalaliDate(date);
    },
    [t]
  );

  return (
    <div
      dir={i18n.dir()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Page header */}
      <div className=" ">
        <h1
          className="font-bold text-xl pb-2"
          style={{
            color: "var(--text-dark)",
          }}
        >
          {t("dashboard.title")}
        </h1>
        <p
          style={{
            color: "var(--text-medium)",
            fontSize: "var(--body-regular)",
          }}
        >
          {t("dashboard.subtitle")}
        </p>
      </div>

      <DashboardDailyReport />

      <div className="bg-white rounded-lg  border border-slate-100">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "logs"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BuildingOffice2Icon className="h-5 w-5" />
              {t("dashboard.tabs.logs")}
            </button>
            <button
              onClick={() => setActiveTab("transaction")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "transaction"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t("dashboard.tabs.transactions")}
            </button>
          </nav>
        </div>
      </div>
      {activeTab === "transaction" && (
        <Fragment>
          {/* Search and Pagination Row */}
          <div className="flex py-3 border border-slate-200 items-center justify-between bg-white rounded-md">
            <div className="relative pr-3">
              <input
                type="text"
                placeholder={t("dashboard.searchTransactions")}
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
                className={`w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm pr-10`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader headerData={headers} />
              <TableBody>
                {statsLoading ? (
                  <TableRow>
                    <TableColumn>
                      <p className="">{t("dashboard.loading")}</p>
                    </TableColumn>
                  </TableRow>
                ) : recentTransactions?.data?.transactions?.length > 0 ? (
                  recentTransactions.data?.transactions?.map(
                    (transaction, index) => (
                      <TableRow key={index}>
                        <TableColumn className="px-4 py-2">
                          {transaction.transactionType === "Transfer" ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-red-600 font-semibold">
                                {t("dashboard.from")}{" "}
                                {transaction.account?.name || t("dashboard.unknown")}
                              </span>
                              <span className="text-green-600 font-semibold">
                                {t("dashboard.to")}{" "}
                                {transaction.pairedAccount?.name ||
                                  t("dashboard.unknown")}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`font-semibold ${
                                (transaction.amount || 0) > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {transaction.account?.name || t("dashboard.unknown")}
                            </span>
                          )}
                        </TableColumn>
                        <TableColumn
                          className={`font-semibold text-center ${getTypeColor(
                            transaction.transactionType
                          )}`}
                        >
                          {getTransactionTypeLabel(
                            transaction.transactionType
                          )}
                        </TableColumn>
                        <TableColumn className="px-4">
                          {formatTimeAgo(transaction.createdAt || transaction.date)}
                        </TableColumn>
                        <TableColumn
                          className={`px-4 font-semibold ${
                            (transaction.amount || 0) > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(Math.abs(transaction.amount || 0))}
                        </TableColumn>
                        <TableColumn className="px-4">
                          {transaction.referenceData ? (
                            <div className="text-sm">
                              {transaction.referenceType === "purchase" &&
                                transaction.referenceData?.reference && (
                                  <span className="text-blue-600">
                                    {transaction.referenceData.reference}
                                  </span>
                                )}
                              {transaction.referenceData.saleNumber && (
                                <span className="text-green-600">
                                  {t("dashboard.refSale")}{" "}
                                  {transaction.referenceData.saleNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableColumn>
                        <TableColumn className="px-4">
                          {isAccountTransactionReversible(transaction) ? (
                            <button
                              onClick={() => handleReverseClick(transaction)}
                              disabled={reverseLoading}
                              className="text-red-500 transition-all duration-200 hover:bg-red-100 p-0.5 rounded-full  hover:text-red-700 disabled:opacity-50"
                              title={t("dashboard.reverseTitle")}
                            >
                              <ArrowUturnLeftIcon className="h-5 w-5" />
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </TableColumn>
                      </TableRow>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      {t("dashboard.noTransactions")}
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
            <div className="w-full  justify-center flex items-center gap-4">
              <Pagination
                page={currentPage}
                limit={transactionLimit}
                total={recentTransactions?.data?.pagination?.total || 0}
                totalPages={
                  recentTransactions?.data?.pagination?.totalPages || 0
                }
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(newLimit) => {
                  setTransactionLimit(newLimit);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </Fragment>
      )}
      {activeTab === "logs" && (
        <Fragment>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 bg-white py-3 px-4 border border-slate-200 rounded-md shadow-sm items-stretch md:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                <div className="flex-1 min-w-[10rem]">
                  <Select
                    label=""
                    id="table-select"
                    options={tableOptions}
                    value={selectedTable}
                    onChange={(value) => setSelectedTable(value)}
                  />
                </div>

                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t("dashboard.searchAudit")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-200 ease focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 hover:border-slate-300 shadow-sm pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-md shadow-sm">
              <Table>
                <TableHeader headerData={auditLogHeaders} />
                <TableBody>
                  {auditLoading ? (
                    <TableRow>
                      <TableColumn colSpan={6}>
                        <p className="py-6 text-center text-slate-500">
                          {t("dashboard.loading")}
                        </p>
                      </TableColumn>
                    </TableRow>
                  ) : auditLogs?.data?.length > 0 ? (
                    auditLogs.data.map((log, index) => (
                      <TableRow
                        key={index}
                        className="hover:bg-amber-50/40 transition-colors"
                      >
                        <TableColumn className="px-4 py-2.5 text-sm text-slate-600 whitespace-nowrap">
                          {formatTimeAgo(log.changedAt)}
                        </TableColumn>
                        <TableColumn className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-sm bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                            {getTableLabel(log.tableName)}
                          </span>
                        </TableColumn>
                        <TableColumn className="px-4 py-2.5 max-w-[14rem]">
                          <p
                            className="text-sm text-slate-600 truncate"
                            title={log.reason || t("dashboard.noReason")}
                          >
                            {log.reason || t("dashboard.noReason")}
                          </p>
                        </TableColumn>
                        <TableColumn className="px-4 py-2.5 text-sm text-slate-700">
                          {log.changedBy || "—"}
                        </TableColumn>
                        <TableColumn className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getOperationBadgeClass(
                              log.operation
                            )}`}
                          >
                            {getOperationLabel(log.operation)}
                          </span>
                        </TableColumn>
                        <TableColumn className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowDetailsModal(true);
                            }}
                            className="inline-flex items-center justify-center rounded-sm p-1.5 text-amber-700 bg-amber-50 ring-1 ring-amber-200/80 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                            title={t("dashboard.viewDetailsTitle")}
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                        </TableColumn>
                      </TableRow>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-slate-500 text-sm"
                      >
                        {t("dashboard.noAuditLogs")}
                      </td>
                    </tr>
                  )}
                </TableBody>
              </Table>
              <div className="w-full flex justify-center items-center py-3 border-t border-slate-100">
                <Pagination
                  page={auditPage}
                  limit={auditLimit}
                  total={auditLogs?.pagination?.total || 0}
                  totalPages={auditLogs?.pagination?.totalPages}
                  onPageChange={setAuditPage}
                  onRowsPerPageChange={(newLimit) => {
                    setAuditLimit(newLimit);
                    setAuditPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </Fragment>
      )}

      <GloableModal open={showModal} setOpen={setShowModal} isClose={true}>
        <div className="bg-white p-6 rounded-lg shadow-lg  lg:w-[500px] w-[350px] mx-4">
          <h3 className="text-lg font-semibold mb-4">
            {t("dashboard.confirmReverseTitle")}
          </h3>
          <p className="mb-4">{t("dashboard.confirmReverseHint")}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            rows="3"
            placeholder={t("dashboard.reasonPlaceholder")}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              {t("dashboard.cancel")}
            </button>
            <button
              onClick={handleConfirmReverse}
              disabled={!reason.trim() || reverseLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {reverseLoading
                ? t("dashboard.processing")
                : t("dashboard.confirmReverse")}
            </button>
          </div>
        </div>
      </GloableModal>

      <AuditLogDetailModal
        open={showDetailsModal}
        setOpen={(open) => {
          setShowDetailsModal(open);
          if (!open) setSelectedLog(null);
        }}
        log={selectedLog}
        formatTimeAgo={formatTimeAgo}
      />
    </div>
  );
};

export default Dashboard;
