// ========================================
// API Configuration and Utilities
// ========================================

// Use environment variable if available, otherwise fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:3001";

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem("authToken");
};

// Get refresh token from localStorage
const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

// Set auth tokens in localStorage
export const setAuthTokens = (authToken, refreshToken) => {
  localStorage.setItem("authToken", authToken);
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
};

// Clear auth tokens from localStorage
export const clearAuthTokens = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
};

// Get default headers with authentication
const getDefaultHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Handle API response
const handleApiResponse = async (response) => {
  if (!response.ok) {
    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/users/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            setAuthTokens(refreshData.accessToken, refreshData.refreshToken);
            // Retry original request with new token
            return fetch(response.url, {
              ...response,
              headers: {
                ...getDefaultHeaders(),
                Authorization: `Bearer ${refreshData.accessToken}`,
              },
            });
          }
        } catch (error) {
          console.error("Token refresh failed:", error);
          clearAuthTokens();
          window.location.href = "/login";
        }
      } else {
        clearAuthTokens();
        window.location.href = "/login";
      }
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

// Generic API request function
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: getDefaultHeaders(),
    credentials: "include", // Include cookies for authentication
    ...options,
  };

  try {
    const response = await fetch(url, config);
    return await handleApiResponse(response);
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
};

// API endpoints configuration
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/users/login",
    REGISTER: "/users/register",
    LOGOUT: "/users/logout",
    REFRESH: "/users/refresh",
    PROFILE: "/users/profile",
    UPDATEPASSWORD: "/users/updatePassword",
    FORGOTPASSWORD: "/users/forgotPassword",
    UPDATEUSERS: "/users",
  },

  // Products
  PRODUCTS: {
    LIST: "/products",
    DETAIL: (id) => `/products/${id}`,
    CREATE: "/products",
    UPDATE: (id) => `/products/${id}`,
    DELETE: (id) => `/products/${id}`,
  },

  // Inventory/Stock
  STOCK: {
    LIST: "/stocks",
    STATS: "/stocks/stats",
    INVENTORY: "/stocks?location=warehouse",
    STORE: "/stocks?location=store",
    DETAIL: (id) => `/stocks/${id}`,
    CREATE: "/stocks",
    UPDATE: (id) => `/stocks/${id}`,
    DELETE: (id) => `/stocks/${id}`,
    BATCHES_BY_PRODUCT: (productId) => `/stocks/${productId}/batches`,
  },

  // Stock Transfers
  STOCK_TRANSFER: {
    LIST: "/stock-transfers",
    CREATE: "/stock-transfers",
    DETAIL: (id) => `/stock-transfers/${id}`,
    DELETE: (id) => `/stock-transfers/${id}`,
  },

  // Stocks
  STOCKS: {
    LIST: "/stocks",
    DETAIL: (id) => `/stocks/${id}`,
    CREATE: "/stocks",
    UPDATE: (id) => `/stocks/${id}`,
    DELETE: (id) => `/stocks/${id}`,
    REPORTS: "/stocks/reports",
  },

  // Purchases
  PURCHASES: {
    LIST: "/purchases",
    DETAIL: (id) => `/purchases/${id}`,
    CREATE: "/purchases",
    UPDATE: (id) => `/purchases/${id}`,
    DELETE: (id) => `/purchases/${id}`,
    RESTORE: (id) => `/purchases/${id}/restore`,
    REPORTS: "/purchases/reports",
  },

  // Sales
  SALES: {
    LIST: "/sales",
    DETAIL: (id) => `/sales/${id}`,
    CREATE: "/sales",
    UPDATE: (id) => `/sales/${id}`,
    DELETE: (id) => `/sales/${id}`,
    REPORTS: "/sales/reports",
  },
  // Categories (for filters)
  CATEGORIES: {
    LIST: "/categories",
    BY_TYPE: (type) => `/categories/type/${type}`,
    DETAIL: (id) => `/categories/${id}`,
    CREATE: "/categories",
    UPDATE: (id) => `/categories/${id}`,
    DELETE: (id) => `/categories/${id}`,
  },
  // Employee stock

  EMPLOYEES_STOCK: {
    LIST: "/employee-stocks",
    DETAIL_ONE_EMP: (id) => `/employee-stocks/${id}`,
    DETAIL: (id) => `/employee-stocks/${id}`,
    RETURN_STOCK_EMPLOYEE: `/employee-stocks/return`,
  },
  // Suppliers
  SUPPLIERS: {
    LIST: "/suppliers",
    DETAIL: (id) => `/suppliers/${id}`,
    CREATE: "/suppliers",
    UPDATE: (id) => `/suppliers/${id}`,
    DELETE: (id) => `/suppliers/${id}`,
  },

  // Customers
  CUSTOMERS: {
    LIST: "/customers",
    DETAIL: (id) => `/customers/${id}`,
    CREATE: "/customers",
    UPDATE: (id) => `/customers/${id}`,
    DELETE: (id) => `/customers/${id}`,
  },

  // Accounts
  ACCOUNTS: {
    LIST: "/accounts",
    SYSTEM: "/accounts/system",
    SUPPLIERS: "/accounts/suppliers",
    DETAIL: (id) => `/accounts/${id}`,
    CREATE: "/accounts",
    UPDATE: (id) => `/accounts/${id}`,
    DELETE: (id) => `/accounts/${id}`,
    LEDGER: (id) => `/accounts/${id}/ledger`,
    BALANCES: "/accounts/reports/balances",
    CASHFLOW: "/accounts/reports/cashflow",
  },

  // Account Transactions
  ACCOUNT_TRANSACTIONS: {
    LIST: "/account-transactions",
    CREATE: "/account-transactions",
    TRANSFER: "/account-transactions/transfer",
    REVERSE: (id) => `/account-transactions/${id}/reverse`,
  },

  // Types
  TYPES: {
    LIST: "/types",
    CREATE: "/types",
    UPDATE: (id) => `/types/${id}`,
    DELETE: (id) => `/types/${id}`,
  },

  // Units
  UNITS: {
    LIST: "/units",
    CREATE: "/units",
    UPDATE: (id) => `/units/${id}`,
    DELETE: (id) => `/units/${id}`,
  },

  // Employees
  EMPLOYEES: {
    LIST: "/employees",
    DETAIL: (id) => `/employees/${id}`,
    CREATE: "/employees",
    UPDATE: (id) => `/employees/${id}`,
    DELETE: (id) => `/employees/${id}`,
  },

  // Employee Stock
  EMPLOYEE_STOCK: {
    LIST: "/employee-stocks",
    BY_EMPLOYEE: (employeeId) => `/employee-stocks/employee/${employeeId}`,
    DETAIL: (id) => `/employee-stocks/${id}`,
    RETURN: "/employee-stocks/return",
  },

  // Audit Logs
  AUDIT_LOGS: {
    LIST: "/audit-logs",
    BY_TABLE: (table) => `/audit-logs/table/${table}`,
    BY_RECORD: (id) => `/audit-logs/record/${id}`,
  },

  // Expenses
  EXPENSES: {
    LIST: "/expenses",
    DETAIL: (id) => `/expenses/${id}`,
    CREATE: "/expenses",
    UPDATE: (id) => `/expenses/${id}`,
    DELETE: (id) => `/expenses/${id}`,
    RESTORE: (id) => `/expenses/${id}/restore`,
    BY_CATEGORY: (categoryId) => `/expenses/category/${categoryId}`,
    STATS: "/expenses/stats",
    SUMMARY: "/expenses/summary",
  },

  // Income
  INCOME: {
    LIST: "/income",
    DETAIL: (id) => `/income/${id}`,
    CREATE: "/income",
    UPDATE: (id) => `/income/${id}`,
    DELETE: (id) => `/income/${id}`,
    RESTORE: (id) => `/income/${id}/restore`,
    BY_CATEGORY: (categoryId) => `/income/category/${categoryId}`,
    BY_SOURCE: (source) => `/income/source/${source}`,
    STATS: "/income/stats",
    SUMMARY: "/income/summary",
  },

  // Profit
  PROFIT: {
    NET: "/profit/net",
    STATS: "/profit/stats",
    SUMMARY: "/profit/summary",
  },

  // Dashboard Statistics
  DASHBOARD: {
    STATS: "/dashboard/stats",
    RECENT_TRANSACTIONS: "/account-transactions/getAllTransactions",
    LOW_STOCK: "/dashboard/low-stock",
    SUMMARY: "/dashboard/summary",
  },
};

export default API_BASE_URL;
export { BACKEND_BASE_URL, API_BASE_URL };
