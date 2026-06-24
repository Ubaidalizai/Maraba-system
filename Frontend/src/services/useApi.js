import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bounce, toast } from "react-toastify";
import i18n from "../i18n/config";
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
  createSaraf,
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
  deleteSaraf,
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
  fetchExpiringStocks,
  fetchStockPurchaseSource,
  fetchInventoryStock,
  fetchProducts,
  fetchProductsFromStock,
  fetchProductyById,
  fetchPurchase,
  fetchPurchaseStockConstraints,
  fetchPurchases,
  fetchSale,
  fetchSales,
  fetchSaleReturns,
  fetchSalesReports,
  fetchPurchaseReports,
  fetchPurchaseReturns,
  createPurchaseReturn,
  deletePurchaseReturn,
  deleteSaleReturn,
  fetchExpenseSummary,
  fetchCategoriesByType,
  fetchAccountBalances,
  fetchAccountTotals,
  fetchCashFlowReport,
  fetchStockReport,
  fetchDailyReport,
  fetchStock,
  fetchNetProfit,
  fetchProfitStats,
  fetchProfitSummary,
  fetchStockItem,
  fetchStockTransfers,
  fetchStockDamages,
  createStockDamage,
  deleteStockDamage,
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
  recordSalePayment,
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
  updateSaraf,
  updateStockItem,
  updateStore,
  updateSupplier,
  updateUnit,
  getProfile,
  updateCurrentUser,
  fetchSettings,
  updateSettings,
  fetchSaraf,
  fetchSarafs,
} from "./apiUtiles";
import { fetchTrashSummary } from "../utilies/trashApi";
import { applySalePaymentCacheUpdates } from "../utilies/saleQuery";

/** Refetch account lists, ledgers, and balances after any balance-changing action. */
export const invalidateAccountRelatedQueries = (queryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["accounts"] }),
    queryClient.invalidateQueries({ queryKey: ["accountTotals"] }),
    queryClient.invalidateQueries({ queryKey: ["systemAccounts"] }),
    queryClient.invalidateQueries({ queryKey: ["accountLedger"] }),
    queryClient.invalidateQueries({ queryKey: ["accountTransactionVolume"] }),
    queryClient.invalidateQueries({ queryKey: ["recentTransactions"] }),
  ]);

export const invalidateInventoryStatsQueries = (queryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["inventoryStats"] }),
    queryClient.invalidateQueries({ queryKey: ["stocks"] }),
    queryClient.invalidateQueries({ queryKey: ["productsFromStock"] }),
    queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    queryClient.invalidateQueries({ queryKey: ["allProducts"] }),
    queryClient.invalidateQueries({ queryKey: ["batches"] }),
    queryClient.invalidateQueries({ queryKey: ["employeeStockDamage"] }),
  ]);

/** Refetch sale detail/list and account caches after recording a sale payment. */
export const invalidateSalePaymentQueries = (queryClient, saleId) =>
  Promise.all([
    saleId
      ? queryClient.invalidateQueries({ queryKey: ["sale", saleId] })
      : queryClient.invalidateQueries({ queryKey: ["sale"] }),
    queryClient.invalidateQueries({ queryKey: ["allSales"] }),
    queryClient.invalidateQueries({ queryKey: ["saleReturns"] }),
    queryClient.invalidateQueries({ queryKey: ["dailyReport"] }),
    queryClient.invalidateQueries({ queryKey: ["salesReports"] }),
    invalidateAccountRelatedQueries(queryClient),
  ]);

