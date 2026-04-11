// ========================================
// API Utility Functions
// ========================================

import { apiRequest, API_ENDPOINTS, API_BASE_URL } from "./apiConfig";
import { normalizeDateToIso } from "../utilies/helper";

// Authentication functions
export const loginUser = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  }

  return response.json();
};

export const logoutUser = async () => {
  const response = await fetch(`${API_BASE_URL}/users/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Logout failed");
  }

  return response.json();
};

export const refreshUserToken = async () => {
  const response = await fetch(`${API_BASE_URL}/users/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Token refresh failed");
  }

  return response.json();
};

export const getUserProfile = async () => {
  return await apiRequest(API_ENDPOINTS.AUTH.PROFILE);
};
export const updatePassword = async (data) => {
  return await apiRequest(API_ENDPOINTS.AUTH.UPDATEPASSWORD, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};
export const forgotPassword = async ({ email }) => {
  return await apiRequest(API_ENDPOINTS.AUTH.FORGOTPASSWORD, {
    method: "POST",
    body: JSON.stringify(email),
  });
};
// Products
export const fetchProducts = async (params = {}) => {
  try {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.includeDeleted) query.set("includeDeleted", "true");

    const url = query.toString()
      ? `${API_ENDPOINTS.PRODUCTS.LIST}?${query.toString()}`
      : API_ENDPOINTS.PRODUCTS.LIST;

    const response = await apiRequest(url);

    // Handle both direct array response and paginated response with data property
    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
        totalPages: 1,
        currentPage: 1,
      };
    } else if (response && Array.isArray(response.products)) {
      return {
        data: response.products,
        total: response.total || response.products.length,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || 1,
      };
    } else if (response && Array.isArray(response.data)) {
      return {
        data: response.data,
        total: response.total || response.data.length,
        totalPages: response.totalPages || 1,
        currentPage: response.currentPage || 1,
      };
    } else {
      console.warn("Unexpected products response format:", response);
      return { data: [], total: 0, totalPages: 1, currentPage: 1 };
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    return { data: [], total: 0, totalPages: 1, currentPage: 1 }; // Return empty array on error
  }
};

export const fetchProduct = async (id) => {
  return await apiRequest(API_ENDPOINTS.PRODUCTS.DETAIL(id));
};

export const createProduct = async (productData) => {
  return await apiRequest(API_ENDPOINTS.PRODUCTS.CREATE, {
    method: "POST",
    body: JSON.stringify(productData),
  });
};

