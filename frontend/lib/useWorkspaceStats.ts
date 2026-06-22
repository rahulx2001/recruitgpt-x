"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useWorkspaceStats() {
  return useQuery({
    queryKey: ["workspace-stats"],
    queryFn: () => api.workspaceStats(),
    staleTime: 30_000,
  });
}