/** Refetch entity list/detail caches after restoring from trash. */
export const invalidateQueriesForTrashRestore = (queryClient, type, id) => {
  const invalidate = (queryKey) =>
    queryClient.invalidateQueries({ queryKey });

  const tasks = [
    queryClient.invalidateQueries({ queryKey: ["trashSummary"] }),
  ];

  switch (type) {
    case "purchase":
      tasks.push(invalidate(["allPurchases"]));
      if (id) tasks.push(invalidate(["purchase", id]));
      tasks.push(
        invalidateAccountRelatedQueries(queryClient),
        invalidateInventoryStatsQueries(queryClient)
      );
      break;
    case "sale":
      tasks.push(invalidate(["allSales"]));
      if (id) tasks.push(invalidate(["sale", id]));
      tasks.push(
        invalidateAccountRelatedQueries(queryClient),
        invalidateInventoryStatsQueries(queryClient)
      );
      break;
    case "product":
      tasks.push(invalidate(["allProducts"]));
      if (id) tasks.push(invalidate(["product", id]));
      tasks.push(
        invalidate(["inventory"]),
        invalidateInventoryStatsQueries(queryClient)
      );
      break;
    case "expense":
      tasks.push(
        invalidate(["expenses"]),
        invalidate(["expense-stats"]),
        invalidateAccountRelatedQueries(queryClient)
      );
      break;
    case "income":
      tasks.push(invalidate(["income"]), invalidateAccountRelatedQueries(queryClient));
      break;
    case "account":
      tasks.push(invalidateAccountRelatedQueries(queryClient));
      if (id) tasks.push(invalidate(["accountLedger", id]));
      break;
    case "customer":
      tasks.push(invalidate(["allCustomers"]));
      if (id) tasks.push(invalidate(["customer", id]));
      tasks.push(invalidateAccountRelatedQueries(queryClient));
      break;
    case "supplier":
      tasks.push(invalidate(["allSuppliers"]));
      if (id) tasks.push(invalidate(["supplier", id]));
      tasks.push(invalidateAccountRelatedQueries(queryClient));
      break;
    case "category":
      tasks.push(
        invalidate(["categories"]),
        invalidate(["categoriesByType"]),
        invalidate(["expense-categories"]),
        invalidate(["income-categories"])
      );
      break;
    case "brand":
      tasks.push(invalidate(["allProducts"]));
      break;
    case "employee":
      tasks.push(invalidate(["allEmployees"]));
      if (id) tasks.push(invalidate(["employee", id]));
      break;
    case "company":
      tasks.push(invalidate(["allCompanies"]));
      if (id) tasks.push(invalidate(["company", id]));
      break;
    case "type":
      tasks.push(invalidate(["categoriesByType"]));
      break;
    case "saraf":
      tasks.push(invalidate(["allSarafs"]));
      if (id) tasks.push(invalidate(["saraf", id]));
      tasks.push(invalidateAccountRelatedQueries(queryClient));
      break;
    default:
      break;
  }

  return Promise.all(tasks);
};

export const useTrashSummary = () =>
  useQuery({
    queryKey: ["trashSummary"],
    queryFn: fetchTrashSummary,
    staleTime: 20 * 1000,
    refetchInterval: 45 * 1000,
  });

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
      toast.success(i18n.t("useApi.password.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.password.updateError"));
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.success(i18n.t("useApi.forgotPassword.success"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.forgotPassword.error"));
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
      toast.success(i18n.t("inventory.product.toast.createSuccess"));
    },
    onError: (error) => {
      toast.error(
        error.message || i18n.t("inventory.product.toast.createError")
      );
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
      toast.success(i18n.t("inventory.product.toast.updateSuccess"));
    },
    onError: (error) => {
      toast.error(
        error.message || i18n.t("inventory.product.toast.updateError")
      );
    },
  });
};
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["createTransaction"],
    mutationFn: createManualTransaction,
    onSuccess: (data, variables) => {
      void invalidateAccountRelatedQueries(queryClient);
      if (variables?.accountId) {
        queryClient.invalidateQueries({
          queryKey: ["accountLedger", variables.accountId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      }
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      toast.success(i18n.t("useApi.transaction.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.transaction.createError"));
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
      toast.success(i18n.t("useApi.product.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.product.deleteError"));
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
    onSuccess: () => {
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries(["inventory"]);
    },
  });
};

// ✏️ Update item
export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStockItem,
    mutationKey: ["updateInventory"],
    onSuccess: () => {
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["stocks"]);
      queryClient.invalidateQueries(["product"]);
      toast.success(i18n.t("inventory.stockEdit.updateSuccess"));
    },
    onError: (error) => {
      toast.error(
        error.message || i18n.t("inventory.stockEdit.updateError")
      );
    },
  });
};

// 🗑️ Delete item
export const useDeleteInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries(["inventory"]);
    },
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
      toast.success(i18n.t("useApi.store.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.store.updateError"));
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

export const usePurchaseReturns = (params = {}, options = {}) =>
  useQuery({
    queryKey: ["purchaseReturns", params],
    queryFn: () => fetchPurchaseReturns(params),
    ...options,
  });

export const useDeletePurchaseReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePurchaseReturn,
    onSuccess: () => {
      void invalidateAccountRelatedQueries(queryClient);
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["purchaseReturns"] });
      queryClient.invalidateQueries({ queryKey: ["allPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
    },
  });
};