// ✅ Update an item
export const updateProductItem = async ({ id, updatedItem }) => {
  const res = await fetch(`${API_BASE_URL}/product/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedItem),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update product");
  }
  return res.json();
};

export const updateProduct = async (id, productData) => {
  return await apiRequest(API_ENDPOINTS.PRODUCTS.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async (id) => {
  return await apiRequest(API_ENDPOINTS.PRODUCTS.DELETE(id), {
    method: "DELETE",
  });
};

// Suppliers
export const fetchSuppliers = async () => {
  return await apiRequest(API_ENDPOINTS.SUPPLIERS.LIST);
};

export const getSuppliers = async () => {
  return await apiRequest(API_ENDPOINTS.SUPPLIERS.LIST);
};

export const fetchSupplier = async (id) => {
  return await apiRequest(API_ENDPOINTS.SUPPLIERS.DETAIL(id));
};

export const createSupplier = async (supplierData) => {
  return await apiRequest(API_ENDPOINTS.SUPPLIERS.CREATE, {
    method: "POST",
    body: JSON.stringify(supplierData),
  });
};

export const updateSupplier = async (id, supplierData) => {
  return await apiRequest(API_ENDPOINTS.SUPPLIERS.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(supplierData),
  });
};

export const deleteSupplier = async (id) => {
  return await apiRequest(API_ENDPOINTS.SUPPLIERS.DELETE(id), {
    method: "DELETE",
  });
};

// Customers
export const fetchCustomers = async () => {
  return await apiRequest(API_ENDPOINTS.CUSTOMERS.LIST);
};

export const fetchCustomer = async (id) => {
  return await apiRequest(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
};

export const createCustomer = async (customerData) => {
  return await apiRequest(API_ENDPOINTS.CUSTOMERS.CREATE, {
    method: "POST",
    body: JSON.stringify(customerData),
  });
};

export const updateCustomer = async (id, customerData) => {
  return await apiRequest(API_ENDPOINTS.CUSTOMERS.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(customerData),
  });
};

export const deleteCustomer = async (id) => {
  return await apiRequest(API_ENDPOINTS.CUSTOMERS.DELETE(id), {
    method: "DELETE",
  });
};

// Employees
export const fetchEmployees = async () => {
  return await apiRequest(API_ENDPOINTS.EMPLOYEES.LIST);
};

export const fetchEmployee = async (id) => {
  return await apiRequest(API_ENDPOINTS.EMPLOYEES.DETAIL(id));
};

export const createEmployee = async (employeeData) => {
  return await apiRequest(API_ENDPOINTS.EMPLOYEES.CREATE, {
    method: "POST",
    body: JSON.stringify(employeeData),
  });
};

export const updateEmployee = async (id, employeeData) => {
  return await apiRequest(API_ENDPOINTS.EMPLOYEES.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(employeeData),
  });
};

export const deleteEmployee = async (id) => {
  return await apiRequest(API_ENDPOINTS.EMPLOYEES.DELETE(id), {
    method: "DELETE",
  });
};

// Units
export const fetchUnits = async () => {
  return await apiRequest(API_ENDPOINTS.UNITS.LIST);
};

export const fetchUnit = async (id) => {
  return await apiRequest(API_ENDPOINTS.UNITS.DETAIL(id));
};

export const createUnit = async (unitData) => {
  return await apiRequest(API_ENDPOINTS.UNITS.CREATE, {
    method: "POST",
    body: JSON.stringify(unitData),
  });
};

export const updateUnit = async (id, unitData) => {
  return await apiRequest(API_ENDPOINTS.UNITS.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(unitData),
  });
};

export const deleteUnit = async (id) => {
  return await apiRequest(API_ENDPOINTS.UNITS.DELETE(id), {
    method: "DELETE",
  });
};

// Types
export const fetchTypes = async () => {
  return await apiRequest(API_ENDPOINTS.TYPES.LIST);
};

export const fetchType = async (id) => {
  return await apiRequest(API_ENDPOINTS.TYPES.DETAIL(id));
};

export const createType = async (typeData) => {
  return await apiRequest(API_ENDPOINTS.TYPES.CREATE, {
    method: "POST",
    body: JSON.stringify(typeData),
  });
};

export const updateType = async (id, typeData) => {
  return await apiRequest(API_ENDPOINTS.TYPES.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(typeData),
  });
};

export const deleteType = async (id) => {
  return await apiRequest(API_ENDPOINTS.TYPES.DELETE(id), {
    method: "DELETE",
  });
};

// Accounts
export const fetchAccounts = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.transactionType && !params.type)
    query.set("transactionType", params.transactionType);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const url = query.toString()
    ? `${API_ENDPOINTS.ACCOUNTS.LIST}?${query.toString()}`
    : API_ENDPOINTS.ACCOUNTS.LIST;

  try {
    const response = await apiRequest(url);
    return response;
  } catch (error) {
    console.error("fetchAccounts error:", error);
    throw error;
  }
};

export const fetchSystemAccounts = async () => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.SYSTEM);
};

export const fetchSupplierAccounts = async () => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.SUPPLIERS);
};

export const fetchAccount = async (id) => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.DETAIL(id));
};

export const createAccount = async (accountData) => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.CREATE, {
    method: "POST",
    body: JSON.stringify(accountData),
  });
};

export const updateAccount = async (id, accountData) => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(accountData),
  });
};

export const deleteAccount = async (id) => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.DELETE(id), {
    method: "DELETE",
  });
};

export const fetchAccountLedger = async (accountId, params = {}) => {
  const query = new URLSearchParams();
  const startIso = normalizeDateToIso(params.startDate);
  const endIso = normalizeDateToIso(params.endDate);

  if (startIso) query.set("startDate", startIso);
  if (endIso) query.set("endDate", endIso);
  if (params.type) query.set("type", params.type);
  query.set("sortOrder", params.sortOrder || "desc");

  const url = query.toString()
    ? `${API_ENDPOINTS.ACCOUNTS.LEDGER(accountId)}?${query.toString()}`
    : API_ENDPOINTS.ACCOUNTS.LEDGER(accountId);
  return await apiRequest(url);
};

export const createManualTransaction = async (transactionData) => {
  try {
    const response = await apiRequest(
      API_ENDPOINTS.ACCOUNT_TRANSACTIONS.CREATE,
      {
        method: "POST",
        body: JSON.stringify(transactionData),
      }
    );
    return response;
  } catch (error) {
    console.error("createManualTransaction error:", error);
    throw error;
  }
};

// Purchases
export const fetchPurchases = async (params = {}) => {
  try {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.supplier) query.set("supplier", params.supplier);
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const url = query.toString()
      ? `${API_ENDPOINTS.PURCHASES.LIST}?${query.toString()}`
      : API_ENDPOINTS.PURCHASES.LIST;

    const response = await apiRequest(url);
    return response;
  } catch (error) {
    console.error("Error fetching purchases:", error);
    throw error;
  }
};

export const fetchPurchase = async (id) => {
  return await apiRequest(API_ENDPOINTS.PURCHASES.DETAIL(id));
};

export const createPurchase = async (purchaseData) => {
  return await apiRequest(API_ENDPOINTS.PURCHASES.CREATE, {
    method: "POST",
    body: JSON.stringify(purchaseData),
  });
};

export const updatePurchase = async (id, purchaseData) => {
  return await apiRequest(API_ENDPOINTS.PURCHASES.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(purchaseData),
  });
};

export const deletePurchase = async (id) => {
  return await apiRequest(API_ENDPOINTS.PURCHASES.DELETE(id), {
    method: "DELETE",
  });
};

export const restorePurchase = async (id) => {
  return await apiRequest(API_ENDPOINTS.PURCHASES.RESTORE(id), {
    method: "POST",
  });
};

// Sales
export const fetchSales = async (params = {}) => {
  try {
    const query = new URLSearchParams();
    if (params.customer) query.set("customer", params.customer);
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);

    const url = query.toString()
      ? `${API_ENDPOINTS.SALES.LIST}?${query.toString()}`
      : API_ENDPOINTS.SALES.LIST;

    const response = await apiRequest(url);

    // Handle backend response format
    if (response && response.data && Array.isArray(response.data)) {
      return {
        sales: response.data,
        total: response.pagination?.total || response.data.length,
        pages: response.pagination?.totalPages || 1,
        currentPage: response.pagination?.currentPage || 1,
      };
    } else if (Array.isArray(response)) {
      return {
        sales: response,
        total: response.length,
        pages: 1,
        currentPage: 1,
      };
    } else {
      console.warn("Unexpected sales response format:", response);
      return { sales: [], total: 0, pages: 1, currentPage: 1 };
    }
  } catch (error) {
    console.error("Error fetching sales:", error);
    return { sales: [], total: 0, pages: 1, currentPage: 1 };
  }
};

export const fetchSale = async (id) => {
  try {
    const response = await apiRequest(API_ENDPOINTS.SALES.DETAIL(id));
    // Handle backend response format
    if (response && response.data) {
      return response.data;
    } else if (response && response.sale && response.items) {
      return { ...response.sale, items: response.items };
    } else {
      return response;
    }
  } catch (error) {
    console.error("Error fetching sale:", error);
    return null;
  }
};

export const createSale = async (saleData) => {
  return await apiRequest(API_ENDPOINTS.SALES.CREATE, {
    method: "POST",
    body: JSON.stringify(saleData),
  });
};

export const updateSale = async (id, saleData) => {
  return await apiRequest(API_ENDPOINTS.SALES.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(saleData),
  });
};

export const deleteSale = async (id) => {
  return await apiRequest(API_ENDPOINTS.SALES.DELETE(id), {
    method: "DELETE",
  });
};

// Record payment against a sale
export const recordSalePayment = async (saleId, paymentData) => {
  return await apiRequest(`${API_ENDPOINTS.SALES.LIST}/${saleId}/payment`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
};

// Fetch sales reports with date range and grouping
export const fetchSalesReports = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.groupBy) query.set("groupBy", params.groupBy);

  const url = query.toString()
    ? `${API_ENDPOINTS.SALES.REPORTS}?${query.toString()}`
    : API_ENDPOINTS.SALES.REPORTS;

  return await apiRequest(url);
};

// Fetch purchase reports with date range and grouping
export const fetchPurchaseReports = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.groupBy) query.set("groupBy", params.groupBy);

  const url = query.toString()
    ? `${API_ENDPOINTS.PURCHASES.REPORTS}?${query.toString()}`
    : API_ENDPOINTS.PURCHASES.REPORTS;

  return await apiRequest(url);
};

// Fetch expense summary with date range and grouping
export const fetchExpenseSummary = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.groupBy) query.set("groupBy", params.groupBy);
  if (params.category) query.set("category", params.category);

  const url = query.toString()
    ? `${API_ENDPOINTS.EXPENSES.SUMMARY}?${query.toString()}`
    : API_ENDPOINTS.EXPENSES.SUMMARY;

  return await apiRequest(url);
};

// Fetch categories by type (expense, income, both)
export const fetchCategoriesByType = async (type = "expense") => {
  return await apiRequest(API_ENDPOINTS.CATEGORIES.BY_TYPE(type));
};

// Account Reports
export const fetchAccountBalances = async () => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.BALANCES);
};

export const fetchCashFlowReport = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.groupBy) query.set("groupBy", params.groupBy);

  const url = query.toString()
    ? `${API_ENDPOINTS.ACCOUNTS.CASHFLOW}?${query.toString()}`
    : API_ENDPOINTS.ACCOUNTS.CASHFLOW;

  return await apiRequest(url);
};

// Stock Reports
export const fetchStockReport = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.location) query.set("location", params.location);
  if (params.stockLevel) query.set("stockLevel", params.stockLevel);

  const url = query.toString()
    ? `${API_ENDPOINTS.STOCKS.REPORTS}?${query.toString()}`
    : API_ENDPOINTS.STOCKS.REPORTS;

  return await apiRequest(url);
};

// Profit Reports
export const fetchNetProfit = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);

  const url = query.toString()
    ? `${API_ENDPOINTS.PROFIT.NET}?${query.toString()}`
    : API_ENDPOINTS.PROFIT.NET;

  return await apiRequest(url);
};

export const fetchProfitStats = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);

  const url = query.toString()
    ? `${API_ENDPOINTS.PROFIT.STATS}?${query.toString()}`
    : API_ENDPOINTS.PROFIT.STATS;

  return await apiRequest(url);
};

export const fetchProfitSummary = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.groupBy) query.set("groupBy", params.groupBy);

  const url = query.toString()
    ? `${API_ENDPOINTS.PROFIT.SUMMARY}?${query.toString()}`
    : API_ENDPOINTS.PROFIT.SUMMARY;

  return await apiRequest(url);
};

// Record payment against a purchase
export const recordPurchasePayment = async (purchaseId, paymentData) => {
  return await apiRequest(
    `${API_ENDPOINTS.PURCHASES.LIST}/${purchaseId}/payment`,
    {
      method: "POST",
      body: JSON.stringify(paymentData),
    }
  );
};

// Stock
export const fetchStock = async () => {
  return await apiRequest(API_ENDPOINTS.STOCK.LIST);
};

export const fetchInventoryStock = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.includeZeroQuantity) query.set("includeZeroQuantity", "true");
  const url = query.toString()
    ? `${API_ENDPOINTS.STOCK.LIST}?location=warehouse&${query.toString()}`
    : `${API_ENDPOINTS.STOCK.LIST}?location=warehouse`;
  return await apiRequest(url);
};

export const fetchStoreStock = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.includeZeroQuantity) query.set("includeZeroQuantity", "true");
  const url = query.toString()
    ? `${API_ENDPOINTS.STOCK.LIST}?location=store&${query.toString()}`
    : `${API_ENDPOINTS.STOCK.LIST}?location=store`;
  return await apiRequest(url);
};

export const fetchEmployeeStock = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.search) query.set("search", params.search);
  const url = query.toString()
    ? `${API_ENDPOINTS.EMPLOYEE_STOCK.LIST}?${query.toString()}`
    : API_ENDPOINTS.EMPLOYEE_STOCK.LIST;

  const result = await apiRequest(url);
  return result;
};

export const fetchEmployeeStockByEmployee = async (employeeId) => {
  return await apiRequest(API_ENDPOINTS.EMPLOYEE_STOCK.BY_EMPLOYEE(employeeId));
};

export const fetchReturnEmployeeStock = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  const url = query.toString()
    ? `${API_ENDPOINTS.EMPLOYEE_STOCK.RETURN}?${query.toString()}`
    : API_ENDPOINTS.EMPLOYEE_STOCK.RETURN;
  return await apiRequest(url);
};

export const fetchInventoryStats = async () => {
  return await apiRequest(API_ENDPOINTS.STOCK.STATS);
};

export const fetchStockItem = async (id) => {
  return await apiRequest(API_ENDPOINTS.STOCK.DETAIL(id));
};

export const createStockItem = async (stockData) => {
  return await apiRequest(API_ENDPOINTS.STOCK.CREATE, {
    method: "POST",
    body: JSON.stringify(stockData),
  });
};

export const updateStockItem = async ({ id, stockData }) => {
  return await apiRequest(API_ENDPOINTS.STOCK.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(stockData),
  });
};

export const deleteStockItem = async (id) => {
  return await apiRequest(API_ENDPOINTS.STOCK.DELETE(id), {
    method: "DELETE",
  });
};

export const fetchBatchesByProduct = async (productId, location = "store") => {
  try {
    const response = await apiRequest(
      `${API_ENDPOINTS.STOCK.BATCHES_BY_PRODUCT(
        productId
      )}?location=${location}`
    );
    return response.data || response || [];
  } catch (error) {
    console.error("Error fetching batches:", error);
    return [];
  }
};

// Fetch products from stock where location=store
export const fetchProductsFromStock = async (
  location = "store",
  includeZeroQuantity = false
) => {
  try {
    const url = `${API_ENDPOINTS.STOCK.LIST}?location=${location}${
      includeZeroQuantity ? "&includeZeroQuantity=true" : ""
    }`;
    const response = await apiRequest(url);
    return response.data || response || [];
  } catch (error) {
    console.error("Error fetching products from stock:", error);
    return [];
  }
};

// Stock Transfers
export const fetchStockTransfers = async () => {
  return await apiRequest(API_ENDPOINTS.STOCK_TRANSFER.LIST);
};

export const fetchStockTransfer = async (id) => {
  return await apiRequest(API_ENDPOINTS.STOCK_TRANSFER.DETAIL(id));
};

export const createStockTransfer = async (transferData) => {
  return await apiRequest(API_ENDPOINTS.STOCK_TRANSFER.CREATE, {
    method: "POST",
    body: JSON.stringify(transferData),
  });
};

export const deleteStockTransfer = async (id) => {
  return await apiRequest(API_ENDPOINTS.STOCK_TRANSFER.DELETE(id), {
    method: "DELETE",
  });
};

// Expenses
export const fetchExpenses = async () => {
  return await apiRequest(API_ENDPOINTS.EXPENSES.LIST);
};

export const fetchExpense = async (id) => {
  return await apiRequest(API_ENDPOINTS.EXPENSES.DETAIL(id));
};

export const createExpense = async (expenseData) => {
  return await apiRequest(API_ENDPOINTS.EXPENSES.CREATE, {
    method: "POST",
    body: JSON.stringify(expenseData),
  });
};

export const updateExpense = async (id, expenseData) => {
  return await apiRequest(API_ENDPOINTS.EXPENSES.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(expenseData),
  });
};

export const deleteExpense = async (id) => {
  return await apiRequest(API_ENDPOINTS.EXPENSES.DELETE(id), {
    method: "DELETE",
  });
};

export const restoreExpense = async (id) => {
  return await apiRequest(API_ENDPOINTS.EXPENSES.RESTORE(id), {
    method: "POST",
  });
};

// Income
export const fetchIncome = async () => {
  return await apiRequest(API_ENDPOINTS.INCOME.LIST);
};

export const fetchIncomeItem = async (id) => {
  return await apiRequest(API_ENDPOINTS.INCOME.DETAIL(id));
};

export const createIncome = async (incomeData) => {
  return await apiRequest(API_ENDPOINTS.INCOME.CREATE, {
    method: "POST",
    body: JSON.stringify(incomeData),
  });
};

export const updateIncome = async (id, incomeData) => {
  return await apiRequest(API_ENDPOINTS.INCOME.UPDATE(id), {
    method: "PATCH",
    body: JSON.stringify(incomeData),
  });
};

export const deleteIncome = async (id) => {
  return await apiRequest(API_ENDPOINTS.INCOME.DELETE(id), {
    method: "DELETE",
  });
};

export const restoreIncome = async (id) => {
  return await apiRequest(API_ENDPOINTS.INCOME.RESTORE(id), {
    method: "POST",
  });
};

// Audit Logs
export const fetchAuditLogs = async () => {
  return await apiRequest(API_ENDPOINTS.AUDIT_LOGS.LIST);
};

export const fetchAuditLogsByTable = async (table) => {
  return await apiRequest(API_ENDPOINTS.AUDIT_LOGS.BY_TABLE(table));
};

export const fetchAuditLogsByRecord = async (id) => {
  return await apiRequest(API_ENDPOINTS.AUDIT_LOGS.BY_RECORD(id));
};

// Additional functions needed by useApi.js
export const fetchProductyById = async (id) => {
  return await fetchProduct(id);
};

export const createProductItem = async (productData) => {
  return await createProduct(productData);
};

// This function is already defined above with different signature
// export const updateProductItem = async (id, productData) => {
//   return await updateProduct(id, productData);
// };

// Account Transactions
export const fetchAccountTransactions = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.type) query.set("type", params.type);
  if (params.accountId) query.set("accountId", params.accountId);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  const url = query.toString()
    ? `${API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST}?${query.toString()}`
    : API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST;

  try {
    const response = await apiRequest(url);
    return response;
  } catch (error) {
    console.error("fetchAccountTransactions error:", error);
    throw error;
  }
};

export const fetchAccountTransaction = async (id) => {
  return await apiRequest(`${API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST}/${id}`);
};

export const createAccountTransaction = async (transactionData) => {
  return await apiRequest(API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST, {
    method: "POST",
    body: JSON.stringify(transactionData),
  });
};

export const updateAccountTransaction = async (id, transactionData) => {
  return await apiRequest(`${API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(transactionData),
  });
};

