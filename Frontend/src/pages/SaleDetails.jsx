import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useSale,
  useSaleReturns,
  useDeleteSaleReturn,
  useCustomers,
  useAccounts,
  invalidateSalePaymentQueries,
  invalidateInventoryStatsQueries,
  useRecordSalePayment,
} from "../services/useApi";
import { formatCurrency, formatNumber, formatJalaliDate } from "../utilies/helper";
import {
  getPaymentStatusColor,
  getPaymentStatusTableLabelKey,
  resolvePaymentStatus,
} from "../utilies/paymentStatus";
import { resolveSaleFromQuery } from "../utilies/saleQuery";
import {
  ArrowRightIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import GloableModal from "../components/GloableModal";
import SaleReturnModal from "../components/SaleReturnModal";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { bindNumericControlled } from "../utilies/numericInput";

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: saleQueryData, isLoading } = useSale(id);
  const selectedSale = useMemo(
    () => resolveSaleFromQuery(saleQueryData),
    [saleQueryData]
  );
  const { data: customers } = useCustomers();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState(null);
  const deleteSaleReturnMutation = useDeleteSaleReturn();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const recordSalePaymentMutation = useRecordSalePayment();
  const { data: accountsData } = useAccounts({ type: "cashier" });
  const accounts = accountsData?.accounts || [];
  const queryClient = useQueryClient();

  const { data: returnsResponse } = useSaleReturns(
    { saleId: id, limit: 50 },
    { enabled: !!id }
  );
  const saleReturns = returnsResponse?.data || [];

  const returnableCount = useMemo(
    () =>
      (selectedSale?.items || []).filter((item) => (item.quantity || 0) > 0)
        .length,
    [selectedSale?.items]
  );

  const invalidateSaleQueries = async () => {
    await Promise.all([
      invalidateSalePaymentQueries(queryClient, id),
      invalidateInventoryStatsQueries(queryClient),
    ]);
  };

  const confirmDeleteReturn = () => {
    if (!returnToDelete) return;
    deleteSaleReturnMutation.mutate(returnToDelete, {
      onSuccess: async () => {
        setReturnToDelete(null);
        toast.success(t("sales.return.deleteSuccess"));
        await invalidateSaleQueries();
      },
      onError: (error) => {
        toast.error(error.message || t("sales.return.deleteError"));
      },
    });
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
        saleId: id,
        payload: {
          amount,
          paymentAccount: selectedAccount,
          description:
            paymentDescription || t("sales.payment.defaultDescription"),
        },
      },
      {
        onSuccess: async () => {
          toast.success(t("sales.toast.paymentSuccess"));
          setShowPaymentModal(false);
          setPaymentAmount("");
          setSelectedAccount("");
          setPaymentDescription("");
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

  const findCustomer = (customerId) => {
    return customers?.data?.find((cust) => cust._id === customerId);
  };

  const formatDate = formatJalaliDate;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!selectedSale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">{t("sales.details.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/sales")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRightIcon className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t("sales.details.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("sales.details.billNumber")}: {selectedSale.billNumber || "—"}
          </p>
        </div>
      </div>

      {/* Sale Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-2xl">
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-5">
          <p className="text-sm text-gray-600">
            {t("sales.details.totalAmount")}
          </p>
          <p className="font-semibold text-purple-600">
            {formatCurrency(selectedSale.totalAmount || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-5">
          <p className="text-sm text-gray-600">
            {t("sales.details.paidAmount")}
          </p>
          <p className="font-semibold text-green-600">
            {formatCurrency(selectedSale.paidAmount || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-5">
          <p className="text-sm text-gray-600">
            {t("sales.details.dueAmount")}
          </p>
          <p className="font-semibold text-red-600">
            {formatCurrency(selectedSale.dueAmount || 0)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-5">
          <p className="text-sm text-gray-600">
            {t("sales.details.itemCount")}
          </p>
          <p className="font-semibold text-blue-600">
            {formatNumber(selectedSale.items?.length || 0)}
          </p>
        </div>
      </div>

      {/* Sale Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          {t("sales.details.saleInfo")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("sales.details.billNumber")}
            </h4>
            <p className="text-sm font-medium text-gray-900">
              {selectedSale.billNumber || "-"}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("sales.details.saleDate")}
            </h4>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(selectedSale.saleDate)}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("sales.details.customer")}
            </h4>
            <p className="text-sm font-medium text-gray-900">
              {selectedSale.customerAccount?.name ||
                findCustomer(selectedSale.customerAccount)?.name ||
                "-"}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-1">
              {t("sales.details.paymentStatus")}
            </h4>
            <span
              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                resolvePaymentStatus(selectedSale)
              )}`}
            >
              {t(
                `sales.table.${getPaymentStatusTableLabelKey(
                  resolvePaymentStatus(selectedSale)
                )}`
              )}
            </span>
          </div>
          {selectedSale.description && (
            <div className="col-span-full">
              <h4 className="text-xs font-medium text-gray-500 mb-1">
                {t("sales.details.description")}
              </h4>
              <p className="text-sm text-gray-900 rounded">
                {selectedSale.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sale Items */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            {t("sales.details.itemsTitle")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.details.product")}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.details.unit")}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.details.quantity")}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.details.unitPrice")}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("sales.details.lineTotal")}
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
                    {t("sales.details.noItems")}
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
            <div className="flex flex-wrap gap-2">
              {returnableCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowReturnModal(true)}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-sm hover:bg-amber-700 flex items-center gap-2 text-sm"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  {t("sales.details.recordReturn")}
                </button>
              )}
              {selectedSale.dueAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <BanknotesIcon className="h-4 w-4" />
                  {t("sales.details.recordPayment")}
                </button>
              )}
            </div>
            <div className="text-right space-y-1">
              {(selectedSale.discountAmount || 0) > 0 && (
                <>
                  <div className="text-sm text-gray-600">
                    {t("sales.details.subtotalAmount")}{" "}
                    {formatCurrency(
                      selectedSale.subtotalAmount ??
                        selectedSale.items?.reduce(
                          (sum, item) => sum + (item.totalPrice || 0),
                          0
                        ) ??
                        0
                    )}
                  </div>
                  <div className="text-sm text-red-600">
                    {t("sales.details.discountAmount")}{" "}
                    -{formatCurrency(selectedSale.discountAmount || 0)}
                  </div>
                </>
              )}
              <div className="text-sm font-semibold text-gray-900">
                {t("sales.details.grandTotal")}{" "}
                {formatCurrency(selectedSale.totalAmount || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {saleReturns.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              {t("sales.return.historyTitle")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("sales.details.product")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("sales.details.quantity")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("sales.return.refundLabel")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("sales.return.cashRefundLabel")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("sales.return.reasonLabel")}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("sales.return.actionsLabel")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {saleReturns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {ret.product?.name || "—"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatNumber(ret.quantity)}{" "}
                      {ret.unit?.name || ""}
                    </td>
                    <td className="px-3 py-2 text-sm text-amber-700 font-medium">
                      {formatCurrency(ret.refundAmount || 0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {formatCurrency(ret.cashRefundAmount || 0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {ret.reason || "—"}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setReturnToDelete(ret._id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                        title={t("sales.return.deleteAction")}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {t("sales.return.deleteAction")}
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
                {t("sales.return.deleteConfirmTitle")}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {t("sales.return.deleteConfirmMessage")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReturnToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {t("sales.return.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDeleteReturn}
                disabled={deleteSaleReturnMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSaleReturnMutation.isPending
                  ? t("sales.delete.deleting")
                  : t("sales.return.deleteAction")}
              </button>
            </div>
          </div>
        </div>
      </GloableModal>

      <SaleReturnModal
        open={showReturnModal}
        setOpen={setShowReturnModal}
        saleId={id}
        sale={selectedSale}
        onSuccess={invalidateSaleQueries}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedSale && (
        <GloableModal
          open={showPaymentModal}
          setOpen={setShowPaymentModal}
          isClose={true}
        >
          <div className="w-[500px] bg-white max-h-[90vh] overflow-y-auto rounded-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("sales.payment.title")}
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
                  onClick={() => setShowPaymentModal(false)}
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
    </div>
  );
};

export default SaleDetails;
