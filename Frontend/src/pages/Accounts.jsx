import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useSuppliers,
  useCustomers,
  useEmployees,
  useCreateTransaction,
} from "../services/useApi";
import GloableModal from "../components/GloableModal";
import { inputStyle } from "../components/ProductForm";
import { toast } from "react-toastify";
import { formatNumber } from "../utilies/helper";
import { useSubmitLock } from "../hooks/useSubmitLock.js";

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
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletedId, setDeletedId] = useState(null);
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

  const { mutate: createAccountMutation } = useCreateAccount();
  const { mutate: updateAccountMutation } = useUpdateAccount();
  const { mutate: deleteAccountMutation, isPending: isDeleting } =
    useDeleteAccount();
  const { mutate: createTransaction } = useCreateTransaction();
  // Helper functions
  const isSystemAccount = (accountType) => {
    return ["cashier", "safe", "saraf"].includes(accountType);
  };

  const getReferenceOptions = (accountType) => {
    switch (accountType) {
      case "supplier":
        return suppliersData?.data || [];
      case "customer":
        return customersData?.data || [];
      case "employee":
        return employeesData?.data || [];
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

  const watchedTransactionType = watch("transactionType") || "Credit";
  const isAccountActionPending = accountSubmitLock.isSubmitting;
  const isTransactionActionPending = transactionSubmitLock.isSubmitting;

  const onSubmitAccount = accountSubmitLock.wrapSubmit(async (data) => {
    const accountData = {
      ...data,
      refId: isSystemAccount(data.type) ? null : data.refId,
    };

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

  const handleAddTransaction = (acc) => {
    setSelectedAccount(acc);
    setShowTransactionModal(true);
    setValue("transactionType", "Credit");
    setValue("amount", "");
    setValue("description", "");
  };

  const onSubmitTransaction = transactionSubmitLock.wrapSubmit(async (data) => {
    try {
      const transactionData = {
        accountId: selectedAccount._id,
        transactionType: data.transactionType,
        amount: parseFloat(data.amount),
        description:
          data.description ||
          t("accounts.transaction.defaultDescription", {
            type: data.transactionType,
          }),
      };

      await runMutation(createTransaction, transactionData);
      setShowTransactionModal(false);
      setSelectedAccount(null);
      setValue("transactionType", "Credit");
      setValue("amount", "");
      setValue("description", "");
    } catch (err) {
      console.error(err);
    }
  });

  const formatCreatedAt = (iso) => {
    if (!iso) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag =
      lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(iso).toLocaleDateString(localeTag);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("accounts.title")}</h1>
          <p className="text-gray-600 mt-1">{t("accounts.subtitle")}</p>
        </div>
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

      {/* Type filter and search */}
      <div className="bg-white rounded-lg  border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
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
                onClick={() => {
                  setType(typeOption.id);
                  setSearchParams({ type: typeOption.id });
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-sm flex items-center gap-2 transition-colors ${
                  type === typeOption.id
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <typeOption.icon className="h-4 w-4" />
                {t(`accounts.types.${typeOption.id}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
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

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleAddTransaction(acc)}
                          title={t("accounts.actions.addTransaction")}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
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
        <div className=" overflow-y-auto w-[450px] h-[480px] rounded-md ">
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
              {!isSystemAccount(watch("type") || type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.modal.reference")}
                  </label>
                  <select
                    className={inputStyle}
                    {...register("refId", {
                      required: !isSystemAccount(watch("type") || type),
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("accounts.modal.openingBalance")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={inputStyle}
                  defaultValue={0}
                  {...register("openingBalance", { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("accounts.modal.openingBalanceHint")}
                </p>
              </div>
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
          <div className=" overflow-y-auto w-[480px] h-[500px]">
            <div className="bg-white rounded-lg shadow-xl">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("accounts.transaction.title")}
                </h2>
                <button
                  onClick={() => {
                    setShowTransactionModal(false);
                    setSelectedAccount(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={handleSubmit(onSubmitTransaction)}
                className="p-6 space-y-4"
              >
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {t("accounts.transaction.account")}: {selectedAccount.name}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {t("accounts.transaction.currentBalance")}:{" "}
                    {formatNumber(selectedAccount.currentBalance ?? 0)} AFN
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.transaction.transactionType")}
                  </label>
                  <select
                    className={inputStyle}
                    {...register("transactionType", { required: true })}
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
                  <div className="mt-2 p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t("accounts.transaction.examplesTitle")}
                    </p>
                    <div className="text-xs text-gray-600 space-y-1">
                      {watchedTransactionType === "Credit" && (
                        <>
                          <p>{t("accounts.transaction.creditEx1")}</p>
                          <p>{t("accounts.transaction.creditEx2")}</p>
                          <p>{t("accounts.transaction.creditEx3")}</p>
                        </>
                      )}
                      {watchedTransactionType === "Debit" && (
                        <>
                          <p>{t("accounts.transaction.debitEx1")}</p>
                          <p>{t("accounts.transaction.debitEx2")}</p>
                          <p>{t("accounts.transaction.debitEx3")}</p>
                        </>
                      )}
                      {watchedTransactionType === "Expense" && (
                        <>
                          <p>{t("accounts.transaction.expenseEx1")}</p>
                          <p>{t("accounts.transaction.expenseEx2")}</p>
                          <p>{t("accounts.transaction.expenseEx3")}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.transaction.amount")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputStyle}
                    placeholder={t("accounts.transaction.amountPlaceholder")}
                    {...register("amount", { required: true, min: 0.01 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("accounts.transaction.description")}
                  </label>
                  <textarea
                    className={inputStyle}
                    rows={3}
                    placeholder={t(
                      "accounts.transaction.descriptionPlaceholder"
                    )}
                    {...register("description")}
                  />
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
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

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransactionModal(false);
                      setSelectedAccount(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-sm hover:bg-gray-50"
                  >
                    {t("accounts.transaction.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isTransactionActionPending}
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
    </div>
  );
};

export default Accounts;