export const deleteAccountTransaction = async (id) => {
  return await apiRequest(`${API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST}/${id}`, {
    method: "DELETE",
  });
};

export const reverseAccountTransaction = async (id, reason) => {
  return await apiRequest(
    `${API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST}/${id}/reverse`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  );
};

export const transferBetweenAccounts = async (transferData) => {
  return await apiRequest(
    `${API_ENDPOINTS.ACCOUNT_TRANSACTIONS.LIST}/transfer`,
    {
      method: "POST",
      body: JSON.stringify(transferData),
    }
  );
};

// ACCOUNT

export const fetchaccounts = async () => {
  return await apiRequest(API_ENDPOINTS.ACCOUNTS.LIST);
};

// Dashboard Statistics - Fallback implementation using existing endpoints
// export const fetchDashboardStats = async () => {
//   try {
//     // Try to fetch from dedicated dashboard endpoint first
//     return await apiRequest(API_ENDPOINTS.DASHBOARD.STATS);
//   } catch {
//     // Fallback: calculate stats from existing endpoints
//     const [sales, purchases, products, inventory] = await Promise.all([
//       fetchSales(),
//       fetchPurchases(),
//       fetchProducts(),
//       fetchInventory(),
//     ]);

//     const totalSales =
//       sales?.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0) || 0;
//     const totalPurchases =
//       purchases?.reduce(
//         (sum, purchase) => sum + (purchase.totalAmount || 0),
//         0
//       ) || 0;
//     const lowStockItems =
//       inventory?.filter((item) => item.quantity <= (item.minLevel || 0))
//         .length || 0;

