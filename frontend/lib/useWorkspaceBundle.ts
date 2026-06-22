"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useWorkspaceActivity() {
  return useQuery({
    queryKey: ["workspace-activity"],
    queryFn: () => api.workspaceActivity(),
    staleTime: 30_000,
  });
}

export function useWorkspaceShortlists() {
  return useQuery({
    queryKey: ["workspace-shortlists"],
    queryFn: () => api.workspaceShortlists(),
    staleTime: 30_000,
  });
}

export function useWorkspaceSearchMeta() {
  return useQuery({
    queryKey: ["workspace-search-meta"],
    queryFn: () => api.workspaceSearchMeta(),
    staleTime: 30_000,
  });
}

export function useWorkspaceJobsOverview() {
  return useQuery({
    queryKey: ["workspace-jobs-overview"],
    queryFn: () => api.workspaceJobsOverview(),
    staleTime: 30_000,
  });
}

export function useWorkspaceInsight() {
  return useQuery({
    queryKey: ["workspace-insight"],
    queryFn: () => api.workspaceInsight(),
    staleTime: 30_000,
  });
}