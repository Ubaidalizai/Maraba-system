import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon,
  PlusIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { FaWhatsapp } from "react-icons/fa";
import { useAccountLedger, useSystemAccounts, useCreateTransaction, useAccountTransactionVolume } from "../services/useApi";
import Pagination from "../components/Pagination";
import JalaliDatePicker from "../components/JalaliDatePicker";
import { normalizeDateToIso } from "../utilies/helper";
import Spinner from "../components/Spinner";
import { toast } from "react-toastify";
import { usePDF } from "react-to-pdf";
import AccountStatementPDF from "../components/AccountStatementPDF";

const EMPTY_LEDGER = [];

const AccountDetails = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toPDF, targetRef } = usePDF({ filename: 'account-statement.pdf' });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    systemAccountId: "",
    amount: "",
    description: "",
  });

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

  // Fetch all transactions for PDF (without filters)
  const { data: allLedgerData } = useAccountLedger(id, {});
  const allTransactions = allLedgerData?.ledger ?? EMPTY_LEDGER;

  const { data: systemAccountsData } = useSystemAccounts();
  const systemAccounts = systemAccountsData?.accounts || [];

  const createTransactionMutation = useCreateTransaction();

  const account = ledgerData?.account || t("accountDetails.fallbackName");
  const accountType = ledgerData?.accountType || "unknown";
  const openingBalance = ledgerData?.openingBalance || 0;
  const currentBalance = ledgerData?.currentBalance || 0;
  const totalTransactions = ledgerData?.totalTransactions || 0;
  const ledger = ledgerData?.ledger ?? EMPTY_LEDGER;
  const contactInfo = ledgerData?.contactInfo || null;

  const { data: volumeData } = useAccountTransactionVolume(id);
  const totalTransactionVolume = volumeData?.data?.totalTransactionVolume || 0;

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, transactionType]);

  const paginatedLedger = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return ledger.slice(startIndex, endIndex);
  }, [ledger, page, rowsPerPage]);

  const formatCurrency = (amount) => {
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag =
      lang === "ps" ? "ps-AF" : "fa-IR";
    return new Intl.NumberFormat(localeTag).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag =
      lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(dateString).toLocaleDateString(localeTag);
  };

  const getBalanceInfo = (balance, accountType) => {
    if (accountType === "cashier" || accountType === "safe") {
      return {
        label:
          balance >= 0
            ? t("accountDetails.balance.cashierPositive")
            : t("accountDetails.balance.cashierNegative"),
        color: balance >= 0 ? "text-green-600" : "text-red-600",
        bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
        iconColor: balance >= 0 ? "text-green-600" : "text-red-600",
      };
    } else if (accountType === "saraf") {
      return {
        label:
          balance < 0
            ? t("accountDetails.balance.sarafPositive")
            : t("accountDetails.balance.sarafNegative"),
        color: balance < 0 ? "text-red-600" : "text-green-600",
        bgColor: balance < 0 ? "bg-red-50" : "bg-green-50",
        iconColor: balance < 0 ? "text-red-600" : "text-green-600",
      };
    } else if (accountType === "supplier") {
      return {
        label:
          balance >= 0
            ? t("accountDetails.balance.supplierPositive")
            : t("accountDetails.balance.supplierNegative"),
        color: balance >= 0 ? "text-red-600" : "text-green-600",
        bgColor: balance >= 0 ? "bg-red-50" : "bg-green-50",
        iconColor: balance >= 0 ? "text-red-600" : "text-green-600",
      };
    } else if (accountType === "customer") {
      return {
        label:
          balance >= 0
            ? t("accountDetails.balance.customerPositive")
            : t("accountDetails.balance.customerNegative"),
        color: balance >= 0 ? "text-green-600" : "text-red-600",
        bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
        iconColor: balance >= 0 ? "text-green-600" : "text-red-600",
      };
    } else if (accountType === "employee") {
      return {
        label:
          balance >= 0
            ? t("accountDetails.balance.employeePositive")
            : t("accountDetails.balance.employeeNegative"),
        color: balance >= 0 ? "text-green-600" : "text-red-600",
        bgColor: balance >= 0 ? "bg-green-50" : "bg-red-50",
        iconColor: balance >= 0 ? "text-green-600" : "text-red-600",
      };
    } else {
      return {
        label: t("accountDetails.balance.default"),
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
    const key = `accountDetails.txTypes.${type}`;
    const translated = t(key);
    return translated === key ? type : translated;
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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!paymentForm.systemAccountId || !paymentForm.amount) {
      toast.error("مهرباني وکړئ ټول اړین فیلډونه ډک کړئ");
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      toast.error("اندازه باید مثبته وي");
      return;
    }

    const transactionType = accountType === "customer" ? "Debit" : "Credit";

    try {
      await createTransactionMutation.mutateAsync({
        accountId: id,
        systemAccountId: paymentForm.systemAccountId,
        transactionType,
        amount,
        description: paymentForm.description || `${transactionType} - ${account}`,
      });

      setShowPaymentModal(false);
      setPaymentForm({ systemAccountId: "", amount: "", description: "" });
    } catch (error) {
      console.error("Payment error:", error);
    }
  };

  const canRecordPayment = ["customer", "supplier", "employee"].includes(accountType);
  const canExportPDF = ["customer", "supplier"].includes(accountType);
  const canSendWhatsApp = ["customer", "supplier"].includes(accountType) && contactInfo?.phone;

  const handleSendWhatsApp = () => {
    if (!contactInfo?.phone) {
      toast.error("د دې حساب لپاره د تلیفون شمیره شتون نلري");
      return;
    }

    // Convert Pashto/Dari digits to English digits
    const convertToEnglishDigits = (str) => {
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return str.split('').map(char => {
        const index = persianDigits.indexOf(char);
        return index !== -1 ? index.toString() : char;
      }).join('');
    };

    // Format phone number (convert digits, remove spaces, dashes, etc.)
    let phoneNumber = convertToEnglishDigits(contactInfo.phone).replace(/[^0-9+]/g, '');
    
    // If phone doesn't start with +, assume it's Afghan number and add +93
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+93' + phoneNumber;
    }

    // Get current date in Jalali format
    const today = new Date();
    const formattedDate = formatDate(today.toISOString());

    // Determine balance message based on account type
    let balanceMessage = '';
    const absBalance = Math.abs(currentBalance);
    const formattedBalance = formatCurrency(absBalance);

    if (accountType === 'supplier') {
      if (currentBalance > 0) {
        balanceMessage = ` موږ ستاسی  ${formattedBalance}  افغانۍ پوروړی یو`;
      } else if (currentBalance < 0) {
        balanceMessage = `موږ تاسو ته  ${formattedBalance}  افغانۍ پور لرو`;
      } else {
        balanceMessage = `ستاسو حساب صفر دی`;
      }
    } else if (accountType === 'customer') {
      if (currentBalance > 0) {
        balanceMessage = `تاسی زموږ   ${formattedBalance}  افغانۍ پوروړی یاست`;
      } else if (currentBalance < 0) {
        balanceMessage = `موږ تاسو ته ${formattedBalance} افغانۍ پور لرو`;
      } else {
        balanceMessage = `ستاسو حساب صفر دی`;
      }
    }

    // Create WhatsApp message
    const companyName = "بلال سدیس د مربا شرکت"; // You can make this dynamic from settings
const message = `${companyName}\n\n\n` +
  `${contactInfo.name}\n\n` +
  `${balanceMessage}\n\n` +
  `نیټه: ${formattedDate}\n\n` +
  `مننه`;


    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

  };

  const handleExportPDF = () => {
    toPDF();
    toast.success("PDF په بریالیتوب سره ډاونلوډ شو");
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
            {error.message || t("accountDetails.loadError")}
          </p>
          <button
            onClick={() => navigate("/accounts")}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            {t("accountDetails.backToList")}
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
            <p className="text-gray-600 mt-1">
              {t("accountDetails.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {canSendWhatsApp && (
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              title="WhatsApp ته استول"
            >
              <FaWhatsapp className="h-5 w-5" />
              <span>WhatsApp</span>
            </button>
          )}
          {canExportPDF && (
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              <span>PDF ډاونلوډ</span>
            </button>
          )}
          {canRecordPayment && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>{accountType === "customer" ? "پیسې ترلاسه کول" : "پیسې ورکول"}</span>
            </button>
          )}
        </div>
      </div>

      {/* PDF Content - Hidden */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <AccountStatementPDF
          ref={targetRef}
          account={account}
          accountType={accountType}
          currentBalance={currentBalance}
          openingBalance={openingBalance}
          totalTransactions={allTransactions.length}
          totalTransactionVolume={totalTransactionVolume}
          ledger={allTransactions}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getBalanceInfo={getBalanceInfo}
          getTransactionTypeLabel={getTransactionTypeLabel}
        />
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <p className="text-sm text-gray-600">
                {t("accountDetails.openingBalance")}
              </p>
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
              <p className="text-sm text-gray-600">
                {t("accountDetails.transactionCount")}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalTransactions}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {(accountType === 'customer' || accountType === 'supplier') && (
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">
                  {accountType === 'customer' ? 'ټول ترلاسه شوی پیسې' : 'ټول ورکړل شوی پیسې'}
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {formatCurrency(totalTransactionVolume)} AFN
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("accountDetails.filtersTitle")}
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <JalaliDatePicker
                value={startDate}
                onChange={handleStartDateChange}
                placeholder={t("accountDetails.dateFromPlaceholder")}
                clearable
                inputClassName="!px-3 !py-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-500" />
              <JalaliDatePicker
                value={endDate}
                onChange={handleEndDateChange}
                placeholder={t("accountDetails.dateToPlaceholder")}
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
                <option value="">{t("accountDetails.allTypes")}</option>
                <option value="Credit">
                  {t("accountDetails.txTypes.Credit")}
                </option>
                <option value="Debit">{t("accountDetails.txTypes.Debit")}</option>
                <option value="Transfer">
                  {t("accountDetails.txTypes.Transfer")}
                </option>
                <option value="Expense">
                  {t("accountDetails.txTypes.Expense")}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("accountDetails.transactionsTitle")}
          </h3>
        </div>
        <div className="relative overflow-x-auto">
          {isFetching && ledgerData && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="flex items-center gap-3 text-gray-600 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600"></div>
                <span>{t("accountDetails.table.updating")}</span>
              </div>
            </div>
          )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accountDetails.table.date")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accountDetails.table.type")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accountDetails.table.amount")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accountDetails.table.balanceAfter")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accountDetails.table.description")}
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
                    {t("accountDetails.table.empty")}
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
                          {t("accountDetails.clickToView")}
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

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {accountType === "customer" ? "پیسې ترلاسه کول" : "پیسې ورکول"}
              </h3>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {accountType === "customer" ? "کوم حساب ته" : "له کوم حسابه"} *
                </label>
                <select
                  value={paymentForm.systemAccountId}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, systemAccountId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">حساب وټاکئ</option>
                  {systemAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)} AFN)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اندازه *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="اندازه داخل کړئ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تشریح
                </label>
                <textarea
                  value={paymentForm.description}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="اختیاري یادښت..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentForm({ systemAccountId: "", amount: "", description: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  لغوه
                </button>
                <button
                  type="submit"
                  disabled={createTransactionMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTransactionMutation.isPending ? "ثبت روان دی..." : "ثبت"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDetails;