//     return {
//       totalProducts: products?.length || 0,
//       totalSales,
//       totalPurchases,
//       lowStockItems,
//       totalRevenue: totalSales - totalPurchases,
//     };
//   }
// };

// export const fetchRecentTransactions = async (limit = 10) => {
//   try {
//     // Try to fetch from dedicated endpoint first
//     return await apiRequest(
//       `${API_ENDPOINTS.DASHBOARD.RECENT_TRANSACTIONS}?limit=${limit}`
//     );
//   } catch {
//     // Fallback: combine recent sales and purchases
//     const [sales, purchases] = await Promise.all([
//       fetchSales(),
//       fetchPurchases(),
//     ]);

//     const recentSales = (sales || [])
//       .slice(0, Math.ceil(limit / 2))
//       .map((sale) => ({
//         ...sale,
//         type: "Sale",
//         transactionType: "sale",
//       }));

//     const recentPurchases = (purchases || [])
//       .slice(0, Math.floor(limit / 2))
//       .map((purchase) => ({
//         ...purchase,
//         type: "Purchase",
//         transactionType: "purchase",
//       }));

//     const allTransactions = [...recentSales, ...recentPurchases]
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
//       )
//       .slice(0, limit);

//     return allTransactions;
//   }
// };

// export const fetchLowStockItems = async () => {
//   try {
//     // Try to fetch from dedicated endpoint first
//     return await apiRequest(API_ENDPOINTS.DASHBOARD.LOW_STOCK);
//   } catch {
//     // Fallback: get low stock items from inventory
//     const inventory = await fetchInventory();
//     return (
//       inventory?.filter((item) => item.quantity <= (item.minLevel || 0)) || []
//     );
//   }
// };

