import { useState } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_ENDPOINTS } from "../services/apiConfig";
import { toast } from "react-toastify";
import { formatNumber, normalizeDateToIso } from "../utilies/helper";
import { inputStyle } from "../components/ProductForm";
import Button from "../components/Button";
import Table from "../components/Table";
import TableHeader from "../components/TableHeader";
import TableBody from "../components/TableBody";
import TableRow from "../components/TableRow";
import TableColumn from "../components/TableColumn";
import Pagination from "../components/Pagination";
import JalaliDatePicker from "../components/JalaliDatePicker";

const fetchExpenses = async ({
  page,
  limit,
  category,
  startDate,
  endDate,
  search,
}) => {
  const params = new URLSearchParams();
  if (page) params.set("page", page);
  if (limit) params.set("limit", limit);
  if (category) params.set("category", category);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (search) params.set("search", search);
  const res = await apiRequest(
    `${API_ENDPOINTS.EXPENSES.LIST}?${params.toString()}`
  );
  return res;
};

const fetchCategories = async () => {
  const res = await apiRequest(
    `${API_ENDPOINTS.CATEGORIES.LIST}?type=expense&isActive=true`
  );
  return res;
};

const fetchAccounts = async () => {
  // Only system money accounts: cashier, safe, saraf
  const res = await apiRequest(API_ENDPOINTS.ACCOUNTS.SYSTEM);
  return res;
};

