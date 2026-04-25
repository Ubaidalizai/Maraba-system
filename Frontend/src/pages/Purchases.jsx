import {
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import Pagination from "../components/Pagination";
import {
  usePurchases,
  useSuppliers,
  usePurchase,
  useUpdatePurchase,
  useDeletePurchase,
  useProducts,
  useUnits,
  useSystemAccounts,
  usePaymentProcess,
} from "../services/useApi";
import { formatCurrency, normalizeDateToIso } from "../utilies/helper";
import PurchaseModal from "../components/PurchaseModal";
import { XCircleIcon } from "lucide-react";
import GloableModal from "../components/GloableModal";
import { inputStyle } from "../components/ProductForm";
import { toast } from "react-toastify";
import JalaliDatePicker from "../components/JalaliDatePicker";

const EASTERN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

const Purchases = () => {
  const { t, i18n } = useTranslation();

  const toLocalizedNumber = (num) => {
    const raw = String(num ?? "");
    return raw.replace(/\d/g, (d) => EASTERN_DIGITS[d]);
  };

  const formatPurchaseDate = (iso) => {
    if (!iso) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag = lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(iso).toLocaleDateString(localeTag);
  };

  const formatMoney = (val) => {
    const n = typeof val === "string" ? parseFloat(val) : Number(val);
    if (Number.isNaN(n)) return formatCurrency(0);
    return formatCurrency(n);
  };

  // URL parameters for modal flow
  const [searchParams] = useSearchParams();
  const openId = searchParams.get("openId");
  const action = searchParams.get("action");
  const { mutate: createpaymentProces } = usePaymentProcess();
  const [deleteModal, setDeleteModal] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [selectedPurchaseSummary, setSelectedPurchaseSummary] = useState(null);
  const [editFormData, setEditFormData] = useState({
    supplier: "",
    purchaseDate: "",
    paidAmount: 0,
    paymentAccount: "",
    stockLocation: "warehouse",
    items: [],
    reason: "",
  });
  const [currentEditItem, setCurrentEditItem] = useState({
    product: "",
    unit: "",
    quantity: 0,
    unitPrice: 0,
    batchNumber: "",
    expiryDate: "",
  });

  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const { data: units } = useUnits();
  const { data: systemAccounts } = useSystemAccounts();
  const { data: purchasesResp, isLoading } = usePurchases({
    supplier: supplierFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit,
  });
  const {
    data: selectedPurchase,
    isLoading: isLoadingDetails,
    error: errorDetails,
  } = usePurchase(selectedPurchaseId);
  const updatePurchaseMutation = useUpdatePurchase();
  const deletePurchaseMutation = useDeletePurchase();

  const purchases = useMemo(
    () => purchasesResp?.purchases || purchasesResp?.data || [],
    [purchasesResp?.purchases, purchasesResp?.data]
  );
  
  const total = purchasesResp?.total || purchases.length || 0;
  const totalPages =
    purchasesResp?.pages || Math.max(1, Math.ceil(total / limit));
  const findSupplier = (supplierId) => {
    return suppliers?.data?.find((supp) => supp._id === supplierId);
  };

  const handleViewDetails = (purchaseId) => {
    setSelectedPurchaseId(purchaseId);
    const summary = purchases.find((p) => p._id === purchaseId) || null;
    setSelectedPurchaseSummary(summary);
    setShowDetailsModal(true);
  };

  const handleEditPurchase = (purchase) => {
    setEditingPurchase(purchase);
    setSelectedPurchaseId(purchase._id); // This will trigger usePurchase hook
    setSelectedPurchaseSummary(purchase);

    // Populate form with existing purchase data
    setEditFormData({
      supplier: purchase.supplier?._id || purchase.supplier || "",
      purchaseDate: normalizeDateToIso(purchase.purchaseDate),
      paidAmount: purchase.paidAmount || 0,
      paymentAccount: "", // Will need to fetch from transaction
      stockLocation: "warehouse", // Default
      items: purchase.items || [],
      reason: "",
    });

    setShowEditModal(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deletePurchaseMutation.mutate(deleteConfirmId, {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
        onError: (error) => {
          toast.error(error.message || t("purchases.toast.deleteError"));
        },
      });
    }
  };

  const handleRowsPerPageChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  // Handle URL parameters for modal flow
  useEffect(() => {
    if (openId && action === "view") {
      // Find the purchase with the given ID
      const purchase = purchases.find((p) => p._id === openId);
      if (purchase) {
        setSelectedPurchaseId(openId);
        setShowDetailsModal(true);
        setSelectedPurchaseSummary(purchase);
      }
    }
  }, [openId, action, purchases]);

  // Clear openId/action from URL (used when closing modals opened via link)
  const navigate = useNavigate();
  const location = useLocation();
  const clearOpenQuery = () => {
    try {
      const params = new URLSearchParams(location.search || "");
      let modified = false;
      ["openId", "action"].forEach((k) => {
        if (params.has(k)) {
          params.delete(k);
          modified = true;
        }
      });
      if (modified) {
        const search = params.toString();
        navigate(`${location.pathname}${search ? `?${search}` : ""}`, { replace: true });
      }
    } catch {
      // ignore
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPurchaseSummary(null);
    setSelectedPurchaseId(null);
    clearOpenQuery();
  };

  // Payment handler
  const resolvePurchaseData = () => {
    if (selectedPurchase?.purchase) return selectedPurchase.purchase;
    if (selectedPurchase && !selectedPurchase.purchase) return selectedPurchase;
    return selectedPurchaseSummary;
  };

  const paymentPurchase = resolvePurchaseData();
  const detailPurchase =
    selectedPurchase?.purchase ||
    selectedPurchaseSummary ||
    selectedPurchase ||
    {};
  const detailItems =
    selectedPurchase?.purchase?.items || selectedPurchaseSummary?.items || [];

  useEffect(() => {
    if (selectedPurchase?.purchase) {
      setSelectedPurchaseSummary(selectedPurchase.purchase);
    }
  }, [selectedPurchase]);

  const handleRecordPayment = () => {
    if (!paymentAmount || !selectedAccount) {
      toast.error(t("purchases.toast.enterAmountAndAccount"));
      return;
    }

    const amount = parseFloat(paymentAmount);
    const purchaseData = resolvePurchaseData();
    const remaining = parseFloat(purchaseData?.dueAmount ?? 0);

    if (!purchaseData || !purchaseData._id) {
      toast.error(t("purchases.toast.noPurchaseSelected"));
      return;
    }

    if (Number.isNaN(remaining) || remaining <= 0) {
      toast.error(t("purchases.toast.noDebtRemaining"));
      return;
    }

    if (amount <= 0 || amount > remaining) {
      toast.error(
        t("purchases.toast.amountRange", {
          min: toLocalizedNumber("0"),
          max: toLocalizedNumber(String(remaining)),
        })
      );
      return;
    }

    setIsSubmittingPayment(true);
    createpaymentProces(
      {
        purchaseId: purchaseData._id,
        payload: {
          amount,
          paymentAccount: selectedAccount,
          description:
            paymentDescription || t("purchases.payment.defaultDescription"),
        },
      },
      {
        onSuccess: () => {
          setShowPaymentModal(false);
          setPaymentAmount("");
          setSelectedAccount("");
          setPaymentDescription("");
          setSelectedPurchaseSummary(null);
        },
        onSettled: () => setIsSubmittingPayment(false),
      }
    );
  };

  // Helper functions for edit form
  const addEditItem = () => {
    if (
      currentEditItem.product &&
      currentEditItem.unit &&
      currentEditItem.quantity > 0
    ) {
      const totalPrice = currentEditItem.quantity * currentEditItem.unitPrice;
      const newItem = {
        ...currentEditItem,
        totalPrice,
        product: currentEditItem.product,
        unit: currentEditItem.unit,
      };

      setEditFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));

      setCurrentEditItem({
        product: "",
        unit: "",
        quantity: 0,
        unitPrice: 0,
        batchNumber: "",
        expiryDate: "",
      });
    }
  };

  const removeEditItem = (index) => {
    setEditFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateEditTotals = () => {
    const subtotal = editFormData.items.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );
    const dueAmount = Math.max(subtotal - editFormData.paidAmount, 0);
    return { subtotal, dueAmount };
  };

  // Update form data when purchase details are loaded
  useEffect(() => {
    if (selectedPurchase && showEditModal && editingPurchase) {
      const purchaseData = selectedPurchase.purchase || selectedPurchase;
      setEditFormData((prev) => ({
        ...prev,
        supplier:
          purchaseData.supplier?._id || purchaseData.supplier || prev.supplier,
        purchaseDate: purchaseData.purchaseDate
          ? normalizeDateToIso(purchaseData.purchaseDate)
          : prev.purchaseDate,
        paidAmount: purchaseData.paidAmount || prev.paidAmount,
        items: purchaseData.items || prev.items,
      }));
    }
  }, [selectedPurchase, showEditModal, editingPurchase]);

  useEffect(() => {
    if (selectedPurchase?.purchase) {
      setSelectedPurchaseSummary(selectedPurchase.purchase);
    }
  }, [selectedPurchase]);

  // Calculate statistics
  const stats = {
    totalPurchases: purchases?.length || 0,
    totalAmount:
      purchases?.reduce((sum, p) => sum + (p.totalAmount || 0), 0) || 0,
    totalPaid: purchases?.reduce((sum, p) => sum + (p.paidAmount || 0), 0) || 0,
    totalOwed: purchases?.reduce((sum, p) => sum + (p.dueAmount || 0), 0) || 0,
    pendingPayments: purchases?.filter((p) => p.dueAmount > 0).length || 0,
    completedPayments: purchases?.filter((p) => p.dueAmount === 0).length || 0,
  };

  // Status colors
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

  // const getStatusColor = (status) => {
  //   switch (status) {
  //     case "completed":
  //       return "bg-green-100 text-green-800 border border-green-200";
  //     case "pending":
  //       return "bg-yellow-100 text-yellow-800 border border-yellow-200";
  //     case "cancelled":
  //       return "bg-red-100 text-red-800 border border-red-200";
  //     default:
  //       return "bg-gray-100 text-gray-800 border border-gray-200";
  //   }
  // };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("purchases.title")}
          </h1>
          <p className="text-gray-600 mt-">{t("purchases.subtitle")}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("purchases.stats.totalPurchases")}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {toLocalizedNumber(stats.totalPurchases)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg  border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("purchases.stats.totalAmount")}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatMoney(Number(stats?.totalAmount).toFixed(2))}
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
                {t("purchases.stats.totalPaid")}
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatMoney(stats.totalPaid?.toFixed(2))}
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
                {t("purchases.stats.totalOwed")}
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatMoney(stats.totalOwed?.toFixed(2))}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg  border border-gray-200 p-6">
        <div className="flex flex-row gap-4 items-center justify-between">
          <div className="grid lg:grid-cols-4 md:grid-cols-3 grid-cols-2 flex-2 w-full  gap-4">
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className={`${inputStyle} flex-1`}
            >
              <option value="">{t("purchases.filters.allSuppliers")}</option>
              {suppliers?.data?.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`${inputStyle} flex-1`}
            >
              <option value="">
                {t("purchases.filters.allPaymentStatuses")}
              </option>
              <option value="paid">{t("purchases.filters.statusPaid")}</option>
              <option value="partial">
                {t("purchases.filters.statusPartial")}
              </option>
              <option value="pending">
                {t("purchases.filters.statusPending")}
              </option>
            </select>
          </div>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="flex max-md:flex-1 max-md:text-[14px]  items-center gap-2 md:px-4 md:py-2 p-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            {t("purchases.filters.addPurchase")}
          </button>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-lg  border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.date")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.supplier")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.totalPrice")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.paid")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.due")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.status")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("purchases.table.actions")}
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
                    {t("purchases.table.loading")}
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {t("purchases.table.empty")}
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPurchaseDate(purchase.purchaseDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {purchase.supplierAccount?.name ||
                        purchase.supplierName ||
                        "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-purple-600">
                      {formatMoney(purchase.totalAmount?.toFixed(2))}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                      {formatMoney(purchase.paidAmount?.toFixed(2))}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      {formatMoney(purchase.dueAmount?.toFixed(2))}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          purchase.dueAmount > 0 ? "partial" : "paid"
                        )}`}
                      >
                        {purchase.dueAmount > 0
                          ? t("purchases.table.statusPartialPaid")
                          : t("purchases.table.statusFullyPaid")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(purchase._id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          title={t("purchases.actions.viewDetails")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {Number(purchase?.dueAmount ?? 0) > 0 && (
                          <button
                            onClick={() => {
                              setSelectedPurchaseId(purchase._id);
                              setSelectedPurchaseSummary(purchase);
                              setShowDetailsModal(false);
                              setShowPaymentModal(true);
                            }}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1"
                            title={t("purchases.actions.recordPayment")}
                          >
                            <BanknotesIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditPurchase(purchase)}
                          className="text-green-600 hover:text-green-900 flex items-center gap-1"
                          title={t("purchases.actions.edit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteModal(true);
                            setDeleteConfirmId(purchase._id);
                          }}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          title={t("purchases.actions.delete")}
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
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        )}
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />

      {/* Purchase Details Modal */}
      <GloableModal
        open={showDetailsModal}
        setOpen={setShowDetailsModal}
        isClose={true}
      >
        <div className=" lg:w-[900px] md:w-[900px]   bg-white overflow-y-auto h-[90vh]  rounded-md">
          <div className="bg-white ">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("purchases.details.title")}
              </h2>
              <button
                onClick={() => {
                  handleCloseDetailsModal();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">
                  {t("purchases.details.loading")}
                </p>
              </div>
            ) : errorDetails ? (
              <div className="p-8 text-center">
                <p className="text-red-600">
                  {errorDetails.message || t("purchases.details.loadError")}
                </p>
              </div>
            ) : selectedPurchase && selectedPurchaseId ? (
              <div className="p-4 space-y-4">
                {/* Purchase Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      {t("purchases.details.totalAmount")}
                    </p>
                    <p className="text-lg font-semibold text-purple-600">
                      {formatMoney(Number(detailPurchase?.totalAmount || 0))}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      {t("purchases.details.paidAmount")}
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatMoney(Number(detailPurchase?.paidAmount || 0))}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      {t("purchases.details.dueAmount")}
                    </p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatMoney(Number(detailPurchase?.dueAmount || 0))}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      {t("purchases.details.itemCount")}
                    </p>
                    <p className="text-lg font-semibold text-blue-600">
                      {toLocalizedNumber(detailItems.length || 0)}
                    </p>
                  </div>
                </div>

                {/* Purchase Information */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {t("purchases.details.purchaseInfo")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        {t("purchases.details.invoiceNumber")}
                      </h4>
                      <p className="text-sm font-medium text-gray-900">
                        {detailPurchase?.batchNumber || "''"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        {t("purchases.details.purchaseDate")}
                      </h4>
                      <p className="text-sm font-medium text-gray-900">
                        {formatPurchaseDate(detailPurchase?.purchaseDate)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        {t("purchases.details.supplier")}
                      </h4>
                      <p className="text-sm font-medium text-gray-900">
                        {detailPurchase?.supplierAccount?.name ||
                         
                          "-"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">
                        {t("purchases.details.paymentStatus")}
                      </h4>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                          (detailPurchase?.dueAmount ?? 0) > 0
                            ? "partial"
                            : "paid"
                        )}`}
                      >
                        {(detailPurchase?.dueAmount ?? 0) > 0
                          ? t("purchases.table.statusPartialPaid")
                          : t("purchases.table.statusFullyPaid")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Items */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">
                      {t("purchases.details.itemsTitle")}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            {t("purchases.details.product")}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            {t("purchases.details.unit")}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            {t("purchases.details.quantity")}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            {t("purchases.details.unitPrice")}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            {t("purchases.details.lineTotal")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailItems.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-6 text-center text-gray-500 text-sm"
                            >
                              {t("purchases.details.noItems")}
                            </td>
                          </tr>
                        ) : (
                          detailItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.product?.name || "''"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.unit?.name || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {toLocalizedNumber(item.quantity || 0)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {formatMoney(item.unitPrice?.toFixed(2))}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-purple-600">
                                {formatMoney(item.totalPrice?.toFixed(2))}
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
                        {(detailPurchase?.dueAmount ?? 0) > 0 && (
                          <button
                            onClick={() => {
                              handleCloseDetailsModal();
                              setSelectedPurchaseSummary(detailPurchase);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                          >
                            <BanknotesIcon className="h-4 w-4" />
                            {t("purchases.actions.recordPayment")}
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {t("purchases.details.grandTotal")}{" "}
                          {formatMoney(
                            Number(detailPurchase?.totalAmount || 0)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-red-600">
                  {t("purchases.details.loadError")}
                </p>
              </div>
            )}
          </div>
        </div>
      </GloableModal>

      {/* Delete Confirmation Modal */}
      <GloableModal open={deleteModal} setOpen={setDeleteModal} isClose={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t("purchases.delete.title")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t("purchases.delete.message")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("purchases.delete.cancel")}
              </button>
              <button
                onClick={() => {
                  confirmDelete();
                  setDeleteModal(false);
                }}
                disabled={deletePurchaseMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletePurchaseMutation.isPending
                  ? t("purchases.delete.deleting")
                  : t("purchases.delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>

      {/* Payment Modal */}
      <GloableModal
        open={showPaymentModal}
        setOpen={(open) => {
          setShowPaymentModal(open);
          if (!open) {
            setSelectedPurchaseSummary(null);
          }
        }}
        isClose={true}
      >
        {paymentPurchase && (
          <div className=" w-[500px] h-[500px] bg-white overflow-y-auto rounded-md">
            <div className="bg-white rounded-lg   w-full">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("purchases.payment.title")}
                </h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPurchaseSummary(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6 space-y-4 grid grid-cols-2 gap-x-2">
                <div className="bg-blue-50 p-4 rounded-lg col-span-2">
                  <p className="text-sm text-blue-900">
                    {t("purchases.payment.remaining")}{" "}
                    {formatMoney(Number(paymentPurchase?.dueAmount || 0))}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("purchases.payment.amountLabel")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm  "
                    placeholder={t("purchases.payment.amountPlaceholder")}
                    max={paymentPurchase?.dueAmount ?? undefined}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("purchases.payment.accountLabel")}
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full px-3 py-2 border focus:border-2 border-gray-300 rounded-sm  focus:border-black"
                  >
                    <option value="">{t("purchases.payment.selectAccount")}</option>
                    {systemAccounts?.accounts?.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({formatMoney(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className=" col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("purchases.payment.descriptionLabel")}
                  </label>
                  <textarea
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm  focus:border-amber-500"
                    rows={3}
                    placeholder={t("purchases.payment.descriptionPlaceholder")}
                  />
                </div>

                <div className="flex  items-center gap-2 pt-4 col-span-1">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedPurchaseSummary(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-sm hover:bg-gray-50"
                  >
                    {t("purchases.payment.cancel")}
                  </button>
                  <button
                    onClick={handleRecordPayment}
                    disabled={isSubmittingPayment}
                    className="px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSubmittingPayment
                      ? t("purchases.payment.submitting")
                      : t("purchases.payment.submit")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </GloableModal>

      {/* Comprehensive Edit Purchase Modal */}
      {/* {showEditModal && editingPurchase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          
        </div>
      )} */}

      <GloableModal
        open={showEditModal}
        setOpen={setShowEditModal}
        isClose={true}
      >
        <div className="bg-white rounded-lg w-[700px] md:w-[900px]  max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {t("purchases.edit.title")}
            </h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.edit.supplier")}
                </label>
                <select
                  value={editFormData.supplier}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      supplier: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">{t("purchases.edit.selectSupplier")}</option>
                  {suppliers?.data?.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <JalaliDatePicker
                  label={t("purchases.edit.purchaseDate")}
                  value={editFormData.purchaseDate}
                  onChange={(nextValue) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      purchaseDate: normalizeDateToIso(nextValue),
                    }))
                  }
                  placeholder={t("purchases.edit.datePlaceholder")}
                  clearable
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.edit.paidAmount")}
                </label>
                <input
                  type="number"
                  value={editFormData.paidAmount}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      paidAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.edit.paymentAccount")}
                </label>
                <select
                  value={editFormData.paymentAccount}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      paymentAccount: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">
                    {t("purchases.edit.selectPaymentAccount")}
                  </option>
                  {systemAccounts?.accounts?.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.edit.stockLocation")}
                </label>
                <select
                  value={editFormData.stockLocation}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      stockLocation: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="warehouse">
                    {t("purchases.edit.warehouse")}
                  </option>
                  <option value="store">{t("purchases.edit.store")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.edit.reason")}
                </label>
                <input
                  type="text"
                  value={editFormData.reason}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  placeholder={t("purchases.edit.reasonPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t("purchases.edit.itemsTitle")}
              </h3>

              {/* Add New Item */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("purchases.edit.product")}
                  </label>
                  <select
                    value={currentEditItem.product}
                    onChange={(e) =>
                      setCurrentEditItem((prev) => ({
                        ...prev,
                        product: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">{t("purchases.edit.selectProduct")}</option>
                    {products?.data?.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("purchases.edit.unit")}
                  </label>
                  <select
                    value={currentEditItem.unit}
                    onChange={(e) =>
                      setCurrentEditItem((prev) => ({
                        ...prev,
                        unit: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">{t("purchases.edit.selectUnit")}</option>
                    {units?.data?.map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("purchases.edit.quantity")}
                  </label>
                  <input
                    type="number"
                    value={currentEditItem.quantity}
                    onChange={(e) =>
                      setCurrentEditItem((prev) => ({
                        ...prev,
                        quantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("purchases.edit.unitPrice")}
                  </label>
                  <input
                    type="number"
                    value={currentEditItem.unitPrice}
                    onChange={(e) =>
                      setCurrentEditItem((prev) => ({
                        ...prev,
                        unitPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("purchases.edit.batchNumber")}
                  </label>
                  <input
                    type="text"
                    value={currentEditItem.batchNumber}
                    onChange={(e) =>
                      setCurrentEditItem((prev) => ({
                        ...prev,
                        batchNumber: e.target.value,
                      }))
                    }
                    placeholder={t("purchases.edit.optional")}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addEditItem}
                    className="w-full px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                  >
                    {t("purchases.edit.add")}
                  </button>
                </div>
              </div>

              {/* Items List */}
              {editFormData.items.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 mb-2 px-3">
                    <span>{t("purchases.edit.colProduct")}</span>
                    <span>{t("purchases.edit.colUnit")}</span>
                    <span>{t("purchases.edit.colQuantity")}</span>
                    <span>{t("purchases.edit.colUnitPrice")}</span>
                    <span>{t("purchases.edit.colTotal")}</span>
                    <span>{t("purchases.edit.colActions")}</span>
                  </div>
                  {editFormData.items.map((item, index) => {
                    // Get product and unit names
                    const productName =
                      item.product?.name ||
                      products?.data?.find((p) => p._id === item.product)
                        ?.name ||
                      "-";
                    const unitName =
                      item.unit?.name ||
                      units?.data?.find((u) => u._id === item.unit)?.name ||
                      "-";

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded"
                      >
                        <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                          <span className="font-medium">{productName}</span>
                          <span>{unitName}</span>
                          <span>
                            {toLocalizedNumber(item.quantity || 0)}
                          </span>
                          <span>{formatMoney(item.unitPrice || 0)}</span>
                          <span className="font-semibold text-purple-600">
                            {formatMoney(item.totalPrice || 0)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeEditItem(index)}
                          className="ml-4 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">
                    {t("purchases.edit.summaryTotal")}
                  </span>
                  <span className="font-semibold text-gray-900 ml-2">
                    {formatMoney(calculateEditTotals().subtotal?.toFixed(2))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">
                    {t("purchases.edit.summaryPaid")}
                  </span>
                  <span className="font-semibold text-gray-900 ml-2">
                    {formatMoney(editFormData.paidAmount?.toFixed(2))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">
                    {t("purchases.edit.summaryDue")}
                  </span>
                  <span className="font-semibold text-gray-900 ml-2">
                    {formatMoney(
                      calculateEditTotals().dueAmount?.toFixed(2)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("purchases.edit.cancel")}
              </button>
              <button
                onClick={() => {
                  const updateData = {
                    id: editingPurchase._id,
                    supplier: editFormData.supplier,
                    purchaseDate:
                      normalizeDateToIso(editFormData.purchaseDate) ||
                      new Date().toISOString().slice(0, 10),
                    paidAmount: editFormData.paidAmount,
                    stockLocation: editFormData.stockLocation,
                    items: editFormData.items,
                    reason:
                      editFormData.reason || t("purchases.edit.defaultReason"),
                  };

                  // Only include paymentAccount if it's provided
                  if (editFormData.paymentAccount) {
                    updateData.paymentAccount = editFormData.paymentAccount;
                  }

                  updatePurchaseMutation.mutate(updateData, {
                    onSuccess: () => {
                      setShowEditModal(false);
                      setEditingPurchase(null);
                      setEditFormData({
                        supplier: "",
                        purchaseDate: "",
                        paidAmount: 0,
                        paymentAccount: "",
                        stockLocation: "warehouse",
                        items: [],
                        reason: "",
                      });
                    },
                    onError: (error) => {
                      toast.error(
                        error.message || t("purchases.toast.editError")
                      );
                    },
                  });
                }}
                disabled={updatePurchaseMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {updatePurchaseMutation.isPending
                  ? t("purchases.edit.saving")
                  : t("purchases.edit.save")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>
    </div>
  );
};

export default Purchases;
