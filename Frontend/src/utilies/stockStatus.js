// Utility function to calculate stock status based on quantity and minimum level
export const getStockStatus = (quantity, minLevel) => {
  if (quantity <= 0) {
    return {
      status: 'out_of_stock',
      label: 'تمام شده',
      color: 'bg-red-100 text-red-800 border border-red-200'
    };
  } else if (minLevel > 0 && quantity <= minLevel) {
    return {
      status: 'low_stock',
      label: 'کمبود موجودی',
      color: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    };
  } else {
    return {
      status: 'available',
      label: 'موجود',
      color: 'bg-green-100 text-green-800 border border-green-200'
    };
  }
};

// Utility function to get status color class
export const getStatusColor = (status) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'low_stock':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'out_of_stock':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};
