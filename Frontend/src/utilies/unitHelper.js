// Utility function to format unit display with both derived and base units
export const formatUnitDisplay = (quantity, unit) => {
  if (!unit || !quantity) return quantity?.toString() || '0';
  
  // If it's a base unit or no conversion info, just show the quantity
  if (unit.is_base_unit || !unit.base_unit || !unit.conversion_to_base) {
    return `${quantity} ${unit.name || ''}`;
  }
  
  // Calculate base unit quantity
  const baseQuantity = (quantity * unit.conversion_to_base).toFixed(2);
  const baseUnitName = unit.base_unit?.name || unit.base_unit || '';
  
  // Show both: "10 carton (200 kg)"
  return `${quantity} ${unit.name} (${baseQuantity} ${baseUnitName})`;
};

// Utility function to get purchase price display with unit context
export const formatPurchasePriceDisplay = (stockItem, selectedProduct) => {
  const purchasePrice = stockItem?.purchasePricePerBaseUnit || 
                       selectedProduct?.latestPurchasePrice || 0;
  
  if (purchasePrice <= 0) return null;
  
  const baseUnitName = stockItem?.unit?.base_unit?.name || 
                      selectedProduct?.baseUnit?.name || 'واحد';
  
  return `${purchasePrice.toLocaleString()} افغانی/${baseUnitName}`;
};