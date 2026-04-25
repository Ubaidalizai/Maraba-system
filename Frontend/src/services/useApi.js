import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bounce, toast } from "react-toastify";
import {
  createAccount,
  createCompnay,
  createCustomer,
  createEmployee,
  createInventoryItem,
  createManualTransaction,
  createProductItem,
  createPurchase,
  createSale,
  createStockTransfer,
  createStore,
  createSupplier,
  createUnit,
  deleteAccount,
  deleteCompany,
  deleteCustomer,
  deleteEmployee,
  deleteInventoryItem,
  deleteProductItem,
  deletePurchase,
  deleteSale,
  deleteStockTransfer,
  deleteStore,
  deleteSupplier,
  deleteUnit,
  fetchAccountLedger,
  fetchAccounts,
  fetchAccountTransactions,
  fetchAccountTransactionVolume,
  fetchBatchesByProduct,
  fetchCompanies,
  fetchCustomer,
  fetchCustomers,
  fetchEmployee,
  fetchEmployees,
  fetchEmployeeStock,
  fetchInventory,
  fetchInventoryStats,
  fetchInventoryStock,
  fetchProducts,
  fetchProductsFromStock,
  fetchProductyById,
  fetchPurchase,
  fetchPurchases,
  fetchSale,
  fetchSales,
  fetchSalesReports,
  fetchPurchaseReports,
  fetchExpenseSummary,
  fetchCategoriesByType,
  fetchAccountBalances,
  fetchCashFlowReport,
  fetchStockReport,
  fetchDailyReport,
  fetchStock,
  fetchNetProfit,
  fetchProfitStats,
  fetchProfitSummary,
  fetchStockItem,
  fetchStockTransfers,
  fetchStore,
  fetchStores,
  fetchStoreStock,
  fetchSupplier,
  fetchSupplierAccounts,
  fetchSystemAccounts,
  fetchUnit,
  fetchUnits,
  forgotPassword,
  getSuppliers,
  getUserProfile,
  loginUser,
  logoutUser,
  recordPurchasePayment,
  refreshUserToken,
  reverseAccountTransaction,
  transferBetweenAccounts,
  updateAccount,
  updateCompany,
  updateCustomer,
  updateEmployee,
  updatePassword,
  updateProductItem,
  updatePurchase,
  updateSale,
  updateStockItem,
  updateStore,
  updateSupplier,
  updateUnit,
  getProfile,
  updateCurrentUser,
} from "./apiUtiles";

// Authentication hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: loginUser,
    mutationKey: ["login"],
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    mutationKey: ["logout"],
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: refreshUserToken,
    mutationKey: ["refreshToken"],
  });
};

export const useUserProfile = () => {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: getUserProfile,
    enabled: false, // Only fetch when explicitly called
  });
};
export const useUpdatePassword = () => {
  return useMutation({
    mutationKey: ["updatePassword"],
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success("پسورد شما تغییر داده شد");
    },
    onError: (error) => {
      toast.error(error.message || "مشکلی پیش آمده است دو باره کوشش کنید");
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.success("لطفا ایمیل تانرا چک کنید!");
    },
    onError: (error) => {
      toast.error(error.message || "ایمیل مورد نظر اشتباه میباشد");
    },
  });
};

// ✅ Get all inventory items
export const useProduct = (opts = {}) => {
  const { search, includeDeleted, page = 1, limit = 10 } = opts;
  return useQuery({
    queryKey: [
      "product",
      { search: search || "", includeDeleted: !!includeDeleted, page, limit },
    ],
    queryFn: () => fetchProducts({ search, includeDeleted, page, limit }),
    keepPreviousData: true,
  });
};

export const useProducts = () => {
  return useQuery({
    queryKey: ["allProducts"],
    queryFn: fetchProducts,
  });
};

// ✅ Get single item by ID
export const useProdcutItem = (id) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProductyById(id),
    enabled: !!id,
  });
};

// ✅ Create item mutation
export const useCreateProdcut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductItem,
    mutationKey: ["newProduct"],
    onSuccess: () => {
      queryClient.invalidateQueries(["product"]);
      toast.success("محصول  موفقانه اضافه شد");
    },
    onError: (error) => {
      toast.error(error.message || "مشکل در ساختن محصول");
    },
  });
};

