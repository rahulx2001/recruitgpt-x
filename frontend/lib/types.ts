export type UUID = string;

export interface WorkExperience {
  company: string;
  role: string;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  is_current?: boolean;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string | null;
  impact?: string | null;
}

export interface SkillProficiency {
  name: string;
  proficiency: number;
  years: number;
}

export interface SkillHistoryEntry {
  skill_name: string;
  year: number;
  proficiency: number;
  source: string;
  context?: string | null;
}

export interface Candidate {
  id: UUID;
  full_name: string;
  email?: string | null;
  headline?: string | null;
  location?: string | null;
  current_role?: string | null;
  years_experience: number;
  resume_text: string;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  gender?: string | null;
  ethnicity?: string | null;
  school?: string | null;
  github_stats?: Record<string, unknown> | null;
  certifications: string[];
  created_at: string;
  skills?: SkillProficiency[];
  experiences?: WorkExperience[];
  projects?: Project[];
  skill_history?: SkillHistoryEntry[];
}

export interface HiringBlueprint {
  hard_skills: string[];
  soft_skills: string[];
  industry: string;
  seniority: string;
  years_experience_min: number;
  leadership_requirement: string;
  communication_requirement: string;
  growth_expectation: string;
  hidden_requirements: string[];
  domain_keywords: string[];
  reasoning: string;
}

export interface Job {
  id: UUID;
  title: string;
  description: string;
  blueprint: HiringBlueprint | null;
  created_at: string;
}

export interface SubScores {
  skill_match: number;
  project_relevance: number;
  career_growth: number;
  behavioral: number;
  learning: number;
  communication: number;
  semantic: number;
}

export interface BehavioralScores {
  growth_score: number;
  consistency_score: number;
  learning_score: number;
  initiative_score: number;
  composite: number;
  reasoning: string;
  signals: Record<string, unknown>;
}

export interface TrajectoryScores {
  trajectory_type: string;
  growth_velocity: number;
  adaptability: number;
  future_potential: number;
  composite: number;
  reasoning: string;
  timeline_summary: string;
}

export interface SemanticScores {
  embedding_similarity: number;
  functional_similarity: number;
  experience_relevance: number;
  domain_alignment: number;
  composite_semantic_score: number;
}

export interface CandidateIntelligence {
  skills: string[];
  technologies: string[];
  projects: Project[];
  achievements: string[];
  leadership_evidence: string[];
  communication_evidence: string[];
  summary: string;
}

export interface Explanation {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  interview_focus_areas: string[];
  hiring_manager_talking_points: string[];
}

export interface RankedCandidate {
  candidate_id: UUID;
  candidate_name: string;
  rank: number;
  hireability_score: number;
  sub_scores: SubScores;
  explanation: Explanation;
  intelligence?: CandidateIntelligence;
  behavioral?: BehavioralScores;
  trajectory?: TrajectoryScores;
  semantic?: SemanticScores;
}

export interface RankingResult {
  job_id: UUID;
  job_title: string;
  blueprint: HiringBlueprint;
  ranked_candidates: RankedCandidate[];
  pipeline_metadata: Record<string, unknown>;
  created_at: string;
  cached?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  referenced_candidates: UUID[];
  guardrail_notice?: string | null;
}

export interface BiasReport {
  job_id: UUID;
  shortlist_size: number;
  gender_distribution: Record<string, number>;
  ethnicity_distribution: Record<string, number>;
  school_distribution: Record<string, number>;
  location_distribution: Record<string, number>;
  flags: string[];
  overall_fairness_score: number;
  cached_ranking?: boolean;
}

export interface PotentialPrediction {
  candidate_id: UUID;
  current_level: string;
  predicted_level_2y: string;
  predicted_level_5y: string;
  confidence: number;
  reasoning: string;
  growth_signals: string[];
}

export interface SearchResult {
  candidate: Candidate;
  similarity: number;
  matched_aspects: string[];
}

export interface WhatIfRequest {
  job_id: UUID;
  removed_skills: string[];
  added_skills: string[];
  seniority_override?: string | null;
}