// export const fetchDashboardSummary = async () => {
//   try {
//     return await apiRequest(API_ENDPOINTS.DASHBOARD.SUMMARY);
//   } catch {
//     // Fallback: return basic summary
//     const stats = await fetchDashboardStats();
//     return {
//       summary: stats,
//       lastUpdated: new Date().toISOString(),
//     };
//   }
// };

export const deleteProductItem = async (id) => {
  return await deleteProduct(id);
};

export const fetchInventory = async () => {
  return await fetchStock();
};

export const fetchInventoryById = async (id) => {
  return await fetchStockItem(id);
};

export const createInventoryItem = async (inventoryData) => {
  return await createStockItem(inventoryData);
};

export const updateInventoryItem = async (id, inventoryData) => {
  return await updateStockItem(id, inventoryData);
};

export const deleteInventoryItem = async (id) => {
  return await deleteStockItem(id);
};

export const fetchStores = async () => {
  return await fetchStoreStock();
};

export const fetchStore = async (id) => {
  return await fetchStockItem(id);
};

export const createStore = async (storeData) => {
  return await createStockItem(storeData);
};

export const updateStore = async (id, storeData) => {
  return await updateStockItem(id, storeData);
};

export const deleteStore = async (id) => {
  return await deleteStockItem(id);
};