// ✅ Update item mutation
export const useUpdateProdcut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProductItem,
    mutationKey: ["productupdate"],
    onSuccess: () => {
      queryClient.invalidateQueries(["product"]);
      toast.success("محصول با موفقیت بروزرسانی شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در بروزرسانی محصول");
    },
  });
};
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["createTransaction"],
    mutationFn: createManualTransaction,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      if (variables?.accountId) {
        queryClient.invalidateQueries({
          queryKey: ["accountLedger", variables.accountId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      }
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      toast.success("تراکنش با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error.message || "ثبت تراکنش ناموفق بود");
    },
  });
};
// ✅ Delete item mutation
export const useDeleteProdcut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductItem,
    mutationKey: ["productRemove"],
    onSuccess: () => {
      queryClient.invalidateQueries(["product"]);
      toast.success("محصول موفقانه حذف گردید!");
    },
    onError: (error) => {
      toast.error(error.message || "در حذف کردن محصول مشکلی پیش آمده است");
    },
  });
};

// INVENTORY USE CONT..
export const useInventory = () => {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
  });
};

// 🔍 Get single item
export const useInventoryItem = (id) => {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => fetchStockItem(id),
    enabled: !!id,
  });
};

// ➕ Add item
export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => queryClient.invalidateQueries(["inventory"]),
  });
};

// ✏️ Update item
export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStockItem,
    mutationKey: ["updateInventory"],
    onSuccess: () => {
      queryClient.invalidateQueries(["inventory"]);
      toast.success("موفقانه بروز رسانی شد");
    },
    onError: (error) => {
      toast.error(error.message || "در بروز رسانی مشکلی پیش آمده است");
    },
  });
};

// 🗑️ Delete item
export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => queryClient.invalidateQueries(["inventory"]),
  });
};
// use store

export const useStores = () => {
  return useQuery({
    queryKey: ["allstores"],
    queryFn: fetchStores,
  });
};

export const useStore = (id) =>
  useQuery({
    queryKey: ["store", id],
    queryFn: fetchStore,
  });

export const useCreateStore = () => {
  const queryClient = useQueryClient();
  return useMutation(createStore, {
    onSuccess: () => queryClient.invalidateQueries(["createStore"]),
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateStock"],
    mutationFn: () => updateStore,
    onSuccess: () => {
      queryClient.invalidateQueries(["allstores"]);
      toast.success("موجودی موفقانه بروز رسانی شد");
    },
    onError: (error) => {
      toast.error(error.message || "بروز رسانی در موجودی مشکل پیش آمده است");
    },
  });
};

export const useDeleteStore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["storedelete"],
    mutationFn: deleteStore,
    onSuccess: () => queryClient.invalidateQueries(["allstores"]),
  });
};

// Purchases

export const usePurchases = (params = {}) => {
  return useQuery({
    queryKey: ["allPurchases", params],
    queryFn: () => fetchPurchases(params),
  });
};

export const usePurchase = (id) =>
  useQuery({
    queryKey: ["purchase", id],
    queryFn: () => fetchPurchase(id),
    enabled: !!id, // Only run query if id exists
  });

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchase,
    mutationKey: ["newPurchase"],
    onSuccess: () => {
      toast.success("خرید شما موفقانه اجرا شد، تشکر...");
      queryClient.invalidateQueries(["allPurchases"]);
    },
    onError: (error) => {
      toast.error(error.message || "در خریداری شما مشکلی است");
    },
  });
};

export const useUpdatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updatePurchase"],
    mutationFn: ({ id, ...purchaseData }) => updatePurchase(id, purchaseData),
    onSuccess: () => queryClient.invalidateQueries(["allPurchases"]),
  });
};

export const useDeletePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["purchaseDelete"],
    mutationFn: deletePurchase,
    onSuccess: () => queryClient.invalidateQueries(["allPurchases"]),
  });
};

// Stock (backend-powered lists)
export const useStocks = () => {
  return useQuery({
    queryKey: ["stocks"],
    queryFn: fetchStock,
  });
};

export const useWarehouseStocks = (opts = {}) => {
  const { search, includeZeroQuantity } = opts;
  return useQuery({
    queryKey: [
      "stocks",
      "warehouse",
      { search: search || "", includeZeroQuantity },
    ],
    queryFn: () => fetchInventoryStock({ search, includeZeroQuantity }),
    keepPreviousData: true,
  });
};

