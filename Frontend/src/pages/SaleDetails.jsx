import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSale, useCustomers, useAccounts } from "../services/useApi";
import { formatCurrency, formatNumber } from "../utilies/helper";
import { ArrowRightIcon, BanknotesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import GloableModal from "../components/GloableModal";
import { toast } from "react-toastify";
import { recordSalePayment } from "../services/apiUtiles";
import { useQueryClient } from "@tanstack/react-query";

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: selectedSale, isLoading } = useSale(id);
  const { data: customers } = useCustomers();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const { data: accountsData } = useAccounts({ type: "cashier" });
  const accounts = accountsData?.accounts || [];
  const queryClient = useQueryClient();

  const handleRecordPayment = async () => {
    if (!paymentAmount || !selectedAccount) {
      toast.error(t("sales.toast.enterAmountAndAccount"));
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedSale.dueAmount) {
      toast.error(
        t("sales.toast.amountRange", {
          min: 0,
          max: selectedSale.dueAmount,
        })
      );
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await recordSalePayment(id, {
        amount,
        paymentAccount: selectedAccount,
        description:
          paymentDescription || t("sales.payment.defaultDescription"),
      });

      toast.success(t("sales.toast.paymentSuccess"));
      setShowPaymentModal(false);
      setPaymentAmount("");
      setSelectedAccount("");
      setPaymentDescription("");
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sale", id] }),
        queryClient.invalidateQueries({ queryKey: ["allSales"] }),
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      ]);
    } catch (error) {
      toast.error(
        `${t("sales.toast.paymentError")}: ${error.message}`
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const findCustomer = (customerId) => {
    return customers?.data?.find((cust) => cust._id === customerId);
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
    if (!dateString) return "—";
    const lang = (i18n.language || "ps").split("-")[0];
    const localeTag = lang === "ps" ? "ps-AF" : "fa-IR";
    return new Date(dateString).toLocaleDateString(localeTag);
  };

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
                selectedSale.dueAmount > 0 ? "partial" : "paid"
              )}`}
            >
              {selectedSale.dueAmount > 0
                ? t("sales.table.statusPartialPaid")
                : t("sales.table.statusFullyPaid")}
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
            <div>
              {selectedSale.dueAmount > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-sm hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <BanknotesIcon className="h-4 w-4" />
                  {t("sales.details.recordPayment")}
                </button>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {t("sales.details.grandTotal")}{" "}
                {formatCurrency(selectedSale.totalAmount || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder={t("sales.payment.amountPlaceholder")}
                  max={selectedSale.dueAmount}
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
