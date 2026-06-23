"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

const REMOTE_QUERY = {
  staleTime: 30_000,
  retry: 3,
  retryDelay: 5000,
} as const;

export function useWorkspaceActivity() {
  return useQuery({
    queryKey: ["workspace-activity"],
    queryFn: () => api.workspaceActivity(),
    ...REMOTE_QUERY,
  });
}

export function useWorkspaceShortlists() {
  return useQuery({
    queryKey: ["workspace-shortlists"],
    queryFn: () => api.workspaceShortlists(),
    ...REMOTE_QUERY,
  });
}

export function useWorkspaceSearchMeta() {
  return useQuery({
    queryKey: ["workspace-search-meta"],
    queryFn: () => api.workspaceSearchMeta(),
    ...REMOTE_QUERY,
  });
}

export function useWorkspaceJobsOverview() {
  return useQuery({
    queryKey: ["workspace-jobs-overview"],
    queryFn: () => api.workspaceJobsOverview(),
    ...REMOTE_QUERY,
  });
}

export function useWorkspaceInsight() {
  return useQuery({
    queryKey: ["workspace-insight"],
    queryFn: () => api.workspaceInsight(),
    ...REMOTE_QUERY,
  });
}

export function useWorkspaceMe() {
  return useQuery({
    queryKey: ["workspace-me"],
    queryFn: () => api.workspaceMe(),
    staleTime: 300_000,
  });
}