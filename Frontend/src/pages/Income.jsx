import { useState } from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, API_ENDPOINTS } from "../services/apiConfig";
import { toast } from "react-toastify";
import { formatNumber, normalizeDateToIso } from "../utilies/helper";
import Table from "../components/Table";
import TableHeader from "../components/TableHeader";
import TableBody from "../components/TableBody";
import TableRow from "../components/TableRow";
import TableColumn from "../components/TableColumn";
import Pagination from "../components/Pagination";
import GloableModal from "../components/GloableModal";
import { useSubmitLock } from "../hooks/useSubmitLock.js";
import JalaliDatePicker from "../components/JalaliDatePicker";

const fetchIncome = async ({
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
    `${API_ENDPOINTS.INCOME.LIST}?${params.toString()}`
  );
  return res;
};

const fetchCategories = async () => {
  const res = await apiRequest(
    `${API_ENDPOINTS.CATEGORIES.LIST}?type=income&isActive=true`
  );
  return res;
};

const fetchAccounts = async () => {
  // Only system money accounts: cashier, safe, saraf
  const res = await apiRequest(API_ENDPOINTS.ACCOUNTS.SYSTEM);
  return res;
};

const createIncomeApi = async (payload) => {
  return apiRequest(API_ENDPOINTS.INCOME.CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

const updateIncomeApi = async ({ id, payload }) => {
  return apiRequest(API_ENDPOINTS.INCOME.UPDATE(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
};

const deleteIncomeApi = async (id) => {
  return apiRequest(API_ENDPOINTS.INCOME.DELETE(id), { method: "DELETE" });
};

export default function Income() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [category, setCategory] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);

  const { data: incomeRes, isLoading } = useQuery({
    queryKey: ["income", { page, limit, category, dateRange, search }],
    queryFn: () =>
      fetchIncome({
        page,
        limit,
        category: category || undefined,
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        search: search || undefined,
      }),
  });

  const { data: categoriesRes } = useQuery({
    queryKey: ["income-categories"],
    queryFn: fetchCategories,
  });

  const { data: accountsRes } = useQuery({
    queryKey: ["money-accounts"],
    queryFn: fetchAccounts,
  });

  const createMutation = useMutation({
    mutationFn: createIncomeApi,
    onSuccess: (_, variables) => {
      toast.success("درآمد ثبت شد");
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      if (variables?.placedInAccount) {
        queryClient.invalidateQueries({
          queryKey: ["accountLedger", variables.placedInAccount],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      }
      setIsModalOpen(false);
    },
    onError: (e) => toast.error(e.message || "ثبت درآمد ناموفق بود"),
  });

  const updateMutation = useMutation({
    mutationFn: updateIncomeApi,
    onSuccess: (_, variables) => {
      toast.success("درآمد ویرایش شد");
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      const targetAccount =
        variables?.payload?.placedInAccount ||
        editingIncome?.placedInAccount?._id ||
        editingIncome?.placedInAccount;
      if (targetAccount) {
        queryClient.invalidateQueries({
          queryKey: ["accountLedger", targetAccount],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      }
      setIsModalOpen(false);
      setEditingIncome(null);
    },
    onError: (e) => toast.error(e.message || "ویرایش درآمد ناموفق بود"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIncomeApi,
    onSuccess: () => {
      toast.success("حذف شد");
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
    },
    onError: (e) => toast.error(e.message || "حذف ناموفق بود"),
  });

  const income = incomeRes?.data || [];
  const pagination = incomeRes?.pagination || {
    currentPage: 1,
    totalPages: 1,
    total: 0,
  };
  const categories = categoriesRes?.data || [];
  const accounts = accountsRes?.accounts || accountsRes?.data || [];

  const onCreate = (form) => createMutation.mutateAsync(form);

  const onUpdate = (id, form) =>
    updateMutation.mutateAsync({ id, payload: form });

  const onDelete = (id) => {
    if (window.confirm("آیا از حذف این درآمد مطمئن هستید؟")) {
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
          درآمد‌ها
        </h1>
        <button
          className={`bg-amber-600 cursor-pointer group  text-white hover:bg-amber-600/90  duration-200   flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in `}
          onClick={() => {
            setEditingIncome(null);
            setIsModalOpen(true);
          }}
        >
          افزودن درآمد
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label
              className="block mb-2"
              style={{ color: "var(--text-medium)" }}
            >
              دسته‌بندی
            </label>
            <select
              className={
                "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
              }
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
              className={
                "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
              }
              placeholder="منبع یا توضیحات..."
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
            { title: "منبع" },
            { title: "قرار داده شده در" },
            { title: "توضیحات" },
            { title: "اقدامات" },
          ]}
        />
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableColumn colSpan="7" className="text-center py-6">
                در حال بارگذاری...
              </TableColumn>
            </TableRow>
          ) : income.length === 0 ? (
            <TableRow>
              <TableColumn colSpan="7" className="text-center py-6">
                موردی یافت نشد
              </TableColumn>
            </TableRow>
          ) : (
            income.map((i) => (
              <TableRow key={i._id}>
                <TableColumn>
                  {formatDate(i.date)}
                </TableColumn>
                <TableColumn>{i.category?.name || "-"}</TableColumn>
                <TableColumn>{formatNumber(i.amount || 0)} افغانی</TableColumn>
                <TableColumn>{i.source || "-"}</TableColumn>
                <TableColumn>{i.placedInAccount?.name || "-"}</TableColumn>
                <TableColumn>{i.description || "-"}</TableColumn>
                <TableColumn>
                  <div className="flex gap-2 justify-end items-center">
                    <button
                      className="text-indigo-600 hover:text-indigo-900"
                      onClick={() => {
                        setEditingIncome(i);
                        setIsModalOpen(true);
                      }}
                      title="ویرایش"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => onDelete(i._id)}
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
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        onRowsPerPageChange={setLimit}
      />

      <GloableModal open={isModalOpen} setOpen={setIsModalOpen} isClose={true}>
        <IncomeModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingIncome(null);
          }}
          onSubmit={(form) =>
            editingIncome ? onUpdate(editingIncome._id, form) : onCreate(form)
          }
          categories={categories}
          accounts={accounts}
          initial={editingIncome}
        />
      </GloableModal>
    </div>
  );
}

function IncomeModal({ onClose, onSubmit, categories, accounts, initial }) {
  const [form, setForm] = useState({
    category: initial?.category?._id || initial?.category || "",
    amount: initial?.amount || "",
    placedInAccount:
      initial?.placedInAccount?._id || initial?.placedInAccount || "",
    date:
      normalizeDateToIso(initial?.date) ||
      new Date().toISOString().slice(0, 10),
    description: initial?.description || "",
  });
  const { isSubmitting, wrapSubmit } = useSubmitLock();

  const canSubmit = form.category && form.amount && form.placedInAccount;

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

  const handleSubmit = wrapSubmit(async () => {
    if (!canSubmit) return;
    await onSubmit({
      category: form.category,
      amount: Number(form.amount),
      placedInAccount: form.placedInAccount,
      date:
        normalizeDateToIso(form.date) ||
        new Date().toISOString().slice(0, 10),
      description: form.description,
    });
  });

  return (
    <div className="relative  w-[530px] bg-white p-6 rounded-sm  ">
      <h2
        className="text-lg font-bold "
        style={{ color: "var(--primary-brown)" }}
      >
        {initial ? "ویرایش درآمد" : "افزودن درآمد"}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-2" style={{ color: "var(--text-medium)" }}>
            دسته‌بندی
          </label>
          <select
            className={
              "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
            }
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
          <label className="block mb-2" style={{ color: "var(--text-medium)" }}>
            مبلغ
          </label>
          <input
            className={
              "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
            }
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
          />
        </div>
        <div>
          <label className="block mb-2" style={{ color: "var(--text-medium)" }}>
            قرار داده شده در
          </label>
          <select
            className={
              "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
            }
            name="placedInAccount"
            value={form.placedInAccount}
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
          <label className="block mb-2" style={{ color: "var(--text-medium)" }}>
            توضیحات
          </label>
          <textarea
            className={
              "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-sm px-3 py-2.5 transition duration-300 ease focus:outline-none  hover:border-slate-300 focus:border-slate-300  shadow-sm"
            }
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="3"
          />
        </div>
      </div>
      <div className="flex items-center justify-start gap-2 mt-6">
        <button
          className={` bg-transparent border border-slate-600 cursor-pointer group  text-black     flex gap-2 justify-center items-center  px-4 py-2 rounded-sm font-medium text-sm  transition-all ease-in duration-200`}
          onClick={onClose}
        >
          لغو
        </button>
        <button
          className={`bg-amber-600 text-white hover:bg-amber-600/90 flex gap-2 justify-center items-center px-4 py-2 rounded-sm font-medium text-sm transition-all ease-in duration-200 ${
            !canSubmit || isSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
          disabled={!canSubmit || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting
            ? initial
              ? "در حال ذخیره..."
              : "در حال ثبت..."
            : initial
            ? "ذخیره تغییرات"
            : "ثبت"}
        </button>
      </div>
    </div>
  );
}