const createExpenseApi = async (payload) => {
  return apiRequest(API_ENDPOINTS.EXPENSES.CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

const updateExpenseApi = async ({ id, payload }) => {
  return apiRequest(API_ENDPOINTS.EXPENSES.UPDATE(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

const deleteExpenseApi = async (id) => {
  return apiRequest(API_ENDPOINTS.EXPENSES.DELETE(id), { method: "DELETE" });
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [category, setCategory] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const { data: expensesRes, isLoading } = useQuery({
    queryKey: ["expenses", { page, limit, category, dateRange, search }],
    queryFn: () =>
      fetchExpenses({
        page,
        limit,
        category: category || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        search: search || undefined,
      }),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: fetchCategories,
  });

  const { data: accountsRes } = useQuery({
    queryKey: ["money-accounts"],
    queryFn: fetchAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createExpenseApi,
    onSuccess: (_, variables) => {
      toast.success("هزینه ثبت شد");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      if (variables?.paidFromAccount) {
        queryClient.invalidateQueries({
          queryKey: ["accountLedger", variables.paidFromAccount],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      }
      setIsModalOpen(false);
    },
    onError: (e) => toast.error(e.message || "ثبت هزینه ناموفق بود"),
  });

  const updateMutation = useMutation({
    mutationFn: updateExpenseApi,
    onSuccess: (_, variables) => {
      toast.success("هزینه ویرایش شد");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      const targetAccount =
        variables?.payload?.paidFromAccount ||
        editingExpense?.paidFromAccount?._id ||
        editingExpense?.paidFromAccount;
      if (targetAccount) {
        queryClient.invalidateQueries({
          queryKey: ["accountLedger", targetAccount],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    },
    onError: (e) => toast.error(e.message || "ویرایش هزینه ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpenseApi,
    onSuccess: () => {
      toast.success("حذف شد");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
    },
    onError: (e) => toast.error(e.message || "حذف ناموفق بود"),
  });

  const expenses = expensesRes?.data || [];
  const pagination = expensesRes?.pagination || {
    currentPage: 1,
    totalPages: 1,
  };
  const total = expensesRes?.total || 0;
  const categories = categoriesRes?.data || [];
  const accounts = accountsRes?.accounts || accountsRes?.data || [];

  const onCreate = (form) => {
    createMutation.mutate(form);
  };

  const onUpdate = (id, form) => {
    updateMutation.mutate({ id, payload: form });
  };

  const onDelete = (id) => {
    if (window.confirm("آیا از حذف این هزینه مطمئن هستید؟")) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fa-IR");
  };

  return (
    <div className="p-4" style={{ color: "var(--text-dark)" }}>
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--primary-brown)" }}
        >
          هزینه‌ها
        </h1>
        <button
          className=" bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200`"
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
        >
          افزودن هزینه
        </button>
      </div>

      {/* Filters */}
      <div className=" bg-white p-3 rounded-sm  border border-slate-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              دسته‌بندی
            </label>
            <select
              className={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">همه</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <JalaliDatePicker
              label="از تاریخ"
              value={dateRange.start}
              onChange={(nextValue) =>
                setDateRange((d) => ({
                  ...d,
                  start: normalizeDateToIso(nextValue),
                }))
              }
              placeholder="انتخاب تاریخ شروع"
              clearable
            />
          </div>
          <div>
            <JalaliDatePicker
              label="تا تاریخ"
              value={dateRange.end}
              onChange={(nextValue) =>
                setDateRange((d) => ({
                  ...d,
                  end: normalizeDateToIso(nextValue),
                }))
              }
              placeholder="انتخاب تاریخ پایان"
              clearable
            />
          </div>
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              جستجو
            </label>
            <input
              type="text"
              className={inputStyle}
              placeholder="توضیحات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader
          headerData={[
            { title: "تاریخ" },
            { title: "دسته‌بندی" },
            { title: "مبلغ" },
            { title: "پرداخت از" },
            { title: "توضیحات" },
            { title: "اقدامات" },
          ]}
        />
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableColumn colSpan="6" className="text-center py-6">
                در حال بارگذاری...
              </TableColumn>
            </TableRow>
          ) : expenses.length === 0 ? (
            <TableRow>
              <TableColumn colSpan="6" className="text-center py-6">
                موردی یافت نشد
              </TableColumn>
            </TableRow>
          ) : (
            expenses.map((e) => (
              <TableRow key={e._id}>
                <TableColumn>
                  {formatDate(e.date)}
                </TableColumn>
                <TableColumn>{e.category?.name || "-"}</TableColumn>
                <TableColumn>{formatNumber(e.amount || 0)} افغانی</TableColumn>
                <TableColumn>{e.paidFromAccount?.name || "-"}</TableColumn>
                <TableColumn>{e.description || "-"}</TableColumn>
                <TableColumn>
                  <div className="flex gap-2 justify-end items-center">
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => {
                        setEditingExpense(e);
                        setIsModalOpen(true);
                      }}
                      title="ویرایش"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => onDelete(e._id)}
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </TableColumn>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Pagination
        page={pagination.currentPage}
        limit={limit}
        total={total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        onRowsPerPageChange={setLimit}
      />

      {isModalOpen && (
        <ExpenseModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingExpense(null);
          }}
          onSubmit={(form) =>
            editingExpense ? onUpdate(editingExpense._id, form) : onCreate(form)
          }
          categories={categories}
          accounts={accounts}
          initial={editingExpense}
        />
      )}
    </div>
  );
}

function ExpenseModal({ onClose, onSubmit, categories, accounts, initial }) {
  const [form, setForm] = useState({
    category: initial?.category?._id || initial?.category || "",
    amount: initial?.amount || "",
    paidFromAccount:
      initial?.paidFromAccount?._id || initial?.paidFromAccount || "",
    date:
      normalizeDateToIso(initial?.date) ||
      new Date().toISOString().slice(0, 10),
    description: initial?.description || "",
  });

  const canSubmit = form.category && form.amount && form.paidFromAccount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "date") {
      setForm((f) => ({
        ...f,
        date: normalizeDateToIso(value) || "",
      }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg card">
        <h2
          className="text-lg font-bold mb-4"
          style={{ color: "var(--primary-brown)" }}
        >
          {initial ? "ویرایش هزینه" : "افزودن هزینه"}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              دسته‌بندی
            </label>
            <select
              className={inputStyle}
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="">انتخاب کنید</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              مبلغ
            </label>
            <input
              className={inputStyle}
              name="amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={handleChange}
            />
          </div>
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              پرداخت از
            </label>
            <select
              className={inputStyle}
              name="paidFromAccount"
              value={form.paidFromAccount}
              onChange={handleChange}
            >
              <option value="">انتخاب حساب</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <JalaliDatePicker
              label="تاریخ"
              name="date"
              value={form.date}
              onChange={(nextValue) =>
                setForm((f) => ({
                  ...f,
                  date:
                    normalizeDateToIso(nextValue) ||
                    new Date().toISOString().slice(0, 10),
                }))
              }
              placeholder="انتخاب تاریخ"
              clearable={false}
            />
          </div>
          <div className=" col-span-2">
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              توضیحات
            </label>
            <textarea
              className={inputStyle}
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="flex  items-center justify-start gap-2 mt-6">
          <div className=" w-[50%] gap-x-2 flex items-center hover:border-slate-600">
            <Button
              className=" bg-transparent border rounded-sm "
              onClick={onClose}
            >
              لغو
            </Button>
            <Button
              className=" bg-amber-600 text-white"
              disabled={!canSubmit}
              onClick={() =>
                onSubmit({
                  category: form.category,
                  amount: Number(form.amount),
                  paidFromAccount: form.paidFromAccount,
                    date:
                      normalizeDateToIso(form.date) ||
                      new Date().toISOString().slice(0, 10),
                  description: form.description,
                })
              }
            >
              {initial ? "ذخیره تغییرات" : "ثبت"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
