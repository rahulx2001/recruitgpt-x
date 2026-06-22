"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useWorkspaceAnalytics() {
  return useQuery({
    queryKey: ["workspace-analytics"],
    queryFn: () => api.workspaceAnalytics(),
    staleTime: 30_000,
    retry: 1,
    retryDelay: 1500,
  });
}