/** React-query cache for GET sale may be a flat sale doc or legacy { sale } wrapper. */
export function resolveSaleFromQuery(data) {
  if (!data) return null;
  return data.sale ?? data;
}

export function patchSaleQueryCache(prev, updates) {
  if (!prev) return prev;
  if (prev.sale && typeof prev.sale === "object") {
    return { ...prev, sale: { ...prev.sale, ...updates } };
  }
  return { ...prev, ...updates };
}

/** POST /sales/:id/payment — normalize paid/due from API body. */
export function parseSalePaymentResponse(response) {
  const updated =
    response?.sale || response?.data?.sale || response?.data || response || {};
  return {
    paidAmount: updated.paidAmount,
    dueAmount: updated.dueAmount,
    totalAmount: updated.totalAmount,
  };
}

export function patchSaleDetailCache(queryClient, saleId, paymentFields) {
  if (!saleId) return;
  queryClient.setQueryData(["sale", saleId], (prev) =>
    patchSaleQueryCache(prev, paymentFields)
  );
}

/** Update every cached sales list (any filter/page params). */
export function patchAllSalesListCache(queryClient, saleId, paymentFields) {
  if (!saleId) return;
  queryClient.setQueriesData({ queryKey: ["allSales"] }, (prev) => {
    if (!prev) return prev;
    const list = prev.sales ?? prev.data;
    if (!Array.isArray(list)) return prev;
    const updatedList = list.map((sale) =>
      sale._id === saleId ? { ...sale, ...paymentFields } : sale
    );
    return prev.sales !== undefined
      ? { ...prev, sales: updatedList }
      : { ...prev, data: updatedList };
  });
}

export function applySalePaymentCacheUpdates(queryClient, saleId, response) {
  const paymentFields = parseSalePaymentResponse(response);
  if (
    paymentFields.paidAmount === undefined &&
    paymentFields.dueAmount === undefined
  ) {
    return paymentFields;
  }
  patchSaleDetailCache(queryClient, saleId, paymentFields);
  patchAllSalesListCache(queryClient, saleId, paymentFields);
  return paymentFields;
}
