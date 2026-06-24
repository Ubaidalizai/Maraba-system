import BoldNumbers from "./BoldNumbers";
import { formatCurrency } from "../utilies/helper";
import {
  getSubUnitName,
  hasSubUnit,
  pricePerPrimaryUnit,
  pricePerSubUnit,
} from "../utilies/unitHelper";

function StockPurchasePriceDisplay({ pricePerBase, primaryUnit, className = "" }) {
  if (pricePerBase == null || Number(pricePerBase) <= 0) {
    return (
      <BoldNumbers className={className}>{formatCurrency(0)}</BoldNumbers>
    );
  }

  const primaryPrice = pricePerPrimaryUnit(pricePerBase, primaryUnit);
  const primaryName = primaryUnit?.name || "";
  const subName = getSubUnitName(primaryUnit);
  const subPrice = hasSubUnit(primaryUnit)
    ? pricePerSubUnit(pricePerBase, primaryUnit)
    : null;

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      <span>
        <BoldNumbers>{formatCurrency(primaryPrice)}</BoldNumbers>
        {primaryName ? `/${primaryName}` : ""}
      </span>
      {subName && subPrice != null ? (
        <span className="text-xs text-gray-500">
          <BoldNumbers>{formatCurrency(subPrice)}</BoldNumbers>/{subName}
        </span>
      ) : null}
    </div>
  );
}

export default StockPurchasePriceDisplay;