export const usePurchaseStockConstraints = (id) =>
  useQuery({
    queryKey: ["purchase", id, "stock-constraints"],
    queryFn: () => fetchPurchaseStockConstraints(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchase,
    mutationKey: ["newPurchase"],
    onSuccess: () => {
      toast.success(i18n.t("useApi.purchase.createSuccess"));
      queryClient.invalidateQueries(["allPurchases"]);
      void invalidateAccountRelatedQueries(queryClient);
      void invalidateInventoryStatsQueries(queryClient);
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.purchase.createError"));
    },
  });
};

export const useUpdatePurchase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updatePurchase"],
    mutationFn: ({ id, ...purchaseData }) => updatePurchase(id, purchaseData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(["allPurchases"]);
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["purchase", variables.id] });
      }
      void invalidateAccountRelatedQueries(queryClient);
      void invalidateInventoryStatsQueries(queryClient);
    },
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
  const { search, includeZeroQuantity, enabled = true } = opts;
  return useQuery({
    queryKey: [
      "stocks",
      "warehouse",
      { search: search || "", includeZeroQuantity },
    ],
    queryFn: () => fetchInventoryStock({ search, includeZeroQuantity }),
    keepPreviousData: true,
    enabled,
  });
};

export const useStoreStocks = (opts = {}) => {
  const { search, includeZeroQuantity, enabled = true } = opts;
  return useQuery({
    queryKey: [
      "stocks",
      "store",
      { search: search || "", includeZeroQuantity },
    ],
    queryFn: () => fetchStoreStock({ search, includeZeroQuantity }),
    keepPreviousData: true,
    enabled,
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
    staleTime: 0,
  });
};

export const useStockPurchaseSource = (stockId, opts = {}) => {
  const { enabled = true } = opts;
  return useQuery({
    queryKey: ["stocks", "purchase-source", stockId],
    queryFn: () => fetchStockPurchaseSource(stockId),
    enabled: enabled && !!stockId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useExpiringStocks = (opts = {}) => {
  const {
    search = "",
    location = "all",
    status = "all",
    page = 1,
    limit = 10,
    enabled = true,
  } = opts;

  return useQuery({
    queryKey: [
      "stocks",
      "expiring",
      { search, location, status, page, limit },
    ],
    queryFn: () =>
      fetchExpiringStocks({ search, location, status, page, limit }),
    keepPreviousData: true,
    enabled,
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
      toast.success(i18n.t("useApi.supplier.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.supplier.createError"));
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
      toast.success(i18n.t("useApi.supplier.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.supplier.updateError"));
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
      toast.success(i18n.t("useApi.supplier.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.supplier.deleteError"));
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

export const useSaleReturns = (params = {}, options = {}) =>
  useQuery({
    queryKey: ["saleReturns", params],
    queryFn: () => fetchSaleReturns(params),
    ...options,
  });

export const useDeleteSaleReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSaleReturn,
    onSuccess: () => {
      void invalidateAccountRelatedQueries(queryClient);
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["saleReturns"] });
      queryClient.invalidateQueries({ queryKey: ["allSales"] });
      queryClient.invalidateQueries({ queryKey: ["sale"] });
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSale,
    mutationKey: ["newSale"],
    onSuccess: () => {
      queryClient.invalidateQueries(["allSales"]);
      void invalidateAccountRelatedQueries(queryClient);
    },
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateSale"],
    mutationFn: ({ id, ...data }) => updateSale(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries(["allSales"]);
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["sale", variables.id] });
      }
      void invalidateAccountRelatedQueries(queryClient);
    },
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

export const useAccountTotals = () => {
  return useQuery({
    queryKey: ["accountTotals"],
    queryFn: () => fetchAccountTotals(),
    // Always treat as stale so visiting Accounts refetches (global queries.staleTime is 1 min)
    staleTime: 0,
    refetchOnMount: "always",
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
      toast.success(i18n.t("useApi.customer.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.customer.createError"));
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
      toast.success(i18n.t("useApi.customer.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.customer.updateError"));
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
      toast.success(i18n.t("useApi.customer.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.customer.deleteError"));
    },
  });
};

// Sarafs
export const useSarafs = () => {
  return useQuery({
    queryKey: ["allSarafs"],
    queryFn: fetchSarafs,
  });
};

export const useSaraf = (id) =>
  useQuery({
    queryKey: ["saraf", id],
    queryFn: () => fetchSaraf(id),
    enabled: !!id,
  });

export const useCreateSaraf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSaraf,
    mutationKey: ["newSaraf"],
    onSuccess: () => {
      queryClient.invalidateQueries(["allSarafs"]);
      toast.success(i18n.t("useApi.saraf.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.saraf.createError"));
    },
  });
};

