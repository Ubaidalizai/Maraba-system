import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatCurrency, formatNumber } from "../utilies/helper";
import { useForm } from "react-hook-form";
import {
  useSales,
  useSale,
  useCustomers,
  useEmployees,
  useDeleteSales,
  useCreateSale,
  useAccounts,
  useUpdateSale,
} from "../services/useApi";
import { useQueryClient } from "@tanstack/react-query";
import SaleForm from "../components/SaleForm";
import { XCircleIcon } from "lucide-react";
import {
  recordSalePayment,
  fetchAccounts,
  fetchSale,
} from "../services/apiUtiles";
import SaleBillPrint from "../components/SaleBillPrint";
import GloableModal from "../components/GloableModal";
import { inputStyle } from "../components/ProductForm";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";

const Sales = () => {
  // URL parameters for payment flow
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("openId");
  const action = searchParams.get("action");
  const Naivgate = useNavigate();
  // State management
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [limit, setLimit] = useState(10);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState(null);
  const [customerToPrint, setCustomerToPrint] = useState(null);
  const [customerAccountToPrint, setCustomerAccountToPrint] = useState(null);
  const [recentlyUpdatedSale, setRecentlyUpdatedSale] = useState(null);

  // Form setup
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      saleDate: new Date().toISOString().slice(0, 10),
      customer: "",
      employee: "",
      saleType: "cash",
      billType: "small",
      discount: 0,
      tax: 0,
      notes: "",
      items: [],
    },
  });
  // API hooks
  const salesQueryParams = useMemo(
    () => ({
      customer: customerFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit,
    }),
    [customerFilter, statusFilter, page, limit]
  );

  const { data: salesResp, isLoading } = useSales(salesQueryParams);
  const { data: customers } = useCustomers();
  const { data: employees } = useEmployees();
  const { data: selectedSale, isLoading: isLoadingDetails } =
    useSale(selectedSaleId);
  const deleteSaleMutation = useDeleteSales();
  const { data: accountsData } = useAccounts({ type: "cashier" });
  const accounts = accountsData?.accounts || [];
  const { data: customerAccountsData } = useAccounts({ type: "customer" });
  const customerAccounts = customerAccountsData?.accounts || [];
  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();
  const queryClient = useQueryClient();

  // Data processing
  const sales = useMemo(() => salesResp?.sales || [], [salesResp?.sales]);
  const total = salesResp?.total || 0;
  const totalPages = salesResp?.pages || Math.max(1, Math.ceil(total / limit));

  const findCustomer = (customerId) => {
    return customers?.data?.find((cust) => cust._id === customerId);
  };

  // const findEmployee = (employeeId) => {
  //   return employees?.data?.find((emp) => emp._id === employeeId);
  // };

  // Handle URL parameters for modal flow
  useEffect(() => {
    if (openId && action === "view") {
      // Find the sale with the given ID
      const sale = sales.find((s) => s._id === openId);
      if (sale) {
        setSelectedSaleId(openId);
        setShowDetailsModal(true);
      }
    } else if (openId && action === "pay") {
      // Find the sale with the given ID
      const sale = sales.find((s) => s._id === openId);
      if (sale && sale.dueAmount > 0) {
        setSelectedSaleId(openId);
        setShowPaymentModal(true);
      }
    }
  }, [openId, action, sales]);

  // Clear URL parameters when modals close
  const clearUrlParams = () => {
    setSearchParams({});
  };

  // Event handlers
  const handleViewDetails = (saleId) => {
    setSelectedSaleId(saleId);
    setShowDetailsModal(true);
  };

  const handleEditSale = async (sale) => {
    console.log("Edit sale:", sale);
    // Fetch full sale details with items before editing
    try {
      const detail = await fetchSale(sale._id);
      const fullSale = detail?.sale || detail || sale;
      setSelectedSaleId(fullSale._id);
      setEditMode(true);
      setSaleToEdit(fullSale);
      setShowAddSaleModal(true);
    } catch (error) {
      console.error("Error fetching sale details:", error);
      // Fallback to using the sale data we have
      setSelectedSaleId(sale._id);
      setEditMode(true);
      setSaleToEdit(sale);
      setShowAddSaleModal(true);
    }
  };

  const handleDeleteSale = (saleId) => {
    setDeleteConfirmId(saleId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteSaleMutation.mutate(deleteConfirmId, {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
        onError: (error) => {
          toast.error(error.message || "خطا در حذف فروش");
        },
      });
    }
  };

  const handleCreateSale = (saleData) => {
    // Handle edit mode
    if (selectedSaleId) {
      updateSaleMutation.mutate(
        { id: selectedSaleId, ...saleData },
        {
          onSuccess: () => {
            setShowAddSaleModal(false);
            setSelectedSaleId(null);
            toast.success("خرید موفقانه اجرا شد");
          },
          onError: (error) => {
            toast.error(`خطا در ویرایش فروش: ${error.message}`);
          },
        }
      );
      return;
    }

    // Handle create mode
    createSaleMutation.mutate(saleData, {
      onSuccess: async (createdSale) => {
        // Reset form and close modal
        setShowAddSaleModal(false);

        // Find customer info
        const saleResponse = createdSale.sale || createdSale;
        const saleId = saleResponse._id || saleResponse.id;
        const customerId = saleResponse.customer?._id || saleResponse.customer;

        // Fetch full sale with items before printing
        let fullSale = saleResponse;
        try {
          const detail = await fetchSale(saleId);
          if (detail) {
            fullSale = detail.sale || detail;
          }
        } catch (err) {
          console.error("Error fetching sale details:", err);
          // Continue with saleResponse if fetch fails
        }

        const customer = customers?.data?.find((c) => c._id === customerId);

        // Find customer account if exists
        if (customerId) {
          try {
            const accountsData = await fetchAccounts({
              type: "customer",
              // Note: refId filter should be added to API if needed
            });
            const customerAccount = accountsData?.accounts?.find(
              (acc) => acc.refId === customerId
            );

            setSaleToPrint(fullSale);
            setCustomerToPrint(customer);
            setCustomerAccountToPrint(customerAccount || null);
            setShowPrintModal(true);
          } catch (error) {
            console.error("Error fetching customer account:", error);
            setSaleToPrint(fullSale);
            setCustomerToPrint(customer);
            setCustomerAccountToPrint(null);
            setShowPrintModal(true);
          }
        } else {
          // No customer, just show sale
          setSaleToPrint(fullSale);
          setCustomerToPrint(null);
          setCustomerAccountToPrint(null);
          setShowPrintModal(true);
        }
      },
      onError: (error) => {
        toast.error(`خطا در ایجاد فروش: ${error.message}`);
      },
    });
  };

  const handlePrintSale = async (sale) => {
    // Ensure we have the full sale detail (including items) before showing modal
    let fullSale = sale;
    try {
      const detail = await fetchSale(sale._id || sale.id || sale);
      if (detail) fullSale = detail.sale || detail;
    } catch (err) {
      console.error("Failed to fetch full sale detail for print:", err);
    }

    const customerId = fullSale.customer?._id || fullSale.customer;
    const customer = customers?.data?.find((c) => c._id === customerId) || null;

    // Attempt to fetch customer account (best-effort)
    let customerAccount = null;
    if (customerId) {
      try {
        const accountsData = await fetchAccounts({ type: "customer" });
        customerAccount =
          accountsData?.accounts?.find((acc) => acc.refId === customerId) ||
          null;
      } catch (err) {
        console.error("Failed to fetch customer account:", err);
      }
    }

    // Show print modal instead of navigating
    setSaleToPrint(fullSale);
    setCustomerToPrint(customer);
    setCustomerAccountToPrint(customerAccount);
    setShowPrintModal(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || !selectedAccount) {
      toast.error("لطفاً مبلغ و حساب پرداخت را وارد کنید");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedSale.dueAmount) {
      toast.error(`مبلغ وارد شده باید بین 0 و ${selectedSale.dueAmount} باشد`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const updatedSale = await recordSalePayment(selectedSaleId, {
        amount,
        paymentAccount: selectedAccount,
        description: paymentDescription || `Payment for sale`,
      });

      const updatedSaleData =
        updatedSale?.sale ||
        updatedSale?.data?.sale ||
        updatedSale?.data ||
        updatedSale ||
        {};

      toast.success("پرداخت با موفقیت ثبت شد!");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setSelectedAccount("");
      setPaymentDescription("");
      clearUrlParams();
      setRecentlyUpdatedSale({
        id: selectedSaleId,
        paidAmount: updatedSaleData.paidAmount,
        dueAmount: updatedSaleData.dueAmount,
      });
      queryClient.setQueryData(["allSales", salesQueryParams], (prev) => {
        if (!prev) return prev;
        const list = prev.sales || prev.data || [];
        const updatedSales = list.map((sale) =>
          sale._id === selectedSaleId
            ? {
                ...sale,
                paidAmount: updatedSaleData.paidAmount ?? sale.paidAmount ?? 0,
                dueAmount: updatedSaleData.dueAmount ?? sale.dueAmount ?? 0,
              }
            : sale
        );
        return prev.sales
          ? { ...prev, sales: updatedSales }
          : { ...prev, data: updatedSales };
      });
      queryClient.setQueryData(["sale", selectedSaleId], (prev) =>
        prev
          ? {
              ...prev,
              sale: {
                ...prev.sale,
                paidAmount:
                  updatedSaleData.paidAmount ?? prev.sale.paidAmount ?? 0,
                dueAmount:
                  updatedSaleData.dueAmount ?? prev.sale.dueAmount ?? 0,
              },
            }
          : prev
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] }),
        queryClient.invalidateQueries({ queryKey: ["recentTransactions"] }),
      ]);
    } catch (error) {
      toast.error("خطا در ثبت پرداخت: " + error.message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalSales: total || sales?.length || 0,
    totalRevenue:
      sales?.reduce((sum, s) => sum + (parseFloat(s.totalAmount) || 0), 0) || 0,
    totalPaid:
      sales?.reduce((sum, s) => sum + (parseFloat(s.paidAmount) || 0), 0) || 0,
    totalOwed:
      sales?.reduce((sum, s) => sum + (parseFloat(s.dueAmount) || 0), 0) || 0,
    pendingPayments:
      sales?.filter((s) => parseFloat(s.dueAmount) > 0).length || 0,
    completedPayments:
      sales?.filter((s) => parseFloat(s.dueAmount) === 0).length || 0,
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border border-green-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "pending":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fa-IR");
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">مدیریت فروش</h1>
        <p className="text-gray-600 mt-1">مشاهده و مدیریت فروشها</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2  lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مجموع فروش</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(stats.totalSales || 0)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مجموع عواید</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مبلغ جمع آوری شده</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.totalPaid || 0)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">مبلغ باقی مانده</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats.totalOwed || 0)}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <ReceiptPercentIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white w-full  rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center gap-3">
          <div className="flex w-full md:w-[60%] gap-4">
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className={inputStyle}
            >
              <option value="">همه مشتری ها</option>
              {customers?.data
                ?.filter((customer) =>
                  customerAccounts.some((acc) => acc.refId === customer._id)
                )
                .map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name}
                  </option>
                ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={inputStyle}
            >
              <option value="">همه حالات</option>
              <option value="paid">پرداخت شده</option>
              <option value="partial">نسبی پرداخت شده</option>
              <option value="pending">باقی مانده</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddSaleModal(true)}
            disabled={createSaleMutation?.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-colors whitespace-nowrap ${
              createSaleMutation?.isPending
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-amber-600 text-white hover:bg-amber-700"
            }`}
          >
            <PlusIcon className="h-5 w-5" />
            {createSaleMutation?.isPending
              ? "در حال اضافه..."
              : "اضافه کردن فروش"}
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  تاریخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  مشتری
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  کارمند
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  قیمت مجموعی
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  پرداخت شده
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  باقی مانده
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  حالت
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
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    فروشی یافت نشد
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(sale.saleDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.customerAccount?.name ||
                        sale.customerName?.name ||
                        "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {sale.employeeAccount?.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                      {formatCurrency(sale.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                      {formatCurrency(sale.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      {formatCurrency(sale.dueAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          sale.dueAmount > 0 ? "partial" : "paid"
                        )}`}
                      >
                        {recentlyUpdatedSale?.id === sale._id
                          ? recentlyUpdatedSale.dueAmount > 0
                            ? "نسبی پرداخت شده"
                            : "تمام پرداخت شده"
                          : sale.dueAmount > 0
                          ? "نسبی پرداخت شده"
                          : "تمام پرداخت شده"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(sale._id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          title="مشاهده جزئیات"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            handlePrintSale(sale);
                          }}
                          className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                          title="چاپ فاکتور"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                        {sale.dueAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSaleId(sale._id);
                              setShowDetailsModal(false);
                              setShowPaymentModal(true);
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title="ثبت پرداخت"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditSale(sale)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                          title="ویرایش"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale._id)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
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
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              onRowsPerPageChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      <GloableModal
        open={showAddSaleModal}
        setOpen={setShowAddSaleModal}
        isClose={true}
      >
        <div className="bg-white shadow-none  lg:w-6xl  max-h-[90vh] rounded-md mx-auto overflow-y-auto">
          <SaleForm
            register={register}
            handleSubmit={handleSubmit}
            watch={watch}
            setValue={setValue}
            onClose={() => {
              setShowAddSaleModal(false);
              setEditMode(false);
              setSaleToEdit(null);
              setSelectedSaleId(null);
            }}
            onSubmit={handleCreateSale}
            editMode={editMode}
            saleToEdit={saleToEdit}
          />
        </div>
      </GloableModal>
      {/* Sale Details Modal */}
      <GloableModal
        open={showDetailsModal}
        setOpen={setShowDetailsModal}
        isClose={true}
      >
        {selectedSale && (
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] mx-auto overflow-y-auto">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">جزئیات فروش</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  clearUrlParams();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Sale Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">قیمت مجموعی</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {formatCurrency(selectedSale.totalAmount || 0)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">مبلغ پرداخت شده</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(selectedSale.paidAmount || 0)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">مبلغ باقی مانده</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(selectedSale.dueAmount || 0)}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">تعداد اجناس</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatNumber(selectedSale.items?.length || 0)}
                    </p>
                  </div>
                </div>

                {/* Sale Information */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    اطلاعات فروش
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        نمبر بیل
                      </h4>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedSale.billNumber || "-"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        تاریخ فروش
                      </h4>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(selectedSale.saleDate)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        مشتری
                      </h4>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedSale.customerAccount?.name ||
                          findCustomer(selectedSale.customerAccount)?.name ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        حالت پرداخت
                      </h4>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          selectedSale.dueAmount > 0 ? "partial" : "paid"
                        )}`}
                      >
                        {selectedSale.dueAmount > 0
                          ? "نسبی پرداخت شده"
                          : "تمام پرداخت شده"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sale Items */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">
                      اجناس فروخته شده
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            محصول
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            واحد
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            تعداد
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            تعداد کارتن
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            قیمت یک دانه
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            قیمت مجموعی
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedSale.items?.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-6 text-center text-gray-500 text-sm"
                            >
                              جنس یافت نشد
                            </td>
                          </tr>
                        ) : (
                          selectedSale.items?.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.product?.name || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.unit?.name || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.quantity || 0}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.cartonCount || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {formatCurrency(item.unitPrice || 0)}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-purple-600">
                                {formatCurrency(item.totalPrice || 0)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Total Summary */}
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        {selectedSale.dueAmount > 0 && (
                          <button
                            onClick={() => {
                              setShowDetailsModal(false);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                            ثبت پرداخت
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          مجموع کل:{" "}
                          {formatCurrency(selectedSale.totalAmount || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </GloableModal>

      {/* Payment Modal */}
      {showPaymentModal && selectedSale && (
        <GloableModal
          open={showPaymentModal}
          setOpen={(open) => {
            setShowPaymentModal(open);
            if (!open) {
              clearUrlParams();
            }
          }}
          isClose={true}
        >
          <div className="w-[500px] bg-white max-h-[90vh] overflow-y-auto rounded-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">ثبت پرداخت</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  clearUrlParams();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 grid grid-cols-2 gap-x-2">
              <div className="bg-blue-50 p-4 rounded-lg col-span-2">
                <p className="text-sm text-blue-900">
                  مبلغ باقی‌مانده: {formatCurrency(selectedSale.dueAmount)} AFN
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  مبلغ پرداخت *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="مبلغ را وارد کنید"
                  max={selectedSale.dueAmount}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  حساب دریافت *
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">انتخاب حساب</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)} AFN)
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  توضیحات
                </label>
                <textarea
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                  placeholder="توضیحات اختیاری..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 col-span-2">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    clearUrlParams();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-sm hover:bg-gray-50"
                >
                  انصراف
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmittingPayment ? "در حال ثبت..." : "ثبت پرداخت"}
                </button>
              </div>
            </div>
          </div>
        </GloableModal>
      )}

      {/* Delete Confirmation Modal */}
      <GloableModal
        open={showDeleteConfirm}
        setOpen={setShowDeleteConfirm}
        isClose={true}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">تأیید حذف</h3>
            </div>
            <p className="text-gray-600 mb-6">
              آیا مطمئن هستید که می‌خواهید این فروش را حذف کنید؟ این عمل قابل
              بازگشت نیست.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                لغو
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  confirmDelete();
                }}
                disabled={deleteSaleMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSaleMutation.isPending ? "در حال حذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>

      {/* Print Modal */}
      <GloableModal
        open={showPrintModal}
        setOpen={setShowPrintModal}
        isClose={true}
        isClosableByDefault={true}
      >
        {showPrintModal && saleToPrint && (
          <SaleBillPrint
            sale={saleToPrint}
            customer={customerToPrint}
            customerAccount={customerAccountToPrint}
            onClose={() => {
              setShowPrintModal(false);
              setSaleToPrint(null);
              setCustomerToPrint(null);
              setCustomerAccountToPrint(null);
            }}
            autoPrint={false}
          />
        )}
      </GloableModal>
    </div>
  );
};
export default Sales;
