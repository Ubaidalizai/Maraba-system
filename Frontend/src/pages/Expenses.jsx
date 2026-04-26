import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  // Only cashier and safe accounts
  const res = await apiRequest(API_ENDPOINTS.ACCOUNTS.SYSTEM);
  // Filter to only show cashier and safe
  return {
    ...res,
    accounts: (res.accounts || res.data || []).filter(
      (acc) => acc.type === 'cashier' || acc.type === 'safe'
    ),
  };
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
  const { t, i18n } = useTranslation();
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
      toast.success(t("expenses.toast.createSuccess"));
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
    onError: (e) =>
      toast.error(e.message || t("expenses.toast.createError")),
  });

  const updateMutation = useMutation({
    mutationFn: updateExpenseApi,
    onSuccess: (_, variables) => {
      toast.success(t("expenses.toast.updateSuccess"));
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
    onError: (e) =>
      toast.error(e.message || t("expenses.toast.updateError")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpenseApi,
    onSuccess: () => {
      toast.success(t("expenses.toast.deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
    },
    onError: (e) =>
      toast.error(e.message || t("expenses.toast.deleteError")),
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
    if (window.confirm(t("expenses.deleteConfirm"))) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag =
      lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(dateString).toLocaleDateString(localeTag);
  };

  return (
    <div className="p-4" style={{ color: "var(--text-dark)" }}>
      <div className="flex items-center justify-between mb-4">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--primary-brown)" }}
        >
          {t("expenses.title")}
        </h1>
        <button
          className=" bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200`"
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
        >
          {t("expenses.addExpense")}
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
              {t("expenses.filters.category")}
            </label>
            <select
              className={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("expenses.filters.all")}</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <JalaliDatePicker
              label={t("expenses.filters.dateFrom")}
              value={dateRange.start}
              onChange={(nextValue) =>
                setDateRange((d) => ({
                  ...d,
                  start: normalizeDateToIso(nextValue),
                }))
              }
              placeholder={t("expenses.filters.dateFromPlaceholder")}
              clearable
            />
          </div>
          <div>
            <JalaliDatePicker
              label={t("expenses.filters.dateTo")}
              value={dateRange.end}
              onChange={(nextValue) =>
                setDateRange((d) => ({
                  ...d,
                  end: normalizeDateToIso(nextValue),
                }))
              }
              placeholder={t("expenses.filters.dateToPlaceholder")}
              clearable
            />
          </div>
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              {t("expenses.filters.search")}
            </label>
            <input
              type="text"
              className={inputStyle}
              placeholder={t("expenses.filters.searchPlaceholder")}
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
            { title: t("expenses.table.date") },
            { title: t("expenses.table.category") },
            { title: t("expenses.table.amount") },
            { title: t("expenses.table.paidFrom") },
            { title: t("expenses.table.description") },
            { title: t("expenses.table.actions") },
          ]}
        />
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableColumn colSpan="6" className="text-center py-6">
                {t("expenses.table.loading")}
              </TableColumn>
            </TableRow>
          ) : expenses.length === 0 ? (
            <TableRow>
              <TableColumn colSpan="6" className="text-center py-6">
                {t("expenses.table.empty")}
              </TableColumn>
            </TableRow>
          ) : (
            expenses.map((e) => (
              <TableRow key={e._id}>
                <TableColumn>
                  {formatDate(e.date)}
                </TableColumn>
                <TableColumn>{e.category?.name || "-"}</TableColumn>
                <TableColumn>
                  {formatNumber(e.amount || 0)}{" "}
                  {t("expenses.table.currencySuffix")}
                </TableColumn>
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
                      title={t("expenses.actions.edit")}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => onDelete(e._id)}
                      title={t("expenses.actions.delete")}
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
  const { t } = useTranslation();
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
          {initial
            ? t("expenses.modal.titleEdit")
            : t("expenses.modal.titleAdd")}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              {t("expenses.modal.category")}
            </label>
            <select
              className={inputStyle}
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="">{t("expenses.modal.selectCategory")}</option>
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
              {t("expenses.modal.amount")}
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
              {t("expenses.modal.paidFrom")}
            </label>
            <select
              className={inputStyle}
              name="paidFromAccount"
              value={form.paidFromAccount}
              onChange={handleChange}
            >
              <option value="">{t("expenses.modal.selectAccount")}</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <JalaliDatePicker
              label={t("expenses.modal.date")}
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
              placeholder={t("expenses.modal.datePlaceholder")}
              clearable={false}
            />
          </div>
          <div className=" col-span-2">
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              {t("expenses.modal.description")}
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
              {t("expenses.modal.cancel")}
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
              {initial
                ? t("expenses.modal.saveChanges")
                : t("expenses.modal.submit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
