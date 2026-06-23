"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  buildRankingMap,
  mapApiCandidates,
  parseRedrobId,
} from "@/lib/candidateAdapter";
import type { Candidate as UiCandidate } from "@/lib/mock";
import type { Candidate as ApiCandidate } from "@/lib/types";

export type PoolAvgs = {
  match: number;
  skills: number;
  experience: number;
  github: number;
};

function computePoolAvgs(pool: UiCandidate[]): PoolAvgs {
  if (!pool.length) {
    return { match: 0, skills: 0, experience: 0, github: 0 };
  }
  const n = pool.length;
  return {
    match: Math.round(pool.reduce((s, c) => s + c.matchScore, 0) / n),
    skills: Math.round(pool.reduce((s, c) => s + c.skillsMatch, 0) / n),
    experience: Math.round(pool.reduce((s, c) => s + c.experienceMatch, 0) / n),
    github: Math.round(pool.reduce((s, c) => s + c.githubMatch, 0) / n),
  };
}

export function useCandidatePool() {
  const { data: apiCandidates, isLoading: apiLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => api.listCandidates(),
  });
  const { data: rankings = [], isLoading: rankLoading } = useQuery({
    queryKey: ["challenge-rankings"],
    queryFn: () => api.challengeRankings(),
  });

  const uiPool = React.useMemo(
    () => (apiCandidates ? mapApiCandidates(apiCandidates, rankings) : []),
    [apiCandidates, rankings]
  );

  const uiById = React.useMemo(
    () => new Map(uiPool.map((c) => [c.id, c])),
    [uiPool]
  );

  const apiById = React.useMemo(() => {
    const map = new Map<string, ApiCandidate>();
    for (const row of apiCandidates ?? []) {
      const id = parseRedrobId(row) ?? row.id;
      map.set(id, row);
    }
    return map;
  }, [apiCandidates]);

  const rankById = React.useMemo(() => buildRankingMap(rankings), [rankings]);

  const poolAvgs = React.useMemo(() => computePoolAvgs(uiPool), [uiPool]);

  const getUi = React.useCallback(
    (id: string) => uiById.get(id),
    [uiById]
  );

  const getApi = React.useCallback(
    (id: string) => apiById.get(id),
    [apiById]
  );

  const getRank = React.useCallback(
    (id: string) => rankById.get(id)?.rank ?? 0,
    [rankById]
  );

  return {
    uiPool,
    uiById,
    apiById,
    rankById,
    poolAvgs,
    poolSize: uiPool.length,
    getUi,
    getApi,
    getRank,
    isLoading: apiLoading || rankLoading,
  };
}