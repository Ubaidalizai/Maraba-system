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
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatCurrency, formatNumber, formatJalaliDate } from "../utilies/helper";
import {
  getPaymentStatusColor,
  getPaymentStatusTableLabelKey,
  resolvePaymentStatus,
} from "../utilies/paymentStatus";
import { resolveSaleFromQuery } from "../utilies/saleQuery";
import {
  useSales,
  useSale,
  useCustomers,
  useEmployees,
  useDeleteSales,
  useAccounts,
  useRecordSalePayment,
} from "../services/useApi";
import {
  fetchAccounts,
  fetchSale,
} from "../services/apiUtiles";
import SaleBillPrint from "../components/SaleBillPrint";
import GloableModal from "../components/GloableModal";
import { inputStyle } from "../components/ProductForm";
import { bindNumericControlled } from "../utilies/numericInput";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";

const Sales = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
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
  const { data: selectedSaleRaw } = useSale(selectedSaleId);
  const selectedSale = useMemo(
    () => resolveSaleFromQuery(selectedSaleRaw),
    [selectedSaleRaw]
  );
  const deleteSaleMutation = useDeleteSales();
  const { data: accountsData } = useAccounts({ type: "cashier" });
  const accounts = accountsData?.accounts || [];
  const { data: customerAccountsData } = useAccounts({ type: "customer" });
  const customerAccounts = customerAccountsData?.accounts || [];
  const recordSalePaymentMutation = useRecordSalePayment();

  // Data processing
  const sales = useMemo(() => salesResp?.sales || [], [salesResp?.sales]);
  const total = salesResp?.total || 0;
  const totalPages = salesResp?.pages || Math.max(1, Math.ceil(total / limit));

  const findCustomer = (customerId) => {
    return customers?.data?.find((cust) => cust._id === customerId);
  };

  // Handle URL parameters for modal flow
  useEffect(() => {
    if (openId && action === "pay") {
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
    navigate(`/sales/${saleId}`);
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
          toast.error(error.message || t("sales.toast.deleteError"));
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
            toast.success(t("sales.toast.updateSuccess"));
          },
          onError: (error) => {
            toast.error(
              `${t("sales.toast.updateError")}: ${error.message}`
            );
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
        toast.error(`${t("sales.toast.createError")}: ${error.message}`);
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

  const handleRecordPayment = () => {
    if (!paymentAmount || !selectedAccount) {
      toast.error(t("sales.toast.enterAmountAndAccount"));
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > (selectedSale?.dueAmount ?? 0)) {
      toast.error(
        t("sales.toast.amountRange", {
          min: 0,
          max: selectedSale?.dueAmount ?? 0,
        })
      );
      return;
    }

    setIsSubmittingPayment(true);
    recordSalePaymentMutation.mutate(
      {
        saleId: selectedSaleId,
        payload: {
          amount,
          paymentAccount: selectedAccount,
          description:
            paymentDescription || t("sales.payment.defaultDescription"),
        },
      },
      {
        onSuccess: (response) => {
          const updated =
            response?.sale || response?.data?.sale || response?.data || {};
          toast.success(t("sales.toast.paymentSuccess"));
          setShowPaymentModal(false);
          setPaymentAmount("");
          setSelectedAccount("");
          setPaymentDescription("");
          clearUrlParams();
          setRecentlyUpdatedSale({
            id: selectedSaleId,
            paidAmount: updated.paidAmount,
            dueAmount: updated.dueAmount,
          });
        },
        onError: (error) => {
          toast.error(
            `${t("sales.toast.paymentError")}: ${error.message}`
          );
        },
        onSettled: () => setIsSubmittingPayment(false),
      }
    );
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

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t("sales.title")}</h1>
        <p className="text-gray-600 mt-1">{t("sales.subtitle")}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2  lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("sales.stats.totalSales")}
              </p>
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
              <p className="text-sm text-gray-600">
                {t("sales.stats.totalRevenue")}
              </p>
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
              <p className="text-sm text-gray-600">
                {t("sales.stats.totalCollected")}
              </p>
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
              <p className="text-sm text-gray-600">
                {t("sales.stats.totalOwed")}
              </p>
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
              <option value="">{t("sales.filters.allCustomers")}</option>
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
              <option value="">{t("sales.filters.allStatuses")}</option>
              <option value="paid">{t("sales.filters.statusPaid")}</option>
              <option value="partial">
                {t("sales.filters.statusPartial")}
              </option>
              <option value="pending">
                {t("sales.filters.statusPending")}
              </option>
            </select>
          </div>
          <button
            onClick={() => navigate("/sales/add")}
            className="flex items-center gap-2 px-4 py-2 rounded-sm transition-colors whitespace-nowrap bg-amber-600 text-white hover:bg-amber-700"
          >
            <PlusIcon className="h-5 w-5" />
            {t("sales.filters.addSale")}
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
                  {t("sales.table.date")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.customer")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.employee")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.totalAmount")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.discount")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.paid")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.due")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.status")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {t("sales.table.loading")}
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {t("sales.table.empty")}
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatJalaliDate(sale.saleDate)}
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
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      {(sale.discountAmount || 0) > 0
                        ? formatCurrency(sale.discountAmount)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                      {formatCurrency(sale.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      {formatCurrency(sale.dueAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(() => {
                        const row =
                          recentlyUpdatedSale?.id === sale._id
                            ? recentlyUpdatedSale
                            : sale;
                        const status = resolvePaymentStatus(row);
                        return (
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                              status
                            )}`}
                          >
                            {t(
                              `sales.table.${getPaymentStatusTableLabelKey(status)}`
                            )}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(sale._id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          title={t("sales.actions.viewDetails")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            handlePrintSale(sale);
                          }}
                          className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                          title={t("sales.actions.printInvoice")}
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                        {sale.dueAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSaleId(sale._id);
                              setShowPaymentModal(true);
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title={t("sales.actions.recordPayment")}
                          >
                            <BanknotesIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/sales/edit/${sale._id}`)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                          title={t("sales.actions.edit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale._id)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          title={t("sales.actions.delete")}
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
              <h2 className="text-2xl font-bold text-gray-900">
                {t("sales.payment.title")}
              </h2>
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
                  {t("sales.payment.remaining")}{" "}
                  {formatCurrency(selectedSale.dueAmount)} AFN
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("sales.payment.amountLabel")}
                </label>
                <input
                  {...bindNumericControlled({
                    allowDecimal: true,
                    value: paymentAmount,
                    onChange: (e) => setPaymentAmount(e.target.value),
                    className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500",
                    placeholder: t("sales.payment.amountPlaceholder"),
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("sales.payment.receiptAccountLabel")}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">{t("sales.payment.selectAccount")}</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)} AFN)
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("sales.payment.descriptionLabel")}
                </label>
                <textarea
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                  placeholder={t("sales.payment.descriptionPlaceholder")}
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
                  {t("sales.payment.cancel")}
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmittingPayment
                    ? t("sales.payment.submitting")
                    : t("sales.payment.submit")}
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
              <h3 className="text-lg font-semibold text-gray-900">
                {t("sales.delete.title")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{t("sales.delete.message")}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("sales.delete.cancel")}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  confirmDelete();
                }}
                disabled={deleteSaleMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSaleMutation.isPending
                  ? t("sales.delete.deleting")
                  : t("sales.delete.confirm")}
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
