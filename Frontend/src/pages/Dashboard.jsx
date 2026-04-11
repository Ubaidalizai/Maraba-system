import {
  ArrowUturnLeftIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import React, { Fragment, useEffect, useState } from "react";
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
import { formatCurrency } from "./../utilies/helper";
import Select from "../components/Select";
import Pagination from "../components/Pagination";
import GloableModal from "../components/GloableModal";

const Dashboard = () => {
  const headers = [
    { title: "حساب" },
    { title: "نوع" },
    { title: "تاریخ" },
    { title: "مبلغ" },
    { title: "مرجع" },
    { title: "عملیات" },
  ];

  // Helper function to translate field names to Dari
  const translateFieldName = (fieldName) => {
    const fieldTranslations = {
      name: "نام",
      quantity: "مقدار",
      price: "قیمت",
      totalAmount: "مجموع مبلغ",
      dueAmount: "مبلغ بدهی",
      paidAmount: "مبلغ پرداخت شده",
      date: "تاریخ",
      description: "توضیحات",
      status: "وضعیت",
      type: "نوع",
      category: "دسته‌بندی",
      brand: "برند",
      supplier: "تامین‌کننده",
      customer: "مشتری",
      employee: "کارمند",
      product: "محصول",
      purchase: "خرید",
      sale: "فروش",
      account: "حساب",
      transactionType: "نوع تراکنش",
      amount: "مبلغ",
      reason: "دلیل",
      changedBy: "تغییر دهنده",
      changedAt: "تاریخ تغییر",
      tableName: "نام جدول",
      operation: "عملیات",
      created_by: "ایجاد کننده",
      updated_by: "به‌روزرسانی کننده",
      // Add more translations as needed
    };
    return fieldTranslations[fieldName] || fieldName;
  };

  // Helper function to filter out ID fields
  const filterDataFields = (data) => {
    if (!data || typeof data !== "object") return data;
    const filtered = {};
    Object.entries(data).forEach(([key, value]) => {
      if (
        !key.toLowerCase().endsWith("id") &&
        !key.toLowerCase().endsWith("_id") &&
        key.toLowerCase() !== "id"
      ) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  // Helper function to render values nicely
  const renderValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-500">خالی</span>;
    }
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return (
          <div className={`ml-${depth * 4} mt-1`}>
            <div className="text-xs text-gray-600 mb-1">
              آرایه ({value.length} آیتم):
            </div>
            {value.map((item, index) => (
              <div key={index} className="border-l-2 border-gray-200 pl-2 mb-1">
                <span className="text-xs text-gray-500">[{index}]:</span>
                {renderValue(item, depth + 1)}
              </div>
            ))}
          </div>
        );
      } else {
        return (
          <div className={`ml-${depth * 4} mt-1`}>
            <div className="text-xs text-gray-600 mb-1">شیء:</div>
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="border-l-2 border-gray-200 pl-2 mb-1">
                <span className="font-medium text-xs">
                  {translateFieldName(key)}:
                </span>
                {renderValue(val, depth + 1)}
              </div>
            ))}
          </div>
        );
      }
    } else {
      return <span className="text-sm">{String(value)}</span>;
    }
  };
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

  const getTransactionTypePersian = (type) => {
    switch (type) {
      case "Sale":
        return "فروش";
      case "Purchase":
        return "خرید";
      case "Payment":
        return "پرداخت";
      case "Transfer":
        return "انتقال";
      case "Expense":
        return "هزینه";
      case "Credit":
        return "اعتبار";
      case "Debit":
        return "بدهی";
      case "SaleReturn":
        return "بازگشت فروش";
      default:
        return type;
    }
  };

  const getOperationPersian = (operation) => {
    switch (operation) {
      case "INSERT":
        return "درج";
      case "UPDATE":
        return "بروزرسانی";
      case "DELETE":
        return "حذف";
      default:
        return operation;
    }
  };

  const getOperationColor = (operation) => {
    switch (operation) {
      case "INSERT":
        return "text-green-600";
      case "UPDATE":
        return "text-yellow-600";
      case "DELETE":
        return "text-red-600";
      default:
        return "text-gray-800";
    }
  };

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

  const tableOptions = [
    { value: "all", label: "همه" },
    { value: "Account", label: "حساب" },
    { value: "AccountTransaction", label: "تراکنش حساب" },
    { value: "AuditLog", label: "لاگ حسابرسی" },
    { value: "Brand", label: "برند" },
    { value: "Category", label: "دسته‌بندی" },
    { value: "Company", label: "شرکت" },
    { value: "Customer", label: "مشتری" },
    { value: "Employee", label: "کارمند" },
    { value: "EmployeeStock", label: "موجودی کارمند" },
    { value: "Expense", label: "هزینه" },
    { value: "Income", label: "درآمد" },
    { value: "Product", label: "محصول" },
    { value: "Purchase", label: "خرید" },
    { value: "PurchaseItem", label: "آیتم خرید" },
    { value: "Sale", label: "فروش" },
    { value: "SaleItem", label: "آیتم فروش" },
    { value: "SaleReturn", label: "بازگشت فروش" },
    { value: "Stock", label: "موجودی" },
    { value: "StockTransfer", label: "انتقال موجودی" },
    { value: "Supplier", label: "تامین‌کننده" },
    { value: "Type", label: "نوع" },
    { value: "Unit", label: "واحد" },
    { value: "User", label: "کاربر" },
  ];

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

  // Helper function to format time ago
  const formatTimeAgo = (dateString) => {
    if (!dateString) return "زمان نامشخص";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "همین الان";
    if (diffInHours < 24) return `${diffInHours} ساعت پیش`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} روز پیش`;
    // For older dates, show the date in Dari format
    return date.toLocaleDateString("fa-IR");
  };

  return (
    <div
      dir="rtl"
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
          داشبورد
        </h1>
        <p
          style={{
            color: "var(--text-medium)",
            fontSize: "var(--body-regular)",
          }}
        >
          خوش آمدید! اینجا وضعیت کسب‌وکار شما نمایش داده می‌شود.
        </p>
      </div>

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
              لاگ های سیستم
            </button>
            <button
              onClick={() => setActiveTab("transaction")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "transaction"
                  ? "border-amber-600 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              انتقالات اخیر
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
                placeholder="جستجو در تراکنش‌ها..."
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
                      <p className="">در حال بارگیری...</p>
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
                                From: {transaction.account?.name || "Unknown"}
                              </span>
                              <span className="text-green-600 font-semibold">
                                To:{" "}
                                {transaction.pairedAccount?.name || "Unknown"}
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
                              {transaction.account?.name || "Unknown"}
                            </span>
                          )}
                        </TableColumn>
                        <TableColumn
                          className={`font-semibold text-center ${getTypeColor(
                            transaction.transactionType
                          )}`}
                        >
                          {getTransactionTypePersian(
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
                              {transaction.referenceData.purchaseNumber && (
                                <span className="text-blue-600">
                                  خرید:{" "}
                                  {transaction.referenceData.purchaseNumber}
                                </span>
                              )}
                              {transaction.referenceData.saleNumber && (
                                <span className="text-green-600">
                                  فروش: {transaction.referenceData.saleNumber}
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableColumn>
                        <TableColumn className="px-4">
                          <button
                            onClick={() => handleReverseClick(transaction)}
                            disabled={reverseLoading}
                            className="text-red-500 transition-all duration-200 hover:bg-red-100 p-0.5 rounded-full  hover:text-red-700 disabled:opacity-50"
                            title="برگشت"
                          >
                            <ArrowUturnLeftIcon className="h-5 w-5" />
                          </button>
                        </TableColumn>
                      </TableRow>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      هیچ تراکنش اخیر یافت نشد
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
          <div className=" space-x-4 flex bg-white py-3 border border-slate-200 rounded-md   items-center justify-between">
            <div className="flex w-[40%] flex-col md:flex-row gap-x-4   items-center pr-3">
              <div className=" flex-1  flex items-center">
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
                  placeholder="جستجو بر اساس دلیل، تغییر دهنده یا عملیات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none focus:border-slate-300 hover:border-slate-300 shadow-sm pr-10`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader
                headerData={[
                  { title: "تاریخ تغییر" },
                  { title: "جدول" },
                  { title: "دلیل" },
                  { title: "تغییر دهنده" },
                  { title: "نوعیت عملیات" },
                  { title: "جزئیات" },
                ]}
              />
              <TableBody>
                {auditLoading ? (
                  <TableRow>
                    <TableColumn>
                      <p className="">در حال بارگیری...</p>
                    </TableColumn>
                  </TableRow>
                ) : auditLogs?.data?.length > 0 ? (
                  auditLogs.data.map((log, index) => (
                    <TableRow key={index}>
                      <TableColumn className="px-4 py-2">
                        {formatTimeAgo(log.changedAt)}
                      </TableColumn>
                      <TableColumn className="px-4">
                        {log.tableName || "-"}
                      </TableColumn>
                      <TableColumn className="px-4">
                        {log.reason || "بدون دلیل"}
                      </TableColumn>
                      <TableColumn className="px-4">
                        {log.changedBy || "-"}
                      </TableColumn>
                      <TableColumn
                        className={`px-4 font-semibold ${getOperationColor(
                          log.operation
                        )}`}
                      >
                        {getOperationPersian(log.operation)}
                      </TableColumn>
                      <TableColumn className="px-4">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowDetailsModal(true);
                          }}
                          className="text-blue-500 hover:bg-blue-100 p-1 rounded transition-colors"
                          title="مشاهده جزئیات"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                      </TableColumn>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      هیچ لاگ حسابرسی یافت نشد
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
            <div className=" w-full  flex justify-center items-center pl-10  ">
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
        </Fragment>
      )}

      <GloableModal open={showModal} setOpen={setShowModal} isClose={true}>
        <div className="bg-white p-6 rounded-lg shadow-lg  lg:w-[500px] w-[350px] mx-4">
          <h3 className="text-lg font-semibold mb-4">تأیید برگشت تراکنش</h3>
          <p className="mb-4">لطفاً دلیل برگشت این تراکنش را وارد کنید:</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-4"
            rows="3"
            placeholder="دلیل برگشت..."
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              لغو
            </button>
            <button
              onClick={handleConfirmReverse}
              disabled={!reason.trim() || reverseLoading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {reverseLoading ? "در حال پردازش..." : "تأیید برگشت"}
            </button>
          </div>
        </div>
      </GloableModal>

      <GloableModal
        open={showDetailsModal}
        setOpen={setShowDetailsModal}
        isClose={true}
      >
        {selectedLog && (
          <div className=" w-[550px] px-5 mx-auto rounded-lg lg:w-[800px] bg-white overflow-y-auto ">
            <div className=" bg-transparent    w-full  max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">جزئیات لاگ حسابرسی</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      جدول
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.tableName || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      نوع عملیات
                    </label>
                    <p
                      className={`mt-1 text-sm font-semibold ${getOperationColor(
                        selectedLog.operation
                      )}`}
                    >
                      {getOperationPersian(selectedLog.operation)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      تغییر دهنده
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.changedBy || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      تاریخ تغییر
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatTimeAgo(selectedLog.changedAt)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    دلیل
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLog.reason || "بدون دلیل"}
                  </p>
                </div>
                {selectedLog.operation === "INSERT" && selectedLog.newData && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      داده‌های جدید اضافه شده
                    </label>
                    <div className="bg-green-50 p-4 rounded border border-slate-200 overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-green-100">
                            <th className="px-4 py-2 text-left text-green-800 font-semibold">
                              فیلد
                            </th>
                            <th className="px-4 py-2 text-left text-green-800 font-semibold">
                              مقدار
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            filterDataFields(selectedLog.newData)
                          ).map(([key, value], index) => (
                            <tr
                              key={key}
                              className={
                                index % 2 === 0 ? "bg-green-50" : "bg-white"
                              }
                            >
                              <td className="px-4 py-2 font-medium text-green-800 border-b border-green-200">
                                {translateFieldName(key)}
                              </td>
                              <td className="px-4 py-2 text-green-700 border-b border-green-200">
                                {renderValue(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {selectedLog.operation === "UPDATE" &&
                  (selectedLog.oldData || selectedLog.newData) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        مقایسه داده‌ها: قبل و بعد از تغییر
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedLog.oldData && (
                          <div className="bg-red-50 p-4 rounded border rounded-slate-500 overflow-x-auto">
                            <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                              <span>🔴</span> داده‌های قدیمی (قبل از تغییر)
                            </h4>
                            <table className="min-w-full table-auto">
                              <thead>
                                <tr className="bg-red-100">
                                  <th className="px-4 py-2 text-left text-red-800 font-semibold">
                                    فیلد
                                  </th>
                                  <th className="px-4 py-2 text-left text-red-800 font-semibold">
                                    مقدار قدیمی
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(
                                  filterDataFields(selectedLog.oldData)
                                ).map(([key, value], index) => (
                                  <tr
                                    key={key}
                                    className={
                                      index % 2 === 0 ? "bg-red-50" : "bg-white"
                                    }
                                  >
                                    <td className="px-4 py-2 font-medium text-red-800 border-b border-red-200">
                                      {translateFieldName(key)}
                                    </td>
                                    <td className="px-4 py-2 text-red-700 border-b border-red-200">
                                      {renderValue(value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {selectedLog.newData && (
                          <div className="bg-green-50 p-4 rounded border overflow-x-auto">
                            <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                              <span>🟢</span> داده‌های جدید (بعد از تغییر)
                            </h4>
                            <table className="min-w-full table-auto">
                              <thead>
                                <tr className="bg-green-100">
                                  <th className="px-4 py-2 text-left text-green-800 font-semibold">
                                    فیلد
                                  </th>
                                  <th className="px-4 py-2 text-left text-green-800 font-semibold">
                                    مقدار جدید
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(
                                  filterDataFields(selectedLog.newData)
                                ).map(([key, value], index) => (
                                  <tr
                                    key={key}
                                    className={
                                      index % 2 === 0
                                        ? "bg-green-50"
                                        : "bg-white"
                                    }
                                  >
                                    <td className="px-4 py-2 font-medium text-green-800 border-b border-green-200">
                                      {translateFieldName(key)}
                                    </td>
                                    <td className="px-4 py-2 text-green-700 border-b border-green-200">
                                      {renderValue(value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                {selectedLog.operation === "DELETE" && selectedLog.oldData && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      داده‌های حذف شده
                    </label>
                    <div className="bg-red-50 p-4 rounded border border-slate-300 overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead>
                          <tr className="bg-red-100">
                            <th className="px-4 py-2 text-left text-red-800 font-semibold">
                              فیلد
                            </th>
                            <th className="px-4 py-2 text-left text-red-800 font-semibold">
                              مقدار حذف شده
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedLog.oldData).map(
                            ([key, value], index) => (
                              <tr
                                key={key}
                                className={
                                  index % 2 === 0 ? "bg-red-50" : "bg-white"
                                }
                              >
                                <td className="px-4 py-2 font-medium text-red-800 border-b border-red-200">
                                  {key}
                                </td>
                                <td className="px-4 py-2 text-red-700 border-b border-red-200">
                                  {renderValue(value)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedLog(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        )}
      </GloableModal>
    </div>
  );
};

export default Dashboard;
