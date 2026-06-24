// ========================================
// API Configuration and Utilities
// ========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || "http://localhost:3001";

let refreshInFlight = null;

const getAuthToken = () => localStorage.getItem("authToken");

export const setAuthTokens = (authToken) => {
  if (authToken) {
    localStorage.setItem("authToken", authToken);
  }
};

export const setAuthToken = setAuthTokens;

export const clearAuthTokens = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
};

const getDefaultHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const refreshAccessToken = async () => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/users/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Token refresh failed");
        }
        const data = await response.json();
        if (!data.accessToken) {
          throw new Error("Token refresh failed");
        }
        setAuthTokens(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

const parseErrorResponse = async (response) => {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(
    errorData.message || `HTTP error! status: ${response.status}`
  );
};

export const apiRequest = async (endpoint, options = {}, retried = false) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    credentials: "include",
    ...options,
    headers: {
      ...getDefaultHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);

    if (response.ok) {
      return response.json();
    }

    const isAuthEndpoint =
      endpoint.includes("/users/login") ||
      endpoint.includes("/users/refresh") ||
      endpoint.includes("/users/logout");

    if (response.status === 401 && !retried && !isAuthEndpoint) {
      try {
        await refreshAccessToken();
        return apiRequest(endpoint, options, true);
      } catch (refreshError) {
        clearAuthTokens();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        throw refreshError;
      }
    }

    return parseErrorResponse(response);
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
    RESTORE: (id) => `/products/${id}/restore`,
    PERMANENT: (id) => `/products/${id}/permanent`,
  },

  // Inventory/Stock
  STOCK: {
    LIST: "/stocks",
    STATS: "/stocks/stats",
    EXPIRING: "/stocks/expiring",
    INVENTORY: "/stocks?location=warehouse",
    STORE: "/stocks?location=store",
    DETAIL: (id) => `/stocks/${id}`,
    PURCHASE_SOURCE: (id) => `/stocks/${id}/purchase-source`,
    CREATE: "/stocks",
    UPDATE: (id) => `/stocks/${id}`,
    DELETE: (id) => `/stocks/${id}`,
    BATCHES_BY_PRODUCT: (productId) => `/stocks/${productId}/batches`,
  },

  STOCK_DAMAGE: {
    LIST: "/stock-damages",
    DETAIL: (id) => `/stock-damages/${id}`,
    CREATE: "/stock-damages",
    DELETE: (id) => `/stock-damages/${id}`,
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
    STOCK_CONSTRAINTS: (id) => `/purchases/${id}/stock-constraints`,
    CREATE: "/purchases",
    UPDATE: (id) => `/purchases/${id}`,
    DELETE: (id) => `/purchases/${id}`,
    RESTORE: (id) => `/purchases/${id}/restore`,
    PERMANENT: (id) => `/purchases/${id}/permanent`,
    REPORTS: "/purchases/reports",
    RETURNS: {
      LIST: "/purchases/returns",
      DETAIL: (id) => `/purchases/returns/${id}`,
    },
  },

  // Sales
  SALES: {
    LIST: "/sales",
    DETAIL: (id) => `/sales/${id}`,
    CREATE: "/sales",
    UPDATE: (id) => `/sales/${id}`,
    DELETE: (id) => `/sales/${id}`,
    RESTORE: (id) => `/sales/${id}/restore`,
    PERMANENT: (id) => `/sales/${id}/permanent`,
    REPORTS: "/sales/reports",
    PAYMENT: (id) => `/sales/${id}/payment`,
    RETURNS: {
      LIST: "/sales/returns",
      DETAIL: (id) => `/sales/returns/${id}`,
      RESTORE: (id) => `/sales/returns/${id}/restore`,
    },
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

  // Sarafs
  SARAFS: {
    LIST: "/sarafs",
    DETAIL: (id) => `/sarafs/${id}`,
    CREATE: "/sarafs",
    UPDATE: (id) => `/sarafs/${id}`,
    DELETE: (id) => `/sarafs/${id}`,
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
    PERMANENT: (id) => `/expenses/${id}/permanent`,
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
    PERMANENT: (id) => `/income/${id}/permanent`,
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

  // Reports
  REPORTS: {
    DAILY: "/reports/daily",
  },

  // Settings
  SETTINGS: {
    GET: "/settings",
    UPDATE: "/settings",
  },

  // Backup (admin)
  BACKUP: {
    DOWNLOAD: "/backup/download",
    RESTORE: "/backup/restore",
  },

  // Trash
  TRASH: {
    SUMMARY: "/trash/summary",
    LIST: "/trash",
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