import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import GloableModal from "./GloableModal";
import { toast } from "react-toastify";
import { createPurchaseReturn } from "../services/apiUtiles";
import { formatCurrency } from "../utilies/helper";
import { bindNumericControlled } from "../utilies/numericInput";

const getItemId = (item) => item?._id;

const calcSuggestedCashFromSupplier = (purchase, creditAmount) => {
  const paid = purchase?.paidAmount || 0;
  const total = purchase?.totalAmount || 0;
  const credit = parseFloat(creditAmount) || 0;
  if (paid <= 0 || credit <= 0 || total <= 0) return 0;
  return Math.round((paid * credit) / total * 100) / 100;
};

const calcSuggestedCredit = (item, qty) => {
  if (!item || !qty || qty <= 0) return 0;
  const lineQty = item.quantity || 0;
  if (lineQty <= 0) return 0;
  const lineTotal = item.totalPrice || 0;
  return Math.round((lineTotal / lineQty) * qty * 100) / 100;
};

const PurchaseReturnModal = ({ open, setOpen, purchaseId, purchase, onSuccess }) => {
  const { t } = useTranslation();
  const returnableItems = useMemo(
    () => (purchase?.items || []).filter((item) => (item.quantity || 0) > 0),
    [purchase?.items]
  );

  const [purchaseItemId, setPurchaseItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [cashRefundAmount, setCashRefundAmount] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = useMemo(
    () => returnableItems.find((item) => getItemId(item) === purchaseItemId),
    [returnableItems, purchaseItemId]
  );

  const needsBatch = selectedItem?.batchNumber === "MULTI";
  const maxQty = selectedItem?.quantity || 0;
  const maxCashRefund = Math.min(
    parseFloat(creditAmount) || 0,
    purchase?.paidAmount || 0
  );

  const resetForm = () => {
    setPurchaseItemId("");
    setQuantity("");
    setCreditAmount("");
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
    const suggestedCredit = calcSuggestedCredit(selectedItem, qty);
    setCreditAmount(String(suggestedCredit));
    setCashRefundAmount(
      String(calcSuggestedCashFromSupplier(purchase, suggestedCredit))
    );
  }, [quantity, selectedItem, purchase]);

  const handleItemChange = (id) => {
    setPurchaseItemId(id);
    const item = returnableItems.find((i) => getItemId(i) === id);
    if (item) {
      const qty = item.quantity || 0;
      const suggestedCredit = calcSuggestedCredit(item, qty);
      setQuantity(String(qty));
      setCreditAmount(String(suggestedCredit));
      setCashRefundAmount(
        String(calcSuggestedCashFromSupplier(purchase, suggestedCredit))
      );
      setBatchNumber("");
    } else {
      setQuantity("");
      setCreditAmount("");
      setCashRefundAmount("");
      setBatchNumber("");
    }
  };

  const handleSubmit = async () => {
    if (!purchaseItemId || !selectedItem) {
      toast.error(t("purchases.return.selectProduct"));
      return;
    }

    const qty = parseFloat(quantity);
    const credit = parseFloat(creditAmount);
    const cashRefund = parseFloat(cashRefundAmount) || 0;

    if (!qty || qty <= 0 || qty > maxQty) {
      toast.error(t("purchases.return.quantityRange", { max: maxQty }));
      return;
    }

    if (credit < 0) {
      toast.error(t("purchases.return.creditInvalid"));
      return;
    }

    const maxCredit = calcSuggestedCredit(selectedItem, qty);
    if (credit > maxCredit + 0.01) {
      toast.error(
        t("purchases.return.creditMax", { max: formatCurrency(maxCredit) })
      );
      return;
    }

    if (credit > (purchase?.totalAmount || 0) + 0.01) {
      toast.error(
        t("purchases.return.creditExceedsPurchase", {
          max: formatCurrency(purchase?.totalAmount || 0),
        })
      );
      return;
    }

    if (cashRefund > credit) {
      toast.error(t("purchases.return.cashExceedsCredit"));
      return;
    }

    if (cashRefund > (purchase?.paidAmount || 0)) {
      toast.error(t("purchases.return.cashExceedsPaid"));
      return;
    }

    const requiredCash = calcSuggestedCashFromSupplier(purchase, credit);
    if (requiredCash > 0 && cashRefund + 0.01 < requiredCash) {
      toast.error(
        t("purchases.return.cashRefundRequired", {
          amount: formatCurrency(requiredCash),
        })
      );
      return;
    }

    if (needsBatch && !batchNumber.trim()) {
      toast.error(t("purchases.return.batchRequired"));
      return;
    }

    const unitId = selectedItem.unit?._id || selectedItem.unit;
    if (!unitId) {
      toast.error(t("purchases.return.missingUnit"));
      return;
    }

    setIsSubmitting(true);
    try {
      await createPurchaseReturn({
        purchaseId,
        purchaseItemId,
        unitId,
        quantity: qty,
        creditAmount: credit,
        cashRefundAmount: cashRefund,
        batchNumber: needsBatch ? batchNumber.trim() : undefined,
        reason: reason.trim() || undefined,
      });

      toast.success(t("purchases.return.success"));
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(`${t("purchases.return.error")}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!purchase) return null;

  return (
    <GloableModal open={open} setOpen={setOpen} isClose={true}>
      <div className="w-[520px] bg-white max-h-[90vh] overflow-y-auto rounded-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("purchases.return.title")}
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
            <p className="text-sm text-gray-600">{t("purchases.return.noItems")}</p>
          ) : (
            <>
              <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-900">
                {t("purchases.return.hint", {
                  paid: formatCurrency(purchase.paidAmount || 0),
                })}
                {(purchase?.paidAmount || 0) > 0 && (
                  <span className="block mt-1">
                    {t("purchases.return.cashRefundRequiredHint")}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.return.productLabel")}
                </label>
                <select
                  value={purchaseItemId}
                  onChange={(e) => handleItemChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">{t("purchases.return.selectProduct")}</option>
                  {returnableItems.map((item) => {
                    const id = getItemId(item);
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
                  {t("purchases.return.lineInfo", {
                    unit: selectedItem.unit?.name || "—",
                    max: maxQty,
                    lineTotal: formatCurrency(selectedItem.totalPrice || 0),
                  })}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("purchases.return.quantityLabel")}
                  </label>
                  <input
                    {...bindNumericControlled({
                      allowDecimal: true,
                      value: quantity,
                      onChange: (e) => setQuantity(e.target.value),
                      className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500",
                      disabled: !purchaseItemId,
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("purchases.return.creditLabel")}
                  </label>
                  <input
                    {...bindNumericControlled({
                      allowDecimal: true,
                      value: creditAmount,
                      onChange: (e) => setCreditAmount(e.target.value),
                      className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500",
                      disabled: !purchaseItemId,
                    })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.return.cashRefundLabel")}
                  {(purchase?.paidAmount || 0) > 0 ? " *" : ""}
                </label>
                <input
                  {...bindNumericControlled({
                    allowDecimal: true,
                    value: cashRefundAmount,
                    onChange: (e) => setCashRefundAmount(e.target.value),
                    placeholder:
                      (purchase?.paidAmount || 0) > 0
                        ? String(calcSuggestedCashFromSupplier(purchase, creditAmount))
                        : "0",
                    className: "w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500",
                    disabled: !purchaseItemId || maxCashRefund <= 0,
                  })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("purchases.return.cashRefundHint", {
                    max: formatCurrency(maxCashRefund),
                  })}
                  {(purchase?.paidAmount || 0) > 0 && creditAmount
                    ? ` — ${t("purchases.return.cashRefundSuggested", {
                        amount: formatCurrency(
                          calcSuggestedCashFromSupplier(purchase, creditAmount)
                        ),
                      })}`
                    : ""}
                </p>
              </div>

              {needsBatch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("purchases.return.batchLabel")}
                  </label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500"
                    placeholder={t("purchases.return.batchPlaceholder")}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("purchases.return.reasonLabel")}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-amber-500"
                  placeholder={t("purchases.return.reasonPlaceholder")}
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
              {t("purchases.return.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                returnableItems.length === 0 ||
                !purchaseItemId
              }
              className="px-4 py-2 bg-amber-600 text-white rounded-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {isSubmitting
                ? t("purchases.return.submitting")
                : t("purchases.return.submit")}
            </button>
          </div>
        </div>
      </div>
    </GloableModal>
  );
};

export default PurchaseReturnModal;
