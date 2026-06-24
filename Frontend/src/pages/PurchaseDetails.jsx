import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  usePurchase,
  usePurchaseReturns,
  useDeletePurchaseReturn,
  useSuppliers,
  useSystemAccounts,
  invalidateAccountRelatedQueries,
  invalidateInventoryStatsQueries,
} from "../services/useApi";
import { formatCurrency, formatJalaliDate } from "../utilies/helper";
import {
  getPaymentStatusColor,
  getPaymentStatusTableLabelKey,
  resolvePaymentStatus,
} from "../utilies/paymentStatus";
import {
  ArrowRightIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import GloableModal from "../components/GloableModal";
import PurchaseReturnModal from "../components/PurchaseReturnModal";
import { toast } from "react-toastify";
import { usePaymentProcess } from "../services/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { bindNumericControlled } from "../utilies/numericInput";

const EASTERN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

const PurchaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: selectedPurchase, isLoading } = usePurchase(id);
  const { data: suppliers } = useSuppliers();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);
  const deletePurchaseReturnMutation = useDeletePurchaseReturn();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const { data: systemAccounts } = useSystemAccounts();
  const { mutate: createpaymentProces } = usePaymentProcess();
  const queryClient = useQueryClient();

  const { data: returnsResponse } = usePurchaseReturns(
    { purchaseId: id, limit: 50 },
    { enabled: !!id }
  );
  const purchaseReturns = returnsResponse?.data || [];

  const purchaseData = selectedPurchase?.purchase || selectedPurchase;
  const detailItems = purchaseData?.items || [];

  const returnableCount = useMemo(
    () => detailItems.filter((item) => (item.quantity || 0) > 0).length,
    [detailItems]
  );

  const invalidatePurchaseQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["purchase", id] }),
      queryClient.invalidateQueries({ queryKey: ["purchaseReturns"] }),
      queryClient.invalidateQueries({ queryKey: ["allPurchases"] }),
      invalidateAccountRelatedQueries(queryClient),
      invalidateInventoryStatsQueries(queryClient),
    ]);
  };

  const confirmDeleteReturn = () => {
    if (!returnToDelete) return;
    deletePurchaseReturnMutation.mutate(returnToDelete, {
      onSuccess: async () => {
        setReturnToDelete(null);
        toast.success(t("purchases.return.deleteSuccess"));
        await invalidatePurchaseQueries();
      },
      onError: (error) => {
        toast.error(error.message || t("purchases.return.deleteError"));
      },
    });
  };

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

  const formatPurchaseDate = formatJalaliDate;

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
          toast.success(t("purchases.toast.paymentSuccess"));
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
          toast.error(
            `${t("purchases.toast.paymentError")}: ${error.message}`
          );
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
      <div className="flex flex-wrap items-center justify-between gap-4">
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
              {formatPurchaseDate(purchaseData.purchaseDate)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            navigate(`/purchases/edit/${purchaseData._id}`)
          }
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
        >
          <PencilIcon className="h-5 w-5" />
          {t("purchases.details.editPurchase")}
        </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                resolvePaymentStatus(purchaseData)
              )}`}
            >
              {t(
                `purchases.table.${getPaymentStatusTableLabelKey(
                  resolvePaymentStatus(purchaseData)
                )}`
              )}
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
            <div className="flex flex-wrap gap-2">
              {returnableCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReturnModal(true)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-sm hover:bg-amber-700 flex items-center gap-2 text-sm"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  {t("purchases.actions.recordReturn")}
                </button>
              )}
              {(purchaseData.dueAmount ?? 0) > 0 && (
                <button
                  type="button"
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

      {purchaseReturns.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              {t("purchases.return.historyTitle")}
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
                    {t("purchases.details.quantity")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("purchases.return.creditLabel")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("purchases.return.cashRefundLabel")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("purchases.return.reasonLabel")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("purchases.return.actionsLabel")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseReturns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {ret.product?.name || "—"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {toLocalizedNumber(ret.quantity)}{" "}
                      {ret.unit?.name || ""}
                    </td>
                    <td className="px-3 py-2 text-sm text-amber-700 font-medium">
                      {formatMoney(ret.creditAmount || 0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatMoney(ret.cashRefundAmount || 0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {ret.reason || "—"}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setReturnToDelete(ret._id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                        title={t("purchases.return.deleteAction")}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {t("purchases.return.deleteAction")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GloableModal
        open={!!returnToDelete}
        setOpen={(open) => {
          if (!open) setReturnToDelete(null);
        }}
        isClose={true}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full ml-3">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t("purchases.return.deleteConfirmTitle")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t("purchases.return.deleteConfirmMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReturnToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("purchases.return.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDeleteReturn}
                disabled={deletePurchaseReturnMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deletePurchaseReturnMutation.isPending
                  ? t("purchases.delete.deleting")
                  : t("purchases.return.deleteAction")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>

      <PurchaseReturnModal
        open={showReturnModal}
        setOpen={setShowReturnModal}
        purchaseId={id}
        purchase={purchaseData}
        onSuccess={invalidatePurchaseQueries}
      />

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
                  {...bindNumericControlled({
                    allowDecimal: true,
                    value: paymentAmount,
                    onChange: (e) => setPaymentAmount(e.target.value),
                    className: "w-full px-3 py-2 border border-gray-300 rounded-sm",
                    placeholder: t("purchases.payment.amountPlaceholder"),
                  })}
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
