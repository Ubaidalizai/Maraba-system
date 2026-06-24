import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import GloableModal from "./GloableModal";
import { toast } from "react-toastify";
import { createSaleReturn } from "../services/apiUtiles";
import { formatCurrency } from "../utilies/helper";
import { bindNumericControlled } from "../utilies/numericInput";

const getProductId = (item) => item?.product?._id || item?.product;

const getSaleSubtotal = (sale, items) => {
  if (sale?.subtotalAmount > 0) return sale.subtotalAmount;
  return (items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);
};

const calcSuggestedCashRefund = (sale, refundAmount) => {
  const paid = sale?.paidAmount || 0;
  const total = sale?.totalAmount || 0;
  const refund = parseFloat(refundAmount) || 0;
  if (paid <= 0 || refund <= 0 || total <= 0) return 0;
  return Math.round((paid * refund) / total * 100) / 100;
};

const calcSuggestedRefund = (item, qty, sale, items) => {
  if (!item || !qty || qty <= 0) return 0;
  const lineQty = item.quantity || 0;
  if (lineQty <= 0) return 0;
  const lineTotal = item.totalPrice || 0;
  const preDiscount =
    Math.round((lineTotal / lineQty) * qty * 100) / 100;
  const subtotal = getSaleSubtotal(sale, items);
  const discount = sale?.discountAmount || 0;
  if (subtotal <= 0 || discount <= 0) return preDiscount;
  return Math.round(preDiscount * (1 - discount / subtotal) * 100) / 100;
};

