/** @typedef {'paid' | 'partial' | 'pending'} PaymentStatus */

/**
 * @param {{ paidAmount?: number | string, dueAmount?: number | string }} record
 * @returns {PaymentStatus}
 */
export const resolvePaymentStatus = ({ paidAmount = 0, dueAmount = 0 } = {}) => {
  const paid = Number(paidAmount) || 0;
  const due = Number(dueAmount) || 0;

  if (due <= 0) return "paid";
  if (paid <= 0) return "pending";
  return "partial";
};

/** @param {PaymentStatus} status */
export const getPaymentStatusColor = (status) => {
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

/** @param {PaymentStatus} status */
export const getPaymentStatusTableLabelKey = (status) => {
  switch (status) {
    case "paid":
      return "statusFullyPaid";
    case "partial":
      return "statusPartialPaid";
    case "pending":
      return "statusUnpaid";
    default:
      return "statusFullyPaid";
  }
};