export const useStoreStocks = (opts = {}) => {
  const { search, includeZeroQuantity } = opts;
  return useQuery({
    queryKey: [
      "stocks",
      "store",
      { search: search || "", includeZeroQuantity },
    ],
    queryFn: () => fetchStoreStock({ search, includeZeroQuantity }),
    keepPreviousData: true,
  });
};

export const useEmployeeStocks = (opts = {}) => {
  const { search, employeeId } = opts;
  return useQuery({
    queryKey: [
      "stocks",
      "employee",
      { search: search || "", employeeId: employeeId || "" },
    ],
    queryFn: () => fetchEmployeeStock({ search, employeeId }),
    keepPreviousData: true,
    enabled: !!employeeId && employeeId !== null, // Only run query if employeeId exists and is not null
  });
};

export const useReturnEmployeeStock = (opts = {}) => {
  const { search } = opts;
  return useQuery({
    queryKey: ["stocks", "employee", "returnStock", { search: search || "" }],
    queryFn: () => fetchEmployeeStock({ search }),
    keepPreviousData: true,
  });
};

export const useInventoryStats = () => {
  return useQuery({
    queryKey: ["inventoryStats"],
    queryFn: fetchInventoryStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBatchesByProduct = (productId, location = "store") => {
  return useQuery({
    queryKey: ["batches", productId, location],
    queryFn: () => fetchBatchesByProduct(productId, location),
    enabled: !!productId, // Only run query if productId exists
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Supplier CRUD operations

export const useSuppliers = () => {
  return useQuery({
    queryKey: ["allSuppliers"],
    queryFn: getSuppliers,
  });
};

export const useSupplier = (id) =>
  useQuery({
    queryKey: ["supplier", id],
    queryFn: fetchSupplier,
  });

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    mutationKey: ["newSupplier"],
    onSuccess: () => {
      queryClient.invalidateQueries(["allSupplier"]);
      toast.success("تامین‌کننده با موفقیت  ساخته  شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ساختن تامین‌کننده");
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateSupplier"],
    mutationFn: ({ id, supplierData }) => updateSupplier(id, supplierData),

    onSuccess: () => {
      queryClient.invalidateQueries(["allSupplier"]);
      toast.success("تامین‌کننده با موفقیت  بروز رسانی  شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در بروز رسانی تامین‌کننده");
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteSupplier"],
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries(["allSupplier"]);
      toast.success("تامین‌کننده با موفقیت حذف شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در حذف تامین‌کننده");
    },
  });
};

// USE THE SALE

export const useSales = (params = {}) => {
  return useQuery({
    queryKey: ["allSales", params],
    queryFn: () => fetchSales(params),
    keepPreviousData: true,
  });
};

export const useSale = (id) =>
  useQuery({
    queryKey: ["sale", id],
    queryFn: () => fetchSale(id),
    enabled: !!id, // Only run query if id exists
  });

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSale,
    mutationKey: ["newSale"],
    onSuccess: () => queryClient.invalidateQueries(["allSales"]),
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateSale"],
    mutationFn: ({ id, ...data }) => updateSale(id, data),
    onSuccess: () => queryClient.invalidateQueries(["allSales"]),
  });
};

export const useDeleteSales = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteSale"],
    mutationFn: deleteSale,
    onSuccess: () => queryClient.invalidateQueries(["allSales"]),
  });
};

// Sales Reports
export const useSalesReports = (params = {}) => {
  return useQuery({
    queryKey: ["salesReports", params],
    queryFn: () => fetchSalesReports(params),
    enabled: !!(params.startDate && params.endDate),
    keepPreviousData: true,
  });
};

// Purchase Reports
export const usePurchaseReports = (params = {}) => {
  return useQuery({
    queryKey: ["purchaseReports", params],
    queryFn: () => fetchPurchaseReports(params),
    enabled: !!(params.startDate && params.endDate),
    keepPreviousData: true,
  });
};

// Expense Summary
export const useExpenseSummary = (params = {}) => {
  return useQuery({
    queryKey: ["expenseSummary", params],
    queryFn: () => fetchExpenseSummary(params),
    enabled: !!(params.startDate && params.endDate),
    keepPreviousData: true,
  });
};