const SaleReturnModal = ({ open, setOpen, saleId, sale, onSuccess }) => {
  const { t } = useTranslation();
  const returnableItems = useMemo(
    () => (sale?.items || []).filter((item) => (item.quantity || 0) > 0),
    [sale?.items]
  );

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [cashRefundAmount, setCashRefundAmount] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = useMemo(
    () => returnableItems.find((item) => getProductId(item) === productId),
    [returnableItems, productId]
  );

  const needsBatch = selectedItem?.batchNumber === "MULTI";
  const maxQty = selectedItem?.quantity || 0;
  const maxCashRefund = Math.min(
    parseFloat(refundAmount) || 0,
    sale?.paidAmount || 0
  );

  const resetForm = () => {
    setProductId("");
    setQuantity("");
    setRefundAmount("");
    setCashRefundAmount("");
    setBatchNumber("");
    setReason("");
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  useEffect(() => {
    if (!selectedItem) return;
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;
    const suggestedRefund = calcSuggestedRefund(
      selectedItem,
      qty,
      sale,
      returnableItems
    );
    setRefundAmount(String(suggestedRefund));
    setCashRefundAmount(String(calcSuggestedCashRefund(sale, suggestedRefund)));
  }, [quantity, selectedItem, sale, returnableItems]);

  const handleProductChange = (id) => {
    setProductId(id);
    const item = returnableItems.find((i) => getProductId(i) === id);
    if (item) {
      const qty = item.quantity || 0;
      const suggestedRefund = calcSuggestedRefund(
        item,
        qty,
        sale,
        returnableItems
      );
      setQuantity(String(qty));
      setRefundAmount(String(suggestedRefund));
      setCashRefundAmount(String(calcSuggestedCashRefund(sale, suggestedRefund)));
      setBatchNumber("");
    } else {
      setQuantity("");
      setRefundAmount("");
      setBatchNumber("");
    }
    setCashRefundAmount("");
  };

  const handleSubmit = async () => {
    if (!productId || !selectedItem) {
      toast.error(t("sales.return.selectProduct"));
      return;
    }

    const qty = parseFloat(quantity);
    const refund = parseFloat(refundAmount);
    const cashRefund = parseFloat(cashRefundAmount) || 0;

    if (!qty || qty <= 0 || qty > maxQty) {
      toast.error(
        t("sales.return.quantityRange", { max: maxQty })
      );
      return;
    }

    if (refund < 0) {
      toast.error(t("sales.return.refundInvalid"));
      return;
    }

    const maxRefund = calcSuggestedRefund(
      selectedItem,
      qty,
      sale,
      returnableItems
    );
  if (refund > maxRefund + 0.01) {
      toast.error(
        t("sales.return.refundMax", { max: formatCurrency(maxRefund) })
      );
      return;
    }

    if (refund > (sale?.totalAmount || 0) + 0.01) {
      toast.error(
        t("sales.return.refundExceedsSale", {
          max: formatCurrency(sale?.totalAmount || 0),
        })
      );
      return;
    }

    if (cashRefund > refund) {
      toast.error(t("sales.return.cashExceedsRefund"));
      return;
    }

    if (cashRefund > (sale?.paidAmount || 0)) {
      toast.error(t("sales.return.cashExceedsPaid"));
      return;
    }

    const requiredCash = calcSuggestedCashRefund(sale, refund);
    if (requiredCash > 0 && cashRefund + 0.01 < requiredCash) {
      toast.error(
        t("sales.return.cashRefundRequired", {
          amount: formatCurrency(requiredCash),
        })
      );
      return;
    }

    if (needsBatch && !batchNumber.trim()) {
      toast.error(t("sales.return.batchRequired"));
      return;
    }

    const unitId = selectedItem.unit?._id || selectedItem.unit;
    if (!unitId) {
      toast.error(t("sales.return.missingUnit"));
      return;
    }

    setIsSubmitting(true);
    try {
      await createSaleReturn({
        saleId,
        productId,
        unitId,
        quantity: qty,
        refundAmount: refund,
        cashRefundAmount: cashRefund,
        batchNumber: needsBatch ? batchNumber.trim() : undefined,
        reason: reason.trim() || undefined,
      });

      toast.success(t("sales.return.success"));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(`${t("sales.return.error")}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <GloableModal open={open} setOpen={setOpen} isClose={true}>
      <div className="w-[520px] bg-white max-h-[90vh] overflow-y-auto rounded-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("sales.return.title")}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {returnableItems.length === 0 ? (
            <p className="text-sm text-gray-600">{t("sales.return.noItems")}</p>
          ) : (
            <>
              <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-900">
                {t("sales.return.hint", {
                  paid: formatCurrency(sale.paidAmount || 0),
                })}
                {(sale?.paidAmount || 0) > 0 && (
                  <span className="block mt-1">
                    {t("sales.return.cashRefundRequiredHint")}
                  </span>
                )}
              </div>

              {(sale?.discountAmount || 0) > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900">
                  {t("sales.return.discountHint", {
                    discount: formatCurrency(sale.discountAmount),
                  })}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("sales.return.productLabel")}
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">{t("sales.return.selectProduct")}</option>
                  {returnableItems.map((item) => {
                    const id = getProductId(item);
                    return (
                      <option key={id} value={id}>
                        {item.product?.name || "—"} ({item.quantity}{" "}
                        {item.unit?.name || ""})
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedItem && (
                <p className="text-xs text-gray-500">
                  {t("sales.return.lineInfo", {
                    unit: selectedItem.unit?.name || "—",
                    max: maxQty,
                    lineTotal: formatCurrency(selectedItem.totalPrice || 0),
                  })}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("sales.return.quantityLabel")}
                  </label>
                  <input
                    {...bindNumericControlled({
                      allowDecimal: true,
                      value: quantity,
                      onChange: (e) => setQuantity(e.target.value),
                      className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500",
                      disabled: !productId,
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("sales.return.refundLabel")}
                  </label>
                  <input
                    {...bindNumericControlled({
                      allowDecimal: true,
                      value: refundAmount,
                      onChange: (e) => setRefundAmount(e.target.value),
                      className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500",
                      disabled: !productId,
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("sales.return.cashRefundLabel")}
                  {(sale?.paidAmount || 0) > 0 ? " *" : ""}
                </label>
                <input
                  {...bindNumericControlled({
                    allowDecimal: true,
                    value: cashRefundAmount,
                    onChange: (e) => setCashRefundAmount(e.target.value),
                    placeholder:
                      (sale?.paidAmount || 0) > 0
                        ? String(calcSuggestedCashRefund(sale, refundAmount))
                        : "0",
                    className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500",
                    disabled: !productId || maxCashRefund <= 0,
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("sales.return.cashRefundHint", {
                    max: formatCurrency(maxCashRefund),
                  })}
                  {(sale?.paidAmount || 0) > 0 && refundAmount
                    ? ` — ${t("sales.return.cashRefundSuggested", {
                        amount: formatCurrency(
                          calcSuggestedCashRefund(sale, refundAmount)
                        ),
                      })}`
                    : ""}
                </p>
              </div>

              {needsBatch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("sales.return.batchLabel")}
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500"
                    placeholder={t("sales.return.batchPlaceholder")}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("sales.return.reasonLabel")}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500"
                  placeholder={t("sales.return.reasonPlaceholder")}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-sm hover:bg-gray-50"
            >
              {t("sales.return.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                returnableItems.length === 0 ||
                !productId
              }
              className="px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting
                ? t("sales.return.submitting")
                : t("sales.return.submit")}
            </button>
          </div>
        </div>
      </div>
    </GloableModal>
  );
};

export default SaleReturnModal;
