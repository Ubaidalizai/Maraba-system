import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { useAccountLedger } from "../services/useApi";
import Pagination from "../components/Pagination";
import JalaliDatePicker from "../components/JalaliDatePicker";
import { normalizeDateToIso } from "../utilies/helper";
import Spinner from "../components/Spinner";

const EMPTY_LEDGER = [];

const AccountDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const ledgerFilters = useMemo(() => {
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (transactionType) filters.type = transactionType;
    return filters;
  }, [startDate, endDate, transactionType]);

  const {
    data: ledgerData,
    isLoading,
    isFetching,
    error,
  } = useAccountLedger(id, ledgerFilters);

  const account = ledgerData?.account || "حساب";
  const accountType = ledgerData?.accountType || "unknown";
  const openingBalance = ledgerData?.openingBalance || 0;
  const currentBalance = ledgerData?.currentBalance || 0;
  const totalTransactions = ledgerData?.totalTransactions || 0;
  const ledger = ledgerData?.ledger ?? EMPTY_LEDGER;

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, transactionType]);

  const paginatedLedger = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return ledger.slice(startIndex, endIndex);
  }, [ledger, page, rowsPerPage]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("fa-IR").format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fa-IR");
  };

  const getBalanceInfo = (balance, accountType) => {
    if (accountType === "cashier" || accountType === "safe") {
      // For cashier/safe accounts, positive balance means you have money
      return {
        label: balance >= 0 ? "موجودی موجود" : "کسر موجودی",
        color: balance >= 0 ? "text-green-600" : "text-red-600",
        bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
        iconColor: balance >= 0 ? "text-green-600" : "text-red-600",
      };
    } else if (accountType === "saraf") {
      // For saraf accounts, positive balance means you owe them money
      return {
        label: balance >= 0 ? "بدهی شما به صراف" : "طلب شما از صراف",
        color: balance >= 0 ? "text-red-600" : "text-green-600",
        bgColor: balance >= 0 ? "bg-red-50" : "bg-green-50",
        iconColor: balance >= 0 ? "text-red-600" : "text-green-600",
      };
    } else if (accountType === "supplier") {
      // For supplier accounts, positive balance means you owe them money
      return {
        label: balance >= 0 ? "بدهی شما به تاجر" : "طلب شما از تاجر",
        color: balance >= 0 ? "text-red-600" : "text-green-600",
        bgColor: balance >= 0 ? "bg-red-50" : "bg-green-50",
        iconColor: balance >= 0 ? "text-red-600" : "text-green-600",
      };
    } else if (accountType === "customer") {
      // For customer accounts, positive balance means they owe you money
      return {
        label: balance >= 0 ? "طلب شما از مشتری" : "بدهی شما به مشتری",
        color: balance >= 0 ? "text-green-600" : "text-red-600",
        bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
        iconColor: balance >= 0 ? "text-green-600" : "text-red-600",
      };
    } else if (accountType === "employee") {
      // For employee accounts, positive balance means they owe you money
      return {
        label: balance >= 0 ? "طلب شما از کارمند" : "بدهی شما به کارمند",
        color: balance >= 0 ? "text-green-600" : "text-red-600",
        bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
        iconColor: balance >= 0 ? "text-green-600" : "text-red-600",
      };
    } else {
      // Default case
      return {
        label: "موجودی",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        iconColor: "text-gray-600",
      };
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case "Credit":
      case "Transfer":
        return "text-green-600 bg-green-100";
      case "Debit":
        return "text-red-600 bg-red-100";
      case "Expense":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case "Credit":
        return "اعتبار";
      case "Debit":
        return "بدهی";
      case "Transfer":
        return "انتقال";
      case "Expense":
        return "مصرف";
      case "Purchase":
        return "خرید";
      case "Sale":
        return "فروش";
      case "Payment":
        return "پرداخت";
      default:
        return type;
    }
  };

  const handleTransactionClick = (transaction) => {
    if (transaction.referenceType && transaction.referenceId) {
      if (transaction.referenceType === "purchase") {
        // Navigate to purchases page with modal action
        navigate(`/purchases?openId=${transaction.referenceId}&action=view`);
      } else if (transaction.referenceType === "sale") {
        // Navigate to sales page with view action (show details modal first)
        navigate(`/sales?openId=${transaction.referenceId}&action=view`);
      }
    }
  };

  const isClickable = (transaction) => {
    return transaction.referenceType && transaction.referenceId;
  };

  const handleStartDateChange = (nextValue) => {
    const iso = normalizeDateToIso(nextValue);
    setStartDate(iso || "");
  };

  const handleEndDateChange = (nextValue) => {
    const iso = normalizeDateToIso(nextValue);
    setEndDate(iso || "");
  };

  const handleBackClick = () => {
    const accountTypeMap = {
      supplier: "supplier",
      customer: "customer",
      employee: "employee",
      cashier: "cashier",
      safe: "safe",
      saraf: "saraf",
    };
    const typeParam = accountTypeMap[accountType] || "supplier";
    navigate(`/accounts?type=${typeParam}`);
  };

  const isInitialLoading = isLoading && !ledgerData;

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error.message || "خطا در بارگذاری اطلاعات حساب"}
          </p>
          <button
            onClick={() => navigate("/accounts")}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            بازگشت به لیست حساب ها
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackClick}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6 rotate-180 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{account}</h1>
            <p className="text-gray-600 mt-1">جزئیات حساب و تراکنش ها</p>
          </div>
        </div>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className={`rounded-lg shadow-sm border border-gray-200 p-6 ${
            getBalanceInfo(currentBalance, accountType).bgColor
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {getBalanceInfo(currentBalance, accountType).label}
              </p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  getBalanceInfo(currentBalance, accountType).color
                }`}
              >
                {formatCurrency(Math.abs(currentBalance))} AFN
              </p>
            </div>
            <div
              className={`p-3 rounded-lg ${
                getBalanceInfo(currentBalance, accountType).bgColor
              }`}
            >
              <CurrencyDollarIcon
                className={`h-6 w-6 ${
                  getBalanceInfo(currentBalance, accountType).iconColor
                }`}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">موجودی اولیه</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(Math.abs(openingBalance))} AFN
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">تعداد تراکنش ها</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalTransactions}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            فیلتر تراکنش ها
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <JalaliDatePicker
                value={startDate}
                onChange={handleStartDateChange}
                placeholder="از تاریخ"
                clearable
                inputClassName="!px-3 !py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <JalaliDatePicker
                value={endDate}
                onChange={handleEndDateChange}
                placeholder="تا تاریخ"
                clearable
                inputClassName="!px-3 !py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">همه تراکنش ها</option>
                <option value="Credit">اعتبار</option>
                <option value="Debit">بدهی</option>
                <option value="Transfer">انتقال</option>
                <option value="Expense">مصرف</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">تراکنش ها</h3>
        </div>
        <div className="relative overflow-x-auto">
          {isFetching && ledgerData && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="flex items-center gap-3 text-gray-600 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                <span>در حال بروزرسانی تراکنش‌ها...</span>
              </div>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  تاریخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  نوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  مبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  موجودی بعد از تراکنش
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  توضیحات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ledger.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    تراکنشی یافت نشد
                  </td>
                </tr>
              ) : (
                paginatedLedger.map((transaction, index) => (
                  <tr
                    key={transaction.transactionId || index}
                    className={`hover:bg-gray-50 ${
                      isClickable(transaction) ? "cursor-pointer" : ""
                    }`}
                    onClick={() => handleTransactionClick(transaction)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(
                          transaction.type
                        )}`}
                      >
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 text-sm font-semibold ${
                        transaction.amount > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {formatCurrency(transaction.amount)} AFN
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(transaction.balanceAfter)} AFN
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.description || "-"}
                      {isClickable(transaction) && (
                        <span className="ml-2 text-xs text-blue-600">
                          (کلیک برای مشاهده)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {ledger.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              page={page}
              limit={rowsPerPage}
              total={ledger.length}
              totalPages={Math.max(1, Math.ceil(ledger.length / rowsPerPage))}
              onPageChange={setPage}
              onRowsPerPageChange={(newLimit) => {
                setRowsPerPage(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetails;