// Categories by type (for expense/income filters)
export const useCategoriesByType = (type = "expense") => {
  return useQuery({
    queryKey: ["categoriesByType", type],
    queryFn: () => fetchCategoriesByType(type),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

// Account Reports
export const useAccountBalances = () => {
  return useQuery({
    queryKey: ["accountBalances"],
    queryFn: () => fetchAccountBalances(),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
};

export const useCashFlowReport = (params = {}) => {
  return useQuery({
    queryKey: ["cashFlowReport", params],
    queryFn: () => fetchCashFlowReport(params),
    enabled: !!(params.startDate && params.endDate),
    keepPreviousData: true,
  });
};

// Stock Reports
export const useStockReport = (params = {}) => {
  return useQuery({
    queryKey: ["stockReport", params],
    queryFn: () => fetchStockReport(params),
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    keepPreviousData: true,
  });
};

// Profit Reports
export const useNetProfit = (params = {}) => {
  return useQuery({
    queryKey: ["netProfit", params],
    queryFn: () => fetchNetProfit(params),
    keepPreviousData: true,
  });
};

export const useProfitStats = (params = {}) => {
  return useQuery({
    queryKey: ["profitStats", params],
    queryFn: () => fetchProfitStats(params),
    keepPreviousData: true,
  });
};

export const useProfitSummary = (params = {}) => {
  return useQuery({
    queryKey: ["profitSummary", params],
    queryFn: () => fetchProfitSummary(params),
    enabled: !!(params.startDate && params.endDate),
    keepPreviousData: true,
  });
};

// CUSTOMER USE

// export const useSuppliers = () => {
//   return useQuery({
//     queryKey: ["allSuppliers"],
//     queryFn: fetchSuppliers,
//   });
// };

// export const useSupplier = (id) =>
//   useQuery({
//     queryKey: ["supplier", id],
//     queryFn: fetchSupplier,
//   });

// export const useCreateSupplier = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: createSupplier,
//     mutationKey: ["newSupplier"],
//     onSuccess: () => queryClient.invalidateQueries(["allSuppliers"]),
//   });
// };

// export const useUpdateSupplier = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationKey: ["updateSupplier"],
//     mutationFn: () => updateSupplier,
//     onSuccess: () => queryClient.invalidateQueries(["allSuppliers"]),
//   });
// };

// export const useDeleteSupplier = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationKey: ["deleteSupplier"],
//     mutationFn: deleteSupplier,
//     onSuccess: () => queryClient.invalidateQueries(["allSupplier"]),
//   });
// };

// USE THE SALE

export const useCustomers = () => {
  return useQuery({
    queryKey: ["allCustomers"],
    queryFn: fetchCustomers,
  });
};

export const useCustomer = (id) =>
  useQuery({
    queryKey: ["customer", id],
    queryFn: fetchCustomer,
  });

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    mutationKey: ["newCustomer"],
    onSuccess: () => {
      queryClient.invalidateQueries(["allCustomers"]);
      toast.success("موفقانه مشتری مورد نظر ایجاد  گردید!");
    },
    onError: (error) => {
      toast.error(error.message || "متاسفانه در ایجاد کردن مشتری مورد نظر مشکلی پیش آمده است ");
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateCustomer"],
    mutationFn: ({ id, customerData }) => updateCustomer(id, customerData),
    onSuccess: () => {
      queryClient.invalidateQueries(["allCustomers"]);
      toast.success("موفقانه مشتری مورد نظر  بروز رسانی  گردید!");
    },
    onError: (error) => {
      toast.error(error.message || "متاسفانه در بروز رسانی  کردن مشتری مورد نظر مشکلی پیش آمده است ");
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteCustomer"],
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries(["allCustomers"]);
      toast.success("موفقانه مشتری مورد نظر حذف گردید!");
    },
    onError: (error) => {
      toast.error(error.message || "متاسفانه در حذف کردن مشتری مورد نظر مشکلی پیش آمده است ");
    },
  });
};

// USE COMPNAY

export const useCompanies = () => {
  return useQuery({
    queryKey: ["allCompanies"],
    queryFn: fetchCompanies,
  });
};

export const useCompany = (id) =>
  useQuery({
    queryKey: ["company", id],
    queryFn: fetchSupplier,
  });

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompnay,
    mutationKey: ["newCompany"],
    onSuccess: () => queryClient.invalidateQueries(["allCompanies"]),
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateCompany"],
    mutationFn: () => updateCompany,
    onSuccess: () => queryClient.invalidateQueries(["allCompanies"]),
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteCompany"],
    mutationFn: deleteCompany,
    onSuccess: () => queryClient.invalidateQueries(["allCompanies"]),
  });
};