// These functions are already defined above with apiRequest
// export const fetchUnits = async () => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/unit`);
//   if (!res.ok) throw new Error("Failed to fetch unit");
//   return res.json();
// };

// // Customer
// export const fetchCustomers = async () => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/customer`);
//   if (!res.ok) throw new Error("Failed to fetch customer");
//   return res.json();
// };
// export const fetchCustomer = async (id) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/customer/${id}`);
//   if (!res.ok) throw new Error("Failed to fetch customer");
//   return res.json();
// };

// // Create customer
// export const createCustomer = async (newCustomer) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/customer`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(newCustomer),
//   });
//   if (!res.ok) throw new Error("Failed to create customer");
//   return res.json();
// };

// // Update customer
// export const updateCustomer = async ({ id, updatedCustomer }) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/customer/${id}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(updatedCustomer),
//   });
//   if (!res.ok) throw new Error("Failed to update customer");
//   return res.json();
// };

// // Delete customer
// export const deleteCustomer = async (id) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/customer/${id}`, {
//     method: "DELETE",
//   });
//   if (!res.ok) throw new Error("Failed to delete customer");
//   return res.json();
// };

// // Employee
// export const fetchEmployees = async () => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/employee`);
//   if (!res.ok) throw new Error("Failed to fetch employee");
//   return res.json();
// };
// export const fetchEmployee = async (id) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/employee/${id}`);
//   if (!res.ok) throw new Error("Failed to fetch employee");
//   return res.json();
// };

