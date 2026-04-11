import { useState } from "react";
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
          data.description || `Manual ${data.transactionType} transaction`,
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

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">مدیریت حسابات</h1>
          <p className="text-gray-600 mt-1">ایجاد و مدیریت حساب های سیستم</p>
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
          حساب جدید
        </button>
      </div>

      {/* Type filter and search */}
      <div className="bg-white rounded-lg  border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "supplier", label: "تهیه‌کننده", icon: BuildingOfficeIcon },
              { id: "customer", label: "مشتری", icon: UserIcon },
              { id: "employee", label: "کارمند", icon: UserIcon },
              { id: "cashier", label: "صندوق", icon: BanknotesIcon },
              { id: "safe", label: "صندوق امانات", icon: CurrencyDollarIcon },
              { id: "saraf", label: "صراف", icon: CurrencyDollarIcon },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setType(t.id);
                  setSearchParams({ type: t.id });
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-sm flex items-center gap-2 transition-colors ${
                  type === t.id
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
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
              placeholder="جستجو بر اساس نام حساب..."
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
                  نام
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  نوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  موجودی اولیه
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  موجودی فعلی
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  ارز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  تاریخ ایجاد
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  عملیات
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
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    حسابی یافت نشد
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
                      {new Date(acc.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => navigate(`/accounts/${acc._id}`)}
                          title="مشاهده جزئیات"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleAddTransaction(acc)}
                          title="افزودن تراکنش"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleEdit(acc)}
                          title="ویرایش"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => {
                            setDeletedId(acc._id);
                            setDeleteModal(true);
                          }}
                          title="حذف"
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
              صفحه {page} از {totalPages} (مجموع {total} حساب)
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                قبلی
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                بعدی
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
              <h3 className="text-lg font-semibold text-gray-900">تأیید حذف</h3>
            </div>
            <p className="text-gray-600 mb-6">
              آیا مطمئن هستید که می‌خواهید این را حذف کنید؟ این عمل قابل بازگشت
              نیست.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                لغو
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setDeleteModal(false);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "در حال حذف..." : "حذف"}
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
                {editingAccount ? "ویرایش حساب" : "ایجاد حساب جدید"}
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
                  نوع حساب *
                </label>
                <select
                  className={inputStyle}
                  defaultValue={type}
                  {...register("type", { required: true })}
                >
                  <option value="supplier">تهیه‌کننده</option>
                  <option value="customer">مشتری</option>
                  <option value="employee">کارمند</option>
                  <option value="cashier">صندوق</option>
                  <option value="safe">صندوق امانات</option>
                  <option value="saraf">صراف</option>
                </select>
              </div>

              {/* Reference field - only show for entity accounts */}
              {!isSystemAccount(watch("type") || type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    مرجع *
                  </label>
                  <select
                    className={inputStyle}
                    {...register("refId", {
                      required: !isSystemAccount(watch("type") || type),
                    })}
                  >
                    <option value="">انتخاب مرجع</option>
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
                  نام حساب *
                </label>
                <input
                  className={inputStyle}
                  placeholder="نام حساب"
                  {...register("name", { required: true })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  موجودی اولیه
                </label>
                <input
                  type="number"
                  step="0.01"
                  className={inputStyle}
                  defaultValue={0}
                  {...register("openingBalance", { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  (موجودی فعلی به صورت خودکار برابر با موجودی اولیه تنظیم
                  می‌شود)
                </p>
              </div>
              <div className=" col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ارز
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
                  انصراف
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
                    ? "در حال ذخیره..."
                    : editingAccount
                    ? "ذخیره تغییرات"
                    : "ایجاد حساب"}
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
                  افزودن تراکنش دستی
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
                    حساب: {selectedAccount.name}
                  </h3>
                  <p className="text-sm text-blue-700">
                    موجودی فعلی:{" "}
                    {formatNumber(selectedAccount.currentBalance ?? 0)} AFN
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع تراکنش *
                  </label>
                  <select
                    className={inputStyle}
                    {...register("transactionType", { required: true })}
                  >
                    <option value="Credit">
                      اعتبار (موجودی حساب افزایش می‌یابد)
                    </option>
                    <option value="Debit">
                      بدهی (موجودی حساب کاهش می‌یابد)
                    </option>
                    <option value="Expense">
                      مصرف (هزینه - موجودی کاهش می‌یابد)
                    </option>
                  </select>
                  <div className="mt-2 p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      مثال‌های کاربردی:
                    </p>
                    <div className="text-xs text-gray-600 space-y-1">
                      {watchedTransactionType === "Credit" && (
                        <>
                          <p>
                            • مشتری پول پرداخت کرد → موجودی حساب مشتری افزایش
                            می‌یابد
                          </p>
                          <p>
                            • شما به تهیه‌کننده پول پرداخت کردید → موجودی حساب
                            تهیه‌کننده کاهش می‌یابد (بدهی شما کم شد)
                          </p>
                          <p>
                            • حقوق کارمند پرداخت شد → موجودی حساب کارمند افزایش
                            می‌یابد
                          </p>
                        </>
                      )}
                      {watchedTransactionType === "Debit" && (
                        <>
                          <p>
                            • شما به مشتری پول پرداخت کردید → موجودی حساب مشتری
                            کاهش می‌یابد
                          </p>
                          <p>
                            • تهیه‌کننده پول برگشت داد → موجودی حساب تهیه‌کننده
                            کاهش می‌یابد
                          </p>
                          <p>
                            • کارمند پول برگشت داد → موجودی حساب کارمند کاهش
                            می‌یابد
                          </p>
                        </>
                      )}
                      {watchedTransactionType === "Expense" && (
                        <>
                          <p>
                            • خرید ملزومات اداری → موجودی حساب صندوق کاهش
                            می‌یابد
                          </p>
                          <p>• پرداخت اجاره → موجودی حساب صندوق کاهش می‌یابد</p>
                          <p>
                            • هزینه تعمیرات → موجودی حساب صندوق کاهش می‌یابد
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    مبلغ *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputStyle}
                    placeholder="مبلغ به AFN"
                    {...register("amount", { required: true, min: 0.01 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    توضیحات
                  </label>
                  <textarea
                    className={inputStyle}
                    rows={3}
                    placeholder="توضیح کوتاه در مورد این تراکنش..."
                    {...register("description")}
                  />
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>نکته:</strong>
                    {watchedTransactionType === "Credit" &&
                      " این تراکنش موجودی حساب را افزایش می‌دهد."}
                    {watchedTransactionType === "Debit" &&
                      " این تراکنش موجودی حساب را کاهش می‌دهد."}
                    {watchedTransactionType === "Expense" &&
                      " این تراکنش موجودی حساب را کاهش می‌دهد."}
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
                    انصراف
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
                      ? "در حال افزودن..."
                      : "افزودن تراکنش"}
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
