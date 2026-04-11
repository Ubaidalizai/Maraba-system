import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./apiConfig";

// Get all audit logs with filtering and pagination
export const useAuditLogs = (params = {}) => {
  return useQuery({
    queryKey: ["auditLogs", params],
    queryFn: async () => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString
        ? `/audit-logs?${queryString}`
        : "/audit-logs";
      return await apiRequest(endpoint);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get audit logs for a specific record
export const useAuditLogsByRecord = (recordId, params = {}) => {
  return useQuery({
    queryKey: ["auditLogs", "record", recordId, params],
    queryFn: async () => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString
        ? `/audit-logs/record/${recordId}?${queryString}`
        : `/audit-logs/record/${recordId}`;
      return await apiRequest(endpoint);
    },
    enabled: !!recordId,
    staleTime: 5 * 60 * 1000,
  });
};

// Get audit logs for a specific table
export const useAuditLogsByTable = (tableName, params = {}) => {
  return useQuery({
    queryKey: ["auditLogs", "table", tableName, params],
    queryFn: async () => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString
        ? `/audit-logs/table/${tableName}?${queryString}`
        : `/audit-logs/table/${tableName}`;
      return await apiRequest(endpoint);
    },
    enabled: !!tableName,
    staleTime: 5 * 60 * 1000,
  });
};

// Get a specific audit log by ID
export const useAuditLog = (id) => {
  return useQuery({
    queryKey: ["auditLogs", id],
    queryFn: async () => {
      return await apiRequest(`/audit-logs/${id}`);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Get audit log statistics
export const useAuditLogStats = (params = {}) => {
  return useQuery({
    queryKey: ["auditLogs", "stats", params],
    queryFn: async () => {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString
        ? `/audit-logs/stats?${queryString}`
        : "/audit-logs/stats";
      return await apiRequest(endpoint);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Cleanup old audit logs (admin only)
export const useCleanupAuditLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (daysOld) => {
      return await apiRequest("/audit-logs/cleanup", {
        method: "DELETE",
        body: JSON.stringify({ daysOld }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] });
    },
  });
};