// // Create Empoyee
// export const createEmployee = async (newEmployee) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/employee`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(newEmployee),
//   });
//   if (!res.ok) throw new Error("Failed to create employee");
//   return res.json();
// };

// // Update Empoyee
// export const updateEmployee = async ({ id, updatedEmployee }) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/employee/${id}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(updatedEmployee),
//   });
//   if (!res.ok) throw new Error("Failed to update employee");
//   return res.json();
// };

// // Delete Empoyee
// export const deleteEmployee = async (id) => {
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/employee/${id}`, {
//     method: "DELETE",
//   });
//   if (!res.ok) throw new Error("Failed to delete employee");
//   return res.json();
// };

// Company

export const fetchCompanies = async () => {
  const res = await fetch(`${API_BASE_URL}/company`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch companies");
  }
  return res.json();
};
export const fetchCompany = async (id) => {
  const res = await fetch(`${API_BASE_URL}/company/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch company");
  }
  return res.json();
};

// Create COMPANY
export const createCompnay = async (newCompany) => {
  const res = await fetch(`${API_BASE_URL}/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newCompany),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create company");
  }
  return res.json();
};

// Update COMPANY
export const updateCompany = async ({ id, updatedEmployee }) => {
  const res = await fetch(`${API_BASE_URL}/company/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedEmployee),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update company");
  }
  return res.json();
};

// Delete COMPANY
export const deleteCompany = async (id) => {
  const res = await fetch(`${API_BASE_URL}/company/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete company");
  }
  return res.json();
};
export const getProfile = async () => {
  return await apiRequest(API_ENDPOINTS.AUTH.PROFILE);
};
export const updateCurrentUser = async (newData) => {
  // Check if newData contains a File object (image upload)
  const hasFile = Object.values(newData).some(value => value instanceof File || (value && value.length && value[0] instanceof File));
  
  if (hasFile) {
    // Use FormData for file uploads
    const formData = new FormData();
    Object.keys(newData).forEach(key => {
      if (newData[key]) {
        if (key === 'image' && newData[key][0]) {
          formData.append('image', newData[key][0]);
        } else if (key !== 'image') {
          formData.append(key, newData[key]);
        }
      }
    });

    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.PROFILE}`, {
      method: "PATCH",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Profile update failed");
    }

    return response.json();
  } else {
    // Use regular JSON for text-only updates
    return await apiRequest(API_ENDPOINTS.AUTH.PROFILE, {
      method: "PATCH",
      body: JSON.stringify(newData),
    });
  }
};
