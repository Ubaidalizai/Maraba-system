import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  BanknotesIcon,
  UserIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useForm } from "react-hook-form";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useSuppliers,
  useCustomers,
  useEmployees,
  useSarafs,
  useCreateTransaction,
  useTransferBetweenAccounts,
  useSystemAccounts,
  useAccountTotals,
} from "../services/useApi";
import { fetchAccounts, fetchAccount } from "../services/apiUtiles";
import GloableModal from "../components/GloableModal";
import { inputStyle } from "../components/ProductForm";
import { toast } from "react-toastify";
import { formatNumber, formatCurrency, formatJalaliDate } from "../utilies/helper";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import AccountsPDF from "../components/AccountsPDF";
import { registerNumeric } from "../utilies/numericInput";

const transferInputStyle =
  "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-200 ease focus:outline-none hover:border-slate-300 focus:border-slate-300 shadow-sm";

const Accounts = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [type, setType] = useState(searchParams.get("type") || "supplier");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const {
    register: registerTransaction,
    handleSubmit: handleSubmitTransaction,
    reset: resetTransaction,
    watch: watchTransaction,
    setValue: setValueTransaction,
    formState: { errors: transactionErrors },
  } = useForm();
  const {
    register: registerTransfer,
    handleSubmit: handleSubmitTransfer,
    reset: resetTransfer,
    watch: watchTransfer,
    formState: { errors: transferErrors },
  } = useForm();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletedId, setDeletedId] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [allAccountsForPDF, setAllAccountsForPDF] = useState([]);
  const [transactionBalancesReady, setTransactionBalancesReady] = useState(true);
  const transactionModalAccountIdRef = useRef(null);
  const queryClient = useQueryClient();
  const { data: accountsResp, isLoading } = useAccounts({
    type,
    search,
    page,
    limit,
  });
  const accounts = accountsResp?.accounts || accountsResp?.data || [];
  const total = accountsResp?.total || accounts.length || 0;
  const totalPages =
    accountsResp?.pages || Math.max(1, Math.ceil(total / limit));
  const accountSubmitLock = useSubmitLock();
  const transactionSubmitLock = useSubmitLock();

  // Fetch entities for reference selection
  const { data: suppliersData } = useSuppliers();
  const { data: customersData } = useCustomers();
  const { data: employeesData } = useEmployees();
  const { data: sarafsData } = useSarafs();

  const { mutate: createAccountMutation } = useCreateAccount();
  const { mutate: updateAccountMutation } = useUpdateAccount();
  const { mutate: deleteAccountMutation, isPending: isDeleting } =
    useDeleteAccount();
  const { mutate: createTransaction } = useCreateTransaction();
  const { mutate: transferMutation, isPending: isTransferring } =
    useTransferBetweenAccounts();
  const { data: systemAccountsData } = useSystemAccounts();
  const { data: accountTotalsData } = useAccountTotals();
  // Helper functions
  const isSystemAccount = (accountType) => {
    return ["cashier", "safe"].includes(accountType);
  };

  const getReferenceOptions = (accountType) => {
    switch (accountType) {
      case "supplier":
        return suppliersData?.data || [];
      case "customer":
        return customersData?.data || [];
      case "employee":
        return employeesData?.data || [];
      case "saraf":
        return sarafsData?.data || [];
      default:
        return [];
    }
  };

  const runMutation = (mutateFn, payload) =>
    new Promise((resolve, reject) => {
      mutateFn(payload, {
        onSuccess: resolve,
        onError: reject,
      });
    });

  const watchedTransactionType = watchTransaction("transactionType") || "Credit";
  const watchedFromAccount = watchTransfer("fromAccountId");
  const isAccountActionPending = accountSubmitLock.isSubmitting;
  const isTransactionActionPending = transactionSubmitLock.isSubmitting;

  const onSubmitAccount = accountSubmitLock.wrapSubmit(async (data) => {
    const accountData = {
      ...data,
      refId: isSystemAccount(data.type) ? null : (data.refId || null),
    };

    // Handle Saraf balance type conversion
    if (data.type === 'saraf' && data.balanceType) {
      const amount = Math.abs(parseFloat(data.openingBalance) || 0);
      accountData.openingBalance = data.balanceType === 'sarafOwesMe' ? -amount : amount;
    }

    if (editingAccount) {
      await runMutation(updateAccountMutation, {
        id: editingAccount._id,
        accountData,
      });
    } else {
      await runMutation(createAccountMutation, accountData);
    }
    setShowAccountModal(false);
    setEditingAccount(null);
    reset({
      type,
      refId: "",
      name: "",
      openingBalance: 0,
      currency: "AFN",
      transactionType: "Credit",
      amount: "",
      description: "",
      balanceType: "sarafOwesMe",
    });
  });

  const handleEdit = (acc) => {
    setEditingAccount(acc);
    setShowAccountModal(true);
    reset({
      type: acc.type,
      refId: acc.refId || "",
      name: acc.name,
      openingBalance: acc.openingBalance || 0,
      currency: acc.currency || "AFN",
    });
  };

  const handleDelete = async () => {
    if (!deletedId) return;
    deleteAccountMutation(deletedId);
  };

  const handleAddTransaction = async (acc) => {
    transactionModalAccountIdRef.current = acc._id;
    setTransactionBalancesReady(false);
    setSelectedAccount(acc);
    setShowTransactionModal(true);
    // Pre-select transaction type based on account type
    const transactionType = acc.type === "supplier" ? "Credit" : "Debit";
    setValueTransaction("transactionType", transactionType);
    setValueTransaction("amount", "");
    setValueTransaction("systemAccountId", "");
    setValueTransaction("description", "");

    try {
      const [detailRes] = await Promise.all([
        fetchAccount(acc._id),
        queryClient.refetchQueries({ queryKey: ["systemAccounts"] }),
      ]);
      if (transactionModalAccountIdRef.current !== acc._id) return;
      const fresh = detailRes?.account ?? detailRes?.data;
      if (fresh) {
        setSelectedAccount((prev) =>
          prev && String(prev._id) === String(acc._id) ? { ...prev, ...fresh } : prev
        );
      }
    } catch (e) {
      console.error("Failed to refresh account balances for transaction modal:", e);
      toast.error(
        e?.message || "د بیلانس تازه کول ناکام شول؛ تاسو کولی شئ بیا هڅه وکړئ."
      );
    } finally {
      if (transactionModalAccountIdRef.current === acc._id) {
        setTransactionBalancesReady(true);
      }
    }
  };

  const onSubmitTransaction = transactionSubmitLock.wrapSubmit(async (data) => {
    try {
      if (!transactionBalancesReady || !selectedAccount) {
        return;
      }
      if (!data.systemAccountId) {
        toast.error('مهرباني وکړئ سیسټم حساب وټاکئ');
        return;
      }
      
      if (!data.amount || parseFloat(data.amount) <= 0) {
        toast.error('مهرباني وکړئ سمه اندازه داخل کړئ');
        return;
      }

      const enteredAmount = parseFloat(data.amount);
      const accountBalance = Math.abs(selectedAccount.currentBalance);
      
      if (enteredAmount > accountBalance) {
        toast.error(`اندازه د حساب له بیلانس څخه زیاته نشي کیدای. اوسنی بیلانس: ${formatNumber(accountBalance)} افغانۍ`);
        return;
      }
      
      const transactionData = {
        accountId: selectedAccount._id,
        transactionType: data.transactionType,
        amount: enteredAmount,
        systemAccountId: data.systemAccountId,
        description:
          data.description ||
          t("accounts.transaction.defaultDescription", {
            type: data.transactionType,
          }),
      };

      await runMutation(createTransaction, transactionData);
      setShowTransactionModal(false);
      setSelectedAccount(null);
      transactionModalAccountIdRef.current = null;
      setTransactionBalancesReady(true);
      resetTransaction();
    } catch (err) {
      console.error('Transaction error:', err);
      toast.error(err.message || 'معامله ثبت نشوه');
    }
  });

  const onSubmitTransfer = async (data) => {
    try {
      await runMutation(transferMutation, {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: parseFloat(data.amount),
        description: data.description || `انتقال پیسې`,
      });
      setShowTransferModal(false);
      resetTransfer();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCreatedAt = formatJalaliDate;

  const patchOklabColors = (element) => {
    const allElements = element.querySelectorAll("*");
    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      const bg = computed.backgroundColor;
      const color = computed.color;
      if (bg && bg.startsWith("oklab")) {
        el.style.backgroundColor = "#f3f4f6";
      }
      if (color && color.startsWith("oklab")) {
        el.style.color = "#1f2937";
      }
    });
  };

  const exportToPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Fetch all accounts without pagination using apiRequest
      const data = await fetchAccounts({ type, limit: 9999 });
      const allAccounts = data?.accounts || data?.data || [];
      // Filter accounts with balance greater than 0
      const accountsWithBalance = allAccounts.filter(acc => (acc.currentBalance || 0) > 0);
      setAllAccountsForPDF(accountsWithBalance);
      
      // Wait for state update and render
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const pdfContent = document.getElementById("accounts-pdf-content");
      if (!pdfContent) {
        throw new Error("PDF content element not found");
      }

      // Wait for fonts and content to load
      await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      patchOklabColors(pdfContent);
      void pdfContent.offsetHeight;

      const canvas = await html2canvas(pdfContent, {
        scale: 1.2,
        useCORS: true,
        logging: false,
        letterRendering: false,
        backgroundColor: "#ffffff",
      });

      // Validate canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Failed to capture PDF content - canvas has zero dimensions");
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.72);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData,
        "JPEG",
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      const fileName = type === "customer" 
        ? `customer-accounts-${new Date().toISOString().split("T")[0]}.pdf`
        : `supplier-accounts-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("د PDF په جوړولو کې ستونزه");
    } finally {
      setExportingPDF(false);
      setAllAccountsForPDF([]);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("accounts.title")}</h1>
          <p className="text-gray-600 mt-1">{t("accounts.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {(type === "customer" || type === "supplier") && (
            <button
              onClick={exportToPDF}
              disabled={exportingPDF}
              className={`btn-primary flex items-center gap-2 px-4 py-2 rounded-sm text-sm ${
                exportingPDF ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {exportingPDF ? "PDF جوړیږي..." : t("accountsPDF.exportPDF")}
            </button>
          )}
          {(type === "cashier" || type === "safe" || type === "saraf") && (
            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              className="btn-primary text-sm px-3.5 py-2 rounded-sm flex items-center gap-1.5"
            >
              <ArrowUpIcon className="h-4 w-4" />
              <ArrowDownIcon className="h-4 w-4 -ml-3" />
              {t("accounts.transfer.title")}
            </button>
          )}
          <button
            onClick={() => {
              setEditingAccount(null);
              reset({
                type,
                refId: "",
                name: "",
                openingBalance: 0,
                currency: "AFN",
              });
              setShowAccountModal(true);
            }}
            className="bg-amber-600 text-white px-4 py-2 rounded-sm hover:bg-amber-700 flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            {t("accounts.newAccount")}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {accountTotalsData?.data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { key: "supplier", label: t("accounts.types.supplier") },
            { key: "customer", label: t("accounts.types.customer") },
            { key: "employee", label: t("accounts.types.employee") },
            { key: "cashier", label: t("accounts.types.cashier") },
            { key: "safe", label: t("accounts.types.safe") },
            { key: "saraf", label: t("accounts.types.saraf") },
          ].map((item) => {
            const data = accountTotalsData.data[item.key] || { totalBalance: 0, count: 0 };
            return (
              <div key={item.key} className="bg-white border border-gray-200 rounded-sm p-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">{item.label}</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(data.totalBalance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.count} {t("accounts.summary.accounts")}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs and Table */}
      <div className="bg-white rounded-lg border border-gray-200/70">
        <div className="border-b border-gray-200/70 mb-1 rounded-md">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <nav className="flex flex-wrap -mb-px gap-x-1 flex-1 min-w-0">
              {[
                { id: "supplier", icon: BuildingOfficeIcon },
                { id: "customer", icon: UserIcon },
                { id: "employee", icon: UserIcon },
                { id: "cashier", icon: BanknotesIcon },
                { id: "safe", icon: CurrencyDollarIcon },
                { id: "saraf", icon: CurrencyDollarIcon },
              ].map((typeOption) => (
                <button
                  key={typeOption.id}
                  type="button"
                  onClick={() => {
                    setType(typeOption.id);
                    setSearchParams({ type: typeOption.id });
                    setPage(1);
                  }}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    type === typeOption.id
                      ? "border-amber-600 text-amber-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <typeOption.icon className="h-5 w-5" />
                  {t(`accounts.types.${typeOption.id}`)}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2 shrink-0 px-4 md:px-6 pb-4 md:pb-0">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t("accounts.searchPlaceholder")}
                className={inputStyle}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.name")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.type")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.openingBalance")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.currentBalance")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.currency")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.createdAt")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("accounts.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {t("accounts.table.loading")}
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {t("accounts.table.empty")}
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {acc.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {acc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(acc.openingBalance ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(acc.currentBalance ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {acc.currency || "AFN"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatCreatedAt(acc.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => navigate(`/accounts/${acc._id}`)}
                          title={t("accounts.actions.viewDetails")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {['customer', 'supplier', 'employee'].includes(acc.type) && (
                          <button
                            className="text-green-600 hover:text-green-900"
                            onClick={() => handleAddTransaction(acc)}
                            title={t("accounts.actions.addTransaction")}
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleEdit(acc)}
                          title={t("accounts.actions.edit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            setDeletedId(acc._id);
                            setDeleteModal(true);
                          }}
                          title={t("accounts.actions.delete")}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {t("accounts.pagination.pageOf", {
                page,
                totalPages,
                total,
              })}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("accounts.prev")}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("accounts.next")}
              </button>
            </div>
          </div>
        )}
      </div>
      <GloableModal open={deleteModal} setOpen={setDeleteModal} isClose={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t("accounts.delete.title")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{t("accounts.delete.message")}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("accounts.delete.cancel")}
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteModal(false);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting
                  ? t("accounts.delete.deleting")
                  : t("accounts.delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
      {/* Create / Edit Account Modal */}
      <GloableModal
        open={showAccountModal}
        setOpen={setShowAccountModal}
        isClose={true}
      >
        <div className="w-[450px] max-h-[480px] overflow-visible rounded-md">
          <div className="bg-white rounded-md">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAccount
                  ? t("accounts.modal.editTitle")
                  : t("accounts.modal.createTitle")}
              </h2>
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  setEditingAccount(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={handleSubmit(onSubmitAccount)}
              className="p-6 space-y-2 grid grid-cols-2 gap-x-2"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("accounts.modal.accountType")}
                </label>
                <select
                  className={inputStyle}
                  defaultValue={type}
                  disabled
                  {...register("type", { required: true })}
                >
                  <option value="supplier">{t("accounts.types.supplier")}</option>
                  <option value="customer">{t("accounts.types.customer")}</option>
                  <option value="employee">{t("accounts.types.employee")}</option>
                  <option value="cashier">{t("accounts.types.cashier")}</option>
                  <option value="safe">{t("accounts.types.safe")}</option>
                  <option value="saraf">{t("accounts.types.saraf")}</option>
                </select>
              </div>

              {/* Reference field - only show for entity accounts */}
              {!isSystemAccount(watch("type") || type) && (watch("type") || type) !== "saraf" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.modal.reference")}
                  </label>
                  <select
                    className={inputStyle}
                    {...register("refId", {
                      required: !isSystemAccount(watch("type") || type) && (watch("type") || type) !== "saraf",
                    })}
                  >
                    <option value="">{t("accounts.modal.selectReference")}</option>
                    {getReferenceOptions(watch("type") || type).map((entity) => (
                      <option key={entity._id} value={entity._id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(watch("type") || type) === "saraf" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    صراف وټاکئ
                  </label>
                  <select
                    className={inputStyle}
                    {...register("refId")}
                  >
                    <option value="">صراف وټاکئ</option>
                    {getReferenceOptions("saraf").map((entity) => (
                      <option key={entity._id} value={entity._id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("accounts.modal.accountName")}
                </label>
                <input
                  className={inputStyle}
                  placeholder={t("accounts.modal.accountNamePlaceholder")}
                  {...register("name", { required: true })}
                />
              </div>
              {!editingAccount && (
                <>
                  {(watch("type") || type) === 'saraf' && (
                    <div className="mr-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3 mt-2">
                        د بیلانس ډول
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="iOweSaraf"
                            defaultChecked
                            {...register("balanceType")}
                            className="w-4 h-4 text-amber-600"
                          />
                          <span className="text-sm font-bold">مثبت</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="sarafOwesMe"
                            {...register("balanceType")}
                            className="w-4 h-4 text-amber-600"
                          />
                          <span className="text-sm text-amber-700 font-bold">منفی</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("accounts.modal.openingBalance")}
                    </label>
                    <input
                      defaultValue={0}
                      placeholder="0"
                      {...registerNumeric("openingBalance", register, {}, {
                        className: inputStyle,
                      })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t("accounts.modal.openingBalanceHint")}
                    </p>
                  </div>
                </>
              )}
              <div className=" col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("accounts.modal.currency")}
                </label>
                <input
                  className={inputStyle}
                  defaultValue="AFN"
                  {...register("currency")}
                />
              </div>
              <div className="col-span-2 space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2  border border-gray-300 rounded-sm cursor-pointer hover:bg-gray-50"
                >
                  {t("accounts.modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isAccountActionPending}
                  className={`px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 ${
                    isAccountActionPending
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {isAccountActionPending
                    ? t("accounts.modal.saving")
                    : editingAccount
                    ? t("accounts.modal.saveChanges")
                    : t("accounts.modal.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </GloableModal>
      {/* Manual Transaction Modal */}
      <GloableModal
        open={showTransactionModal}
        setOpen={setShowTransactionModal}
        isClose={true}
      >
        {selectedAccount && (
          <div className="w-full max-w-[min(720px,calc(100vw-2rem))] max-h-[calc(100vh-2.5rem)] overflow-y-auto overscroll-contain">
            <div className="bg-white rounded-lg shadow-xl">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t("accounts.transaction.title")}
                </h2>
                <button
                  onClick={() => {
                    setShowTransactionModal(false);
                    setSelectedAccount(null);
                    transactionModalAccountIdRef.current = null;
                    setTransactionBalancesReady(true);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={handleSubmitTransaction(onSubmitTransaction)}
                className="px-6 py-4 sm:px-6 sm:py-5 space-y-3"
              >
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {t("accounts.transaction.account")}: {selectedAccount.name}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {t("accounts.transaction.currentBalance")}:{" "}
                    {transactionBalancesReady
                      ? `${formatNumber(selectedAccount.currentBalance ?? 0)} AFN`
                      : t("accounts.table.loading")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.transaction.transactionType")}
                  </label>
                  <select
                    className={inputStyle}
                    disabled
                    {...registerTransaction("transactionType", { required: true })}
                  >
                    <option value="Credit">
                      {t("accounts.transaction.optionCredit")}
                    </option>
                    <option value="Debit">
                      {t("accounts.transaction.optionDebit")}
                    </option>
                    <option value="Expense">
                      {t("accounts.transaction.optionExpense")}
                    </option>
                  </select>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    {selectedAccount.type === "supplier"
                      ? t("accounts.transaction.systemAccountSupplier")
                      : t("accounts.transaction.systemAccountCustomer")}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("accounts.transaction.systemAccountLabel")}
                      </label>
                      <select
                        className={`${inputStyle} ${transactionErrors.systemAccountId ? "border-red-500" : ""}`}
                        disabled={!transactionBalancesReady}
                        {...registerTransaction("systemAccountId", { required: true })}
                      >
                        <option value="">
                          {t("accounts.transaction.selectSystemAccount")}
                        </option>
                        {systemAccountsData?.accounts?.map((acc) => (
                          <option key={acc._id} value={acc._id}>
                            {acc.name} ({formatNumber(acc.currentBalance)} AFN)
                          </option>
                        ))}
                      </select>
                      {transactionErrors.systemAccountId && (
                        <p className="text-red-500 text-xs mt-1">
                          مهرباني وکړئ سیسټم حساب وټاکئ
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("accounts.transaction.amount")}
                      </label>
                      <input
                        {...registerNumeric("amount", registerTransaction, {
                          required: "اندازه اړینه ده",
                          min: {
                            value: 0.01,
                            message: "اندازه باید له 0 څخه زیاته وي",
                          },
                          validate: (value) =>
                            parseFloat(value) > 0 || "اندازه باید مثبته وي",
                        }, {
                          className: `${inputStyle} ${transactionErrors.amount ? "border-red-500" : ""}`,
                          placeholder: t("accounts.transaction.amountPlaceholder"),
                        })}
                      />
                      {transactionErrors.amount && (
                        <p className="text-red-500 text-xs mt-1">
                          {transactionErrors.amount.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.transaction.description")}
                  </label>
                  <textarea
                    className={inputStyle}
                    rows={2}
                    placeholder={t(
                      "accounts.transaction.descriptionPlaceholder"
                    )}
                    {...registerTransaction("description")}
                  />
                </div>

                <div className="bg-yellow-50 p-2.5 sm:p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>{t("accounts.transaction.noteLabel")}</strong>
                    {watchedTransactionType === "Credit" &&
                      t("accounts.transaction.noteCredit")}
                    {watchedTransactionType === "Debit" &&
                      t("accounts.transaction.noteDebit")}
                    {watchedTransactionType === "Expense" &&
                      t("accounts.transaction.noteExpense")}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransactionModal(false);
                      setSelectedAccount(null);
                      transactionModalAccountIdRef.current = null;
                      setTransactionBalancesReady(true);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-sm hover:bg-gray-50"
                  >
                    {t("accounts.transaction.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isTransactionActionPending || !transactionBalancesReady
                    }
                    className={`px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 ${
                      isTransactionActionPending
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isTransactionActionPending
                      ? t("accounts.transaction.adding")
                      : t("accounts.transaction.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </GloableModal>

      {/* Transfer Money Modal */}
      <GloableModal
        open={showTransferModal}
        setOpen={setShowTransferModal}
        isClose={true}
      >
        <div className="w-full max-w-[min(580px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="bg-white rounded-sm shadow-lg border border-slate-200">
            <div
              className="px-5 py-3 border-b flex justify-between items-center"
              style={{ borderColor: "var(--border)" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--primary-brown)" }}
              >
                {t("accounts.transfer.title")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowTransferModal(false);
                  resetTransfer();
                }}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={handleSubmitTransfer(onSubmitTransfer)}
              className="px-5 py-4 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-medium)" }}
                  >
                    {t("accounts.transfer.fromAccount")}
                  </label>
                  <select
                    className={transferInputStyle}
                    {...registerTransfer("fromAccountId", { required: true })}
                  >
                    <option value="">
                      {t("accounts.transfer.selectFromAccount")}
                    </option>
                    {systemAccountsData?.accounts?.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({formatNumber(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-medium)" }}
                  >
                    {t("accounts.transfer.toAccount")}
                  </label>
                  <select
                    className={transferInputStyle}
                    {...registerTransfer("toAccountId", { required: true })}
                  >
                    <option value="">
                      {t("accounts.transfer.selectToAccount")}
                    </option>
                    {systemAccountsData?.accounts
                      ?.filter((acc) => acc._id !== watchedFromAccount)
                      .map((acc) => (
                        <option key={acc._id} value={acc._id}>
                          {acc.name} ({formatNumber(acc.currentBalance)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-medium)" }}
                  >
                    {t("accounts.transfer.amount")}
                  </label>
                  <input
                    {...registerNumeric("amount", registerTransfer, {
                      required: true,
                      min: 0.01,
                    }, {
                      className: transferInputStyle,
                      placeholder: t("accounts.transfer.amountPlaceholder"),
                    })}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "var(--text-medium)" }}
                  >
                    {t("accounts.transfer.description")}
                  </label>
                  <input
                    type="text"
                    className={transferInputStyle}
                    placeholder={t("accounts.transfer.descriptionPlaceholder")}
                    {...registerTransfer("description")}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    resetTransfer();
                  }}
                  className="text-sm px-4 py-2 rounded-sm border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  {t("accounts.transfer.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className={`btn-primary text-sm px-4 py-2 rounded-sm ${
                    isTransferring ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {isTransferring
                    ? t("accounts.transfer.submitting")
                    : t("accounts.transfer.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </GloableModal>

      {/* Hidden PDF Content */}
      {(exportingPDF || allAccountsForPDF.length > 0) && (
        <div 
          id="accounts-pdf-content" 
          style={{ 
            position: "fixed",
            left: "0",
            top: "0",
            width: "100%",
            backgroundColor: "white",
            zIndex: 9999,
            pointerEvents: "none"
          }}
        >
          <AccountsPDF
            accounts={allAccountsForPDF.length > 0 ? allAccountsForPDF : accounts}
            accountType={type}
            reportDate={new Date().toISOString()}
          />
        </div>
      )}

      {/* PDF Export Loading Overlay */}
      {exportingPDF && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "white", fontSize: "1.25rem" }}>
            PDF جوړیږي...
          </p>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
};

export default Accounts;
