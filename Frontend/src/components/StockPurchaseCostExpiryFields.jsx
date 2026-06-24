import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useStockPurchaseSource } from "../services/useApi";
import { formatJalaliDate } from "../utilies/helper";
import StockPurchasePriceDisplay from "./StockPurchasePriceDisplay";

/**
 * Read-only cost/expiry on stock edit — edits happen on the purchase line.
 */
function StockPurchaseCostExpiryFields({
  stockId,
  purchasePricePerBaseUnit,
  primaryUnit,
  expiryDate,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useStockPurchaseSource(stockId, {
    enabled: !!stockId,
  });
  const source = data?.data;

  return (
    <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50/80 p-3 space-y-3">
      <p className="text-xs text-amber-900">
        {t("inventory.stockEdit.purchaseOnlyHint")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">
            {t("inventory.stockEdit.unitPriceLabel")}
          </span>
          <p className="text-sm font-semibold text-gray-900">
            <StockPurchasePriceDisplay
              pricePerBase={purchasePricePerBaseUnit ?? 0}
              primaryUnit={primaryUnit}
            />
          </p>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">
            {t("inventory.stockEdit.expiryDateLabel")}
          </span>
          <p className="text-sm font-semibold text-gray-900">
            {formatJalaliDate(expiryDate)}
          </p>
        </div>
      </div>
      {isLoading ? (
        <p className="text-xs text-gray-500">{t("inventory.product.loading")}</p>
      ) : source?.purchaseId ? (
        <button
          type="button"
          onClick={() =>
            navigate(`/purchases/edit/${source.purchaseId}`)
          }
          className="text-sm font-medium text-amber-800 hover:text-amber-950 underline underline-offset-2"
        >
          {t("inventory.stockEdit.editInPurchase")}
        </button>
      ) : (
        <p className="text-xs text-gray-600">
          {t("inventory.stockEdit.noPurchaseLinked")}
        </p>
      )}
    </div>
  );
}

export default StockPurchaseCostExpiryFields;