export const useAccounts = (opts = {}) => {
  const { type, search, page = 1, limit = 10 } = opts;
  return useQuery({
    queryKey: [
      "accounts",
      { type: type || "", search: search || "", page, limit },
    ],
    queryFn: () => fetchAccounts({ type, search, page, limit }),
    keepPreviousData: true,
    onSuccess: (data) => {
      console.log("useAccounts success:", data);
    },
    onError: (error) => {
      console.error("useAccounts error:", error);
    },
  });
};

export const useSystemAccounts = () => {
  return useQuery({
    queryKey: ["systemAccounts"],
    queryFn: fetchSystemAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSupplierAccounts = () => {
  return useQuery({
    queryKey: ["supplierAccounts"],
    queryFn: fetchSupplierAccounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProductsFromStock = (
  location = "store",
  includeZeroQuantity = false
) => {
  return useQuery({
    queryKey: ["productsFromStock", location, includeZeroQuantity],
    queryFn: () => fetchProductsFromStock(location, includeZeroQuantity),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    mutationKey: ["newAccount"],
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
      toast.success("موفقانه حساب جدید ساخته شده");
    },
    onError: (error) => {
      toast.error(error.message || "متاسفانه در ساختن حساب جدید تان مشکلی پیش آمده است");
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateAccount"],
    mutationFn: ({ id, accountData }) => updateAccount(id, accountData),
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
      toast.success("موفقانه بروز رسانی شد");
    },
    onError: (error) => {
      toast.error(error.message || "در بروز رسانی مشکلی پیش آمده است");
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteAccount"],
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries(["accounts"]);
      toast.success("موفقانه حذف گردید!");
    },
    onError: (error) => {
      toast.error(error.message || "متاسفانه مشکلی پیش آمده");
    },
  });
};

export const useAccountLedger = (accountId, params = {}) => {
  const { startDate, endDate, type, sortOrder = "desc" } = params;
  return useQuery({
    queryKey: [
      "accountLedger",
      accountId,
      startDate || null,
      endDate || null,
      type || "",
      sortOrder,
    ],
    queryFn: () =>
      fetchAccountLedger(accountId, {
        startDate,
        endDate,
        type,
        sortOrder,
      }),
    enabled: !!accountId,
    keepPreviousData: true,
    placeholderData: (previousData) => previousData,
    onError: (error) => {
      toast.error(
        error.message ||
          "در بارگذاری تراکنش‌های حساب مشکلی پیش آمده است. لطفاً دوباره تلاش کنید."
      );
    },
  });
};
// USE THE employee

export const useEmployees = () => {
  return useQuery({
    queryKey: ["allEmployees"],
    queryFn: fetchEmployees,
  });
};

export const useEmployee = (id) =>
  useQuery({
    queryKey: ["employee", id],
    queryFn: fetchEmployee,
  });

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    mutationKey: ["newEmployee"],
    onSuccess: () => {
      queryClient.invalidateQueries(["allEmployees"]);

      toast.success("کارمند با موفقیت ساخته  شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ساختن کارمند");
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateEmployee"],
    mutationFn: ({ id, employeeData }) => updateEmployee(id, employeeData),
    onSuccess: () => {
      queryClient.invalidateQueries(["allEmployees"]);

      toast.success("کارمند با موفقیت بروز رسانی شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در بروز رسانی کارمند");
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteEmployee"],
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries(["allEmployees"]);

      toast.success("کارمند با موفقیت حذف شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در حذف کارمند");
    },
  });
};

export const useAccountTransactionVolume = (accountId) => {
  return useQuery({
    queryKey: ["accountTransactionVolume", accountId],
    queryFn: () => fetchAccountTransactionVolume(accountId),
    enabled: !!accountId,
    staleTime: 2 * 60 * 1000,
  });
};

// Units
export const useUnits = (params = {}) => {
  return useQuery({
    queryKey: ["allUnits", params],
    queryFn: () => fetchUnits(params),
  });
};

export const useUnit = (id) => {
  return useQuery({
    queryKey: ["unit", id],
    queryFn: () => fetchUnit(id),
    enabled: !!id,
  });
};

export const useCreateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUnit,
    mutationKey: ["newUnit"],
    onSuccess: () => {
      queryClient.invalidateQueries(["allUnits"]);

      toast.success("واحد با موفقیت ساخته شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در ساختن واحد");
    },
  });
};

