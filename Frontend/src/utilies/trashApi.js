import { apiRequest, API_ENDPOINTS } from "../services/apiConfig";

const trashActionPaths = {
  product: {
    restore: (id) => `/products/${id}/restore`,
    permanent: (id) => `/products/${id}/permanent`,
  },
  purchase: {
    restore: API_ENDPOINTS.PURCHASES.RESTORE,
    permanent: API_ENDPOINTS.PURCHASES.PERMANENT,
  },
  sale: {
    restore: API_ENDPOINTS.SALES.RESTORE,
    permanent: API_ENDPOINTS.SALES.PERMANENT,
  },
  expense: {
    restore: API_ENDPOINTS.EXPENSES.RESTORE,
    permanent: API_ENDPOINTS.EXPENSES.PERMANENT,
  },
  income: {
    restore: API_ENDPOINTS.INCOME.RESTORE,
    permanent: API_ENDPOINTS.INCOME.PERMANENT,
  },
  account: {
    restore: (id) => `/accounts/${id}/restore`,
    permanent: (id) => `/accounts/${id}/permanent`,
  },
  customer: {
    restore: (id) => `/customers/${id}/restore`,
    permanent: (id) => `/customers/${id}/permanent`,
  },
  supplier: {
    restore: (id) => `/suppliers/${id}/restore`,
    permanent: (id) => `/suppliers/${id}/permanent`,
  },
  category: {
    restore: (id) => `/categories/${id}/restore`,
    permanent: (id) => `/categories/${id}/permanent`,
  },
  brand: {
    restore: (id) => `/brands/${id}/restore`,
    permanent: (id) => `/brands/${id}/permanent`,
  },
  employee: {
    restore: (id) => `/employees/${id}/restore`,
    permanent: (id) => `/employees/${id}/permanent`,
  },
  company: {
    restore: (id) => `/companies/${id}/restore`,
    permanent: (id) => `/companies/${id}/permanent`,
  },
  type: {
    restore: (id) => `/types/${id}/restore`,
    permanent: (id) => `/types/${id}/permanent`,
  },
  saraf: {
    restore: (id) => `/sarafs/${id}/restore`,
    permanent: (id) => `/sarafs/${id}/permanent`,
  },
};

export const TRASH_TYPES = Object.keys(trashActionPaths).filter(
  (type) => typeof trashActionPaths[type].restore === "function"
);

export const fetchTrashSummary = async () =>
  apiRequest(API_ENDPOINTS.TRASH.SUMMARY);

export const fetchTrashItems = async ({ type = "all", page = 1, limit = 20 }) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (type && type !== "all") {
    params.set("type", type);
  } else {
    params.set("type", "all");
  }
  return apiRequest(`${API_ENDPOINTS.TRASH.LIST}?${params.toString()}`);
};

export const restoreTrashItem = async (type, id) => {
  const paths = trashActionPaths[type];
  if (!paths?.restore) {
    throw new Error("د دې ډول لپاره بیرته راستنیدل نشته");
  }
  return apiRequest(paths.restore(id), { method: "PATCH" });
};

export const permanentDeleteTrashItem = async (type, id) => {
  const paths = trashActionPaths[type];
  if (!paths?.permanent) {
    throw new Error("د دې ډول لپاره تل لپاره حذف نشته");
  }
  return apiRequest(paths.permanent(id), { method: "DELETE" });
};