export const useUpdateSaraf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateSaraf"],
    mutationFn: ({ id, sarafData }) => updateSaraf(id, sarafData),
    onSuccess: () => {
      queryClient.invalidateQueries(["allSarafs"]);
      toast.success(i18n.t("useApi.saraf.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.saraf.updateError"));
    },
  });
};

export const useDeleteSaraf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteSaraf"],
    mutationFn: deleteSaraf,
    onSuccess: () => {
      queryClient.invalidateQueries(["allSarafs"]);
      toast.success(i18n.t("useApi.saraf.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.saraf.deleteError"));
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
    // Always treat as stale so visiting Accounts refetches (global queries.staleTime is 1 min)
    staleTime: 0,
    refetchOnMount: "always",
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
  includeZeroQuantity = false,
  queryOptions = {}
) => {
  return useQuery({
    queryKey: ["productsFromStock", location, includeZeroQuantity],
    queryFn: () => fetchProductsFromStock(location, includeZeroQuantity),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...queryOptions,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    mutationKey: ["newAccount"],
    onSuccess: () => {
      void invalidateAccountRelatedQueries(queryClient);
      toast.success(i18n.t("useApi.account.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.account.createError"));
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateAccount"],
    mutationFn: ({ id, accountData }) => updateAccount(id, accountData),
    onSuccess: () => {
      void invalidateAccountRelatedQueries(queryClient);
      toast.success(i18n.t("useApi.account.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.account.updateError"));
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteAccount"],
    mutationFn: deleteAccount,
    onSuccess: () => {
      void invalidateAccountRelatedQueries(queryClient);
      toast.success(i18n.t("useApi.account.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.account.deleteError"));
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
        error.message || i18n.t("useApi.transaction.ledgerLoadError")
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

      toast.success(i18n.t("useApi.employee.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.employee.createError"));
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

      toast.success(i18n.t("useApi.employee.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.employee.updateError"));
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

      toast.success(i18n.t("useApi.employee.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.employee.deleteError"));
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

      toast.success(i18n.t("useApi.unit.createSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.unit.createError"));
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

      toast.success(i18n.t("useApi.unit.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.unit.updateError"));
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

      toast.success(i18n.t("useApi.unit.deleteSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.unit.deleteError"));
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

export const useStockDamages = (params = {}) => {
  return useQuery({
    queryKey: ["stockDamages", params],
    queryFn: () => fetchStockDamages(params),
  });
};

export const useCreateStockDamage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockDamage,
    onSuccess: () => {
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["stockDamages"] });
    },
  });
};

export const useDeleteStockDamage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => deleteStockDamage(id, { reason }),
    onSuccess: () => {
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["stockDamages"] });
    },
  });
};
export const useStockTransferDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteStockTransfer"],
    mutationFn: deleteStockTransfer,
    onSuccess: () => {
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries(["stockTransfers"]);
      toast.success(i18n.t("useApi.stockTransfer.deleteSuccess"), {
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
      toast.error(error.message || i18n.t("useApi.stockTransfer.deleteError"), {
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
      void invalidateInventoryStatsQueries(queryClient);
      queryClient.invalidateQueries(["inventory"]);
      queryClient.invalidateQueries(["stockTransfers"]);
      queryClient.invalidateQueries(["stocks"]);
      toast.success(i18n.t("useApi.stockTransfer.createSuccess"), {
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
      toast.error(error.message || i18n.t("useApi.stockTransfer.createError"), {
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
      void invalidateAccountRelatedQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      toast.success(i18n.t("useApi.transaction.reverseSuccess"), {
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
      toast.error(
        error.message ||
          i18n.t("useApi.transaction.reverseError", {
            message: error.message,
          }),
        {
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
      void invalidateAccountRelatedQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
      toast.success(i18n.t("useApi.accountTransfer.success"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.accountTransfer.error"));
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
      void invalidateAccountRelatedQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["accountLedger"] });
      queryClient.invalidateQueries({ queryKey: ["recentTransactions"] });
    },
  });
};

export const useRecordSalePayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, payload }) => recordSalePayment(saleId, payload),
    mutationKey: ["salePayment"],
    onSuccess: (response, variables) => {
      const saleId = variables?.saleId;
      applySalePaymentCacheUpdates(queryClient, saleId, response);
      void invalidateSalePaymentQueries(queryClient, saleId);
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
        toast.success(i18n.t("useApi.profile.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.profile.updateError"));
    },
  });
};

// Settings
export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateSettings"],
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      toast.success(i18n.t("useApi.settings.updateSuccess"));
    },
    onError: (error) => {
      toast.error(error.message || i18n.t("useApi.settings.updateError"));
    },
  });
};