export const useUpdateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateUnit"],
    mutationFn: ({ id, unitData }) => updateUnit(id, unitData),
    onSuccess: () => {
      queryClient.invalidateQueries(["allUnits"]);

      toast.success("واحد با موفقیت بروز رسانی شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در بروز رسانی واحد");
    },
  });
};

export const useDeleteUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteUnit"],
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries(["allUnits"]);

      toast.success("واحد با موفقیت حذف شد");
    },
    onError: (error) => {
      toast.error(error.message || "خطا در حذف واحد");
    },
  });
};

// Dashboard Hooks
// export const useDashboardStats = () => {
//   return useQuery({
//     queryKey: ["dashboardStats"],
//     queryFn: fetchDashboardStats,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });
// };

export const useRecentTransactions = (params = {}) => {
  const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  return useQuery({
    queryKey: ["recentTransactions", { page, limit, search, sortBy, sortOrder }],
    queryFn: () => fetchAccountTransactions({ page, limit, search, sortBy, sortOrder }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// export const useLowStockItems = () => {
//   return useQuery({
//     queryKey: ["lowStockItems"],
//     queryFn: fetchLowStockItems,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });
// };

// export const useDashboardSummary = () => {
//   return useQuery({
//     queryKey: ["dashboardSummary"],
//     queryFn: fetchDashboardSummary,
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });
// };
export const useStockTransfers = () => {
  return useQuery({
    queryKey: ["stockTransfers"],
    queryFn: fetchStockTransfers,
  });
};
export const useStockTransferDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteStockTransfer"],
    mutationFn: deleteStockTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries(["stockTransfers"]);
      toast.success(" شما با موفقیت موجودی را حذف کردید ", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    },
    onError: (error) => {
      toast.error(error.message || " عملیه  نا  موفق بود", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    },
  });
};

export const useCreateStockTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockTransfer,
    mutationKey: ["newTransfer"],
    onSuccess: () => {
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["stockTransfers"]);
      queryClient.invalidateQueries(["stocks"]);
      toast.success("انتقال موفقانه بود", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    },
    onError: (error) => {
      toast.error(error.message || "نتقال موفقانه نبود", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    },
  });
};

// Reverse Transaction
export const useReverseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => reverseAccountTransaction(id, reason),
    mutationKey: ["reverseTransaction"],
    onSuccess: () => {
      queryClient.invalidateQueries(["recentTransactions"]);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      toast.success("تراکنش با موفقیت برگردانده شد", {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    },
    onError: (error) => {
      toast.error(`خطا در برگرداندن تراکنش: ${error.message}`, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        transition: Bounce,
      });
    },
  });
};

export const useTransferBetweenAccounts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transferBetweenAccounts,
    mutationKey: ["transferAccounts"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["systemAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      toast.success("پیسې په بریالیتوب سره انتقال شوې");
    },
    onError: (error) => {
      toast.error(error.message || "انتقال ناکام شو");
    },
  });
};

// Payment

export const usePaymentProcess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ purchaseId, payload }) =>
      recordPurchasePayment(purchaseId, payload),
    mutationKey: ["payment"],
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allPurchases"] });
      if (variables?.purchaseId) {
        queryClient.invalidateQueries({
          queryKey: ["purchase", variables.purchaseId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      toast.success("پرداخت خرید با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error.message || "ثبت پرداخت خرید ناموفق بود");
    },
  });
};
export const useDailyReport = (params = {}) => {
  const { startDate, endDate } = params;
  return useQuery({
    queryKey: ["dailyReport", { startDate, endDate }],
    queryFn: () => fetchDailyReport({ startDate, endDate }),
    enabled: !!(startDate && endDate),
    keepPreviousData: true,
  });
};

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updatedUser", "userProfile"],
    mutationFn: updateCurrentUser,
    onSuccess: () => {
      queryClient.invalidateQueries(["profile"]),
        toast.success("با موفقیت تغییرات ثبت شد");
    },
    onError: (error) => {
      toast.error(error.message || "متاسفانه مشکلی پیش آمده است");
    },
  });
};
