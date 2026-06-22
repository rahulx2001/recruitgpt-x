"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useWorkspaceInterviews() {
  return useQuery({
    queryKey: ["workspace-interviews"],
    queryFn: () => api.workspaceInterviews(),
    staleTime: 30_000,
  });
}