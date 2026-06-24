import BoldNumbers from "./BoldNumbers";
import { formatStockQuantityDisplay } from "../utilies/unitHelper";

function StockQuantityDisplay({ quantity, unit, className = "" }) {
  return (
    <BoldNumbers className={className}>
      {formatStockQuantityDisplay(quantity, unit)}
    </BoldNumbers>
  );
}

export default StockQuantityDisplay;
