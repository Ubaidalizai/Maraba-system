import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePurchase, useSuppliers, useSystemAccounts } from "../services/useApi";
import { formatCurrency } from "../utilies/helper";
import { ArrowRightIcon, BanknotesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import GloableModal from "../components/GloableModal";
import { toast } from "react-toastify";
import { usePaymentProcess } from "../services/useApi";
import { useQueryClient } from "@tanstack/react-query";

const EASTERN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: selectedPurchase, isLoading } = usePurchase(id);
  const { data: suppliers } = useSuppliers();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const { data: systemAccounts } = useSystemAccounts();
  const { mutate: createpaymentProces } = usePaymentProcess();
  const queryClient = useQueryClient();

  const toLocalizedNumber = (num) => {
    const raw = String(num ?? "");
    return raw.replace(/\d/g, (d) => EASTERN_DIGITS[d]);
  };

  const formatMoney = (val) => {
    const n = typeof val === "string" ? parseFloat(val) : Number(val);
    if (Number.isNaN(n)) return formatCurrency(0);
    return formatCurrency(n);
  };

  const findSupplier = (supplierId) => {
    return suppliers?.data?.find((supp) => supp._id === supplierId);
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

  const formatPurchaseDate = (iso) => {
    if (!iso) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag = lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(iso).toLocaleDateString(localeTag);
  };

  const handleRecordPayment = () => {
    if (!paymentAmount || !selectedAccount) {
      toast.error(t("purchases.toast.enterAmountAndAccount"));
      return;
    }

    const amount = parseFloat(paymentAmount);
    const purchaseData = selectedPurchase?.purchase || selectedPurchase;
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
        onSuccess: async () => {
          toast.success(t("sales.toast.paymentSuccess"));
          setShowPaymentModal(false);
          setPaymentAmount("");
          setSelectedAccount("");
          setPaymentDescription("");

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["purchase", id] }),
            queryClient.invalidateQueries({ queryKey: ["allPurchases"] }),
            queryClient.invalidateQueries({ queryKey: ["accounts"] }),
          ]);
        },
        onError: (error) => {
          toast.error(`${t("sales.toast.paymentError")}: ${error.message}`);
        },
        onSettled: () => setIsSubmittingPayment(false),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const purchaseData = selectedPurchase?.purchase || selectedPurchase;
  const detailItems = purchaseData?.items || [];

  if (!purchaseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">{t("purchases.details.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/purchases")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRightIcon className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("purchases.details.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("purchases.details.invoiceNumber")}: {purchaseData.batchNumber || "—"}
          </p>
        </div>
      </div>

      {/* Purchase Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-2xl">
        <div className="border border-gray-200 rounded-lg px-3 py-5 bg-white">
          <p className="text-sm text-gray-600">
            {t("purchases.details.totalAmount")}
          </p>
          <p className="font-semibold text-purple-600">
            {formatMoney(Number(purchaseData.totalAmount || 0))}
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <p className="text-sm text-gray-600">
            {t("purchases.details.paidAmount")}
          </p>
          <p className="font-semibold text-green-600">
            {formatMoney(Number(purchaseData.paidAmount || 0))}
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <p className="text-sm text-gray-600">
            {t("purchases.details.dueAmount")}
          </p>
          <p className="font-semibold text-red-600">
            {formatMoney(Number(purchaseData.dueAmount || 0))}
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <p className="text-sm text-gray-600">
            {t("purchases.details.itemCount")}
          </p>
          <p className="font-semibold text-blue-600">
            {toLocalizedNumber(detailItems.length || 0)}
          </p>
        </div>
      </div>

      {/* Purchase Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 ">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t("purchases.details.purchaseInfo")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("purchases.details.invoiceNumber")}
            </h4>
            <p className="text-sm font-medium text-gray-900">
              {purchaseData.batchNumber || "-"}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("purchases.details.purchaseDate")}
            </h4>
            <p className="text-sm font-medium text-gray-900">
              {formatPurchaseDate(purchaseData.purchaseDate)}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("purchases.details.supplier")}
            </h4>
            <p className="text-sm font-medium text-gray-900">
              {purchaseData.supplierAccount?.name ||
                findSupplier(purchaseData.supplier)?.name ||
                "-"}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("purchases.details.paymentStatus")}
            </h4>
            <span
              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                (purchaseData.dueAmount ?? 0) > 0 ? "partial" : "paid"
              )}`}
            >
              {(purchaseData.dueAmount ?? 0) > 0
                ? t("purchases.table.statusPartialPaid")
                : t("purchases.table.statusFullyPaid")}
            </span>
          </div>
        </div>
        {purchaseData.description && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("saleForm.notesLabel")}
            </h4>
            <p className="text-sm text-gray-700">{purchaseData.description}</p>
          </div>
        )}
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
                      {item.product?.name || "-"}
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
              {(purchaseData.dueAmount ?? 0) > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <BanknotesIcon className="h-4 w-4" />
                  {t("purchases.actions.recordPayment")}
                </button>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {t("purchases.details.grandTotal")}{" "}
                {formatMoney(Number(purchaseData.totalAmount || 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && purchaseData && (
        <GloableModal
          open={showPaymentModal}
          setOpen={setShowPaymentModal}
          isClose={true}
        >
          <div className="w-[500px] bg-white max-h-[90vh] overflow-y-auto rounded-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("purchases.payment.title")}
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 grid grid-cols-2 gap-x-2">
              <div className="bg-blue-50 p-4 rounded-lg col-span-2">
                <p className="text-sm text-blue-900">
                  {t("purchases.payment.remaining")}{" "}
                  {formatMoney(Number(purchaseData.dueAmount || 0))}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                  placeholder={t("purchases.payment.amountPlaceholder")}
                  max={purchaseData.dueAmount ?? undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.payment.accountLabel")}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">{t("purchases.payment.selectAccount")}</option>
                  {systemAccounts?.accounts?.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({formatMoney(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.payment.descriptionLabel")}
                </label>
                <textarea
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  rows={3}
                  placeholder={t("purchases.payment.descriptionPlaceholder")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 col-span-2">
                <button
                  onClick={() => setShowPaymentModal(false)}
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
        </GloableModal>
      )}
    </div>
  );
};

export default PurchaseDetails;
