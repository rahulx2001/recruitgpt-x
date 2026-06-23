"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useWorkspaceAnalytics() {
  return useQuery({
    queryKey: ["workspace-analytics"],
    queryFn: () => api.workspaceAnalytics(),
    staleTime: 30_000,
    retry: 3,
    retryDelay: 5000,
  });
}